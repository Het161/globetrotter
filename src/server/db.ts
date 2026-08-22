import { PrismaClient } from "@prisma/client";

/**
 * Next.js hot-reloads modules in dev, so a plain `new PrismaClient()` would
 * leak a new connection pool on every save. Stash it on globalThis instead.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
