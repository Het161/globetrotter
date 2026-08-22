"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { AlertTriangle, Check, Lightbulb, Pencil } from "lucide-react";
import { toast } from "sonner";
import type { TripDTO } from "@/server/dto";
import type { BudgetBreakdown } from "@/server/engine/budget";
import { api, errorMessage } from "@/lib/api-client";
import { SplitFlap } from "@/components/ui/split-flap";
import { DeckButton } from "@/components/ui/deck-button";
import { MoneyInput } from "@/components/ui/field";
import { BudgetChip } from "@/components/ui/chip";
import { Skeleton } from "@/components/ui/skeleton";
import { SectionLabel } from "@/components/layout/page-header";
import { ExpensePanel } from "./expense-panel";
import { useCurrency } from "@/hooks/use-currency";
import { RATE_NOTE } from "@/lib/currency";
import { formatDate, weekday } from "@/lib/dates";
import { cn, clamp } from "@/lib/utils";

/**
 * Charts are the heaviest thing on this route, so recharts is loaded on demand
 * and never on the server — the builder and explore screens never pay for it.
 */
const CategoryDonut = dynamic(
  () => import("./budget-charts").then((m) => m.CategoryDonut),
  { ssr: false, loading: () => <Skeleton className="h-44" /> },
);
const DailyBars = dynamic(() => import("./budget-charts").then((m) => m.DailyBars), {
  ssr: false,
  loading: () => <Skeleton className="h-56" />,
});
const StopBars = dynamic(() => import("./budget-charts").then((m) => m.StopBars), {
  ssr: false,
  loading: () => <Skeleton className="h-40" />,
});

