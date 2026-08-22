import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Every empty state is one line of direction plus one action — and the
 * illustration is a fragment of the route motif, not a stock drawing.
 */

export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "surface flex flex-col items-center justify-center px-6 py-14 text-center",
        className,
      )}
    >
      <RouteDoodle className="mb-5" />
      <h3 className="text-lg font-medium text-cloud">{title}</h3>
      {description ? (
        <p className="mt-1.5 max-w-sm text-sm text-fog text-pretty">{description}</p>
      ) : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}

/** A tiny unfinished route — three stops and a dashed leg going nowhere yet. */
export function RouteDoodle({ className }: { className?: string }) {
  return (
    <svg
      width="112"
      height="40"
      viewBox="0 0 112 40"
      fill="none"
      className={cn("opacity-70", className)}
      aria-hidden
    >
      <path
        d="M8 30 Q28 6 48 20 T88 14"
        stroke="var(--color-lagoon)"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.5"
      />
      <path
        d="M88 14 L104 10"
        stroke="var(--color-lagoon)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeDasharray="3 4"
        opacity="0.35"
      />
      {[
        [8, 30],
        [48, 20],
        [88, 14],
      ].map(([cx, cy]) => (
        <g key={`${cx}-${cy}`}>
          <circle cx={cx} cy={cy} r="5" fill="var(--color-lagoon)" opacity="0.15" />
          <circle cx={cx} cy={cy} r="2.5" fill="var(--color-lagoon)" />
        </g>
      ))}
      <circle cx="104" cy="10" r="2" fill="var(--color-lagoon)" opacity="0.35" />
    </svg>
  );
}
