"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Breadcrumbs are derived from the URL, which keeps them correct without every
 * page having to declare them.
 *
 * Dynamic segments would otherwise read as "trips / clx8f2… / build", so a
 * page renders `<CrumbLabel value={trip.id} label={trip.name} />` to swap the
 * id for something a human recognises.
 */

type LabelMap = Record<string, string>;

const CrumbContext = React.createContext<{
  labels: LabelMap;
  setLabel: (value: string, label: string) => void;
}>({ labels: {}, setLabel: () => {} });

export function BreadcrumbProvider({ children }: { children: React.ReactNode }) {
  const [labels, setLabels] = React.useState<LabelMap>({});

  const setLabel = React.useCallback((value: string, label: string) => {
    setLabels((current) => (current[value] === label ? current : { ...current, [value]: label }));
  }, []);

  const contextValue = React.useMemo(() => ({ labels, setLabel }), [labels, setLabel]);

  return <CrumbContext.Provider value={contextValue}>{children}</CrumbContext.Provider>;
}

/** Renders nothing — it only teaches the breadcrumb bar a friendly label. */
export function CrumbLabel({ value, label }: { value: string; label: string }) {
  const { setLabel } = React.useContext(CrumbContext);

  React.useEffect(() => {
    setLabel(value, label);
  }, [value, label, setLabel]);

  return null;
}

/** Segments that are route groups or noise rather than places a user can go. */
const SKIP = new Set(["(app)", "(auth)", "(marketing)"]);

const STATIC_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  trips: "Trips",
  explore: "Explore",
  settings: "Settings",
  admin: "Admin",
  users: "Users",
  new: "New trip",
  build: "Builder",
  budget: "Budget",
  calendar: "Calendar",
};

export function Breadcrumbs({ className }: { className?: string }) {
  const pathname = usePathname();
  const { labels } = React.useContext(CrumbContext);

  const segments = pathname.split("/").filter((s) => s && !SKIP.has(s));

  const crumbs = segments.map((segment, index) => ({
    label: labels[segment] ?? STATIC_LABELS[segment] ?? titleCase(segment),
    href: `/${segments.slice(0, index + 1).join("/")}`,
    last: index === segments.length - 1,
  }));

  if (crumbs.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className={cn("min-w-0", className)}>
      <ol className="flex min-w-0 items-center gap-1 text-sm">
        {crumbs.map((crumb, index) => (
          <li key={crumb.href} className="flex min-w-0 items-center gap-1">
            {index > 0 ? (
              <ChevronRight className="size-3.5 shrink-0 text-fog-dim" aria-hidden />
            ) : null}

            {crumb.last ? (
              <span aria-current="page" className="truncate font-medium text-cloud">
                {crumb.label}
              </span>
            ) : (
              <Link
                href={crumb.href}
                className="truncate text-fog transition-colors hover:text-cloud"
              >
                {crumb.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

function titleCase(segment: string) {
  return segment
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
