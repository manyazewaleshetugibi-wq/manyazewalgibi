import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcrypt';
import { createClockinToken, checkRateLimit } from '@/lib/attendance-auth';

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();
    if (!password?.trim()) {
      return NextResponse.json({ success: false, error: 'Password is required' }, { status: 400 });
    }

    const limit = checkRateLimit(request, MAX_ATTEMPTS, WINDOW_MS);
    if (!limit.allowed) {
      return NextResponse.json({
        success: false,
        error: `Too many attempts. Try again in ${limit.retryAfterSec} seconds.`
      }, { status: 429 });
    }

    const staffUsers = await prisma.user.findMany({
      where: {
        status: 'active',
        OR: [{ role: { not: 'customer' } }, { role: null }],
      },
      select: { id: true, name: true, employeeId: true, department: true, role: true, password: true, pin: true },
    });

    for (const user of staffUsers) {
      const storedHash = user.password || user.pin;
      if (storedHash) {
        const match = await bcrypt.compare(password.trim(), storedHash);
        if (match) {
          return NextResponse.json({
            success: true,
            token: createClockinToken(user.id),
            data: {
              _id: user.id,
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
