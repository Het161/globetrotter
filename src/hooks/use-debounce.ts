"use client";

import * as React from "react";

/**
 * Hold a value still until the user stops changing it.
 *
 * 150 ms is the default because that is the search delay the performance
 * budget assumes (§12) — long enough to stop a request per keystroke, short
 * enough that results feel instant.
 */
export function useDebounce<T>(value: T, delayMs = 150): T {
  const [debounced, setDebounced] = React.useState(value);

  React.useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
