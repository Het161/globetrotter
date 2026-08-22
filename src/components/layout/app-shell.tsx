"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
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
 * Route changes fade and rise 6 px. That is deliberately the cheapest possible
 * transition — the builder and budget screens are dense, and anything longer
 * starts to feel like waiting.
 */
export function AppShell({
  user,
  children,
}: {
  user: UserDTO;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();

  return (
    <CurrencyProvider currency={user.currency}>
      <TooltipProvider delayDuration={300}>
        <BreadcrumbProvider>
          <Backdrop variant="working" />

          <Rail user={user} />

          <div className="md:pl-[72px]">
            <TopBar user={user} />

            <main
              id="main"
              className="mx-auto min-h-[calc(100dvh-3.5rem)] w-full max-w-[1440px] px-4 pb-24 pt-6 sm:px-6 md:pb-10 lg:px-8"
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={pathname}
                  initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduceMotion ? undefined : { opacity: 0, y: -4 }}
                  transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                >
                  {children}
                </motion.div>
              </AnimatePresence>
            </main>
          </div>

          <MobileTabs user={user} />
        </BreadcrumbProvider>
      </TooltipProvider>
    </CurrencyProvider>
  );
}
