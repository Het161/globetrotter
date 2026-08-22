import type { TripDTO, TripSummary } from "@/server/dto";
import { computeBudget, type BudgetInput } from "@/server/engine/budget";
import { daysBetween, eachDay, todayISO, type ISODate } from "./dates";

/**
 * Pure view helpers over trip DTOs.
 *
 * These live in `lib` rather than `server/services` on purpose: client
 * components need them, and anything under `server/services` imports
 * `server-only` and would blow up the moment a "use client" file touched it.
 *
 * `budgetInputFor` living here is what lets the itinerary builder recompute the
 * running total in the browser with the *same* engine the API uses — one
 * implementation, no chance of the optimistic number disagreeing with the
 * confirmed one.
 */

/** Map a trip DTO onto the budget engine's input shape. */
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
      activities: stop.activities.map((activity) => ({
        id: activity.id,
        name: activity.name,
        date: activity.date,
        cost: activity.cost,
      })),
    })),
    expenses: trip.expenses.map((expense) => ({
      id: expense.id,
      category: expense.category,
      label: expense.label,
      amount: expense.amount,
      date: expense.date,
    })),
  };
}

/** The few numbers a TripCard shows, from the same engine as everything else. */
export function summarizeTrip(trip: TripDTO): TripSummary {
  const budget = computeBudget(budgetInputFor(trip));
  return {
    stopCount: trip.stops.length,
    nights: trip.stops.reduce((sum, stop) => sum + stop.nights, 0),
    activityCount: trip.stops.reduce((sum, stop) => sum + stop.activities.length, 0),
    total: budget.total,
    cities: trip.stops.map((stop) => stop.city.name),
  };
}

export type DepartureRow = {
  id: string;
  name: string;
  firstCity: string;
  startDate: ISODate;
  status: TripDTO["status"];
  daysAway: number;
  total: number;
};

/** Trips reduced to what a departure board row needs. */
export function departureRows(trips: TripDTO[], from: ISODate = todayISO()): DepartureRow[] {
  return trips.map((trip) => ({
    id: trip.id,
    name: trip.name,
    firstCity: trip.stops[0]?.city.name ?? "No stops yet",
    startDate: trip.startDate,
    status: trip.status,
    daysAway: daysBetween(from, trip.startDate),
    total: trip.summary?.total ?? 0,
  }));
}

/**
 * Every day a stop covers, arrival through departure inclusive — you're still
 * in the city on the morning you leave, so that day gets a tab.
 */
export function stopDays(stop: { arrivalDate: ISODate; departureDate: ISODate }): ISODate[] {
  return eachDay(stop.arrivalDate, stop.departureDate);
}

/** The trip's route as a plain list of city names. */
export function routeCities(trip: TripDTO): string[] {
  return trip.stops.map((stop) => stop.city.name);
}

/** Globe-ready coordinates for a trip's stops. */
export function routePoints(trip: TripDTO) {
  return trip.stops.map((stop) => ({
    name: stop.city.name,
    lat: stop.city.lat,
    lng: stop.city.lng,
  }));
}
