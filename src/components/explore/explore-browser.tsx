"use client";

import * as React from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import type { CityDTO } from "@/server/dto";
import { api } from "@/lib/api-client";
import { useDebounce } from "@/hooks/use-debounce";
import { CityCard } from "./city-card";
import { AddToTripSheet } from "./add-to-trip-sheet";
import { DeckButton } from "@/components/ui/deck-button";
import { Input, NativeSelect } from "@/components/ui/field";
import { FilterChip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonGrid } from "@/components/ui/skeleton";
import { PerfPill } from "@/components/ui/perf-pill";

const PAGE_SIZE = 12;

/**
 * Explore.
 *
 * Every keystroke is debounced to 150 ms and the previous request is aborted,
 * so the trigram indexes serve one query per pause rather than one per letter.
 * The result count and the measured server time sit under the search box —
 * that's the performance budget in §12, shown rather than claimed.
 */
export function ExploreBrowser({
  initial,
  facets,
}: {
  initial: { items: CityDTO[]; total: number };
  facets: { regions: { value: string; count: number }[]; countries: { value: string; count: number }[] };
}) {
  const [query, setQuery] = React.useState("");
  const [region, setRegion] = React.useState<string | null>(null);
  const [country, setCountry] = React.useState("");
  const [cost, setCost] = React.useState("");
  const [sort, setSort] = React.useState("popular");
  const [page, setPage] = React.useState(1);

  const [cities, setCities] = React.useState(initial.items);
  const [total, setTotal] = React.useState(initial.total);
  const [loading, setLoading] = React.useState(false);
  const [addTarget, setAddTarget] = React.useState<CityDTO | null>(null);

  const debounced = useDebounce(query, 150);
  const isFirstRender = React.useRef(true);

  React.useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const controller = new AbortController();
    setLoading(true);

    api
      .list<CityDTO>(
        `/cities${api.query({
          q: debounced,
          region: region ?? "",
          country,
          cost,
          sort,
          page,
          pageSize: PAGE_SIZE,
        })}`,
        { signal: controller.signal },
      )
      .then((result) => {
        setCities(result.items);
        setTotal(result.total);
      })
      .catch(() => {
        /* aborted */
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [debounced, region, country, cost, sort, page]);

  React.useEffect(() => {
    setPage(1);
  }, [debounced, region, country, cost, sort]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const filtered = Boolean(debounced || region || country || cost);

  function clearAll() {
    setQuery("");
    setRegion(null);
    setCountry("");
    setCost("");
  }

  return (
    <>
      {/* --- Search + filters -------------------------------------------- */}
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
              placeholder="Search by city or country…"
              aria-label="Search destinations"
              className="h-11 pl-10 pr-10 text-base"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-md text-fog hover:text-cloud"
              >
                <X className="size-4" />
              </button>
            ) : null}
          </div>

          <div className="flex gap-3">
            <NativeSelect
              value={country}
              onChange={(event) => setCountry(event.target.value)}
              aria-label="Filter by country"
              className="h-11 w-40"
            >
              <option value="">All countries</option>
              {facets.countries.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.value}
                </option>
              ))}
            </NativeSelect>

            <NativeSelect
              value={sort}
              onChange={(event) => setSort(event.target.value)}
              aria-label="Sort destinations"
              className="h-11 w-40"
            >
              <option value="popular">Most popular</option>
              <option value="cost">Cheapest first</option>
              <option value="name">Name</option>
            </NativeSelect>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <FilterChip active={region === null} onClick={() => setRegion(null)}>
            All regions
          </FilterChip>
          {facets.regions.map((option) => (
            <FilterChip
              key={option.value}
              active={region === option.value}
              onClick={() => setRegion(region === option.value ? null : option.value)}
            >
              {option.value}
              <span className="text-fog-dim">{option.count}</span>
            </FilterChip>
          ))}

          <span aria-hidden className="mx-1 h-4 w-px bg-line" />

          {/* Cost bands, in the $ / $$ / $$$ shorthand people already know. */}
          {[
            { value: "low", label: "$" },
            { value: "mid", label: "$$" },
            { value: "high", label: "$$$" },
          ].map((band) => (
            <FilterChip
              key={band.value}
              active={cost === band.value}
              onClick={() => setCost(cost === band.value ? "" : band.value)}
              aria-label={`Cost band ${band.label}`}
            >
              <span className="font-mono">{band.label}</span>
            </FilterChip>
          ))}

          {filtered ? (
            <button
              type="button"
              onClick={clearAll}
              className="ml-1 inline-flex items-center gap-1 text-xs text-fog underline-offset-4 hover:text-cloud hover:underline"
            >
              <SlidersHorizontal className="size-3" aria-hidden />
              Clear
            </button>
          ) : null}
        </div>

        <p className="flex items-center gap-2 font-mono text-2xs text-fog">
          <span>
            {loading ? "searching…" : `${total} ${total === 1 ? "destination" : "destinations"}`}
          </span>
          <PerfPill label="search" />
        </p>
      </div>

      {/* --- Results ------------------------------------------------------ */}
      {loading ? (
        <SkeletonGrid count={8} />
      ) : cities.length === 0 ? (
        <EmptyState
          title="Nothing matches those filters"
          description="Try a different search, a wider region, or a higher cost band."
          action={
            <DeckButton variant="secondary" onClick={clearAll}>
              Clear filters
            </DeckButton>
          }
        />
      ) : (
        <>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {cities.map((city) => (
              <CityCard key={city.id} city={city} onAddToTrip={setAddTarget} />
            ))}
          </div>

          {pages > 1 ? (
            <nav
              className="mt-8 flex items-center justify-center gap-3"
              aria-label="Destinations pagination"
            >
              <DeckButton
                variant="secondary"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </DeckButton>
              <span className="font-mono text-xs tabular-nums text-fog">
                {page} / {pages}
              </span>
              <DeckButton
                variant="secondary"
                size="sm"
                disabled={page >= pages}
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
              >
                Next
              </DeckButton>
            </nav>
          ) : null}
        </>
      )}

      <AddToTripSheet
        city={addTarget}
        open={addTarget !== null}
        onOpenChange={(open) => !open && setAddTarget(null)}
      />
    </>
  );
}
