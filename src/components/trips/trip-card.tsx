"use client";

import Link from "next/link";
import { CalendarDays, MapPin, MoreVertical, PencilRuler, Trash2, Wallet } from "lucide-react";
import type { TripDTO } from "@/server/dto";
import { Postcard } from "@/components/ui/postcard";
import { StatusChip } from "@/components/ui/chip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/menu";
import { useCurrency } from "@/hooks/use-currency";
import { countdown, formatDateRange } from "@/lib/dates";
import { cn, pluralize } from "@/lib/utils";

/**
 * TripCard — a boarding pass.
 *
 * A Postcard of the first stop sits on top, then a dotted tear line, then the
 * stub: name in the display italic, dates and money in mono. The tear line is
 * the detail that makes the metaphor land rather than just being asserted.
 */
export function TripCard({
  trip,
  onDelete,
  className,
}: {
  trip: TripDTO;
  onDelete?: (trip: TripDTO) => void;
  className?: string;
}) {
  const money = useCurrency();
  const firstStop = trip.stops[0];
  const summary = trip.summary;

  return (
    <article
      className={cn(
        "surface lift-on-hover group relative overflow-hidden",
        className,
      )}
    >
      <Link href={`/trips/${trip.id}`} className="block focus-visible:outline-none">
        {/* Banner */}
        <div className="tear-line relative">
          {firstStop ? (
            <Postcard city={firstStop.city} size="card" tilt={false} minimal />
          ) : (
            <div className="relative grid h-40 place-items-center bg-deck">
              <MapPin className="size-6 text-fog-dim" aria-hidden />
              <p className="placard mt-2">No stops yet</p>
            </div>
          )}

          <div className="absolute left-3 top-3">
            <StatusChip status={trip.status} />
          </div>

          {trip.isPublic ? (
            <span className="chip absolute right-3 top-3 border-lagoon/30 bg-ink/60 text-lagoon backdrop-blur-sm">
              Public
            </span>
          ) : null}
        </div>

        {/* Stub */}
        <div className="p-4">
          <h3 className="trip-name truncate text-xl text-cloud">{trip.name}</h3>

          <p className="mt-1.5 flex items-center gap-1.5 font-mono text-xs text-fog">
            <CalendarDays className="size-3.5 shrink-0" aria-hidden />
            {formatDateRange(trip.startDate, trip.endDate)}
          </p>

          {/* The route, spelled out — this is the product in one line. */}
          {summary && summary.cities.length > 0 ? (
            <p className="mt-2 truncate text-sm text-fog">
              {summary.cities.join(" → ")}
            </p>
          ) : (
            <p className="mt-2 text-sm text-fog-dim">Add your first city to start the route.</p>
          )}

          <div className="mt-4 flex items-end justify-between gap-3 border-t border-line pt-3">
            <div className="min-w-0">
              <p className="placard mb-1">Estimated</p>
              <p className="font-mono text-lg font-semibold tabular-nums text-solar">
                {money.format(summary?.total ?? 0, { decimals: false })}
              </p>
            </div>

            <div className="text-right">
              <p className="placard mb-1">
                {trip.status === "COMPLETED" ? "Trip" : "Departs"}
              </p>
              <p className="font-mono text-xs tabular-nums text-fog">
                {trip.status === "COMPLETED"
                  ? `${pluralize(summary?.nights ?? 0, "night")}`
                  : countdown(trip.startDate)}
              </p>
            </div>
          </div>

          <p className="mt-2.5 font-mono text-2xs text-fog-dim">
            {pluralize(summary?.stopCount ?? 0, "stop")} ·{" "}
            {pluralize(summary?.nights ?? 0, "night")} ·{" "}
            {pluralize(summary?.activityCount ?? 0, "activity", "activities")}
          </p>
        </div>
      </Link>

      {/* Row actions. Kept outside the Link so they don't nest interactives. */}
      <div className="absolute bottom-3 right-3 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
        <DropdownMenu>
          <DropdownMenuTrigger
            className="grid size-8 place-items-center rounded-md border border-line bg-harbor/90 text-fog backdrop-blur-sm transition-colors hover:text-cloud"
            aria-label={`Actions for ${trip.name}`}
          >
            <MoreVertical className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/trips/${trip.id}/build`}>
                <PencilRuler />
                Open builder
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/trips/${trip.id}/budget`}>
                <Wallet />
                View budget
              </Link>
            </DropdownMenuItem>
            {onDelete ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem destructive onSelect={() => onDelete(trip)}>
                  <Trash2 />
                  Delete trip
                </DropdownMenuItem>
              </>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </article>
  );
}
