import { Redis } from '@upstash/redis';

// Simple in-memory rate limiter (use Redis for production)
interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const store: RateLimitStore = {};

export async function rateLimit(
  identifier: string,
  key: string,
  maxRequests: number = 100,
  windowSeconds: number = 60
): Promise<{ success: boolean; remaining?: number; resetTime?: number }> {
  const cacheKey = `${key}:${identifier}`;
  const now = Date.now();
  const windowMs = windowSeconds * 1000;

  // Clean up expired entries
  for (const [key, value] of Object.entries(store)) {
    if (value.resetTime < now) {
      delete store[key];
    }
  }

  const current = store[cacheKey];
  
  if (!current) {
    store[cacheKey] = {
      count: 1,
      resetTime: now + windowMs,
    };
    return { success: true, remaining: maxRequests - 1, resetTime: now + windowMs };
  }

  if (current.resetTime < now) {
    store[cacheKey] = {
      count: 1,
      resetTime: now + windowMs,
    };
    return { success: true, remaining: maxRequests - 1, resetTime: now + windowMs };
  }

  if (current.count >= maxRequests) {
    return { success: false, resetTime: current.resetTime };
  }

  current.count += 1;
  return { success: true, remaining: maxRequests - current.count, resetTime: current.resetTime };
}