// lib/security/security-logger.ts
import { NextRequest } from 'next/server';
import clientPromise from './mongodb';
import { getClientIP, anonymizeIP } from './ip-utils';

export interface SecurityLog {
  timestamp: string;
  type: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  path: string;
  method: string;
  ip: string;
  ipAnonymized: string;
  userAgent: string;
  userId?: string;
  userEmail?: string;
  userRole?: string;
  userName?: string;
  sessionId?: string;
  referer?: string;
  query?: Record<string, string>;
  body?: any;
  details: Record<string, any>;
  country?: string;
  city?: string;
  browser?: string;
  os?: string;
}

// In-memory fallback with cap
const logStore: SecurityLog[] = [];
const MAX_STORED_LOGS = 50000;
let isMongoConnected = false;

// Severity levels
const SEVERITY_LEVELS = { info: 0, warning: 1, error: 2, critical: 3 };

// ============================================
// MAIN LOGGING FUNCTION
// ============================================
export async function logSecurityIncident(
  req: NextRequest | null,
  type: string,
  details: Record<string, any> = {},
  severity: 'info' | 'warning' | 'error' | 'critical' = 'warning',
  userInfo?: { id?: string; email?: string; role?: string; name?: string }
): Promise<void> {
  try {
    const ip = req ? getClientIP(req) : 'unknown';
    
    // Get user info from various sources
    let userId = details.userId || userInfo?.id;
    let userEmail = details.userEmail || userInfo?.email;
    let userRole = details.userRole || userInfo?.role;
    let userName = details.userName || userInfo?.name;

    // Try to get user from headers (set by proxy)
    if (req) {
      if (!userId) userId = req.headers.get('x-user-id') || undefined;
      if (!userEmail) userEmail = req.headers.get('x-user-email') || undefined;
      if (!userRole) userRole = req.headers.get('x-user-role') || undefined;
      if (!userName) userName = req.headers.get('x-user-name') ? decodeURIComponent(req.headers.get('x-user-name')!) : undefined;
    }

    // Check if we should log this (avoid log spam for page views)
    if (type === 'page_view' && Math.random() > 0.05) {
      // Only log 5% of page views
      return;
    }

    const logEntry: SecurityLog = {
      timestamp: new Date().toISOString(),
      type,
      severity,
      path: req ? req.nextUrl.pathname : 'system',
      method: req ? req.method : 'SYSTEM',
      ip,
      ipAnonymized: anonymizeIP(ip),
      userAgent: req ? req.headers.get('user-agent') || 'unknown' : 'system',
      referer: req ? req.headers.get('referer') || undefined : undefined,
      userId,
      userEmail,
      userRole,
      userName,
      sessionId: req ? req.headers.get('x-session-id') || undefined : undefined,
      query: req ? Object.fromEntries(req.nextUrl.searchParams.entries()) : {},
      details,
      browser: details.browser || extractBrowser(req?.headers.get('user-agent') || ''),
      os: details.os || extractOS(req?.headers.get('user-agent') || ''),
      country: details.country,
      city: details.city,
    };

    // Always log to console for debugging
    const logMethod = severity === 'critical' ? console.error : 
                      severity === 'error' ? console.error :
                      severity === 'warning' ? console.warn : console.log;
    
    // Log critical/error/warning to console
    if (severity !== 'info') {
      logMethod(`🔒 ${severity.toUpperCase()}:`, JSON.stringify({
        ...logEntry,
        ip: anonymizeIP(ip),
        userAgent: undefined,
      }, null, 2));
    }
    
    // Store in memory
    logStore.push(logEntry);
    if (logStore.length > MAX_STORED_LOGS) {
      logStore.splice(0, logStore.length - MAX_STORED_LOGS);
    }
    
    // Store in MongoDB for all events (fire and forget)
    try {
      await storeInMongoDB(logEntry);
    } catch (error) {
      // Silently fail - we already have memory store
    }
  } catch (error) {
    console.error('Error logging security incident:', error);
  }
}

