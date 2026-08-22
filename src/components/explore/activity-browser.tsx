"use client";

import * as React from "react";
import { Clock, Plus, Search } from "lucide-react";
import type { ActivityCategory } from "@prisma/client";
import type { ActivityDTO, CityDTO } from "@/server/dto";
import { api } from "@/lib/api-client";
import { useDebounce } from "@/hooks/use-debounce";
import { useCurrency } from "@/hooks/use-currency";
import { AddToTripSheet } from "./add-to-trip-sheet";
import { DeckButton } from "@/components/ui/deck-button";
import { Input, NativeSelect } from "@/components/ui/field";
import { ACTIVITY_CATEGORIES, CategoryChip, FilterChip, categoryLabel } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { PerfPill } from "@/components/ui/perf-pill";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDuration } from "@/lib/dates";

/**
 * Things to do in one city, with the two filters that actually matter when
 * you're planning against a budget: how much, and how long.
 *
 * The sliders are range inputs rather than a fancy dual-thumb widget — they
 * are keyboard-operable for free, and "under this much" is the question people
 * are really asking.
 */
export function ActivityBrowser({
  city,
  initial,
  facets,
}: {
  city: CityDTO;
  initial: ActivityDTO[];
  facets: { maxCost: number; maxDuration: number; categories: { value: string; count: number }[] };
}) {
  const money = useCurrency();

  const [query, setQuery] = React.useState("");
  const [category, setCategory] = React.useState<ActivityCategory | null>(null);
  const [maxCost, setMaxCost] = React.useState(facets.maxCost);
  const [maxDuration, setMaxDuration] = React.useState(facets.maxDuration);
  const [sort, setSort] = React.useState("popular");

  const [activities, setActivities] = React.useState(initial);
  const [loading, setLoading] = React.useState(false);
  const [preview, setPreview] = React.useState<ActivityDTO | null>(null);
  const [addOpen, setAddOpen] = React.useState(false);

  const debounced = useDebounce(query, 150);
  const debouncedCost = useDebounce(maxCost, 200);
  const debouncedDuration = useDebounce(maxDuration, 200);
  const isFirstRender = React.useRef(true);

  React.useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const controller = new AbortController();
    setLoading(true);

    api
      .list<ActivityDTO>(
        `/cities/${city.slug}/activities${api.query({
          q: debounced,
          category: category ?? "",
          // Only send the caps when they're actually restricting something.
          maxCost: debouncedCost < facets.maxCost ? debouncedCost : "",
          maxDuration: debouncedDuration < facets.maxDuration ? debouncedDuration : "",
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
  }, [
    city.slug,
    debounced,
    category,
    debouncedCost,
    debouncedDuration,
    sort,
    facets.maxCost,
    facets.maxDuration,
  ]);

  return (
    <>
      <div className="mb-6 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-fog"
              aria-hidden
            />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={`Search things to do in ${city.name}…`}
              aria-label="Search activities"
              className="h-11 pl-10"
            />
          </div>

          <NativeSelect
            value={sort}
            onChange={(event) => setSort(event.target.value)}
            aria-label="Sort activities"
            className="h-11 sm:w-44"
          >
            <option value="popular">Most popular</option>
            <option value="cost">Cheapest first</option>
            <option value="duration">Shortest first</option>
            <option value="name">Name</option>
          </NativeSelect>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <FilterChip active={category === null} onClick={() => setCategory(null)}>
            All
          </FilterChip>
          {ACTIVITY_CATEGORIES.filter((value) =>
            facets.categories.some((c) => c.value === value),
          ).map((value) => (
            <FilterChip
              key={value}
              active={category === value}
              onClick={() => setCategory(category === value ? null : value)}
            >
              {categoryLabel(value)}
            </FilterChip>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 flex items-baseline justify-between">
              <span className="placard">Max cost</span>
              <span className="font-mono text-2xs tabular-nums text-fog">
                {maxCost >= facets.maxCost
                  ? "any"
                  : money.format(maxCost, { decimals: false })}
              </span>
            </span>
            <input
              type="range"
              min={0}
              max={facets.maxCost}
              step={5}
              value={maxCost}
              onChange={(event) => setMaxCost(Number(event.target.value))}
              className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-deck accent-[var(--color-solar)]"
              aria-label="Maximum cost"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 flex items-baseline justify-between">
              <span className="placard">Max duration</span>
              <span className="font-mono text-2xs tabular-nums text-fog">
                {maxDuration >= facets.maxDuration ? "any" : formatDuration(maxDuration)}
              </span>
            </span>
            <input
              type="range"
              min={15}
              max={facets.maxDuration}
              step={15}
              value={maxDuration}
              onChange={(event) => setMaxDuration(Number(event.target.value))}
              className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-deck accent-[var(--color-lagoon)]"
              aria-label="Maximum duration"
            />
          </label>
        </div>

        <p className="flex items-center gap-2 font-mono text-2xs text-fog">
          <span>
            {loading
              ? "searching…"
              : `${activities.length} ${activities.length === 1 ? "activity" : "activities"}`}
          </span>
          <PerfPill label="search" />
        </p>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      ) : activities.length === 0 ? (
        <EmptyState
          title="Nothing matches those filters"
          description="Widen the cost or duration, or clear the category."
          action={
            <DeckButton
              variant="secondary"
              onClick={() => {
                setQuery("");
                setCategory(null);
                setMaxCost(facets.maxCost);
                setMaxDuration(facets.maxDuration);
              }}
            >
              Clear filters
            </DeckButton>
          }
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {activities.map((activity) => (
            <li key={activity.id}>
              <button
                type="button"
                onClick={() => setPreview(activity)}
                className="surface lift-on-hover flex h-full w-full flex-col p-4 text-left"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="text-sm font-semibold text-cloud">{activity.name}</h3>
                  <span className="shrink-0 font-mono text-sm font-semibold tabular-nums text-solar">
                    {activity.estimatedCost === 0
                      ? "Free"
                      : money.format(activity.estimatedCost, { decimals: false })}
                  </span>
                </div>

                <p className="mt-2 line-clamp-3 flex-1 text-xs leading-relaxed text-fog">
                  {activity.description}
                </p>

                <div className="mt-3 flex items-center gap-2">
                  <CategoryChip category={activity.category} />
                  <span className="flex items-center gap-1 font-mono text-2xs text-fog-dim">
                    <Clock className="size-3" aria-hidden />
                    {formatDuration(activity.durationMin)}
                  </span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Quick view */}
      <Dialog open={preview !== null} onOpenChange={(open) => !open && setPreview(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{preview?.name}</DialogTitle>
            <DialogDescription>
              {city.name}, {city.country}
            </DialogDescription>
          </DialogHeader>

          <p className="text-sm leading-relaxed text-fog">{preview?.description}</p>

          <dl className="mt-5 grid grid-cols-3 gap-3 border-y border-line py-4">
            <div>
              <dt className="placard mb-1">Cost</dt>
              <dd className="font-mono text-sm font-semibold tabular-nums text-solar">
                {preview?.estimatedCost === 0
                  ? "Free"
                  : money.format(preview?.estimatedCost ?? 0, { decimals: false })}
              </dd>
            </div>
            <div>
              <dt className="placard mb-1">Duration</dt>
              <dd className="font-mono text-sm tabular-nums text-cloud">
                {formatDuration(preview?.durationMin ?? 0)}
              </dd>
            </div>
            <div>
              <dt className="placard mb-1">Category</dt>
              <dd>
                <CategoryChip category={preview?.category ?? null} />
              </dd>
            </div>
          </dl>

          <DeckButton
            variant="primary"
            className="mt-5 w-full"
            onClick={() => {
              setPreview(null);
              setAddOpen(true);
            }}
          >
            <Plus />
            Add {city.name} to a trip
          </DeckButton>

          <p className="mt-2.5 text-center text-2xs text-fog-dim">
            Add the city first, then pick this activity in the builder.
          </p>
        </DialogContent>
      </Dialog>

      <AddToTripSheet city={city} open={addOpen} onOpenChange={setAddOpen} />
    </>
  );
}
