import "server-only";
import { db } from "@/server/db";
import { toUserDTO, type UserDTO } from "@/server/dto";
import { NotFoundError, ValidationError } from "@/server/http/errors";
import { hashPassword, verifyPassword } from "@/server/auth/password";
import { createResetToken, hashToken, resetTokenExpiry } from "@/server/auth/tokens";
import type { LoginInput, SignupInput } from "@/lib/validators/auth";
import type { ChangePasswordInput, UpdateProfileInput } from "@/lib/validators/profile";
import { sendSignupEmails } from "@/server/email";
import { logEvent } from "./analytics";

export async function signup(input: SignupInput): Promise<UserDTO> {
  const existing = await db.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw new ValidationError("That email is already registered.", {
      email: "That email is already registered.",
    });
  }

  const user = await db.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash: await hashPassword(input.password),
    },
  });

  logEvent("signup", { userId: user.id });

  // Welcome to them, notification to the owner. Neither is awaited: the account
  // exists at this point, so nothing about SMTP should be able to change what
  // the caller gets back.
  sendSignupEmails({
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
  });

  return toUserDTO(user);
}

/**
 * Deliberately generic on failure: telling the caller whether the email exists
 * turns the login form into an account-enumeration oracle.
 */
export async function login(input: LoginInput): Promise<UserDTO> {
  const user = await db.user.findUnique({ where: { email: input.email } });
  const failure = new ValidationError("Email or password is incorrect.");

  if (!user) {
    // Hash anyway so a missing account doesn't answer measurably faster.
    await hashPassword(input.password);
    throw failure;
  }

  const valid = await verifyPassword(input.password, user.passwordHash);
  if (!valid) throw failure;

  logEvent("login", { userId: user.id });
  return toUserDTO(user);
}

/* -------------------------------------------------------------------------- */
/* Password reset                                                             */
/* -------------------------------------------------------------------------- */

/**
 * There is no email provider in this build, so the caller gets the reset URL
 * back in development and shows it in a dev banner. In production the URL is
 * simply not returned.
 */
export async function requestPasswordReset(email: string): Promise<{ devResetUrl?: string }> {
  const user = await db.user.findUnique({ where: { email } });
  if (!user) return {}; // same response either way — no enumeration

  const { token, tokenHash } = createResetToken();

  await db.passwordResetToken.create({
    data: { userId: user.id, tokenHash, expiresAt: resetTokenExpiry() },
  });

  if (process.env.NODE_ENV === "production") return {};

  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return { devResetUrl: `${base}/reset-password/${token}` };
}

export async function resetPassword(token: string, password: string): Promise<UserDTO> {
  const record = await db.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });

  const invalid = new ValidationError("This reset link has expired or already been used.");
  if (!record || record.usedAt || record.expiresAt < new Date()) throw invalid;

  const [user] = await db.$transaction([
    db.user.update({
      where: { id: record.userId },
      data: { passwordHash: await hashPassword(password) },
    }),
    db.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
    // Any other outstanding link for this account is now void.
    db.passwordResetToken.updateMany({
      where: { userId: record.userId, usedAt: null },
      data: { usedAt: new Date() },
    }),
  ]);

  return toUserDTO(user);
}

/* -------------------------------------------------------------------------- */
/* Profile                                                                    */
/* -------------------------------------------------------------------------- */

export async function updateProfile(
  userId: string,
  input: UpdateProfileInput,
): Promise<UserDTO> {
  if (input.email) {
    const clash = await db.user.findUnique({ where: { email: input.email } });
    if (clash && clash.id !== userId) {
      throw new ValidationError("That email is already registered.", {
        email: "That email is already registered.",
      });
    }
  }

  const user = await db.user.update({
    where: { id: userId },
    data: {
      name: input.name,
      email: input.email,
      avatarUrl: input.avatarUrl === undefined ? undefined : input.avatarUrl,
      language: input.language,
      currency: input.currency,
    },
  });

  return toUserDTO(user);
}

export async function changePassword(userId: string, input: ChangePasswordInput) {
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError("Account not found.");

  const valid = await verifyPassword(input.currentPassword, user.passwordHash);
  if (!valid) {
    throw new ValidationError("That isn't your current password.", {
      currentPassword: "That isn't your current password.",
    });
  }

  await db.user.update({
    where: { id: userId },
    data: { passwordHash: await hashPassword(input.password) },
  });

  return { ok: true };
}

export async function deleteAccount(userId: string) {
  await db.user.delete({ where: { id: userId } }); // cascades trips, stops, saves
  return { id: userId };
}