// ============================================
// STORE IN MONGODB
// ============================================
async function storeInMongoDB(logEntry: SecurityLog): Promise<void> {
  try {
    const client = await clientPromise;
    if (!client || !client.db) {
      isMongoConnected = false;
      return;
    }
    
    isMongoConnected = true;
    const db = client.db(process.env.MONGODB_DB || 'gold');
    
    // Ensure collection exists with indexes
    const collection = db.collection('security_logs');
    
    // Create indexes if they don't exist
    await collection.createIndex({ timestamp: -1 });
    await collection.createIndex({ type: 1 });
    await collection.createIndex({ severity: 1 });
    await collection.createIndex({ ip: 1 });
    await collection.createIndex({ userId: 1 });
    await collection.createIndex({ userEmail: 1 });
    await collection.createIndex({ path: 1 });
    
    await collection.insertOne({
      ...logEntry,
      _id: undefined,
      storedAt: new Date(),
      date: new Date(logEntry.timestamp),
    });
  } catch (error) {
    // Silent fail
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================
function extractBrowser(userAgent: string): string {
  if (!userAgent) return 'Unknown';
  if (userAgent.includes('Chrome')) return 'Chrome';
  if (userAgent.includes('Firefox')) return 'Firefox';
  if (userAgent.includes('Safari')) return 'Safari';
  if (userAgent.includes('Edge')) return 'Edge';
  if (userAgent.includes('Opera')) return 'Opera';
  return 'Other';
}

function extractOS(userAgent: string): string {
  if (!userAgent) return 'Unknown';
  if (userAgent.includes('Windows')) return 'Windows';
  if (userAgent.includes('Mac')) return 'macOS';
  if (userAgent.includes('Linux')) return 'Linux';
  if (userAgent.includes('Android')) return 'Android';
  if (userAgent.includes('iOS')) return 'iOS';
  return 'Other';
}

// ============================================
// SPECIFIC LOGGING FUNCTIONS
// ============================================

export async function logLogin(
  req: NextRequest,
  userInfo: { id: string; email: string; role: string; name?: string },
  success: boolean
): Promise<void> {
  await logSecurityIncident(
    req,
    success ? 'login_success' : 'login_failure',
    {
      userEmail: userInfo.email,
      userRole: userInfo.role,
      userName: userInfo.name,
      success,
      loginMethod: 'credentials',
    },
    success ? 'info' : 'warning',
    userInfo
  );
}

export async function logLogout(
  req: NextRequest,
  userInfo: { id: string; email: string; role: string; name?: string }
): Promise<void> {
  await logSecurityIncident(
    req,
    'logout',
    {
      userEmail: userInfo.email,
      userRole: userInfo.role,
      userName: userInfo.name,
    },
    'info',
    userInfo
  );
}

export async function logPageView(
  req: NextRequest,
  userInfo?: { id?: string; email?: string; role?: string; name?: string }
): Promise<void> {
  await logSecurityIncident(
    req,
    'page_view',
    {
      referer: req.headers.get('referer') || 'direct',
      isAuthenticated: !!userInfo?.id,
    },
    'info',
    userInfo
  );
}

export async function logAPIAccess(
  req: NextRequest,
  userInfo?: { id?: string; email?: string; role?: string; name?: string },
  responseStatus?: number
): Promise<void> {
  const severity = responseStatus && responseStatus >= 400 ? 'warning' : 'info';
  await logSecurityIncident(
    req,
    'api_access',
    {
      query: Object.fromEntries(req.nextUrl.searchParams.entries()),
      statusCode: responseStatus,
      isAuthenticated: !!userInfo?.id,
    },
    severity,
    userInfo
  );
}

export async function logRoleChange(
  req: NextRequest,
  adminInfo: { id: string; email: string; role: string },
  targetUser: { id: string; email: string; oldRole: string; newRole: string }
): Promise<void> {
  await logSecurityIncident(
    req,
    'role_change',
    {
      adminEmail: adminInfo.email,
      adminRole: adminInfo.role,
      targetUserId: targetUser.id,
      targetUserEmail: targetUser.email,
      oldRole: targetUser.oldRole,
      newRole: targetUser.newRole,
    },
    'warning',
    adminInfo
  );
}

export async function logPermissionChange(
  req: NextRequest,
  adminInfo: { id: string; email: string; role: string },
  targetUser: { id: string; email: string },
  changes: any
): Promise<void> {
  await logSecurityIncident(
    req,
    'permission_change',
    {
      adminEmail: adminInfo.email,
      adminRole: adminInfo.role,
      targetUserId: targetUser.id,
      targetUserEmail: targetUser.email,
      changes,
    },
    'warning',
    adminInfo
  );
}

export async function logDataModification(
  req: NextRequest,
  userInfo: { id: string; email: string; role: string },
  action: string,
  entity: string,
  entityId: string,
  changes: any
): Promise<void> {
  await logSecurityIncident(
    req,
    'data_modification',
    {
      action,
      entity,
      entityId,
      changes,
      userEmail: userInfo.email,
      userRole: userInfo.role,
    },
    'info',
    userInfo
  );
}

export async function logSystemError(
  req: NextRequest | null,
  error: Error,
  context?: Record<string, any>
): Promise<void> {
  await logSecurityIncident(
    req,
    'system_error',
    {
      error: error.message,
      stack: error.stack,
      context,
    },
    'error'
  );
}

// ============================================
// QUERY FUNCTIONS
// ============================================

export async function getSecurityLogs(
  limit: number = 100,
  filters?: {
    type?: string;
    severity?: string;
    ip?: string;
    userId?: string;
    userEmail?: string;
    startDate?: Date;
    endDate?: Date;
    minSeverity?: 'info' | 'warning' | 'error' | 'critical';
    search?: string;
  }
): Promise<SecurityLog[]> {
  try {
    const client = await clientPromise;
    
    if (!client || !client.db) {
      let logs = [...logStore];
      if (filters?.minSeverity) {
        const minLevel = SEVERITY_LEVELS[filters.minSeverity];
        logs = logs.filter(log => SEVERITY_LEVELS[log.severity] >= minLevel);
      }
      if (filters?.type) logs = logs.filter(log => log.type === filters.type);
      if (filters?.severity) logs = logs.filter(log => log.severity === filters.severity);
      if (filters?.ip) logs = logs.filter(log => log.ip === filters.ip || log.ipAnonymized === filters.ip);
      if (filters?.userId) logs = logs.filter(log => log.userId === filters.userId);
      if (filters?.userEmail) logs = logs.filter(log => log.userEmail === filters.userEmail);
      if (filters?.search) {
        const search = filters.search.toLowerCase();
        logs = logs.filter(log => 
          log.ip?.toLowerCase().includes(search) ||
          log.path?.toLowerCase().includes(search) ||
          log.userEmail?.toLowerCase().includes(search) ||
          log.type?.toLowerCase().includes(search) ||
          log.userAgent?.toLowerCase().includes(search)
        );
      }
      return logs.slice(-limit) as SecurityLog[];
    }
    
    const db = client.db(process.env.MONGODB_DB || 'gold');
    const query: any = {};
    
    if (filters?.type) query.type = filters.type;
    if (filters?.severity) query.severity = filters.severity;
    if (filters?.ip) query.$or = [{ ip: filters.ip }, { ipAnonymized: filters.ip }];
    if (filters?.userId) query.userId = filters.userId;
    if (filters?.userEmail) query.userEmail = filters.userEmail;
    if (filters?.startDate) query.timestamp = { $gte: filters.startDate.toISOString() };
    if (filters?.endDate) query.timestamp = { ...query.timestamp, $lte: filters.endDate.toISOString() };
    
    let logs = await db.collection('security_logs')
      .find(query)
      .sort({ timestamp: -1 })
      .limit(limit)
      .toArray();
    
    // Filter by min severity if needed
    if (filters?.minSeverity) {
      const minLevel = SEVERITY_LEVELS[filters.minSeverity];
      logs = logs.filter((log: SecurityLog) => SEVERITY_LEVELS[log.severity] >= minLevel);
    }
    
    // Filter by search if needed
    if (filters?.search) {
      const search = filters.search.toLowerCase();
      logs = logs.filter((log: SecurityLog) => 
        log.ip?.toLowerCase().includes(search) ||
        log.path?.toLowerCase().includes(search) ||
        log.userEmail?.toLowerCase().includes(search) ||
        log.type?.toLowerCase().includes(search) ||
        log.userAgent?.toLowerCase().includes(search)
      );
    }
    
    return logs as unknown as SecurityLog[];
  } catch (error) {
    console.error('Error fetching security logs:', error);
    return logStore.slice(-limit) as SecurityLog[];
  }
}

export async function getSecurityStats(): Promise<any> {
  try {
    const client = await clientPromise;
    if (!client || !client.db) {
      const now = Date.now();
      return {
        total: logStore.length,
        types: logStore.reduce((acc, log) => ({ ...acc, [log.type]: (acc[log.type] || 0) + 1 }), {} as Record<string, number>),
        severities: logStore.reduce((acc, log) => ({ ...acc, [log.severity]: (acc[log.severity] || 0) + 1 }), {} as Record<string, number>),
        last24h: logStore.filter(log => new Date(log.timestamp).getTime() > now - 24 * 60 * 60 * 1000).length,
        topIPs: [],
        userActivity: {},
      };
    }
    
    const db = client.db(process.env.MONGODB_DB || 'gold');
    const collection = db.collection('security_logs');
    
    const total = await collection.countDocuments();
    
    const typeAggregation = await collection.aggregate([
      { $group: { _id: '$type', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 20 }
    ]).toArray();
    
    const types: Record<string, number> = {};
    typeAggregation.forEach((item: any) => {
      types[item._id] = item.count;
    });
    
    const severityAggregation = await collection.aggregate([
      { $group: { _id: '$severity', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]).toArray();
    
    const severities: Record<string, number> = {};
    severityAggregation.forEach((item: any) => {
      severities[item._id] = item.count;
    });
    
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const last24h = await collection.countDocuments({
      timestamp: { $gte: yesterday.toISOString() }
    });
    
    const topIPs = await collection.aggregate([
      { $group: { _id: '$ip', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]).toArray();
    
    // User activity stats
    const userActivity = await collection.aggregate([
      { $match: { userId: { $exists: true, $ne: null } } },
      { $group: { _id: '$userEmail', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]).toArray();
    
    return {
      total,
      types,
      severities,
      last24h,
      topIPs: topIPs.map((item: any) => ({ ip: anonymizeIP(item._id), count: item.count })),
      userActivity: userActivity.reduce((acc: any, item: any) => ({ ...acc, [item._id]: item.count }), {}),
    };
  } catch (error) {
    console.error('Error getting security stats:', error);
    return {
      total: logStore.length,
      types: {},
      severities: {},
      last24h: 0,
      topIPs: [],
      userActivity: {},
    };
  }
}

export function getMemoryLogs(limit: number = 100): SecurityLog[] {
  return logStore.slice(-limit) as SecurityLog[];
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
