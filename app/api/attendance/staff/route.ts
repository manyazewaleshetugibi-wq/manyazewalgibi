import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { getToken } from 'next-auth/jwt';

export async function GET(request: NextRequest) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }
    const permissions = Array.isArray(token.permissions) ? token.permissions : [];
    if (String(token.role) !== 'admin' && !permissions.includes('view_attendance')) {
      return NextResponse.json({ success: false, error: 'Access denied for your role' }, { status: 403 });
    }

    const client = await clientPromise;
    const db = client.db('gold');
    const staff = await db.collection('users')
      .find(
        { status: 'active', role: { $ne: 'customer' } },
        { projection: { password: 0, pin: 0 } }
      )
      .sort({ name: 1 })
      .toArray();
    return NextResponse.json({ success: true, data: staff });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
