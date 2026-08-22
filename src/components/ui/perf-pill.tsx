"use client";

import * as React from "react";
import { Zap } from "lucide-react";
import { getLastMs, onPerf } from "@/lib/api-client";
import { cn } from "@/lib/utils";

/**
 * PerfPill — shows the server-reported duration of the last API call, read
 * from the `Server-Timing`-backed `meta.ms` in the response envelope.
 *
 * These are real measurements, not decoration: it is how we demonstrate the
 * performance budget in §12 live during the demo. Hidden unless
 * NEXT_PUBLIC_SHOW_PERF=1.
 */

export function PerfPill({
  initialMs,
  label = "server",
  className,
}: {
  initialMs?: number;
  label?: string;
  className?: string;
}) {
  const enabled = process.env.NEXT_PUBLIC_SHOW_PERF === "1";
  const [ms, setMs] = React.useState<number | null>(initialMs ?? null);

  React.useEffect(() => {
    if (!enabled) return;
    const last = getLastMs();
    if (last) setMs(last);
    return onPerf(setMs);
  }, [enabled]);

  if (!enabled || ms === null) return null;

  // Colour follows the §12 budget: under 50 ms is on target.
  const tone = ms < 50 ? "text-lagoon" : ms < 200 ? "text-solar" : "text-ember";

  return (
    <span
      title={`Last ${label} response: ${ms} ms`}
      className={cn(
        "chip border-cloud/10 bg-deck/60 font-mono text-2xs tabular-nums",
        tone,
        className,
      )}
    >
      <Zap className="size-3" aria-hidden />
      {ms < 1 ? "<1" : Math.round(ms)} ms
    </span>
  );
}
