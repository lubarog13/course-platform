import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

/** Формат совместим с prisma/seed.ts: `scrypt:<salt>:<key>` */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const key = scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${key}`;
}

export function verifyPassword(password: string, passwordHash: string): boolean {
  const [algo, salt, key] = passwordHash.split(":");
  if (algo !== "scrypt" || !salt || !key) return false;

  const hashed = scryptSync(password, salt, 64);
  const expected = Buffer.from(key, "hex");
  if (hashed.length !== expected.length) return false;

  return timingSafeEqual(hashed, expected);
}
