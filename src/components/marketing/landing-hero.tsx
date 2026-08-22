"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { ArrowUpRight } from "lucide-react";
import { Globe } from "@/components/globe";
import { DeckButton } from "@/components/ui/deck-button";

/**
 * The hero: an auto-rotating globe arcing between the most popular cities in
 * the database, with the headline over it.
 *
 * This is the one place `magnetic` is used on a button — a hero call to action
 * can afford the flourish; a toolbar cannot.
 */
export function LandingHero({
  points,
  signedIn,
}: {
  points: { name: string; lat: number; lng: number }[];
  signedIn: boolean;
}) {
  const reduceMotion = useReducedMotion();

  const rise = (delay: number) => ({
    initial: reduceMotion ? false : { opacity: 0, y: 18 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] as const },
  });

  return (
    <section className="relative overflow-hidden">
      {/* Globe sits behind and to the right, bleeding off the edge. */}
      <div className="pointer-events-none absolute right-[-18%] top-[-12%] hidden h-[760px] w-[860px] opacity-80 lg:block">
        <Globe route={points} autoRotate interactive={false} className="size-full" />
      </div>

      {/* Mobile keeps a smaller globe centred behind the copy. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[420px] opacity-45 lg:hidden">
        <Globe route={points} autoRotate interactive={false} showLabels={false} className="size-full" />
      </div>

      <div className="relative mx-auto max-w-6xl px-5 pb-24 pt-20 sm:px-8 sm:pt-28 lg:pb-36 lg:pt-32">
        <motion.p {...rise(0)} className="placard mb-5">
          Multi-city trip planner
        </motion.p>

        <motion.h1
          {...rise(0.08)}
          className="max-w-3xl font-display text-[clamp(2.6rem,7vw,5rem)] font-medium leading-[1.03] tracking-[-0.03em] text-cloud"
        >
          Plan the route.{" "}
          <span className="italic text-lagoon">Know the cost.</span>{" "}
          <span className="block sm:inline">Share the story.</span>
        </motion.h1>

        <motion.p
          {...rise(0.16)}
          className="mt-6 max-w-xl text-lg leading-relaxed text-fog text-pretty"
        >
          Build an itinerary across as many cities as you like, drop activities onto real
          days, and watch what it actually costs — before you book anything.
        </motion.p>

        <motion.div {...rise(0.24)} className="mt-9 flex flex-wrap items-center gap-3">
          <DeckButton asChild variant="primary" size="lg" magnetic>
            <Link href={signedIn ? "/dashboard" : "/signup"}>
              {signedIn ? "Open your dashboard" : "Start planning"}
            </Link>
          </DeckButton>

          <DeckButton asChild variant="secondary" size="lg">
            <Link href="/s/japan-sakura-27">
              See a shared trip
              <ArrowUpRight />
            </Link>
          </DeckButton>
        </motion.div>

        <motion.p {...rise(0.32)} className="mt-6 font-mono text-2xs text-fog-dim">
          Try it with{" "}
          <span className="text-fog">demo@globetrotter.app</span> ·{" "}
          <span className="text-fog">Demo@1234</span>
        </motion.p>
      </div>
    </section>
  );
}
