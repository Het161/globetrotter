"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Loader2, Plus, Search, Sparkles } from "lucide-react";
import type { ActivityCategory } from "@prisma/client";
import type { ActivityDTO } from "@/server/dto";
import { api } from "@/lib/api-client";
import { useDebounce } from "@/hooks/use-debounce";
import { useCurrency } from "@/hooks/use-currency";
import { Dialog, SheetContent } from "@/components/ui/dialog";
import { DeckButton } from "@/components/ui/deck-button";
import { Input, NativeSelect } from "@/components/ui/field";
import { ACTIVITY_CATEGORIES, CategoryChip, FilterChip, categoryLabel } from "@/components/ui/chip";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateShort, formatDuration, weekday } from "@/lib/dates";

export type NewActivityPayload = {
  activityId?: string;
  customName?: string;
  date: string;
  durationMin?: number;
  cost?: number;
};

/**
 * "Add activity" — the city's catalogue, filtered, plus an escape hatch for
 * anything we don't have.
 *
 * The custom form matters: a planner that can only add things from its own
 * list is a catalogue, not a planner. Custom activities are stored with a null
 * `activityId` so they never pollute the shared catalogue.
 */
export function ActivitySearchSheet({
  open,
  onOpenChange,
  citySlug,
  cityName,
  days,
  defaultDate,
  onAdd,
  busy,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  citySlug: string | null;
  cityName: string | null;
  days: string[];
  defaultDate: string | null;
  onAdd: (payload: NewActivityPayload) => void;
  busy?: boolean;
}) {
  const money = useCurrency();
  const [query, setQuery] = React.useState("");
  const [category, setCategory] = React.useState<ActivityCategory | null>(null);
  const [sort, setSort] = React.useState("popular");
  const [date, setDate] = React.useState(defaultDate ?? days[0] ?? "");
  const [activities, setActivities] = React.useState<ActivityDTO[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [showCustom, setShowCustom] = React.useState(false);

  const debounced = useDebounce(query, 150);

  React.useEffect(() => {
    if (open) setDate(defaultDate ?? days[0] ?? "");
  }, [open, defaultDate, days]);

  React.useEffect(() => {
    if (!open || !citySlug) return;

    const controller = new AbortController();
    setLoading(true);

    api
      .list<ActivityDTO>(
        `/cities/${citySlug}/activities${api.query({
          q: debounced,
          category: category ?? "",
          sort,
          pageSize: 30,
        })}`,
        { signal: controller.signal },
      )
      .then((result) => setActivities(result.items))
      .catch(() => {
        /* aborted */
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [open, citySlug, debounced, category, sort]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" aria-describedby={undefined} className="w-full sm:max-w-lg">
        <DialogPrimitive.Title className="sr-only">
          Add an activity in {cityName ?? "this city"}
        </DialogPrimitive.Title>

        <header className="space-y-3 border-b border-line p-5 pr-14">
          <div>
            <p className="placard mb-1.5">Add activity</p>
            <h2 className="font-display text-xl font-medium text-cloud">
              Things to do in {cityName ?? "this city"}
            </h2>
          </div>

          {/* Which day it lands on — decided up front, not after the fact. */}
          <label className="block">
            <span className="placard mb-1 block">Add to day</span>
            <NativeSelect value={date} onChange={(event) => setDate(event.target.value)}>
              {days.map((day, index) => (
                <option key={day} value={day}>
                  Day {index + 1} · {weekday(day)} {formatDateShort(day)}
                </option>
              ))}
            </NativeSelect>
          </label>

          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fog"
              aria-hidden
            />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search activities…"
              aria-label="Search activities"
              className="pl-9"
            />
          </div>

          <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5">
            <FilterChip active={category === null} onClick={() => setCategory(null)}>
              All
            </FilterChip>
            {ACTIVITY_CATEGORIES.map((value) => (
              <FilterChip
                key={value}
                active={category === value}
                onClick={() => setCategory(category === value ? null : value)}
              >
                {categoryLabel(value)}
              </FilterChip>
            ))}
          </div>

          <NativeSelect
            value={sort}
            onChange={(event) => setSort(event.target.value)}
            aria-label="Sort activities"
            className="text-xs"
          >
            <option value="popular">Most popular</option>
            <option value="cost">Cheapest first</option>
            <option value="duration">Shortest first</option>
            <option value="name">Name</option>
          </NativeSelect>
        </header>

        <div className="flex-1 overflow-y-auto p-4">
          {showCustom ? (
            <CustomActivityForm
              busy={busy}
              onCancel={() => setShowCustom(false)}
              onSubmit={(payload) => onAdd({ ...payload, date })}
            />
          ) : loading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }, (_, i) => (
                <Skeleton key={i} className="h-[72px]" />
              ))}
            </div>
          ) : activities.length === 0 ? (
            <div className="py-14 text-center">
              <p className="text-sm text-fog">
                Nothing matches {query ? `“${query}”` : "those filters"}.
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {activities.map((activity) => (
                <li key={activity.id}>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onAdd({ activityId: activity.id, date })}
                    className="w-full rounded-[var(--radius-card)] border border-line bg-harbor/50 p-3 text-left transition-colors hover:border-lagoon/35 hover:bg-harbor disabled:opacity-60"
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="truncate text-sm font-semibold text-cloud">
                        {activity.name}
                      </span>
                      <span className="shrink-0 font-mono text-sm font-semibold tabular-nums text-solar">
                        {activity.estimatedCost === 0
                          ? "Free"
                          : money.format(activity.estimatedCost, { decimals: false })}
                      </span>
                    </div>

                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-fog">
                      {activity.description}
                    </p>

                    <div className="mt-2 flex items-center gap-2">
                      <CategoryChip category={activity.category} />
                      <span className="font-mono text-2xs text-fog-dim">
                        {formatDuration(activity.durationMin)}
                      </span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {!showCustom ? (
          <footer className="border-t border-line p-4">
            <DeckButton
              variant="secondary"
              size="sm"
              className="w-full"
              onClick={() => setShowCustom(true)}
            >
              <Sparkles />
              Add something of your own
            </DeckButton>
          </footer>
        ) : null}
      </SheetContent>
    </Dialog>
  );
}

/* -------------------------------------------------------------------------- */

function CustomActivityForm({
  onSubmit,
  onCancel,
  busy,
}: {
  onSubmit: (payload: Omit<NewActivityPayload, "date">) => void;
  onCancel: () => void;
  busy?: boolean;
}) {
  const money = useCurrency();
  const [name, setName] = React.useState("");
  const [cost, setCost] = React.useState("0");
  const [duration, setDuration] = React.useState("60");
  const [error, setError] = React.useState<string | null>(null);

  function submit(event: React.FormEvent) {
    event.preventDefault();

    if (name.trim().length < 2) {
      setError("Give the activity a name.");
      return;
    }

    onSubmit({
      customName: name.trim(),
      cost: money.toUSD(Math.max(0, Number(cost) || 0)),
      durationMin: Math.min(1440, Math.max(15, Number(duration) || 60)),
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-[var(--radius-card)] border border-dashed border-line-strong p-4">
      <p className="placard">Your own activity</p>

      <label className="block">
        <span className="placard mb-1 block">Name</span>
        <Input
          value={name}
          autoFocus
          maxLength={80}
          onChange={(event) => {
            setName(event.target.value);
            setError(null);
          }}
          placeholder="Dinner with Kenji"
          invalid={Boolean(error)}
        />
        {error ? <span className="mt-1 block text-xs text-ember">{error}</span> : null}
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="placard mb-1 block">Cost ({money.currency})</span>
          <Input
            type="number"
            min={0}
            step="1"
            value={cost}
            onChange={(event) => setCost(event.target.value)}
            className="font-mono tabular-nums"
          />
        </label>

        <label className="block">
          <span className="placard mb-1 block">Minutes</span>
          <Input
            type="number"
            min={15}
            max={1440}
            step="15"
            value={duration}
            onChange={(event) => setDuration(event.target.value)}
            className="font-mono tabular-nums"
          />
        </label>
      </div>

      <div className="flex gap-2">
        <DeckButton type="button" variant="secondary" size="sm" className="flex-1" onClick={onCancel}>
          Back to the list
        </DeckButton>
        <DeckButton type="submit" variant="primary" size="sm" className="flex-1" disabled={busy}>
          {busy ? <Loader2 className="animate-spin" /> : <Plus />}
          Add it
        </DeckButton>
      </div>
    </form>
  );
}
