# API

REST under `/api/v1`. Every handler goes through `withApi()`
(`src/server/http/withApi.ts`), so the envelope, the error vocabulary and the
timing header are identical everywhere.

## The envelope

Success:

```json
{
  "ok": true,
  "data": { },
  "meta": { "page": 1, "pageSize": 12, "total": 48, "ms": 3.61 }
}
```

Failure:

```json
{
  "ok": false,
  "error": {
    "code": "VALIDATION",
    "message": "Please check the highlighted fields.",
    "fields": { "email": "That email is already registered." }
  }
}
```

| `code` | HTTP | Meaning |
|---|---|---|
| `VALIDATION` | 400 | Input rejected. `fields` maps input name → message. |
| `UNAUTHENTICATED` | 401 | No valid session. |
| `FORBIDDEN` | 403 | Signed in, not allowed. |
| `NOT_FOUND` | 404 | Doesn't exist, or you can't see it. |
| `CONFLICT` | 409 | Valid input, impossible state. `details` carries the specifics. |
| `RATE_LIMIT` | 429 | Too many attempts. |
| `INTERNAL` | 500 | Our fault. Logged server-side, generalised for the client. |

Every response carries `Server-Timing: app;dur=<ms>` and `meta.ms` — the same
number the PerfPill shows in the UI.

**Pagination.** `?page=1&pageSize=12`, `pageSize` capped at 50. `meta.total` is
the unpaginated count.

**Auth.** A `gt_session` cookie (HS256 JWT, httpOnly, SameSite=Lax, 7 days), set
by login/signup/reset. Nothing to do by hand — the browser carries it.

---

## Auth

### `POST /auth/signup`
```json
{ "name": "Aarav Mehta", "email": "aarav@example.com", "password": "Travel@2027" }
```
→ `200` the user, and a session cookie. `400` with `fields.email` if taken.

### `POST /auth/login`
```json
{ "email": "demo@globetrotter.app", "password": "Demo@1234" }
```
→ `200` the user, and a session cookie.

Wrong password **and** unknown email both return the same thing —
`"Email or password is incorrect."` — and the unknown-email path still runs a
bcrypt hash so it doesn't answer measurably faster. Together those stop the form
being used to enumerate accounts.

### `POST /auth/logout`
→ `200 { "ok": true }`, cookie cleared.

### `POST /auth/forgot`
```json
{ "email": "demo@globetrotter.app" }
```
→ always `200 { "message": "If that email exists, we sent a reset link." }`,
whether or not the account exists.

There is no email provider in this build. In development the response also
carries `devResetUrl`, which the UI shows in a dashed "development only" panel.
In production that field is simply absent.

### `POST /auth/reset`
```json
{ "token": "<from the link>", "password": "NewPass@2027", "confirm": "NewPass@2027" }
```
→ `200`, signs you in. `400` if the token is expired, already used, or unknown.

Only the SHA-256 hash of the token is stored, so a leaked database row can't
reset anything. Using a token voids every other outstanding token for that
account.

### `GET /auth/me`
→ `200 { "user": {...} | null }`

---

## Cities and activities

### `GET /cities`
`?q=` `&region=` `&country=` `&cost=low|mid|high` `&sort=popular|cost|name` `&page=` `&pageSize=`

```
GET /api/v1/cities?q=kyo&pageSize=2
```
```json
{
  "ok": true,
  "data": [
    { "id": "…", "slug": "tokyo", "name": "Tokyo", "country": "Japan",
      "countryCode": "JP", "region": "Asia", "lat": 35.6762, "lng": 139.6503,
      "costIndex": 72, "popularity": 97, "currency": "JPY",
      "avgStayCost": 140, "avgMealCost": 40, "activityCount": 6, "saved": false },
    { "…": "Kyoto" }
  ],
  "meta": { "page": 1, "pageSize": 2, "total": 2, "ms": 2.61 }
}
```

`q` runs against the trigram indexes on name and country, so `kyo` matches both
To**kyo** and **Kyo**to. `cost` bands map to `costIndex`: low ≤ 39, mid 40–69,
high ≥ 70.

### `GET /cities/[slug]`
→ one city, including `saved` for the current viewer.

### `GET /cities/[slug]/activities`
`?q=` `&category=` `&maxCost=` `&maxDuration=` `&sort=popular|cost|duration|name` `&page=`

---

## Trips

### `GET /trips`
`?q=` `&status=` `&tab=mine|shared` `&sort=updated|start|cost|name` `&page=`

Each row carries a `summary` computed by the budget engine:

```json
{ "id": "…", "name": "Japan Cherry Blossom '27",
  "startDate": "2027-03-24", "endDate": "2027-04-01", "days": 9,
  "status": "UPCOMING", "isPublic": true, "shareSlug": "japan-sakura-27",
  "summary": { "stopCount": 3, "nights": 8, "activityCount": 14,
               "total": 2632, "cities": ["Tokyo", "Kyoto", "Osaka"] } }
```

`sort=cost` is the exception to SQL paging: cost isn't a column, it's the
engine's output, so that one sort loads the user's trips and pages in memory.

### `POST /trips`
```json
{ "name": "Euro Summer", "startDate": "2027-06-01", "endDate": "2027-06-12",
  "description": "Three capitals.", "budgetLimit": 3000 }
```
Name 3–80 chars, end ≥ start, at most 60 days.

### `GET|PATCH|DELETE /trips/[id]`

`PATCH` with new dates re-validates every stop. If any no longer fits:

