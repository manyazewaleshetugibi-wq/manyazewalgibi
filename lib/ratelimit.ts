// lib/ratelimit.ts
import { NextRequest, NextResponse } from 'next/server';

// Helper to get client IP
function getClientIP(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
         req.headers.get('x-real-ip') || 
         'unknown';
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory store (use Redis in production)
const rateLimitStore = new Map<string, RateLimitEntry>();
const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS = 100; // Max requests per IP per window

export async function rateLimit(req: NextRequest): Promise<NextResponse | null> {
  const ip = getClientIP(req);
  const key = `ratelimit:${ip}`;
  const now = Date.now();
  
  // Get or create entry
  let entry = rateLimitStore.get(key);
  
  if (!entry || entry.resetTime < now) {
    // New window
    entry = {
      count: 1,
      resetTime: now + WINDOW_MS,
    };
    rateLimitStore.set(key, entry);
    return null;
  }
  
  // Increment count
  entry.count++;
  
  if (entry.count > MAX_REQUESTS) {
    // Rate limit exceeded
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
    
    return NextResponse.json(
      { 
        error: 'Too many requests', 
        retryAfter: retryAfter,
        message: `Rate limit exceeded. Please try again in ${retryAfter} seconds.`
      },
      { 
        status: 429,
        headers: {
          'Retry-After': String(retryAfter),
          'X-RateLimit-Limit': String(MAX_REQUESTS),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': new Date(entry.resetTime).toISOString(),
        },
      }
    );
  }
  
  // Update store
  rateLimitStore.set(key, entry);
  
  return null;
}

// Clean up expired entries periodically
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
      if (entry.resetTime < now) {
        rateLimitStore.delete(key);
      }
    }
  }, 60000); // Clean every minute
}