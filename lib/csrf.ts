// lib/csrf.ts
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

const CSRF_COOKIE = 'csrf-token';
const CSRF_HEADER = 'x-csrf-token';

// Generate CSRF token
export function generateCSRFToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Set CSRF cookie
export function setCSRFCookie(response: NextResponse): void {
  const token = generateCSRFToken();
  response.cookies.set(CSRF_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24, // 24 hours
  });
}

// Validate CSRF token
export function validateCSRF(req: NextRequest): boolean {
  // Skip for GET/HEAD/OPTIONS
  const method = req.method;
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    return true;
  }
  
  // Skip for API routes that don't need CSRF
  if (req.nextUrl.pathname.startsWith('/api/auth')) {
    return true;
  }
  
  const cookieToken = req.cookies.get(CSRF_COOKIE)?.value;
  const headerToken = req.headers.get(CSRF_HEADER);
  
  if (!cookieToken || !headerToken) {
    return false;
  }
  
  return crypto.timingSafeEqual(
    Buffer.from(cookieToken),
    Buffer.from(headerToken)
  );
}

// CSRF middleware
export async function csrfProtection(req: NextRequest): Promise<NextResponse | null> {
  const method = req.method;
  
  // Only check mutating methods
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    return null;
  }
  
  // Skip auth routes
  if (req.nextUrl.pathname.startsWith('/api/auth')) {
    return null;
  }
  
  if (!validateCSRF(req)) {
    return NextResponse.json(
      { error: 'Invalid CSRF token' },
      { status: 403 }
    );
  }
  
  return null;
}

// Middleware to add CSRF token to responses
export function addCSRFToken(response: NextResponse): void {
  const existing = response.cookies.get(CSRF_COOKIE);
  if (!existing) {
    setCSRFCookie(response);
  }
}