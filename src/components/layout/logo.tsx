import { cn } from "@/lib/utils";

/**
 * The mark: a meridian globe with a Lagoon route arcing across it and a Solar
 * dot where the trip starts. It is the same two-colour idea as the rest of the
 * app — route in Lagoon, the thing that costs money in Solar.
 */
export function LogoMark({ className, size = 28 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={cn("shrink-0", className)}
      aria-hidden
    >
      <circle cx="16" cy="16" r="13" stroke="var(--color-cloud)" strokeOpacity="0.42" strokeWidth="1.4" />
      {/* Meridians — just enough to read as a globe at 20 px. */}
      <ellipse cx="16" cy="16" rx="6" ry="13" stroke="var(--color-cloud)" strokeOpacity="0.26" strokeWidth="1.1" />
      <path d="M3.4 16h25.2" stroke="var(--color-cloud)" strokeOpacity="0.26" strokeWidth="1.1" />

      {/* The route. */}
      <path
        d="M7 21C11 9.5 21.5 8 26 12.5"
        stroke="var(--color-lagoon)"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
      <circle cx="7" cy="21" r="2.4" fill="var(--color-solar)" />
      <circle cx="26" cy="12.5" r="1.8" fill="var(--color-lagoon)" />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "font-display text-[17px] font-semibold tracking-[-0.03em] text-cloud",
        className,
      )}
    >
      Globe<span className="text-solar">Trotter</span>
    </span>
  );
}

export function Logo({ className, showWord = true }: { className?: string; showWord?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      {showWord ? <Wordmark /> : null}
    </span>
  );
}
