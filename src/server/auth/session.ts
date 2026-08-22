import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import type { Role } from "@prisma/client";
import { db } from "@/server/db";
import { ForbiddenError, UnauthenticatedError } from "@/server/http/errors";
import { toUserDTO, type UserDTO } from "@/server/dto";

export const SESSION_COOKIE = "gt_session";
const SESSION_DAYS = 7;

function secret(): Uint8Array {
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 24) {
    throw new Error("AUTH_SECRET is missing or too short — see .env.example");
  }
  return new TextEncoder().encode(value);
}

export type SessionClaims = { sub: string; email: string; role: Role };

export async function signSession(claims: SessionClaims): Promise<string> {
  return new SignJWT({ email: claims.email, role: claims.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(claims.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(secret());
}

export async function setSessionCookie(claims: SessionClaims) {
  const token = await signSession(claims);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

/**
 * Read the current user.
 *
 * Wrapped in React.cache so a page that calls it from a layout, a page and
 * three server components still verifies the JWT and hits the database once
 * per request.
 */
export const getSession = cache(async (): Promise<UserDTO | null> => {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ["HS256"] });
    if (!payload.sub) return null;

    // Hit the database rather than trusting the token body: a demoted admin or
    // a deleted account must stop working immediately, not in seven days.
    const user = await db.user.findUnique({ where: { id: payload.sub } });
    return user ? toUserDTO(user) : null;
  } catch {
    return null; // expired or tampered — treated as signed out
  }
});

/** For API routes: throws, and `withApi` turns it into a 401. */
export async function requireUser(): Promise<UserDTO> {
  const user = await getSession();
  if (!user) throw new UnauthenticatedError();
  return user;
}

export async function requireAdmin(): Promise<UserDTO> {
  const user = await requireUser();
  if (user.role !== "ADMIN") throw new ForbiddenError("Admin access only.");
  return user;
}
