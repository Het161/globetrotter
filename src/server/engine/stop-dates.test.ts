import { describe, expect, it } from "vitest";
import {
  findStopConflicts,
  planNextStop,
  reflowStops,
  validateTripWindow,
} from "./stop-dates";

const TRIP = { startDate: "2027-03-01", endDate: "2027-03-11" }; // 11 days, 10 nights

describe("validateTripWindow", () => {
  it("rejects an end date before the start date", () => {
    const result = validateTripWindow({ startDate: "2027-03-10", endDate: "2027-03-01" });
    expect(result.ok).toBe(false);
  });

  it("rejects trips longer than 60 days", () => {
    const result = validateTripWindow({ startDate: "2027-01-01", endDate: "2027-06-01" });
    expect(result.ok).toBe(false);
  });

  it("accepts a normal trip", () => {
    expect(validateTripWindow(TRIP).ok).toBe(true);
  });
});

describe("planNextStop", () => {
  it("starts the first stop on the trip start date", () => {
    const result = planNextStop(TRIP, []);
    expect(result).toEqual({ ok: true, arrivalDate: "2027-03-01", departureDate: "2027-03-03" });
  });

  it("starts the next stop the day the previous one ends", () => {
    const result = planNextStop(TRIP, [{ departureDate: "2027-03-04", cityName: "Tokyo" }]);
    expect(result).toEqual({ ok: true, arrivalDate: "2027-03-04", departureDate: "2027-03-06" });
  });

  it("clips the last stop to the end of the trip instead of overflowing", () => {
    const result = planNextStop(TRIP, [{ departureDate: "2027-03-10", cityName: "Kyoto" }]);
    expect(result).toEqual({ ok: true, arrivalDate: "2027-03-10", departureDate: "2027-03-11" });
  });

  it("refuses when there is no room left, naming the blocking city", () => {
    const result = planNextStop(TRIP, [{ departureDate: "2027-03-11", cityName: "Osaka" }]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain("Osaka");
  });
});

describe("findStopConflicts", () => {
  const stop = (id: string, cityName: string, a: string, d: string) => ({
    id,
    cityName,
    arrivalDate: a,
    departureDate: d,
  });

  it("allows consecutive stops to share the travel day", () => {
    const conflicts = findStopConflicts(TRIP, [
      stop("1", "Tokyo", "2027-03-01", "2027-03-04"),
      stop("2", "Kyoto", "2027-03-04", "2027-03-07"),
    ]);
    expect(conflicts).toEqual([]);
  });

  it("flags a genuine overlap", () => {
    const conflicts = findStopConflicts(TRIP, [
      stop("1", "Tokyo", "2027-03-01", "2027-03-05"),
      stop("2", "Kyoto", "2027-03-03", "2027-03-07"),
    ]);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].cityName).toBe("Kyoto");
    expect(conflicts[0].reason).toContain("Tokyo");
  });

  it("flags a stop that falls outside the trip", () => {
    const conflicts = findStopConflicts(TRIP, [
      stop("1", "Osaka", "2027-03-09", "2027-03-14"),
    ]);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].reason).toContain("outside");
  });
});

describe("reflowStops", () => {
  it("keeps each stop's nights and re-flows the calendar from the start date", () => {
    const result = reflowStops(TRIP, [
      { id: "kyoto", cityName: "Kyoto", nights: 3 },
      { id: "tokyo", cityName: "Tokyo", nights: 3 },
      { id: "osaka", cityName: "Osaka", nights: 2 },
    ]);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.stops).toEqual([
      { id: "kyoto", cityName: "Kyoto", arrivalDate: "2027-03-01", departureDate: "2027-03-04" },
      { id: "tokyo", cityName: "Tokyo", arrivalDate: "2027-03-04", departureDate: "2027-03-07" },
      { id: "osaka", cityName: "Osaka", arrivalDate: "2027-03-07", departureDate: "2027-03-09" },
    ]);
  });

  it("refuses when the stops need more nights than the trip has", () => {
    const result = reflowStops(TRIP, [
      { id: "a", cityName: "Paris", nights: 6 },
      { id: "b", cityName: "Rome", nights: 6 },
    ]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain("12 nights");
  });
});
