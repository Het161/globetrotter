import "server-only";
import { db } from "@/server/db";
import { toStopActivityDTO, type StopActivityDTO, type UserDTO } from "@/server/dto";
import { NotFoundError, ValidationError } from "@/server/http/errors";
import { activityDateError } from "@/server/engine/stop-dates";
import { fromISODate, toISODate } from "@/lib/dates";
import type {
  AddStopActivityInput,
} from "@/lib/validators/activities";
import type { z } from "zod";
import type { updateStopActivitySchema } from "@/lib/validators/activities";
import { assertTripAccess } from "./trips";
import { logEvent } from "./analytics";

type UpdateInput = z.infer<typeof updateStopActivitySchema>;

async function stopActivityWithContext(id: string) {
  const row = await db.stopActivity.findUnique({
    where: { id },
    include: { activity: true, stop: { include: { city: { select: { name: true } } } } },
  });
  if (!row) throw new NotFoundError("That activity is no longer on the trip.");
  return row;
}

/* -------------------------------------------------------------------------- */

export async function addActivityToStop(
  stopId: string,
  input: AddStopActivityInput,
  user: Pick<UserDTO, "id" | "role">,
): Promise<StopActivityDTO> {
  const stop = await db.tripStop.findUnique({
    where: { id: stopId },
    include: { city: { select: { name: true } } },
  });
  if (!stop) throw new NotFoundError("That stop is no longer on the trip.");

  await assertTripAccess(stop.tripId, user, "EDIT");

  const stopWindow = {
    cityName: stop.city.name,
    arrivalDate: toISODate(stop.arrivalDate),
    departureDate: toISODate(stop.departureDate),
  };

  const dateError = activityDateError(input.date, stopWindow);
  if (dateError) throw new ValidationError(dateError, { date: dateError });

  // A catalogue activity supplies its own cost and duration as defaults; a
  // custom one must state them (with sane fallbacks).
  let catalogue = null;
  if (input.activityId) {
    catalogue = await db.activity.findUnique({ where: { id: input.activityId } });
    if (!catalogue) throw new NotFoundError("That activity is no longer listed.");
    if (catalogue.cityId !== stop.cityId) {
      throw new ValidationError(`That activity isn't in ${stop.city.name}.`);
    }
  }

  const sameDayCount = await db.stopActivity.count({
    where: { stopId, date: fromISODate(input.date) },
  });

  const created = await db.stopActivity.create({
    data: {
      stopId,
      activityId: catalogue?.id ?? null,
      customName: catalogue ? null : input.customName!,
      date: fromISODate(input.date),
      startMinute: input.startMinute ?? null,
      durationMin: input.durationMin ?? catalogue?.durationMin ?? 60,
      cost: input.cost ?? (catalogue ? Number(catalogue.estimatedCost) : 0),
      orderIndex: sameDayCount,
      notes: input.notes || null,
    },
    include: { activity: true },
  });

  await touchTrip(stop.tripId);
  logEvent("activity.added", {
    userId: user.id,
    tripId: stop.tripId,
    cityId: stop.cityId,
  });

  return toStopActivityDTO(created);
}

export async function updateStopActivity(
  id: string,
  input: UpdateInput,
  user: Pick<UserDTO, "id" | "role">,
): Promise<StopActivityDTO> {
  const row = await stopActivityWithContext(id);
  await assertTripAccess(row.stop.tripId, user, "EDIT");

  if (input.date) {
    const dateError = activityDateError(input.date, {
      cityName: row.stop.city.name,
      arrivalDate: toISODate(row.stop.arrivalDate),
      departureDate: toISODate(row.stop.departureDate),
    });
    if (dateError) throw new ValidationError(dateError, { date: dateError });
  }

  const updated = await db.stopActivity.update({
    where: { id },
    data: {
      customName: row.activityId ? undefined : input.customName,
      date: input.date ? fromISODate(input.date) : undefined,
      startMinute: input.startMinute === undefined ? undefined : input.startMinute,
      durationMin: input.durationMin,
      cost: input.cost,
      notes: input.notes === undefined ? undefined : input.notes,
    },
    include: { activity: true },
  });

  await touchTrip(row.stop.tripId);
  return toStopActivityDTO(updated);
}

export async function moveStopActivity(
  id: string,
  date: string,
  user: Pick<UserDTO, "id" | "role">,
): Promise<StopActivityDTO> {
  return updateStopActivity(id, { date }, user);
}

export async function deleteStopActivity(id: string, user: Pick<UserDTO, "id" | "role">) {
  const row = await stopActivityWithContext(id);
  await assertTripAccess(row.stop.tripId, user, "EDIT");

  await db.stopActivity.delete({ where: { id } });
  await touchTrip(row.stop.tripId);
  logEvent("activity.removed", { userId: user.id, tripId: row.stop.tripId });

  return { id };
}

/** Reorder the activities within a single day of a stop. */
export async function reorderStopActivities(
  stopId: string,
  ids: string[],
  user: Pick<UserDTO, "id" | "role">,
): Promise<StopActivityDTO[]> {
  const stop = await db.tripStop.findUnique({ where: { id: stopId } });
  if (!stop) throw new NotFoundError("That stop is no longer on the trip.");
  await assertTripAccess(stop.tripId, user, "EDIT");

  const rows = await db.stopActivity.findMany({ where: { stopId, id: { in: ids } } });
  if (rows.length !== ids.length) {
    throw new ValidationError("The activity list is out of date. Refresh and try again.");
  }

  await db.$transaction(
    ids.map((id, index) =>
      db.stopActivity.update({ where: { id }, data: { orderIndex: index } }),
    ),
  );

  await touchTrip(stop.tripId);

  const refreshed = await db.stopActivity.findMany({
    where: { stopId },
    orderBy: [{ date: "asc" }, { orderIndex: "asc" }],
    include: { activity: true },
  });
  return refreshed.map(toStopActivityDTO);
}

async function touchTrip(tripId: string) {
  await db.trip.update({ where: { id: tripId }, data: { updatedAt: new Date() } });
}
