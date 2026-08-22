import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, CalendarRange, Route, Share2 } from "lucide-react";
import { db } from "@/server/db";
import { getSession } from "@/server/auth/session";
import { Backdrop } from "@/components/ui/backdrop";
import { Logo } from "@/components/layout/logo";
import { DeckButton } from "@/components/ui/deck-button";
import { LandingHero } from "@/components/marketing/landing-hero";

export const metadata: Metadata = {
  title: "GlobeTrotter — plan the route, know the cost",
  description:
    "Build a multi-city itinerary, assign activities to days, watch the budget as you build, and share the finished plan.",
};

/**
 * The landing page. Short by design — the product sells itself once you're
 * inside, so this exists to get you there.
 *
 * The globe arcs between the six most popular cities in the database, not a
 * hardcoded list, so even the marketing page is reading real data.
 */
export default async function LandingPage() {
  const [user, popular] = await Promise.all([
    getSession(),
    db.city.findMany({
      orderBy: { popularity: "desc" },
      take: 6,
      select: { name: true, lat: true, lng: true },
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
