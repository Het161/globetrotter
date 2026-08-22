"use client";

import type { AdminOverview } from "@/server/services/admin";
import { useCurrency } from "@/hooks/use-currency";

/**
 * Platform KPIs. Every one is a live aggregate — delete a trip and the tile
 * moves on the next load. Nothing here is hardcoded.
 */
export function KpiTiles({ kpis }: { kpis: AdminOverview["kpis"] }) {
  const money = useCurrency();

  const tiles: { label: string; value: string; hint?: string }[] = [
    { label: "Users", value: String(kpis.users) },
    { label: "Trips", value: String(kpis.trips), hint: `${kpis.avgStopsPerTrip} stops avg` },
    { label: "Stops planned", value: String(kpis.stops) },
    { label: "Activities placed", value: String(kpis.activitiesPlaced) },
    { label: "Public trips", value: String(kpis.publicTrips) },
    { label: "Copies made", value: String(kpis.copies) },
    {
      label: "Avg trip budget",
      value: money.format(kpis.avgTripBudget, { compact: true }),
      hint: "across all trips",
    },
  ];

  return (
    <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {tiles.map((tile) => (
        <div key={tile.label} className="surface p-4">
          <dt className="placard mb-2">{tile.label}</dt>
          <dd className="font-mono text-2xl font-semibold tabular-nums text-cloud">
            {tile.value}
          </dd>
          {tile.hint ? (
            <dd className="mt-1 font-mono text-2xs text-fog-dim">{tile.hint}</dd>
          ) : null}
        </div>
      ))}
    </dl>
  );
}
