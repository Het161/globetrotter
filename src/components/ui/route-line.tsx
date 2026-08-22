"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * THE ROUTE — the one visual idea repeated everywhere.
 *
 * A trip is a luminous Lagoon line through its stops. It shows up as arcs on
 * the globe, as a spine down the stop rail and the timeline, as a polyline in
 * the OG image, and drawing itself in on the public share page.
 *
 * Two exports, one idea:
 *   RouteLine  — an arbitrary polyline through points, for spans and heroes.
 *   RouteSpine — the per-row connector that threads a vertical list.
 *
 * When `animated` is set, the dash offset scrolls. That doubles as the app's
 * pending indicator: a stop reorder in flight makes the route "flow" rather
 * than dropping a spinner into the layout.
 */

export type RoutePoint = { x: number; y: number; label?: string };

export type RouteLineProps = {
  /** Points in a 0–100 coordinate space; the SVG scales to its container. */
  points: RoutePoint[];
  /** Scroll the dashes — used as the pending indicator. */
  animated?: boolean;
  /** Draw the line in when it first scrolls into view. */
  drawOnView?: boolean;
  /** Curve the segments instead of joining them with hard corners. */
  curved?: boolean;
  showNodes?: boolean;
  className?: string;
  strokeWidth?: number;
};

export function RouteLine({
  points,
  animated = false,
  drawOnView = false,
  curved = true,
  showNodes = true,
  className,
  strokeWidth = 1.4,
}: RouteLineProps) {
  const ref = React.useRef<SVGSVGElement>(null);
  const [drawn, setDrawn] = React.useState(!drawOnView);

  React.useEffect(() => {
    if (!drawOnView || drawn) return;
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setDrawn(true);
          observer.disconnect();
        }
      },
      { threshold: 0.25 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [drawOnView, drawn]);

  if (points.length === 0) return null;

  const d = curved ? smoothPath(points) : linearPath(points);

  return (
    <svg
      ref={ref}
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className={cn("pointer-events-none overflow-visible", className)}
      aria-hidden
    >
      {/* Soft glow underneath, so the line reads as luminous rather than drawn. */}
      <path
        d={d}
        fill="none"
        stroke="var(--color-lagoon)"
        strokeWidth={strokeWidth * 3}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.12}
        style={{ filter: "blur(2px)" }}
        vectorEffect="non-scaling-stroke"
      />

      <path
        d={d}
        fill="none"
        stroke="var(--color-lagoon)"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={animated ? "6 6" : drawOnView ? "1000" : undefined}
        strokeDashoffset={drawOnView && !drawn ? 1000 : 0}
        vectorEffect="non-scaling-stroke"
        style={{
          transition: drawOnView ? "stroke-dashoffset 1600ms cubic-bezier(0.22,1,0.36,1)" : undefined,
          animation: animated ? "dash-flow 1.4s linear infinite" : undefined,
        }}
      />

      {showNodes &&
        points.map((point, index) => (
          <g key={index}>
            <circle
              cx={point.x}
              cy={point.y}
              r={3}
              fill="var(--color-lagoon)"
              opacity={0.18}
              vectorEffect="non-scaling-stroke"
            />
            <circle
              cx={point.x}
              cy={point.y}
              r={1.6}
              fill="var(--color-lagoon)"
              vectorEffect="non-scaling-stroke"
            />
          </g>
        ))}
    </svg>
  );
}

function linearPath(points: RoutePoint[]): string {
  return points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x} ${p.y}`).join(" ");
}

/** Catmull-Rom style smoothing so multi-stop routes arc instead of zig-zag. */
function smoothPath(points: RoutePoint[]): string {
  if (points.length < 3) return linearPath(points);

  let d = `M${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const current = points[i];
    const next = points[i + 1];
    const midX = (current.x + next.x) / 2;
    const midY = (current.y + next.y) / 2;
    d += ` Q${current.x} ${current.y} ${midX} ${midY}`;
  }
  const last = points[points.length - 1];
  d += ` T${last.x} ${last.y}`;
  return d;
}

/* -------------------------------------------------------------------------- */
/* RouteSpine — the per-row connector used by the stop rail and the timeline  */
/* -------------------------------------------------------------------------- */

export type RouteSpineProps = {
  first?: boolean;
  last?: boolean;
  /** Highlight this node as the selected stop. */
  active?: boolean;
  /** Flow the dashes — a mutation is in flight for this row. */
  pending?: boolean;
  /** Ember when the stop contains an over-budget day. */
  alert?: boolean;
  className?: string;
};

export function RouteSpine({
  first,
  last,
  active,
  pending,
  alert,
  className,
}: RouteSpineProps) {
  const colour = alert ? "var(--color-ember)" : "var(--color-lagoon)";

  return (
    <div
      className={cn("relative flex w-6 shrink-0 flex-col items-center self-stretch", className)}
      aria-hidden
    >
      {/* Segment reaching up to the previous stop. */}
      <span
        className="w-px flex-1"
        style={{
          background: first ? "transparent" : colour,
          opacity: first ? 0 : 0.32,
        }}
      />

      {/* The node itself. */}
      <span className="relative my-1 grid place-items-center">
        {active && (
          <span
            className="absolute size-4 rounded-full"
            style={{ background: colour, opacity: 0.18, animation: "pulse-dot 2.4s var(--ease-deck) infinite" }}
          />
        )}
        <span
          className="relative size-2 rounded-full ring-2 ring-ink"
          style={{
            background: colour,
            boxShadow: active ? `0 0 10px ${colour}` : undefined,
          }}
        />
      </span>

      {/* Segment reaching down to the next stop; dashed while pending. */}
      <span
        className="w-px flex-1"
        style={
          last
            ? { background: "transparent", opacity: 0 }
            : pending
              ? {
                  backgroundImage: `repeating-linear-gradient(to bottom, ${colour} 0 4px, transparent 4px 10px)`,
                  backgroundSize: "1px 10px",
                  animation: "dash-flow 1.4s linear infinite",
                  opacity: 0.7,
                }
              : { background: colour, opacity: 0.32 }
        }
      />
    </div>
  );
}
