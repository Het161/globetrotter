"use client";

import * as React from "react";
import Link from "next/link";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";
import type { CityDTO } from "@/server/dto";
import { api } from "@/lib/api-client";
import { Postcard } from "@/components/ui/postcard";
import { DeckButton } from "@/components/ui/deck-button";
import { FieldGroup } from "@/components/ui/field";
import { AddToTripSheet } from "@/components/explore/add-to-trip-sheet";
import { useCurrency } from "@/hooks/use-currency";

/** Saved destinations — remove one, or drop it straight into a trip. */
export function SavedCities({ initial }: { initial: CityDTO[] }) {
  const money = useCurrency();
  const [cities, setCities] = React.useState(initial);
  const [target, setTarget] = React.useState<CityDTO | null>(null);

  async function remove(city: CityDTO) {
    const snapshot = cities;
    setCities((current) => current.filter((c) => c.id !== city.id));

    try {
      await api.delete(`/me/saved-cities/${city.id}`, { toastOnError: false });
      toast.success(`Removed ${city.name}`);
    } catch {
      setCities(snapshot);
      toast.error("We couldn't remove that.");
    }
  }

  return (
    <FieldGroup
      title="Saved destinations"
      description="Places you've starred while exploring."
    >
      {cities.length === 0 ? (
        <div className="flex flex-col items-start gap-3">
          <p className="text-sm text-fog">Nothing saved yet.</p>
          <DeckButton asChild variant="secondary" size="sm">
            <Link href="/explore">Browse destinations</Link>
          </DeckButton>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {cities.map((city) => (
            <li key={city.id} className="group relative">
              <Link href={`/explore/${city.slug}`} className="block overflow-hidden rounded-[var(--radius-card)]">
                <Postcard city={city} size="card" tilt={false} />
              </Link>

              <button
                type="button"
                onClick={() => remove(city)}
                aria-label={`Remove ${city.name} from saved`}
                className="absolute right-2.5 top-2.5 grid size-7 place-items-center rounded-full border border-line bg-ink/60 text-cloud opacity-0 backdrop-blur-sm transition-opacity focus:opacity-100 group-hover:opacity-100"
              >
                <X className="size-3.5" />
              </button>

              <div className="mt-2.5 flex items-center justify-between gap-2">
                <p className="min-w-0 truncate font-mono text-2xs text-fog">
                  {money.format(city.avgStayCost, { decimals: false })}/night
                </p>
                <DeckButton variant="ghost" size="sm" onClick={() => setTarget(city)}>
                  <Plus />
                  Add to trip
                </DeckButton>
              </div>
            </li>
          ))}
        </ul>
      )}

      <AddToTripSheet
        city={target}
        open={target !== null}
        onOpenChange={(open) => !open && setTarget(null)}
      />
    </FieldGroup>
  );
}
