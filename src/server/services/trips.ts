import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { toTripDTO, type TripDTO, type TripSummary } from "@/server/dto";
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "@/server/http/errors";
import { paged, skipTake, type Paged } from "@/server/http/pagination";
import { computeBudget, type BudgetBreakdown, type BudgetInput } from "@/server/engine/budget";
import { findStopConflicts, shiftStops, validateTripWindow } from "@/server/engine/stop-dates";
import { daysBetween, fromISODate, type ISODate } from "@/lib/dates";
import type { CreateTripInput, TripListQuery, UpdateTripInput } from "@/lib/validators/trips";
import { logEvent } from "./analytics";
import type { UserDTO } from "@/server/dto";

/**
 * One `include` shape for the whole app. Loading a trip is always a single
 * round trip — trip → stops → city → activities → expenses — so there is no
 * N+1 anywhere, including on the list screens.
 */
const FULL_TRIP = {
  stops: {
    orderBy: { orderIndex: "asc" },
    include: {
      city: true,
      activities: { orderBy: { orderIndex: "asc" }, include: { activity: true } },
    },
  },
  expenses: { orderBy: { date: "asc" } },
  user: true,
} satisfies Prisma.TripInclude;

export type AccessLevel = "VIEW" | "EDIT" | "OWNER";

/* -------------------------------------------------------------------------- */
/* Access control — the single place ownership is decided                     */
/* -------------------------------------------------------------------------- */

/**
 * Every trip-scoped mutation funnels through here. Owners can do anything;
 * EDITOR collaborators can change the itinerary but not delete or share the
 * trip; VIEWER collaborators can only read.
 */
export async function assertTripAccess(
  tripId: string,
  user: Pick<UserDTO, "id" | "role">,
  level: AccessLevel = "VIEW",
) {
  const trip = await db.trip.findUnique({
    where: { id: tripId },
    include: { collaborators: { where: { userId: user.id } } },
  });

  if (!trip) throw new NotFoundError("That trip doesn't exist, or was deleted.");

  const isOwner = trip.userId === user.id;
  if (isOwner) return { trip, role: "OWNER" as const };

  // Admins can read anything for support and moderation, but never silently edit.
  if (user.role === "ADMIN" && level === "VIEW") return { trip, role: "VIEWER" as const };

  const membership = trip.collaborators[0];
  if (!membership) throw new NotFoundError("That trip doesn't exist, or was deleted.");

  if (level === "OWNER") throw new ForbiddenError("Only the trip owner can do that.");
  if (level === "EDIT" && membership.role !== "EDITOR") {
    throw new ForbiddenError("You have view-only access to this trip.");
  }

  return { trip, role: membership.role };
}

/* -------------------------------------------------------------------------- */
/* Reads                                                                      */
/* -------------------------------------------------------------------------- */

export async function getTrip(tripId: string, user: Pick<UserDTO, "id" | "role">): Promise<TripDTO> {
  const { role } = await assertTripAccess(tripId, user, "VIEW");

  const trip = await db.trip.findUnique({ where: { id: tripId }, include: FULL_TRIP });
  if (!trip) throw new NotFoundError("That trip doesn't exist, or was deleted.");

  const dto = toTripDTO(trip);
  return { ...dto, myRole: role, summary: summarize(dto) };
}

