"use client";

import Link from "next/link";
import { AlertTriangle, TrendingUp } from "lucide-react";
import { SplitFlap } from "@/components/ui/split-flap";
import { useCurrency } from "@/hooks/use-currency";
import { pluralize } from "@/lib/utils";

/**
 * Planned spend across upcoming trips, on the departure board's digits.
 *
 * One of only two places SplitFlap is allowed (§11.4) — this and the budget
 * screen's headline. Money is the thing this product is actually about, so it
 * gets the mechanical treatment and nothing else does.
 */
export function BudgetTile({
  upcomingSpend,
  overBudgetDays,
  citiesVisited,
  nextTripId,
}: {
  upcomingSpend: number;
  overBudgetDays: number;
  citiesVisited: number;
  nextTripId: string | null;
}) {
  const money = useCurrency();

  return (
    <section className="surface flex h-full flex-col p-5" aria-labelledby="budget-heading">
      <header className="mb-4 flex items-center justify-between">
        <h2 id="budget-heading" className="placard">
          Planned spend
        </h2>
        <TrendingUp className="size-4 text-fog-dim" aria-hidden />
      </header>

      <SplitFlap
        value={money.digits(upcomingSpend)}
        prefix={money.symbol}
        size="md"
        aria-label={`Planned spend ${money.format(upcomingSpend)}`}
      />

      <p className="mt-2.5 text-xs text-fog">Across your upcoming trips</p>

      <div className="mt-auto space-y-2 pt-5">
        {overBudgetDays > 0 ? (
          <Link
            href={nextTripId ? `/trips/${nextTripId}/budget` : "/trips"}
            className="flex items-center gap-2.5 rounded-[var(--radius-input)] border border-ember/25 bg-ember/[0.07] px-3 py-2.5 transition-colors hover:border-ember/45"
          >
            <AlertTriangle className="size-4 shrink-0 text-ember" aria-hidden />
            <span className="text-xs text-cloud">
              <span className="font-mono font-semibold text-ember">{overBudgetDays}</span>{" "}
              {pluralize(overBudgetDays, "day", "days").replace(/^\d+\s/, "")} over your daily
              limit
            </span>
          </Link>
        ) : (
          <div className="flex items-center gap-2.5 rounded-[var(--radius-input)] border border-lagoon/20 bg-lagoon/[0.06] px-3 py-2.5">
            <span aria-hidden className="size-1.5 rounded-full bg-lagoon" />
            <span className="text-xs text-fog">Every day is inside budget</span>
          </div>
        )}

        <div className="flex items-baseline justify-between border-t border-line pt-3">
          <span className="placard">Cities planned</span>
          <span className="font-mono text-sm font-semibold tabular-nums text-cloud">
            {citiesVisited}
          </span>
        </div>
      </div>
    </section>
  );
}
