import { NextRequest, NextResponse } from 'next/server';
import { verifyRegistration } from '@/lib/webauthn';
import { verifyAttendanceIdentity, createClockinToken } from '@/lib/attendance-auth';

export async function POST(request: NextRequest) {
  try {
    const { userId, response, token } = await request.json();
    if (!userId || !response) {
      return NextResponse.json({ success: false, error: 'userId and response required' }, { status: 400 });
    }

    const proven = await verifyAttendanceIdentity(request, typeof token === 'string' ? token : null, userId);
    if (!proven) {
      return NextResponse.json({
        success: false,
        error: 'Please verify your identity (password or fingerprint) before registering a fingerprint.'
      }, { status: 401 });
    }

    const verified = await verifyRegistration(userId, response);
    if (!verified) {
      return NextResponse.json({ success: false, error: 'Registration verification failed' }, { status: 400 });
    }

    return NextResponse.json({ success: true, verified: true, token: createClockinToken(userId) });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
