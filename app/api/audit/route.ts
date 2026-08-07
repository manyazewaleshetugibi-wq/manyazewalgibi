import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  try {
    const { response } = await requireAdmin();
    if (response) return response;

    const { searchParams } = new URL(request.url);

    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50')));
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (searchParams.get('entity')) filter.entity = searchParams.get('entity');
    if (searchParams.get('action')) filter.action = searchParams.get('action');
    if (searchParams.get('userId')) filter.userId = searchParams.get('userId');
    if (searchParams.get('search')) {
      const s = searchParams.get('search');
      filter.OR = [
        { description: { contains: s, mode: 'insensitive' } },
        { userName: { contains: s, mode: 'insensitive' } },
        { entity: { contains: s, mode: 'insensitive' } },
      ];
    }
    if (searchParams.get('from')) {
      filter.createdAt = { ...filter.createdAt, gte: new Date(searchParams.get('from') as string) };
    }
    if (searchParams.get('to')) {
      filter.createdAt = { ...filter.createdAt, lte: new Date(searchParams.get('to') as string) };
    }

    const [total, logs] = await Promise.all([
      prisma.audit.count({ where: filter }),
      prisma.audit.findMany({
        where: filter,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: logs.map((log: any) => ({ ...log, _id: log.id })),
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
