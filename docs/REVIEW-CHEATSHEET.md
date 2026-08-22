# Review cheatsheet

Straight answers to the questions a reviewer is likely to ask, with the file to
open in each case. Written for someone who has to defend this code out loud.

---

## "Show me it isn't static JSON"

`prisma/seed-data/` holds the source data; `prisma/seed.ts` loads it into
PostgreSQL. Nothing in `src/` reads those files at runtime — every screen goes
through `src/server/services/`, which is the only code allowed to touch Prisma.

Prove it live: open `pnpm db:studio`, change a city's `avgStayCost`, reload the
builder. The stop cost and the running total both move.

---

## "Walk me through what happens when I drag Kyoto above Tokyo"

1. `Reorder.Group` in `src/components/trips/stop-rail.tsx` reorders locally.
2. `onDragEnd` sends the **full ordered id list** to
   `POST /trips/:id/stops/reorder`. The full list, not a from/to pair, so the
   server never has to guess.
3. `reorderStops` (`src/server/services/stops.ts`) checks access, then in one
   `$transaction`: rewrites `orderIndex`, calls `reflowStops` to recompute every
   date keeping each stop's night count, and shifts each stop's activities by
   the same offset so nothing lands outside its stay.
4. It returns the re-flowed stops. The client adopts them — the server's answer
   is authoritative.
5. Meanwhile the running total already moved, because the builder recomputed it
   locally with `computeBudget`.

While the request is in flight the route spine's dashes animate. That *is* the
loading indicator, which is why nothing shifts.

If the reorder needs more nights than the trip has, the server returns `409`
with a human message and the client rolls back to its snapshot.

---

## "How does the budget work?"

`src/server/engine/budget.ts` — one pure function, no I/O.

```
stay       = Σ nights × stayCostPerNight
meals      = Σ max(1, nights) × city.avgMealCost
transport  = Σ transportCostToNext
activities = Σ activity costs
other      = Σ manual expenses, bucketed by category
total      = the sum of those
```

Then it allocates day by day: each night's bed and that day's food land on the
night's date, transport on the departure day, each activity on its own date, and
undated expenses spread evenly.

**The invariant is `sum(byDay.spend) === total`, exactly.** Two details make
that true:

- Meals are charged per *night*, not per calendar day, so the category total and
  the daily allocation count the same days.
- Rounding each day to cents can leave a few cents adrift when an undated
  expense is spread (42 ÷ 9 = 4.666…), so `settleRounding` pushes the remainder
  onto the busiest day.

A day is **over** above the daily limit and **near** above 85% of it. There's a
test for each of these — `pnpm test`, `budget.test.ts`.

---

## "Why can the browser compute the budget? Isn't that duplicated logic?"

It isn't duplicated — it's the same function. `computeBudget` is pure and has no
server-only imports, so `src/components/trips/trip-builder.tsx` imports the
exact module the API uses. That's why `budgetInputFor` lives in `src/lib/` and
not in `src/server/services/`.

The consequence: the optimistic total and the confirmed total are produced by
one implementation and cannot drift apart.

---

## "How do you stop me reading someone else's trip?"

`assertTripAccess(tripId, user, level)` in `src/server/services/trips.ts`. One
function, called by every trip-scoped read and write:

- owner → anything
- `EDITOR` collaborator → edit the itinerary, but not delete or share
- `VIEWER` collaborator → read
- admin → read anything, never silently edit
- nobody → `NotFoundError`, not `ForbiddenError`, so the API doesn't confirm the
  trip exists

Try it: sign in as `demo@`, then `curl` another user's trip id. 404.

---

## "Is the input validated on the server, or just the form?"

Both, from **one schema object**. `src/lib/validators/` exports zod schemas; the
form passes them to `zodResolver`, and the route handler passes the same object
to `withApi`. There is no way to add a rule to one side and not the other.

`withApi` turns a `ZodError` into `fields`, which the form maps back onto the
right inputs.

---

## "What's `withApi` for?"

`src/server/http/withApi.ts`. Four jobs: parse input with zod, call the handler,
convert `AppError` subclasses into the envelope, stamp `Server-Timing`.

It's typed so the handler sees the schema's **output** type — `page:
z.coerce.number().default(1)` is optional going in and guaranteed coming out,
and the handler sees the guaranteed version. That's the conditional type on the
signature.

---

## "Why not `middleware.ts` for auth?"

The session check hits the database, so a deleted or demoted account stops
working immediately rather than when its JWT expires in seven days. Middleware
runs on the edge without database access. The guard is
`src/app/(app)/layout.tsx`, and `getSession()` is wrapped in `React.cache()` so
it costs one verify and one query per request no matter how many components ask.

---

## "Talk me through the auth"

- bcryptjs, cost 10.
- Session is a `jose` HS256 JWT in an httpOnly, SameSite=Lax cookie, 7 days.
- Login returns the same error for a wrong password and an unknown email — and
  the unknown-email path still runs a bcrypt hash, so it doesn't answer
  measurably faster. Together those stop account enumeration.
