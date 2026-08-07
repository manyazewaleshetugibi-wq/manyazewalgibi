import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logAudit } from '@/lib/audit';
import { requireRole } from '@/lib/api-auth';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export async function POST(request: NextRequest) {
  try {
    const { response } = await requireRole(["admin", "finance"]);
    if (response) return response;

    const body = await request.json();
    const { salaryId, month, year, amount, notes } = body;

    if (!salaryId || month === undefined || !year) {
      return NextResponse.json({ success: false, error: 'salaryId, month, and year are required' }, { status: 400 });
    }

    const salary = await prisma.salary.findFirst({ where: { id: salaryId } });
    if (!salary) {
      return NextResponse.json({ success: false, error: 'Salary not found' }, { status: 404 });
    }

    const existingPayment = ((salary.history as any[]) || []).find(
      (h: any) => h.month === parseInt(month) && h.year === parseInt(year) && h.status === 'paid'
    );
    if (existingPayment) {
      return NextResponse.json({ success: false, error: 'Already paid for this month' }, { status: 400 });
    }

    const payAmount = amount ? parseFloat(amount) : salary.baseSalary;
    const payment = {
      month: parseInt(month),
      year: parseInt(year),
      amount: payAmount,
      paidAt: new Date().toISOString(),
      status: 'paid',
      notes: notes || '',
    };

    const currentHistory = (salary.history as any[]) || [];
    await prisma.salary.updateMany(
      { where: { id: salaryId }, data: { history: [...currentHistory, payment] as any, updatedAt: new Date().toISOString() } }
    );

    logAudit({ action: 'PAY', entity: 'salary', entityId: salaryId, userId: body._userId, userName: body._userName, userRole: body._userRole, description: `Paid salary ${salary.name} for ${MONTHS[parseInt(month) - 1]} ${year}: ${payAmount} ETB`, changes: { amount: { from: null, to: payAmount }, month: { from: null, to: `${MONTHS[parseInt(month) - 1]} ${year}` } } });
    return NextResponse.json({ success: true, data: payment });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
