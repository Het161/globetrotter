"use client";

import * as React from "react";
import Link from "next/link";
import { ExternalLink, Search } from "lucide-react";
import type { AdminTripRow } from "@/server/services/admin";
import { api } from "@/lib/api-client";
import { useDebounce } from "@/hooks/use-debounce";
import { useRemoteList } from "@/hooks/use-remote-list";
import { DeckButton } from "@/components/ui/deck-button";
import { Input } from "@/components/ui/field";
import { Chip } from "@/components/ui/chip";
import { SkeletonRows } from "@/components/ui/skeleton";
import { formatDateRange } from "@/lib/dates";
import { pluralize } from "@/lib/utils";

const PAGE_SIZE = 20;

export function TripsTable({ initial }: { initial: { items: AdminTripRow[]; total: number } }) {
  const [query, setQuery] = React.useState("");
  const [page, setPage] = React.useState(1);

  const debounced = useDebounce(query, 150);

  const { items: rows, total, loading } = useRemoteList<AdminTripRow>(
    `/admin/trips${api.query({ q: debounced, page, pageSize: PAGE_SIZE })}`,
    initial,
  );

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <div className="mb-4 flex items-center gap-3">
        <div className="relative flex-1 sm:max-w-xs">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fog"
            aria-hidden
          />
          <Input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
            placeholder="Search trip names…"
            aria-label="Search trips"
            className="pl-9"
          />
        </div>
        <p className="font-mono text-2xs text-fog-dim">{pluralize(total, "trip")}</p>
      </div>

      {loading ? (
        <SkeletonRows count={6} />
      ) : rows.length === 0 ? (
        <p className="py-10 text-center text-sm text-fog">No trips match that search.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-line text-left">
                <th scope="col" className="placard py-2.5 font-normal">Trip</th>
                <th scope="col" className="placard py-2.5 font-normal">Owner</th>
                <th scope="col" className="placard py-2.5 font-normal">Dates</th>
                <th scope="col" className="placard py-2.5 text-right font-normal">Stops</th>
                <th scope="col" className="placard py-2.5 font-normal">Visibility</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-line/60 last:border-0">
                  <td className="py-3">
                    <Link
                      href={`/trips/${row.id}`}
                      className="group inline-flex items-center gap-1.5"
                    >
                      <span className="trip-name text-base text-cloud">{row.name}</span>
                      <ExternalLink className="size-3 text-fog opacity-0 transition-opacity group-hover:opacity-100" />
                    </Link>
                  </td>
                  <td className="py-3 text-fog">{row.owner}</td>
                  <td className="py-3 font-mono text-2xs tabular-nums text-fog">
                    {formatDateRange(row.startDate, row.endDate)}
                  </td>
                  <td className="py-3 text-right font-mono tabular-nums text-cloud">
                    {row.stops}
                  </td>
                  <td className="py-3">
                    {row.isPublic ? (
                      <Chip className="border-lagoon/30 text-lagoon">
                        Public · {row.viewCount}
                      </Chip>
                    ) : (
                      <Chip>Private</Chip>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 ? (
        <nav className="mt-5 flex items-center justify-center gap-3" aria-label="Trips pagination">
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
  );
}
