import { NextRequest, NextResponse } from 'next/server';
import { verifyRegistration } from '@/lib/webauthn';

export async function POST(request: NextRequest) {
  try {
    const { userId, response } = await request.json();
    if (!userId || !response) {
      return NextResponse.json({ success: false, error: 'userId and response required' }, { status: 400 });
    }

    const verified = await verifyRegistration(userId, response);
    if (!verified) {
      return NextResponse.json({ success: false, error: 'Registration verification failed' }, { status: 400 });
    }

    return NextResponse.json({ success: true, verified: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
