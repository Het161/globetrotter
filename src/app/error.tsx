"use client";

import { useEffect } from "react";
import { RotateCcw } from "lucide-react";
import { DeckButton } from "@/components/ui/deck-button";
import { RouteDoodle } from "@/components/ui/empty-state";

/**
 * The app-wide error boundary. It says what happened and offers the one action
 * that usually helps, rather than showing a stack trace to a traveller.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app] render error", error);
  }, [error]);

  return (
    <div className="grid min-h-[70dvh] place-items-center px-5">
      <div className="max-w-md text-center">
        <RouteDoodle className="mx-auto mb-6" />

        <h1 className="font-display text-3xl font-medium text-cloud">
          That leg didn&apos;t connect
        </h1>
        <p className="mt-2.5 text-sm text-fog text-pretty">
          Something went wrong loading this screen. Trying again usually sorts it.
        </p>

        {error.digest ? (
          <p className="mt-4 font-mono text-2xs text-fog-dim">Reference {error.digest}</p>
        ) : null}

        <DeckButton variant="primary" className="mt-7" onClick={reset}>
          <RotateCcw />
          Try again
        </DeckButton>
      </div>
    </div>
  );
}
