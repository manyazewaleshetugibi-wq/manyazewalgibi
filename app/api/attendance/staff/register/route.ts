import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import bcrypt from 'bcrypt';

export async function POST(request: NextRequest) {
  try {
    const { name, department } = await request.json();
    if (!name?.trim()) {
      return NextResponse.json({ success: false, error: 'Name is required' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db('gold');
    const usersCollection = db.collection('users');

    const password = String(Math.floor(1000 + Math.random() * 9000));
    const passwordHash = await bcrypt.hash(password, 10);
    const employeeId = `PROD-${String(Math.floor(1000 + Math.random() * 9000))}`;
    const email = `${name.trim().replace(/\s+/g, '.').toLowerCase()}.${employeeId.toLowerCase()}@restaurant.local`;

    const existingEmail = await usersCollection.findOne({ email });
    if (existingEmail) {
      return NextResponse.json({ success: false, error: 'Try again' }, { status: 400 });
    }

    const newUser = {
      name: name.trim(),
      email,
      phone: '0000000000',
      employeeId,
      department: department?.trim() || '',
      role: 'other',
      password: passwordHash,
      status: 'active',
      permissions: ['view_attendance'],
      requiresPasswordChange: false,
      loginAttempts: 0,
      lastLogin: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await usersCollection.insertOne(newUser);

    return NextResponse.json({
      success: true,
      data: {
        _id: result.insertedId.toString(),
        name: newUser.name,
        employeeId: newUser.employeeId,
        department: newUser.department,
        role: newUser.role,
        password,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
