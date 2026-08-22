import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import { fontClassNames } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "GlobeTrotter — plan the route, know the cost",
    template: "%s · GlobeTrotter",
  },
  description:
    "Plan a multi-city trip, assign activities to days, watch the budget as you build, and share the finished itinerary.",
  applicationName: "GlobeTrotter",
};

export const viewport: Viewport = {
  themeColor: "#0A0E1A",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // `scroll-behavior: smooth` is set on <html> in globals.css. Next needs
    // this attribute to know that's deliberate, otherwise it warns and route
    // transitions animate their scroll instead of jumping.
    <html lang="en" className={fontClassNames} data-scroll-behavior="smooth">
      <body className="min-h-dvh bg-ink text-cloud antialiased">
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: "var(--color-harbor)",
              border: "1px solid var(--color-line-strong)",
              color: "var(--color-cloud)",
              fontFamily: "var(--font-ui)",
              borderRadius: "var(--radius-card)",
            },
          }}
        />
      </body>
    </html>
  );
}
