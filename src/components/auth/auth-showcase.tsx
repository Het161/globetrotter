"use client";

import { motion, useReducedMotion } from "motion/react";
import { Globe } from "@/components/globe";
import { SplitFlap } from "@/components/ui/split-flap";

/**
 * The right-hand panel of the auth screens: a live globe running a real route
 * with a departure-board readout underneath.
 *
 * It is the product's argument in one image — cities joined by a line, and a
 * number attached to it — which is more honest than a stock photograph of a
 * beach.
 */

const DEMO_ROUTE = [
  { name: "Tokyo", lat: 35.6762, lng: 139.6503 },
  { name: "Kyoto", lat: 35.0116, lng: 135.7681 },
  { name: "Osaka", lat: 34.6937, lng: 135.5023 },
];

export function AuthShowcase() {
  const reduceMotion = useReducedMotion();

  return (
    <div className="relative hidden overflow-hidden border-l border-line lg:block">
      {/* Globe fills the panel, bleeding off the right edge. */}
      <div className="absolute inset-0">
        <Globe route={DEMO_ROUTE} autoRotate interactive={false} className="size-full" />
      </div>

      {/* Scrim so the copy stays readable over the moving globe. */}
      <div
        aria-hidden
        className="absolute inset-0 bg-[linear-gradient(100deg,var(--color-ink)_0%,rgba(10,14,26,0.62)_38%,transparent_78%)]"
      />

      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
        className="relative flex h-full flex-col justify-end p-12 xl:p-16"
      >
        <p className="placard mb-4">Sample itinerary</p>

        <h2 className="max-w-md font-display text-4xl font-medium leading-[1.1] tracking-[-0.02em] text-cloud xl:text-5xl">
          Tokyo <span className="text-lagoon">→</span> Kyoto{" "}
          <span className="text-lagoon">→</span> Osaka
        </h2>

        <p className="mt-4 max-w-sm text-sm leading-relaxed text-fog">
          Eight nights, twelve activities, and a running total that updates the moment you
          move a stop.
        </p>

        <div className="mt-8 flex flex-wrap items-end gap-x-10 gap-y-6">
          <div>
            <p className="placard mb-2">Estimated total</p>
            <SplitFlap value="2,632" prefix="$" size="md" aria-label="Estimated total 2,632 US dollars" />
          </div>

          <div>
            <p className="placard mb-2">Days over budget</p>
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-3xl font-semibold tabular-nums text-ember">1</span>
              <span className="text-sm text-fog">of 9</span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
