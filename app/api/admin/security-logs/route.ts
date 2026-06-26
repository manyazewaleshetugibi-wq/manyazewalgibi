// app/api/admin/security-logs/route.ts - WITH FULL LOGGING
import { NextRequest, NextResponse } from 'next/server';
import { auth } from "@/auth";
import { getSecurityLogs, getSecurityStats, cleanOldLogs } from "@/lib/security-logger";
import { logAPIAction } from "@/lib/api-logger";

// Helper to normalize role for comparison
function normalizeRole(role: string | undefined): string {
  if (!role) return 'DEFAULT';
  return role.toUpperCase().trim();
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const userRole = normalizeRole(session.user.role);
    
    // Only admins can view logs
    if (userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN') {
      await logAPIAction(
        request,
        'admin_security_logs_unauthorized',
        {
          userEmail: session.user.email,
          userRole: session.user.role,
          attemptedAction: 'VIEW_SECURITY_LOGS',
        },
        'warning'
      );
      
      return NextResponse.json(
        { success: false, message: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }
    
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '100');
    const type = searchParams.get('type') || undefined;
    const severity = searchParams.get('severity') || undefined;
    const ip = searchParams.get('ip') || undefined;
    const action = searchParams.get('action');
    
    // Handle stats request
    if (action === 'stats') {
      await logAPIAction(
        request,
        'admin_security_stats_view',
        {
          adminEmail: session.user.email,
          adminRole: session.user.role,
        },
        'info'
      );
      
      const stats = await getSecurityStats();
      return NextResponse.json({
        success: true,
        stats,
      });
    }
    
    // Handle cleanup request
    if (action === 'clean') {
      const days = parseInt(searchParams.get('days') || '30');
      
      await logAPIAction(
        request,
        'admin_security_logs_clean',
        {
          adminEmail: session.user.email,
          adminRole: session.user.role,
          daysToKeep: days,
        },
        'warning'
      );
      
      const deleted = await cleanOldLogs(days);
      
      await logAPIAction(
        request,
        'admin_security_logs_clean_success',
        {
          adminEmail: session.user.email,
          deletedCount: deleted,
          daysToKeep: days,
        },
        'info'
      );
      
      return NextResponse.json({
        success: true,
        message: `Deleted ${deleted} logs older than ${days} days`,
      });
    }
    
    // ✅ Log the view action
    await logAPIAction(
      request,
      'admin_security_logs_view',
      {
        adminEmail: session.user.email,
        adminRole: session.user.role,
        limit,
        type,
        severity,
        ip,
      },
      'info'
    );
    
    // Get logs
    const logs = await getSecurityLogs(limit, {
      type,
      severity,
      ip,
    });
    
    return NextResponse.json({
      success: true,
      data: logs,
      count: logs.length,
      limit,
    });
  } catch (error: any) {
    await logAPIAction(
      request,
      'admin_security_logs_error',
      {
        error: error.message,
        stack: error.stack,
      },
      'error'
    );
    
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}