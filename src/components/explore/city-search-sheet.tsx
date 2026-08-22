"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Loader2, MapPin, Search } from "lucide-react";
import type { CityDTO } from "@/server/dto";
import { api } from "@/lib/api-client";
import { useDebounce } from "@/hooks/use-debounce";
import { useCurrency } from "@/hooks/use-currency";
import { Dialog, SheetContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/field";
import { FilterChip } from "@/components/ui/chip";
import { Postcard } from "@/components/ui/postcard";
import { PerfPill } from "@/components/ui/perf-pill";
import { Skeleton } from "@/components/ui/skeleton";

const REGIONS = [
  "Europe",
  "Asia",
  "South Asia",
  "Americas",
  "Africa & Middle East",
  "Oceania",
];

/**
 * "Add stop" — search the city catalogue and pick one.
 *
 * Search runs on the server against the trigram indexes, debounced to 150 ms
 * with the previous request aborted, so typing "kyo" doesn't queue up four
 * round trips.
 */
export function CitySearchSheet({
  open,
  onOpenChange,
  onSelect,
  busy,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (city: CityDTO) => void;
  busy?: boolean;
}) {
  const money = useCurrency();
  const [query, setQuery] = React.useState("");
  const [region, setRegion] = React.useState<string | null>(null);
  const [cities, setCities] = React.useState<CityDTO[]>([]);
  const [loading, setLoading] = React.useState(true);

  const debounced = useDebounce(query, 150);

  React.useEffect(() => {
    if (!open) return;

    const controller = new AbortController();
    setLoading(true);

    api
      .list<CityDTO>(
        `/cities${api.query({ q: debounced, region: region ?? "", sort: "popular", pageSize: 24 })}`,
        { signal: controller.signal },
      )
      .then((result) => setCities(result.items))
      .catch(() => {
        /* aborted */
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [debounced, region, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" aria-describedby={undefined} className="w-full sm:max-w-lg">
        <DialogPrimitive.Title className="sr-only">Add a stop</DialogPrimitive.Title>

        <header className="space-y-3 border-b border-line p-5 pr-14">
          <div>
            <p className="placard mb-1.5">Add a stop</p>
            <h2 className="font-display text-xl font-medium text-cloud">Where next?</h2>
          </div>

          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fog"
              aria-hidden
            />
            <Input
              value={query}
              autoFocus
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search 48 cities…"
              aria-label="Search cities"
              className="pl-9"
            />
          </div>

          <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5">
            <FilterChip active={region === null} onClick={() => setRegion(null)}>
              All
            </FilterChip>
            {REGIONS.map((value) => (
              <FilterChip
                key={value}
                active={region === value}
                onClick={() => setRegion(region === value ? null : value)}
              >
                {value}
              </FilterChip>
            ))}
          </div>

          <p className="flex items-center gap-2 font-mono text-2xs text-fog-dim">
            <span>
              {loading ? "searching…" : `${cities.length} ${cities.length === 1 ? "result" : "results"}`}
            </span>
            <PerfPill label="search" />
          </p>
        </header>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }, (_, i) => (
                <Skeleton key={i} className="h-20" />
              ))}
            </div>
          ) : cities.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-center">
              <MapPin className="size-6 text-fog-dim" aria-hidden />
              <p className="text-sm text-fog">
                Nothing matches {query ? `“${query}”` : "those filters"}.
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {cities.map((city) => (
                <li key={city.id}>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onSelect(city)}
                    className="flex w-full items-center gap-3 rounded-[var(--radius-card)] border border-line bg-harbor/50 p-2.5 text-left transition-colors hover:border-lagoon/35 hover:bg-harbor disabled:opacity-60"
                  >
                    <span className="w-20 shrink-0 overflow-hidden rounded-md">
                      <Postcard city={city} size="chip" tilt={false} minimal />
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-cloud">
                        {city.name}
                      </span>
                      <span className="mt-0.5 block truncate font-mono text-2xs text-fog">
                        {city.country} · {money.format(city.avgStayCost, { decimals: false })}/night
                      </span>
                    </span>

                    <span className="shrink-0 pr-1">
                      {busy ? (
                        <Loader2 className="size-4 animate-spin text-fog" aria-hidden />
                      ) : (
                        <span className="chip border-lagoon/25 text-lagoon">Add</span>
                      )}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </SheetContent>
    </Dialog>
  );
}
