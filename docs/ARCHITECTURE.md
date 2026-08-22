# Architecture

## The one-paragraph version

A Next.js App Router app over PostgreSQL. Server components read through a
service layer that owns every database call and every access-control decision.
Client components mutate through one typed fetch wrapper that hits REST route
handlers, which share the same zod schemas the forms use. The budget and date
logic is pure — no I/O, no framework — which is why it can run on the server
for the API *and* in the browser for the builder's live total.

```
Browser                          Server
───────                          ──────
page (RSC) ─────────────────────► service ──► Prisma ──► Postgres
                                     │
client component ──► api-client ──► route handler ──► service
                        │              │
                        └── zod ───────┘   (the same schema object)
```

---

## Layers, outside in

### `src/app` — routes

Four route groups:

| Group | Guard | Contents |
|---|---|---|
| `(marketing)` | none | landing page |
| `(auth)` | redirects **out** if signed in | login, signup, forgot, reset |
| `(app)` | redirects to `/login` if not signed in | everything else |
| `s/[slug]` | none | the public share page |

The auth guard is a **layout**, not middleware. Middleware runs on the edge
without database access, and the session check has to hit the database — a
deleted or demoted account must stop working immediately, not in seven days
when its JWT expires. `getSession()` is wrapped in `React.cache()`, so a page
that calls it from a layout, a page and three components verifies the token and
queries once per request.

### `src/server/services` — all database access

Nothing outside this directory touches Prisma. Each service owns one aggregate
(trips, stops, activities, expenses, share, admin…). They import `server-only`,
so if a client component ever reaches for one the build fails immediately
rather than leaking a connection string into a bundle. That guard caught a real
mistake during the build — see `docs/DECISIONS.md`.

**Access control lives in exactly one function**, `assertTripAccess(tripId,
user, level)`:

- the owner can do anything
- an `EDITOR` collaborator can change the itinerary but not delete or share it
- a `VIEWER` collaborator can read
- an admin can read anything, but never silently edit

Every trip-scoped mutation calls it. There is no second place to forget.

### `src/server/engine` — pure logic

`budget.ts` and `stop-dates.ts` have no imports beyond date helpers. They take
plain numbers and `"YYYY-MM-DD"` strings and return plain numbers. That is what
makes them unit-testable (21 tests, `pnpm test`), fast, and — the useful part —
**runnable in the browser**. The itinerary builder recomputes the running total
locally with `computeBudget`, the same function the API calls, so the optimistic
number and the confirmed number cannot disagree.

### `src/server/http` — the API contract

Every route handler is wrapped in `withApi(schema, handler)`, which does four
things and nothing else:

1. parses input with zod — query string for `GET`/`DELETE`, JSON body otherwise
2. calls the handler
3. converts `AppError` subclasses into the error envelope
4. stamps `Server-Timing: app;dur=<ms>`

```ts
type ApiOk<T> = { ok: true; data: T; meta?: { page; pageSize; total; ms } }
type ApiErr   = { ok: false; error: { code; message; fields?; details? } }
```

`code` is one of `VALIDATION | UNAUTHENTICATED | FORBIDDEN | NOT_FOUND |
CONFLICT | RATE_LIMIT | INTERNAL`. `fields` carries per-input messages so a form
can highlight the right box; `details` carries structured payloads like the list
of stops that no longer fit after a date change.

### `src/server/dto.ts` — the boundary

Prisma returns `Decimal` and `Date` objects. Neither survives the server →
client component boundary in Next.js: `Decimal` is a class instance, and `Date`
silently becomes a timezone-bearing string. So **nothing Prisma-shaped leaves
the server layer**. Services return DTOs: plain numbers and `"YYYY-MM-DD"`
strings. This is the single most common Next.js + Prisma runtime crash and it's
designed out rather than patched around.

### `src/lib` — shared by both sides

`validators/` (zod), `currency.ts`, `dates.ts`, `trip-view.ts`, `api-client.ts`.
Anything a client component needs lives here, never under `server/`.

---

## Data flow, concretely

**Reading.** A page calls a service directly. No HTTP hop, no waterfall — the
dashboard is one `Promise.all` and one round trip's worth of latency.

**Writing.** A client component calls `api-client`, which hits a route handler,
which calls the same service the page used.

**Optimistic updates.** The builder funnels every mutation through one function:

```ts
mutate(
  (current) => optimisticallyChanged(current),   // applied immediately
  async () => await api.patch(...),              // server has the last word
)
```

On failure it restores the snapshot and toasts the server's message. On success
it adopts the server's response — which matters for reorders, where the server
re-flows every date and its answer is authoritative.

**Search.** All eight filtered lists share `useRemoteList`: debounce 150 ms,
abort the in-flight request, keep the previous results on screen rather than
blanking out. One hook, so search behaves identically in the ⌘K palette, the
Explore grid and the admin tables.

