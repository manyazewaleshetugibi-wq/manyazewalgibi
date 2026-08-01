import { auth } from "@/auth";
import { NextResponse } from "next/server";

export async function getSessionUser() {
  const session = await auth();
  return session?.user ?? null;
}

export function isRole(role: unknown, allowed: string[]): boolean {
  return allowed.includes(String(role || "").toLowerCase());
}

export function unauthorized(
  message = "Authentication required"
): NextResponse {
  return NextResponse.json(
    { success: false, message, error: "UNAUTHORIZED" },
    { status: 401 }
  );
}

export function forbidden(
  message = "Access denied for your role"
): NextResponse {
  return NextResponse.json(
    { success: false, message, error: "FORBIDDEN" },
    { status: 403 }
  );
}

export async function requireAuth(): Promise<{
  user: any | null;
  response: NextResponse | null;
}> {
  const user = await getSessionUser();
  if (!user) return { user: null, response: unauthorized() };
  return { user, response: null };
}

export async function requireRole(
  allowed: string[]
): Promise<{ user: any | null; response: NextResponse | null }> {
  const { user, response } = await requireAuth();
  if (response) return { user, response };
  if (!isRole(user?.role, allowed)) {
    return { user, response: forbidden() };
  }
  return { user, response: null };
}

export async function requireAdmin(): Promise<{
  user: any | null;
  response: NextResponse | null;
}> {
  return requireRole(["admin"]);
}
