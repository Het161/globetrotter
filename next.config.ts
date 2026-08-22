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
});

export default config;