- Forgot-password always returns the same message. Only the SHA-256 hash of the
  reset token is stored, so a leaked row can't reset anything. Using a token
  voids every other outstanding one for that account.
- There's no email provider, so in development the reset URL comes back in the
  response and the UI shows it in a dashed "development only" panel. In
  production that field is absent.

---

## "Any N+1 queries?"

No. A trip loads its stops, their cities, their activities and its expenses in a
single `include` — `FULL_TRIP` in `services/trips.ts` — and the list screens use
the same shape, so twelve trip cards are still one query.

The dashboard is one `Promise.all` of six independent queries.

`pnpm bench` prints p50/p95 read from `Server-Timing`. Everything is 1–9 ms
against the seeded database.

---

## "Why is city search fast?"

A btree index can't serve `ILIKE '%kyo%'` — the leading wildcard forces a
sequential scan. Migration `20260822050653_pg_trgm_search_indexes` adds GIN
trigram indexes on `City.name`, `City.country` and `Activity.name`. Trigrams
index three-character grams, so an infix match becomes an index lookup.

Side benefit: `kyo` returns both **Kyo**to and To**kyo**. Measured 2.6 ms p50 /
4.3 ms p95.

---

## "What's the hardest bug you hit?"

Prisma's `Decimal` and `Date` don't survive the server → client component
boundary in Next.js — `Decimal` is a class instance, `Date` becomes a
timezone-bearing string. Rather than patch it where it surfaced, `src/server/dto.ts`
became the only place Prisma shapes are allowed to exist, and services return
plain numbers and `"YYYY-MM-DD"` strings. It's designed out rather than fixed.

Runner-up: `server-only` catching a client component importing a service. The
build failed with an exact import trace, and the pure helpers moved to
`src/lib/trip-view.ts`.

---

## "Did you just accept whatever the linter said?"

No — Next 16 turns on the React Compiler rules, which flagged 81 errors, and
all of them were fixed rather than disabled:

- **JSX inside try/catch** (64): pages now call `orNotFound(promise)`, so the
  fetch stays inside the try and the JSX sits outside it.
- **setState in an effect** (17): prop-sync effects became render-phase
  adjustment, `PerfPill` became `useSyncExternalStore`, the builder's selected
  day became derived instead of stored, and the eight duplicated fetch effects
  collapsed into one `useRemoteList` hook.
- `watch()` → `useWatch()` in the forms, so the compiler can still memoise them.

`pnpm verify` runs typecheck, lint, tests and build: 0 errors, 0 warnings.

---

## "Why three.js? Isn't a globe just decoration?"

The product is a route between cities. The globe draws that route as arcs — it
shows the thing the app is about, and it's the same `RouteLine` idea as the stop
rail and the timeline.

It's also disciplined about cost:

- dynamically imported with `ssr: false`, so the ~500 KB chunk only downloads on
  the three routes that render a globe — never on the builder, budget or explore
- pixel ratio capped at 1.5 (a retina globe is 4× the fragments for no visible
  gain at this size)
- `pauseAnimation()` when it scrolls off-screen, via `IntersectionObserver`
- pointer interaction off on the dashboard tile, so it can't swallow a scroll

---

## "What's the design system?"

"Night Atlas", tokens in `src/app/globals.css`. Three things to say:

1. **Colour has fixed meaning.** Solar = money and primary action. Lagoon = the
   route and "good". Ember = over budget and destructive. Lagoon is never a
   button; Solar is never a route. Colour is never the only signal — every
   over-budget state carries text or an icon too.
2. **One repeated idea: the route.** A luminous Lagoon line through the stops —
   as globe arcs, as the stop rail's spine, as the timeline's backbone, drawing
   itself in on the share page, and as a polyline in the OG image. One component,
   `RouteLine`, everywhere.
3. **Depth is built, not faked.** `DeckButton` is a plate and a face 3 px apart;
   hover lifts the face, press sinks it flush. Two pseudo-elements, transform
   only.

Motion is budgeted by surface: rich on landing/auth/share, medium on the
dashboard, light on the working screens. Everything animates transform and
opacity only, and `prefers-reduced-motion` freezes the backdrops, stops the
globe and cross-fades the split-flaps.

---

## "What would you do next?"

- Move the filter state into the URL so a filtered Explore view is shareable and
  survives a refresh.
- Real email for password resets — the token flow is already correct, it just
  has nowhere to send.
- Collaborator presence on the builder, so two people editing one trip can see
  each other.
- Optimistic reordering across stops (dragging an activity from one city to
  another), which today needs "move to day" instead.

## "What did you leave out, and why?"

- **i18n is a preference, not a translation layer.** `User.language` is stored
  and drives date/number locale, but the UI copy is English only. Half-translated
  strings would be worse than one honest language.
- **Rates are a static table.** Labelled "indicative" on every screen that shows
  money. A live FX API would break the offline requirement.
