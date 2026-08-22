"use client";

import * as React from "react";
import Link from "next/link";
import { CalendarDays, ListTree, PencilRuler } from "lucide-react";
import type { TripDTO } from "@/server/dto";
import type { BudgetBreakdown } from "@/server/engine/budget";
import type { CalendarDay } from "@/server/services/trips";
import { MonthGrid } from "./month-grid";
import { VerticalTimeline } from "./vertical-timeline";
import { DeckButton } from "@/components/ui/deck-button";
import { BudgetChip } from "@/components/ui/chip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/menu";
import { useCurrency } from "@/hooks/use-currency";
import { formatDate, formatMinute, weekday } from "@/lib/dates";
import { cn } from "@/lib/utils";

/**
 * Calendar and timeline, two readings of the same data.
 *
 * The grid answers "what does this month look like"; the timeline answers
 * "what happens next". Both come from the one `/trips/[id]/calendar` DTO, so
 * they can never disagree.
 */
export function CalendarView({
  trip,
  days,
  budget,
  canEdit,
}: {
  trip: TripDTO;
  days: CalendarDay[];
  budget: BudgetBreakdown;
  canEdit: boolean;
}) {
  const money = useCurrency();
  const [selectedDate, setSelectedDate] = React.useState<string | null>(
    days[0]?.date ?? null,
  );

  const selected = days.find((day) => day.date === selectedDate) ?? null;

  return (
    <Tabs defaultValue="grid">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <TabsList>
          <TabsTrigger value="grid">
            <span className="flex items-center gap-1.5">
              <CalendarDays className="size-3.5" aria-hidden />
              Calendar
            </span>
          </TabsTrigger>
          <TabsTrigger value="timeline">
            <span className="flex items-center gap-1.5">
              <ListTree className="size-3.5" aria-hidden />
              Timeline
            </span>
          </TabsTrigger>
        </TabsList>

        <div className="flex items-center gap-2">
          <BudgetChip status="over">{budget.overBudgetDays.length} over budget</BudgetChip>
          {canEdit ? (
            <DeckButton asChild variant="secondary" size="sm">
              <Link href={`/trips/${trip.id}/build`}>
                <PencilRuler />
                <span className="hidden sm:inline">Builder</span>
              </Link>
            </DeckButton>
          ) : null}
        </div>
      </div>

      <TabsContent value="grid">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="surface p-5">
            <MonthGrid days={days} selectedDate={selectedDate} onSelectDay={setSelectedDate} />
          </div>

          <DayPanel day={selected} tripId={trip.id} canEdit={canEdit} />
        </div>
      </TabsContent>

      <TabsContent value="timeline">
        <div className="surface p-5 sm:p-6">
          <VerticalTimeline days={days} onSelectDay={setSelectedDate} />
        </div>
      </TabsContent>

      <p className="mt-5 text-center font-mono text-2xs text-fog-dim">
        Trip total {money.format(budget.total, { decimals: false })} ·{" "}
        {money.format(budget.avgPerDay, { decimals: false })} per day
      </p>
    </Tabs>
  );
}

/* -------------------------------------------------------------------------- */

function DayPanel({
  day,
  tripId,
  canEdit,
}: {
  day: CalendarDay | null;
  tripId: string;
  canEdit: boolean;
}) {
  const money = useCurrency();

  if (!day) {
    return (
      <aside className="surface p-5">
        <p className="text-sm text-fog">Pick a day to see what&apos;s planned.</p>
      </aside>
    );
  }

  return (
    <aside className="surface self-start p-5" aria-live="polite">
      <p className="placard mb-1.5">
        {weekday(day.date)} · {day.cityName ?? "Between stops"}
      </p>
      <h3 className="font-display text-xl font-medium text-cloud">{formatDate(day.date)}</h3>

      <div className="mt-4 flex items-baseline justify-between border-y border-line py-3">
        <span className="text-sm text-fog">Spend</span>
        <span
          className={cn(
            "font-mono text-lg font-semibold tabular-nums",
            day.status === "over"
              ? "text-ember"
              : day.status === "near"
                ? "text-solar"
                : "text-cloud",
          )}
        >
          {money.format(day.spend, { decimals: false })}
        </span>
      </div>

      {day.status === "over" ? (
        <p className="mt-3 rounded-[var(--radius-input)] border border-ember/25 bg-ember/[0.07] px-3 py-2 text-xs text-cloud">
          This day is over your daily allowance.
        </p>
      ) : null}

      {day.activities.length > 0 ? (
        <ul className="mt-4 space-y-2">
          {day.activities
            .slice()
            .sort((a, b) => (a.startMinute ?? 1440) - (b.startMinute ?? 1440))
            .map((activity) => (
              <li key={activity.id} className="flex items-baseline gap-3">
                <span className="w-11 shrink-0 font-mono text-2xs tabular-nums text-lagoon">
                  {activity.startMinute === null ? "—" : formatMinute(activity.startMinute)}
                </span>
                <span className="min-w-0 flex-1 text-sm text-cloud">{activity.name}</span>
                <span className="shrink-0 font-mono text-2xs tabular-nums text-solar">
                  {activity.cost === 0 ? "Free" : money.format(activity.cost, { decimals: false })}
                </span>
              </li>
            ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-fog">Nothing planned for this day.</p>
      )}

      {canEdit ? (
        <DeckButton asChild variant="secondary" size="sm" className="mt-5 w-full">
          <Link href={`/trips/${tripId}/build`}>Edit in the builder</Link>
        </DeckButton>
      ) : null}
    </aside>
  );
}
