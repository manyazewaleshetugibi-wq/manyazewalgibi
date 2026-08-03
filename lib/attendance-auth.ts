import { createHmac, timingSafeEqual } from "crypto";
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";

const TOKEN_SECRET =
  process.env.CLOCKIN_TOKEN_SECRET ||
  process.env.NEXTAUTH_SECRET ||
  "dev-secret";
const TOKEN_TTL_MS = 10 * 60 * 1000;

export function createClockinToken(userId: string): string {
  const payload = JSON.stringify({ u: userId, exp: Date.now() + TOKEN_TTL_MS });
  const b64 = Buffer.from(payload).toString("base64url");
  const sig = createHmac("sha256", TOKEN_SECRET)
    .update(b64)
    .digest("base64url");
  return `${b64}.${sig}`;
}

export function verifyClockinToken(token: string): string | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return null;
    const [b64, sig] = parts;
    const expected = createHmac("sha256", TOKEN_SECRET)
      .update(b64)
      .digest("base64url");
    const sigBuf = Buffer.from(sig);
    const expBuf = Buffer.from(expected);
    if (sigBuf.length !== expBuf.length) return null;
    if (!timingSafeEqual(sigBuf, expBuf)) return null;
    const payload = JSON.parse(Buffer.from(b64, "base64url").toString("utf8"));
    if (typeof payload.u !== "string" || typeof payload.exp !== "number")
      return null;
    if (Date.now() > payload.exp) return null;
    return payload.u;
  } catch {
    return null;
  }
}

export async function verifyAttendanceIdentity(
  request: NextRequest,
  token: string | null | undefined,
  userId: string
): Promise<boolean> {
  if (token) {
    const provenUserId = verifyClockinToken(token);
    return provenUserId !== null && provenUserId === userId;
  }
  try {
    const session = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });
    return Boolean(session?.id && String(session.id) === userId);
  } catch {
    return false;
  }
}

export function clientIp(request: NextRequest): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return request.headers.get("x-real-ip") || "unknown";
}

type RateEntry = { count: number; resetAt: number };
const rateStore = new Map<string, RateEntry>();

export function rateLimit(
  key: string,
  max: number,
  windowMs: number
): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now();
  let entry = rateStore.get(key);
  if (!entry || entry.resetAt < now) {
    entry = { count: 0, resetAt: now + windowMs };
    rateStore.set(key, entry);
  }
  entry.count++;
  if (entry.count > max) {
    return {
      allowed: false,
      retryAfterSec: Math.ceil((entry.resetAt - now) / 1000),
    };
  }
  return { allowed: true, retryAfterSec: 0 };
}

export function checkRateLimit(
  request: NextRequest,
  max: number,
  windowMs: number
): { allowed: boolean; retryAfterSec: number } {
  return rateLimit(clientIp(request), max, windowMs);
}
