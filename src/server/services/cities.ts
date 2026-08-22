import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { toCityDTO, type CityDTO } from "@/server/dto";
import { NotFoundError } from "@/server/http/errors";
import { paged, skipTake, type Paged } from "@/server/http/pagination";
import type { CityListQuery } from "@/lib/validators/activities";

/** Cost bands shown as $ / $$ / $$$ in the Explore filters. */
const COST_BANDS = {
  low: { lte: 39 },
  mid: { gte: 40, lte: 69 },
  high: { gte: 70 },
} as const;

export async function listCities(
  query: CityListQuery,
  viewerId?: string | null,
): Promise<Paged<CityDTO>> {
  const where: Prisma.CityWhereInput = {};

  if (query.q) {
    // Postgres `contains` with mode:insensitive uses the trigram GIN indexes.
    where.OR = [
      { name: { contains: query.q, mode: "insensitive" } },
      { country: { contains: query.q, mode: "insensitive" } },
    ];
  }
  if (query.region) where.region = query.region;
  if (query.country) where.country = query.country;
  if (query.cost) where.costIndex = COST_BANDS[query.cost];

  const orderBy: Prisma.CityOrderByWithRelationInput =
    query.sort === "cost"
      ? { costIndex: "asc" }
      : query.sort === "name"
        ? { name: "asc" }
        : { popularity: "desc" };

  const [rows, total, saved] = await Promise.all([
    db.city.findMany({
      where,
      orderBy,
      ...skipTake(query),
      include: { _count: { select: { activities: true } } },
    }),
    db.city.count({ where }),
    viewerId
      ? db.savedCity.findMany({ where: { userId: viewerId }, select: { cityId: true } })
      : Promise.resolve([]),
  ]);

  const savedIds = new Set(saved.map((s) => s.cityId));

  return paged(
    rows.map((city) =>
      toCityDTO(city, { activityCount: city._count.activities, saved: savedIds.has(city.id) }),
    ),
    total,
    query,
  );
}

export async function getCityBySlug(slug: string, viewerId?: string | null): Promise<CityDTO> {
  const city = await db.city.findUnique({
    where: { slug },
    include: { _count: { select: { activities: true } } },
  });
  if (!city) throw new NotFoundError("We don't have that city yet.");

  const saved = viewerId
    ? await db.savedCity.findUnique({
        where: { userId_cityId: { userId: viewerId, cityId: city.id } },
      })
    : null;

  return toCityDTO(city, { activityCount: city._count.activities, saved: Boolean(saved) });
}

/** Distinct regions and countries, for the Explore filter controls. */
export async function getCityFacets() {
  const [regions, countries] = await Promise.all([
    db.city.groupBy({ by: ["region"], _count: true, orderBy: { region: "asc" } }),
    db.city.groupBy({ by: ["country"], _count: true, orderBy: { country: "asc" } }),
  ]);

  return {
    regions: regions.map((r) => ({ value: r.region, count: r._count })),
    countries: countries.map((c) => ({ value: c.country, count: c._count })),
  };
}

export async function listSavedCities(userId: string): Promise<CityDTO[]> {
  const rows = await db.savedCity.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: { city: { include: { _count: { select: { activities: true } } } } },
  });

  return rows.map((row) =>
    toCityDTO(row.city, { activityCount: row.city._count.activities, saved: true }),
  );
}

export async function saveCity(userId: string, cityId: string) {
  const city = await db.city.findUnique({ where: { id: cityId } });
  if (!city) throw new NotFoundError("We don't have that city yet.");

  await db.savedCity.upsert({
    where: { userId_cityId: { userId, cityId } },
    update: {},
    create: { userId, cityId },
  });
  return { saved: true };
}

export async function unsaveCity(userId: string, cityId: string) {
  await db.savedCity
    .delete({ where: { userId_cityId: { userId, cityId } } })
    .catch(() => null); // already gone is a success from the caller's point of view
  return { saved: false };
}
