import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function GET() {
  try {
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
