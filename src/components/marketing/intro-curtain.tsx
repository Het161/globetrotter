"use client";

import * as React from "react";
import { LogoMark } from "@/components/layout/logo";

/**
 * The landing page's opening — "the route arrives".
 *
 * A flight path draws itself between four real cities from the database, each
 * node landing as the line reaches it, and the wordmark rises from behind it.
 * It is the product's thesis in two and a half seconds: cities joined by a
 * route. The same Lagoon line is the app's signature everywhere else, so the
 * intro is the design system introducing itself rather than a loading screen
 * bolted on the front.
 *
 * Everything about it is deliberately defensive:
 *
 *   · The markup is server-rendered and the motion is pure CSS, so it starts on
 *     the first painted frame — it never waits for hydration and never flashes.
 *   · `pointer-events: none` throughout, and any click, key or scroll dismisses
 *     it early. It can't trap anyone, and the page behind is live immediately.
 *   · Once per session (sessionStorage), skipped entirely under
 *     prefers-reduced-motion, and skipped before first paint by the inline
 *     script in the landing page.
 *   · If JavaScript never runs, the CSS still animates it away and it is
 *     already click-through, so there is no state where it blocks the page.
 *
 * Timings live in globals.css under `.gt-intro`.
 */

/** Where the flight path bends, in the SVG's 1000×300 space. */
const NODES = [
  { x: 140, y: 214 },
  { x: 400, y: 122 },
  { x: 660, y: 168 },
  { x: 902, y: 78 },
] as const;

/**
 * Three elliptical arcs, one per leg. `A` starts and ends exactly on its
 * endpoints, so the nodes always sit on the line however the geometry is
 * tuned — and a shallow upward bulge is what a flight path looks like.
 */
const ROUTE_D = [
  `M${NODES[0].x} ${NODES[0].y}`,
  `A330 330 0 0 1 ${NODES[1].x} ${NODES[1].y}`,
  `A320 320 0 0 1 ${NODES[2].x} ${NODES[2].y}`,
  `A305 305 0 0 1 ${NODES[3].x} ${NODES[3].y}`,
].join(" ");

/** When each node lands, matched to the draw's easing by eye. */
const NODE_AT = [0.32, 0.66, 0.98, 1.22];

const TOTAL_MS = 2620;

export function IntroCurtain({ cities }: { cities: string[] }) {
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const node = ref.current;
    if (!node) return;

    /**
     * The inline script owns the decision and this effect owns the cleanup.
     * That split matters: React StrictMode runs effects twice in development,
     * so an effect that both wrote `gt-intro-seen` *and* read it would see its
     * own write on the second pass and bin the curtain before it played.
     *
     * Reading the attribute the inline script set is idempotent — it doesn't
     * change between the two passes — while sessionStorage only ever affects
     * the *next* page load.
     */
    const skip =
      document.documentElement.dataset.gtIntro === "skip" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (skip) {
      node.remove();
      return;
    }

    sessionStorage.setItem("gt-intro-seen", "1");

    let removeTimer = window.setTimeout(() => node.remove(), TOTAL_MS);

    // Any intent to interact cuts it short.
    const dismiss = () => {
      if (node.dataset.dismissing === "true") return;
      node.dataset.dismissing = "true";
      window.clearTimeout(removeTimer);
      removeTimer = window.setTimeout(() => node.remove(), 380);
    };

    const events = ["pointerdown", "keydown", "wheel", "touchstart"] as const;
    for (const type of events) {
      window.addEventListener(type, dismiss, { passive: true, once: true });
    }

    return () => {
      window.clearTimeout(removeTimer);
      for (const type of events) window.removeEventListener(type, dismiss);
    };
  }, []);

  const labels = cities.slice(0, NODES.length);

  return (
    <div ref={ref} className="gt-intro" aria-hidden>
      {/* Faint survey grid, so the route has something to be plotted on. */}
      <div className="gt-intro__backdrop">
        <div className="graticule opacity-[0.05]" />
        <div className="grain" />
      </div>

      <div className="relative flex flex-col items-center">
        <svg
          className="gt-intro__route"
          viewBox="0 0 1000 300"
          fill="none"
          role="presentation"
        >
          {/* Bloom behind the route, swelling as it completes. */}
          <ellipse
            className="gt-intro__bloom"
            cx={520}
            cy={150}
            rx={430}
            ry={150}
            fill="url(#gt-intro-bloom)"
            style={{ transformBox: "fill-box", transformOrigin: "center" }}
          />
          <defs>
            <radialGradient id="gt-intro-bloom">
              <stop offset="0%" stopColor="var(--color-lagoon)" stopOpacity="0.14" />
              <stop offset="100%" stopColor="var(--color-lagoon)" stopOpacity="0" />
            </radialGradient>
          </defs>

          <path className="gt-intro__glow" d={ROUTE_D} pathLength={100} />
          <path className="gt-intro__path" d={ROUTE_D} pathLength={100} />

          {/* The head of the route, running just ahead of the line. */}
          <circle
            className="gt-intro__comet"
            cx={0}
            cy={0}
            r={4.5}
            fill="var(--color-cloud)"
            style={{ offsetPath: `path("${ROUTE_D}")` }}
          />

          {NODES.map((node, index) => {
            const at = NODE_AT[index];
            // The origin is Solar — money starts here — and the rest of the
            // route is Lagoon, matching the logo and the app's semantics.
            const colour = index === 0 ? "var(--color-solar)" : "var(--color-lagoon)";

            return (
              <g key={`${node.x}-${node.y}`}>
                <circle
                  className="gt-intro__ring"
                  cx={node.x}
                  cy={node.y}
                  r={9}
                  fill={colour}
                  style={{ animationDelay: `${at}s` }}
                />
                <circle
                  className="gt-intro__node"
                  cx={node.x}
                  cy={node.y}
                  r={index === 0 ? 7 : 5.5}
                  fill={colour}
                  style={{ animationDelay: `${at}s` }}
                />

                {labels[index] ? (
                  <text
                    className="gt-intro__label"
                    x={node.x}
                    y={node.y - 22}
                    textAnchor="middle"
                    style={{ animationDelay: `${at + 0.22}s` }}
                    fill="var(--color-cloud)"
                    fillOpacity={0.62}
                    fontFamily="var(--font-mono)"
                    fontSize={15}
                    letterSpacing={2.4}
                  >
                    {labels[index].toUpperCase()}
                  </text>
                ) : null}
              </g>
            );
          })}
        </svg>

        {/* Wordmark, rising out of its own mask. */}
        <div className="mt-2 flex items-center gap-3.5">
          <span className="gt-intro__mark inline-flex">
            <LogoMark size={34} />
          </span>
          <span className="gt-intro__word">
            <span className="font-display text-4xl font-semibold tracking-[-0.03em] text-cloud sm:text-5xl">
              Globe<span className="text-solar">Trotter</span>
            </span>
          </span>
        </div>

        <span
          className="gt-intro__hairline mt-6 block h-px w-40 bg-[linear-gradient(90deg,transparent,var(--color-line-strong),transparent)]"
          aria-hidden
        />
      </div>
    </div>
  );
}

/**
 * Runs before first paint so a repeat visit or a reduced-motion preference
 * never sees the curtain flash. Kept as a string because it has to be inlined
 * into the HTML — React would only run it after hydration, which is too late.
 */
export const INTRO_SKIP_SCRIPT = `try{if(sessionStorage.getItem('gt-intro-seen')==='1'||matchMedia('(prefers-reduced-motion: reduce)').matches){document.documentElement.dataset.gtIntro='skip'}}catch(e){}`;
