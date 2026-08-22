import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { requireUser } from "@/server/auth/session";
import { listTrips } from "@/server/services/trips";
import { PageHeader } from "@/components/layout/page-header";
import { DeckButton } from "@/components/ui/deck-button";
import { TripsBrowser } from "@/components/trips/trips-browser";

export const metadata: Metadata = { title: "My trips" };

export default async function TripsPage() {
  const user = await requireUser();

  // First page comes from the service directly; the client takes over from
  // there whenever a filter changes.
  const initial = await listTrips(
    { tab: "mine", sort: "updated", page: 1, pageSize: 12 },
    user,
  );

  return (
    <>
      <PageHeader
        eyebrow="Itineraries"
        title="My trips"
        description="Everything you've planned, and everything shared with you."
        actions={
          <DeckButton asChild variant="primary">
            <Link href="/trips/new">
              <Plus />
              Plan a trip
            </Link>
          </DeckButton>
        }
      />

      <TripsBrowser initial={{ items: initial.items, total: initial.total }} />
    </>
  );
}
