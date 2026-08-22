"use client";

import * as React from "react";
import { motion } from "motion/react";
import { Clock, GripVertical, MoreVertical, Trash2 } from "lucide-react";
import type { StopActivityDTO } from "@/server/dto";
import { CategoryChip } from "@/components/ui/chip";
import { Input } from "@/components/ui/field";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/menu";
import { useCurrency } from "@/hooks/use-currency";
import { formatDuration, formatMinute, formatDateShort, parseMinute } from "@/lib/dates";
import { cn } from "@/lib/utils";

/**
 * One activity on one day.
 *
 * Time and cost are edited in place — the two fields people actually change
 * once an activity is on the plan. Everything else lives behind the menu so
 * the row stays readable at a glance.
 */
export function ActivityCard({
  activity,
  otherDays,
  dragHandle,
  onUpdate,
  onMove,
  onRemove,
}: {
  activity: StopActivityDTO;
  /** The other days of this stop, for "Move to…". */
  otherDays: string[];
  dragHandle?: React.ReactNode;
  onUpdate: (patch: { startMinute?: number | null; cost?: number }) => void;
  onMove: (date: string) => void;
  onRemove: () => void;
}) {
  const money = useCurrency();
  const [editingTime, setEditingTime] = React.useState(false);
  const [editingCost, setEditingCost] = React.useState(false);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      className="group flex items-start gap-3 rounded-[var(--radius-card)] border border-line bg-harbor/60 p-3 transition-colors hover:border-line-strong"
    >
      {dragHandle ?? <span className="w-1" />}

      {/* Time */}
      <div className="w-14 shrink-0 pt-0.5">
        {editingTime ? (
          <Input
            type="time"
            autoFocus
            defaultValue={
              activity.startMinute === null ? "" : formatMinute(activity.startMinute)
            }
            onBlur={(event) => {
              setEditingTime(false);
              const minute = event.target.value ? parseMinute(event.target.value) : null;
              if (minute !== activity.startMinute) onUpdate({ startMinute: minute });
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.currentTarget.blur();
              if (event.key === "Escape") setEditingTime(false);
            }}
            className="px-1.5 py-1 font-mono text-xs"
          />
        ) : (
          <button
            type="button"
            onClick={() => setEditingTime(true)}
            className="flex items-center gap-1 font-mono text-xs tabular-nums text-lagoon transition-colors hover:text-cloud"
            aria-label={`Start time, currently ${activity.startMinute === null ? "unscheduled" : formatMinute(activity.startMinute)}`}
          >
            {activity.startMinute === null ? (
              <>
                <Clock className="size-3" aria-hidden />
                <span className="text-fog-dim">set</span>
              </>
            ) : (
              formatMinute(activity.startMinute)
            )}
          </button>
        )}
      </div>

      {/* Identity */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-cloud">{activity.name}</p>

        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <CategoryChip category={activity.category} />
          <span className="font-mono text-2xs text-fog">
            {formatDuration(activity.durationMin)}
          </span>
        </div>

        {activity.notes ? (
          <p className="mt-1.5 line-clamp-2 text-xs text-fog">{activity.notes}</p>
        ) : null}
      </div>

      {/* Cost */}
      <div className="shrink-0 pt-0.5 text-right">
        {editingCost ? (
          <Input
            type="number"
            min={0}
            step="1"
            autoFocus
            defaultValue={money.toDisplay(activity.cost)}
            onBlur={(event) => {
              setEditingCost(false);
              const typed = Number(event.target.value);
              if (Number.isFinite(typed) && typed >= 0) {
                onUpdate({ cost: money.toUSD(typed) });
              }
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.currentTarget.blur();
              if (event.key === "Escape") setEditingCost(false);
            }}
            className="w-24 px-2 py-1 font-mono text-xs tabular-nums"
          />
        ) : (
          <button
            type="button"
            onClick={() => setEditingCost(true)}
            className={cn(
              "font-mono text-sm font-semibold tabular-nums transition-colors hover:text-cloud",
              activity.cost === 0 ? "text-fog" : "text-solar",
            )}
            aria-label={`Cost, currently ${money.format(activity.cost)}`}
          >
            {activity.cost === 0 ? "Free" : money.format(activity.cost, { decimals: false })}
          </button>
        )}
      </div>

      {/* Row menu */}
      <DropdownMenu>
        <DropdownMenuTrigger
          className="grid size-7 shrink-0 place-items-center rounded-md text-fog opacity-0 transition-opacity hover:text-cloud focus:opacity-100 group-hover:opacity-100"
          aria-label={`Actions for ${activity.name}`}
        >
          <MoreVertical className="size-4" />
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end">
          {otherDays.length > 0 ? (
            <>
              <DropdownMenuLabel>Move to</DropdownMenuLabel>
              {otherDays.map((day) => (
                <DropdownMenuItem key={day} onSelect={() => onMove(day)}>
                  {formatDateShort(day)}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
            </>
          ) : null}

          <DropdownMenuItem destructive onSelect={onRemove}>
            <Trash2 />
            Remove
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </motion.div>
  );
}

/** The drag affordance, kept separate so read-only views can omit it. */
export function ActivityDragHandle(props: React.ComponentProps<"button">) {
  return (
    <button
      type="button"
      className="mt-0.5 w-4 shrink-0 cursor-grab touch-none text-fog-dim transition-colors hover:text-cloud active:cursor-grabbing"
      {...props}
    >
      <GripVertical className="size-3.5" />
      <span className="sr-only">Reorder</span>
    </button>
  );
}
