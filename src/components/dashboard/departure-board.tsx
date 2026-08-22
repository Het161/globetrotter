"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { PlaneTakeoff } from "lucide-react";
import type { TripDTO } from "@/server/dto";
import { departureRows } from "@/lib/trip-view";
import { StatusChip } from "@/components/ui/chip";
import { DeckButton } from "@/components/ui/deck-button";
import { RouteDoodle } from "@/components/ui/empty-state";
import { countdown, formatDateShort } from "@/lib/dates";

/**
 * The departure board: the next few trips as rows, exactly like an airport
 * board — destination, date, and how long until you leave.
 *
 * Rows stagger in at 50 ms so the board "fills" rather than appearing, which
 * is the same instinct as the SplitFlap without spending the flip animation.
 */
export function DepartureBoard({ trips }: { trips: TripDTO[] }) {
  const reduceMotion = useReducedMotion();
  const rows = departureRows(trips);

  return (
    <section className="surface flex h-full flex-col p-5" aria-labelledby="departures-heading">
      <header className="mb-4 flex items-center justify-between">
        <h2 id="departures-heading" className="placard">
          Departures
        </h2>
        <PlaneTakeoff className="size-4 text-fog-dim" aria-hidden />
      </header>

      {rows.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center py-6 text-center">
          <RouteDoodle className="mb-3" />
          <p className="text-sm text-fog">Nothing scheduled yet.</p>
          <DeckButton asChild variant="secondary" size="sm" className="mt-4">
            <Link href="/trips/new">Plan a trip</Link>
          </DeckButton>
        </div>
      ) : (
        <ul className="-mx-2 flex-1 space-y-0.5">
          {rows.map((row, index) => (
            <motion.li
              key={row.id}
              initial={reduceMotion ? false : { opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05, duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            >
              <Link
                href={`/trips/${row.id}`}
                className="flex items-center gap-3 rounded-[var(--radius-input)] px-2 py-2.5 transition-colors hover:bg-deck/70"
              >
                <span className="min-w-0 flex-1">
                  <span className="trip-name block truncate text-base text-cloud">
                    {row.name}
                  </span>
                  <span className="mt-0.5 block truncate font-mono text-2xs text-fog">
                    {row.firstCity} · {formatDateShort(row.startDate)}
                  </span>
                </span>

                {row.status === "COMPLETED" ? (
                  <StatusChip status={row.status} />
                ) : (
                  <span className="shrink-0 text-right">
                    <span className="block font-mono text-sm font-semibold tabular-nums text-lagoon">
                      {row.daysAway > 0 ? `${row.daysAway}d` : row.daysAway === 0 ? "today" : "now"}
                    </span>
                    <span className="block font-mono text-2xs text-fog-dim">
                      {countdown(row.startDate)}
                    </span>
                  </span>
                )}
              </Link>
            </motion.li>
          ))}
        </ul>
      )}
    </section>
  );
}
