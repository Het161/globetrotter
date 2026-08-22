"use client";

import { AnimatePresence, Reorder, useDragControls } from "motion/react";
import { CalendarPlus, Plus } from "lucide-react";
import type { StopActivityDTO, StopDTO } from "@/server/dto";
import type { DayBudget } from "@/server/engine/budget";
import { ActivityCard, ActivityDragHandle } from "./activity-card";
import { DeckButton } from "@/components/ui/deck-button";
import { RouteDoodle } from "@/components/ui/empty-state";
import { useCurrency } from "@/hooks/use-currency";
import { formatDateShort, weekday } from "@/lib/dates";
import { cn } from "@/lib/utils";

/**
 * The day canvas: one tab per day of the selected stop, and the activities
 * scheduled on the chosen day.
 *
 * Day tabs carry an Ember dot when that day is over the daily budget — the
 * same signal as the stop rail, so the alert survives whichever pane you are
 * looking at. Colour is never the only cue: the day's spend is printed too.
 */
export function DayCanvas({
  stop,
  days,
  selectedDate,
  budgetByDay,
  onSelectDate,
  onAddActivity,
  onUpdateActivity,
  onMoveActivity,
  onRemoveActivity,
  onReorderActivities,
}: {
  stop: StopDTO | null;
  days: string[];
  selectedDate: string | null;
  budgetByDay: Map<string, DayBudget>;
  onSelectDate: (date: string) => void;
  onAddActivity: () => void;
  onUpdateActivity: (id: string, patch: { startMinute?: number | null; cost?: number }) => void;
  onMoveActivity: (id: string, date: string) => void;
  onRemoveActivity: (id: string) => void;
  onReorderActivities: (ids: string[]) => void;
}) {
  const money = useCurrency();

  if (!stop) {
    return (
      <div className="surface flex min-h-[420px] flex-col items-center justify-center gap-4 p-8 text-center">
        <RouteDoodle />
        <div>
          <h3 className="text-lg font-medium text-cloud">No stop selected</h3>
          <p className="mt-1 text-sm text-fog">
            Add a city to the route, then pick it to fill in the days.
          </p>
        </div>
      </div>
    );
  }

  const dayActivities = stop.activities
    .filter((activity) => activity.date === selectedDate)
    .sort(
      (a, b) =>
        (a.startMinute ?? 24 * 60) - (b.startMinute ?? 24 * 60) || a.orderIndex - b.orderIndex,
    );

  const otherDays = days.filter((day) => day !== selectedDate);
  const dayBudget = selectedDate ? budgetByDay.get(selectedDate) : undefined;

  return (
    <div className="surface flex min-h-[420px] flex-col overflow-hidden">
      {/* Stop header */}
      <header className="flex flex-wrap items-baseline justify-between gap-3 border-b border-line px-4 py-3.5 sm:px-5">
        <div className="min-w-0">
          <h2 className="font-display text-xl font-medium text-cloud">{stop.city.name}</h2>
          <p className="mt-0.5 font-mono text-2xs text-fog">
            {stop.city.country} · {stop.nights} {stop.nights === 1 ? "night" : "nights"} ·{" "}
            {stop.activities.length} planned
          </p>
        </div>

        <DeckButton variant="primary" size="sm" onClick={onAddActivity}>
          <Plus />
          Add activity
        </DeckButton>
      </header>

      {/* Day tabs */}
      <div className="fade-x border-b border-line">
        <div
          role="tablist"
          aria-label={`Days in ${stop.city.name}`}
          className="no-scrollbar flex gap-1 overflow-x-auto px-3 py-2.5 sm:px-4"
        >
          {days.map((day, index) => {
            const budget = budgetByDay.get(day);
            const active = day === selectedDate;
            const count = stop.activities.filter((a) => a.date === day).length;

            return (
              <button
                key={day}
                role="tab"
                aria-selected={active}
                onClick={() => onSelectDate(day)}
                className={cn(
                  "relative shrink-0 rounded-[var(--radius-input)] px-3 py-2 text-left transition-colors",
                  active ? "bg-deck text-cloud" : "text-fog hover:bg-deck/50 hover:text-cloud",
                )}
              >
                <span className="flex items-center gap-1.5">
                  <span className="font-mono text-2xs uppercase tracking-[0.1em] text-fog-dim">
                    Day {index + 1}
                  </span>
                  {budget?.status === "over" ? (
                    <span
                      className="size-1.5 rounded-full bg-ember"
                      aria-label="over budget"
                    />
                  ) : budget?.status === "near" ? (
                    <span
                      className="size-1.5 rounded-full bg-solar"
                      aria-label="near budget"
                    />
                  ) : null}
                </span>

                <span className="mt-0.5 block whitespace-nowrap font-mono text-xs tabular-nums">
                  {weekday(day)} {formatDateShort(day)}
                </span>

                <span
                  className={cn(
                    "mt-0.5 block font-mono text-[10px] tabular-nums",
                    budget?.status === "over"
                      ? "text-ember"
                      : budget?.status === "near"
                        ? "text-solar"
                        : "text-fog-dim",
                  )}
                >
                  {money.format(budget?.spend ?? 0, { compact: true })} · {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Over-budget banner — text, not just colour. */}
      {dayBudget?.status === "over" ? (
        <div className="flex items-start gap-2.5 border-b border-ember/20 bg-ember/[0.07] px-4 py-2.5 sm:px-5">
          <span aria-hidden className="mt-1.5 size-1.5 shrink-0 rounded-full bg-ember" />
          <p className="text-xs text-cloud">
            This day is over your daily limit at{" "}
            <span className="font-mono font-semibold text-ember">
              {money.format(dayBudget.spend, { decimals: false })}
            </span>
            . Biggest items: {dayBudget.topItems.map((item) => item.label).join(", ")}.
          </p>
        </div>
      ) : null}

      {/* Activities */}
      <div className="flex-1 p-4 sm:p-5">
        {dayActivities.length === 0 ? (
          <div className="flex h-full min-h-[220px] flex-col items-center justify-center gap-3 text-center">
            <CalendarPlus className="size-6 text-fog-dim" aria-hidden />
            <p className="text-sm text-fog">Nothing planned for this day yet.</p>
            <DeckButton variant="secondary" size="sm" onClick={onAddActivity}>
              <Plus />
              Add an activity
            </DeckButton>
          </div>
        ) : (
          <Reorder.Group
            axis="y"
            values={dayActivities}
            onReorder={(next) => onReorderActivities(next.map((a) => a.id))}
            className="space-y-2"
          >
            <AnimatePresence initial={false}>
              {dayActivities.map((activity) => (
                <DraggableActivity
                  key={activity.id}
                  activity={activity}
                  otherDays={otherDays}
                  onUpdate={(patch) => onUpdateActivity(activity.id, patch)}
                  onMove={(date) => onMoveActivity(activity.id, date)}
                  onRemove={() => onRemoveActivity(activity.id)}
                />
              ))}
            </AnimatePresence>
          </Reorder.Group>
        )}
      </div>

      {/* Day total */}
      {dayActivities.length > 0 ? (
        <footer className="flex items-baseline justify-between border-t border-line px-4 py-3 sm:px-5">
          <span className="placard">Activities this day</span>
          <span className="font-mono text-sm font-semibold tabular-nums text-solar">
            {money.format(
              dayActivities.reduce((sum, activity) => sum + activity.cost, 0),
              { decimals: false },
            )}
          </span>
        </footer>
      ) : null}
    </div>
  );
}

function DraggableActivity({
  activity,
  otherDays,
  onUpdate,
  onMove,
  onRemove,
}: {
  activity: StopActivityDTO;
  otherDays: string[];
  onUpdate: (patch: { startMinute?: number | null; cost?: number }) => void;
  onMove: (date: string) => void;
  onRemove: () => void;
}) {
  const controls = useDragControls();

  return (
    <Reorder.Item
      value={activity}
      dragListener={false}
      dragControls={controls}
      className="list-none"
    >
      <ActivityCard
        activity={activity}
        otherDays={otherDays}
        dragHandle={<ActivityDragHandle onPointerDown={(event) => controls.start(event)} />}
        onUpdate={onUpdate}
        onMove={onMove}
        onRemove={onRemove}
      />
    </Reorder.Item>
  );
}
