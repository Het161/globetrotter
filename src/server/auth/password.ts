import bcrypt from "bcryptjs";

/** Cost 10 ≈ 60 ms on this hardware — slow enough to matter, fast enough to demo. */
const COST = 10;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, COST);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
