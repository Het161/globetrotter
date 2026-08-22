import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { TripForm } from "@/components/trips/trip-form";

export const metadata: Metadata = { title: "Plan a trip" };

export default function NewTripPage() {
  return (
    <>
      <PageHeader
        eyebrow="New itinerary"
        title="Plan a trip"
        description="Name it and pick the dates. Cities, activities and the budget come next."
      />
      <TripForm />
    </>
  );
}
