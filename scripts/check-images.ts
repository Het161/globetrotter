/**
 * Every non-null image URL in the database gets a HEAD request, so a broken
 * photo can't surprise anyone mid-demo.
 *
 *   pnpm check:images
 *
 * All 48 cities ship a photo under `public/cities/`, so this checks those are
 * actually being served. Activities still default to `imageUrl: null` and fall
 * back to the Postcard component, so they contribute nothing to check.
 *
 * The paths are app-relative, which means the dev or production server has to
 * be up for this to mean anything — it resolves them against
 * NEXT_PUBLIC_APP_URL.
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const BASE = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

type Target = { kind: string; label: string; url: string };

async function main() {
  const [cities, activities, trips, users] = await Promise.all([
    db.city.findMany({ where: { imageUrl: { not: null } }, select: { name: true, imageUrl: true } }),
    db.activity.findMany({
      where: { imageUrl: { not: null } },
      select: { name: true, imageUrl: true },
    }),
    db.trip.findMany({
      where: { coverImageUrl: { not: null } },
      select: { name: true, coverImageUrl: true },
    }),
    db.user.findMany({ where: { avatarUrl: { not: null } }, select: { name: true, avatarUrl: true } }),
  ]);

  const targets: Target[] = [
    ...cities.map((c) => ({ kind: "city", label: c.name, url: c.imageUrl! })),
    ...activities.map((a) => ({ kind: "activity", label: a.name, url: a.imageUrl! })),
    ...trips.map((t) => ({ kind: "trip cover", label: t.name, url: t.coverImageUrl! })),
    ...users.map((u) => ({ kind: "avatar", label: u.name, url: u.avatarUrl! })),
  ];

  if (targets.length === 0) {
    console.log("\nNothing to check — every image falls back to the Postcard component.\n");
    await db.$disconnect();
    return;
  }

  console.log(`\nChecking ${targets.length} image URL(s)…\n`);
  const broken: Target[] = [];

  for (const target of targets) {
    // Relative uploads live under public/, so resolve them against the app.
    const url = target.url.startsWith("http") ? target.url : `${BASE}${target.url}`;

    try {
      const response = await fetch(url, { method: "HEAD" });
      const ok = response.ok;
      console.log(`${ok ? "  ok " : " FAIL"}  ${target.kind.padEnd(11)} ${target.label}`);
      if (!ok) broken.push(target);
    } catch {
      console.log(` FAIL  ${target.kind.padEnd(11)} ${target.label} (unreachable)`);
      broken.push(target);
    }
  }

  console.log(
    broken.length === 0
      ? "\nEvery image resolves.\n"
      : `\n${broken.length} broken image(s) — clear the URL to fall back to the Postcard.\n`,
  );

  await db.$disconnect();
  if (broken.length > 0) process.exit(1);
}

main().catch(async (error) => {
  console.error(error);
  await db.$disconnect();
  process.exit(1);
});
