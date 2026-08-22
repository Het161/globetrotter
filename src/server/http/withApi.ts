import { NextRequest, NextResponse } from "next/server";
import { ZodError, type z, type ZodTypeAny } from "zod";
import { AppError, isAppError } from "./errors";

/* -------------------------------------------------------------------------- */
/* Envelope                                                                   */
/* -------------------------------------------------------------------------- */

export type ApiMeta = { page?: number; pageSize?: number; total?: number; ms: number };

export type ApiOk<T> = { ok: true; data: T; meta?: ApiMeta };

export type ApiErr = {
  ok: false;
  error: {
    code: AppError["code"];
    message: string;
    fields?: Record<string, string>;
    details?: unknown;
  };
};

export type ApiResponse<T> = ApiOk<T> | ApiErr;

/** Wrap a payload so a handler can also return pagination meta. */
export class ApiResult<T> {
  constructor(
    readonly data: T,
    readonly meta?: Omit<ApiMeta, "ms">,
  ) {}
}

export function withMeta<T>(data: T, meta: Omit<ApiMeta, "ms">) {
  return new ApiResult(data, meta);
}

/* -------------------------------------------------------------------------- */
/* withApi                                                                    */
/* -------------------------------------------------------------------------- */

type RouteContext = { params: Promise<Record<string, string | string[]>> };

type HandlerArgs<TInput> = {
  input: TInput;
  req: NextRequest;
  params: Record<string, string>;
};

type Handler<TInput, TOut> = (args: HandlerArgs<TInput>) => Promise<TOut>;

type RouteHandler = (req: NextRequest, ctx?: RouteContext) => Promise<NextResponse>;

/**
 * The single entry point for every route handler.
 *
 * It does four things and nothing else:
 *   1. parses input (query string for GET/DELETE, JSON body otherwise) with zod
 *   2. calls the handler
 *   3. turns AppError subclasses into the error envelope
 *   4. stamps `Server-Timing: app;dur=<ms>` so the PerfPill can show real numbers
 */
export function withApi<S extends ZodTypeAny | null>(
  schema: S,
  // The handler sees the schema's *output* type, which matters:
  // `page: z.coerce.number().default(1)` is optional going in and guaranteed
  // coming out. Passing `null` gives the handler no input at all.
  handler: Handler<S extends ZodTypeAny ? z.output<S> : undefined, unknown>,
): RouteHandler {
  return async (req: NextRequest, ctx?: RouteContext) => {
    const started = performance.now();

    try {
      const params = ctx ? normalizeParams(await ctx.params) : {};
      const input = schema ? schema.parse(await readInput(req)) : undefined;
      const result = await handler({ input, req, params });

      const ms = round(performance.now() - started);
      const unwrapped = result instanceof ApiResult ? result.data : result;
      const extraMeta = result instanceof ApiResult ? result.meta : undefined;

      return json({ ok: true, data: unwrapped, meta: { ...extraMeta, ms } }, 200, ms);
    } catch (error) {
      const ms = round(performance.now() - started);
      return json(toErrorEnvelope(error), statusFor(error), ms);
    }
  };
}

/** GET/DELETE carry input in the query string; everything else in a JSON body. */
async function readInput(req: NextRequest): Promise<unknown> {
  if (req.method === "GET" || req.method === "DELETE") {
    return Object.fromEntries(req.nextUrl.searchParams.entries());
  }
  const text = await req.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    throw new AppError("VALIDATION", 400, "The request body wasn't valid JSON.");
  }
}

function normalizeParams(raw: Record<string, string | string[]>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    out[key] = Array.isArray(value) ? (value[0] ?? "") : value;
  }
  return out;
}

export function toErrorEnvelope(error: unknown): ApiErr {
  if (error instanceof ZodError) {
    const fields: Record<string, string> = {};
    for (const issue of error.issues) {
      const key = issue.path.join(".") || "_";
      if (!fields[key]) fields[key] = issue.message;
    }
    return {
      ok: false,
      error: {
        code: "VALIDATION",
        message: "Please check the highlighted fields.",
        fields,
      },
    };
  }

  if (isAppError(error)) {
    return {
      ok: false,
      error: {
        code: error.code,
        message: error.message,
        fields: error.fields,
        details: error.details,
      },
    };
  }

  // Anything unexpected is logged server-side and generalised for the client.
  console.error("[api] unhandled", error);
  return {
    ok: false,
    error: { code: "INTERNAL", message: "Something went wrong on our side. Try again." },
  };
}

function statusFor(error: unknown): number {
  if (error instanceof ZodError) return 400;
  if (isAppError(error)) return error.status;
  return 500;
}

function json<T>(body: ApiResponse<T>, status: number, ms: number) {
  return NextResponse.json(body, {
    status,
    headers: { "Server-Timing": `app;dur=${ms}` },
  });
}

function round(ms: number) {
  return Math.round(ms * 100) / 100;
}
