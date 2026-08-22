import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { toActivityDTO, type ActivityDTO } from "@/server/dto";
import { NotFoundError } from "@/server/http/errors";
import { paged, skipTake, type Paged } from "@/server/http/pagination";
import type { ActivityListQuery } from "@/lib/validators/activities";

export async function listActivitiesForCity(
  citySlug: string,
  query: ActivityListQuery,
): Promise<Paged<ActivityDTO>> {
  const city = await db.city.findUnique({ where: { slug: citySlug }, select: { id: true } });
  if (!city) throw new NotFoundError("We don't have that city yet.");

  return listActivitiesForCityId(city.id, query);
}

export async function listActivitiesForCityId(
  cityId: string,
  query: ActivityListQuery,
): Promise<Paged<ActivityDTO>> {
  const where: Prisma.ActivityWhereInput = { cityId };

  if (query.q) where.name = { contains: query.q, mode: "insensitive" };
  if (query.category) where.category = query.category;
  if (query.maxCost !== undefined) where.estimatedCost = { lte: query.maxCost };
  if (query.maxDuration !== undefined) where.durationMin = { lte: query.maxDuration };

  const orderBy: Prisma.ActivityOrderByWithRelationInput =
    query.sort === "cost"
      ? { estimatedCost: "asc" }
      : query.sort === "duration"
        ? { durationMin: "asc" }
        : query.sort === "name"
          ? { name: "asc" }
          : { popularity: "desc" };

  const [rows, total] = await Promise.all([
    db.activity.findMany({
      where,
      orderBy,
      ...skipTake(query),
      include: { city: { select: { name: true, slug: true } } },
    }),
    db.activity.count({ where }),
  ]);

  return paged(rows.map(toActivityDTO), total, query);
}

export async function getActivity(id: string): Promise<ActivityDTO> {
  const activity = await db.activity.findUnique({
    where: { id },
    include: { city: { select: { name: true, slug: true } } },
  });
  if (!activity) throw new NotFoundError("That activity is no longer listed.");
  return toActivityDTO(activity);
}

/** The largest cost and duration in a city — drives the slider ranges. */
export async function getActivityFacets(cityId: string) {
  const [aggregate, categories] = await Promise.all([
    db.activity.aggregate({
      where: { cityId },
      _max: { estimatedCost: true, durationMin: true },
    }),
    db.activity.groupBy({ by: ["category"], where: { cityId }, _count: true }),
  ]);

  return {
    maxCost: Math.ceil(Number(aggregate._max.estimatedCost ?? 0)),
    maxDuration: aggregate._max.durationMin ?? 0,
    categories: categories
      .map((c) => ({ value: c.category, count: c._count }))
      .sort((a, b) => b.count - a.count),
  };
}
