import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { PencilRuler, Wallet } from "lucide-react";
import { requireUser } from "@/server/auth/session";
import { getTripCalendar } from "@/server/services/trips";
import { orNotFound } from "@/server/http/errors";
import { qrSvg } from "@/server/qr";
import { CrumbLabel } from "@/components/layout/breadcrumbs";
import { PageHeader } from "@/components/layout/page-header";
import { DeckButton } from "@/components/ui/deck-button";
import { StatusChip } from "@/components/ui/chip";
import { ItineraryView } from "@/components/trips/itinerary-view";
import { SharePanel } from "@/components/share/share-panel";
import { formatDateRange } from "@/lib/dates";
import { pluralize } from "@/lib/utils";

export const metadata: Metadata = { title: "Itinerary" };

export default async function TripPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();

  const result = await orNotFound(getTripCalendar(id, user));
  if (!result) notFound();

  // The calendar service already returns the trip, its days and its budget —
  // one call covers both tabs on this screen.
  const { trip, days, budget } = result;
  const canEdit = trip.myRole === "OWNER" || trip.myRole === "EDITOR";

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const qr = trip.shareSlug ? await qrSvg(`${appUrl}/s/${trip.shareSlug}`) : null;

  return (
    <>
      <CrumbLabel value={trip.id} label={trip.name} />

      <PageHeader
        eyebrow="Itinerary"
        title={<span className="trip-name">{trip.name}</span>}
        description={
          <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <StatusChip status={trip.status} />
            <span className="font-mono text-xs">
              {formatDateRange(trip.startDate, trip.endDate)} ·{" "}
              {pluralize(trip.stops.length, "stop")} ·{" "}
              {pluralize(trip.summary?.nights ?? 0, "night")}
            </span>
          </span>
        }
        actions={
          <>
            {canEdit ? (
              <DeckButton asChild variant="secondary">
                <Link href={`/trips/${trip.id}/build`}>
                  <PencilRuler />
                  <span className="hidden sm:inline">Builder</span>
                </Link>
              </DeckButton>
            ) : null}

            <DeckButton asChild variant="secondary">
              <Link href={`/trips/${trip.id}/budget`}>
                <Wallet />
                <span className="hidden sm:inline">Budget</span>
              </Link>
            </DeckButton>

            {trip.myRole === "OWNER" ? (
              <SharePanel trip={trip} qrSvg={qr} appUrl={appUrl} />
            ) : null}
          </>
        }
      />

      {trip.description ? (
        <p className="mb-7 max-w-2xl text-sm leading-relaxed text-fog text-pretty">
          {trip.description}
        </p>
      ) : null}

      <ItineraryView trip={trip} budget={budget} days={days} />
    </>
  );
}
