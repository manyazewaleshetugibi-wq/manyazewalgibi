// lib/api-logger.ts - COMPLETE
import { NextRequest } from 'next/server';
import { logSecurityIncident } from './security-logger';
import { getClientIP } from './ip-utils';
import { auth } from '@/auth';

export interface APILogContext {
  action: string;
  details: Record<string, any>;
  severity?: 'info' | 'warning' | 'error' | 'critical';
  userInfo?: {
    id?: string;
    email?: string;
    role?: string;
    name?: string;
  };
}

export async function logAPIAction(
  req: NextRequest,
  action: string,
  details: Record<string, any> = {},
  severity: 'info' | 'warning' | 'error' | 'critical' = 'info'
): Promise<void> {
  try {
    const session = await auth();
    const ip = getClientIP(req);
    
    // Get user info from session or details
    const userInfo = {
      id: details.userId || session?.user?.id,
      email: details.userEmail || session?.user?.email,
      role: details.userRole || session?.user?.role,
      name: details.userName || session?.user?.name,
    };
    
    // Remove sensitive data from details
    const cleanDetails = { ...details };
    delete cleanDetails.password;
    delete cleanDetails.token;
    delete cleanDetails.secret;
    delete cleanDetails.apiKey;
    
    await logSecurityIncident(
      req,
      action,
      {
        ...cleanDetails,
        ip,
        apiPath: req.nextUrl.pathname,
        method: req.method,
        userAgent: req.headers.get('user-agent'),
        referer: req.headers.get('referer'),
        query: Object.fromEntries(req.nextUrl.searchParams.entries()),
      },
      severity,
      userInfo.id || userInfo.email ? {
        id: userInfo.id,
        email: userInfo.email,
        role: userInfo.role,
        name: userInfo.name,
      } : undefined
    );
  } catch (error) {
    console.error('Failed to log API action:', error);
  }
}

// ============================================
// HELPER: Log API error
// ============================================
export async function logAPIError(
  req: NextRequest,
  error: Error,
  context?: Record<string, any>
): Promise<void> {
  await logAPIAction(
    req,
    'api_error',
    {
      error: error.message,
      stack: error.stack,
      context,
    },
    'error'
  );
}

// ============================================
// HELPER: Log API success
// ============================================
export async function logAPISuccess(
  req: NextRequest,
  action: string,
  data?: Record<string, any>
): Promise<void> {
  await logAPIAction(
    req,
    `${action}_success`,
    {
      ...data,
    },
    'info'
  );
}