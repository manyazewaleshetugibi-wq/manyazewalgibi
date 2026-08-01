import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import bcrypt from 'bcrypt';

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();
    if (!password?.trim()) {
      return NextResponse.json({ success: false, error: 'Password is required' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db('gold');
    const usersCollection = db.collection('users');

    const otherUsers = await usersCollection.find(
      { role: 'other', status: 'active' },
      { projection: { _id: 1, name: 1, employeeId: 1, department: 1, role: 1, password: 1, pin: 1 } }
    ).toArray();

    for (const user of otherUsers) {
      const storedHash = user.password || user.pin;
      if (storedHash) {
        const match = await bcrypt.compare(password.trim(), storedHash);
        if (match) {
          return NextResponse.json({
            success: true,
            data: {
              _id: user._id,
              name: user.name,
              employeeId: user.employeeId,
              department: user.department,
              role: user.role,
            },
          });
        }
      }
    }

    return NextResponse.json({ success: false, error: 'Invalid password' }, { status: 401 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
