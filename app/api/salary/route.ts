import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import bcrypt from 'bcrypt';
import { logAudit, extractChanges } from '@/lib/audit';
import { requireAdmin } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  try {
    const { response } = await requireAdmin();
    if (response) return response;

    const client = await clientPromise;
    const db = client.db('gold');
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const month = searchParams.get('month');
    const year = searchParams.get('year');

    const query: any = {};
    if (userId) query.userId = userId;

    const salaries = await db.collection('salary').find(query).sort({ createdAt: -1 }).toArray();

    let data = salaries;

    if (month && year) {
      const m = parseInt(month);
      const y = parseInt(year);
      data = salaries.map(s => ({
        ...s,
        paidThisMonth: (s.history || []).some((h: any) => h.month === m && h.year === y && h.status === 'paid'),
        paymentThisMonth: (s.history || []).find((h: any) => h.month === m && h.year === y)
      }));
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user: adminUser, response } = await requireAdmin();
    if (response) return response;

    const client = await clientPromise;
    const db = client.db('gold');
    const body = await request.json();
    const { userId, newStaff, baseSalary, bankAccount, notes, position } = body;

    if (!baseSalary) {
      return NextResponse.json({ success: false, error: 'baseSalary is required' }, { status: 400 });
    }
    if (!userId && !newStaff?.name) {
      return NextResponse.json({ success: false, error: 'Select a staff member or provide a name to register new staff' }, { status: 400 });
    }

    const usersCollection = db.collection('users');
    let targetUserId = userId;

    if (newStaff?.name) {
      const name = newStaff.name.trim();
      const pos = newStaff.position?.trim() || position?.trim() || '';
      const phone = newStaff.phone?.trim() || '0000000000';
      const employeeId = `SAL-${String(Math.floor(1000 + Math.random() * 9000))}`;
      const email = `${name.toLowerCase().replace(/\s+/g, '.')}.${employeeId.toLowerCase()}@staff.local`;
      const passwordHash = await bcrypt.hash(String(Math.floor(1000 + Math.random() * 9000)), 10);

      const existingUser = await usersCollection.findOne({ email });
      if (existingUser) {
        return NextResponse.json({ success: false, error: 'A user with this name could not be created. Try again.' }, { status: 400 });
      }

      const newUserDoc = {
        name,
        email,
        phone,
        employeeId,
        department: pos,
        role: 'other',
        password: passwordHash,
        status: 'active',
        permissions: [],
        requiresPasswordChange: false,
        loginAttempts: 0,
        lastLogin: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const insertResult = await usersCollection.insertOne(newUserDoc);
      targetUserId = String(insertResult.insertedId);
    }

    const user = await usersCollection.findOne({ _id: new ObjectId(targetUserId) });
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const existing = await db.collection('salary').findOne({ userId: targetUserId });
    if (existing) {
      return NextResponse.json({ success: false, error: 'Salary already registered for this user' }, { status: 400 });
    }

    const salary = {
      userId: targetUserId,
      name: user.name,
      email: user.email,
      role: user.role,
      position: position || user.department || user.specialization || user.role || '',
      baseSalary: parseFloat(baseSalary),
      bankAccount: bankAccount || '',
      notes: notes || '',
      status: 'active',
      history: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = await db.collection('salary').insertOne(salary);
    logAudit({ action: 'CREATE', entity: 'salary', entityId: String(result.insertedId), userId: adminUser?.id, userName: adminUser?.name, userRole: adminUser?.role, description: `Registered salary ${user.name}: ${baseSalary} ETB`, changes: { baseSalary: { from: null, to: parseFloat(baseSalary) } } });
    return NextResponse.json({ success: true, data: { ...salary, _id: result.insertedId } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { user: adminUser, response } = await requireAdmin();
    if (response) return response;

    const client = await clientPromise;
    const db = client.db('gold');
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const body = await request.json();

    if (!id) {
      return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 });
    }

    const update: any = { updatedAt: new Date().toISOString() };
    if (body.baseSalary) update.baseSalary = parseFloat(body.baseSalary);
    if (body.position !== undefined) update.position = body.position;
    if (body.bankAccount !== undefined) update.bankAccount = body.bankAccount;
    if (body.notes !== undefined) update.notes = body.notes;
    if (body.status) update.status = body.status;

    const before = await db.collection('salary').findOne({ _id: new ObjectId(id) });
    await db.collection('salary').updateOne(
      { _id: new ObjectId(id) },
      { $set: update }
    );
    if (before) {
      logAudit({ action: 'UPDATE', entity: 'salary', entityId: id, userId: adminUser?.id, userName: adminUser?.name, userRole: adminUser?.role, description: `Updated salary for ${before.name}`, changes: extractChanges(before, { ...before, ...update }) });
    }
    return NextResponse.json({ success: true, message: 'Salary updated' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { response } = await requireAdmin();
    if (response) return response;

    const client = await clientPromise;
    const db = client.db('gold');
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 });
    }

    const before = await db.collection('salary').findOne({ _id: new ObjectId(id) });
    await db.collection('salary').deleteOne({ _id: new ObjectId(id) });
    if (before) {
      logAudit({ action: 'DELETE', entity: 'salary', entityId: id, description: `Deleted salary for ${before.name} (${before.baseSalary} ETB)` });
    }
    return NextResponse.json({ success: true, message: 'Salary deleted' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
