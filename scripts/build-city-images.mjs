/**
 * Builds `public/cities/<slug>.webp` — one photograph per city — from Wikimedia
 * Commons, and writes the attribution table to `docs/IMAGE-CREDITS.md`.
 *
 *   node scripts/build-city-images.mjs            # only cities with no file yet
 *   node scripts/build-city-images.mjs --force    # rebuild everything
 *
 * Needs `cwebp` (brew install webp) and macOS `sips`. Run it from the repo root
 * with the database up: the city list comes from the City table, so this stays
 * correct if cities are added.
 *
 * This is a build-time tool, not part of the app. The app only ever reads the
 * finished files out of public/, which is what lets every screen work with no
 * network — see the "It works offline" section of the README.
 *
 * Two API hops per city, because they answer different questions:
 *   1. en.wikipedia `pageimages` → which file is this city's lead image
 *   2. commons `imageinfo`       → a resized URL, plus the author and licence
 *
 * A lead image is usually the right photograph, but not always, so OVERRIDE
 * below pins the ones that needed a human. Anything picked automatically is
 * still worth looking at before it ships: the first run chose an active
 * cremation ground for Varanasi, which is not what belongs on a card inviting
 * someone to go there.
 */
import { writeFile, mkdir, rm, access } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";

const run = promisify(execFile);
const db = new PrismaClient();

const FORCE = process.argv.includes("--force");
const DEST = join(process.cwd(), "public", "cities");
const WORK = join(process.cwd(), ".next-dev", "city-image-work");
const UA = "GlobeTrotter/1.0 (student project; https://github.com/Het161/globetrotter)";

/** Output frame. Served straight to the browser — the optimiser is off. */
const W = 1000, H = 563, QUALITY = 78;

/** Cities whose Wikipedia article isn't titled after the city. */
const TITLE = {
  "new-york": "New York City",
  queenstown: "Queenstown, New Zealand",
  "gold-coast": "Gold Coast, Queensland",
  marrakech: "Marrakesh",
  zanzibar: "Zanzibar City",
};

/** Cities where the automatic pick was wrong, and why. */
const OVERRIDE = {
  // Lead image is not hosted on Commons.
  dubai: "File:Dubai Marina (12627723853).jpg",
  // Lead image is an SVG (a map).
  singapore: "File:Singapore Supertree-Grove-in-The-Gardens-01.jpg",
  // Lead image is an open-air cremation ground.
  varanasi: "File:Ganges varanasi.jpg",
  // Lead images below were real photos but too small, or a poor invitation:
  // a traffic jam, an aerial of a former prison, a hazy distant skyline.
  marrakech: "File:Jemaa el-Fnaa at night.jpg",
  zanzibar: "File:Harbour at the picturesque Stone Town.jpg",
  nadi: "File:Sri Siva Subramaniya Swami Temple - Nadi, Fiji 2.jpg",
  ubud: "File:Rice terraces, Ubud, Bali.jpg",
  "san-francisco": "File:GoldenGateBridge BakerBeach MC.jpg",
  nairobi: "File:Nairobi City Skyline.jpg",
};

const strip = (s) => (s ? String(s).replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim() : null);

