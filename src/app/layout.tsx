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
    <html lang="en" className={fontClassNames}>
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