```json
{ "ok": false,
  "error": { "code": "CONFLICT",
    "message": "2 stops no longer fit in these dates.",
    "details": { "conflicts": [
      { "id": "…", "cityName": "Osaka", "reason": "Falls outside the trip dates." }
    ] } } }
```

Send `"shiftStops": true` to slide every stop by the same offset instead.

`DELETE` requires ownership — an `EDITOR` collaborator gets `403`.

### `GET /trips/[id]/budget`

The whole breakdown from one query:

```json
{ "total": 2632, "tripDays": 9, "avgPerDay": 292.44,
  "budgetLimit": 2900, "dailyLimit": 322.22,
  "byCategory": { "STAY": 1035, "TRANSPORT": 988, "ACTIVITIES": 265,
                  "MEALS": 302, "OTHER": 42 },
  "byStop": [ { "stopId": "…", "cityName": "Tokyo", "nights": 3,
                "stay": 435, "meals": 120, "transport": 95,
                "activities": 118, "total": 768 } ],
  "byDay": [ { "date": "2027-04-01", "spend": 650.78, "status": "over",
               "topItems": [ { "label": "Osaka · transport", "amount": 620 } ] } ],
  "overBudgetDays": ["2027-04-01"],
  "savingTips": [ { "id": "drop-night",
                    "message": "Dropping 1 night in Tokyo saves {money}.",
                    "amountUSD": 185 } ] }
```

`savingTips` messages carry a `{money}` placeholder so the engine never has to
know the viewer's display currency.

Invariant: `sum(byDay.spend) === total`, to the cent.

### `GET /trips/[id]/calendar`
The trip, plus one row per day tagged with its stop, region, spend, status and
activities. Both the calendar grid and the vertical timeline render from this.

---

## Stops

### `POST /trips/[id]/stops`
```json
{ "cityId": "…" }
```
Dates are optional. Left out, the engine puts the stop after the current last
one and gives it two nights, clipped to the end of the trip. No room:

```json
{ "ok": false, "error": { "code": "CONFLICT",
  "message": "No room left after Osaka — extend the trip or shorten a stop." } }
```

### `POST /trips/[id]/stops/reorder`
```json
{ "ids": ["stop_kyoto", "stop_tokyo", "stop_osaka"] }
```

The full ordered list, so the server never has to guess. In one transaction it
rewrites `orderIndex`, re-flows every date keeping each stop's night count, and
shifts that stop's activities by the same offset. Returns the re-flowed stops —
its answer is authoritative. Rejects with `409` if the stops need more nights
than the trip has.

### `PATCH /stops/[id]` · `DELETE /stops/[id]`
Editable: `arrivalDate`, `departureDate`, `stayCostPerNight`,
`transportCostToNext`, `transportMode`, `notes`. Shortening a stay pulls any
stranded activity back inside it rather than orphaning it. Deleting closes the
gap in `orderIndex`.

---

## Activities on a trip

### `POST /stops/[id]/activities`
```json
{ "activityId": "…", "date": "2027-03-25", "startMinute": 570 }
```
or a custom one:
```json
{ "customName": "Dinner with Kenji", "date": "2027-03-25",
  "startMinute": 1140, "durationMin": 120, "cost": 60 }
```
Cost and duration default from the catalogue. `date` must fall inside the stop's
stay; `startMinute` is 0–1439; `durationMin` is 15–1440.

### `PATCH|DELETE /stop-activities/[id]`, `POST /stop-activities/[id]/move`
### `POST /stops/[id]/activities/reorder`

---

## Expenses

### `POST /trips/[id]/expenses`
```json
{ "category": "TRANSPORT", "label": "JR Pass, 7 days", "amount": 235, "date": null }
```
A null `date` is meaningful: the engine spreads that expense evenly across the
trip instead of spiking one day.

### `DELETE /expenses/[id]`

---

## Sharing

### `POST /trips/[id]/share`
```json
{ "isPublic": true }
```
→ `{ "isPublic": true, "shareSlug": "V1StGXR8_Z" }`

Owner only. Going private keeps the slug so the URL survives.

### `POST /share/[slug]/copy`
Requires a session. Deep-clones trip → stops → activities → expenses in one
transaction, named `"Copy of …"`, private, with `copiedFromId` set. Returns the
new trip.

### `GET|POST /trips/[id]/collaborators` · `DELETE /trips/[id]/collaborators/[userId]`
```json
{ "email": "friend@example.com", "role": "EDITOR" }
```
They must already have an account.

---

## Me

| Endpoint | Notes |
|---|---|
| `PATCH /me` | name, email, avatarUrl, language, currency. Re-issues the session when the email changes. |
| `DELETE /me` | Cascades everything. |
| `POST /me/password` | Requires the current password. |
| `GET|POST /me/saved-cities`, `DELETE /me/saved-cities/[cityId]` | Saved destinations. |
| `GET /dashboard` | Everything the dashboard needs, in one `Promise.all`. |
| `POST /upload` | multipart. JPEG/PNG/WebP, ≤ 2 MB, → `{ "url": "/uploads/….jpg" }`. The one route that can't use `withApi`, since that parses JSON — but it returns the same envelope. |

---

## Admin

All require `role = ADMIN`; anything else gets `403`.

| Endpoint | Returns |
|---|---|
| `GET /admin/overview` | KPIs, 30-day trip and signup series, top cities, category mix |
| `GET /admin/users?q=&page=` | Paginated accounts with trip counts and last activity |
| `PATCH /admin/users/[id]` | `{ "role": "ADMIN" }`. You can't change your own role. |
| `DELETE /admin/users/[id]` | You can't delete yourself here — use Settings. |
| `GET /admin/trips?q=&page=` | Every trip with owner and visibility |
