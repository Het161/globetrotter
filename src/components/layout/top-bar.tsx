"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, LogOut, Search, Settings, ShieldCheck, User } from "lucide-react";
import type { UserDTO } from "@/server/dto";
import { api } from "@/lib/api-client";
import { CURRENCIES } from "@/lib/currency";
import { Breadcrumbs } from "./breadcrumbs";
import { CommandPalette, useCommandPalette } from "./command-palette";
import { LogoMark } from "./logo";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/menu";
import { cn, initials } from "@/lib/utils";
import { toast } from "sonner";

/**
 * The 56 px top bar: breadcrumbs on the left, the ⌘K search trigger in the
 * middle, currency and account on the right. Present on every app screen so
 * the user always knows where they are and can always get out.
 */
export function TopBar({ user }: { user: UserDTO }) {
  const router = useRouter();
  const { open, setOpen } = useCommandPalette();
  const [currency, setCurrency] = React.useState(user.currency);
  const [savingCurrency, setSavingCurrency] = React.useState(false);

  async function changeCurrency(next: string) {
    if (next === currency) return;
    const previous = currency;
    setCurrency(next); // optimistic
    setSavingCurrency(true);

    try {
      await api.patch("/me", { currency: next });
      router.refresh();
    } catch {
      setCurrency(previous); // rollback; api-client already toasted
    } finally {
      setSavingCurrency(false);
    }
  }

  async function signOut() {
    await api.post("/auth/logout");
    toast.success("Signed out");
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-ink/80 px-4 backdrop-blur-xl sm:px-6">
        {/* The mark stands in for the rail on mobile, where the rail is hidden. */}
        <Link href="/dashboard" className="md:hidden" aria-label="GlobeTrotter home">
          <LogoMark size={22} />
        </Link>

        <Breadcrumbs className="flex-1 md:flex-none" />

        <button
          type="button"
          onClick={() => setOpen(true)}
          className={cn(
            "group ml-auto hidden h-9 items-center gap-2.5 rounded-[var(--radius-chip)] border border-line bg-deck/50 pl-3 pr-2 text-sm text-fog transition-colors md:flex md:w-64 lg:w-80",
            "hover:border-line-strong hover:text-cloud",
          )}
        >
          <Search className="size-4" aria-hidden />
          <span className="flex-1 text-left">Search…</span>
          <kbd className="rounded border border-line px-1.5 py-0.5 font-mono text-2xs text-fog-dim">
            ⌘K
          </kbd>
        </button>

        <button
          type="button"
          onClick={() => setOpen(true)}
          className="ml-auto grid size-9 place-items-center rounded-full text-fog transition-colors hover:bg-deck hover:text-cloud md:hidden"
          aria-label="Search"
        >
          <Search className="size-[18px]" />
        </button>

        {/* Currency picker — changes what every number on screen is shown in. */}
        <DropdownMenu>
          <DropdownMenuTrigger
            className="hidden h-9 items-center gap-1.5 rounded-[var(--radius-chip)] border border-line px-3 font-mono text-xs text-fog transition-colors hover:border-line-strong hover:text-cloud sm:flex"
            aria-label={`Display currency: ${currency}`}
            disabled={savingCurrency}
          >
            {currency}
            <ChevronDown className="size-3" aria-hidden />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="max-h-72 overflow-y-auto">
            <DropdownMenuLabel>Display currency</DropdownMenuLabel>
            {CURRENCIES.map((option) => (
              <DropdownMenuItem
                key={option.code}
                onSelect={() => changeCurrency(option.code)}
                className={cn(option.code === currency && "text-cloud")}
              >
                <span className="w-9 font-mono text-xs">{option.code}</span>
                <span className="flex-1">{option.label}</span>
                {option.code === currency ? <span className="text-lagoon">•</span> : null}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Account */}
        <DropdownMenu>
          <DropdownMenuTrigger
            className="grid size-9 shrink-0 place-items-center rounded-full border border-line bg-deck text-xs font-semibold text-cloud transition-colors hover:border-line-strong"
            aria-label="Account menu"
          >
            {user.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.avatarUrl} alt="" className="size-full rounded-full object-cover" />
            ) : (
              initials(user.name)
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-56">
            <div className="px-2.5 py-2">
              <p className="truncate text-sm font-medium text-cloud">{user.name}</p>
              <p className="truncate text-xs text-fog">{user.email}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/settings">
                <User />
                Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/settings">
                <Settings />
                Settings
              </Link>
            </DropdownMenuItem>
            {user.role === "ADMIN" ? (
              <DropdownMenuItem asChild>
                <Link href="/admin">
                  <ShieldCheck />
                  Admin
                </Link>
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuSeparator />
            <DropdownMenuItem destructive onSelect={signOut}>
              <LogOut />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <CommandPalette open={open} onOpenChange={setOpen} />
    </>
  );
}
