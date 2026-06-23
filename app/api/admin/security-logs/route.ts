// app/api/admin/security-logs/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from "@/auth";
import { getSecurityLogs, getSecurityStats, cleanOldLogs } from "@/lib/security-logger";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Only admins can view logs
    if (session.user.role !== 'ADMIN' && session.user.role !== 'admin') {
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
      const stats = await getSecurityStats();
      return NextResponse.json({
        success: true,
        stats,
      });
    }
    
    // Handle cleanup request
    if (action === 'clean') {
      const days = parseInt(searchParams.get('days') || '30');
      const deleted = await cleanOldLogs(days);
      return NextResponse.json({
        success: true,
        message: `Deleted ${deleted} logs older than ${days} days`,
      });
    }
    
    // Get logs
    const logs = await getSecurityLogs(limit, type, severity, ip);
    
    return NextResponse.json({
      success: true,
      data: logs,
      count: logs.length,
      limit,
    });
  } catch (error: any) {
    console.error('Error fetching security logs:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}