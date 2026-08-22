"use client";

import type { CalendarDay } from "@/server/services/trips";
import { RouteSpine } from "@/components/ui/route-line";
import { useCurrency } from "@/hooks/use-currency";
import { formatDate, formatMinute, weekday } from "@/lib/dates";
import { cn } from "@/lib/utils";

/**
 * The trip as one continuous scroll, with the route as its spine.
 *
 * Every day gets a row whether or not anything is planned — the gaps are part
 * of the plan, and hiding them would make an empty Tuesday invisible.
 */
export function VerticalTimeline({
  days,
  onSelectDay,
}: {
  days: CalendarDay[];
  onSelectDay?: (date: string) => void;
}) {
  const money = useCurrency();

  return (
    <ol className="space-y-0">
      {days.map((day, index) => {
        // A new city starts here — worth a heavier marker.
        const previous = days[index - 1];
        const arriving = day.stopId !== null && previous?.stopId !== day.stopId;

        return (
          <li key={day.date} className="flex gap-3">
            <RouteSpine
              first={index === 0}
              last={index === days.length - 1}
              active={arriving}
              alert={day.status === "over"}
              nodeOffset={26}
            />

            <div className="min-w-0 flex-1 pb-5">
              <button
                type="button"
                onClick={() => onSelectDay?.(day.date)}
                disabled={!onSelectDay}
                className="flex w-full flex-wrap items-baseline gap-x-3 gap-y-1 text-left disabled:cursor-default"
              >
                <span className="font-mono text-2xs uppercase tracking-[0.12em] text-fog-dim">
                  Day {index + 1}
                </span>

                <span className="font-mono text-sm tabular-nums text-cloud">
                  {weekday(day.date)} {formatDate(day.date)}
                </span>

                {arriving && day.cityName ? (
                  <span className="chip border-lagoon/30 bg-lagoon/10 text-lagoon">
                    Arrive {day.cityName}
                  </span>
                ) : day.cityName ? (
                  <span className="text-sm text-fog">{day.cityName}</span>
                ) : null}

                <span
                  className={cn(
                    "ml-auto font-mono text-sm font-semibold tabular-nums",
                    day.status === "over"
                      ? "text-ember"
                      : day.status === "near"
                        ? "text-solar"
                        : "text-fog",
                  )}
                >
                  {money.format(day.spend, { decimals: false })}
                </span>
              </button>

              {day.status === "over" ? (
                <p className="mt-1.5 text-xs text-ember">Over the daily allowance.</p>
              ) : null}

              {day.activities.length > 0 ? (
                <ul className="mt-2.5 space-y-1.5">
                  {day.activities
                    .slice()
                    .sort((a, b) => (a.startMinute ?? 1440) - (b.startMinute ?? 1440))
                    .map((activity) => (
                      <li
                        key={activity.id}
                        className="flex items-baseline gap-3 rounded-[var(--radius-input)] border border-line bg-harbor/50 px-3 py-2"
                      >
                        <span className="w-11 shrink-0 font-mono text-2xs tabular-nums text-lagoon">
                          {activity.startMinute === null
                            ? "—"
                            : formatMinute(activity.startMinute)}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-sm text-cloud">
                          {activity.name}
                        </span>
                        <span className="shrink-0 font-mono text-2xs tabular-nums text-solar">
                          {activity.cost === 0
                            ? "Free"
                            : money.format(activity.cost, { decimals: false })}
                        </span>
                      </li>
                    ))}
                </ul>
              ) : (
                <p className="mt-2 text-xs text-fog-dim">Nothing planned.</p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
