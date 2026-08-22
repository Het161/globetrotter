"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowUpRight, Plus } from "lucide-react";
import type { CityDTO } from "@/server/dto";
import { Postcard } from "@/components/ui/postcard";
import { DeckButton } from "@/components/ui/deck-button";
import { SectionLabel } from "@/components/layout/page-header";
import { AddToTripSheet } from "@/components/explore/add-to-trip-sheet";
import { useCurrency } from "@/hooks/use-currency";

/**
 * Recommended destinations — a horizontal shelf of Postcards.
 *
 * These come from a real query: the most popular cities the user has *not*
 * already put in a trip. Recommending Tokyo to someone who is already going to
 * Tokyo would give the whole thing away as a hardcoded list.
 */
export function RecommendedStrip({ cities }: { cities: CityDTO[] }) {
  const money = useCurrency();
  const [target, setTarget] = React.useState<CityDTO | null>(null);

  if (cities.length === 0) return null;

  return (
    <section aria-labelledby="recommended-heading">
      <SectionLabel
        action={
          <Link
            href="/explore"
            className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-fog transition-colors hover:text-cloud"
          >
            Explore all
            <ArrowUpRight className="size-3" aria-hidden />
          </Link>
        }
      >
        <span id="recommended-heading">Somewhere new</span>
      </SectionLabel>

      <div className="fade-x -mx-1 overflow-x-auto pb-2">
        <ul className="no-scrollbar flex gap-4 px-1">
          {cities.map((city) => (
            <li key={city.id} className="w-[220px] shrink-0">
              <div className="surface lift-on-hover group overflow-hidden">
                <Link href={`/explore/${city.slug}`} className="block">
                  {/* The postcard names the city; the caption adds the price. */}
                  <Postcard city={city} size="card" tilt={false} nameAs="h3" minimal />
                </Link>

                <div className="p-3.5">
                  <p className="truncate font-mono text-2xs text-fog">
                    {city.country} · {money.format(city.avgStayCost, { decimals: false })}/night
                  </p>

                  <DeckButton
                    variant="secondary"
                    size="sm"
                    className="mt-3 w-full"
                    onClick={() => setTarget(city)}
                  >
                    <Plus />
                    Add to trip
                  </DeckButton>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <AddToTripSheet
        city={target}
        open={target !== null}
        onOpenChange={(open) => !open && setTarget(null)}
      />
    </section>
  );
}
