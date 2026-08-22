/**
 * Idempotent seed. `pnpm db:reset` runs `migrate reset` then this file.
 *
 * Everything the app shows comes from here — there is no static JSON data
 * source anywhere in the running application.
 */
import { PrismaClient, type Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { cities } from "./seed-data/cities";
import { activitiesByCity, activityCount } from "./seed-data/activities";
import { demoTrips, EVENT_TYPES, type DemoTrip } from "./seed-data/demo";

const db = new PrismaClient();

const MS_PER_DAY = 86_400_000;

/** "YYYY-MM-DD" -> Date at UTC midnight, which is what @db.Date expects. */
function utcDate(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`);
}

function isoFromToday(offsetDays: number): string {
  const today = new Date();
  const utcMidnight = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  return new Date(utcMidnight + offsetDays * MS_PER_DAY).toISOString().slice(0, 10);
}

function addDays(iso: string, n: number): string {
  return new Date(utcDate(iso).getTime() + n * MS_PER_DAY).toISOString().slice(0, 10);
}

async function main() {
  console.log("→ seeding GlobeTrotter");

  /* ------------------------------------------------------------- cities -- */
  for (const city of cities) {
    await db.city.upsert({
      where: { slug: city.slug },
      update: {},
      create: {
        slug: city.slug,
        name: city.name,
        country: city.country,
        countryCode: city.countryCode,
        region: city.region,
        lat: city.lat,
        lng: city.lng,
        costIndex: city.costIndex,
        popularity: city.popularity,
        currency: city.currency,
        timezone: city.timezone,
        description: city.description,
        avgStayCost: city.avgStayCost,
        avgMealCost: city.avgMealCost,
      },
    });
  }
  console.log(`  cities      ${cities.length}`);

  const cityBySlug = new Map(
    (await db.city.findMany()).map((c) => [c.slug, c] as const),
  );

  /* --------------------------------------------------------- activities -- */
  const missing = Object.keys(activitiesByCity).filter((slug) => !cityBySlug.has(slug));
  if (missing.length) throw new Error(`activities reference unknown cities: ${missing.join(", ")}`);

  let activityRows = 0;
  for (const [slug, list] of Object.entries(activitiesByCity)) {
    const city = cityBySlug.get(slug)!;
    const existing = await db.activity.count({ where: { cityId: city.id } });
    if (existing > 0) {
      activityRows += existing;
      continue;
    }
    await db.activity.createMany({
      data: list.map((activity) => ({
        cityId: city.id,
        name: activity.name,
        category: activity.category,
        description: activity.description,
        estimatedCost: activity.estimatedCost,
        durationMin: activity.durationMin,
        popularity: activity.popularity,
      })),
    });
    activityRows += list.length;
  }
  console.log(`  activities  ${activityRows} (expected ${activityCount()})`);

  /* -------------------------------------------------------------- users -- */
  const [adminHash, demoHash] = await Promise.all([
    bcrypt.hash("Admin@1234", 10),
    bcrypt.hash("Demo@1234", 10),
  ]);

  const admin = await db.user.upsert({
    where: { email: "admin@globetrotter.app" },
    update: {},
    create: {
      email: "admin@globetrotter.app",
      passwordHash: adminHash,
      name: "Priya Nair",
      role: "ADMIN",
      currency: "INR",
    },
  });

  const demo = await db.user.upsert({
    where: { email: "demo@globetrotter.app" },
    update: {},
    create: {
      email: "demo@globetrotter.app",
      passwordHash: demoHash,
      name: "Aarav Mehta",
      role: "USER",
      currency: "INR",
    },
  });
  console.log("  users       2 (admin@globetrotter.app, demo@globetrotter.app)");

  /* --------------------------------------------------------- demo trips -- */
  const existingTrips = await db.trip.count({ where: { userId: demo.id } });
  if (existingTrips === 0) {
    for (const trip of demoTrips) {
      await createDemoTrip(trip, demo.id);
    }
    console.log(`  trips       ${demoTrips.length}`);
  } else {
    console.log(`  trips       ${existingTrips} (already present, skipped)`);
  }

  /* --------------------------------------------------- saved + analytics -- */
  const popular = await db.city.findMany({ orderBy: { popularity: "desc" }, take: 6 });
  for (const city of popular.slice(3)) {
    await db.savedCity.upsert({
      where: { userId_cityId: { userId: demo.id, cityId: city.id } },
      update: {},
      create: { userId: demo.id, cityId: city.id },
    });
  }

  const eventCount = await db.activityEvent.count();
  if (eventCount === 0) {
    await seedEvents(demo.id, admin.id);
    console.log("  events      200 across the last 30 days");
  } else {
    console.log(`  events      ${eventCount} (already present, skipped)`);
  }

  console.log("✓ seed complete");
}

/* -------------------------------------------------------------------------- */

async function createDemoTrip(spec: DemoTrip, userId: string) {
  const startDate = isoFromToday(spec.startsInDays);
  const totalNights = spec.stops.reduce((sum, s) => sum + s.nights, 0);
  const endDate = addDays(startDate, totalNights);

  const trip = await db.trip.create({
    data: {
      userId,
      name: spec.name,
      description: spec.description,
      startDate: utcDate(startDate),
      endDate: utcDate(endDate),
      budgetLimit: spec.budgetLimit,
      status: spec.status,
      isPublic: spec.isPublic,
      shareSlug: spec.shareSlug ?? null,
    },
  });

  let cursor = startDate;

  for (const [index, stopSpec] of spec.stops.entries()) {
    const city = await db.city.findUnique({ where: { slug: stopSpec.citySlug } });
    if (!city) throw new Error(`demo trip references unknown city ${stopSpec.citySlug}`);

    const arrival = cursor;
    const departure = addDays(arrival, stopSpec.nights);

    const stop = await db.tripStop.create({
      data: {
        tripId: trip.id,
        cityId: city.id,
        orderIndex: index,
        arrivalDate: utcDate(arrival),
        departureDate: utcDate(departure),
        stayCostPerNight: stopSpec.stayCostPerNight,
        transportCostToNext: stopSpec.transportCostToNext,
        transportMode: stopSpec.transportMode,
      },
    });

    const catalogue = await db.activity.findMany({ where: { cityId: city.id } });
    const byName = new Map(catalogue.map((row) => [row.name, row] as const));

    const rows: Prisma.StopActivityCreateManyInput[] = [];
    for (const [order, activitySpec] of stopSpec.activities.entries()) {
      const activity = byName.get(activitySpec.activity);
      if (!activity) {
        throw new Error(`demo trip references unknown activity "${activitySpec.activity}"`);
      }
      rows.push({
        stopId: stop.id,
        activityId: activity.id,
        date: utcDate(addDays(arrival, activitySpec.dayOffset)),
        startMinute: activitySpec.startMinute,
        durationMin: activity.durationMin,
        cost: activitySpec.cost ?? activity.estimatedCost,
        orderIndex: order,
      });
    }
    if (rows.length) await db.stopActivity.createMany({ data: rows });

    cursor = departure;
  }

  if (spec.expenses.length) {
    await db.tripExpense.createMany({
      data: spec.expenses.map((expense) => ({
        tripId: trip.id,
        category: expense.category,
        label: expense.label,
        amount: expense.amount,
        date: expense.dayOffset === null ? null : utcDate(addDays(startDate, expense.dayOffset)),
      })),
    });
  }

  return trip;
}

/**
 * 200 analytics rows spread across the last 30 days, weighted so recent days
 * are busier. The admin trend chart needs a shape, not a flat line.
 */
async function seedEvents(demoUserId: string, adminUserId: string) {
  const cityIds = (await db.city.findMany({ select: { id: true }, take: 20 })).map((c) => c.id);
  const tripIds = (await db.trip.findMany({ select: { id: true } })).map((t) => t.id);

  const rows: Prisma.ActivityEventCreateManyInput[] = [];
  for (let i = 0; i < 200; i++) {
    // Bias towards recent days: squaring a uniform value clusters near zero.
    const daysAgo = Math.floor(Math.pow(Math.random(), 2) * 30);
    const createdAt = new Date(Date.now() - daysAgo * MS_PER_DAY - Math.random() * MS_PER_DAY);

    rows.push({
      userId: Math.random() < 0.15 ? adminUserId : demoUserId,
      type: EVENT_TYPES[Math.floor(Math.random() * EVENT_TYPES.length)],
      tripId: tripIds.length ? tripIds[Math.floor(Math.random() * tripIds.length)] : null,
      cityId: cityIds.length ? cityIds[Math.floor(Math.random() * cityIds.length)] : null,
      createdAt,
    });
  }

  await db.activityEvent.createMany({ data: rows });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
