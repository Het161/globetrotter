import "server-only";
import type { Prisma, Role } from "@prisma/client";
import { db } from "@/server/db";
import { toTripDTO } from "@/server/dto";
import { ForbiddenError, NotFoundError } from "@/server/http/errors";
import { computeBudget } from "@/server/engine/budget";
import { paged, skipTake, type Paged } from "@/server/http/pagination";
import { budgetInputFor } from "./trips";
import type { AdminListQuery } from "@/lib/validators/admin";
import { toISODate } from "@/lib/dates";

/**
 * Everything here is a real aggregate over the tables. Nothing on the admin
 * screen is hardcoded — if you delete a trip, the KPI moves.
 */

export type AdminOverview = {
  kpis: {
    users: number;
    trips: number;
    stops: number;
    activitiesPlaced: number;
    publicTrips: number;
    copies: number;
    avgStopsPerTrip: number;
    avgTripBudget: number;
  };
  tripsPerDay: { date: string; count: number }[];
  signupsPerDay: { date: string; count: number }[];
  topCities: { name: string; country: string; stops: number }[];
  categoryMix: { category: string; count: number }[];
};

const TREND_DAYS = 30;

export async function getAdminOverview(): Promise<AdminOverview> {
  const since = new Date(Date.now() - TREND_DAYS * 86_400_000);

  const [
    users,
    trips,
    stops,
    activitiesPlaced,
    publicTrips,
    copies,
    tripRows,
    tripEvents,
    signupRows,
    topCityGroups,
    categoryGroups,
  ] = await Promise.all([
    db.user.count(),
    db.trip.count(),
    db.tripStop.count(),
    db.stopActivity.count(),
    db.trip.count({ where: { isPublic: true } }),
    db.trip.count({ where: { copiedFromId: { not: null } } }),
    db.trip.findMany({
      include: {
        stops: {
          include: {
            city: true,
            activities: { include: { activity: true } },
          },
        },
        expenses: true,
      },
    }),
    db.trip.findMany({
      where: { createdAt: { gte: since } },
      select: { createdAt: true },
    }),
    db.user.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
    db.tripStop.groupBy({ by: ["cityId"], _count: true, orderBy: { _count: { cityId: "desc" } }, take: 10 }),
    db.stopActivity.groupBy({ by: ["activityId"], _count: true }),
  ]);

  // Average trip budget uses the same engine the user sees — not a separate,
  // drifting SQL sum.
  const totals = tripRows.map((trip) => computeBudget(budgetInputFor(toTripDTO(trip))).total);
  const avgTripBudget = totals.length
    ? Math.round((totals.reduce((a, b) => a + b, 0) / totals.length) * 100) / 100
    : 0;

  const cityIds = topCityGroups.map((g) => g.cityId);
  const cityRows = await db.city.findMany({ where: { id: { in: cityIds } } });
  const cityById = new Map(cityRows.map((c) => [c.id, c] as const));

  const activityIds = categoryGroups
    .map((g) => g.activityId)
    .filter((id): id is string => Boolean(id));
  const activityRows = await db.activity.findMany({
    where: { id: { in: activityIds } },
    select: { id: true, category: true },
  });
  const categoryByActivity = new Map(activityRows.map((a) => [a.id, a.category] as const));

  const categoryTally = new Map<string, number>();
  for (const group of categoryGroups) {
    const category = group.activityId
      ? (categoryByActivity.get(group.activityId) ?? "CUSTOM")
      : "CUSTOM";
    categoryTally.set(category, (categoryTally.get(category) ?? 0) + group._count);
  }

  return {
    kpis: {
      users,
      trips,
      stops,
      activitiesPlaced,
      publicTrips,
      copies,
      avgStopsPerTrip: trips ? Math.round((stops / trips) * 10) / 10 : 0,
      avgTripBudget,
    },
    tripsPerDay: bucketByDay(tripEvents.map((t) => t.createdAt), TREND_DAYS),
    signupsPerDay: bucketByDay(signupRows.map((u) => u.createdAt), TREND_DAYS),
    topCities: topCityGroups.map((group) => ({
      name: cityById.get(group.cityId)?.name ?? "Unknown",
      country: cityById.get(group.cityId)?.country ?? "",
      stops: group._count,
    })),
    categoryMix: [...categoryTally.entries()]
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count),
  };
}

