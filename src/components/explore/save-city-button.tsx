"use client";

import * as React from "react";
import { Heart } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";

/** Save / unsave a destination. Optimistic, with a rollback on failure. */
export function SaveCityButton({
  cityId,
  cityName,
  saved: initial,
}: {
  cityId: string;
  cityName: string;
  saved: boolean;
}) {
  const [saved, setSaved] = React.useState(initial);
  const [busy, setBusy] = React.useState(false);

  async function toggle() {
    const next = !saved;
    setSaved(next);
    setBusy(true);

    try {
      if (next) await api.post("/me/saved-cities", { cityId });
      else await api.delete(`/me/saved-cities/${cityId}`);
      toast.success(next ? `Saved ${cityName}` : `Removed ${cityName}`);
    } catch {
      setSaved(!next); // api-client already surfaced the error
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      aria-pressed={saved}
      aria-label={saved ? `Remove ${cityName} from saved` : `Save ${cityName}`}
      className="flex items-center gap-2 rounded-[var(--radius-chip)] border border-line bg-ink/55 px-3.5 py-2 text-xs font-medium text-cloud backdrop-blur-sm transition-colors hover:border-line-strong"
    >
      <Heart className={cn("size-4 transition-colors", saved && "fill-ember text-ember")} />
      {saved ? "Saved" : "Save"}
    </button>
  );
}
