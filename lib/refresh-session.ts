// lib/refresh-session.ts
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

export async function refreshSessionIfNeeded(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  
  if (!token) return null;
  
  // Check if permissions need refresh
  const headers = new Headers(req.headers);
  const needsRefresh = headers.get('x-force-session-refresh') === 'true';
  
  if (needsRefresh) {
    // Force token refresh
    return NextResponse.next({
      request: { headers: new Headers(req.headers) },
    });
  }
  
  return null;
}