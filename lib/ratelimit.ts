// lib/ratelimit.ts - UPDATED with route-specific limits
import { NextRequest, NextResponse } from 'next/server';
import { getClientIP } from './ip-utils';

interface RateLimitEntry {
  count: number;
  resetTime: number;
  blockedUntil?: number;
}

// In-memory store with TTL cleanup
const rateLimitStore = new Map<string, RateLimitEntry>();

// Configuration
const DEFAULT_WINDOW_MS = 60 * 1000; // 1 minute
const DEFAULT_MAX_REQUESTS = 100; // Max requests per IP per window
const BLOCK_DURATION_MS = 30 * 60 * 1000; // 30 minutes block for abuse
const BLOCK_THRESHOLD = 300; // If >300 requests in window, block

// ✅ Route-specific rate limits
const ROUTE_LIMITS: Record<string, { max: number; window: number }> = {
  '/api/auth': { max: 20, window: 60000 }, // 20 per minute for auth
  '/api/users': { max: 50, window: 60000 }, // 50 per minute for users
  '/api/admin': { max: 30, window: 60000 }, // 30 per minute for admin
  '/api/items': { max: 100, window: 60000 }, // 100 per minute for items
  '/expenses': { max: 30, window: 60000 }, // 30 per minute for expenses
  '/dashboard': { max: 60, window: 60000 }, // 60 per minute for dashboard
  '/pos': { max: 100, window: 60000 }, // 100 per minute for POS
  '/orders': { max: 80, window: 60000 }, // 80 per minute for orders
  '/stock': { max: 50, window: 60000 }, // 50 per minute for stock
  '/login': { max: 10, window: 60000 }, // 10 per minute for login
};

// Cleanup expired entries every 30 seconds
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
      if (entry.resetTime < now && (!entry.blockedUntil || entry.blockedUntil < now)) {
        rateLimitStore.delete(key);
      }
    }
  }, 30000);
}

export async function rateLimit(req: NextRequest): Promise<NextResponse | null> {
  const ip = getClientIP(req);
  const pathname = req.nextUrl.pathname;
  
  // Check for localhost in development
  if (process.env.NODE_ENV === 'development' && (ip === '::1' || ip === '127.0.0.1' || ip === 'localhost')) {
    // Skip rate limiting for localhost in development
    return null;
  }
  
  const key = `ratelimit:${ip}:${pathname}`;
  const now = Date.now();
  
  // Get route-specific limits
  let maxRequests = DEFAULT_MAX_REQUESTS;
  let windowMs = DEFAULT_WINDOW_MS;
  
  for (const [route, config] of Object.entries(ROUTE_LIMITS)) {
    if (pathname.startsWith(route)) {
      maxRequests = config.max;
      windowMs = config.window;
      break;
    }
  }
  
  // Get or create entry
  let entry = rateLimitStore.get(key);
  
  // Check if IP is currently blocked for this route
  if (entry?.blockedUntil && entry.blockedUntil > now) {
    const retryAfter = Math.ceil((entry.blockedUntil - now) / 1000);
    return NextResponse.json(
      { 
        error: 'IP temporarily blocked', 
        retryAfter: retryAfter,
        message: `Too many requests to ${pathname}. Blocked for ${Math.ceil(retryAfter / 60)} minutes.`,
      },
      { 
        status: 429,
        headers: {
          'Retry-After': String(retryAfter),
          'X-RateLimit-Limit': String(maxRequests),
          'X-RateLimit-Remaining': '0',
        },
      }
    );
  }
  
  if (!entry || entry.resetTime < now) {
    // New window
    entry = {
      count: 1,
      resetTime: now + windowMs,
    };
    rateLimitStore.set(key, entry);
    return null;
  }
  
  // Increment count
  entry.count++;
  
  // Check if threshold exceeded for blocking
  if (entry.count > BLOCK_THRESHOLD) {
    entry.blockedUntil = now + BLOCK_DURATION_MS;
    rateLimitStore.set(key, entry);
    
    // Log this attack
    console.log(`🚨 Attack detected: ${ip} made ${entry.count} requests to ${pathname}`);
    
    return NextResponse.json(
      { 
        error: 'IP blocked for excessive requests', 
        retryAfter: Math.ceil(BLOCK_DURATION_MS / 1000),
        message: `Excessive requests detected to ${pathname}. Blocked for 30 minutes.`,
      },
      { 
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil(BLOCK_DURATION_MS / 1000)),
          'X-RateLimit-Limit': String(maxRequests),
          'X-RateLimit-Remaining': '0',
        },
      }
    );
  }
  
  if (entry.count > maxRequests) {
    // Rate limit exceeded
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
    
    rateLimitStore.set(key, entry);
    
    return NextResponse.json(
      { 
        error: 'Too many requests', 
        retryAfter: retryAfter,
        message: `Rate limit exceeded for ${pathname}. Try again in ${retryAfter} seconds.`,
      },
      { 
        status: 429,
        headers: {
          'Retry-After': String(retryAfter),
          'X-RateLimit-Limit': String(maxRequests),
          'X-RateLimit-Remaining': String(Math.max(0, maxRequests - entry.count)),
          'X-RateLimit-Reset': new Date(entry.resetTime).toISOString(),
        },
      }
    );
  }
  
  // Update store
  rateLimitStore.set(key, entry);
  
  return null;
}

// Admin function to clear rate limit for an IP
export function clearRateLimit(ip: string): void {
  const keysToDelete: string[] = [];
  for (const key of rateLimitStore.keys()) {
    if (key.includes(ip)) {
      keysToDelete.push(key);
    }
  }
  keysToDelete.forEach(key => rateLimitStore.delete(key));
}

// Get rate limit status for an IP
export function getRateLimitStatus(ip: string): { count: number; remaining: number; resetTime: number } | null {
  const entry = rateLimitStore.get(`ratelimit:${ip}`);
  if (!entry) return null;
  return {
    count: entry.count,
    remaining: Math.max(0, DEFAULT_MAX_REQUESTS - entry.count),
    resetTime: entry.resetTime,
  };
}