import localFont from "next/font/local";

/**
 * Three type roles, three files, all served from `public/fonts` so the app
 * needs no network at runtime.
 *
 * `adjustFontFallback` generates a metric-matched fallback face, which is what
 * stops the headline reflowing when the real font arrives.
 */

/** Display — Fraunces. Hero headlines, trip names (italic), day numerals. */
export const fontDisplay = localFont({
  src: [
    {
      path: "../../public/fonts/Fraunces-Variable.woff2",
      weight: "300 700",
      style: "normal",
    },
    {
      path: "../../public/fonts/Fraunces-Italic-Variable.woff2",
      weight: "300 700",
      style: "italic",
    },
  ],
  variable: "--gt-font-display",
  display: "swap",
  adjustFontFallback: "Times New Roman",
  fallback: ["Georgia", "Times New Roman", "serif"],
});

/** UI — Manrope. Every piece of interface text. */
export const fontUI = localFont({
  src: [{ path: "../../public/fonts/Manrope-Variable.woff2", weight: "400 800", style: "normal" }],
  variable: "--gt-font-ui",
  display: "swap",
  adjustFontFallback: "Arial",
  fallback: ["ui-sans-serif", "system-ui", "-apple-system", "sans-serif"],
});

/** Data — JetBrains Mono. Every number that means something. */
export const fontMono = localFont({
  src: [
    { path: "../../public/fonts/JetBrainsMono-Variable.woff2", weight: "400 700", style: "normal" },
  ],
  variable: "--gt-font-mono",
  display: "swap",
  adjustFontFallback: false,
  fallback: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
});

export const fontClassNames = [fontDisplay.variable, fontUI.variable, fontMono.variable].join(" ");
