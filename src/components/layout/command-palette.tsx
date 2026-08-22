"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Compass, LayoutDashboard, Map, MapPin, Plus, Search, Settings } from "lucide-react";
import { api } from "@/lib/api-client";
import { useDebounce } from "@/hooks/use-debounce";
import { useRemoteList } from "@/hooks/use-remote-list";
import type { CityDTO, TripDTO } from "@/server/dto";
import { formatDateRange } from "@/lib/dates";
import { cn } from "@/lib/utils";

/**
 * ⌘K palette. Searches the city catalogue and the user's own trips against the
 * real API — cmdk's built-in filtering is turned off so the trigram index does
 * the work, not the browser.
 *
 * The two searches are separate `useRemoteList` calls, which means they fire in
 * parallel and each aborts its own in-flight request as the query changes.
 */

const MIN_QUERY = 2;

const QUICK_LINKS = [
  { href: "/dashboard", label: "Go to Dashboard", icon: LayoutDashboard },
  { href: "/trips", label: "Go to My trips", icon: Map },
  { href: "/explore", label: "Explore destinations", icon: Compass },
  { href: "/trips/new", label: "Plan a new trip", icon: Plus },
  { href: "/settings", label: "Open settings", icon: Settings },
];

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const debounced = useDebounce(query, 150);

  const term = open && debounced.trim().length >= MIN_QUERY ? debounced.trim() : null;

  const cities = useRemoteList<CityDTO>(
    term ? `/cities${api.query({ q: term, pageSize: 5 })}` : null,
  );
  const trips = useRemoteList<TripDTO>(
    term ? `/trips${api.query({ q: term, pageSize: 4 })}` : null,
  );

  const loading = cities.loading || trips.loading;

  /** Clear the query on close so the palette always opens fresh. */
  function handleOpenChange(next: boolean) {
    if (!next) setQuery("");
    onOpenChange(next);
  }

  function go(href: string) {
    handleOpenChange(false);
    router.push(href);
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={handleOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="anim-overlay fixed inset-0 z-50 bg-ink-deep/80 backdrop-blur-sm" />
        <DialogPrimitive.Content
          className="anim-dialog fixed left-1/2 top-[18vh] z-50 w-[calc(100vw-2rem)] max-w-xl -translate-x-1/2 -translate-y-0 overflow-hidden rounded-[var(--radius-card)] border border-line bg-harbor shadow-[var(--lift-3)]"
          aria-describedby={undefined}
        >
          <DialogPrimitive.Title className="sr-only">Search GlobeTrotter</DialogPrimitive.Title>

          <Command shouldFilter={false} loop className="flex flex-col">
            <div className="flex items-center gap-3 border-b border-line px-4">
              <Search className="size-4 shrink-0 text-fog" aria-hidden />
              <Command.Input
                value={query}
                onValueChange={setQuery}
                placeholder="Search cities and your trips…"
                className="h-14 flex-1 bg-transparent text-sm text-cloud outline-none placeholder:text-fog-dim"
              />
              <kbd className="hidden rounded border border-line px-1.5 py-0.5 font-mono text-2xs text-fog-dim sm:block">
                ESC
              </kbd>
            </div>

            <Command.List className="max-h-[52vh] overflow-y-auto p-2">
              {term && !loading && cities.items.length === 0 && trips.items.length === 0 ? (
                <Command.Empty className="px-3 py-8 text-center text-sm text-fog">
                  Nothing matches “{query}”.
                </Command.Empty>
              ) : null}

              {trips.items.length > 0 ? (
                <Group heading="Your trips">
                  {trips.items.map((trip) => (
                    <Item key={trip.id} onSelect={() => go(`/trips/${trip.id}`)}>
                      <Map className="size-4 text-lagoon" aria-hidden />
                      <span className="trip-name flex-1 truncate">{trip.name}</span>
                      <span className="shrink-0 font-mono text-2xs text-fog-dim">
                        {formatDateRange(trip.startDate, trip.endDate)}
                      </span>
                    </Item>
                  ))}
                </Group>
              ) : null}

              {cities.items.length > 0 ? (
                <Group heading="Destinations">
                  {cities.items.map((city) => (
                    <Item key={city.id} onSelect={() => go(`/explore/${city.slug}`)}>
                      <MapPin className="size-4 text-solar" aria-hidden />
                      <span className="flex-1 truncate">{city.name}</span>
                      <span className="shrink-0 text-2xs text-fog-dim">{city.country}</span>
                    </Item>
                  ))}
                </Group>
              ) : null}

              {term === null ? (
                <Group heading="Jump to">
                  {QUICK_LINKS.map((link) => {
                    const Icon = link.icon;
                    return (
                      <Item key={link.href} onSelect={() => go(link.href)}>
                        <Icon className="size-4 text-fog" aria-hidden />
                        <span className="flex-1">{link.label}</span>
                      </Item>
                    );
                  })}
                </Group>
              ) : null}
            </Command.List>
          </Command>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function Group({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <Command.Group
      heading={heading}
      className="[&_[cmdk-group-heading]]:placard [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2"
    >
      {children}
    </Command.Group>
  );
}

function Item({ children, onSelect }: { children: React.ReactNode; onSelect: () => void }) {
  return (
    <Command.Item
      onSelect={onSelect}
      className={cn(
        "flex cursor-pointer items-center gap-3 rounded-[var(--radius-input)] px-3 py-2.5 text-sm text-fog",
        "data-[selected=true]:bg-deck data-[selected=true]:text-cloud",
      )}
    >
      {children}
    </Command.Item>
  );
}

/** Global ⌘K / Ctrl-K listener, shared by the top bar and the mobile header. */
export function useCommandPalette() {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((value) => !value);
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  return { open, setOpen };
}
