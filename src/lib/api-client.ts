import { toast } from "sonner";
import type { ApiErr, ApiMeta, ApiResponse } from "@/server/http/withApi";

/**
 * The only way client components talk to the API.
 *
 * It unwraps the envelope, throws a typed error carrying field messages so
 * forms can highlight the right input, and records `meta.ms` for the PerfPill.
 */

export class ApiError extends Error {
  readonly code: ApiErr["error"]["code"];
  readonly fields?: Record<string, string>;
  readonly details?: unknown;
  readonly status: number;

  constructor(payload: ApiErr["error"], status: number) {
    super(payload.message);
    this.name = "ApiError";
    this.code = payload.code;
    this.fields = payload.fields;
    this.details = payload.details;
    this.status = status;
  }
}

const BASE = "/api/v1";

/** Latest server-reported duration, read by the PerfPill. */
let lastMs = 0;
const perfListeners = new Set<(ms: number) => void>();

export function getLastMs() {
  return lastMs;
}

export function onPerf(listener: (ms: number) => void) {
  perfListeners.add(listener);
  return () => {
    perfListeners.delete(listener);
  };
}

function recordPerf(meta?: ApiMeta) {
  if (!meta?.ms) return;
  lastMs = meta.ms;
  for (const listener of perfListeners) listener(meta.ms);
}

type RequestOptions = {
  /** Pass an AbortController signal so typing cancels the previous search. */
  signal?: AbortSignal;
  /** Set false to handle the error yourself instead of showing a toast. */
  toastOnError?: boolean;
};

export type PagedResult<T> = { items: T[]; total: number; page: number; pageSize: number };

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  options: RequestOptions = {},
): Promise<{ data: T; meta?: ApiMeta }> {
  const response = await fetch(`${BASE}${path}`, {
    method,
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: options.signal,
  });

  let payload: ApiResponse<T>;
  try {
    payload = (await response.json()) as ApiResponse<T>;
  } catch {
    const error = new ApiError(
      { code: "INTERNAL", message: "The server sent something we couldn't read." },
      response.status,
    );
    if (options.toastOnError !== false) toast.error(error.message);
    throw error;
  }

  if (!payload.ok) {
    const error = new ApiError(payload.error, response.status);
    // Field-level problems are shown inline on the form, not as a toast.
    if (options.toastOnError !== false && !error.fields) toast.error(error.message);
    throw error;
  }

  recordPerf(payload.meta);
  return { data: payload.data, meta: payload.meta };
}

function query(params: Record<string, string | number | boolean | undefined | null>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }
  const s = search.toString();
  return s ? `?${s}` : "";
}

export const api = {
  async get<T>(path: string, options?: RequestOptions): Promise<T> {
    return (await request<T>("GET", path, undefined, options)).data;
  },

  /** GET a list endpoint and keep the pagination meta together with the rows. */
  async list<T>(path: string, options?: RequestOptions): Promise<PagedResult<T>> {
    const { data, meta } = await request<T[]>("GET", path, undefined, options);
    return {
      items: data,
      total: meta?.total ?? data.length,
      page: meta?.page ?? 1,
      pageSize: meta?.pageSize ?? data.length,
    };
  },

  async post<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return (await request<T>("POST", path, body ?? {}, options)).data;
  },

  async patch<T>(path: string, body: unknown, options?: RequestOptions): Promise<T> {
    return (await request<T>("PATCH", path, body, options)).data;
  },

  async delete<T>(path: string, options?: RequestOptions): Promise<T> {
    return (await request<T>("DELETE", path, undefined, options)).data;
  },

  async upload(file: File): Promise<{ url: string }> {
    const form = new FormData();
    form.append("file", file);

    const response = await fetch(`${BASE}/upload`, { method: "POST", body: form });
    const payload = (await response.json()) as ApiResponse<{ url: string }>;

    if (!payload.ok) {
      const error = new ApiError(payload.error, response.status);
      toast.error(error.message);
      throw error;
    }
    return payload.data;
  },

  query,
};

/** Pull a field error out of a caught error, for react-hook-form setError. */
export function fieldErrors(error: unknown): Record<string, string> | undefined {
  return error instanceof ApiError ? error.fields : undefined;
}

export function errorMessage(error: unknown, fallback = "Something went wrong."): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return fallback;
}
