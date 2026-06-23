// lib/ip-blocklist.ts
import { NextRequest, NextResponse } from 'next/server';

// Helper to get client IP
function getClientIP(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
         req.headers.get('x-real-ip') || 
         'unknown';
}

interface BlockedIP {
  until: number;
  reason: string;
}

// In-memory store (use MongoDB/Redis in production)
const BLOCKLIST = new Map<string, BlockedIP>();
const FAILED_ATTEMPTS = new Map<string, { count: number; firstAttempt: number }>();

const MAX_FAILED_ATTEMPTS = 10;
const BLOCK_DURATION = 60 * 60 * 1000; // 1 hour
const FAILED_ATTEMPT_WINDOW = 15 * 60 * 1000; // 15 minutes

export async function checkIPBlocklist(req: NextRequest): Promise<NextResponse | null> {
  const ip = getClientIP(req);
  const block = BLOCKLIST.get(ip);
  
  if (block && block.until > Date.now()) {
    return NextResponse.json(
      { 
        error: 'Access denied', 
        reason: block.reason,
        until: new Date(block.until).toISOString(),
      },
      { status: 403 }
    );
  }
  
  // Clean expired entries
  if (block && block.until < Date.now()) {
    BLOCKLIST.delete(ip);
  }
  
  return null;
}

export async function recordFailedAttempt(req: NextRequest): Promise<void> {
  const ip = getClientIP(req);
  const now = Date.now();
  
  const attempts = FAILED_ATTEMPTS.get(ip);
  
  if (!attempts || (now - attempts.firstAttempt) > FAILED_ATTEMPT_WINDOW) {
    // Reset attempts
    FAILED_ATTEMPTS.set(ip, { count: 1, firstAttempt: now });
  } else {
    attempts.count++;
    
    if (attempts.count >= MAX_FAILED_ATTEMPTS) {
      // Block the IP
      BLOCKLIST.set(ip, {
        until: now + BLOCK_DURATION,
        reason: `Auto-blocked after ${MAX_FAILED_ATTEMPTS} failed attempts`,
      });
      
      // Clear attempts
      FAILED_ATTEMPTS.delete(ip);
      
      console.log(`🔒 IP ${ip} auto-blocked for ${BLOCK_DURATION / 60000} minutes`);
    } else {
      FAILED_ATTEMPTS.set(ip, attempts);
    }
  }
}

export function blockIP(ip: string, durationMs: number, reason: string): void {
  BLOCKLIST.set(ip, {
    until: Date.now() + durationMs,
    reason,
  });
}

export function unblockIP(ip: string): boolean {
  return BLOCKLIST.delete(ip);
}

export function getBlockedIPs(): Array<{ ip: string; until: number; reason: string }> {
  const now = Date.now();
  const result: Array<{ ip: string; until: number; reason: string }> = [];
  
  for (const [ip, data] of BLOCKLIST.entries()) {
    if (data.until > now) {
      result.push({
        ip,
        until: data.until,
        reason: data.reason,
      });
    } else {
      // Clean expired entries
      BLOCKLIST.delete(ip);
    }
  }
  
  return result;
}

export function isIPBlocked(ip: string): boolean {
  const block = BLOCKLIST.get(ip);
  return block ? block.until > Date.now() : false;
}