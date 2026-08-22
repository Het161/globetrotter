import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicTrip } from "@/server/services/share";
import { getSession } from "@/server/auth/session";
import { qrSvg } from "@/server/qr";
import { orNotFound } from "@/server/http/errors";
import { formatMoney } from "@/lib/currency";
import { routePoints, stopDays } from "@/lib/trip-view";
import { formatDate, formatDateRange, formatDuration, formatMinute, weekday } from "@/lib/dates";
import { Backdrop } from "@/components/ui/backdrop";
import { Postcard } from "@/components/ui/postcard";
import { RouteLine } from "@/components/ui/route-line";
import { CategoryChip } from "@/components/ui/chip";
import { Logo } from "@/components/layout/logo";
import { ShareHero } from "@/components/share/share-hero";
import { CopyTripButton } from "@/components/share/copy-trip-button";
import { PublicShareBar } from "@/components/share/public-share-bar";
import { pluralize } from "@/lib/utils";

/**
 * The public itinerary — no auth, no app shell.
 *
 * Read-only by construction: it renders from `getPublicTrip`, which 404s
 * unless the trip is currently public, and there is no mutation on the page
 * except "copy this into my own account".
 */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  const data = await orNotFound(getPublicTrip(slug));
  if (!data) return { title: "Itinerary not found" };

  const cities = data.trip.stops.map((stop) => stop.city.name).join(" → ");

  return {
    title: data.trip.name,
    description: `${cities || "A trip"} · ${formatDateRange(data.trip.startDate, data.trip.endDate)} · planned by ${data.ownerName} on GlobeTrotter.`,
  };
}

