"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { UserDTO } from "@/server/dto";
import { isActive, useNavItems } from "./rail";
import { cn } from "@/lib/utils";

/**
 * Below 768 px the rail becomes a bottom tab bar. Same items, same active
 * logic — it sits in the thumb zone and respects the home-indicator inset.
 */
export function MobileTabs({ user }: { user: UserDTO }) {
  const pathname = usePathname();
  const items = useNavItems(user);

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-harbor/90 backdrop-blur-xl md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="flex">
        {items.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;

          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors",
                  active ? "text-cloud" : "text-fog",
                )}
              >
                {active ? (
                  <span
                    aria-hidden
                    className="absolute inset-x-5 top-0 h-[2px] rounded-b-full bg-lagoon"
                  />
                ) : null}
                <Icon className="size-[18px]" />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
