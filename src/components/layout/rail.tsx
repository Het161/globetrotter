"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { Compass, LayoutDashboard, Map, Settings, ShieldCheck } from "lucide-react";
import type { UserDTO } from "@/server/dto";
import { LogoMark } from "./logo";
import { Hint } from "@/components/ui/menu";
import { cn, initials } from "@/lib/utils";

/**
 * The 72 px icon rail. Desktop only — below 768 px it is replaced by
 * MobileTabs.
 *
 * The active item is marked by a Lagoon bar that slides between entries with a
 * shared layoutId, so navigation reads as one continuous element moving rather
 * than two things blinking.
 */

export type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/trips", label: "Trips", icon: Map },
  { href: "/explore", label: "Explore", icon: Compass },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/admin", label: "Admin", icon: ShieldCheck, adminOnly: true },
];

export function useNavItems(user: UserDTO) {
  return React.useMemo(
    () => NAV_ITEMS.filter((item) => !item.adminOnly || user.role === "ADMIN"),
    [user.role],
  );
}

export function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Rail({ user }: { user: UserDTO }) {
  const pathname = usePathname();
  const items = useNavItems(user);

  return (
    <aside
      className="fixed inset-y-0 left-0 z-40 hidden w-[72px] flex-col items-center border-r border-line bg-harbor/70 backdrop-blur-xl md:flex"
      aria-label="Main"
    >
      <Link
        href="/dashboard"
        className="grid h-14 place-items-center transition-transform hover:scale-105"
        aria-label="GlobeTrotter home"
      >
        <LogoMark size={26} />
      </Link>

      <div className="h-px w-8 bg-line" />

      <nav className="flex flex-1 flex-col items-center gap-1.5 py-4">
        {items.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;

          return (
            <Hint key={item.href} label={item.label} side="right">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative grid size-11 place-items-center rounded-[var(--radius-input)] transition-colors",
                  active ? "text-cloud" : "text-fog hover:bg-deck/70 hover:text-cloud",
                )}
              >
                {active ? (
                  <>
                    {/* The travelling marker. */}
                    <motion.span
                      layoutId="rail-active"
                      className="absolute inset-0 rounded-[var(--radius-input)] bg-deck"
                      transition={{ type: "spring", stiffness: 380, damping: 32 }}
                    />
                    <motion.span
                      layoutId="rail-active-bar"
                      className="absolute -left-[13px] h-6 w-[3px] rounded-r-full bg-lagoon"
                      transition={{ type: "spring", stiffness: 380, damping: 32 }}
                    />
                  </>
                ) : null}
                <Icon className="relative size-[19px]" />
                <span className="sr-only">{item.label}</span>
              </Link>
            </Hint>
          );
        })}
      </nav>

      <Hint label={user.name} side="right">
        <Link
          href="/settings"
          className="mb-4 grid size-9 place-items-center rounded-full border border-line bg-deck text-xs font-semibold text-cloud transition-colors hover:border-line-strong"
        >
          {user.avatarUrl ? (
            // Avatars are user uploads of unknown dimensions; a plain img keeps
            // this simple and they are never above the fold.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.avatarUrl}
              alt=""
              className="size-full rounded-full object-cover"
            />
          ) : (
            initials(user.name)
          )}
          <span className="sr-only">Your account</span>
        </Link>
      </Hint>
    </aside>
  );
}
