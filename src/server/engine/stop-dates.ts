import { addDays, daysBetween, nights, type ISODate } from "@/lib/dates";

/**
 * Pure date arithmetic for the itinerary. No Prisma, no I/O — every rule the
 * reviewers ask about ("what happens if I drag Kyoto above Tokyo?") is decided
 * in this file and covered by stop-dates.test.ts.
 */

export const MAX_TRIP_DAYS = 60;
export const DEFAULT_STOP_NIGHTS = 2;

export type TripWindow = { startDate: ISODate; endDate: ISODate };

export type StopWindow = {
  id: string;
  cityName: string;
  arrivalDate: ISODate;
  departureDate: ISODate;
};

export type PlanResult =
  | { ok: true; arrivalDate: ISODate; departureDate: ISODate }
  | { ok: false; message: string };

/* -------------------------------------------------------------------------- */
/* Trip window                                                                */
/* -------------------------------------------------------------------------- */

export function validateTripWindow(trip: TripWindow): { ok: true } | { ok: false; message: string; field: string } {
  if (trip.endDate < trip.startDate) {
    return { ok: false, field: "endDate", message: "The end date can't be before the start date." };
  }
  const days = daysBetween(trip.startDate, trip.endDate) + 1;
  if (days > MAX_TRIP_DAYS) {
    return {
      ok: false,
      field: "endDate",
      message: `Trips are capped at ${MAX_TRIP_DAYS} days. This one is ${days}.`,
    };
  }
  return { ok: true };
}

/* -------------------------------------------------------------------------- */
/* Adding a stop                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Where does a new stop go when the user just picks a city?
 *
 * It starts the day the previous stop ends (you fly out and arrive the same
 * day) and runs for two nights, clipped to the end of the trip. If there is no
 * room left we say so instead of silently creating a zero-night stop.
 */
export function planNextStop(
  trip: TripWindow,
  existing: Pick<StopWindow, "departureDate" | "cityName">[],
  requestedNights = DEFAULT_STOP_NIGHTS,
): PlanResult {
  const last = existing.length ? existing[existing.length - 1] : null;
  const arrivalDate = last ? last.departureDate : trip.startDate;

  if (arrivalDate >= trip.endDate) {
    const from = last ? `after ${last.cityName}` : "in this trip";
    return {
      ok: false,
      message: `No room left ${from} — extend the trip or shorten a stop.`,
    };
  }

  const wanted = addDays(arrivalDate, Math.max(1, requestedNights));
  const departureDate = wanted > trip.endDate ? trip.endDate : wanted;

  return { ok: true, arrivalDate, departureDate };
}

/* -------------------------------------------------------------------------- */
/* Validating a set of stops                                                  */
/* -------------------------------------------------------------------------- */

export type StopConflict = { id: string; cityName: string; reason: string };

/**
 * Stops must sit inside the trip and must not overlap. Sharing a single day is
 * fine and expected: you leave Tokyo and arrive in Kyoto on the same date.
 */
export function findStopConflicts(trip: TripWindow, stops: StopWindow[]): StopConflict[] {
  const conflicts: StopConflict[] = [];
  const ordered = [...stops].sort((a, b) => a.arrivalDate.localeCompare(b.arrivalDate));

  for (const stop of ordered) {
    if (stop.departureDate < stop.arrivalDate) {
      conflicts.push({
        id: stop.id,
        cityName: stop.cityName,
        reason: "Departure is before arrival.",
      });
      continue;
    }
    if (stop.arrivalDate < trip.startDate || stop.departureDate > trip.endDate) {
      conflicts.push({
        id: stop.id,
        cityName: stop.cityName,
        reason: "Falls outside the trip dates.",
      });
    }
  }

  for (let i = 1; i < ordered.length; i++) {
    const prev = ordered[i - 1];
    const cur = ordered[i];
    if (cur.arrivalDate < prev.departureDate) {
      conflicts.push({
        id: cur.id,
        cityName: cur.cityName,
        reason: `Overlaps ${prev.cityName}.`,
      });
    }
  }

  // A stop can be flagged by both loops; keep the first reason per stop.
  const seen = new Set<string>();
  return conflicts.filter((c) => (seen.has(c.id) ? false : (seen.add(c.id), true)));
}

/* -------------------------------------------------------------------------- */
/* Reorder                                                                    */
/* -------------------------------------------------------------------------- */

export type ReflowInput = { id: string; cityName: string; nights: number };

export type ReflowResult =
  | { ok: true; stops: StopWindow[] }
  | { ok: false; message: string };

/**
 * Reordering keeps how long you stay in each city and re-flows the calendar
 * from the trip's start date. Dragging Kyoto above Tokyo shifts both sets of
 * dates rather than leaving a hole in the middle of the trip.
 */
export function reflowStops(trip: TripWindow, stops: ReflowInput[]): ReflowResult {
  const totalNights = stops.reduce((sum, s) => sum + Math.max(1, s.nights), 0);
  const tripNights = daysBetween(trip.startDate, trip.endDate);

  if (totalNights > tripNights) {
    return {
      ok: false,
      message: `These stops need ${totalNights} nights but the trip is ${tripNights}. Extend the trip or shorten a stop.`,
    };
  }

  let cursor = trip.startDate;
  const out: StopWindow[] = [];

  for (const stop of stops) {
    const stayed = Math.max(1, stop.nights);
    const arrivalDate = cursor;
    const departureDate = addDays(arrivalDate, stayed);
    out.push({ id: stop.id, cityName: stop.cityName, arrivalDate, departureDate });
    cursor = departureDate;
  }

  return { ok: true, stops: out };
}

/**
 * Trip dates moved. Slide every stop by the same offset so the shape of the
 * itinerary survives, then clamp anything that now hangs off the end.
 */
export function shiftStops(
  offsetDays: number,
  stops: StopWindow[],
  trip: TripWindow,
): StopWindow[] {
  return stops.map((s) => {
    const arrivalDate = clampDate(addDays(s.arrivalDate, offsetDays), trip);
    const departureDate = clampDate(addDays(s.departureDate, offsetDays), trip);
    return { ...s, arrivalDate, departureDate };
  });
}

function clampDate(day: ISODate, trip: TripWindow): ISODate {
  if (day < trip.startDate) return trip.startDate;
  if (day > trip.endDate) return trip.endDate;
  return day;
}

/* -------------------------------------------------------------------------- */
/* Activities                                                                 */
/* -------------------------------------------------------------------------- */

export const MIN_ACTIVITY_MINUTES = 15;
export const MAX_ACTIVITY_MINUTES = 1440;

export function activityDateError(
  date: ISODate,
  stop: Pick<StopWindow, "arrivalDate" | "departureDate" | "cityName">,
): string | null {
  if (date < stop.arrivalDate || date > stop.departureDate) {
    return `That day isn't part of your stay in ${stop.cityName}. Pick a day between ${stop.arrivalDate} and ${stop.departureDate}.`;
  }
  return null;
}

/** Days a stop covers, inclusive of the departure day (you're still there in the morning). */
export function stopDays(stop: Pick<StopWindow, "arrivalDate" | "departureDate">): ISODate[] {
  const total = Math.max(0, daysBetween(stop.arrivalDate, stop.departureDate));
  return Array.from({ length: total + 1 }, (_, i) => addDays(stop.arrivalDate, i));
}

export { nights };
