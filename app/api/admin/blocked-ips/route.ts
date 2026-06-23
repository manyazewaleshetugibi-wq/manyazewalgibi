// app/api/admin/blocked-ips/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from "@/auth";
import { getBlockedIPs, blockIP, unblockIP } from "@/lib/ip-blocklist";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    if (session.user.role !== 'ADMIN' && session.user.role !== 'admin') {
      return NextResponse.json(
        { success: false, message: 'Forbidden' },
        { status: 403 }
      );
    }
    
    const blockedIPs = await getBlockedIPs();
    
    return NextResponse.json({
      success: true,
      data: blockedIPs,
      count: blockedIPs.length,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    if (session.user.role !== 'ADMIN' && session.user.role !== 'admin') {
      return NextResponse.json(
        { success: false, message: 'Forbidden' },
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
    
    const durationMs = duration || 24 * 60 * 60 * 1000; // Default 24 hours
    const blockReason = reason || `Manually blocked by ${session.user.email}`;
    
    await blockIP(ip, durationMs, blockReason);
    
    return NextResponse.json({
      success: true,
      message: `IP ${ip} blocked successfully`,
      until: new Date(Date.now() + durationMs).toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    if (session.user.role !== 'ADMIN' && session.user.role !== 'admin') {
      return NextResponse.json(
        { success: false, message: 'Forbidden' },
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
    
    const success = await unblockIP(ip);
    
    return NextResponse.json({
      success,
      message: success ? `IP ${ip} unblocked successfully` : `IP ${ip} was not blocked`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}