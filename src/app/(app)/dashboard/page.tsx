import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Plus } from "lucide-react";
import { requireUser } from "@/server/auth/session";
import { getDashboard } from "@/server/services/dashboard";
import { greeting } from "@/lib/dates";
import { PageHeader, SectionLabel } from "@/components/layout/page-header";
import { DeckButton } from "@/components/ui/deck-button";
import { EmptyState } from "@/components/ui/empty-state";
import { GlobeTile } from "@/components/dashboard/globe-tile";
import { DepartureBoard } from "@/components/dashboard/departure-board";
import { BudgetTile } from "@/components/dashboard/budget-tile";
import { RecommendedStrip } from "@/components/dashboard/recommended-strip";
import { TripCard } from "@/components/trips/trip-card";

export const metadata: Metadata = { title: "Dashboard" };

/**
 * The bento (§11.5). Server component — it calls the service directly rather
 * than fetching its own API, so first paint costs one database round trip and
 * no HTTP hop.
 *
 * Desktop:  globe (6 cols, 2 rows) | departures | budget
 * Mobile:   departures → plan a trip → globe → budget → recent → recommended
 */
export default async function DashboardPage() {
  const user = await requireUser();
  const data = await getDashboard(user.id);

  const firstName = user.name.split(" ")[0];

  return (
    <>
      <PageHeader
        eyebrow="Flight deck"
        title={
          <>
            {greeting()}, <span className="italic">{firstName}</span>.
          </>
        }
        description={
          data.totals.trips === 0
            ? "Nothing planned yet. Start with a city and the rest follows."
            : `${data.totals.trips} ${data.totals.trips === 1 ? "trip" : "trips"} on file, ${data.totals.citiesVisited} cities on the map.`
        }
        actions={
          <DeckButton asChild variant="primary" size="md" className="hidden sm:inline-flex">
            <Link href="/trips/new">
              <Plus />
              Plan a trip
            </Link>
          </DeckButton>
        }
      />

      {/* --- Bento ------------------------------------------------------- */}
      <div className="grid gap-4 lg:grid-cols-12 lg:grid-rows-[auto_auto]">
        {/* Departures first on mobile — it's the most useful thing to see. */}
        <div className="order-1 lg:order-2 lg:col-span-4 lg:row-span-1">
          <DepartureBoard trips={data.upcoming} />
        </div>

        <div className="order-2 sm:hidden">
          <DeckButton asChild variant="primary" size="lg" className="w-full">
            <Link href="/trips/new">
              <Plus />
              Plan a trip
            </Link>
          </DeckButton>
        </div>

        <div className="order-3 h-[320px] lg:order-1 lg:col-span-8 lg:row-span-2 lg:h-auto">
          <GlobeTile
            trip={data.nextTrip}
            route={data.route}
            popularPoints={data.popularPoints}
          />
        </div>

        <div className="order-4 lg:order-3 lg:col-span-4 lg:row-span-1">
          <BudgetTile
            upcomingSpend={data.totals.upcomingSpend}
            overBudgetDays={data.totals.overBudgetDays}
            citiesVisited={data.totals.citiesVisited}
            nextTripId={data.nextTrip?.id ?? null}
          />
        </div>
      </div>

      {/* --- Recent trips ------------------------------------------------ */}
      <section className="mt-10" aria-labelledby="recent-heading">
        <SectionLabel
          action={
            <Link
              href="/trips"
              className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-fog transition-colors hover:text-cloud"
            >
              All trips
              <ArrowUpRight className="size-3" aria-hidden />
            </Link>
          }
        >
          <span id="recent-heading">Recently worked on</span>
        </SectionLabel>

        {data.recent.length === 0 ? (
          <EmptyState
            title="No trips yet"
            description="Give it a name and some dates, then start dropping cities onto the route."
            action={
              <DeckButton asChild variant="primary" magnetic>
                <Link href="/trips/new">
                  <Plus />
                  Plan your first trip
                </Link>
              </DeckButton>
            }
          />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {data.recent.map((trip) => (
              <TripCard key={trip.id} trip={trip} />
            ))}
          </div>
        )}
      </section>

      {/* --- Recommended ------------------------------------------------- */}
      <div className="mt-10">
        <RecommendedStrip cities={data.recommended} />
      </div>
    </>
  );
}
