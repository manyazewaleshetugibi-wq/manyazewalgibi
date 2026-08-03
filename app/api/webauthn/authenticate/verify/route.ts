import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthentication } from '@/lib/webauthn';
import { createClockinToken } from '@/lib/attendance-auth';

export async function POST(request: NextRequest) {
  try {
    const { userId, response } = await request.json();
    if (!userId || !response) {
      return NextResponse.json({ success: false, error: 'userId and response required' }, { status: 400 });
    }

    const verified = await verifyAuthentication(userId, response);
    if (!verified) {
      return NextResponse.json({ success: false, error: 'Authentication failed' }, { status: 401 });
    }

    return NextResponse.json({ success: true, verified: true, token: createClockinToken(userId) });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
