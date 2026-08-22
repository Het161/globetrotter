import "server-only";
import { db } from "@/server/db";
import { toCityDTO, toTripDTO, type CityDTO, type TripDTO } from "@/server/dto";
import { computeBudget } from "@/server/engine/budget";
import { budgetInputFor, summarize } from "./trips";
import { todayISO } from "@/lib/dates";

export type DashboardData = {
  upcoming: TripDTO[];
  recent: TripDTO[];
  totals: {
    trips: number;
    citiesVisited: number;
    upcomingSpend: number;
    overBudgetDays: number;
  };
  recommended: CityDTO[];
  /** The next trip's route, for the globe tile. */
  route: { name: string; lat: number; lng: number }[];
  nextTrip: TripDTO | null;
  /** Fallback points for the globe when the user has no trips yet. */
  popularPoints: { name: string; lat: number; lng: number }[];
};

const TRIP_INCLUDE = {
  stops: {
    orderBy: { orderIndex: "asc" as const },
    include: {
      city: true,
      activities: { orderBy: { orderIndex: "asc" as const }, include: { activity: true } },
    },
  },
  expenses: true,
};

export async function getDashboard(userId: string): Promise<DashboardData> {
  const today = todayISO();

  // One parallel batch — the dashboard is the heaviest read in the app and it
  // still costs a single round trip's worth of latency.
  const [upcomingRows, recentRows, tripCount, visitedCities, popular, usedCityIds] =
    await Promise.all([
      db.trip.findMany({
        where: { userId, endDate: { gte: new Date(`${today}T00:00:00.000Z`) } },
        orderBy: { startDate: "asc" },
        take: 3,
        include: TRIP_INCLUDE,
      }),
      db.trip.findMany({
        where: { userId },
        orderBy: { updatedAt: "desc" },
        take: 4,
        include: TRIP_INCLUDE,
      }),
      db.trip.count({ where: { userId } }),
      db.tripStop.findMany({
        where: { trip: { userId } },
        select: { cityId: true },
        distinct: ["cityId"],
      }),
      db.city.findMany({ orderBy: { popularity: "desc" }, take: 24 }),
      db.tripStop.findMany({
        where: { trip: { userId } },
        select: { cityId: true },
        distinct: ["cityId"],
      }),
    ]);

  const upcoming = upcomingRows.map(toTripDTO).map((t) => ({ ...t, summary: summarize(t) }));
  const recent = recentRows.map(toTripDTO).map((t) => ({ ...t, summary: summarize(t) }));

  // Real query, not a hardcoded list: the most popular cities this user hasn't
  // already put in a trip.
  const alreadyPlanned = new Set(usedCityIds.map((s) => s.cityId));
  const recommended = popular
    .filter((city) => !alreadyPlanned.has(city.id))
    .slice(0, 8)
    .map((city) => toCityDTO(city));

  let upcomingSpend = 0;
  let overBudgetDays = 0;
  for (const trip of upcoming) {
    const budget = computeBudget(budgetInputFor(trip));
    upcomingSpend += budget.total;
    overBudgetDays += budget.overBudgetDays.length;
  }

  const nextTrip = upcoming[0] ?? null;

  return {
    upcoming,
    recent,
    totals: {
      trips: tripCount,
      citiesVisited: visitedCities.length,
      upcomingSpend: Math.round(upcomingSpend * 100) / 100,
      overBudgetDays,
    },
    recommended,
    nextTrip,
    route:
      nextTrip?.stops.map((stop) => ({
        name: stop.city.name,
        lat: stop.city.lat,
        lng: stop.city.lng,
      })) ?? [],
    popularPoints: popular.slice(0, 12).map((city) => ({
      name: city.name,
      lat: city.lat,
      lng: city.lng,
    })),
  };
}