export async function listTrips(
  query: TripListQuery,
  user: Pick<UserDTO, "id">,
): Promise<Paged<TripDTO>> {
  const where: Prisma.TripWhereInput =
    query.tab === "shared"
      ? { collaborators: { some: { userId: user.id } } }
      : { userId: user.id };

  if (query.q) where.name = { contains: query.q, mode: "insensitive" };
  if (query.status) where.status = query.status;

  // "cost" isn't a column — it's the budget engine's output. For that sort we
  // load the user's trips (a bounded set) and page in memory; everything else
  // pages in SQL.
  if (query.sort === "cost") {
    const rows = await db.trip.findMany({ where, include: FULL_TRIP });
    const items = rows
      .map(toTripDTO)
      .map((trip) => ({ ...trip, summary: summarize(trip) }))
      .sort((a, b) => (b.summary?.total ?? 0) - (a.summary?.total ?? 0));

    const { skip, take } = skipTake(query);
    return paged(items.slice(skip, skip + take), items.length, query);
  }

  const orderBy: Prisma.TripOrderByWithRelationInput =
    query.sort === "start"
      ? { startDate: "asc" }
      : query.sort === "name"
        ? { name: "asc" }
        : { updatedAt: "desc" };

  const [rows, total] = await Promise.all([
    db.trip.findMany({ where, orderBy, ...skipTake(query), include: FULL_TRIP }),
    db.trip.count({ where }),
  ]);

  const items = rows.map(toTripDTO).map((trip) => ({ ...trip, summary: summarize(trip) }));
  return paged(items, total, query);
}

/* -------------------------------------------------------------------------- */
/* Writes                                                                     */
/* -------------------------------------------------------------------------- */

export async function createTrip(input: CreateTripInput, userId: string): Promise<TripDTO> {
  const window = validateTripWindow({ startDate: input.startDate, endDate: input.endDate });
  if (!window.ok) throw new ValidationError(window.message, { [window.field]: window.message });

  const trip = await db.trip.create({
    data: {
      userId,
      name: input.name,
      description: input.description || null,
      startDate: fromISODate(input.startDate),
      endDate: fromISODate(input.endDate),
      coverImageUrl: input.coverImageUrl || null,
      budgetLimit: input.budgetLimit ?? null,
      status: input.status ?? "PLANNING",
    },
    include: FULL_TRIP,
  });

  logEvent("trip.created", { userId, tripId: trip.id });
  return toTripDTO(trip);
}

export async function updateTrip(
  tripId: string,
  input: UpdateTripInput,
  user: Pick<UserDTO, "id" | "role">,
): Promise<TripDTO> {
  const { trip: existing } = await assertTripAccess(tripId, user, "EDIT");

  const startDate = input.startDate ?? existing.startDate.toISOString().slice(0, 10);
  const endDate = input.endDate ?? existing.endDate.toISOString().slice(0, 10);

  const window = validateTripWindow({ startDate, endDate });
  if (!window.ok) throw new ValidationError(window.message, { [window.field]: window.message });

  // Moving the trip dates can strand stops outside the new window. Either the
  // caller asked us to shift everything, or we hand back the offending stops
  // and let the UI offer that choice.
  const datesChanged =
    startDate !== existing.startDate.toISOString().slice(0, 10) ||
    endDate !== existing.endDate.toISOString().slice(0, 10);

  if (datesChanged) {
    const stops = await db.tripStop.findMany({
      where: { tripId },
      orderBy: { orderIndex: "asc" },
      include: { city: { select: { name: true } } },
    });

    const windows = stops.map((s) => ({
      id: s.id,
      cityName: s.city.name,
      arrivalDate: s.arrivalDate.toISOString().slice(0, 10) as ISODate,
      departureDate: s.departureDate.toISOString().slice(0, 10) as ISODate,
    }));

    const conflicts = findStopConflicts({ startDate, endDate }, windows);

    if (conflicts.length > 0) {
      if (!input.shiftStops) {
        throw new ConflictError(
          `${conflicts.length === 1 ? "One stop no longer fits" : `${conflicts.length} stops no longer fit`} in these dates.`,
          { conflicts },
        );
      }

      const offset = daysBetween(existing.startDate.toISOString().slice(0, 10), startDate);
      const shifted = shiftStops(offset, windows, { startDate, endDate });

      await db.$transaction(
        shifted.map((s) =>
          db.tripStop.update({
            where: { id: s.id },
            data: {
              arrivalDate: fromISODate(s.arrivalDate),
              departureDate: fromISODate(s.departureDate),
            },
          }),
        ),
      );
    }
  }

  const trip = await db.trip.update({
    where: { id: tripId },
    data: {
      name: input.name,
      description: input.description === undefined ? undefined : input.description || null,
      startDate: input.startDate ? fromISODate(input.startDate) : undefined,
      endDate: input.endDate ? fromISODate(input.endDate) : undefined,
      coverImageUrl:
        input.coverImageUrl === undefined ? undefined : input.coverImageUrl || null,
      budgetLimit: input.budgetLimit === undefined ? undefined : input.budgetLimit,
      status: input.status,
    },
    include: FULL_TRIP,
  });

  logEvent("trip.updated", { userId: user.id, tripId });
  return toTripDTO(trip);
}

