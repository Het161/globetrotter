import { createHash, randomBytes } from "node:crypto";

/**
 * Password reset tokens: the raw token goes in the URL, only its SHA-256 hash
 * is stored. A leaked database row therefore can't be used to reset anything.
 */

export const RESET_TOKEN_TTL_MINUTES = 30;

export function createResetToken() {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: hashToken(token) };
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function resetTokenExpiry(): Date {
  return new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60_000);
}
