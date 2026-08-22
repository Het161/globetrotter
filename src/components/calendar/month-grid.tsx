"use client";

import * as React from "react";
import type { CalendarDay } from "@/server/services/trips";
import { regionGradient } from "@/components/ui/postcard";
import { useCurrency } from "@/hooks/use-currency";
import { fromISODate, monthLabel, toISODate } from "@/lib/dates";
import { cn } from "@/lib/utils";

/**
 * The trip as a calendar, spanning as many months as it needs.
 *
 * Each day is tinted by the region of the city you're in that day, and its
 * opacity tracks how much you spend — so a heavy day is visibly denser. Days
 * over the daily allowance get an Ember ring *and* an ember figure, because
 * colour is never the only signal.
 */

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function MonthGrid({
  days,
  selectedDate,
  onSelectDay,
}: {
  days: CalendarDay[];
  selectedDate: string | null;
  onSelectDay: (date: string) => void;
}) {
  const money = useCurrency();

  const months = React.useMemo(() => groupByMonth(days), [days]);
  const maxSpend = Math.max(1, ...days.map((day) => day.spend));

  return (
    <div className="space-y-8">
      {months.map((month) => (
        <section key={month.key} aria-label={month.label}>
          <h3 className="placard mb-3">{month.label}</h3>

          <div className="grid grid-cols-7 gap-1.5">
            {WEEKDAY_LABELS.map((label) => (
              <div key={label} className="pb-1 text-center font-mono text-2xs text-fog-dim">
                {label}
              </div>
            ))}

            {/* Blank cells so the first day lands on the right weekday. */}
            {Array.from({ length: month.leadingBlanks }, (_, i) => (
              <div key={`blank-${i}`} />
            ))}

            {month.days.map((day) => {
              const [from, to] = day.region
                ? regionGradient(day.region)
                : ["transparent", "transparent"];
              const heat = day.spend / maxSpend;
              const selected = day.date === selectedDate;

              return (
                <button
                  key={day.date}
                  type="button"
                  onClick={() => onSelectDay(day.date)}
                  aria-pressed={selected}
                  aria-label={`${day.date}${day.cityName ? `, ${day.cityName}` : ""}, ${money.format(day.spend)}${day.status === "over" ? ", over budget" : ""}`}
                  className={cn(
                    "relative aspect-square overflow-hidden rounded-[10px] border p-1.5 text-left transition-all",
                    selected
                      ? "border-lagoon ring-1 ring-lagoon/40"
                      : day.status === "over"
                        ? "border-ember/50"
                        : "border-line hover:border-line-strong",
                  )}
                >
                  {/* City tint, intensity by spend. */}
                  {day.region ? (
                    <span
                      aria-hidden
                      className="absolute inset-0"
                      style={{
                        background: `linear-gradient(150deg, ${from}, ${to})`,
                        opacity: 0.16 + heat * 0.5,
                      }}
                    />
                  ) : (
                    <span aria-hidden className="absolute inset-0 bg-deck/40" />
                  )}

                  <span className="relative flex h-full flex-col">
                    <span className="flex items-start justify-between">
                      <span className="font-mono text-xs font-semibold tabular-nums text-cloud">
                        {fromISODate(day.date).getUTCDate()}
                      </span>
                      {day.status === "over" ? (
                        <span
                          aria-hidden
                          className="mt-0.5 size-1.5 shrink-0 rounded-full bg-ember"
                        />
                      ) : null}
                    </span>

                    {day.cityName ? (
                      <span className="mt-auto truncate text-[10px] font-medium text-cloud/85">
                        {day.cityName}
                      </span>
                    ) : null}

                    <span
                      className={cn(
                        "truncate font-mono text-[9px] tabular-nums",
                        day.status === "over"
                          ? "text-ember"
                          : day.status === "near"
                            ? "text-solar"
                            : "text-cloud/55",
                      )}
                    >
                      {day.spend > 0 ? money.format(day.spend, { compact: true }) : "—"}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

/** Split a flat day list into month blocks, with the right weekday offset. */
function groupByMonth(days: CalendarDay[]) {
  const months: { key: string; label: string; leadingBlanks: number; days: CalendarDay[] }[] = [];

  for (const day of days) {
    const date = fromISODate(day.date);
    const key = toISODate(date).slice(0, 7);
    let month = months.find((m) => m.key === key);

    if (!month) {
      // getUTCDay is Sunday-first; our grid starts on Monday.
      const firstOfBlock = fromISODate(day.date);
      const weekday = (firstOfBlock.getUTCDay() + 6) % 7;
      month = { key, label: monthLabel(day.date), leadingBlanks: weekday, days: [] };
      months.push(month);
    }

    month.days.push(day);
  }

  return months;
}
