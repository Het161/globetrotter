"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { TooltipProvider } from "@/components/ui/menu";
import { Backdrop } from "@/components/ui/backdrop";
import { CurrencyProvider } from "@/hooks/use-currency";
import type { UserDTO } from "@/server/dto";
import { BreadcrumbProvider } from "./breadcrumbs";
import { MobileTabs } from "./mobile-tabs";
import { Rail } from "./rail";
import { TopBar } from "./top-bar";

/**
 * The frame every signed-in screen sits inside: rail, top bar, mobile tabs,
 * and the working-screen backdrop.
 *
 * Route changes fade and rise, via a **CSS** animation keyed on the pathname.
 *
 * This used to be `AnimatePresence mode="wait"` wrapping a `motion.div`. That
 * mode withholds the incoming page until the outgoing one finishes animating
 * out — so anything that stops the exit from completing leaves the shell up
 * with a completely blank content area, recoverable only by a full reload. It
 * happened in real use across every route.
 *
 * A CSS animation cannot fail that way. It is declarative, it never gates
 * mounting, and `animation-fill-mode: both` guarantees it settles at
 * opacity 1 even if the main thread is busy. The reduced-motion block in
 * globals.css collapses it to nothing. The exit animation is gone, which costs
 * a 4 px cross-fade nobody could see and removes an entire class of failure.
 */
export function AppShell({
  user,
  children,
}: {
  user: UserDTO;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <CurrencyProvider currency={user.currency}>
      <TooltipProvider delayDuration={300}>
        <BreadcrumbProvider>
          <Backdrop variant="working" />

          {/* First tab stop: jump past the rail and top bar. */}
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-[var(--radius-input)] focus:border focus:border-lagoon focus:bg-harbor focus:px-4 focus:py-2.5 focus:text-sm focus:text-cloud"
          >
            Skip to content
          </a>

          <Rail user={user} />

          <div className="md:pl-[72px]">
            <TopBar user={user} />

            <main
              id="main"
              className="mx-auto min-h-[calc(100dvh-3.5rem)] w-full max-w-[1440px] px-4 pb-24 pt-6 sm:px-6 md:pb-10 lg:px-8"
            >
              {/* Keyed on the pathname so the entrance replays per route.
                  Nothing gates the children being mounted. */}
              <div key={pathname} className="gt-page-in">
                {children}
              </div>
            </main>
          </div>

          <MobileTabs user={user} />
        </BreadcrumbProvider>
      </TooltipProvider>
    </CurrencyProvider>
  );
}
