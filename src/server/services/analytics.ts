import "server-only";
import { db } from "@/server/db";

/**
 * Append-only event log. Every write is fire-and-forget: analytics must never
 * be the reason a user's trip fails to save, and a share page must not wait on
 * a view counter before it renders.
 */

export type EventType =
  | "login"
  | "signup"
  | "trip.created"
  | "trip.updated"
  | "trip.deleted"
  | "stop.added"
  | "stop.removed"
  | "activity.added"
  | "activity.removed"
  | "expense.added"
  | "trip.shared"
  | "share.viewed"
  | "trip.copied"
  | "city.saved";

export function logEvent(
  type: EventType,
  payload: {
    userId?: string | null;
    tripId?: string | null;
    cityId?: string | null;
    metadata?: Record<string, string | number | boolean>;
  } = {},
): void {
  void db.activityEvent
    .create({
      data: {
        type,
        userId: payload.userId ?? null,
        tripId: payload.tripId ?? null,
        cityId: payload.cityId ?? null,
        metadata: payload.metadata ?? undefined,
      },
    })
    .catch((error) => {
      console.error("[analytics] failed to record", type, error);
    });
}
