"use client";

import * as React from "react";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Form primitives.
 *
 * Every input is wired to its label and, when invalid, to its error message
 * through aria-describedby — so a screen reader hears the problem, not just a
 * red border.
 */

export function Field({
  label,
  hint,
  error,
  required,
  className,
  children,
  htmlFor,
}: {
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
  htmlFor?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      {label ? (
        <label
          htmlFor={htmlFor}
          className="flex items-baseline justify-between text-xs font-semibold tracking-[0.02em] text-fog"
        >
          <span>
            {label}
            {required ? <span className="ml-0.5 text-ember/80">*</span> : null}
          </span>
          {hint ? <span className="text-2xs font-normal text-fog-dim">{hint}</span> : null}
        </label>
      ) : null}

      {children}

      {error ? (
        <p
          id={htmlFor ? `${htmlFor}-error` : undefined}
          role="alert"
          className="flex items-start gap-1.5 text-xs text-ember"
        >
          <AlertCircle className="mt-px size-3.5 shrink-0" aria-hidden />
          <span>{error}</span>
        </p>
      ) : null}
    </div>
  );
}

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }
>(function Input({ className, invalid, id, ...props }, ref) {
  return (
    <input
      ref={ref}
      id={id}
      aria-invalid={invalid || undefined}
      aria-describedby={invalid && id ? `${id}-error` : undefined}
      className={cn("field", className)}
      {...props}
    />
  );
});

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }
>(function Textarea({ className, invalid, id, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      id={id}
      aria-invalid={invalid || undefined}
      aria-describedby={invalid && id ? `${id}-error` : undefined}
      className={cn("field min-h-24 resize-y", className)}
      {...props}
    />
  );
});

export const NativeSelect = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }
>(function NativeSelect({ className, invalid, id, children, ...props }, ref) {
  return (
    <div className="relative">
      <select
        ref={ref}
        id={id}
        aria-invalid={invalid || undefined}
        className={cn(
          "field cursor-pointer appearance-none pr-9",
          // The native arrow is unstyleable, so we draw our own.
          "bg-[image:linear-gradient(45deg,transparent_50%,var(--color-fog)_50%),linear-gradient(135deg,var(--color-fog)_50%,transparent_50%)]",
          "bg-[position:calc(100%-16px)_calc(50%+2px),calc(100%-11px)_calc(50%+2px)]",
          "bg-[size:5px_5px,5px_5px] bg-no-repeat",
          className,
        )}
        {...props}
      >
        {children}
      </select>
    </div>
  );
});

/**
 * Money input. Displays the user's currency symbol inside the field, and hands
 * the raw number to the caller — conversion to USD happens on submit.
 */
export const MoneyInput = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { symbol: string; invalid?: boolean }
>(function MoneyInput({ className, symbol, invalid, id, ...props }, ref) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono text-sm text-fog">
        {symbol}
      </span>
      <input
        ref={ref}
        id={id}
        type="number"
        inputMode="decimal"
        min={0}
        step="0.01"
        aria-invalid={invalid || undefined}
        aria-describedby={invalid && id ? `${id}-error` : undefined}
        className={cn("field pl-8 font-mono tabular-nums", className)}
        {...props}
      />
    </div>
  );
});

/** A labelled fieldset used to group settings blocks. */
export function FieldGroup({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("surface p-5 sm:p-6", className)}>
      <header className="mb-5">
        <h2 className="text-lg font-medium text-cloud">{title}</h2>
        {description ? <p className="mt-1 text-sm text-fog">{description}</p> : null}
      </header>
      {children}
    </section>
  );
}
