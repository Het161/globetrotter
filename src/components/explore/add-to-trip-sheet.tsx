"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CalendarDays, Check, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import type { CityDTO, StopDTO, TripDTO } from "@/server/dto";
import { api, errorMessage } from "@/lib/api-client";
import { useRemoteList } from "@/hooks/use-remote-list";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DeckButton } from "@/components/ui/deck-button";
import { StatusChip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateRange } from "@/lib/dates";
import { pluralize } from "@/lib/utils";

/**
 * "Add to trip" — pick which trip a city should become a stop on.
 *
 * The server decides the dates: it drops the stop after the current last one
 * and gives it two nights, clipped to the end of the trip. If there is no room
 * it says so, naming the city that's in the way, and nothing is created.
 */
export function AddToTripSheet({
  city,
  open,
  onOpenChange,
}: {
  city: CityDTO | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [pendingId, setPendingId] = React.useState<string | null>(null);
  const [addedId, setAddedId] = React.useState<string | null>(null);

  const { items: trips, loading } = useRemoteList<TripDTO>(
    open ? "/trips?sort=updated&pageSize=20" : null,
  );

  /** Forget which trip was just added once the dialog closes. */
  function handleOpenChange(next: boolean) {
    if (!next) setAddedId(null);
    onOpenChange(next);
  }

  async function addStop(trip: TripDTO) {
    if (!city) return;
    setPendingId(trip.id);

    try {
      const stop = await api.post<StopDTO>(
        `/trips/${trip.id}/stops`,
        { cityId: city.id },
        { toastOnError: false },
      );

      setAddedId(trip.id);
      toast.success(`${city.name} added to ${trip.name}`, {
        description: formatDateRange(stop.arrivalDate, stop.departureDate),
        action: {
          label: "Open builder",
          onClick: () => router.push(`/trips/${trip.id}/build`),
        },
      });
      router.refresh();
    } catch (error) {
      // Date conflicts arrive as 409 with a human message from the engine.
      toast.error(errorMessage(error, "We couldn't add that stop."));
    } finally {
      setPendingId(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add {city?.name ?? "city"} to a trip</DialogTitle>
          <DialogDescription>
            It goes in after your last stop, with two nights by default. You can change the
            dates in the builder.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        ) : trips.length === 0 ? (
          <EmptyState
            title="No trips yet"
            description="Create a trip first, then add cities to it."
            action={
              <DeckButton asChild variant="primary" size="sm">
                <Link href="/trips/new">Plan a trip</Link>
              </DeckButton>
            }
          />
        ) : (
          <ul className="max-h-[46vh] space-y-1.5 overflow-y-auto">
            {trips.map((trip) => {
              const pending = pendingId === trip.id;
              const added = addedId === trip.id;

              return (
                <li key={trip.id}>
                  <button
                    type="button"
                    onClick={() => addStop(trip)}
                    disabled={pending || added}
                    className="flex w-full items-center gap-3 rounded-[var(--radius-input)] border border-line bg-deck/40 px-3.5 py-3 text-left transition-colors hover:border-line-strong hover:bg-deck disabled:opacity-60"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="trip-name block truncate text-base text-cloud">
                        {trip.name}
                      </span>
                      <span className="mt-0.5 flex items-center gap-1.5 font-mono text-2xs text-fog">
                        <CalendarDays className="size-3" aria-hidden />
                        {formatDateRange(trip.startDate, trip.endDate)} ·{" "}
                        {pluralize(trip.stops.length, "stop")}
                      </span>
                    </span>

                    <StatusChip status={trip.status} />

                    <span className="grid size-8 shrink-0 place-items-center rounded-md bg-deck-hi text-fog">
                      {pending ? (
                        <Loader2 className="size-4 animate-spin" aria-hidden />
                      ) : added ? (
                        <Check className="size-4 text-lagoon" aria-hidden />
                      ) : (
                        <Plus className="size-4" aria-hidden />
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