export async function deleteTrip(tripId: string, user: Pick<UserDTO, "id" | "role">) {
  await assertTripAccess(tripId, user, "OWNER");
  await db.trip.delete({ where: { id: tripId } }); // cascades to stops, activities, expenses
  logEvent("trip.deleted", { userId: user.id });
  return { id: tripId };
}

/* -------------------------------------------------------------------------- */
/* Budget                                                                     */
/* -------------------------------------------------------------------------- */

export async function getTripBudget(
  tripId: string,
  user: Pick<UserDTO, "id" | "role">,
): Promise<BudgetBreakdown & { trip: TripDTO }> {
  const trip = await getTrip(tripId, user);
  return { ...computeBudget(budgetInputFor(trip)), trip };
}

/** Map a trip DTO onto the engine's input shape. */
export function budgetInputFor(trip: TripDTO): BudgetInput {
  return {
    startDate: trip.startDate,
    endDate: trip.endDate,
    budgetLimit: trip.budgetLimit,
    stops: trip.stops.map((stop) => ({
      id: stop.id,
      cityName: stop.city.name,
      arrivalDate: stop.arrivalDate,
      departureDate: stop.departureDate,
      stayCostPerNight: stop.stayCostPerNight,
      transportCostToNext: stop.transportCostToNext,
      avgMealCost: stop.city.avgMealCost,
      activities: stop.activities.map((a) => ({
        id: a.id,
        name: a.name,
        date: a.date,
        cost: a.cost,
      })),
    })),
    expenses: trip.expenses.map((e) => ({
      id: e.id,
      category: e.category,
      label: e.label,
      amount: e.amount,
      date: e.date,
    })),
  };
}

/** The few numbers a TripCard shows, computed from the same engine. */
export function summarize(trip: TripDTO): TripSummary {
  const budget = computeBudget(budgetInputFor(trip));
  return {
    stopCount: trip.stops.length,
    nights: trip.stops.reduce((sum, s) => sum + s.nights, 0),
    activityCount: trip.stops.reduce((sum, s) => sum + s.activities.length, 0),
    total: budget.total,
    cities: trip.stops.map((s) => s.city.name),
  };
}

/* -------------------------------------------------------------------------- */
/* Calendar                                                                   */
/* -------------------------------------------------------------------------- */

export type CalendarDay = {
  date: ISODate;
  stopId: string | null;
  cityName: string | null;
  region: string | null;
  spend: number;
  status: "under" | "near" | "over";
  activities: { id: string; name: string; startMinute: number | null; cost: number }[];
};

export async function getTripCalendar(tripId: string, user: Pick<UserDTO, "id" | "role">) {
  const trip = await getTrip(tripId, user);
  const budget = computeBudget(budgetInputFor(trip));

  const days: CalendarDay[] = budget.byDay.map((day) => {
    // Departure day belongs to the stop you're leaving, which is why this is
    // an inclusive range on both ends.
    const stop = trip.stops.find(
      (s) => day.date >= s.arrivalDate && day.date <= s.departureDate,
    );

    return {
      date: day.date,
      stopId: stop?.id ?? null,
      cityName: stop?.city.name ?? null,
      region: stop?.city.region ?? null,
      spend: day.spend,
      status: day.status,
      activities:
        stop?.activities
          .filter((a) => a.date === day.date)
          .map((a) => ({
            id: a.id,
            name: a.name,
            startMinute: a.startMinute,
            cost: a.cost,
          })) ?? [],
    };
  });

  return { trip, days, budget };
}
