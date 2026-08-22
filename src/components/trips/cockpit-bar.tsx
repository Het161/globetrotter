"use client";

import * as React from "react";
import Link from "next/link";
import { CalendarRange, Check, Eye, Pencil, Wallet, X } from "lucide-react";
import type { TripDTO } from "@/server/dto";
import type { BudgetBreakdown } from "@/server/engine/budget";
import { DeckButton } from "@/components/ui/deck-button";
import { PerfPill } from "@/components/ui/perf-pill";
import { Input } from "@/components/ui/field";
import { useCurrency } from "@/hooks/use-currency";
import { formatDateRange } from "@/lib/dates";
import { cn, clamp, pluralize } from "@/lib/utils";

/**
 * The cockpit bar: what the trip is, how big it is, and what it costs — pinned
 * to the top of the builder so the money is never more than a glance away.
 *
 * The progress bar is the whole point of the screen. It fills with Lagoon
 * while you're inside the budget, Solar as you approach it, and Ember the
 * moment you cross — and it moves as you drag stops around, because the total
 * is recomputed locally by the same engine the server uses.
 */
export function CockpitBar({
  trip,
  budget,
  onRename,
  saving,
}: {
  trip: TripDTO;
  budget: BudgetBreakdown;
  onRename: (name: string) => Promise<void>;
  saving?: boolean;
}) {
  const money = useCurrency();
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(trip.name);

  React.useEffect(() => setDraft(trip.name), [trip.name]);

  const nights = trip.stops.reduce((sum, stop) => sum + stop.nights, 0);
  const limit = trip.budgetLimit;
  const ratio = limit && limit > 0 ? budget.total / limit : null;
  const over = ratio !== null && ratio > 1;
  const near = ratio !== null && ratio > 0.85 && ratio <= 1;

  async function commit() {
    const name = draft.trim();
    setEditing(false);
    if (name.length < 3 || name === trip.name) {
      setDraft(trip.name);
      return;
    }
    await onRename(name);
  }

  return (
    <header className="sticky top-14 z-20 -mx-4 mb-5 border-b border-line bg-ink/85 px-4 py-3.5 backdrop-blur-xl sm:-mx-6 sm:px-6">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        {/* Identity */}
        <div className="min-w-0 flex-1">
          {editing ? (
            <div className="flex items-center gap-2">
              <Input
                value={draft}
                autoFocus
                maxLength={80}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") void commit();
                  if (event.key === "Escape") {
                    setDraft(trip.name);
                    setEditing(false);
                  }
                }}
                aria-label="Trip name"
                className="max-w-md text-lg"
              />
              <DeckButton size="icon-sm" variant="ghost" aria-label="Save name" onClick={commit}>
                <Check />
              </DeckButton>
              <DeckButton
                size="icon-sm"
                variant="ghost"
                aria-label="Cancel"
                onClick={() => {
                  setDraft(trip.name);
                  setEditing(false);
                }}
              >
                <X />
              </DeckButton>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="group flex max-w-full items-center gap-2 text-left"
            >
              <h1 className="trip-name truncate text-xl text-cloud sm:text-2xl">{trip.name}</h1>
              <Pencil className="size-3.5 shrink-0 text-fog opacity-0 transition-opacity group-hover:opacity-100" />
            </button>
          )}

          <p className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 font-mono text-2xs text-fog">
            <span>{formatDateRange(trip.startDate, trip.endDate)}</span>
            <span aria-hidden className="text-fog-dim">
              ·
            </span>
            <span>{pluralize(trip.stops.length, "stop")}</span>
            <span aria-hidden className="text-fog-dim">
              ·
            </span>
            <span>{pluralize(nights, "night")}</span>
            <PerfPill className="ml-1" />
            {saving ? <span className="text-lagoon">saving…</span> : null}
          </p>
        </div>

        {/* Money */}
        <div className="w-full sm:w-64">
          <div className="flex items-baseline justify-between gap-3">
            <span className="placard">Running total</span>
            <span
              className={cn(
                "font-mono text-base font-semibold tabular-nums",
                over ? "text-ember" : "text-solar",
              )}
            >
              {money.format(budget.total, { decimals: false })}
            </span>
          </div>

          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-deck">
            <div
              className={cn(
                "h-full rounded-full transition-[width,background-color] duration-240",
                over ? "bg-ember" : near ? "bg-solar" : "bg-lagoon",
              )}
              style={{ width: ratio === null ? "0%" : `${clamp(ratio * 100, 2, 100)}%` }}
            />
          </div>

          <p className="mt-1 font-mono text-2xs text-fog">
            {limit === null ? (
              "No budget limit set"
            ) : over ? (
              <span className="text-ember">
                {money.format(budget.total - limit, { decimals: false })} over budget
              </span>
            ) : (
              <span>
                {money.format(limit - budget.total, { decimals: false })} left of{" "}
                {money.format(limit, { decimals: false })}
              </span>
            )}
          </p>
        </div>

        {/* Elsewhere in the trip */}
        <nav className="flex shrink-0 items-center gap-2" aria-label="Trip views">
          <DeckButton asChild variant="secondary" size="sm">
            <Link href={`/trips/${trip.id}`}>
              <Eye />
              <span className="hidden sm:inline">View</span>
            </Link>
          </DeckButton>
          <DeckButton asChild variant="secondary" size="sm">
            <Link href={`/trips/${trip.id}/budget`}>
              <Wallet />
              <span className="hidden sm:inline">Budget</span>
            </Link>
          </DeckButton>
          <DeckButton asChild variant="secondary" size="sm">
            <Link href={`/trips/${trip.id}/calendar`}>
              <CalendarRange />
              <span className="hidden sm:inline">Calendar</span>
            </Link>
          </DeckButton>
        </nav>
      </div>
    </header>
  );
}
