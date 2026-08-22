import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/server/auth/session";
import { getTrip } from "@/server/services/trips";
import { orNotFound } from "@/server/http/errors";
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

  const trip = await orNotFound(getTrip(id, user));
  if (!trip) notFound();

  return (
    <>
      {/* Swaps the cuid for the trip's name in the breadcrumb bar. */}
      <CrumbLabel value={trip.id} label={trip.name} />
      <TripBuilder initialTrip={trip} />
    </>
  );
}
