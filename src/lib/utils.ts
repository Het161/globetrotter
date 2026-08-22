import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind classes so later ones win instead of both landing in the DOM. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** "Tokyo, Kyoto, Osaka" -> "Tokyo → Kyoto → Osaka" */
export function routeLabel(names: string[]) {
  return names.join(" → ");
}

export function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

/** Clamp to a range — used by sliders, tilt angles and progress bars. */
export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function pluralize(n: number, one: string, many = `${one}s`) {
  return `${n} ${n === 1 ? one : many}`;
}

/** Stable pseudo-random in [0,1) from a string — deterministic decorative layout. */
export function hashUnit(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 100000) / 100000;
}

export function truncate(text: string, max: number) {
  return text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`;
}
