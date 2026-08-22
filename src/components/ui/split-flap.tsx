"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

/**
 * SplitFlap — mechanical departure-board digits.
 *
 * Used in exactly two places: the Budget screen's headline total and the
 * dashboard budget tile. Repeating it anywhere else would turn a signature
 * into a gimmick.
 *
 * Each character is its own tile with a hairline across the middle. When the
 * value changes, the outgoing character rotates away on the X axis while the
 * incoming one rotates in, staggered 60 ms per column so the board resolves
 * left to right the way a real one does.
 *
 * Under prefers-reduced-motion the flips are replaced by a plain count-up.
 */

const SIZES = {
  sm: { tile: "h-7 w-[0.72em] text-lg", gap: "gap-[2px]" },
  md: { tile: "h-11 w-[0.72em] text-3xl", gap: "gap-[3px]" },
  lg: { tile: "h-16 w-[0.72em] text-5xl", gap: "gap-1" },
} as const;

export type SplitFlapProps = {
  /** Already formatted, e.g. "1,24,500". The component never formats. */
  value: string;
  prefix?: string;
  size?: keyof typeof SIZES;
  className?: string;
  "aria-label"?: string;
};

const STAGGER_MS = 60;

export function SplitFlap({
  value,
  prefix,
  size = "md",
  className,
  "aria-label": ariaLabel,
}: SplitFlapProps) {
  const reduceMotion = useReducedMotion();
  const s = SIZES[size];
  const characters = React.useMemo(() => value.split(""), [value]);

  return (
    <div
      className={cn("inline-flex items-stretch", s.gap, className)}
      role="img"
      aria-label={ariaLabel ?? `${prefix ?? ""}${value}`}
    >
      {prefix ? (
        <span
          aria-hidden
          className={cn(
            "grid place-items-center pr-1 font-mono font-semibold text-solar/70",
            s.tile,
            "w-auto",
          )}
        >
          {prefix}
        </span>
      ) : null}

      {characters.map((char, index) => (
        <Flap
          key={`${index}-${characters.length}`}
          char={char}
          index={index}
          size={s}
          reduceMotion={Boolean(reduceMotion)}
        />
      ))}
    </div>
  );
}

function Flap({
  char,
  index,
  size,
  reduceMotion,
}: {
  char: string;
  index: number;
  size: (typeof SIZES)[keyof typeof SIZES];
  reduceMotion: boolean;
}) {
  // Separators aren't mechanical parts — they sit between the tiles.
  const isSeparator = char === "," || char === "." || char === " ";

  if (isSeparator) {
    return (
      <span
        aria-hidden
        className={cn(
          "grid w-[0.3em] place-items-end pb-[0.15em] font-mono font-semibold text-solar/60",
          size.tile,
        )}
      >
        {char === " " ? "" : char}
      </span>
    );
  }

  return (
    <span
      aria-hidden
      className={cn(
        "stage-3d-near relative grid place-items-center overflow-hidden rounded-[3px] bg-deck font-mono font-semibold tabular-nums text-solar",
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_2px_6px_rgba(0,0,0,0.45)]",
        size.tile,
      )}
    >
      {/* The split: a hairline exactly halfway down the tile. */}
      <span className="pointer-events-none absolute inset-x-0 top-1/2 z-10 h-px bg-ink/70" />

      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={char}
          initial={reduceMotion ? { opacity: 0 } : { rotateX: -90, opacity: 0 }}
          animate={reduceMotion ? { opacity: 1 } : { rotateX: 0, opacity: 1 }}
          exit={reduceMotion ? { opacity: 0 } : { rotateX: 90, opacity: 0 }}
          transition={{
            duration: reduceMotion ? 0.12 : 0.28,
            ease: [0.22, 1, 0.36, 1],
            delay: reduceMotion ? 0 : (index * STAGGER_MS) / 1000,
          }}
          className="backface-hidden absolute leading-none"
          style={{ transformOrigin: "center center" }}
        >
          {char}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

/**
 * Count a number up to its target, for the reduced-motion path and for tiles
 * that want the number to settle rather than flip.
 */
export function useCountUp(target: number, durationMs = 600) {
  const [value, setValue] = React.useState(target);
  const reduceMotion = useReducedMotion();

  React.useEffect(() => {
    if (reduceMotion) {
      setValue(target);
      return;
    }

    const start = performance.now();
    const from = value;
    let frame = 0;

    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / durationMs);
      // easeOutExpo — fast then settling, matching --ease-deck's feel.
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setValue(from + (target - from) * eased);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
    // `value` is intentionally excluded: including it would restart the
    // animation on every frame.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, durationMs, reduceMotion]);

  return value;
}
