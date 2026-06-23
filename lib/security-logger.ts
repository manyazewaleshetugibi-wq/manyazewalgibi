// lib/security-logger.ts
import { NextRequest } from 'next/server';
import clientPromise from './mongodb';

function getClientIP(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
         req.headers.get('x-real-ip') || 
         'unknown';
}

// In-memory fallback store
const logStore: any[] = [];
const MAX_STORED_LOGS = 5000;

export interface SecurityLog {
  timestamp: string;
  type: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  path: string;
  method: string;
  ip: string;
  userAgent: string;
  userId?: string;
  userEmail?: string;
  userRole?: string;
  sessionId?: string;
  details: Record<string, any>;
}

export async function logSecurityIncident(
  req: NextRequest,
  type: string,
  details: Record<string, any>,
  severity: 'info' | 'warning' | 'error' | 'critical' = 'warning'
): Promise<void> {
  const logEntry: SecurityLog = {
    timestamp: new Date().toISOString(),
    type,
    severity,
    path: req.nextUrl.pathname,
    method: req.method,
    ip: getClientIP(req),
    userAgent: req.headers.get('user-agent') || 'unknown',
    sessionId: req.headers.get('x-session-id') || undefined,
    details,
  };
  
  // Always log to console with appropriate level
  const logMethod = severity === 'critical' ? console.error : 
                    severity === 'error' ? console.error :
                    severity === 'warning' ? console.warn : console.log;
  
  logMethod(`🔒 ${severity.toUpperCase()}:`, JSON.stringify(logEntry, null, 2));
  
  // Store in memory
  logStore.push(logEntry);
  if (logStore.length > MAX_STORED_LOGS) {
    logStore.splice(0, logStore.length - MAX_STORED_LOGS);
  }
  
  // Store in MongoDB (fire and forget)
  try {
    await storeInMongoDB(logEntry);
  } catch (error) {
    // Silently fail
  }
}

async function storeInMongoDB(logEntry: SecurityLog): Promise<void> {
  try {
    const client = await clientPromise;
    if (!client || !client.db) {
      console.warn('⚠️ MongoDB not available, log stored in memory only');
      return;
    }
    
    const db = client.db(process.env.MONGODB_DB || 'gold');
    await db.collection('security_logs').insertOne({
      ...logEntry,
      _id: undefined,
      storedAt: new Date(),
    });
  } catch (error) {
    console.error('Failed to store security log in MongoDB:', error instanceof Error ? error.message : 'Unknown error');
    throw error;
  }
}

export async function getSecurityLogs(
  limit: number = 100,
  type?: string,
  severity?: string,
  ip?: string,
  startDate?: Date,
  endDate?: Date
): Promise<SecurityLog[]> {
  try {
    const client = await clientPromise;
    
    if (!client || !client.db) {
      // Return in-memory logs
      let logs = [...logStore];
      if (type) logs = logs.filter(log => log.type === type);
      if (severity) logs = logs.filter(log => log.severity === severity);
      if (ip) logs = logs.filter(log => log.ip === ip);
      return logs.slice(-limit);
    }
    
    const db = client.db(process.env.MONGODB_DB || 'gold');
    const query: any = {};
    
    if (type) query.type = type;
    if (severity) query.severity = severity;
    if (ip) query.ip = ip;
    if (startDate) query.timestamp = { $gte: startDate.toISOString() };
    if (endDate) query.timestamp = { ...query.timestamp, $lte: endDate.toISOString() };
    
    const logs = await db.collection('security_logs')
      .find(query)
      .sort({ timestamp: -1 })
      .limit(limit)
      .toArray();
    
    return logs as SecurityLog[];
  } catch (error) {
    console.error('Error fetching security logs:', error);
    return logStore.slice(-limit);
  }
}

export function getMemoryLogs(limit: number = 100): SecurityLog[] {
  return logStore.slice(-limit);
}

export function clearMemoryLogs(): void {
  logStore.length = 0;
}

export async function cleanOldLogs(daysToKeep: number = 30): Promise<number> {
  try {
    const client = await clientPromise;
    if (!client || !client.db) return 0;
    
    const db = client.db(process.env.MONGODB_DB || 'gold');
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

export async function getSecurityStats(): Promise<any> {
  try {
    const client = await clientPromise;
    if (!client || !client.db) {
      return {
        total: logStore.length,
        types: {},
        severities: {},
        last24h: logStore.filter(log => 
          new Date(log.timestamp) > new Date(Date.now() - 24 * 60 * 60 * 1000)
        ).length,
        topIPs: [],
      };
    }
    
    const db = client.db(process.env.MONGODB_DB || 'gold');
    
    // Get total count
    const total = await db.collection('security_logs').countDocuments();
    
    // Get counts by type
    const typeAggregation = await db.collection('security_logs')
      .aggregate([
        { $group: { _id: '$type', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ])
      .toArray();
    
    const types: Record<string, number> = {};
    typeAggregation.forEach((item: any) => {
      types[item._id] = item.count;
    });
    
    // Get counts by severity
    const severityAggregation = await db.collection('security_logs')
      .aggregate([
        { $group: { _id: '$severity', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ])
      .toArray();
    
    const severities: Record<string, number> = {};
    severityAggregation.forEach((item: any) => {
      severities[item._id] = item.count;
    });
    
    // Last 24 hours
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const last24h = await db.collection('security_logs').countDocuments({
      timestamp: { $gte: yesterday.toISOString() }
    });
    
    // Top IPs
    const topIPs = await db.collection('security_logs')
      .aggregate([
        { $group: { _id: '$ip', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ])
      .toArray();
    
    return {
      total,
      types,
      severities,
      last24h,
      topIPs: topIPs.map((item: any) => ({ ip: item._id, count: item.count })),
    };
  } catch (error) {
    console.error('Error getting security stats:', error);
    return {
      total: logStore.length,
      types: {},
      severities: {},
      last24h: logStore.filter(log => 
        new Date(log.timestamp) > new Date(Date.now() - 24 * 60 * 60 * 1000)
      ).length,
      topIPs: [],
    };
  }
}