"use client";

import * as React from "react";
import Image from "next/image";
import { motion, useMotionValue, useSpring, useTransform, useReducedMotion } from "motion/react";
import { cn, hashUnit } from "@/lib/utils";

/**
 * Postcard — what a city looks like when we have no photograph of it.
 *
 * Rather than a grey placeholder, each region gets its own two-stop gradient,
 * and the card is dressed as an actual postcard: a dashed country-code stamp
 * top-right, coordinates set in mono bottom-left, and a perforated left edge
 * punched out with a repeating radial mask.
 *
 * On hover it tilts up to 6° toward the pointer. That is the same depth idea
 * as DeckButton, applied to a surface instead of a control.
 */

export type PostcardCity = {
  name: string;
  country: string;
  countryCode: string;
  region: string;
  lat: number;
  lng: number;
  imageUrl?: string | null;
};

/** Two stops per region, chosen to stay legible under white type. */
const REGION_GRADIENT: Record<string, [string, string]> = {
  Europe: ["#2A2E6B", "#1E9C8D"],
  Asia: ["#5B2B6B", "#C98A1E"],
  "South Asia": ["#B4661A", "#C4433A"],
  Americas: ["#146B63", "#5B3FA8"],
  "Africa & Middle East": ["#A8761B", "#8C3B22"],
  Oceania: ["#12667F", "#1B2450"],
};

const FALLBACK_GRADIENT: [string, string] = ["#1A2238", "#121829"];

export function regionGradient(region: string): [string, string] {
  return REGION_GRADIENT[region] ?? FALLBACK_GRADIENT;
}

const SIZES = {
  chip: { wrapper: "h-16", name: "text-base", meta: "text-[9px]", stamp: "size-7 text-[9px]" },
  card: { wrapper: "h-40", name: "text-2xl", meta: "text-[10px]", stamp: "size-10 text-[11px]" },
  banner: { wrapper: "h-56", name: "text-3xl", meta: "text-xs", stamp: "size-12 text-sm" },
  hero: { wrapper: "h-72 sm:h-80", name: "text-4xl sm:text-5xl", meta: "text-xs", stamp: "size-14 text-base" },
} as const;

export type PostcardProps = {
  city: PostcardCity;
  size?: keyof typeof SIZES;
  /** Turn the pointer tilt off inside dense lists. */
  tilt?: boolean;
  /** Hide the coordinates and stamp for the smallest chips. */
  minimal?: boolean;
  className?: string;
  children?: React.ReactNode;
};

export function Postcard({
  city,
  size = "card",
  tilt = true,
  minimal = false,
  className,
  children,
}: PostcardProps) {
  const reduceMotion = useReducedMotion();
  const ref = React.useRef<HTMLDivElement>(null);
  const s = SIZES[size];

  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const springConfig = { stiffness: 220, damping: 22, mass: 0.5 };
  const rotateY = useSpring(useTransform(px, [0, 1], [-6, 6]), springConfig);
  const rotateX = useSpring(useTransform(py, [0, 1], [6, -6]), springConfig);

  const interactive = tilt && !reduceMotion;

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!interactive) return;
    const rect = event.currentTarget.getBoundingClientRect();
    px.set((event.clientX - rect.left) / rect.width);
    py.set((event.clientY - rect.top) / rect.height);
  }

  function onPointerLeave() {
    px.set(0.5);
    py.set(0.5);
  }

  const [from, to] = regionGradient(city.region);
  // Deterministic so the same city always gets the same postmark angle.
  const skew = (hashUnit(city.name) - 0.5) * 14;

  return (
    <div className={cn(interactive && "stage-3d", className)}>
      <motion.div
        ref={ref}
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
        style={interactive ? { rotateX, rotateY, transformStyle: "preserve-3d" } : undefined}
        className={cn(
          "relative w-full overflow-hidden rounded-[var(--radius-card)]",
          s.wrapper,
        )}
      >
        {/* Ground: a real photo when we have one, the region gradient otherwise. */}
        {city.imageUrl ? (
          <Image
            src={city.imageUrl}
            alt={`${city.name}, ${city.country}`}
            fill
            sizes="(max-width: 768px) 100vw, 420px"
            className="object-cover"
          />
        ) : (
          <div
            aria-hidden
            className="absolute inset-0"
            style={{ background: `linear-gradient(148deg, ${from} 0%, ${to} 100%)` }}
          />
        )}

        {/* Perforated left edge — punched out with a repeating radial mask. */}
        <div
          aria-hidden
          className="absolute inset-0 bg-ink"
          style={{
            WebkitMaskImage:
              "radial-gradient(circle 4px at 0px 8px, #000 0 4px, transparent 4.5px)",
            maskImage: "radial-gradient(circle 4px at 0px 8px, #000 0 4px, transparent 4.5px)",
            WebkitMaskSize: "100% 16px",
            maskSize: "100% 16px",
            WebkitMaskRepeat: "repeat-y",
            maskRepeat: "repeat-y",
          }}
        />

        {/* Ink wash so type stays readable over any gradient or photo. */}
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/25 to-transparent"
        />
        <div aria-hidden className="grain" />

        {!minimal && (
          <>
            {/* Country-code stamp, dashed and postmarked at a stable angle. */}
            <div
              className={cn(
                "absolute right-3 top-3 grid place-items-center rounded-[3px] border border-dashed border-cloud/45 bg-ink/25 font-mono font-bold tracking-[0.08em] text-cloud/85 backdrop-blur-[2px]",
                s.stamp,
              )}
              style={{ transform: `rotate(${skew}deg)` }}
              aria-hidden
            >
              {city.countryCode}
            </div>

            {/* Coordinates, bottom-left, the way a real postcard is annotated. */}
            <div
              className={cn(
                "absolute bottom-2.5 left-4 font-mono tabular-nums tracking-[0.1em] text-cloud/60",
                s.meta,
              )}
              aria-hidden
            >
              {formatCoord(city.lat, "NS")} · {formatCoord(city.lng, "EW")}
            </div>
          </>
        )}

        {/* City name, set in the display face. */}
        <div className="absolute inset-x-0 bottom-0 p-4 pl-4">
          <p
            className={cn(
              "font-display font-medium leading-none tracking-[-0.02em] text-cloud drop-shadow-[0_2px_12px_rgba(0,0,0,0.6)]",
              minimal ? "" : "mb-5",
              s.name,
            )}
          >
            {city.name}
          </p>
          {!minimal && (
            <p className="placard absolute bottom-2.5 right-4 text-cloud/55">{city.country}</p>
          )}
        </div>

        {children}
      </motion.div>
    </div>
  );
}

function formatCoord(value: number, axis: "NS" | "EW"): string {
  const hemisphere =
    axis === "NS" ? (value >= 0 ? "N" : "S") : value >= 0 ? "E" : "W";
  return `${Math.abs(value).toFixed(2)}° ${hemisphere}`;
}
