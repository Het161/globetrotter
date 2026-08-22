"use client";

import * as React from "react";
import { useReducedMotion as useMotionReducedMotion } from "motion/react";

/**
 * Returns false on initial SSR/hydration render so server & client HTML match,
 * then updates to actual prefers-reduced-motion state after mount.
 */
export function useSafeReducedMotion(): boolean {
  const reduceMotion = useMotionReducedMotion();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  return mounted ? Boolean(reduceMotion) : false;
}
