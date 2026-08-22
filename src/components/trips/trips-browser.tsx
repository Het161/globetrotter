"use client";

import * as React from "react";
import Link from "next/link";
import { Plus, Search, X } from "lucide-react";
import { toast } from "sonner";
import type { TripDTO } from "@/server/dto";
import { api } from "@/lib/api-client";
import { useDebounce } from "@/hooks/use-debounce";
import { useRemoteList } from "@/hooks/use-remote-list";
import { TripCard } from "./trip-card";
import { DeckButton } from "@/components/ui/deck-button";
import { Input, NativeSelect } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonGrid } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const PAGE_SIZE = 12;

/**
 * My Trips.
 *
 * Server-rendered for the first page, then the client takes over whenever a
 * filter changes. Every query goes through the same `/trips` endpoint the
 * ⌘K palette uses, so search behaves identically in both places.
 */
export function TripsBrowser({ initial }: { initial: { items: TripDTO[]; total: number } }) {
  const [tab, setTab] = React.useState<"mine" | "shared">("mine");
  const [query, setQuery] = React.useState("");
  const [status, setStatus] = React.useState("");
  const [sort, setSort] = React.useState("updated");
  const [page, setPage] = React.useState(1);

  const [pendingDelete, setPendingDelete] = React.useState<TripDTO | null>(null);
  const [deleting, setDeleting] = React.useState(false);
  /** Ids removed locally, so a deleted card disappears before the refetch. */
  const [removed, setRemoved] = React.useState<string[]>([]);

  const debouncedQuery = useDebounce(query, 150);

  const {
    items,
    total,
    loading,
  } = useRemoteList<TripDTO>(
    `/trips${api.query({ tab, q: debouncedQuery, status, sort, page, pageSize: PAGE_SIZE })}`,
    initial,
  );

  const trips = items.filter((trip) => !removed.includes(trip.id));

  /** Every filter control resets to page one — done here, not in an effect. */
  function applyFilter(change: () => void) {
    change();
    setPage(1);
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);

    try {
      await api.delete(`/trips/${pendingDelete.id}`);
      setRemoved((current) => [...current, pendingDelete.id]);
      toast.success(`Deleted “${pendingDelete.name}”`);
      setPendingDelete(null);
    } finally {
      setDeleting(false);
    }
  }

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const filtered = Boolean(debouncedQuery || status);

  return (
    <>
      {/* --- Controls -------------------------------------------------- */}
      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center">
        <Tabs value={tab} onValueChange={(value) => applyFilter(() => setTab(value as "mine" | "shared"))}>
          <TabsList>
            <TabsTrigger value="mine">My trips</TabsTrigger>
            <TabsTrigger value="shared">Shared with me</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative flex-1 lg:max-w-xs">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fog"
            aria-hidden
          />
          <Input
            value={query}
            onChange={(event) => applyFilter(() => setQuery(event.target.value))}
            placeholder="Search trips…"
            aria-label="Search trips by name"
            className="pl-9 pr-9"
          />
          {query ? (
            <button
              type="button"
              onClick={() => applyFilter(() => setQuery(""))}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-md text-fog hover:text-cloud"
            >
              <X className="size-3.5" />
            </button>
          ) : null}
        </div>

        <div className="flex gap-3 lg:ml-auto">
          <NativeSelect
            value={status}
            onChange={(event) => applyFilter(() => setStatus(event.target.value))}
            aria-label="Filter by status"
            className="w-40"
          >
            <option value="">All statuses</option>
            <option value="PLANNING">Planning</option>
            <option value="UPCOMING">Upcoming</option>
            <option value="ONGOING">Ongoing</option>
            <option value="COMPLETED">Completed</option>
          </NativeSelect>

          <NativeSelect
            value={sort}
            onChange={(event) => applyFilter(() => setSort(event.target.value))}
            aria-label="Sort trips"
            className="w-44"
          >
            <option value="updated">Recently updated</option>
            <option value="start">Departure date</option>
            <option value="cost">Total cost</option>
            <option value="name">Name</option>
          </NativeSelect>
        </div>
      </div>

      {/* --- Results ---------------------------------------------------- */}
      {loading ? (
        <SkeletonGrid count={8} />
      ) : trips.length === 0 ? (
        <EmptyState
          title={
            tab === "shared"
              ? "Nothing shared with you yet"
              : filtered
                ? "No trips match those filters"
                : "No trips yet"
          }
          description={
            tab === "shared"
              ? "When someone adds you as a collaborator, their trip shows up here."
              : filtered
                ? "Try a different search, or clear the filters."
                : "Give it a name and some dates, then start dropping cities onto the route."
          }
          action={
            tab === "shared" ? null : filtered ? (
              <DeckButton
                variant="secondary"
                onClick={() =>
                  applyFilter(() => {
                    setQuery("");
                    setStatus("");
                  })
                }
              >
                Clear filters
              </DeckButton>
            ) : (
              <DeckButton asChild variant="primary" magnetic>
                <Link href="/trips/new">
                  <Plus />
                  Plan your first trip
                </Link>
              </DeckButton>
            )
          }
        />
      ) : (
        <>
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {trips.map((trip) => (
              <TripCard
                key={trip.id}
                trip={trip}
                onDelete={tab === "mine" ? setPendingDelete : undefined}
              />
            ))}
          </div>

          {pages > 1 ? (
            <nav
              className="mt-8 flex items-center justify-center gap-3"
              aria-label="Trips pagination"
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

      {/* --- Delete confirmation ---------------------------------------- */}
      <Dialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete this trip?</DialogTitle>
            <DialogDescription>
              “{pendingDelete?.name}” and all its stops, activities and expenses will be
              removed. This can&apos;t be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <DeckButton variant="secondary" onClick={() => setPendingDelete(null)}>
              Keep it
            </DeckButton>
            <DeckButton variant="danger" loading={deleting} onClick={confirmDelete}>
              Delete trip
            </DeckButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
