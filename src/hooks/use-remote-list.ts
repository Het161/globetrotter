"use client";

import * as React from "react";
import { api, type PagedResult } from "@/lib/api-client";

/**
 * The one place the app fetches a filtered list from the browser.
 *
 * Eight screens and sheets need the same behaviour — refetch whenever a filter
 * changes, aborting the request already in flight so a burst of keystrokes
 * costs one query rather than one per letter. Writing that eight times invites
 * eight subtly different versions of it.
 *
 * Pass the fully-built URL; its identity is the dependency, so the caller
 * controls exactly when a refetch happens. Pass `null` to fetch nothing —
 * that's how closed sheets stay idle.
 *
 * `initial` is for screens the server already rendered: the first fetch for
 * that exact URL is skipped, because the data is already on screen.
 */
export function useRemoteList<T>(
  path: string | null,
  initial?: { items: T[]; total: number },
): PagedResult<T> & { loading: boolean } {
  const serverRenderedPath = React.useRef(initial ? path : null);

  const [state, setState] = React.useState({
    items: initial?.items ?? [],
    total: initial?.total ?? 0,
    page: 1,
    pageSize: initial?.items.length ?? 0,
    // With no server-rendered data, the first real fetch is already coming.
    loading: !initial && path !== null,
  });

  React.useEffect(() => {
    if (path === null) return;
    if (path === serverRenderedPath.current) return;

    const controller = new AbortController();
    setState((current) => (current.loading ? current : { ...current, loading: true }));

    api
      .list<T>(path, { signal: controller.signal })
      .then((result) => {
        setState({
          items: result.items,
          total: result.total,
          page: result.page,
          pageSize: result.pageSize,
          loading: false,
        });
      })
      .catch(() => {
        // Aborted because the user kept typing, or offline. Either way the
        // previous results stay on screen rather than blanking out.
        setState((current) => ({ ...current, loading: false }));
      });

    return () => controller.abort();
  }, [path]);

  return state;
}
