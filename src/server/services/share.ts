import "server-only";
import { nanoid } from "nanoid";
import { db } from "@/server/db";
import { toTripDTO, type TripDTO, type UserDTO } from "@/server/dto";
import { NotFoundError } from "@/server/http/errors";
import { computeBudget, type BudgetBreakdown } from "@/server/engine/budget";
import { assertTripAccess, budgetInputFor, summarize } from "./trips";
import { logEvent } from "./analytics";

const PUBLIC_TRIP_INCLUDE = {
  stops: {
    orderBy: { orderIndex: "asc" as const },
    include: {
      city: true,
      activities: { orderBy: { orderIndex: "asc" as const }, include: { activity: true } },
    },
  },
  expenses: true,
  user: true,
};

/**
 * Turning sharing off keeps the slug. Re-enabling therefore restores the same
 * URL, so a link someone already sent doesn't quietly break.
 */
export async function setShareState(
  tripId: string,
  isPublic: boolean,
  user: Pick<UserDTO, "id" | "role">,
): Promise<{ isPublic: boolean; shareSlug: string | null }> {
  const { trip } = await assertTripAccess(tripId, user, "OWNER");

  const shareSlug = trip.shareSlug ?? (isPublic ? nanoid(10) : null);

  const updated = await db.trip.update({
    where: { id: tripId },
    data: { isPublic, shareSlug },
    select: { isPublic: true, shareSlug: true },
  });

  if (isPublic) logEvent("trip.shared", { userId: user.id, tripId });
  return updated;
}

export type PublicTrip = {
  trip: TripDTO;
  budget: BudgetBreakdown;
  ownerName: string;
  viewCount: number;
};

/** No auth. 404s unless the trip is currently public. */
export async function getPublicTrip(slug: string): Promise<PublicTrip> {
  const trip = await db.trip.findUnique({
    where: { shareSlug: slug },
    include: PUBLIC_TRIP_INCLUDE,
  });

  if (!trip || !trip.isPublic) {
    throw new NotFoundError("This itinerary isn't shared, or the link has changed.");
  }

  // Fire-and-forget: the page must not wait on a counter to render.
  void db.trip
    .update({ where: { id: trip.id }, data: { viewCount: { increment: 1 } } })
    .catch(() => null);
  logEvent("share.viewed", { tripId: trip.id });

  const dto = toTripDTO(trip);

  return {
    trip: { ...dto, summary: summarize(dto) },
    budget: computeBudget(budgetInputFor(dto)),
    ownerName: trip.user?.name ?? "A GlobeTrotter",
    viewCount: trip.viewCount + 1,
  };
}

/**
 * Deep-clone a public trip into the signed-in user's account: trip → stops →
 * activities → expenses, all in one transaction so a half-copied trip can
 * never exist.
 */
export async function copyTrip(slug: string, userId: string): Promise<TripDTO> {
  const source = await db.trip.findUnique({
    where: { shareSlug: slug },
    include: {
      stops: { orderBy: { orderIndex: "asc" }, include: { activities: true } },
      expenses: true,
    },
  });

  if (!source || !source.isPublic) {
    throw new NotFoundError("This itinerary isn't shared, or the link has changed.");
  }

  const copy = await db.$transaction(async (tx) => {
    const trip = await tx.trip.create({
      data: {
        userId,
        name: `Copy of ${source.name}`,
        description: source.description,
        startDate: source.startDate,
        endDate: source.endDate,
        coverImageUrl: source.coverImageUrl,
        budgetLimit: source.budgetLimit,
        status: "PLANNING",
        isPublic: false,
        copiedFromId: source.id,
      },
    });

    for (const stop of source.stops) {
      const newStop = await tx.tripStop.create({
        data: {
          tripId: trip.id,
          cityId: stop.cityId,
          orderIndex: stop.orderIndex,
          arrivalDate: stop.arrivalDate,
          departureDate: stop.departureDate,
          stayCostPerNight: stop.stayCostPerNight,
          transportCostToNext: stop.transportCostToNext,
          transportMode: stop.transportMode,
          notes: stop.notes,
        },
      });

      if (stop.activities.length) {
        await tx.stopActivity.createMany({
          data: stop.activities.map((activity) => ({
            stopId: newStop.id,
            activityId: activity.activityId,
            customName: activity.customName,
            date: activity.date,
            startMinute: activity.startMinute,
            durationMin: activity.durationMin,
            cost: activity.cost,
            orderIndex: activity.orderIndex,
            notes: activity.notes,
          })),
        });
      }
    }

    if (source.expenses.length) {
      await tx.tripExpense.createMany({
        data: source.expenses.map((expense) => ({
          tripId: trip.id,
          category: expense.category,
          label: expense.label,
          amount: expense.amount,
          date: expense.date,
        })),
      });
    }

    return trip;
  });

  logEvent("trip.copied", { userId, tripId: copy.id, metadata: { from: source.id } });

  const full = await db.trip.findUnique({ where: { id: copy.id }, include: PUBLIC_TRIP_INCLUDE });
  return toTripDTO(full!);
}
