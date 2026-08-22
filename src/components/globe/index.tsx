"use client";

import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";
import type { TripGlobeProps } from "./trip-globe";

/**
 * The only way the rest of the app touches the globe.
 *
 * `ssr: false` keeps three.js out of the server bundle, and the dynamic import
 * means the ~500 KB chunk is only requested on the three routes that render a
 * globe — never on the builder, budget or explore screens.
 */
const TripGlobe = dynamic(() => import("./trip-globe"), {
  ssr: false,
  loading: () => <GlobeSkeleton />,
});

export function Globe(props: TripGlobeProps) {
  return <TripGlobe {...props} />;
}

/** A wireframe stand-in with the same footprint, so nothing shifts on load. */
export function GlobeSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("grid size-full place-items-center", className)} aria-hidden>
      <div className="relative aspect-square w-[62%] max-w-[320px]">
        <div className="absolute inset-0 rounded-full border border-lagoon/15" />
        <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_32%_28%,rgba(54,214,195,0.10),transparent_62%)]" />

        {/* Meridians, drawn as flattening ellipses. */}
        {[0.28, 0.58, 0.86].map((scale) => (
          <div
            key={scale}
            className="absolute inset-0 rounded-[50%] border border-cloud/[0.06]"
            style={{ transform: `scaleX(${scale})` }}
          />
        ))}
        {/* Parallels. */}
        {[0.34, 0.66].map((scale) => (
          <div
            key={scale}
            className="absolute inset-0 rounded-[50%] border border-cloud/[0.06]"
            style={{ transform: `scaleY(${scale})` }}
          />
        ))}

        <div
          className="absolute inset-0 rounded-full"
          style={{ animation: "globe-spin 28s linear infinite" }}
        >
          <span className="absolute left-1/2 top-[18%] size-1.5 -translate-x-1/2 rounded-full bg-lagoon/50" />
        </div>
      </div>
    </div>
  );
}
