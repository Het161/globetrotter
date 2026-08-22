/**
 * macOS writes an AppleDouble sidecar (`._name`) next to any file that carries
 * extended attributes when the volume can't store them natively — which is the
 * case on the exFAT drive this repo lives on.
 *
 * Those sidecars are binary, but they keep the original extension, so
 * `._page.tsx` looks like a route to Next.js and `._budget.test.ts` looks like
 * a test to vitest. Both then fail on a NUL byte.
 *
 * This strips the extended attributes (so they stop being regenerated) and
 * deletes any sidecars already on disk. It runs before every quality gate.
 */
import { readdir, rm, stat } from "node:fs/promises";
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
await stat(".").catch(() => {});
