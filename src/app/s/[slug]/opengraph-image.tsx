import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { getPublicTrip } from "@/server/services/share";
import { formatMoney } from "@/lib/currency";
import { formatDateRange } from "@/lib/dates";

/**
 * The social preview card, rendered locally.
 *
 * Fonts are read off disk and the route is an inline SVG polyline, so this
 * needs no network at all — which is the point of §1.5.
 *
 * Note the .ttf files: satori (what `next/og` renders with) cannot read WOFF2,
 * so the OG card uses TrueType copies of the same two families the app serves
 * as WOFF2 to browsers.
 */

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "GlobeTrotter itinerary";

const INK = "#0A0E1A";
const CLOUD = "#F2EEE3";
const FOG = "#9AA3B5";
const SOLAR = "#F5B62B";
const LAGOON = "#36D6C3";

async function loadFont(file: string) {
  return readFile(join(process.cwd(), "public", "fonts", file));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  let trip;
  let total = "";
  try {
    const data = await getPublicTrip(slug);
    trip = data.trip;
    total = formatMoney(data.budget.total, "USD", { decimals: false });
  } catch {
    // A missing or private trip still gets a valid, on-brand card.
    trip = null;
  }

  const [display, mono] = await Promise.all([
    loadFont("Fraunces-Italic.ttf"),
    loadFont("JetBrainsMono.ttf"),
  ]);

  const cities = trip?.stops.map((stop) => stop.city.name) ?? [];
  const route = cities.length > 1 ? cities : ["GlobeTrotter"];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: `linear-gradient(135deg, ${INK} 0%, #121829 60%, #1A2238 100%)`,
          padding: 72,
          fontFamily: "Mono",
        }}
      >
        {/* Wordmark */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 14,
              height: 14,
              borderRadius: 999,
              background: SOLAR,
              display: "flex",
            }}
          />
          <div style={{ color: FOG, fontSize: 20, letterSpacing: 4, display: "flex" }}>
            GLOBETROTTER
          </div>
        </div>

        {/* Title + route */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontFamily: "Display",
              fontStyle: "italic",
              fontSize: trip && trip.name.length > 28 ? 68 : 86,
              color: CLOUD,
              lineHeight: 1.05,
              display: "flex",
            }}
          >
            {trip?.name ?? "Itinerary not found"}
          </div>

          <div
            style={{
              marginTop: 26,
              fontSize: 30,
              color: CLOUD,
              display: "flex",
              flexWrap: "wrap",
            }}
          >
            {route.map((city, index) => (
              <div key={index} style={{ display: "flex" }}>
                <span>{city}</span>
                {index < route.length - 1 ? (
                  <span style={{ color: LAGOON, margin: "0 14px" }}>→</span>
                ) : null}
              </div>
            ))}
          </div>

          {/* The route motif, as a simple polyline. */}
          <svg width="600" height="40" viewBox="0 0 600 40" style={{ marginTop: 30 }}>
            <path
              d="M10 30 Q150 2 300 20 T590 10"
              stroke={LAGOON}
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
            />
            {[10, 300, 590].map((cx, i) => (
              <circle key={cx} cx={cx} cy={[30, 20, 10][i]} r="7" fill={LAGOON} />
            ))}
          </svg>
        </div>

        {/* Facts */}
        <div
          style={{
            display: "flex",
            width: "100%",
            justifyContent: "space-between",
            alignItems: "flex-end",
          }}
        >
          {trip ? (
            <>
              <Fact label="DATES" value={formatDateRange(trip.startDate, trip.endDate)} />
              <Fact
                label="LENGTH"
                value={`${trip.summary?.nights ?? 0} nights · ${trip.stops.length} stops`}
              />
              <Fact label="ESTIMATED TOTAL" value={total} accent />
            </>
          ) : (
            <Fact label="PLAN THE ROUTE" value="Know the cost. Share the story." />
          )}
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Display", data: display, style: "italic", weight: 500 },
        { name: "Mono", data: mono, style: "normal", weight: 400 },
      ],
    },
  );
}

function Fact({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  // Satori sizes these columns from the label rather than the value, so the
  // width is set explicitly — otherwise a long date range spills into the
  // column beside it.
  return (
    <div style={{ display: "flex", flexDirection: "column", width: 336, flexShrink: 0 }}>
      <div
        style={{ fontSize: 17, letterSpacing: 3, color: FOG, display: "flex", whiteSpace: "nowrap" }}
      >
        {label}
      </div>
      <div
        style={{
          marginTop: 10,
          fontSize: 26,
          color: accent ? SOLAR : CLOUD,
          display: "flex",
          whiteSpace: "nowrap",
        }}
      >
        {value}
      </div>
    </div>
  );
}
