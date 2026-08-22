# Demo script — 5 minutes

Before recording:

```bash
pnpm db:seed          # idempotent; skips anything already there
pnpm dev
```

Sign in as `demo@globetrotter.app` / `Demo@1234` and have a **private window**
open on `/s/japan-sakura-27` ready to switch to. Set the display currency to INR
(it already is for the demo user) — Indian lakh formatting on the split-flap is
worth showing.

Timings are targets, not a script to read aloud.

---

## 0:00 — Landing (20s)

Open `/`.

> "GlobeTrotter. Plan a multi-city trip, know what it costs before you book, and
> share it."

The globe is arcing between the six most popular cities **in the database** —
even the marketing page is reading real data. Click **Open your dashboard**.

---

## 0:20 — Dashboard (40s)

> "The route on the globe is my next trip. The departure board counts down. The
> total is what my upcoming trips add up to."

Point at three things:

- **the globe** — Paris → Barcelona → Rome, the arcs animating
- **departures** — real countdowns, computed from the dates
- **planned spend** — ₹4,37,850 on split-flap digits, and underneath it
  **"1 day over your daily limit"**, which is a real alert from the budget
  engine, not a badge

> "That alert is the thing this app is actually for."

Click it, or navigate to the Japan trip.

---

## 1:00 — The builder (90s) · **the centrepiece**

Open **Japan Cherry Blossom '27 → Builder**.

> "Three stops, eight nights. The route is on the left, the days on the right."

**Do these three things, in this order:**

1. **Drag Kyoto above Tokyo.**
   > "Every date re-flows. Each stop keeps the nights I gave it, and the
   > activities move with their stop."

   Point out that the running total moved *as you dropped it* — no spinner, and
   the route line's dashes animated while the server confirmed.

2. **Drag it back**, then click a day tab with an amber dot.
   > "Amber is close to my daily allowance. Red is over. Osaka's last day is
   > over because the flight home lands on it."

3. **Change a stay cost** — click "Stay per night", type a bigger number, tab
   out.
   > "Total updates immediately. That's the same budget function the server
   > runs, executing in the browser — so the optimistic number and the confirmed
   > number can't disagree."

If there's time: **Add stop** → search "kyo" → point out that it returns both
Kyoto *and* Tokyo (trigram search), and that the server picks sensible dates.

---

## 2:30 — Budget (60s)

Click **Budget**.

> "The same numbers, broken four ways."

- **the split-flap total** against the limit gauge — under budget by ₹22,351
- **the donut** — stay, transport, activities, meals
- **day by day** — six under, two near, one over, and the over bar is red
- scroll to **Days over the limit** — it names the day, how much over, and the
  three biggest items on it
- **Ways to trim it** — "Dropping 1 night in Tokyo saves ₹15,429", computed from
  that city's actual nightly rate plus a day of food

Add an expense: "Airport transfer", 4000, leave the date blank.

> "No date means it's spread evenly across the trip rather than spiking one day."

Watch the total and the daily bars move.

---

## 3:30 — Calendar (20s)

Click **Calendar**.

> "Same trip, as a month. Each day is tinted by the city I'm in, and the shade
> tracks what I spend there. The red ring is the over-budget day."

Toggle to **Timeline** — the route becomes the spine of the page.

---

## 3:50 — Share (50s)

Back to the trip → **Share**.

> "One switch makes it public. Turning it off keeps the same link, so anything
> I've already sent still works when I turn it back on."

Show the QR — generated locally, no external service.

**Switch to the private window** on `/s/japan-sakura-27`.

> "This is what someone else sees. Read-only, no account needed. The route draws
> itself in as you scroll."

Scroll past a city section, then hit **Copy this trip**.

> "It sends me to sign in, brings me straight back, and copies the whole
> itinerary — stops, activities, expenses — into my own account."

---

## 4:40 — Admin and the numbers (20s)

Sign in as `admin@globetrotter.app` / `Admin@1234` → `/admin`.

> "Every one of these is a live aggregate. Delete a trip and the tile moves —
> nothing here is a stored counter."

Then, if a terminal is visible, `pnpm bench`:

> "Search is 4 ms at p95 against a 15 ms budget, because city and activity
> search run on Postgres trigram indexes rather than a sequential scan. Those
> numbers come from the server's own `Server-Timing` header — and the app shows
> them live in the corner."

---

## Close

> "Everything is PostgreSQL — 48 cities, 288 activities, eleven normalised
> tables. It runs with no internet: fonts, globe textures, QR codes and social
> images are all local. Typecheck, lint, 21 unit tests on the budget and date
> engines, and a clean production build."

---

## If something goes wrong

| Symptom | Fix |
|---|---|
| Blank screen or stale data | `pnpm db:seed`, reload |
| Globe missing | Expected without the textures — arcs and atmosphere still render. Don't dwell. |
| Dev server won't start after a build | `pnpm dev` already clears the Turbopack caches; if it persists, `rm -rf .next` |
| Reset-link banner missing | Development only. Check `NODE_ENV`. |

**Don't demo:** deleting the demo account, or `pnpm db:reset` mid-recording.