export function BudgetView({
  trip,
  budget,
  canEdit,
}: {
  trip: TripDTO;
  budget: BudgetBreakdown;
  canEdit: boolean;
}) {
  const money = useCurrency();

  const over = budget.budgetLimit !== null && budget.total > budget.budgetLimit;
  const difference =
    budget.budgetLimit === null ? null : Math.abs(budget.total - budget.budgetLimit);

  return (
    <div className="space-y-8">
      {/* --- Headline ---------------------------------------------------- */}
      <section className="surface relative overflow-hidden p-6 sm:p-8">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="placard mb-3">Estimated total</p>

            <SplitFlap
              value={money.digits(budget.total)}
              prefix={money.symbol}
              size="lg"
              aria-label={`Estimated total ${money.format(budget.total)}`}
            />

            <p className="mt-3 font-mono text-xs text-fog">
              {money.format(budget.avgPerDay, { decimals: false })} per day across{" "}
              {budget.tripDays} days
            </p>
          </div>

          <BudgetLimitControl trip={trip} canEdit={canEdit} />
        </div>

        {/* Gauge */}
        {budget.budgetLimit !== null ? (
          <div className="mt-7">
            <div className="h-2.5 overflow-hidden rounded-full bg-deck">
              <div
                className={cn(
                  "h-full rounded-full transition-[width,background-color] duration-240",
                  over ? "bg-ember" : "bg-lagoon",
                )}
                style={{
                  width: `${clamp((budget.total / budget.budgetLimit) * 100, 2, 100)}%`,
                }}
              />
            </div>

            <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
              <p className={cn("text-sm font-medium", over ? "text-ember" : "text-lagoon")}>
                {over ? (
                  <>
                    {money.format(difference ?? 0, { decimals: false })} over your budget of{" "}
                    {money.format(budget.budgetLimit, { decimals: false })}
                  </>
                ) : (
                  <>
                    {money.format(difference ?? 0, { decimals: false })} under your budget of{" "}
                    {money.format(budget.budgetLimit, { decimals: false })}
                  </>
                )}
              </p>

              <p className="font-mono text-2xs text-fog-dim">
                Daily allowance {money.format(budget.dailyLimit ?? 0, { decimals: false })}
              </p>
            </div>
          </div>
        ) : (
          <p className="mt-6 text-sm text-fog">
            No budget limit set — add one to get daily allowances and over-budget alerts.
          </p>
        )}
      </section>

      {/* --- Saving tips -------------------------------------------------- */}
      {budget.savingTips.length > 0 ? (
        <section aria-labelledby="tips-heading">
          <SectionLabel>
            <span id="tips-heading">Ways to trim it</span>
          </SectionLabel>

          <ul className="grid gap-3 sm:grid-cols-3">
            {budget.savingTips.map((tip) => (
              <li
                key={tip.id}
                className="surface flex items-start gap-3 p-4"
              >
                <Lightbulb className="mt-0.5 size-4 shrink-0 text-solar" aria-hidden />
                <p className="text-sm leading-relaxed text-fog">
                  {/* The engine leaves a {money} placeholder so it never has to
                      know about the user's display currency. */}
                  {tip.message.split("{money}").map((part, index, parts) => (
                    <React.Fragment key={index}>
                      {part}
                      {index < parts.length - 1 ? (
                        <span className="font-mono font-semibold text-solar">
                          {money.format(tip.amountUSD ?? 0, { decimals: false })}
                        </span>
                      ) : null}
                    </React.Fragment>
                  ))}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* --- Charts ------------------------------------------------------- */}
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="surface p-5" aria-labelledby="category-heading">
          <h2 id="category-heading" className="placard mb-5">
            Where the money goes
          </h2>
          <CategoryDonut byCategory={budget.byCategory} />
        </section>

        <section className="surface p-5" aria-labelledby="stops-heading">
          <h2 id="stops-heading" className="placard mb-5">
            Cost by stop
          </h2>
          <StopBars byStop={budget.byStop} />
        </section>
      </div>

      <section className="surface p-5" aria-labelledby="daily-heading">
        <div className="mb-5 flex flex-wrap items-baseline justify-between gap-3">
          <h2 id="daily-heading" className="placard">
            Day by day
          </h2>
          <div className="flex gap-2">
            <BudgetChip status="under">{budget.byDay.filter((d) => d.status === "under").length} under</BudgetChip>
            <BudgetChip status="near">{budget.byDay.filter((d) => d.status === "near").length} near</BudgetChip>
            <BudgetChip status="over">{budget.overBudgetDays.length} over</BudgetChip>
          </div>
        </div>

        <DailyBars byDay={budget.byDay} dailyLimit={budget.dailyLimit} />
      </section>

      {/* --- Over-budget days --------------------------------------------- */}
      {/* items-start so neither panel stretches to match the other's height. */}
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="surface p-5" aria-labelledby="over-heading">
          <h2 id="over-heading" className="placard mb-4">
            Days over the limit
          </h2>

          {budget.budgetLimit === null ? (
            <p className="text-sm text-fog">Set a budget limit to see this.</p>
          ) : budget.overBudgetDays.length === 0 ? (
            <div className="flex items-center gap-2.5 rounded-[var(--radius-input)] border border-lagoon/20 bg-lagoon/[0.06] px-3.5 py-3">
              <Check className="size-4 shrink-0 text-lagoon" aria-hidden />
              <p className="text-sm text-cloud">Every day sits inside your daily allowance.</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {budget.byDay
                .filter((day) => day.status === "over")
                .map((day) => (
                  <li
                    key={day.date}
                    className="rounded-[var(--radius-input)] border border-ember/25 bg-ember/[0.06] p-3.5"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="flex items-center gap-2 text-sm font-medium text-cloud">
                        <AlertTriangle className="size-3.5 text-ember" aria-hidden />
                        {weekday(day.date)} {formatDate(day.date)}
                      </p>
                      <p className="font-mono text-sm font-semibold tabular-nums text-ember">
                        {money.format(day.spend, { decimals: false })}
                        <span className="ml-1.5 text-2xs font-normal text-fog">
                          (+{money.format(day.spend - (budget.dailyLimit ?? 0), { decimals: false })})
                        </span>
                      </p>
                    </div>

                    <ul className="mt-2 space-y-0.5">
                      {day.topItems.map((item) => (
                        <li
                          key={item.label}
                          className="flex justify-between gap-3 font-mono text-2xs text-fog"
                        >
                          <span className="truncate">{item.label}</span>
                          <span className="shrink-0 tabular-nums">
                            {money.format(item.amount, { decimals: false })}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
            </ul>
          )}
        </section>

        <ExpensePanel tripId={trip.id} expenses={trip.expenses} canEdit={canEdit} />
      </div>

      <p className="text-center font-mono text-2xs text-fog-dim">{RATE_NOTE}</p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function BudgetLimitControl({ trip, canEdit }: { trip: TripDTO; canEdit: boolean }) {
  const router = useRouter();
  const money = useCurrency();

  const [editing, setEditing] = React.useState(false);
  const [value, setValue] = React.useState(
    trip.budgetLimit === null ? "" : String(money.toDisplay(trip.budgetLimit)),
  );
  const [saving, setSaving] = React.useState(false);

  async function save() {
    setSaving(true);
    try {
      const typed = value.trim() === "" ? null : Number(value);
      await api.patch(
        `/trips/${trip.id}`,
        { budgetLimit: typed === null ? null : money.toUSD(typed) },
        { toastOnError: false },
      );
      setEditing(false);
      toast.success(typed === null ? "Budget limit removed" : "Budget limit updated");
      router.refresh();
    } catch (error) {
      toast.error(errorMessage(error, "We couldn't save that limit."));
    } finally {
      setSaving(false);
    }
  }

  if (!canEdit) {
    return (
      <div className="text-right">
        <p className="placard mb-1.5">Budget limit</p>
        <p className="font-mono text-lg font-semibold tabular-nums text-cloud">
          {trip.budgetLimit === null ? "—" : money.format(trip.budgetLimit, { decimals: false })}
        </p>
      </div>
    );
  }

  return (
    <div className="text-right">
      <p className="placard mb-1.5">Budget limit ({money.currency})</p>

      {editing ? (
        <div className="flex items-center gap-2">
          <MoneyInput
            symbol={money.symbol}
            value={value}
            autoFocus
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void save();
              if (event.key === "Escape") setEditing(false);
            }}
            placeholder="No limit"
            aria-label="Budget limit"
            className="w-40"
          />
          <DeckButton size="icon-sm" variant="ghost" onClick={save} disabled={saving} aria-label="Save limit">
            <Check />
          </DeckButton>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="group flex items-center gap-2 font-mono text-lg font-semibold tabular-nums text-cloud"
        >
          {trip.budgetLimit === null ? (
            <span className="text-fog">Set a limit</span>
          ) : (
            money.format(trip.budgetLimit, { decimals: false })
          )}
          <Pencil className="size-3.5 text-fog opacity-0 transition-opacity group-hover:opacity-100" />
        </button>
      )}
    </div>
  );
}
