import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { PencilRuler } from "lucide-react";
import { requireUser } from "@/server/auth/session";
import { getTripBudget } from "@/server/services/trips";
import { isAppError } from "@/server/http/errors";
import { CrumbLabel } from "@/components/layout/breadcrumbs";
import { PageHeader } from "@/components/layout/page-header";
import { DeckButton } from "@/components/ui/deck-button";
import { BudgetView } from "@/components/budget/budget-view";
import { formatDateRange } from "@/lib/dates";

export const metadata: Metadata = { title: "Budget" };

export default async function BudgetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();

  try {
    // One service call: the trip and its full breakdown, from one query.
    const { trip, ...budget } = await getTripBudget(id, user);
    const canEdit = trip.myRole === "OWNER" || trip.myRole === "EDITOR";

    return (
      <>
        <CrumbLabel value={trip.id} label={trip.name} />

        <PageHeader
          eyebrow="Cost breakdown"
          title={<span className="trip-name">{trip.name}</span>}
          description={`${formatDateRange(trip.startDate, trip.endDate)} · ${trip.stops.length} ${trip.stops.length === 1 ? "stop" : "stops"}`}
          actions={
            canEdit ? (
              <DeckButton asChild variant="secondary">
                <Link href={`/trips/${trip.id}/build`}>
                  <PencilRuler />
                  Open builder
                </Link>
              </DeckButton>
            ) : null
          }
        />

        <BudgetView trip={trip} budget={budget} canEdit={canEdit} />
      </>
    );
  } catch (error) {
    if (isAppError(error) && error.code === "NOT_FOUND") notFound();
    throw error;
  }
}
