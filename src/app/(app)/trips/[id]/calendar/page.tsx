import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/server/auth/session";
import { getTripCalendar } from "@/server/services/trips";
import { orNotFound } from "@/server/http/errors";
import { CrumbLabel } from "@/components/layout/breadcrumbs";
import { PageHeader } from "@/components/layout/page-header";
import { CalendarView } from "@/components/calendar/calendar-view";
import { formatDateRange } from "@/lib/dates";
import { pluralize } from "@/lib/utils";

export const metadata: Metadata = { title: "Calendar" };

export default async function CalendarPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();

  const result = await orNotFound(getTripCalendar(id, user));
  if (!result) notFound();

  const { trip, days, budget } = result;
  const canEdit = trip.myRole === "OWNER" || trip.myRole === "EDITOR";

  return (
    <>
      <CrumbLabel value={trip.id} label={trip.name} />

      <PageHeader
        eyebrow="Day by day"
        title={<span className="trip-name">{trip.name}</span>}
        description={`${formatDateRange(trip.startDate, trip.endDate)} · ${pluralize(days.length, "day")}`}
      />

      <CalendarView trip={trip} days={days} budget={budget} canEdit={canEdit} />
    </>
  );
}
