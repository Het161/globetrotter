/**
 * One error vocabulary for the whole server. Services throw these; `withApi`
 * is the only place that turns them into HTTP responses, and layouts turn
 * UnauthenticatedError into a redirect.
 */

export type ApiErrorCode =
  | "VALIDATION"
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMIT"
  | "INTERNAL";

export class AppError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;
  /** Field-level messages, keyed by form field name. */
  readonly fields?: Record<string, string>;
  /** Extra machine-readable payload — e.g. the stops that no longer fit. */
  readonly details?: unknown;

  constructor(
    code: ApiErrorCode,
    status: number,
    message: string,
    options: { fields?: Record<string, string>; details?: unknown } = {},
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = status;
    this.fields = options.fields;
    this.details = options.details;
  }
}

export class ValidationError extends AppError {
  constructor(message = "Please check the highlighted fields.", fields?: Record<string, string>) {
    super("VALIDATION", 400, message, { fields });
  }
}

export class UnauthenticatedError extends AppError {
  constructor(message = "Please sign in to continue.") {
    super("UNAUTHENTICATED", 401, message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "You don't have access to this.") {
    super("FORBIDDEN", 403, message);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "We couldn't find that.") {
    super("NOT_FOUND", 404, message);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: unknown) {
    super("CONFLICT", 409, message, { details });
  }
}

export class RateLimitError extends AppError {
  constructor(message = "Too many attempts. Try again in a minute.") {
    super("RATE_LIMIT", 429, message);
  }
}

export function isAppError(e: unknown): e is AppError {
  return e instanceof AppError;
}

/**
 * Turn a "not found" into `null` so a page can do:
 *
 *   const trip = await orNotFound(getTrip(id, user));
 *   if (!trip) notFound();
 *
 * Any other error still propagates to the error boundary. This keeps the
 * fetch inside the try and the JSX outside it — the React Compiler can't
 * memoise JSX constructed inside a try/catch, and lints against it.
 */
export async function orNotFound<T>(promise: Promise<T>): Promise<T | null> {
  try {
    return await promise;
  } catch (error) {
    if (isAppError(error) && error.code === "NOT_FOUND") return null;
    throw error;
  }
}
