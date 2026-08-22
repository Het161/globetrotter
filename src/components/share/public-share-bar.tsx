"use client";

import * as React from "react";
import { Check, Link2, QrCode } from "lucide-react";
import { toast } from "sonner";
import { DeckButton } from "@/components/ui/deck-button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/menu";

/** Copy-link and QR, for people reading someone else's shared itinerary. */
export function PublicShareBar({
  url,
  title,
  qrSvg,
}: {
  url: string;
  title: string;
  qrSvg: string;
}) {
  const [copied, setCopied] = React.useState(false);

  async function copy() {
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        // Dismissed — fall through to the clipboard.
      }
    }

    await navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("Link copied");
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex shrink-0 items-center gap-2">
      <DeckButton
        variant="secondary"
        size="icon"
        onClick={copy}
        aria-label="Copy link to this itinerary"
      >
        {copied ? <Check /> : <Link2 />}
      </DeckButton>

      <Popover>
        <PopoverTrigger asChild>
          <DeckButton variant="secondary" size="icon" aria-label="Show QR code">
            <QrCode />
          </DeckButton>
        </PopoverTrigger>

        <PopoverContent side="top" align="end" className="w-52">
          <div
            className="mx-auto w-40 [&_svg]:size-full"
            // Rendered server-side by the qrcode package from our own URL.
            dangerouslySetInnerHTML={{ __html: qrSvg }}
            role="img"
            aria-label="QR code linking to this itinerary"
          />
          <p className="mt-2 text-center font-mono text-2xs text-fog-dim">
            Point a camera at it
          </p>
        </PopoverContent>
      </Popover>
    </div>
  );
}