async function api(url) {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function leadFile(title) {
  const u = new URL("https://en.wikipedia.org/w/api.php");
  u.search = new URLSearchParams({
    action: "query", format: "json", formatversion: "2",
    prop: "pageimages", piprop: "name", titles: title, redirects: "1",
  });
  const page = (await api(u)).query?.pages?.[0];
  return page?.pageimage ? `File:${page.pageimage}` : null;
}

async function fileInfo(file) {
  const u = new URL("https://commons.wikimedia.org/w/api.php");
  u.search = new URLSearchParams({
    action: "query", format: "json", formatversion: "2",
    prop: "imageinfo", titles: file,
    iiprop: "url|extmetadata|mime|size", iiurlwidth: "1600",
  });
  const i = (await api(u)).query?.pages?.[0]?.imageinfo?.[0];
  if (!i) return null;
  const m = i.extmetadata ?? {};
  return {
    file,
    url: i.thumburl ?? i.url,
    mime: i.mime,
    author: strip(m.Artist?.value) ?? "Unknown",
    licence: strip(m.LicenseShortName?.value) ?? "Unknown",
    licenceUrl: strip(m.LicenseUrl?.value),
    descriptionPage: i.descriptionurl,
  };
}

const exists = (p) => access(p).then(() => true, () => false);

const cities = await db.city.findMany({
  select: { slug: true, name: true, country: true },
  orderBy: { name: "asc" },
});
await db.$disconnect();

await mkdir(DEST, { recursive: true });
await mkdir(WORK, { recursive: true });

const credits = [];
const failed = [];

for (const city of cities) {
  const out = join(DEST, `${city.slug}.webp`);
  if (!FORCE && (await exists(out))) continue;

  try {
    const chosen = OVERRIDE[city.slug] ?? (await leadFile(TITLE[city.slug] ?? city.name));
    if (!chosen) throw new Error("no lead image");

    const info = await fileInfo(chosen);
    if (!info) throw new Error(`no imageinfo for ${chosen}`);
    if (!/^image\/(jpeg|png|webp)$/.test(info.mime)) throw new Error(`unusable type ${info.mime}`);

    const raw = join(WORK, `${city.slug}.orig`);
    await run("curl", ["-sL", "--max-time", "120", "-A", UA, "-o", raw, info.url]);

    const { stdout } = await run("sips", ["-g", "pixelWidth", "-g", "pixelHeight", raw]);
    const w = Number(stdout.match(/pixelWidth:\s*(\d+)/)?.[1]);
    const h = Number(stdout.match(/pixelHeight:\s*(\d+)/)?.[1]);
    if (!w || !h) throw new Error("not a readable image");

    // Cover: scale whichever axis would otherwise leave a gap, then centre-crop.
    const fit = join(WORK, `${city.slug}.fit`);
    const resize = w / h > W / H ? ["--resampleHeight", String(H)] : ["--resampleWidth", String(W)];
    await run("sips", [...resize, raw, "--out", fit]);
    await run("sips", ["-c", String(H), String(W), fit, "--out", fit]);
    await run("cwebp", ["-quiet", "-q", String(QUALITY), "-m", "6", fit, "-o", out]);

    credits.push({ ...city, ...info });
    console.log(`  ✓ ${city.slug.padEnd(16)} ${info.licence.padEnd(15)} ${info.file.replace("File:", "").slice(0, 44)}`);
  } catch (err) {
    failed.push(`${city.slug}: ${err.message}`);
    console.log(`  ✗ ${city.slug.padEnd(16)} ${err.message}`);
  }
}

await rm(WORK, { recursive: true, force: true });

// The credits file describes every shipped photo, so it is only rewritten when
// this run covered all of them — a partial run must not silently drop rows.
if (credits.length === cities.length) {
  const esc = (s) => String(s).replace(/\|/g, "\\|");
  const tally = {};
  for (const c of credits) tally[c.licence] = (tally[c.licence] ?? 0) + 1;
  const summary = Object.entries(tally).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${v} × ${k}`).join(" · ");

  await writeFile(
    join(process.cwd(), "docs", "IMAGE-CREDITS.md"),
    `# City photo credits

Every city photo in \`public/cities/\` comes from **Wikimedia Commons** under a
free licence. They are stored in the repository rather than hot-linked, so the
app keeps working with no network — and so a flaky connection can't blank 48
cards mid-demo.

Each file was fetched at 1600px, covered onto a ${W}×${H} frame and encoded as
WebP at quality ${QUALITY}. The originals are unmodified other than that resize
and centre-crop.

Regenerate with \`node scripts/build-city-images.mjs --force\`.

**Licences in use:** ${summary}.

Attribution is required by CC BY and CC BY-SA. If you add a city, add its photo
and its row here.

| City | Source file | Author | Licence |
|---|---|---|---|
${credits
  .map((c) => {
    const lic = c.licenceUrl ? `[${esc(c.licence)}](${c.licenceUrl})` : esc(c.licence);
    return `| ${esc(c.name)} | [${esc(c.file.replace("File:", ""))}](${c.descriptionPage}) | ${esc(c.author)} | ${lic} |`;
  })
  .join("\n")}
`,
  );
  console.log(`\nwrote docs/IMAGE-CREDITS.md — ${credits.length} entries`);
} else if (credits.length) {
  console.log(`\n${credits.length} rebuilt; docs/IMAGE-CREDITS.md left alone (run with --force to rewrite it)`);
} else {
  console.log("\nnothing to do — every city already has a photo (--force to rebuild)");
}

if (failed.length) {
  console.error(`\n${failed.length} failed:\n  ${failed.join("\n  ")}`);
  process.exit(1);
}
