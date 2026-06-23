// lib/ip-blocklist.ts
import { NextRequest, NextResponse } from 'next/server';
import clientPromise from './mongodb';

// Helper to get client IP
function getClientIP(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
         req.headers.get('x-real-ip') || 
         'unknown';
}

interface BlockedIP {
  until: number;
  reason: string;
  attempts?: number;
  createdAt?: number;
}

// In-memory cache (for fast lookups)
const BLOCKLIST_CACHE = new Map<string, BlockedIP>();
const FAILED_ATTEMPTS = new Map<string, { count: number; firstAttempt: number }>();

const MAX_FAILED_ATTEMPTS = 5; // Reduced from 10 for better security
const BLOCK_DURATION = 24 * 60 * 60 * 1000; // 24 hours (increased from 1 hour)
const FAILED_ATTEMPT_WINDOW = 15 * 60 * 1000; // 15 minutes

// Sync cache with MongoDB periodically
let lastCacheSync = 0;
const CACHE_SYNC_INTERVAL = 60000; // 1 minute

async function syncBlocklistCache(): Promise<void> {
  try {
    const now = Date.now();
    if (now - lastCacheSync < CACHE_SYNC_INTERVAL) return;
    
    const client = await clientPromise;
    if (!client || !client.db) return;
    
    const db = client.db(process.env.MONGODB_DB || 'gold');
    const blockedIPs = await db.collection('blocked_ips')
      .find({ until: { $gt: now } })
      .toArray();
    
    // Update cache
    BLOCKLIST_CACHE.clear();
    blockedIPs.forEach((doc: any) => {
      BLOCKLIST_CACHE.set(doc.ip, {
        until: doc.until,
        reason: doc.reason,
        attempts: doc.attempts,
        createdAt: doc.createdAt,
      });
    });
    
    lastCacheSync = now;
    console.log(`🔄 Blocklist cache synced: ${BLOCKLIST_CACHE.size} IPs blocked`);
  } catch (error) {
    console.error('Error syncing blocklist cache:', error);
  }
}

export async function checkIPBlocklist(req: NextRequest): Promise<NextResponse | null> {
  const ip = getClientIP(req);
  
  // Sync cache periodically
  await syncBlocklistCache();
  
  // Check in-memory cache first (fast)
  let block = BLOCKLIST_CACHE.get(ip);
  
  // If not in cache, check MongoDB directly
  if (!block) {
    try {
      const client = await clientPromise;
      if (client && client.db) {
        const db = client.db(process.env.MONGODB_DB || 'gold');
        const doc = await db.collection('blocked_ips').findOne({
          ip,
          until: { $gt: Date.now() }
        });
        
        if (doc) {
          block = {
            until: doc.until,
            reason: doc.reason,
            attempts: doc.attempts,
            createdAt: doc.createdAt,
          };
          BLOCKLIST_CACHE.set(ip, block);
        }
      }
    } catch (error) {
      console.error('Error checking blocklist in MongoDB:', error);
    }
  }
  
  if (block && block.until > Date.now()) {
    return NextResponse.json(
      { 
        error: 'Access denied', 
        reason: block.reason,
        until: new Date(block.until).toISOString(),
        blockedAt: block.createdAt ? new Date(block.createdAt).toISOString() : 'unknown',
      },
      { status: 403 }
    );
  }
  
  // Clean expired entries from cache
  if (block && block.until < Date.now()) {
    BLOCKLIST_CACHE.delete(ip);
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
      // Block the IP in MongoDB
      await blockIP(
        ip,
        BLOCK_DURATION,
        `Auto-blocked after ${MAX_FAILED_ATTEMPTS} failed attempts`
      );
      
      // Clear attempts
      FAILED_ATTEMPTS.delete(ip);
      
      console.log(`🔒 IP ${ip} auto-blocked for ${BLOCK_DURATION / 60000} minutes`);
    } else {
      FAILED_ATTEMPTS.set(ip, attempts);
    }
  }
}

export async function blockIP(ip: string, durationMs: number, reason: string): Promise<void> {
  const until = Date.now() + durationMs;
  const blockData: BlockedIP = {
    until,
    reason,
    attempts: 0,
    createdAt: Date.now(),
  };
  
  // Update cache
  BLOCKLIST_CACHE.set(ip, blockData);
  
  // Update MongoDB
  try {
    const client = await clientPromise;
    if (client && client.db) {
      const db = client.db(process.env.MONGODB_DB || 'gold');
      await db.collection('blocked_ips').updateOne(
        { ip },
        { 
          $set: {
            ip,
            until,
            reason,
            attempts: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        },
        { upsert: true }
      );
    }
  } catch (error) {
    console.error('Error blocking IP in MongoDB:', error);
  }
}

export async function unblockIP(ip: string): Promise<boolean> {
  // Remove from cache
  const deleted = BLOCKLIST_CACHE.delete(ip);
  
  // Remove from MongoDB
  try {
    const client = await clientPromise;
    if (client && client.db) {
      const db = client.db(process.env.MONGODB_DB || 'gold');
      await db.collection('blocked_ips').deleteOne({ ip });
    }
  } catch (error) {
    console.error('Error unblocking IP from MongoDB:', error);
    return false;
  }
  
  return deleted;
}

export async function getBlockedIPs(): Promise<Array<{ ip: string; until: number; reason: string; attempts?: number; createdAt?: number }>> {
  await syncBlocklistCache();
  
  const now = Date.now();
  const result: Array<{ ip: string; until: number; reason: string; attempts?: number; createdAt?: number }> = [];
  
  // Check cache first
  for (const [ip, data] of BLOCKLIST_CACHE.entries()) {
    if (data.until > now) {
      result.push({
        ip,
        until: data.until,
        reason: data.reason,
        attempts: data.attempts,
        createdAt: data.createdAt,
      });
    } else {
      BLOCKLIST_CACHE.delete(ip);
    }
  }
  
  // Also query MongoDB for any missing entries
  try {
    const client = await clientPromise;
    if (client && client.db) {
      const db = client.db(process.env.MONGODB_DB || 'gold');
      const mongoBlocks = await db.collection('blocked_ips')
        .find({ until: { $gt: now } })
        .toArray();
      
      // Add any missing entries
      for (const doc of mongoBlocks) {
        if (!result.find(r => r.ip === doc.ip)) {
          result.push({
            ip: doc.ip,
            until: doc.until,
            reason: doc.reason,
            attempts: doc.attempts,
            createdAt: doc.createdAt?.getTime?.(),
          });
        }
      }
    }
  } catch (error) {
    console.error('Error fetching blocked IPs from MongoDB:', error);
  }
  
  return result;
}

export function isIPBlocked(ip: string): boolean {
  const block = BLOCKLIST_CACHE.get(ip);
  return block ? block.until > Date.now() : false;
}

export async function clearBlocklist(): Promise<void> {
  BLOCKLIST_CACHE.clear();
  FAILED_ATTEMPTS.clear();
  
  try {
    const client = await clientPromise;
    if (client && client.db) {
      const db = client.db(process.env.MONGODB_DB || 'gold');
      await db.collection('blocked_ips').deleteMany({});
    }
  } catch (error) {
    console.error('Error clearing blocklist:', error);
  }
}