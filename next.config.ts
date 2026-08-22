import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

/**
 * `next dev` and `next build` each acquire a lock on their `distDir` and write
 * their own Turbopack cache inside it (see the `lockDistDir` option in Next's
 * config types: "if multiple processes write to the same distDir at the same
 * time, it can mangle the state of the directory").
 *
 * Sharing one directory is what let dev and build corrupt each other's cache on
 * this exFAT volume — `Failed to open database: invalid digit found in string`.
 * Keeping them apart fixes that at the source, so nothing has to be deleted
 * before a run and both keep their incremental caches.
 *
 * `next start` runs at PHASE_PRODUCTION_SERVER, so it reads `.next` — the same
 * directory `next build` wrote.
 */
const config = (phase: string): NextConfig => ({
  distDir: phase === PHASE_DEVELOPMENT_SERVER ? ".next-dev" : ".next",
  allowedDevOrigins: ["192.168.137.1", "127.0.0.1", "localhost"],

  images: {
    /**
     * The optimiser is off, and the city photos are pre-sized instead
     * (1000x563 WebP, ~86 KB each, built by scripts/build-city-images).
     *
     * Not a preference — the optimiser is not safe on this exFAT volume. It
     * caches derivatives under `<distDir>/dev/cache/images/<hash>/`, macOS
     * drops an AppleDouble `._<name>` sidecar beside each one, and Next reads
     * the directory and picks the sidecar: every city image then returns
     * HTTP 200 with 4096 bytes of AppleDouble and `application/octet-stream`,
     * which no browser will decode. Same root cause as the Turbopack cache
     * problem in scripts/clean-appledouble.mjs, but this one recurs *during* a
     * session, so cleaning before the run doesn't help.
     *
     * The failure is silent and total — all 48 cards break at once — so it is
     * not something to leave armed during a demo. Serving the files straight
     * from public/ costs the difference between an 86 KB source and a ~30 KB
     * derivative, on images that lazy-load anyway.
     */
    unoptimized: true,
  },
});

export default config;
