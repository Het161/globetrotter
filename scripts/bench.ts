/**
 * Measures the API against the performance budget in §12.
 *
 * It reads the `Server-Timing: app;dur=` header, so these are the server's own
 * numbers for the handler — not round-trip time inflated by localhost TCP.
 *
 *   pnpm bench                    # against http://localhost:3000
 *   BASE=http://host pnpm bench
 *
 * Requires the app to be running and the database seeded.
 */

const BASE = process.env.BASE ?? "http://localhost:3000";
const RUNS = Number(process.env.RUNS ?? 30);

const DEMO = { email: "demo@globetrotter.app", password: "Demo@1234" };

/** Budgets from §12, in milliseconds. */
type Target = { name: string; path: string; budget: number };

async function main() {
  console.log(`\nGlobeTrotter API bench · ${RUNS} runs each · ${BASE}\n`);

  // Sign in once and reuse the session cookie for every authenticated call.
  const login = await fetch(`${BASE}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(DEMO),
  });

  if (!login.ok) {
    console.error(`Could not sign in as ${DEMO.email}. Is the database seeded?`);
    process.exit(1);
  }

  const cookie = (login.headers.get("set-cookie") ?? "").split(";")[0];

  // Find a real trip id so the budget/calendar endpoints do real work.
  const tripsResponse = await fetch(`${BASE}/api/v1/trips?pageSize=1`, {
    headers: { cookie },
  });
  const trips = (await tripsResponse.json()) as { data: { id: string }[] };
  const tripId = trips.data[0]?.id;

  if (!tripId) {
    console.error("No trips found for the demo user. Run `pnpm db:seed` first.");
    process.exit(1);
  }

  const targets: Target[] = [
    { name: "cities · search", path: "/api/v1/cities?q=kyo&pageSize=12", budget: 15 },
    { name: "cities · list", path: "/api/v1/cities?sort=popular&pageSize=12", budget: 50 },
    { name: "activities · city", path: "/api/v1/cities/tokyo/activities?pageSize=12", budget: 50 },
    { name: "trips · list", path: "/api/v1/trips?pageSize=12", budget: 50 },
    { name: "trip · budget", path: `/api/v1/trips/${tripId}/budget`, budget: 25 },
    { name: "dashboard", path: "/api/v1/dashboard", budget: 50 },
  ];

  const rows: {
    endpoint: string;
    p50: string;
    p95: string;
    max: string;
    budget: string;
    verdict: string;
  }[] = [];

  for (const target of targets) {
    const samples: number[] = [];

    // One warm-up so we're not timing the first-hit compile in dev.
    await fetch(`${BASE}${target.path}`, { headers: { cookie } });

    for (let i = 0; i < RUNS; i++) {
      const response = await fetch(`${BASE}${target.path}`, { headers: { cookie } });
      const timing = response.headers.get("server-timing") ?? "";
      const match = /app;dur=([\d.]+)/.exec(timing);
      if (match) samples.push(Number(match[1]));
      await response.arrayBuffer();
    }

    if (samples.length === 0) {
      rows.push({
        endpoint: target.name,
        p50: "—",
        p95: "—",
        max: "—",
        budget: `${target.budget}`,
        verdict: "no timing header",
      });
      continue;
    }

    samples.sort((a, b) => a - b);
    const p50 = percentile(samples, 0.5);
    const p95 = percentile(samples, 0.95);

    rows.push({
      endpoint: target.name,
      p50: p50.toFixed(1),
      p95: p95.toFixed(1),
      max: samples[samples.length - 1].toFixed(1),
      budget: `${target.budget}`,
      verdict: p95 <= target.budget ? "PASS" : "OVER",
    });
  }

  console.table(rows);

  const failures = rows.filter((row) => row.verdict === "OVER");
  console.log(
    failures.length === 0
      ? "\nAll endpoints inside their §12 budget.\n"
      : `\n${failures.length} endpoint(s) over budget.\n`,
  );
}

function percentile(sorted: number[], q: number): number {
  const index = Math.min(sorted.length - 1, Math.floor(q * sorted.length));
  return sorted[index];
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
