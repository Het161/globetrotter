# GlobeTrotter

**Plan the route. Know the cost. Share the story.**

A personalised multi-city trip planner. Build an itinerary across as many cities
as you like, drop activities onto real days, watch the budget update as you
plan, and share the finished plan as a read-only page anyone can copy.

Built for the Odoo × LDCE Ahmedabad Hackathon '26.

---

## Run it

Requires **Node 22+**, **pnpm**, and a local **PostgreSQL 15 or 16**.

```bash
# 1. Database
createdb globetrotter

# 2. Environment — copy and set DATABASE_URL to your local Postgres
cp .env.example .env

# 3. Install, migrate, seed
pnpm install
pnpm db:migrate      # creates the 11 tables + pg_trgm search indexes
pnpm db:seed         # 48 cities, 288 activities, 2 users, 3 demo trips

# 4. Go
pnpm dev             # http://localhost:3000
```

### Sign in

| Account | Email | Password |
|---|---|---|
| Traveller (has demo trips) | `demo@globetrotter.app` | `Demo@1234` |
| Admin | `admin@globetrotter.app` | `Admin@1234` |

The login screen has a one-click button for each, so you don't have to type them.

### The 60-second tour

1. Sign in as the demo traveller → **Dashboard**: globe drawing the next trip's
   route, a departure board, and total planned spend on split-flap digits.
2. Open **Japan Cherry Blossom '27 → Builder**: drag Kyoto above Tokyo. Every
   date re-flows and the running total moves as you drop it.
3. **Budget**: one day is over the daily allowance, two are close. All three
   states on one screen.
4. **Share** → the trip is already public at
   [`/s/japan-sakura-27`](http://localhost:3000/s/japan-sakura-27). Open it in a
   private window: read-only, with a copy button.

---

## Scripts

| Command | What it does |
|---|---|
| `pnpm dev` | Development server |
| `pnpm build` / `pnpm start` | Production build and serve |
| `pnpm verify` | typecheck → lint → tests → build. The gate before every commit. |
| `pnpm typecheck` | `tsc --noEmit`, strict, no `any` |
| `pnpm lint` | ESLint incl. the React Compiler rules |
| `pnpm test` | 21 vitest unit tests over the budget and date engines |
| `pnpm db:migrate` | Apply migrations |
| `pnpm db:seed` | Seed (idempotent — safe to re-run) |
| `pnpm db:reset` | Drop, re-migrate and re-seed. **Destroys data.** |
| `pnpm db:studio` | Prisma Studio |
| `pnpm bench` | Measure the API against the performance budget |
| `pnpm check:images` | HEAD-check every image URL in the database |

---

## Measured performance

`pnpm bench` with the app running and the database seeded. These are the
server's own numbers, read from the `Server-Timing` header — not round-trip
time. Run on an M-series Mac against local Postgres:

| Endpoint | p50 | p95 | Budget |
|---|---|---|---|
| `GET /cities?q=` (trigram search) | 2.6 ms | 4.3 ms | 15 ms |
| `GET /cities` (list) | 2.6 ms | 3.6 ms | 50 ms |
| `GET /cities/:slug/activities` | 1.2 ms | 1.6 ms | 50 ms |
| `GET /trips` | 4.3 ms | 5.3 ms | 50 ms |
| `GET /trips/:id/budget` | 5.1 ms | 6.2 ms | 25 ms |
| `GET /dashboard` | 4.8 ms | 9.0 ms | 50 ms |

Set `NEXT_PUBLIC_SHOW_PERF=1` (it's on in `.env.example`) and the app shows the
last measured response time live, in the cockpit bar and the Explore header.

---

## How it's built

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, RSC, Turbopack), React 19 |
| Language | TypeScript, `strict`, no `any`, no `@ts-ignore` |
| Database | PostgreSQL + Prisma 6 — 11 normalised tables, `pg_trgm` search indexes |
| Styling | Tailwind v4 (`@theme` tokens), Radix primitives restyled |
| Validation | zod schemas shared by client forms and server handlers |
| Auth | bcryptjs + `jose` JWT in an httpOnly cookie. No auth library. |
| Motion | `motion` — reorder, layout animation, page transitions |
| 3D | `react-globe.gl` / three.js, dynamically imported, globe routes only |
| Charts | recharts, dynamically imported, budget and admin routes only |

### Everything is real data

There is no static JSON data source in the running app. All 48 cities, 288
activities, every trip and every number on the admin dashboard comes out of
PostgreSQL. Seed data lives in `prisma/seed-data/` and is loaded by
`prisma/seed.ts`.

### It works offline

No runtime network dependency: fonts are committed to `public/fonts`, globe
textures to `public/globe`, QR codes are generated server-side by the `qrcode`
package, and OG images are rendered locally by `next/og`. Unplug the machine
and every screen still works.

---

## Where things live

```
prisma/            schema, migrations, seed + seed data
src/
  app/
    (marketing)/   landing
    (auth)/        login · signup · forgot · reset
    (app)/         everything behind the auth guard
    s/[slug]/      public share page + OG image
    api/v1/        36 REST route handlers
  components/
    ui/            the design system (DeckButton, Postcard, SplitFlap, RouteLine…)
    layout/        app shell — rail, top bar, breadcrumbs, ⌘K palette
    trips/ budget/ calendar/ explore/ share/ admin/   feature components
  server/
    engine/        pure budget + date logic (this is where the tests are)
    services/      all database access, all access control
    http/          withApi envelope, error vocabulary, pagination
  lib/             validators, currency, dates, api-client
```

Read [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for how the layers fit
together, and [`docs/REVIEW-CHEATSHEET.md`](docs/REVIEW-CHEATSHEET.md) for
straight answers to "why did you do it that way".

| Document | Contents |
|---|---|
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Layering, data flow, the design system |
| [`docs/DB-SCHEMA.md`](docs/DB-SCHEMA.md) | ER diagram, every index and why it exists |
| [`docs/API.md`](docs/API.md) | Every endpoint with a request and a response |
| [`docs/DECISIONS.md`](docs/DECISIONS.md) | Decisions taken during the build, and why |
| [`docs/DEMO-SCRIPT.md`](docs/DEMO-SCRIPT.md) | The five-minute demo, in order |
| [`docs/REVIEW-CHEATSHEET.md`](docs/REVIEW-CHEATSHEET.md) | Q&A for the code review |

---

## Notes for whoever runs this next

- **`pnpm db:reset` will refuse to run under an AI agent** without explicit
  consent — that's a Prisma 6.19 safety feature, not a bug. Run it yourself.
- **This repo was developed on an exFAT volume.** Two workarounds exist for
  that and are documented in `scripts/clean-appledouble.mjs`: macOS AppleDouble
  sidecars (`._page.tsx`) are stripped before every gate, and Turbopack's
  caches are dropped before `dev` and `build` because the two can't share them
  on exFAT. On APFS or ext4 neither costs you anything.
