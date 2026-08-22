import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/server/auth/session";
import { getTrip } from "@/server/services/trips";
import { isAppError } from "@/server/http/errors";
import { CrumbLabel } from "@/components/layout/breadcrumbs";
import { TripBuilder } from "@/components/trips/trip-builder";

export const metadata: Metadata = { title: "Builder" };

export default async function BuildTripPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();

  try {
    const trip = await getTrip(id, user);

    return (
      <>
        {/* Swaps the cuid for the trip's name in the breadcrumb bar. */}
        <CrumbLabel value={trip.id} label={trip.name} />
        <TripBuilder initialTrip={trip} />
      </>
    );
  } catch (error) {
    if (isAppError(error) && error.code === "NOT_FOUND") notFound();
    throw error;
  }
}
