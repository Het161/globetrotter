"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { AdminOverview } from "@/server/services/admin";
import { formatDateShort } from "@/lib/dates";

/** Admin trend charts. Same colour semantics as the rest of the app. */

const AXIS = {
  tick: { fill: "var(--color-fog-dim)", fontSize: 10, fontFamily: "var(--font-mono)" },
  axisLine: { stroke: "var(--color-line)" },
  tickLine: false,
} as const;

export function TrendChart({
  data,
  colour = "var(--color-lagoon)",
  label,
}: {
  data: { date: string; count: number }[];
  colour?: string;
  label: string;
}) {
  const points = data.map((row) => ({ ...row, label: formatDateShort(row.date) }));
  const gradientId = `trend-${label.replace(/\W/g, "")}`;

  return (
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 6, right: 4, bottom: 0, left: 4 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={colour} stopOpacity={0.35} />
              <stop offset="100%" stopColor={colour} stopOpacity={0} />
            </linearGradient>
          </defs>

          <XAxis dataKey="label" interval="preserveStartEnd" minTickGap={28} {...AXIS} />
          <YAxis allowDecimals={false} width={26} {...AXIS} />
          <Tooltip content={<Box suffix={label} />} cursor={{ stroke: "var(--color-line-strong)" }} />

          <Area
            type="monotone"
            dataKey="count"
            stroke={colour}
            strokeWidth={1.6}
            fill={`url(#${gradientId})`}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function TopCitiesChart({ data }: { data: AdminOverview["topCities"] }) {
  if (data.length === 0) {
    return <p className="py-10 text-center text-sm text-fog">No stops recorded yet.</p>;
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 12, bottom: 4, left: 4 }}
        >
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="name" width={92} {...AXIS} />
          <Tooltip content={<Box suffix="stops" />} cursor={{ fill: "rgba(242,238,227,0.04)" }} />
          <Bar dataKey="stops" radius={[0, 3, 3, 0]} isAnimationActive={false}>
            {data.map((row, index) => (
              <Cell
                key={row.name}
                // The leader gets Solar; everything else recedes to Lagoon.
                fill={index === 0 ? "var(--color-solar)" : "var(--color-lagoon)"}
                fillOpacity={index === 0 ? 1 : 0.85 - index * 0.06}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CategoryMixChart({ data }: { data: AdminOverview["categoryMix"] }) {
  if (data.length === 0) {
    return <p className="py-10 text-center text-sm text-fog">No activities placed yet.</p>;
  }

  const total = data.reduce((sum, row) => sum + row.count, 0);

  return (
    <ul className="space-y-2.5">
      {data.map((row) => (
        <li key={row.category}>
          <div className="mb-1 flex items-baseline justify-between gap-3">
            <span className="text-sm text-fog">{title(row.category)}</span>
            <span className="font-mono text-2xs tabular-nums text-fog-dim">
              {row.count} · {Math.round((row.count / total) * 100)}%
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-deck">
            <div
              className="h-full rounded-full bg-lagoon"
              style={{ width: `${(row.count / total) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

function Box({
  active,
  payload,
  label,
  suffix,
}: {
  active?: boolean;
  payload?: { value?: number }[];
  label?: string;
  suffix: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-md border border-line bg-deck px-2.5 py-1.5 shadow-[var(--lift-2)]">
      {label ? <p className="font-mono text-2xs text-fog">{label}</p> : null}
      <p className="font-mono text-sm font-semibold tabular-nums text-cloud">
        {payload[0].value} {suffix}
      </p>
    </div>
  );
}

function title(value: string) {
  return value.charAt(0) + value.slice(1).toLowerCase();
}
