/**
 * Strips macOS AppleDouble sidecars, which this repo needs because it lives on
 * an exFAT volume.
 *
 * macOS writes a `._name` file next to anything carrying extended attributes
 * when the volume can't store them natively. The sidecars are binary but keep
 * the original name, which breaks any tool that trusts a directory listing:
 *
 *   · `._page.tsx` looks like a route to Next.js, `._budget.test.ts` looks like
 *     a test to vitest — both then fail on a NUL byte.
 *   · Inside Turbopack's cache database — the versioned directory under
 *     `.next/cache/turbopack` — the file names are sequence numbers.
 *     `._00000001.sst` is not a number, so opening the cache dies with
 *     "Failed to open database … invalid digit found in string", and every
 *     build after the first one fails.
 *
 * The build directories are walked too, which is the whole fix for that
 * Turbopack error: the cache is kept and reused (consecutive builds run ~3.1 s,
 * 2.1 s, 1.3 s as it warms) where deleting it would throw that work away every
 * run.
 *
 * Deleting the sidecars is the entire job. Clearing the extended attributes
 * with `xattr -rc` was tried first and is worse on both counts: it takes ~80 s
 * because it recurses node_modules, and it materialises fresh sidecars as it
 * goes.
 *
 * Runs before every quality gate. It only ever removes `._*` files — no build
 * output, no cache, and never Next's dev-server lock.
 */
import { readdir, rm } from "node:fs/promises";
import { join } from "node:path";

// Dependencies and git objects: huge, and nothing there reads a directory
// listing the way Next and Turbopack do.
const SKIP = new Set(["node_modules", ".git"]);

let removed = 0;

async function walk(dir) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return; // vanished mid-walk, or unreadable — nothing to clean either way
  }

  await Promise.all(
    entries.map(async (entry) => {
      if (SKIP.has(entry.name)) return;
      const full = join(dir, entry.name);

      if (entry.name.startsWith("._")) {
        await rm(full, { force: true });
        removed++;
        return;
      }
      if (entry.isDirectory()) await walk(full);
    }),
  );
}

await walk(".");

if (removed > 0) console.log(`[clean] removed ${removed} AppleDouble sidecar file(s)`);