/** Dense day series — a chart with holes in it reads as a bug, not as zero. */
function bucketByDay(dates: Date[], days: number) {
  const tally = new Map<string, number>();
  for (let i = days - 1; i >= 0; i--) {
    tally.set(toISODate(new Date(Date.now() - i * 86_400_000)), 0);
  }
  for (const date of dates) {
    const key = toISODate(date);
    if (tally.has(key)) tally.set(key, (tally.get(key) ?? 0) + 1);
  }
  return [...tally.entries()].map(([date, count]) => ({ date, count }));
}

/* -------------------------------------------------------------------------- */
/* Tables                                                                     */
/* -------------------------------------------------------------------------- */

export type AdminUserRow = {
  id: string;
  name: string;
  email: string;
  role: Role;
  trips: number;
  createdAt: string;
  lastActive: string | null;
};

export async function listAdminUsers(query: AdminListQuery): Promise<Paged<AdminUserRow>> {
  const where: Prisma.UserWhereInput = query.q
    ? {
        OR: [
          { name: { contains: query.q, mode: "insensitive" } },
          { email: { contains: query.q, mode: "insensitive" } },
        ],
      }
    : {};

  const [rows, total] = await Promise.all([
    db.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      ...skipTake(query),
      include: {
        _count: { select: { trips: true } },
        events: { orderBy: { createdAt: "desc" }, take: 1, select: { createdAt: true } },
      },
    }),
    db.user.count({ where }),
  ]);

  return paged(
    rows.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      trips: user._count.trips,
      createdAt: user.createdAt.toISOString(),
      lastActive: user.events[0]?.createdAt.toISOString() ?? null,
    })),
    total,
    query,
  );
}

export type AdminTripRow = {
  id: string;
  name: string;
  owner: string;
  startDate: string;
  endDate: string;
  stops: number;
  isPublic: boolean;
  viewCount: number;
};

export async function listAdminTrips(query: AdminListQuery): Promise<Paged<AdminTripRow>> {
  const where: Prisma.TripWhereInput = query.q
    ? { name: { contains: query.q, mode: "insensitive" } }
    : {};

  const [rows, total] = await Promise.all([
    db.trip.findMany({
      where,
      orderBy: { createdAt: "desc" },
      ...skipTake(query),
      include: { user: { select: { name: true } }, _count: { select: { stops: true } } },
    }),
    db.trip.count({ where }),
  ]);

  return paged(
    rows.map((trip) => ({
      id: trip.id,
      name: trip.name,
      owner: trip.user.name,
      startDate: toISODate(trip.startDate),
      endDate: toISODate(trip.endDate),
      stops: trip._count.stops,
      isPublic: trip.isPublic,
      viewCount: trip.viewCount,
    })),
    total,
    query,
  );
}

export async function setUserRole(targetId: string, role: Role, actingUserId: string) {
  if (targetId === actingUserId) {
    throw new ForbiddenError("You can't change your own role.");
  }
  const user = await db.user.findUnique({ where: { id: targetId } });
  if (!user) throw new NotFoundError("That account no longer exists.");

  const updated = await db.user.update({ where: { id: targetId }, data: { role } });
  return { id: updated.id, role: updated.role };
}

export async function deleteUser(targetId: string, actingUserId: string) {
  if (targetId === actingUserId) {
    throw new ForbiddenError("Delete your own account from Settings instead.");
  }
  const user = await db.user.findUnique({ where: { id: targetId } });
  if (!user) throw new NotFoundError("That account no longer exists.");

  await db.user.delete({ where: { id: targetId } });
  return { id: targetId };
}
