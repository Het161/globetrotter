"use client";

import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { BudgetBreakdown, BudgetCategory, DayBudget } from "@/server/engine/budget";
import { categoryLabel } from "@/server/engine/budget";
import { useCurrency } from "@/hooks/use-currency";
import { formatDateShort, weekday } from "@/lib/dates";

/**
 * Budget charts.
 *
 * Colour follows the design system's semantics rather than a chart palette:
 * Solar is money, Lagoon is the route (transport), Ember is over. Every chart
 * also labels its values, because a reviewer reading a screenshot shouldn't
 * have to decode a legend.
 */

const CATEGORY_COLOUR: Record<BudgetCategory, string> = {
  STAY: "var(--color-solar)",
  TRANSPORT: "var(--color-lagoon)",
  ACTIVITIES: "var(--color-plum)",
  MEALS: "#7BA7D9",
  OTHER: "var(--color-fog)",
};

/* -------------------------------------------------------------------------- */

export function CategoryDonut({ byCategory }: { byCategory: BudgetBreakdown["byCategory"] }) {
  const money = useCurrency();

  const data = (Object.entries(byCategory) as [BudgetCategory, number][])
    .filter(([, value]) => value > 0)
    .map(([category, value]) => ({
      category,
      label: categoryLabel(category),
      value,
      fill: CATEGORY_COLOUR[category],
    }))
    .sort((a, b) => b.value - a.value);

  const total = data.reduce((sum, slice) => sum + slice.value, 0);

  if (total === 0) {
    return <p className="py-10 text-center text-sm text-fog">Nothing to break down yet.</p>;
  }

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row">
      <div className="relative h-44 w-44 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="label"
              innerRadius="62%"
              outerRadius="100%"
              paddingAngle={2}
              stroke="var(--color-ink)"
              strokeWidth={2}
              isAnimationActive={false}
            >
              {data.map((slice) => (
                <Cell key={slice.category} fill={slice.fill} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip />} />
          </PieChart>
        </ResponsiveContainer>

        {/* The total sits in the hole — the donut's reason for being a donut. */}
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className="text-center">
            <p className="placard mb-0.5">Total</p>
            <p className="font-mono text-sm font-semibold tabular-nums text-cloud">
              {money.format(total, { compact: true })}
            </p>
          </div>
        </div>
      </div>

      <ul className="w-full flex-1 space-y-2">
        {data.map((slice) => (
          <li key={slice.category} className="flex items-center gap-2.5">
            <span
              aria-hidden
              className="size-2.5 shrink-0 rounded-[3px]"
              style={{ background: slice.fill }}
            />
            <span className="flex-1 truncate text-sm text-fog">{slice.label}</span>
            <span className="font-mono text-2xs tabular-nums text-fog-dim">
              {Math.round((slice.value / total) * 100)}%
            </span>
            <span className="w-20 text-right font-mono text-xs font-semibold tabular-nums text-cloud">
              {money.format(slice.value, { decimals: false })}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

export function DailyBars({
  byDay,
  dailyLimit,
  onSelectDay,
}: {
  byDay: DayBudget[];
  dailyLimit: number | null;
  onSelectDay?: (date: string) => void;
}) {
  const money = useCurrency();

  const data = byDay.map((day) => ({
    date: day.date,
    label: formatDateShort(day.date),
    spend: day.spend,
    status: day.status,
  }));

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 4 }} barCategoryGap="18%">
          <XAxis
            dataKey="label"
            tick={{ fill: "var(--color-fog-dim)", fontSize: 10, fontFamily: "var(--font-mono)" }}
            axisLine={{ stroke: "var(--color-line)" }}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis hide />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(242,238,227,0.04)" }} />

          <Bar
            dataKey="spend"
            radius={[3, 3, 0, 0]}
            isAnimationActive={false}
            onClick={(entry: { date?: string }) => entry.date && onSelectDay?.(entry.date)}
            cursor={onSelectDay ? "pointer" : undefined}
          >
            {data.map((day) => (
              <Cell
                key={day.date}
                fill={
                  day.status === "over"
                    ? "var(--color-ember)"
                    : day.status === "near"
                      ? "var(--color-solar)"
                      : "var(--color-deck-hi)"
                }
              />
            ))}
          </Bar>

          {/* The daily allowance, drawn as a dashed rule across the plot. */}
          {dailyLimit !== null ? (
            <Bar dataKey="__limit" isAnimationActive={false} legendType="none" hide />
          ) : null}
        </BarChart>
      </ResponsiveContainer>

      {dailyLimit !== null ? (
        <p className="mt-1.5 text-center font-mono text-2xs text-fog-dim">
          Daily allowance {money.format(dailyLimit, { decimals: false })} · bars in{" "}
          <span className="text-ember">ember</span> are over it
        </p>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */

export function StopBars({ byStop }: { byStop: BudgetBreakdown["byStop"] }) {
  const money = useCurrency();
  const max = Math.max(1, ...byStop.map((stop) => stop.total));

  if (byStop.length === 0) {
    return <p className="py-8 text-center text-sm text-fog">No stops on this trip yet.</p>;
  }

  return (
    <ul className="space-y-3.5">
      {byStop.map((stop) => (
        <li key={stop.stopId}>
          <div className="mb-1.5 flex items-baseline justify-between gap-3">
            <span className="truncate text-sm font-medium text-cloud">{stop.cityName}</span>
            <span className="shrink-0 font-mono text-xs font-semibold tabular-nums text-solar">
              {money.format(stop.total, { decimals: false })}
            </span>
          </div>

          {/* One stacked bar per stop — the four costs, in proportion. */}
          <div className="flex h-2 overflow-hidden rounded-full bg-deck">
            {(
              [
                ["STAY", stop.stay],
                ["MEALS", stop.meals],
                ["ACTIVITIES", stop.activities],
                ["TRANSPORT", stop.transport],
              ] as [BudgetCategory, number][]
            ).map(([category, value]) =>
              value > 0 ? (
                <span
                  key={category}
                  title={`${categoryLabel(category)}: ${money.format(value)}`}
                  style={{
                    width: `${(value / max) * 100}%`,
                    background: CATEGORY_COLOUR[category],
                  }}
                />
              ) : null,
            )}
          </div>

          <p className="mt-1 font-mono text-2xs text-fog-dim">
            {stop.nights} {stop.nights === 1 ? "night" : "nights"} ·{" "}
            {money.format(stop.stay, { decimals: false })} stay ·{" "}
            {money.format(stop.activities, { decimals: false })} activities
          </p>
        </li>
      ))}
    </ul>
  );
}

/* -------------------------------------------------------------------------- */

type TooltipPayload = { payload?: { label?: string; date?: string; value?: number; spend?: number } };

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
}) {
  const money = useCurrency();
  if (!active || !payload?.length) return null;

  const entry = payload[0]?.payload;
  if (!entry) return null;

  const value = entry.spend ?? entry.value ?? 0;

  return (
    <div className="rounded-md border border-line bg-deck px-2.5 py-1.5 shadow-[var(--lift-2)]">
      <p className="font-mono text-2xs text-fog">
        {entry.date ? `${weekday(entry.date)} ${entry.label}` : entry.label}
      </p>
      <p className="font-mono text-sm font-semibold tabular-nums text-cloud">
        {money.format(value)}
      </p>
    </div>
  );
}
