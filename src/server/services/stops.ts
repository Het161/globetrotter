import "server-only";
import { db } from "@/server/db";
import { toStopDTO, type StopDTO, type UserDTO } from "@/server/dto";
import { ConflictError, NotFoundError, ValidationError } from "@/server/http/errors";
import {
  findStopConflicts,
  planNextStop,
  reflowStops,
  type StopWindow,
} from "@/server/engine/stop-dates";
import { fromISODate, nights, toISODate, type ISODate } from "@/lib/dates";
import type { CreateStopInput, UpdateStopInput } from "@/lib/validators/stops";
import { assertTripAccess } from "./trips";
import { logEvent } from "./analytics";

const STOP_INCLUDE = {
  city: true,
  activities: { orderBy: { orderIndex: "asc" as const }, include: { activity: true } },
};

/** Stops are only ever addressed by id, so we resolve their trip first. */
async function stopWithTrip(stopId: string) {
  const stop = await db.tripStop.findUnique({
    where: { id: stopId },
    include: { ...STOP_INCLUDE, trip: true },
  });
  if (!stop) throw new NotFoundError("That stop is no longer on the trip.");
  return stop;
}

/* -------------------------------------------------------------------------- */

export async function addStop(
  tripId: string,
  input: CreateStopInput,
  user: Pick<UserDTO, "id" | "role">,
): Promise<StopDTO> {
  const { trip } = await assertTripAccess(tripId, user, "EDIT");

  const city = await db.city.findUnique({ where: { id: input.cityId } });
  if (!city) throw new NotFoundError("We don't have that city yet.");

  const existing = await db.tripStop.findMany({
    where: { tripId },
    orderBy: { orderIndex: "asc" },
    include: { city: { select: { name: true } } },
  });

  const window = {
    startDate: toISODate(trip.startDate),
    endDate: toISODate(trip.endDate),
  };

  // Explicit dates win; otherwise the engine picks the next free slot.
  let arrivalDate: ISODate;
  let departureDate: ISODate;

  if (input.arrivalDate && input.departureDate) {
    arrivalDate = input.arrivalDate;
    departureDate = input.departureDate;
  } else {
    const planned = planNextStop(
      window,
      existing.map((s) => ({
        departureDate: toISODate(s.departureDate),
        cityName: s.city.name,
      })),
      input.nights,
    );
    if (!planned.ok) throw new ConflictError(planned.message);
    arrivalDate = planned.arrivalDate;
    departureDate = planned.departureDate;
  }

  const candidate: StopWindow[] = [
    ...existing.map((s) => ({
      id: s.id,
      cityName: s.city.name,
      arrivalDate: toISODate(s.arrivalDate),
      departureDate: toISODate(s.departureDate),
    })),
    { id: "new", cityName: city.name, arrivalDate, departureDate },
  ];

  const conflicts = findStopConflicts(window, candidate);
  if (conflicts.length > 0) {
    throw new ConflictError(
      `${conflicts[0].cityName}: ${conflicts[0].reason}`,
      { conflicts },
    );
  }

  const stop = await db.tripStop.create({
    data: {
      tripId,
      cityId: city.id,
      orderIndex: existing.length,
      arrivalDate: fromISODate(arrivalDate),
      departureDate: fromISODate(departureDate),
      // The city's baseline nightly rate is the starting point; the user edits it.
      stayCostPerNight: city.avgStayCost,
    },
    include: STOP_INCLUDE,
  });

  await touchTrip(tripId);
  logEvent("stop.added", { userId: user.id, tripId, cityId: city.id });
  return toStopDTO(stop);
}

export async function updateStop(
  stopId: string,
  input: UpdateStopInput,
  user: Pick<UserDTO, "id" | "role">,
): Promise<StopDTO> {
  const current = await stopWithTrip(stopId);
  await assertTripAccess(current.tripId, user, "EDIT");

  const arrivalDate = input.arrivalDate ?? toISODate(current.arrivalDate);
  const departureDate = input.departureDate ?? toISODate(current.departureDate);

  if (input.arrivalDate || input.departureDate) {
    const siblings = await db.tripStop.findMany({
      where: { tripId: current.tripId, id: { not: stopId } },
      include: { city: { select: { name: true } } },
    });

    const conflicts = findStopConflicts(
      {
        startDate: toISODate(current.trip.startDate),
        endDate: toISODate(current.trip.endDate),
      },
      [
        ...siblings.map((s) => ({
          id: s.id,
          cityName: s.city.name,
          arrivalDate: toISODate(s.arrivalDate),
          departureDate: toISODate(s.departureDate),
        })),
        { id: stopId, cityName: current.city.name, arrivalDate, departureDate },
      ],
    );

    const mine = conflicts.find((c) => c.id === stopId);
    if (mine) throw new ValidationError(mine.reason, { departureDate: mine.reason });
    if (conflicts.length > 0) {
      throw new ConflictError(`${conflicts[0].cityName}: ${conflicts[0].reason}`, { conflicts });
    }

    // Activities that now sit outside the stay would be invisible — pull them
    // back to the nearest day they can legally occupy.
    await clampActivitiesToStay(stopId, arrivalDate, departureDate);
  }

  const stop = await db.tripStop.update({
    where: { id: stopId },
    data: {
      arrivalDate: input.arrivalDate ? fromISODate(input.arrivalDate) : undefined,
      departureDate: input.departureDate ? fromISODate(input.departureDate) : undefined,
      stayCostPerNight: input.stayCostPerNight,
      transportCostToNext: input.transportCostToNext,
      transportMode: input.transportMode,
      notes: input.notes === undefined ? undefined : input.notes,
    },
    include: STOP_INCLUDE,
  });

  await touchTrip(current.tripId);
  return toStopDTO(stop);
}

