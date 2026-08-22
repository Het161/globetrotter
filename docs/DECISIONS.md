# Decisions

Choices made during the build, each with the reason. Newest last.

---

**Next 16 + Turbopack, not the pinned 15.x.** `create-next-app@latest` gave
16.3.2 with React 19.2. Taking it rather than downgrading: the App Router API we
use is unchanged, and Turbopack builds in ~6 s. Cost: Next 16 enables the React
Compiler lint rules, which found real issues (below).

**Auth guard in a layout, not `middleware.ts`.** The session check has to hit
the database so a deleted or demoted account stops working immediately.
Middleware runs on the edge without database access. `getSession()` is wrapped
in `React.cache()`, so it still costs one verify and one query per request.

**Prisma 6, not 7.** Prisma 7 moves to `prisma.config.ts` and driver adapters.
No benefit here, real setup risk on the day.

**`server-only` on every service.** It cost nothing and immediately earned its
place: `departure-board.tsx` (a client component) was importing `departureRows`
from `services/dashboard.ts`. The build failed with an exact import trace
instead of leaking server code into a bundle. The pure helpers moved to
`src/lib/trip-view.ts`.

**Money in `Decimal`, dates in `@db.Date`, everything in USD.** Reasoning in
`DB-SCHEMA.md`. The short version: floats lose cents, timestamps shift by
timezone, and mixed currencies make `SUM` lie.

**DTOs at the server boundary.** Prisma's `Decimal` and `Date` don't survive
the server → client component boundary. Rather than converting ad hoc and
hitting the crash later, `src/server/dto.ts` is the only place Prisma shapes are
allowed to be, and services return plain numbers and `"YYYY-MM-DD"` strings.

**The budget engine is pure, and runs on both sides.** `computeBudget` has no
I/O. That makes it unit-testable — but the real payoff is that the itinerary
builder calls the *same function* in the browser to keep its running total live.
The optimistic number and the confirmed number are computed by one
implementation, so they cannot disagree. This is why `budgetInputFor` lives in
`lib/` and not in `services/`.

**Rounding is settled onto the busiest day.** Rounding each day to cents left
`sum(byDay)` a few cents off `total` when an undated expense was spread (42 ÷ 9
= 4.666…). The engine now pushes the remainder onto the largest day, so the
documented invariant `sum(byDay) === total` is exactly true rather than nearly
true.

**`orderIndex` is not unique.** A unique constraint makes reordering impossible
without a temporary-negative-index dance. Reorder rewrites every index in one
transaction, so no intermediate state is observable.

**Reorder re-flows dates on the server and its answer wins.** The client
optimistically reorders the list; the server recomputes every date, moves that
stop's activities by the same offset, and returns the result, which the client
adopts wholesale.

**The route line is the loading indicator.** While a reorder is in flight the
`RouteSpine`'s dashes animate. Nothing shifts, and no spinner lands in the
middle of the layout.

**Fonts and textures are committed.** `next/font/local` over Google Fonts, and
globe textures in `public/globe`. The brief requires the app to run with no
internet; a webfont request is a runtime network dependency.

**Two font formats.** The app serves WOFF2 to browsers. The OG image needs
TrueType, because satori (what `next/og` renders with) can read neither WOFF2
nor variable fonts — the first attempt failed with `Unsupported OpenType
signature wOF2`, and the variable TTF then failed inside fontkit. Static TTF
instances of the same two families are committed alongside.

**The public share page shows USD, not the viewer's currency.** It shows the
author's own numbers. Converting a stranger's plan into rupees because that's
what *you* prefer misrepresents what they budgeted.

**Sharing keeps the slug when switched off.** Re-enabling restores the same URL,
so a link already sent doesn't break.

**"Copy this trip" survives the login wall.** An anonymous visitor is sent to
`/login?next=/s/<slug>?copy=1`, lands back on the page, and the copy fires
automatically. Losing someone's intent at a login wall is the easiest way to
lose them.

**One `useRemoteList` hook for all eight filtered lists.** Debounce 150 ms,
abort the in-flight request, keep previous results visible rather than blanking
out. Written once, so search behaves identically in the ⌘K palette, Explore, the
sheets and both admin tables. This replaced eight near-identical effects.

