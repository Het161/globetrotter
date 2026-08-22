"use client";

import * as React from "react";
import Link from "next/link";
import { Heart, Plus } from "lucide-react";
import { toast } from "sonner";
import type { CityDTO } from "@/server/dto";
import { api } from "@/lib/api-client";
import { Postcard } from "@/components/ui/postcard";
import { DeckButton } from "@/components/ui/deck-button";
import { useCurrency } from "@/hooks/use-currency";
import { cn, pluralize } from "@/lib/utils";

/**
 * A destination in a grid: the Postcard on top, then the two numbers that
 * decide whether you can afford it — a cost-index bar and the nightly rate.
 */
export function CityCard({
  city,
  onAddToTrip,
  className,
}: {
  city: CityDTO;
  onAddToTrip?: (city: CityDTO) => void;
  className?: string;
}) {
  const money = useCurrency();
  const [saved, setSaved] = React.useState(Boolean(city.saved));
  const [savePending, setSavePending] = React.useState(false);

  async function toggleSaved(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();

    const next = !saved;
    setSaved(next); // optimistic
    setSavePending(true);

    try {
      if (next) await api.post("/me/saved-cities", { cityId: city.id });
      else await api.delete(`/me/saved-cities/${city.id}`);
      toast.success(next ? `Saved ${city.name}` : `Removed ${city.name}`);
    } catch {
      setSaved(!next); // rollback; api-client already toasted
    } finally {
      setSavePending(false);
    }
  }

  return (
    <article className={cn("surface lift-on-hover group overflow-hidden", className)}>
      <Link href={`/explore/${city.slug}`} className="block focus-visible:outline-none">
        <div className="tear-line relative">
          <Postcard city={city} size="card" tilt={false} />

          <button
            type="button"
            onClick={toggleSaved}
            disabled={savePending}
            aria-pressed={saved}
            aria-label={saved ? `Remove ${city.name} from saved` : `Save ${city.name}`}
            className="absolute right-3 top-3 grid size-8 place-items-center rounded-full border border-line bg-ink/50 backdrop-blur-sm transition-colors hover:border-line-strong"
          >
            <Heart
              className={cn(
                "size-4 transition-colors",
                saved ? "fill-ember text-ember" : "text-cloud/70",
              )}
            />
          </button>
        </div>

        <div className="p-4">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="truncate font-display text-lg font-medium text-cloud">
              {city.name}
            </h3>
            <span className="shrink-0 font-mono text-2xs text-fog-dim">{city.countryCode}</span>
          </div>

          <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-fog">
            {city.description}
          </p>

          <CostIndexBar value={city.costIndex} className="mt-3.5" />

          <div className="mt-3 flex items-end justify-between gap-2">
            <div>
              <p className="placard mb-0.5">From</p>
              <p className="font-mono text-sm font-semibold tabular-nums text-solar">
                {money.format(city.avgStayCost, { decimals: false })}
                <span className="ml-1 text-2xs font-normal text-fog">/night</span>
              </p>
            </div>

            {typeof city.activityCount === "number" ? (
              <p className="font-mono text-2xs text-fog-dim">
                {pluralize(city.activityCount, "activity", "activities")}
              </p>
            ) : null}
          </div>
        </div>
      </Link>

      {onAddToTrip ? (
        <div className="px-4 pb-4">
          <DeckButton
            variant="secondary"
            size="sm"
            className="w-full"
            onClick={() => onAddToTrip(city)}
          >
            <Plus />
            Add to trip
          </DeckButton>
        </div>
      ) : null}
    </article>
  );
}

/**
 * Cost index as a bar with a marker at 50 — the global average — so a number
 * from 1 to 100 becomes "cheaper or dearer than most places".
 */
export function CostIndexBar({ value, className }: { value: number; className?: string }) {
  const band = value <= 39 ? "Budget" : value <= 69 ? "Mid-range" : "Expensive";
  const tone = value <= 39 ? "bg-lagoon" : value <= 69 ? "bg-solar" : "bg-ember";

  return (
    <div className={className}>
      <div className="mb-1 flex items-baseline justify-between">
        <span className="placard">Cost index</span>
        <span className="font-mono text-2xs tabular-nums text-fog">
          {band} · {value}
        </span>
      </div>

      <div className="relative h-1.5 overflow-hidden rounded-full bg-deck">
        <div
          className={cn("h-full rounded-full transition-[width] duration-240", tone)}
          style={{ width: `${value}%` }}
        />
        {/* The global average, marked so the number has a reference point. */}
        <span
          aria-hidden
          className="absolute inset-y-0 w-px bg-cloud/30"
          style={{ left: "50%" }}
        />
      </div>
    </div>
  );
}