export default async function PublicTripPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const viewer = await getSession();

  const data = await orNotFound(getPublicTrip(slug));
  if (!data) notFound();

  const { trip, budget, ownerName, viewCount } = data;

  // The public page shows the owner's own numbers — converting into whatever
  // currency a stranger happens to prefer would misrepresent their plan.
  const currency = "USD";
  const money = (amount: number) => formatMoney(amount, currency, { decimals: false });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const qr = await qrSvg(`${appUrl}/s/${slug}`);
  const byStop = new Map(budget.byStop.map((stop) => [stop.stopId, stop]));

  return (
    <div className="relative min-h-dvh pb-28">
      <Backdrop variant="rich" />

      {/* Minimal chrome — this page belongs to the trip, not to the app. */}
      <div className="relative mx-auto flex max-w-[720px] items-center justify-between px-5 pt-6">
        <Link href="/" aria-label="GlobeTrotter home">
          <Logo />
        </Link>
        <span className="chip border-lagoon/25 text-lagoon">Read only</span>
      </div>

      <ShareHero
        tripName={trip.name}
        cities={trip.stops.map((stop) => stop.city.name)}
        route={routePoints(trip)}
        startDate={trip.startDate}
        endDate={trip.endDate}
        nights={trip.summary?.nights ?? 0}
        total={money(budget.total)}
        ownerName={ownerName}
        viewCount={viewCount}
      />

      <main className="relative mx-auto max-w-[720px] px-5">
        {trip.description ? (
          <p className="mb-16 text-lg leading-relaxed text-fog text-pretty">
            {trip.description}
          </p>
        ) : null}

        {trip.stops.map((stop, stopIndex) => {
          const stopBudget = byStop.get(stop.id);

          return (
            <section key={stop.id} className="mb-24" aria-labelledby={`stop-${stop.id}`}>
              {/* City plate */}
              <div className="surface mb-10 overflow-hidden">
                <div className="tear-line">
                  <Postcard city={stop.city} size="banner" tilt={false} />
                </div>

                <div className="flex flex-wrap items-baseline justify-between gap-3 p-5">
                  <div>
                    <p className="placard mb-1.5">Stop {stopIndex + 1}</p>
                    <h2
                      id={`stop-${stop.id}`}
                      className="font-display text-2xl font-medium text-cloud"
                    >
                      {stop.city.name}
                    </h2>
                    <p className="mt-1 font-mono text-2xs text-fog">
                      {formatDateRange(stop.arrivalDate, stop.departureDate)} ·{" "}
                      {pluralize(stop.nights, "night")}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="placard mb-1">Subtotal</p>
                    <p className="font-mono text-lg font-semibold tabular-nums text-solar">
                      {money(stopBudget?.total ?? 0)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Days, with the numeral hanging in the margin on desktop. */}
              {stopDays(stop).map((day, dayIndex) => {
                const dayActivities = stop.activities
                  .filter((activity) => activity.date === day)
                  .sort((a, b) => (a.startMinute ?? 1440) - (b.startMinute ?? 1440));

                return (
                  <article key={day} className="relative mb-10 sm:pl-24">
                    <div className="mb-3 sm:absolute sm:-left-0 sm:top-0 sm:mb-0 sm:w-20 sm:text-right">
                      <p className="font-display text-5xl font-light leading-none text-cloud/20 sm:text-6xl">
                        {String(dayIndex + 1).padStart(2, "0")}
                      </p>
                      <p className="mt-1 font-mono text-2xs text-fog">
                        {weekday(day)} {formatDate(day).replace(/ \d{4}$/, "")}
                      </p>
                    </div>

                    {dayActivities.length === 0 ? (
                      <p className="text-sm text-fog-dim">A free day.</p>
                    ) : (
                      <ul className="space-y-2.5">
                        {dayActivities.map((activity) => (
                          <li
                            key={activity.id}
                            className="surface flex items-start gap-4 p-4"
                          >
                            <span className="w-12 shrink-0 pt-0.5 font-mono text-xs tabular-nums text-lagoon">
                              {activity.startMinute === null
                                ? "—"
                                : formatMinute(activity.startMinute)}
                            </span>

                            <span className="min-w-0 flex-1">
                              <span className="block text-sm font-medium text-cloud">
                                {activity.name}
                              </span>
                              <span className="mt-1.5 flex flex-wrap items-center gap-2">
                                <CategoryChip category={activity.category} />
                                <span className="font-mono text-2xs text-fog-dim">
                                  {formatDuration(activity.durationMin)}
                                </span>
                              </span>
                            </span>

                            <span className="shrink-0 pt-0.5 font-mono text-sm font-semibold tabular-nums text-solar">
                              {activity.cost === 0 ? "Free" : money(activity.cost)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </article>
                );
              })}

              {/* The leg onward, drawn as the route motif. */}
              {stopIndex < trip.stops.length - 1 ? (
                <div className="flex items-center gap-4 sm:pl-24">
                  <RouteLine
                    points={[
                      { x: 0, y: 50 },
                      { x: 50, y: 20 },
                      { x: 100, y: 50 },
                    ]}
                    drawOnView
                    showNodes={false}
                    className="h-6 w-24"
                  />
                  <p className="font-mono text-2xs text-fog">
                    {stop.transportMode
                      ? `${stop.transportMode.charAt(0)}${stop.transportMode.slice(1).toLowerCase()}`
                      : "Travel"}{" "}
                    to {trip.stops[stopIndex + 1].city.name}
                    {stop.transportCostToNext > 0 ? (
                      <span className="text-solar"> · {money(stop.transportCostToNext)}</span>
                    ) : null}
                  </p>
                </div>
              ) : null}
            </section>
          );
        })}

        {/* Totals */}
        <section className="surface mb-16 p-6" aria-label="Trip totals">
          <p className="placard mb-4">The whole trip</p>

          <dl className="grid grid-cols-2 gap-5 sm:grid-cols-4">
            {(
              [
                ["Stay", budget.byCategory.STAY],
                ["Transport", budget.byCategory.TRANSPORT],
                ["Activities", budget.byCategory.ACTIVITIES],
                ["Meals", budget.byCategory.MEALS],
              ] as [string, number][]
            ).map(([label, value]) => (
              <div key={label}>
                <dt className="placard mb-1">{label}</dt>
                <dd className="font-mono text-sm tabular-nums text-cloud">{money(value)}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-5 flex items-baseline justify-between border-t border-line pt-4">
            <span className="text-sm text-fog">
              Total for {budget.tripDays} days · {money(budget.avgPerDay)} per day
            </span>
            <span className="font-mono text-2xl font-semibold tabular-nums text-solar">
              {money(budget.total)}
            </span>
          </div>

          <p className="mt-3 font-mono text-2xs text-fog-dim">
            Estimates in USD, set by the trip&apos;s author.
          </p>
        </section>
      </main>

      {/* Sticky action bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-ink/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[720px] items-center gap-3 px-5 py-3.5">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-cloud">
              Want this itinerary?
            </p>
            <p className="truncate font-mono text-2xs text-fog">
              Copy it and make it yours — dates, costs and all.
            </p>
          </div>

          <PublicShareBar
            url={`${appUrl}/s/${slug}`}
            title={trip.name}
            qrSvg={qr}
          />

          <Suspense fallback={null}>
            <CopyTripButton slug={slug} isSignedIn={Boolean(viewer)} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
