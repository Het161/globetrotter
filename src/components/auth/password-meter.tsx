"use client";

import { cn } from "@/lib/utils";

/**
 * Four segments that fill as the password gets stronger.
 *
 * The rules match the zod schema exactly — showing a green bar for a password
 * the server will reject would be worse than showing nothing.
 */

const CHECKS: { label: string; test: (value: string) => boolean }[] = [
  { label: "8 characters", test: (v) => v.length >= 8 },
  { label: "a letter", test: (v) => /[A-Za-z]/.test(v) },
  { label: "a number", test: (v) => /[0-9]/.test(v) },
  { label: "12+ characters", test: (v) => v.length >= 12 },
];

const TONE = [
  "bg-ember",
  "bg-ember",
  "bg-solar",
  "bg-lagoon",
] as const;

const LABEL = ["Too short", "Weak", "Good", "Strong"] as const;

export function PasswordMeter({ password }: { password: string }) {
  if (!password) return null;

  const passed = CHECKS.filter((check) => check.test(password)).length;
  const missing = CHECKS.slice(0, 3).filter((check) => !check.test(password));

  return (
    <div className="space-y-1.5" aria-live="polite">
      <div className="flex gap-1.5">
        {CHECKS.map((_, index) => (
          <span
            key={index}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors duration-240",
              index < passed ? TONE[passed - 1] : "bg-deck",
            )}
          />
        ))}
      </div>

      <p className="text-xs text-fog">
        {LABEL[Math.max(0, passed - 1)]}
        {missing.length > 0 ? (
          <span className="text-fog-dim"> · still needs {missing.map((c) => c.label).join(", ")}</span>
        ) : null}
      </p>
    </div>
  );
}
