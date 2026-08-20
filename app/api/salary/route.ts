import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { randomUUID } from 'crypto';
import bcrypt from 'bcrypt';
import { logAudit, extractChanges } from '@/lib/audit';
import { requireAdmin } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  try {
    const { response } = await requireAdmin();
    if (response) return response;

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const month = searchParams.get('month');
    const year = searchParams.get('year');

    const query: any = {};
    if (userId) query.userId = userId;

    const salaries = await prisma.salary.findMany({ where: query, orderBy: { createdAt: 'desc' } });

    let data: any = salaries.map(s => ({ ...s, _id: s.id }));

    if (month && year) {
      const m = parseInt(month);
      const y = parseInt(year);
      data = data.map((s: any) => ({
        ...s,
        paidThisMonth: ((s.history as any[]) || []).some((h: any) => h.month === m && h.year === y && h.status === 'paid'),
        paymentThisMonth: ((s.history as any[]) || []).find((h: any) => h.month === m && h.year === y)
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

    const body = await request.json();
    const { userId, newStaff, baseSalary, bankAccount, notes, position } = body;

    if (!baseSalary) {
      return NextResponse.json({ success: false, error: 'baseSalary is required' }, { status: 400 });
    }
    if (!userId && !newStaff?.name) {
      return NextResponse.json({ success: false, error: 'Select a staff member or provide a name to register new staff' }, { status: 400 });
    }

    let targetUserId = userId;

    if (newStaff?.name) {
      const name = newStaff.name.trim();
      const pos = newStaff.position?.trim() || position?.trim() || '';
      const phone = newStaff.phone?.trim() || '0000000000';
      const employeeId = `SAL-${String(Math.floor(1000 + Math.random() * 9000))}`;
      const email = `${name.toLowerCase().replace(/\s+/g, '.')}.${employeeId.toLowerCase()}@staff.local`;
      const passwordHash = await bcrypt.hash(String(Math.floor(1000 + Math.random() * 9000)), 10);

      const existingUser = await prisma.user.findFirst({ where: { email } });
      if (existingUser) {
        return NextResponse.json({ success: false, error: 'A user with this name could not be created. Try again.' }, { status: 400 });
      }

      const insertResult = await prisma.user.create({
        data: {
          id: randomUUID(),
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
        },
      });
      targetUserId = insertResult.id;
    }

    const user = await prisma.user.findFirst({ where: { id: targetUserId } });
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const existing = await prisma.salary.findFirst({ where: { userId: targetUserId } });
    if (existing) {
      return NextResponse.json({ success: false, error: 'Salary already registered for this user' }, { status: 400 });
    }

    const salary: any = {
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

    const result = await prisma.salary.create({
      data: { id: randomUUID(), ...salary }
    });
    logAudit({ action: 'CREATE', entity: 'salary', entityId: result.id, userId: adminUser?.id, userName: adminUser?.name, userRole: adminUser?.role, description: `Registered salary ${user.name}: ${baseSalary} ETB`, changes: { baseSalary: { from: null, to: parseFloat(baseSalary) } } });
    return NextResponse.json({ success: true, data: { ...salary, _id: result.id } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { user: adminUser, response } = await requireAdmin();
    if (response) return response;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const body = await request.json();

    if (!id) {
      return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 });
    }

    const update: any = { updatedAt: new Date().toISOString() };
    if (body.baseSalary !== undefined && body.baseSalary !== null) update.baseSalary = parseFloat(body.baseSalary);
    if (body.position !== undefined) update.position = body.position;
    if (body.bankAccount !== undefined) update.bankAccount = body.bankAccount;
    if (body.notes !== undefined) update.notes = body.notes;
    if (body.status) update.status = body.status;

    const before = await prisma.salary.findFirst({ where: { id } });
    await prisma.salary.updateMany(
      { where: { id }, data: update }
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

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 });
    }

    const before = await prisma.salary.findFirst({ where: { id } });
    await prisma.salary.deleteMany({ where: { id } });
    if (before) {
      logAudit({ action: 'DELETE', entity: 'salary', entityId: id, description: `Deleted salary for ${before.name} (${before.baseSalary} ETB)` });
    }
    return NextResponse.json({ success: true, message: 'Salary deleted' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
