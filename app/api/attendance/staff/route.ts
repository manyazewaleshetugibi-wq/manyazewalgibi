import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
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

    const staff = (await prisma.user.findMany({
      where: {
        status: 'active',
        OR: [{ role: { not: 'customer' } }, { role: null }],
      },
      orderBy: { name: 'asc' },
    })).map(({ password, pin, ...rest }) => ({ ...rest, _id: rest.id }));
    return NextResponse.json({ success: true, data: staff });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
