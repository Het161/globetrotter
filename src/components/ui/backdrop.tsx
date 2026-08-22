"use client";

import * as React from "react";
import { motion, useMotionValue, useSpring, useTransform } from "motion/react";
import { cn } from "@/lib/utils";
import { useSafeReducedMotion } from "@/hooks/use-safe-reduced-motion";

/**
 * The layered night sky behind the app.
 *
 * Depth is built from five independent layers, each moving at a different
 * rate: drifting aurora blobs at the back, then three star planes with
 * increasing parallax, then film grain and a survey graticule on top. Moving
 * the pointer shifts each plane by a different amount, which is what makes a
 * flat page read as having depth.
 *
 * The performance contract from the design system (§11.1):
 *   variant="rich"     landing, auth, public share — everything animates
 *   variant="working"  builder, budget, explore, admin — texture only, static
 *
 * Every layer is pointer-events:none, animates transform/opacity only, and
 * freezes entirely under prefers-reduced-motion.
 */

export type BackdropProps = {
  variant?: "rich" | "working";
  className?: string;
};

export function Backdrop({ variant = "working", className }: BackdropProps) {
  const rich = variant === "rich";

  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-ink",
        className,
      )}
    >
      {rich ? <AuroraDrift /> : <AuroraStill />}
      {rich ? <Starfield /> : null}
      <div className="contours" />
      <div className="graticule" />
      <div className="grain" />
      {/* Vignette: pulls the eye to the middle and hides the layer edges. */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_120%_80%_at_50%_0%,transparent_20%,rgba(5,8,15,0.55)_100%)]" />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Aurora                                                                     */
/* -------------------------------------------------------------------------- */

/** Three blurred radial washes on long, offset drift cycles. */
function AuroraDrift() {
  return (
    <>
      <div
        className="aurora-blob"
        style={{
          top: "-14%",
          left: "-8%",
          width: "clamp(420px, 52vw, 900px)",
          height: "clamp(420px, 52vw, 900px)",
          background: "radial-gradient(circle, rgba(54,214,195,0.25) 0%, transparent 68%)",
          animation: "var(--animate-drift-a)",
        }}
      />
      <div
        className="aurora-blob"
        style={{
          top: "18%",
          right: "-14%",
          width: "clamp(380px, 46vw, 820px)",
          height: "clamp(380px, 46vw, 820px)",
          background: "radial-gradient(circle, rgba(245,182,43,0.18) 0%, transparent 68%)",
          animation: "var(--animate-drift-b)",
        }}
      />
      <div
        className="aurora-blob"
        style={{
          bottom: "-22%",
          left: "22%",
          width: "clamp(460px, 60vw, 980px)",
          height: "clamp(460px, 60vw, 980px)",
          background: "radial-gradient(circle, rgba(42,46,107,0.55) 0%, transparent 70%)",
          animation: "var(--animate-drift-c)",
        }}
      />
    </>
  );
}

/** Same washes, dimmer and motionless — the working-screen background. */
function AuroraStill() {
  return (
    <>
      <div
        className="aurora-blob"
        style={{
          top: "-20%",
          left: "-10%",
          width: "clamp(400px, 46vw, 760px)",
          height: "clamp(400px, 46vw, 760px)",
          background: "radial-gradient(circle, rgba(54,214,195,0.10) 0%, transparent 70%)",
        }}
      />
      <div
        className="aurora-blob"
        style={{
          bottom: "-26%",
          right: "-12%",
          width: "clamp(420px, 50vw, 820px)",
          height: "clamp(420px, 50vw, 820px)",
          background: "radial-gradient(circle, rgba(42,46,107,0.38) 0%, transparent 72%)",
        }}
      />
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Starfield                                                                  */
/* -------------------------------------------------------------------------- */

type Star = { x: number; y: number; size: number; opacity: number; delay: number };

/**
 * Deterministic star positions.
 *
 * A seeded generator rather than Math.random, so the server and the client
 * paint identical stars and React doesn't report a hydration mismatch.
 */
function generateStars(count: number, seed: number): Star[] {
  let state = seed;
  const next = () => {
    // Numerical Recipes LCG — small, fast, and stable across environments.
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };

  return Array.from({ length: count }, () => ({
    x: next() * 100,
    y: next() * 100,
    size: next() < 0.82 ? 1 : 2,
    opacity: 0.18 + next() * 0.55,
    delay: next() * 4,
  }));
}

/** Three planes at different parallax depths — the illusion of distance. */
const PLANES = [
  { count: 60, seed: 12345, depth: 6, blur: 0 },
  { count: 40, seed: 67890, depth: 14, blur: 0 },
  { count: 20, seed: 24680, depth: 26, blur: 0.4 },
];

function Starfield() {
  const reduceMotion = useSafeReducedMotion();

  // Pointer position, normalised to -0.5…0.5 around the viewport centre.
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const springX = useSpring(pointerX, { stiffness: 60, damping: 20, mass: 0.6 });
  const springY = useSpring(pointerY, { stiffness: 60, damping: 20, mass: 0.6 });

  React.useEffect(() => {
    if (reduceMotion) return;

    const onMove = (event: PointerEvent) => {
      pointerX.set(event.clientX / window.innerWidth - 0.5);
      pointerY.set(event.clientY / window.innerHeight - 0.5);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [pointerX, pointerY, reduceMotion]);

  return (
    <>
      {PLANES.map((plane, planeIndex) => (
        <StarPlane
          key={planeIndex}
          plane={plane}
          springX={springX}
          springY={springY}
          reduceMotion={Boolean(reduceMotion)}
        />
      ))}
    </>
  );
}

function StarPlane({
  plane,
  springX,
  springY,
  reduceMotion,
}: {
  plane: (typeof PLANES)[number];
  springX: ReturnType<typeof useSpring>;
  springY: ReturnType<typeof useSpring>;
  reduceMotion: boolean;
}) {
  const stars = React.useMemo(
    () => generateStars(plane.count, plane.seed),
    [plane.count, plane.seed],
  );

  // Nearer planes travel further, which is what sells the parallax.
  const x = useTransform(springX, (value) => value * -plane.depth);
  const y = useTransform(springY, (value) => value * -plane.depth);

  return (
    <motion.div
      className="absolute inset-0"
      style={{
        x: reduceMotion ? 0 : x,
        y: reduceMotion ? 0 : y,
        filter: plane.blur ? `blur(${plane.blur}px)` : undefined,
        willChange: "transform",
      }}
    >
      {stars.map((star, index) => (
        <span
          key={index}
          className="absolute rounded-full bg-cloud"
          style={{
            left: `${star.x.toFixed(4)}%`,
            top: `${star.y.toFixed(4)}%`,
            width: `${star.size}px`,
            height: `${star.size}px`,
            opacity: Number(star.opacity.toFixed(4)),
            animation: reduceMotion ? undefined : `twinkle 4s ease-in-out ${star.delay.toFixed(2)}s infinite`,
          }}
        />
      ))}
    </motion.div>
  );
}
