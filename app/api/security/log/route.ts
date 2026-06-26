// app/api/security/log/route.ts - CREATE THIS
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { logSecurityIncident } from '@/lib/security-logger';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const body = await request.json();
    
    const { action, data, timestamp } = body;
    
    // ✅ Log the client action
    await logSecurityIncident(
      request,
      action,
      {
        ...data,
        clientTimestamp: timestamp,
        isClientSide: true,
        userAgent: request.headers.get('user-agent'),
        referer: request.headers.get('referer'),
      },
      action === 'error' ? 'error' : 'info',
      session?.user ? {
        id: session.user.id,
        email: session.user.email,
        role: session.user.role,
        name: session.user.name,
      } : undefined
    );
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error logging client action:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to log action' },
      { status: 500 }
    );
  }
}