---

## The design system — "Night Atlas"

Defined once as Tailwind v4 `@theme` tokens in `src/app/globals.css`.

### Colour has fixed meaning

| Token | Means | Never used for |
|---|---|---|
| `solar` `#F5B62B` | money, primary action | routes |
| `lagoon` `#36D6C3` | the route, "under budget", success | buttons |
| `ember` `#FF6B5A` | over budget, destructive | decoration |
| `ink` / `harbor` / `deck` | page → card → control surfaces | |
| `cloud` / `fog` | primary / secondary text | |

Cloud on Ink is 14:1. Colour is never the only signal — every over-budget state
also carries text or an icon.

### Three type roles

- **Fraunces** (display) — headlines, trip names in italic, day numerals
- **Manrope** (UI) — all interface text
- **JetBrains Mono**, tabular figures — every number that means something

All three are committed as `.woff2` and loaded with `next/font/local` with
metric-matched fallbacks, so nothing reflows when they arrive.

### The signature: THE ROUTE

One idea, repeated. A trip is a luminous Lagoon line through its stops:

- **globe** — animated dashed arcs (dashboard, landing, share)
- **stop rail** — `RouteSpine`, a vertical thread through the postcards
- **timeline** — the same spine as the page's backbone
- **share page** — draws itself in on scroll via `IntersectionObserver`
- **OG image** — the same shape as an SVG polyline

When a reorder is in flight the spine's dashes animate. **The route is the
loading indicator** — nothing shifts, no spinner appears in the layout.

Secondary motif: `SplitFlap` departure-board digits, allowed in exactly two
places (the budget headline and the dashboard budget tile). Repeating it
anywhere else would turn a signature into a gimmick.

### The intro curtain

`components/marketing/intro-curtain.tsx` opens the landing page by drawing that
same route — a flight path arcing between four cities pulled from the database,
a comet running ahead of the line, each node landing as it's reached, then the
wordmark rising from behind a mask. The design system introducing itself, rather
than a loading screen bolted on the front.

It is built to be impossible to get stuck behind:

- markup is server-rendered and the motion is pure CSS, so it starts on the
  first painted frame and never waits for hydration
- `pointer-events: none` throughout, and any click, key or scroll cuts it short
- once per session, skipped under `prefers-reduced-motion`, and skipped *before
  first paint* by an inline script so a repeat visit never sees a flash
- if JavaScript never runs, the CSS still animates it away

The decision to skip lives in the inline script; the effect only handles
cleanup. That split matters — an effect that both wrote and read
`gt-intro-seen` would see its own write on StrictMode's second pass and bin the
curtain before it played.

### Depth is built, not faked

`DeckButton` is two stacked slabs: a plate pinned 3 px below the face, and the
face carrying a 1 px inner top highlight. Hover lifts the face, press sinks it
flush onto the plate. Both layers are `::before`/`::after`, so the whole effect
costs one element and animates transform only.

`Postcard` gives every city a region-keyed gradient, a dashed country-code
stamp postmarked at a deterministic angle, coordinates in mono, and a
perforated left edge punched out with a repeating radial mask — plus a ≤6°
pointer tilt.

The backdrop is five independent layers at different parallax depths: drifting
aurora, three star planes, film grain, a survey graticule.

### The motion budget

| Surface | Backdrop | Motion |
|---|---|---|
| Landing (first visit) | intro curtain, 2.6 s | the route draws itself between four real cities, then hands off to the hero |
| Landing, auth, public share | full aurora + starfield + globe | rich: route draw-in, staggered reveals, parallax |
| Dashboard | static, globe tile animates | medium: tile stagger, split-flap, hover lift |
| Builder, budget, calendar, explore, admin | texture only, static | light: 150–250 ms transitions only |

Everything animates transform and opacity only. Under
`prefers-reduced-motion` backdrops freeze, the globe stops rotating, split-flaps
cross-fade instead of flipping, and durations collapse.

---

## Performance, and how it's achieved

Targets and measurements are in the README. The techniques:

- **Indexes** on every foreign key plus GIN trigram indexes for search
- **One query per screen** — a trip loads its stops, cities, activities and
  expenses in a single `include`. No N+1 anywhere, including on list screens.
- **`React.cache`** on the session, so it's verified once per request
- **`Promise.all`** for independent reads
- **Dynamic imports with `ssr: false`** for three.js and recharts, so the
  builder and explore routes never download either
- **Globe discipline** — pixel ratio capped at 1.5, rendering paused when
  off-screen via `IntersectionObserver`, pointer interaction off by default
- **Debounced, abortable search** — one query per pause, not one per keystroke
- **`loading.tsx` on every heavy route**, shaped like the screen that's coming
