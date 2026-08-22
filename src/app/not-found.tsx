import Link from "next/link";
import { DeckButton } from "@/components/ui/deck-button";
import { RouteDoodle } from "@/components/ui/empty-state";

export default function NotFound() {
  return (
    <div className="grid min-h-[70dvh] place-items-center px-5">
      <div className="max-w-md text-center">
        <RouteDoodle className="mx-auto mb-6" />

        <p className="placard mb-3">404</p>
        <h1 className="font-display text-3xl font-medium text-cloud">
          Nothing at this address
        </h1>
        <p className="mt-2.5 text-sm text-fog text-pretty">
          The page may have moved, or the itinerary you followed is no longer shared.
        </p>

        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <DeckButton asChild variant="primary">
            <Link href="/dashboard">Back to the dashboard</Link>
          </DeckButton>
          <DeckButton asChild variant="secondary">
            <Link href="/explore">Explore destinations</Link>
          </DeckButton>
        </div>
      </div>
    </div>
  );
}
