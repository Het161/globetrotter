"use client";

import * as React from "react";
import { CalendarDays, ListTree } from "lucide-react";
import type { TripDTO } from "@/server/dto";
import type { BudgetBreakdown } from "@/server/engine/budget";
import type { CalendarDay } from "@/server/services/trips";
import { Postcard } from "@/components/ui/postcard";
import { CategoryChip } from "@/components/ui/chip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/menu";
import { MonthGrid } from "@/components/calendar/month-grid";
import { useCurrency } from "@/hooks/use-currency";
import { stopDays } from "@/lib/trip-view";
import { formatDate, formatDateRange, formatDuration, formatMinute, weekday } from "@/lib/dates";
import { cn, pluralize } from "@/lib/utils";

/**
 * The itinerary as a document: one section per city, one block per day.
 *
 * This is the read-only counterpart to the builder — the view you'd print, or
 * send to whoever is coming with you. Day numerals are set large in the
 * display face and hang in the margin on desktop, which is what gives the page
 * its spine without needing a rule down the side.
 */
export function ItineraryView({
  trip,
  budget,
  days,
}: {
  trip: TripDTO;
  budget: BudgetBreakdown;
  days: CalendarDay[];
}) {
  const money = useCurrency();
  const [selectedDate, setSelectedDate] = React.useState<string | null>(days[0]?.date ?? null);

  const byStop = new Map(budget.byStop.map((stop) => [stop.stopId, stop]));

  return (
    <Tabs defaultValue="list">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <TabsList>
          <TabsTrigger value="list">
            <span className="flex items-center gap-1.5">
              <ListTree className="size-3.5" aria-hidden />
              List
            </span>
          </TabsTrigger>
          <TabsTrigger value="calendar">
            <span className="flex items-center gap-1.5">
              <CalendarDays className="size-3.5" aria-hidden />
              Calendar
            </span>
          </TabsTrigger>
        </TabsList>

        <p className="font-mono text-xs text-fog">
          Trip total{" "}
          <span className="font-semibold text-solar">
            {money.format(budget.total, { decimals: false })}
          </span>
        </p>
      </div>

      <TabsContent value="list">
        {trip.stops.length === 0 ? (
          <p className="surface px-5 py-10 text-center text-sm text-fog">
            No stops yet. Open the builder and add your first city.
          </p>
        ) : (
          <div className="space-y-10">
            {trip.stops.map((stop, stopIndex) => {
              const stopBudget = byStop.get(stop.id);

              return (
                <section key={stop.id} aria-labelledby={`stop-${stop.id}`}>
                  {/* City banner */}
                  <div className="surface overflow-hidden">
                    <div className="tear-line relative">
                      <Postcard city={stop.city} size="banner" tilt={false} />

                      <div className="absolute left-4 top-4">
                        <span className="chip border-cloud/20 bg-ink/60 text-cloud backdrop-blur-sm">
                          Stop {stopIndex + 1}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-baseline justify-between gap-3 p-4 sm:p-5">
                      <div>
                        <h2
                          id={`stop-${stop.id}`}
                          className="font-display text-2xl font-medium text-cloud"
                        >
                          {stop.city.name}
                        </h2>
                        <p className="mt-1 font-mono text-2xs text-fog">
                          {formatDateRange(stop.arrivalDate, stop.departureDate)} ·{" "}
                          {pluralize(stop.nights, "night")} ·{" "}
                          {pluralize(stop.activities.length, "activity", "activities")}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="placard mb-0.5">City subtotal</p>
                        <p className="font-mono text-lg font-semibold tabular-nums text-solar">
                          {money.format(stopBudget?.total ?? 0, { decimals: false })}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Days */}
                  <div className="mt-5 space-y-5">
                    {stopDays(stop).map((day, dayIndex) => {
                      const dayActivities = stop.activities
                        .filter((activity) => activity.date === day)
                        .sort((a, b) => (a.startMinute ?? 1440) - (b.startMinute ?? 1440));

                      const dayBudget = budget.byDay.find((d) => d.date === day);

                      return (
                        <article
                          key={day}
                          className="grid gap-3 sm:grid-cols-[88px_minmax(0,1fr)]"
                        >
                          {/* The hanging numeral. */}
                          <div className="sm:text-right">
                            <p className="font-display text-4xl font-light leading-none text-cloud/25 sm:text-5xl">
                              {String(dayIndex + 1).padStart(2, "0")}
                            </p>
                            <p className="mt-1 font-mono text-2xs text-fog">
                              {weekday(day)} {formatDate(day).replace(/ \d{4}$/, "")}
                            </p>
                            <p
                              className={cn(
                                "mt-0.5 font-mono text-2xs tabular-nums",
                                dayBudget?.status === "over"
                                  ? "text-ember"
                                  : dayBudget?.status === "near"
                                    ? "text-solar"
                                    : "text-fog-dim",
                              )}
                            >
                              {money.format(dayBudget?.spend ?? 0, { compact: true })}
                            </p>
                          </div>

                          <div className="min-w-0">
                            {dayActivities.length === 0 ? (
                              <p className="rounded-[var(--radius-card)] border border-dashed border-line px-4 py-4 text-sm text-fog-dim">
                                Nothing planned — a free day.
                              </p>
                            ) : (
                              <ul className="space-y-2">
                                {dayActivities.map((activity) => (
                                  <li
                                    key={activity.id}
                                    className="surface flex items-start gap-3.5 p-3.5"
                                  >
                                    <span className="w-12 shrink-0 pt-0.5 font-mono text-xs tabular-nums text-lagoon">
                                      {activity.startMinute === null
                                        ? "—"
                                        : formatMinute(activity.startMinute)}
                                    </span>

                                    <span className="min-w-0 flex-1">
                                      <span className="block text-sm font-medium text-cloud">
                                        {activity.name}
                                      </span>
                                      <span className="mt-1.5 flex flex-wrap items-center gap-2">
                                        <CategoryChip category={activity.category} />
                                        <span className="font-mono text-2xs text-fog">
                                          {formatDuration(activity.durationMin)}
                                        </span>
                                      </span>
                                      {activity.description ? (
                                        <span className="mt-1.5 block text-xs leading-relaxed text-fog">
                                          {activity.description}
                                        </span>
                                      ) : null}
                                    </span>

                                    <span className="shrink-0 pt-0.5 font-mono text-sm font-semibold tabular-nums text-solar">
                                      {activity.cost === 0
                                        ? "Free"
                                        : money.format(activity.cost, { decimals: false })}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </article>
                      );
                    })}
                  </div>

                  {/* Travel leg to the next city. */}
                  {stop.transportCostToNext > 0 ? (
                    <p className="mt-5 flex items-center gap-3 border-t border-line pt-4 font-mono text-2xs text-fog">
                      <span aria-hidden className="size-1.5 rounded-full bg-lagoon" />
                      {stop.transportMode ? `${title(stop.transportMode)} ` : "Travel "}
                      to {trip.stops[stopIndex + 1]?.city.name ?? "home"} ·{" "}
                      <span className="text-solar">
                        {money.format(stop.transportCostToNext, { decimals: false })}
                      </span>
                    </p>
                  ) : null}
                </section>
              );
            })}
          </div>
        )}
      </TabsContent>

      <TabsContent value="calendar">
        <div className="surface p-5">
          <MonthGrid days={days} selectedDate={selectedDate} onSelectDay={setSelectedDate} />
        </div>
      </TabsContent>
    </Tabs>
  );
}

function title(value: string) {
  return value.charAt(0) + value.slice(1).toLowerCase();
}
