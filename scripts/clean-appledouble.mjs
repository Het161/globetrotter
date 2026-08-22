/**
 * Housekeeping that this repo needs because it lives on an exFAT volume.
 *
 * 1. AppleDouble sidecars.
 *    macOS writes a `._name` file next to anything carrying extended
 *    attributes when the volume can't store them natively. Those sidecars are
 *    binary but keep the original extension, so `._page.tsx` looks like a
 *    route to Next.js and `._budget.test.ts` looks like a test to vitest —
 *    and both then fail on a NUL byte. This strips the xattrs (so they stop
 *    being regenerated) and deletes any already on disk.
 *
 * 2. Turbopack's persistent caches (with --reset-turbopack-cache).
 *    `next dev` and `next build` write cache databases under `.next`. On exFAT
 *    neither can reopen a database the other left behind, and whichever runs
 *    second dies with "Failed to open database: invalid digit found in
 *    string". Dropping those directories costs a few seconds of cold start and
 *    makes both commands reliable. Build *output* is untouched.
 *
 * Runs before every quality gate.
 */
import { readdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const run = promisify(execFile);
const SKIP = new Set(["node_modules", ".git", ".next"]);

let removed = 0;

async function walk(dir) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (SKIP.has(entry.name)) continue;
    const full = join(dir, entry.name);

    if (entry.name.startsWith("._")) {
      await rm(full, { force: true });
      removed++;
      continue;
    }
    if (entry.isDirectory()) await walk(full);
  }
}

// Clearing xattrs first stops the sidecars coming straight back.
await run("xattr", ["-rc", "."]).catch(() => {});
await walk(".");
// A second pass: clearing xattrs can itself materialise a few sidecars.
await walk(".");

if (removed > 0) console.log(`[clean] removed ${removed} AppleDouble sidecar file(s)`);

if (process.argv.includes("--reset-turbopack-cache")) {
  // Caches only — `.next/server`, `.next/static` and the manifests survive.
  const caches = [".next/cache", ".next/turbopack", ".next/dev"];
  await Promise.all(caches.map((dir) => rm(dir, { recursive: true, force: true })));
  console.log(`[clean] dropped ${caches.join(", ")}`);
}
