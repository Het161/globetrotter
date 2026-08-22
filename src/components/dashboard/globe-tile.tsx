"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { TripDTO } from "@/server/dto";
import { Globe } from "@/components/globe";
import { countdown, formatDateRange } from "@/lib/dates";
import { pluralize } from "@/lib/utils";

/**
 * The globe tile: the next trip's route drawn as arcs, or the most popular
 * destinations as points when there's no trip yet.
 *
 * Pointer interaction is off here — on a dashboard the globe must never
 * swallow a scroll gesture. It's a picture of your route, not a toy.
 */
export function GlobeTile({
  trip,
  route,
  popularPoints,
}: {
  trip: TripDTO | null;
  route: { name: string; lat: number; lng: number }[];
  popularPoints: { name: string; lat: number; lng: number }[];
}) {
  const hasRoute = route.length >= 2;

  return (
    <section
      className="surface relative flex h-full min-h-[320px] flex-col overflow-hidden"
      aria-labelledby="globe-heading"
    >
      <div className="absolute inset-0">
        <Globe
          route={hasRoute ? route : []}
          points={hasRoute ? [] : popularPoints}
          autoRotate={!hasRoute}
          interactive={false}
          showLabels
          className="size-full"
        />
      </div>

      {/* Scrim only at the bottom, so most of the globe stays visible. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-harbor via-harbor/80 to-transparent"
      />

      <header className="relative flex items-start justify-between p-5">
        <h2 id="globe-heading" className="placard">
          {hasRoute ? "Next route" : "Popular right now"}
        </h2>
      </header>

      <div className="relative mt-auto p-5">
        {trip && hasRoute ? (
          <Link href={`/trips/${trip.id}`} className="group block">
            <p className="mb-1 font-mono text-2xs uppercase tracking-[0.14em] text-lagoon">
              {countdown(trip.startDate)}
            </p>

            <h3 className="trip-name flex items-center gap-2 text-2xl text-cloud">
              <span className="truncate">{trip.name}</span>
              <ArrowUpRight className="size-4 shrink-0 text-fog transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-cloud" />
            </h3>

            <p className="mt-1.5 truncate text-sm text-fog">
              {route.map((point) => point.name).join(" → ")}
            </p>

            <p className="mt-1 font-mono text-2xs text-fog-dim">
              {formatDateRange(trip.startDate, trip.endDate)} ·{" "}
              {pluralize(trip.summary?.nights ?? 0, "night")}
            </p>
          </Link>
        ) : (
          <div>
            <h3 className="font-display text-2xl font-medium text-cloud">
              Nowhere to be. Yet.
            </h3>
            <p className="mt-1.5 max-w-xs text-sm text-fog">
              Pick a first city and the route starts drawing itself.
            </p>
            <Link
              href="/explore"
              className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-lagoon underline-offset-4 hover:underline"
            >
              Browse destinations
              <ArrowUpRight className="size-3.5" aria-hidden />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
