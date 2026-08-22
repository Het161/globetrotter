"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Globe2, Link2, Lock, QrCode, Share2 } from "lucide-react";
import { toast } from "sonner";
import type { TripDTO } from "@/server/dto";
import { api, errorMessage } from "@/lib/api-client";
import { DeckButton } from "@/components/ui/deck-button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CollaboratorsPanel } from "./collaborators-panel";
import { routeCities } from "@/lib/trip-view";
import { formatDateRange } from "@/lib/dates";

/**
 * Share controls.
 *
 * Turning sharing off keeps the slug, so re-enabling restores the same URL and
 * a link someone already sent doesn't quietly break.
 *
 * The social buttons are plain intent URLs — no SDKs, no trackers, and they
 * degrade to "copy the link" when the browser has no native share sheet.
 */
export function SharePanel({
  trip,
  qrSvg,
  appUrl,
}: {
  trip: TripDTO;
  /** Pre-rendered on the server so the page works offline. */
  qrSvg: string | null;
  appUrl: string;
}) {
  const router = useRouter();
  const [isPublic, setIsPublic] = React.useState(trip.isPublic);
  const [slug, setSlug] = React.useState(trip.shareSlug);
  const [busy, setBusy] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  const shareUrl = slug ? `${appUrl}/s/${slug}` : null;
  const summary = `${trip.name} — ${routeCities(trip).join(" → ")}, ${formatDateRange(trip.startDate, trip.endDate)}`;

  async function toggle(next: boolean) {
    setBusy(true);
    try {
      const result = await api.post<{ isPublic: boolean; shareSlug: string | null }>(
        `/trips/${trip.id}/share`,
        { isPublic: next },
        { toastOnError: false },
      );

      setIsPublic(result.isPublic);
      setSlug(result.shareSlug);
      toast.success(result.isPublic ? "Trip is public" : "Trip is private again");
      router.refresh();
    } catch (error) {
      toast.error(errorMessage(error, "We couldn't change that."));
    } finally {
      setBusy(false);
    }
  }

  async function copyLink() {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast.success("Link copied");
    setTimeout(() => setCopied(false), 2000);
  }

  async function nativeShare() {
    if (!shareUrl) return;

    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({ title: trip.name, text: summary, url: shareUrl });
        return;
      } catch {
        // The user dismissed the sheet — not an error worth reporting.
        return;
      }
    }
    await copyLink();
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <DeckButton variant={trip.isPublic ? "lagoon" : "secondary"}>
          <Share2 />
          Share
        </DeckButton>
      </DialogTrigger>

      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Share this itinerary</DialogTitle>
          <DialogDescription>
            A public link is read-only. Anyone with it can copy the trip into their own
            account.
          </DialogDescription>
        </DialogHeader>

        {/* Public toggle */}
        <div className="flex items-center gap-3.5 rounded-[var(--radius-card)] border border-line bg-deck/40 p-3.5">
          <span
            className={`grid size-9 shrink-0 place-items-center rounded-full ${
              isPublic ? "bg-lagoon/15 text-lagoon" : "bg-deck text-fog"
            }`}
          >
            {isPublic ? <Globe2 className="size-4" /> : <Lock className="size-4" />}
          </span>

          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium text-cloud">
              {isPublic ? "Anyone with the link" : "Only you"}
            </span>
            <span className="mt-0.5 block text-xs text-fog">
              {isPublic
                ? `Seen ${trip.viewCount} ${trip.viewCount === 1 ? "time" : "times"}`
                : "Not shared yet"}
            </span>
          </span>

          <DeckButton
            size="sm"
            variant={isPublic ? "secondary" : "lagoon"}
            loading={busy}
            onClick={() => toggle(!isPublic)}
          >
            {isPublic ? "Make private" : "Make public"}
          </DeckButton>
        </div>

        {isPublic && shareUrl ? (
          <div className="mt-4 space-y-4">
            {/* Link */}
            <div className="flex items-center gap-2">
              <div className="flex min-w-0 flex-1 items-center gap-2 rounded-[var(--radius-input)] border border-line bg-deck px-3 py-2.5">
                <Link2 className="size-3.5 shrink-0 text-fog" aria-hidden />
                <span className="truncate font-mono text-xs text-lagoon">{shareUrl}</span>
              </div>

              <DeckButton
                size="icon"
                variant="secondary"
                onClick={copyLink}
                aria-label="Copy share link"
              >
                {copied ? <Check /> : <Copy />}
              </DeckButton>
            </div>

            {/* Intent links — no SDKs, nothing loaded from a third party. */}
            <div className="grid grid-cols-4 gap-2">
              <ShareTarget
                label="WhatsApp"
                href={`https://wa.me/?text=${encodeURIComponent(`${summary}\n${shareUrl}`)}`}
              />
              <ShareTarget
                label="X"
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(summary)}&url=${encodeURIComponent(shareUrl)}`}
              />
              <ShareTarget
                label="LinkedIn"
                href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`}
              />
              <button
                type="button"
                onClick={nativeShare}
                className="flex flex-col items-center gap-1.5 rounded-[var(--radius-input)] border border-line bg-deck/40 px-2 py-3 text-2xs text-fog transition-colors hover:border-line-strong hover:text-cloud"
              >
                <Share2 className="size-4" aria-hidden />
                More
              </button>
            </div>

            {/* QR */}
            {qrSvg ? (
              <details className="rounded-[var(--radius-card)] border border-line">
                <summary className="flex cursor-pointer items-center gap-2 px-3.5 py-2.5 text-sm text-fog transition-colors hover:text-cloud">
                  <QrCode className="size-4" aria-hidden />
                  Show QR code
                </summary>

                <div className="flex flex-col items-center gap-2 border-t border-line p-5">
                  <div
                    className="w-40 [&_svg]:size-full"
                    // Generated server-side by the qrcode package; the string is
                    // ours, not user input.
                    dangerouslySetInnerHTML={{ __html: qrSvg }}
                    role="img"
                    aria-label="QR code linking to this itinerary"
                  />
                  <p className="font-mono text-2xs text-fog-dim">Point a camera at it</p>
                </div>
              </details>
            ) : null}
          </div>
        ) : null}

        {/* Private sharing — nothing to do with the public link. */}
        <CollaboratorsPanel tripId={trip.id} />
      </DialogContent>
    </Dialog>
  );
}

function ShareTarget({ label, href }: { label: string; href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex flex-col items-center gap-1.5 rounded-[var(--radius-input)] border border-line bg-deck/40 px-2 py-3 text-2xs text-fog transition-colors hover:border-line-strong hover:text-cloud"
    >
      <span aria-hidden className="grid size-4 place-items-center font-semibold">
        {label[0]}
      </span>
      {label}
    </a>
  );
}
