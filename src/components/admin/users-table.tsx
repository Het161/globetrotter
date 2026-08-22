"use client";

import * as React from "react";
import { MoreVertical, Search, ShieldCheck, ShieldOff, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { AdminUserRow } from "@/server/services/admin";
import { api, errorMessage } from "@/lib/api-client";
import { useDebounce } from "@/hooks/use-debounce";
import { useRemoteList } from "@/hooks/use-remote-list";
import { DeckButton } from "@/components/ui/deck-button";
import { Input } from "@/components/ui/field";
import { Chip } from "@/components/ui/chip";
import { SkeletonRows } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDate, toISODate } from "@/lib/dates";
import { initials, pluralize } from "@/lib/utils";

const PAGE_SIZE = 20;

export function UsersTable({
  initial,
  currentUserId,
}: {
  initial: { items: AdminUserRow[]; total: number };
  currentUserId: string;
}) {
  const [query, setQuery] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [pendingDelete, setPendingDelete] = React.useState<AdminUserRow | null>(null);
  /** Local edits layered over the fetched page until it revalidates. */
  const [roleEdits, setRoleEdits] = React.useState<Record<string, "USER" | "ADMIN">>({});
  const [removed, setRemoved] = React.useState<string[]>([]);

  const debounced = useDebounce(query, 150);

  const { items, total, loading } = useRemoteList<AdminUserRow>(
    `/admin/users${api.query({ q: debounced, page, pageSize: PAGE_SIZE })}`,
    initial,
  );

  const rows = items
    .filter((row) => !removed.includes(row.id))
    .map((row) => (roleEdits[row.id] ? { ...row, role: roleEdits[row.id] } : row));

  async function setRole(user: AdminUserRow, role: "USER" | "ADMIN") {
    try {
      await api.patch(`/admin/users/${user.id}`, { role }, { toastOnError: false });
      setRoleEdits((current) => ({ ...current, [user.id]: role }));
      toast.success(`${user.name} is now ${role === "ADMIN" ? "an admin" : "a user"}`);
    } catch (error) {
      toast.error(errorMessage(error, "We couldn't change that role."));
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    try {
      await api.delete(`/admin/users/${pendingDelete.id}`, { toastOnError: false });
      setRemoved((current) => [...current, pendingDelete.id]);
      toast.success(`Deleted ${pendingDelete.name}`);
      setPendingDelete(null);
    } catch (error) {
      toast.error(errorMessage(error, "We couldn't delete that account."));
    }
  }

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
            placeholder="Search name or email…"
            aria-label="Search users"
            className="pl-9"
          />
        </div>
        <p className="font-mono text-2xs text-fog-dim">{pluralize(total, "account")}</p>
      </div>

      {loading ? (
        <SkeletonRows count={6} />
      ) : rows.length === 0 ? (
        <p className="py-10 text-center text-sm text-fog">No accounts match that search.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-line text-left">
                <th scope="col" className="placard py-2.5 font-normal">Account</th>
                <th scope="col" className="placard py-2.5 font-normal">Role</th>
                <th scope="col" className="placard py-2.5 text-right font-normal">Trips</th>
                <th scope="col" className="placard py-2.5 font-normal">Last active</th>
                <th scope="col" className="w-10 py-2.5">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>

            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-line/60 last:border-0">
                  <td className="py-3">
                    <div className="flex items-center gap-3">
                      <span className="grid size-8 shrink-0 place-items-center rounded-full border border-line bg-deck text-2xs font-semibold text-cloud">
                        {initials(row.name)}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-cloud">{row.name}</span>
                        <span className="block truncate font-mono text-2xs text-fog">
                          {row.email}
                        </span>
                      </span>
                    </div>
                  </td>

                  <td className="py-3">
                    {row.role === "ADMIN" ? (
                      <Chip className="border-solar/35 bg-solar/10 text-solar">Admin</Chip>
                    ) : (
                      <Chip>User</Chip>
                    )}
                  </td>

                  <td className="py-3 text-right font-mono tabular-nums text-cloud">
                    {row.trips}
                  </td>

                  <td className="py-3 font-mono text-2xs text-fog">
                    {row.lastActive ? formatDate(toISODate(new Date(row.lastActive))) : "—"}
                  </td>

                  <td className="py-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        className="grid size-8 place-items-center rounded-md text-fog transition-colors hover:text-cloud disabled:opacity-30"
                        aria-label={`Actions for ${row.name}`}
                        disabled={row.id === currentUserId}
                      >
                        <MoreVertical className="size-4" />
                      </DropdownMenuTrigger>

                      <DropdownMenuContent align="end">
                        {row.role === "ADMIN" ? (
                          <DropdownMenuItem onSelect={() => setRole(row, "USER")}>
                            <ShieldOff />
                            Demote to user
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onSelect={() => setRole(row, "ADMIN")}>
                            <ShieldCheck />
                            Promote to admin
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem destructive onSelect={() => setPendingDelete(row)}>
                          <Trash2 />
                          Delete account
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 ? (
        <nav className="mt-5 flex items-center justify-center gap-3" aria-label="Users pagination">
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

      <Dialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete {pendingDelete?.name}?</DialogTitle>
            <DialogDescription>
              Their {pluralize(pendingDelete?.trips ?? 0, "trip")} and everything inside them
              will be removed. This can&apos;t be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <DeckButton variant="secondary" onClick={() => setPendingDelete(null)}>
              Cancel
            </DeckButton>
            <DeckButton variant="danger" onClick={confirmDelete}>
              Delete account
            </DeckButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