**React Compiler lint rules were fixed, not silenced.** Next 16 flagged 81
errors in two families and all were addressed rather than disabled:

- *JSX inside try/catch* (64) — the compiler can't memoise it. Pages now use
  `orNotFound(promise)`, which keeps the fetch inside the try and the JSX
  outside it.
- *setState in an effect* (17) — prop-sync effects became render-phase
  adjustment (React's documented pattern), `PerfPill` became
  `useSyncExternalStore` (which is what that hook is for), the builder's
  selected day became derived rather than stored, and the fetch effects
  collapsed into `useRemoteList`.
- `watch()` → `useWatch()` in the four react-hook-form forms, so the compiler
  can still memoise them.

Final state: 0 errors, 0 warnings.

**exFAT: one root cause, not two.** This repo was developed on an exFAT volume.
macOS writes an AppleDouble sidecar (`._name`) beside any file carrying extended
attributes; the sidecars are binary but keep the original name, so anything that
trusts a directory listing breaks. That showed up in three places:

1. `._page.tsx` looked like a route to Next.js.
2. `._budget.test.ts` looked like a test to vitest.
3. `._00000001.sst`, inside Turbopack's cache database, is not a sequence
   number — so opening the cache died with `Failed to open database … invalid
   digit found in string`, and **every build after the first one failed**.

I originally misdiagnosed (3) as `next dev` and `next build` fighting over a
shared Turbopack cache, and "fixed" it by deleting `.next/cache`,
`.next/turbopack` and `.next/dev` before every run. That was wrong twice over:

- `.next/dev` is not a cache. It is Next 16's dev-server runtime directory and
  holds the lock file (`{"pid":…,"port":…}`) that stops two servers sharing a
  `distDir`. Deleting it under a running server made that server log
  *"The directory … was deleted … Restarting the server to recover"*, restart,
  and re-take its port — which silently killed a second `next dev` started at
  the same moment.
- It threw away a ~115 MB warm cache on every single run.

The actual fix is to strip the sidecars from the build directories too, and
delete nothing else. Consecutive builds went from *fail* to **3.5 s → 1.6 s →
1.3 s** as the cache warms.

Two follow-ons from that investigation:

- **`xattr -rc` was removed.** It was there to stop sidecars regenerating. It
  doesn't — a "clean" second pass still removed 1147 of them — and it cost ~80 s
  because it recurses `node_modules`. Deleting the files is the whole job and
  takes ~0.3 s.
- **dev and build now use separate `distDir`s** (`.next-dev` / `.next`, in
  `next.config.ts`). No longer required for correctness, but Next locks a
  `distDir` against concurrent writers, so one each means a build can run while
  the dev server is up.

None of this costs anything on APFS or ext4.

**The landing intro is the route, not a spinner.** Research into current
practice kept landing on the same point: the differentiator is restraint — an
opening should amplify the product, not perform over it. So the curtain draws
the app's existing signature (a Lagoon flight path through cities) using real
cities from the database, rather than inventing a separate brand moment.

Three findings shaped how it's built:

- *Keep it non-blocking.* Guidance is to hold a blocking preloader under 1.5 s.
  This runs 2.6 s but never blocks: it's `pointer-events: none`, the page is
  live behind it from the first frame, and any interaction cuts it short.
- *Skip repeat visits*, or crawlers and returning users pay for it every time.
  sessionStorage, checked by an inline script before first paint.
- *`prefers-reduced-motion` skips it outright* rather than shortening it.

Motion is CSS, not JavaScript, so it begins on the first painted frame instead
of waiting for hydration. The path uses `pathLength="100"`, which makes the
draw normalised — the geometry can be retuned without retiming anything — and
the comet at the head of the line rides the *same* path string via
`offset-path`, so the two can't drift apart.

**A `preinstall` guard rejects npm.** `node_modules` is pnpm-linked;
`npm install` would rebuild it incorrectly. The guard checks
`npm_config_user_agent` and exits with a one-line instruction. `npm run <script>`
is unaffected, because only the install lifecycle is blocked.

**three.js was deduped.** `react-globe.gl` pulls three 0.185 while we had pinned
0.171, so two copies were being bundled — the browser console said so. Pinned to
0.185.1 to match.
