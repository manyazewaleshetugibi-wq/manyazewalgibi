// lib/refresh-session.ts
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

export async function refreshSessionIfNeeded(req: NextRequest): Promise<NextResponse | null> {
  const token = await getToken({ 
    req, 
    secret: process.env.NEXTAUTH_SECRET 
  });
  
  if (!token) {
    // No token, check if session exists in cookie
    const sessionCookie = req.cookies.get('next-auth.session-token');
    if (sessionCookie) {
      // Token might be expired, but we don't force logout
      // NextAuth will handle this
    }
    return null;
  }
  
  // Check if token needs refresh (expires in less than 15 minutes)
  const expiresAt = token.exp as number || 0;
  const now = Math.floor(Date.now() / 1000);
  const timeToExpiry = expiresAt - now;
  
  if (timeToExpiry < 900) { // Less than 15 minutes
    // Force token refresh by redirecting to auth callback
    // This is handled by NextAuth's built-in refresh
    const response = NextResponse.next();
    // Add header to indicate session should be refreshed
    response.headers.set('x-session-refresh-needed', 'true');
    return response;
  }
  
  return null;
}

// Helper to check if session is valid
export function isSessionValid(token: any): boolean {
  if (!token) return false;
  const expiresAt = token.exp as number || 0;
  const now = Math.floor(Date.now() / 1000);
  return expiresAt > now;
}

// Helper to get session expiry time
export function getSessionExpiry(token: any): number | null {
  if (!token) return null;
  return token.exp as number || null;
}