import { NextRequest, NextResponse } from 'next/server';
import { createRegistrationOptions } from '@/lib/webauthn';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { verifyAttendanceIdentity } from '@/lib/attendance-auth';

export async function POST(request: NextRequest) {
  try {
    const { userId, name, token } = await request.json();
    if (!userId) {
      return NextResponse.json({ success: false, error: 'userId required' }, { status: 400 });
    }

    const proven = await verifyAttendanceIdentity(request, typeof token === 'string' ? token : null, userId);
    if (!proven) {
      return NextResponse.json({
        success: false,
        error: 'Please verify your identity (password or fingerprint) before registering a fingerprint.'
      }, { status: 401 });
    }

    const client = await clientPromise;
    const db = client.db('gold');
    const user = await db.collection('users').findOne({ _id: new ObjectId(userId) });
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const options = await createRegistrationOptions(userId, name || user.name);
    return NextResponse.json({ success: true, options });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
