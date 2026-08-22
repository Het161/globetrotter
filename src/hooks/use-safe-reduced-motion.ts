"use client";

import * as React from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

/**
 * `prefers-reduced-motion`, without a hydration mismatch.
 *
 * The server has no media queries, so it cannot know the answer. Rendering the
 * real value on the client's first pass would therefore disagree with the HTML
 * the server sent, and React would discard it. This renders `false` — motion
 * allowed — on the server and during hydration, then switches to the real value
 * immediately afterwards.
 *
 * `useSyncExternalStore` is doing the work rather than a `mounted` flag set from
 * an effect: it takes a server snapshot as a first-class argument, so there is
 * no synchronous setState inside an effect for the React Compiler to object to.
 * It also subscribes, so someone changing the OS setting while the page is open
 * is picked up — a mounted flag only ever reads the value once.
 */
export function useSafeReducedMotion(): boolean {
  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

function subscribe(onStoreChange: () => void): () => void {
  const query = window.matchMedia(QUERY);
  query.addEventListener("change", onStoreChange);
  return () => query.removeEventListener("change", onStoreChange);
}

function getSnapshot(): boolean {
  return window.matchMedia(QUERY).matches;
}

/** Also the hydration value, which is the entire point of this hook. */
function getServerSnapshot(): boolean {
  return false;
}
