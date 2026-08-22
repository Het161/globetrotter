"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import type { TripDTO } from "@/server/dto";
import { api, errorMessage } from "@/lib/api-client";
import { DeckButton } from "@/components/ui/deck-button";

/**
 * "Copy this trip" — clones the itinerary into the viewer's own account.
 *
 * If they aren't signed in we send them to login with `?next=` pointing back
 * here plus `copy=1`, so they land on this page and the copy fires
 * automatically. Losing someone's intent at a login wall is the easiest way to
 * lose them.
 */
export function CopyTripButton({
  slug,
  isSignedIn,
  className,
}: {
  slug: string;
  isSignedIn: boolean;
  className?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Arriving back from the login wall with ?copy=1 means the copy is already
  // under way, so the button starts in its busy state rather than an effect
  // flipping it there on the first commit.
  const autoCopy = isSignedIn && searchParams.get("copy") === "1";
  const [busy, setBusy] = React.useState(autoCopy);
  const autoRan = React.useRef(false);

  const copy = React.useCallback(async () => {
    try {
      const trip = await api.post<TripDTO>(`/share/${slug}/copy`, {}, { toastOnError: false });
      toast.success("Copied to your trips");
      router.push(`/trips/${trip.id}/build`);
    } catch (error) {
      toast.error(errorMessage(error, "We couldn't copy that trip."));
      setBusy(false);
    }
  }, [slug, router]);

  // Came back from signing in with copy=1 — finish what they started.
  React.useEffect(() => {
    if (!autoCopy || autoRan.current) return;
    autoRan.current = true;
    void copy();
  }, [autoCopy, copy]);

  function onClick() {
    if (!isSignedIn) {
      const next = encodeURIComponent(`/s/${slug}?copy=1`);
      router.push(`/login?next=${next}`);
      return;
    }
    setBusy(true);
    void copy();
  }

  return (
    <DeckButton
      variant="primary"
      size="lg"
      loading={busy}
      onClick={onClick}
      className={className}
      magnetic
    >
      <Copy />
      Copy this trip
    </DeckButton>
  );
}
