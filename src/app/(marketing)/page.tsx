import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, CalendarRange, Route, Share2 } from "lucide-react";
import { db } from "@/server/db";
import { getSession } from "@/server/auth/session";
import { Backdrop } from "@/components/ui/backdrop";
import { Logo } from "@/components/layout/logo";
import { DeckButton } from "@/components/ui/deck-button";
import { LandingHero } from "@/components/marketing/landing-hero";
import { IntroCurtain } from "@/components/marketing/intro-curtain";
import { IntroSkipInjector } from "@/components/marketing/intro-skip-injector";

export const metadata: Metadata = {
  title: "GlobeTrotter — plan the route, know the cost",
  description:
    "Build a multi-city itinerary, assign activities to days, watch the budget as you build, and share the finished plan.",
};

/**
 * The six cities drawn when the database can't be reached — the same six the
 * query below returns, so the page looks identical either way.
 *
 * This is the only hardcoded city data in the app, and it exists because of
 * what this page is: the one screen a stranger sees before they have an
 * account. It has to render.
 */
const FALLBACK_CITIES = [
  { name: "Paris", lat: 48.8566, lng: 2.3522 },
  { name: "Tokyo", lat: 35.6762, lng: 139.6503 },
  { name: "New York", lat: 40.7128, lng: -74.006 },
  { name: "Rome", lat: 41.9028, lng: 12.4964 },
  { name: "Kyoto", lat: 35.0116, lng: 135.7681 },
  { name: "Barcelona", lat: 41.3874, lng: 2.1686 },
];

/**
 * The landing page. Short by design — the product sells itself once you're
 * inside, so this exists to get you there.
 *
 * The globe arcs between the six most popular cities in the database, not a
 * hardcoded list, so even the marketing page is reading real data — but it
 * degrades rather than failing. Those arcs are decoration; taking the whole
 * page down over them means a database blip, a cold start on a serverless
 * Postgres, or a mistyped connection string turns the front door into an
 * error screen. `getSession()` already returns null when it can't reach the
 * database, so this is the last thing here that could throw.
 */
export default async function LandingPage() {
  const [user, popular] = await Promise.all([
    getSession(),
    db.city
      .findMany({
        orderBy: { popularity: "desc" },
        take: 6,
        select: { name: true, lat: true, lng: true },
      })
      .then((cities) => (cities.length > 0 ? cities : FALLBACK_CITIES))
      .catch((error) => {
        console.error("[landing] city query failed, drawing the fallback route:", error);
        return FALLBACK_CITIES;
      }),
  ]);

  const features = [
    {
      icon: Route,
      title: "Build the route",
      body: "Drag cities into order and every date re-flows itself. Each stop keeps the nights you gave it.",
    },
    {
      icon: CalendarRange,
      title: "Watch the budget",
      body: "Stay, transport, activities and meals add up as you plan — with the days that blow your allowance called out.",
    },
    {
      icon: Share2,
      title: "Share the plan",
      body: "One read-only link, a QR code, and a copy button so anyone can make it their own trip.",
    },
  ];

  return (
    <div className="relative min-h-dvh">
      {/* Must run while the HTML is still parsing — before the curtain below is
          painted — so a repeat visit never sees it flash. */}
      <IntroSkipInjector />

      {/* The cities are the most-planned ones in the database, so even the
          opening animation is reading real data. */}
      <IntroCurtain cities={popular.map((city) => city.name)} />

      <Backdrop variant="rich" />

      <header className="relative mx-auto flex max-w-6xl items-center justify-between px-5 py-6 sm:px-8">
        <Link href="/" aria-label="GlobeTrotter home">
          <Logo />
        </Link>

        <nav className="flex items-center gap-2.5">
          {user ? (
            <DeckButton asChild variant="primary" size="sm">
              <Link href="/dashboard">Open dashboard</Link>
            </DeckButton>
          ) : (
            <>
              <DeckButton asChild variant="ghost" size="sm">
                <Link href="/login">Sign in</Link>
              </DeckButton>
              <DeckButton asChild variant="primary" size="sm">
                <Link href="/signup">Get started</Link>
              </DeckButton>
            </>
          )}
        </nav>
      </header>

      <LandingHero points={popular} signedIn={Boolean(user)} />

      {/* Features */}
      <section className="relative mx-auto max-w-6xl px-5 pb-24 sm:px-8" aria-label="Features">
        <div className="grid gap-5 md:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <article key={feature.title} className="surface lift-on-hover p-6">
                <span className="mb-4 grid size-10 place-items-center rounded-[var(--radius-input)] border border-line bg-deck text-lagoon">
                  <Icon className="size-[18px]" aria-hidden />
                </span>
                <h3 className="font-display text-xl font-medium text-cloud">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-fog text-pretty">
                  {feature.body}
                </p>
              </article>
            );
          })}
        </div>

        {/* Real numbers from the seeded catalogue. */}
        <dl className="mt-14 grid grid-cols-2 gap-6 border-t border-line pt-10 sm:grid-cols-4">
          {[
            ["48", "cities, costed"],
            ["288", "things to do"],
            ["6", "regions"],
            ["1", "link to share it"],
          ].map(([value, label]) => (
            <div key={label}>
              <dt className="font-mono text-3xl font-semibold tabular-nums text-solar">
                {value}
              </dt>
              <dd className="mt-1 text-sm text-fog">{label}</dd>
            </div>
          ))}
        </dl>
      </section>

      <footer className="relative border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-8 sm:px-8">
          <p className="font-mono text-2xs text-fog-dim">
            GlobeTrotter · built for the Odoo × LDCE hackathon
          </p>

          <Link
            href="/s/japan-sakura-27"
            className="inline-flex items-center gap-1.5 text-xs text-fog transition-colors hover:text-cloud"
          >
            See a shared itinerary
            <ArrowUpRight className="size-3" aria-hidden />
          </Link>
        </div>
      </footer>
    </div>
  );
}
