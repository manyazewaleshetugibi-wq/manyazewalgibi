// lib/security-logger.ts
import { NextRequest } from 'next/server';
import clientPromise from './mongodb';

function getClientIP(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
         req.headers.get('x-real-ip') || 
         'unknown';
}

// In-memory fallback store (used when MongoDB is unavailable)
const logStore: any[] = [];
const MAX_STORED_LOGS = 1000;

export async function logSecurityIncident(
  req: NextRequest, 
  type: string, 
  details: Record<string, any>
): Promise<void> {
  const logEntry = {
    timestamp: new Date().toISOString(),
    type,
    path: req.nextUrl.pathname,
    method: req.method,
    ip: getClientIP(req),
    userAgent: req.headers.get('user-agent') || 'unknown',
    ...details,
  };
  
  // Always log to console (visible in terminal/Vercel logs)
  console.error('🔒 SECURITY INCIDENT:', JSON.stringify(logEntry, null, 2));
  
  // Store in memory fallback
  logStore.push(logEntry);
  if (logStore.length > MAX_STORED_LOGS) {
    logStore.shift();
  }
  
  // Try to store in MongoDB (fire and forget)
  try {
    await storeInMongoDB(logEntry);
  } catch (error) {
    // Silently fail - don't break the main request
    // The log is already in console and memory
  }
}

// MongoDB storage with your client
async function storeInMongoDB(logEntry: any): Promise<void> {
  try {
    const client = await clientPromise;
    
    // Check if we have a real MongoDB connection (not mock)
    if (!client || !client.db) {
      console.warn('⚠️ MongoDB not available, log stored in memory only');
      return;
    }
    
    const db = client.db(process.env.MONGODB_DB || 'eresto-beta');
    
    // Create collection if it doesn't exist (optional)
    const collections = await db.listCollections({ name: 'security_logs' }).toArray();
    if (collections.length === 0) {
      // Collection doesn't exist, it will be created on insert
      console.log('📝 Creating security_logs collection');
    }
    
    // Insert the log
    await db.collection('security_logs').insertOne({
      ...logEntry,
      _id: undefined, // Let MongoDB generate _id
      storedAt: new Date(),
    });
  } catch (error) {
    // Log to console but don't throw
    console.error('Failed to store security log in MongoDB:', error instanceof Error ? error.message : 'Unknown error');
    throw error; // Re-throw to be caught by caller
  }
}

// ============================================
// OPTIONAL: Helper functions for admin dashboard
// ============================================

// Get logs from MongoDB
export async function getSecurityLogs(
  limit: number = 100,
  type?: string
): Promise<any[]> {
  try {
    const client = await clientPromise;
    
    // Check for mock client
    if (!client || !client.db) {
      // Return in-memory logs
      return type ? logStore.filter(log => log.type === type).slice(-limit) : logStore.slice(-limit);
    }
    
    const db = client.db(process.env.MONGODB_DB || 'eresto-beta');
    const query = type ? { type } : {};
    
    const logs = await db.collection('security_logs')
      .find(query)
      .sort({ timestamp: -1 })
      .limit(limit)
      .toArray();
    
    return logs;
  } catch (error) {
    console.error('Error fetching security logs:', error);
    // Return in-memory logs as fallback
    return type ? logStore.filter(log => log.type === type).slice(-limit) : logStore.slice(-limit);
  }
}

// Get logs from memory (fast, no DB call)
export function getMemoryLogs(limit: number = 100): any[] {
  return logStore.slice(-limit);
}

// Clear memory logs
export function clearMemoryLogs(): void {
  logStore.length = 0;
}

// Get logs by type from memory
export function getMemoryLogsByType(type: string, limit: number = 50): any[] {
  return logStore
    .filter(log => log.type === type)
    .slice(-limit);
}

// Clean old logs (optional maintenance)
export async function cleanOldLogs(daysToKeep: number = 30): Promise<number> {
  try {
    const client = await clientPromise;
    
    if (!client || !client.db) {
      return 0;
    }
    
    const db = client.db(process.env.MONGODB_DB || 'eresto-beta');
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    const result = await db.collection('security_logs')
      .deleteMany({ timestamp: { $lt: cutoffDate.toISOString() } });
    
    return result.deletedCount || 0;
  } catch (error) {
    console.error('Error cleaning old logs:', error);
    return 0;
  }
}