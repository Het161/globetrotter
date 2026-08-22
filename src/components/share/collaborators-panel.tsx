"use client";

import * as React from "react";
import { UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import type { CollaboratorDTO } from "@/server/dto";
import { api, errorMessage, fieldErrors } from "@/lib/api-client";
import { useRemoteList } from "@/hooks/use-remote-list";
import { DeckButton } from "@/components/ui/deck-button";
import { Input, NativeSelect } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { initials } from "@/lib/utils";

/**
 * Invite people to a trip by email.
 *
 * They have to already have an account — inviting a stranger by email would
 * mean sending mail, and this build has no mail provider. The server says so
 * plainly rather than silently doing nothing.
 *
 * VIEWER can read; EDITOR can change the itinerary but still can't delete or
 * unshare the trip. That split is enforced in `assertTripAccess`, not here.
 */
export function CollaboratorsPanel({ tripId }: { tripId: string }) {
  const [email, setEmail] = React.useState("");
  const [role, setRole] = React.useState<"VIEWER" | "EDITOR">("VIEWER");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const { items, loading } = useRemoteList<CollaboratorDTO>(
    `/trips/${tripId}/collaborators`,
  );

  /** Local additions and removals, layered over the fetched list. */
  const [added, setAdded] = React.useState<CollaboratorDTO[]>([]);
  const [removed, setRemoved] = React.useState<string[]>([]);

  const collaborators = [...items, ...added].filter(
    (person, index, all) =>
      !removed.includes(person.userId) &&
      all.findIndex((other) => other.userId === person.userId) === index,
  );

  async function invite(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);

    try {
      const person = await api.post<CollaboratorDTO>(
        `/trips/${tripId}/collaborators`,
        { email: email.trim().toLowerCase(), role },
        { toastOnError: false },
      );

      setAdded((current) => [...current.filter((p) => p.userId !== person.userId), person]);
      setRemoved((current) => current.filter((id) => id !== person.userId));
      setEmail("");
      toast.success(`${person.name} can now see this trip`);
    } catch (caught) {
      setError(fieldErrors(caught)?.email ?? errorMessage(caught, "We couldn't add them."));
    } finally {
      setBusy(false);
    }
  }

  async function remove(person: CollaboratorDTO) {
    setRemoved((current) => [...current, person.userId]);

    try {
      await api.delete(`/trips/${tripId}/collaborators/${person.userId}`, {
        toastOnError: false,
      });
      toast.success(`Removed ${person.name}`);
    } catch (caught) {
      setRemoved((current) => current.filter((id) => id !== person.userId));
      toast.error(errorMessage(caught, "We couldn't remove them."));
    }
  }

  return (
    <section className="mt-5 border-t border-line pt-5">
      <h3 className="placard mb-3">Share with people</h3>

      {loading ? (
        <Skeleton className="mb-3 h-12" />
      ) : collaborators.length > 0 ? (
        <ul className="mb-3 space-y-1">
          {collaborators.map((person) => (
            <li
              key={person.userId}
              className="group flex items-center gap-3 rounded-[var(--radius-input)] px-2 py-2 transition-colors hover:bg-deck/60"
            >
              <span className="grid size-8 shrink-0 place-items-center rounded-full border border-line bg-deck text-2xs font-semibold text-cloud">
                {initials(person.name)}
              </span>

              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm text-cloud">{person.name}</span>
                <span className="block truncate font-mono text-2xs text-fog">
                  {person.email}
                </span>
              </span>

              <span className="chip shrink-0 border-cloud/12 text-fog">
                {person.role === "EDITOR" ? "Can edit" : "Can view"}
              </span>

              <button
                type="button"
                onClick={() => remove(person)}
                aria-label={`Remove ${person.name}`}
                className="grid size-7 shrink-0 place-items-center rounded-md text-fog opacity-0 transition-opacity hover:text-ember focus:opacity-100 group-hover:opacity-100"
              >
                <X className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mb-3 text-xs text-fog">
          Nobody else yet. They&apos;ll find the trip under &ldquo;Shared with me&rdquo;.
        </p>
      )}

      <form onSubmit={invite} className="flex flex-col gap-2 sm:flex-row">
        <Input
          type="email"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            setError(null);
          }}
          placeholder="their@email.com"
          aria-label="Collaborator email"
          invalid={Boolean(error)}
          className="flex-1"
        />

        <NativeSelect
          value={role}
          onChange={(event) => setRole(event.target.value as "VIEWER" | "EDITOR")}
          aria-label="Access level"
          className="sm:w-32"
        >
          <option value="VIEWER">Can view</option>
          <option value="EDITOR">Can edit</option>
        </NativeSelect>

        <DeckButton type="submit" variant="secondary" loading={busy} disabled={!email.trim()}>
          <UserPlus />
          Invite
        </DeckButton>
      </form>

      {error ? (
        <p role="alert" className="mt-1.5 text-xs text-ember">
          {error}
        </p>
      ) : null}
    </section>
  );
}
