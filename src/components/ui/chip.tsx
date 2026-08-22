import * as React from "react";
import type { ActivityCategory, TripStatus } from "@prisma/client";
import { cn } from "@/lib/utils";

/** Chips carry one idea each. Status chips are filled; everything else outlines. */

export function Chip({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span className={cn("chip text-fog", className)} {...props}>
      {children}
    </span>
  );
}

/* -------------------------------------------------------------------------- */

const STATUS_STYLE: Record<TripStatus, { label: string; className: string }> = {
  PLANNING: {
    label: "Planning",
    className: "border-fog/25 bg-fog/10 text-fog",
  },
  UPCOMING: {
    label: "Upcoming",
    className: "border-lagoon/35 bg-lagoon/12 text-lagoon",
  },
  ONGOING: {
    label: "Ongoing",
    className: "border-solar/40 bg-solar/12 text-solar",
  },
  COMPLETED: {
    label: "Completed",
    className: "border-cloud/15 bg-cloud/[0.06] text-cloud/55",
  },
};

export function StatusChip({ status, className }: { status: TripStatus; className?: string }) {
  const style = STATUS_STYLE[status];
  return (
    <span className={cn("chip", style.className, className)}>
      <span
        aria-hidden
        className="size-1.5 rounded-full bg-current"
        // Ongoing trips are the only ones that pulse — they are happening now.
        style={status === "ONGOING" ? { animation: "pulse-dot 2.4s var(--ease-deck) infinite" } : undefined}
      />
      {style.label}
    </span>
  );
}

/* -------------------------------------------------------------------------- */

const CATEGORY_LABEL: Record<ActivityCategory, string> = {
  SIGHTSEEING: "Sightseeing",
  FOOD: "Food",
  CULTURE: "Culture",
  ADVENTURE: "Adventure",
  NATURE: "Nature",
  NIGHTLIFE: "Nightlife",
  SHOPPING: "Shopping",
  RELAXATION: "Relaxation",
};

export function categoryLabel(category: ActivityCategory) {
  return CATEGORY_LABEL[category];
}

export const ACTIVITY_CATEGORIES = Object.keys(CATEGORY_LABEL) as ActivityCategory[];

export function CategoryChip({
  category,
  className,
}: {
  category: ActivityCategory | null;
  className?: string;
}) {
  if (!category) {
    return <span className={cn("chip border-dashed border-fog/25 text-fog/70", className)}>Custom</span>;
  }
  return (
    <span className={cn("chip border-cloud/12 text-fog", className)}>
      {CATEGORY_LABEL[category]}
    </span>
  );
}

/* -------------------------------------------------------------------------- */

/** A toggleable filter chip — used by the region and category filter rows. */
export function FilterChip({
  active,
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(
        "chip cursor-pointer",
        active
          ? "border-lagoon/45 bg-lagoon/15 text-lagoon"
          : "border-cloud/10 text-fog hover:border-cloud/25 hover:text-cloud",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

/* -------------------------------------------------------------------------- */

/**
 * Budget state, shown as colour AND text — colour is never the only signal.
 */
export function BudgetChip({
  status,
  children,
  className,
}: {
  status: "under" | "near" | "over";
  children: React.ReactNode;
  className?: string;
}) {
  const style = {
    under: "border-lagoon/35 bg-lagoon/10 text-lagoon",
    near: "border-solar/35 bg-solar/10 text-solar",
    over: "border-ember/40 bg-ember/12 text-ember",
  }[status];

  return <span className={cn("chip tnum", style, className)}>{children}</span>;
}
