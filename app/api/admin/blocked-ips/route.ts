// app/api/admin/blocked-ips/route.ts - COMPLETE FIXED VERSION
import { NextRequest, NextResponse } from 'next/server';
import { auth } from "@/auth";
import { getBlockedIPs, blockIP, unblockIP } from "@/lib/ip-blocklist";
import { logAPIAction } from "@/lib/api-logger";

// Helper to normalize role for comparison
function normalizeRole(role: string | undefined): string {
  if (!role) return 'DEFAULT';
  return role.toUpperCase().trim();
}

// ============================================
// GET - List all blocked IPs
// ============================================
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
    
    if (userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN') {
      // ✅ Log unauthorized access attempt
      await logAPIAction(
        request,
        'admin_blocked_ips_unauthorized',
        {
          userEmail: session.user.email,
          userRole: session.user.role,
          attemptedAction: 'VIEW_BLOCKED_IPS',
        },
        'warning'
      );
      
      return NextResponse.json(
        { success: false, message: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }
    
    // ✅ Log successful access
    await logAPIAction(
      request,
      'admin_blocked_ips_view',
      {
        adminEmail: session.user.email,
        adminRole: session.user.role,
      },
      'info'
    );
    
    const blockedIPs = await getBlockedIPs();
    
    return NextResponse.json({
      success: true,
      data: blockedIPs,
      count: blockedIPs.length,
    });
  } catch (error: any) {
    // ✅ Log errors
    await logAPIAction(
      request,
      'admin_blocked_ips_error',
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

// ============================================
// POST - Block a new IP
// ============================================
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const userRole = normalizeRole(session.user.role);
    
    if (userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN') {
      // ✅ Log unauthorized access attempt
      await logAPIAction(
        request,
        'admin_block_ip_unauthorized',
        {
          userEmail: session.user.email,
          userRole: session.user.role,
          attemptedAction: 'BLOCK_IP',
        },
        'warning'
      );
      
      return NextResponse.json(
        { success: false, message: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }
    
    const { ip, duration, reason } = await request.json();
    
    if (!ip) {
      return NextResponse.json(
        { success: false, message: 'IP address is required' },
        { status: 400 }
      );
    }
    
    // ✅ Validate IP format (basic)
    if (ip === '::1' || ip === '127.0.0.1' || ip === 'localhost' || ip === 'unknown') {
      await logAPIAction(
        request,
        'admin_block_ip_invalid',
        {
          targetIp: ip,
          adminEmail: session.user.email,
          reason: 'Attempted to block localhost/unknown IP',
        },
        'warning'
      );
      
      return NextResponse.json(
        { success: false, message: 'Cannot block localhost or unknown IP addresses' },
        { status: 400 }
      );
    }
    
    const durationMs = duration || 24 * 60 * 60 * 1000; // Default 24 hours
    const blockReason = reason || `Manually blocked by ${session.user.email}`;
    
    // ✅ Log the action BEFORE blocking
    await logAPIAction(
      request,
      'admin_block_ip',
      {
        targetIp: ip,
        duration: durationMs,
        durationHours: Math.round(durationMs / (60 * 60 * 1000)),
        reason: blockReason,
        adminEmail: session.user.email,
        adminRole: session.user.role,
        adminId: session.user.id,
      },
      'warning'
    );
    
    await blockIP(ip, durationMs, blockReason);
    
    // ✅ Log success
    await logAPIAction(
      request,
      'admin_block_ip_success',
      {
        targetIp: ip,
        adminEmail: session.user.email,
        duration: Math.round(durationMs / (60 * 60 * 1000)),
      },
      'info'
    );
    
    return NextResponse.json({
      success: true,
      message: `IP ${ip} blocked successfully for ${Math.round(durationMs / (60 * 60 * 1000))} hours`,
      until: new Date(Date.now() + durationMs).toISOString(),
    });
  } catch (error: any) {
    // ✅ Log errors
    await logAPIAction(
      request,
      'admin_block_ip_error',
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

// ============================================
// DELETE - Unblock an IP
// ============================================
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const userRole = normalizeRole(session.user.role);
    
    if (userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN') {
      // ✅ Log unauthorized access attempt
      await logAPIAction(
        request,
        'admin_unblock_ip_unauthorized',
        {
          userEmail: session.user.email,
          userRole: session.user.role,
          attemptedAction: 'UNBLOCK_IP',
        },
        'warning'
      );
      
      return NextResponse.json(
        { success: false, message: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }
    
    const { ip } = await request.json();
    
    if (!ip) {
      return NextResponse.json(
        { success: false, message: 'IP address is required' },
        { status: 400 }
      );
    }
    
    // ✅ Log the action BEFORE unblocking
    await logAPIAction(
      request,
      'admin_unblock_ip',
      {
        targetIp: ip,
        adminEmail: session.user.email,
        adminRole: session.user.role,
        adminId: session.user.id,
      },
      'info'
    );
    
    const success = await unblockIP(ip);
    
    if (success) {
      // ✅ Log success
      await logAPIAction(
        request,
        'admin_unblock_ip_success',
        {
          targetIp: ip,
          adminEmail: session.user.email,
        },
        'info'
      );
      
      return NextResponse.json({
        success: true,
        message: `IP ${ip} unblocked successfully`,
      });
    } else {
      await logAPIAction(
        request,
        'admin_unblock_ip_not_found',
        {
          targetIp: ip,
          adminEmail: session.user.email,
        },
        'warning'
      );
      
      return NextResponse.json({
        success: false,
        message: `IP ${ip} was not blocked`,
      }, { status: 404 });
    }
  } catch (error: any) {
    // ✅ Log errors
    await logAPIAction(
      request,
      'admin_unblock_ip_error',
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