"use client";

import { motion, useReducedMotion } from "motion/react";
import { Eye } from "lucide-react";
import { Globe } from "@/components/globe";
import { formatDateRange } from "@/lib/dates";

/**
 * The dossier's cover: the route on a globe, the cities spelled out, and the
 * total. Everything a person needs to decide whether to keep scrolling.
 */
export function ShareHero({
  tripName,
  cities,
  route,
  startDate,
  endDate,
  nights,
  total,
  ownerName,
  viewCount,
}: {
  tripName: string;
  cities: string[];
  route: { name: string; lat: number; lng: number }[];
  startDate: string;
  endDate: string;
  nights: number;
  /** Pre-formatted in the owner's currency by the server. */
  total: string;
  ownerName: string;
  viewCount: number;
}) {
  const reduceMotion = useReducedMotion();

  const rise = (delay: number) => ({
    initial: reduceMotion ? false : { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] as const },
  });

  return (
    <header className="relative overflow-hidden">
      {/* The globe bleeds off the top of the page. */}
      <div className="pointer-events-none absolute inset-x-0 -top-24 h-[520px] opacity-70">
        <Globe route={route} autoRotate={false} interactive={false} className="size-full" />
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-[linear-gradient(to_bottom,transparent_30%,var(--color-ink)_92%)]"
      />

      <div className="relative mx-auto max-w-[720px] px-5 pb-14 pt-[280px] sm:pt-[320px]">
        <motion.p {...rise(0)} className="placard mb-4">
          Shared itinerary · by {ownerName}
        </motion.p>

        <motion.h1
          {...rise(0.08)}
          className="font-display text-4xl font-medium italic leading-[1.08] tracking-[-0.02em] text-cloud sm:text-5xl"
        >
          {tripName}
        </motion.h1>

        <motion.p
          {...rise(0.16)}
          className="mt-5 text-lg leading-snug text-cloud/85 sm:text-xl"
        >
          {cities.map((city, index) => (
            <span key={`${city}-${index}`}>
              {city}
              {index < cities.length - 1 ? (
                <span className="mx-2 text-lagoon" aria-hidden>
                  →
                </span>
              ) : null}
            </span>
          ))}
        </motion.p>

        <motion.dl
          {...rise(0.24)}
          className="mt-8 flex flex-wrap gap-x-10 gap-y-5 border-t border-line pt-6"
        >
          <div>
            <dt className="placard mb-1.5">Dates</dt>
            <dd className="font-mono text-sm tabular-nums text-cloud">
              {formatDateRange(startDate, endDate)}
            </dd>
          </div>

          <div>
            <dt className="placard mb-1.5">Length</dt>
            <dd className="font-mono text-sm tabular-nums text-cloud">
              {nights} {nights === 1 ? "night" : "nights"}
            </dd>
          </div>

          <div>
            <dt className="placard mb-1.5">Estimated total</dt>
            <dd className="font-mono text-sm font-semibold tabular-nums text-solar">{total}</dd>
          </div>

          <div className="ml-auto self-end">
            <dd className="flex items-center gap-1.5 font-mono text-2xs text-fog-dim">
              <Eye className="size-3" aria-hidden />
              seen {viewCount} {viewCount === 1 ? "time" : "times"}
            </dd>
          </div>
        </motion.dl>
      </div>
    </header>
  );
}