export async function deleteStop(stopId: string, user: Pick<UserDTO, "id" | "role">) {
  const current = await stopWithTrip(stopId);
  await assertTripAccess(current.tripId, user, "EDIT");

  await db.$transaction(async (tx) => {
    await tx.tripStop.delete({ where: { id: stopId } });

    // Close the gap in orderIndex so the rail never shows a hole.
    const remaining = await tx.tripStop.findMany({
      where: { tripId: current.tripId },
      orderBy: { orderIndex: "asc" },
      select: { id: true },
    });
    await Promise.all(
      remaining.map((s, index) =>
        tx.tripStop.update({ where: { id: s.id }, data: { orderIndex: index } }),
      ),
    );
  });

  await touchTrip(current.tripId);
  logEvent("stop.removed", { userId: user.id, tripId: current.tripId });
  return { id: stopId };
}

/**
 * Reorder takes the full ordered id list, rewrites `orderIndex` and re-flows
 * every date in one transaction. Stops keep their night counts, so dragging
 * Kyoto above Tokyo moves both sets of dates rather than leaving a gap.
 */
export async function reorderStops(
  tripId: string,
  ids: string[],
  user: Pick<UserDTO, "id" | "role">,
): Promise<StopDTO[]> {
  const { trip } = await assertTripAccess(tripId, user, "EDIT");

  const stops = await db.tripStop.findMany({
    where: { tripId },
    include: { city: { select: { name: true } } },
  });

  if (stops.length !== ids.length || !stops.every((s) => ids.includes(s.id))) {
    throw new ValidationError("The stop list is out of date. Refresh and try again.");
  }

  const byId = new Map(stops.map((s) => [s.id, s] as const));
  const ordered = ids.map((id) => byId.get(id)!);

  const result = reflowStops(
    { startDate: toISODate(trip.startDate), endDate: toISODate(trip.endDate) },
    ordered.map((s) => ({
      id: s.id,
      cityName: s.city.name,
      nights: Math.max(1, nights(toISODate(s.arrivalDate), toISODate(s.departureDate))),
    })),
  );

  if (!result.ok) throw new ConflictError(result.message);

  await db.$transaction(async (tx) => {
    for (const [index, window] of result.stops.entries()) {
      const before = byId.get(window.id)!;
      const shift =
        new Date(`${window.arrivalDate}T00:00:00Z`).getTime() - before.arrivalDate.getTime();

      await tx.tripStop.update({
        where: { id: window.id },
        data: {
          orderIndex: index,
          arrivalDate: fromISODate(window.arrivalDate),
          departureDate: fromISODate(window.departureDate),
        },
      });

      // Activities move with their stop so nothing lands outside the new stay.
      if (shift !== 0) {
        const activities = await tx.stopActivity.findMany({ where: { stopId: window.id } });
        await Promise.all(
          activities.map((activity) =>
            tx.stopActivity.update({
              where: { id: activity.id },
              data: { date: new Date(activity.date.getTime() + shift) },
            }),
          ),
        );
      }
    }
  });

  await touchTrip(tripId);

  const refreshed = await db.tripStop.findMany({
    where: { tripId },
    orderBy: { orderIndex: "asc" },
    include: STOP_INCLUDE,
  });
  return refreshed.map(toStopDTO);
}

/* -------------------------------------------------------------------------- */

/** Pull any activity that now falls outside the stay back inside it. */
async function clampActivitiesToStay(stopId: string, arrival: ISODate, departure: ISODate) {
  const activities = await db.stopActivity.findMany({ where: { stopId } });

  const strays = activities.filter((activity) => {
    const day = toISODate(activity.date);
    return day < arrival || day > departure;
  });

  await Promise.all(
    strays.map((activity) => {
      const day = toISODate(activity.date);
      const clamped = day < arrival ? arrival : departure;
      return db.stopActivity.update({
        where: { id: activity.id },
        data: { date: fromISODate(clamped) },
      });
    }),
  );
}

/** Keep `updatedAt` honest so "recently updated" sorting means something. */
async function touchTrip(tripId: string) {
  await db.trip.update({ where: { id: tripId }, data: { updatedAt: new Date() } });
}
