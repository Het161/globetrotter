import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Every screen opens the same way: a small placard, a display-face title, one
 * line of context, and the primary action on the right.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
  children,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <header className={cn("mb-6 sm:mb-8", className)}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          {eyebrow ? <p className="placard mb-2">{eyebrow}</p> : null}
          <h1 className="font-display text-3xl font-medium tracking-[-0.02em] text-cloud sm:text-4xl">
            {title}
          </h1>
          {description ? (
            <p className="mt-2 max-w-2xl text-sm text-fog text-pretty">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </div>
      {children}
    </header>
  );
}

/** A hairline section divider with a placard label sitting on it. */
export function SectionLabel({
  children,
  action,
  className,
}: {
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-4 flex items-center gap-4", className)}>
      <h2 className="placard shrink-0">{children}</h2>
      <span aria-hidden className="h-px flex-1 bg-line" />
      {action}
    </div>
  );
}
