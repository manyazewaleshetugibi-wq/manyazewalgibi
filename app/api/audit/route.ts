import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { requireAdmin } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  try {
    const { response } = await requireAdmin();
    if (response) return response;

    const client = await clientPromise;
    const db = client.db('gold');
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
      filter.$or = [
        { description: { $regex: s, $options: 'i' } },
        { userName: { $regex: s, $options: 'i' } },
        { entity: { $regex: s, $options: 'i' } },
      ];
    }
    if (searchParams.get('from')) {
      filter.createdAt = { ...filter.createdAt, $gte: searchParams.get('from') };
    }
    if (searchParams.get('to')) {
      filter.createdAt = { ...filter.createdAt, $lte: searchParams.get('to') };
    }

    const [total, logs] = await Promise.all([
      db.collection('audit').countDocuments(filter),
      db.collection('audit')
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
    ]);

    return NextResponse.json({ success: true, data: logs, total, page, limit, pages: Math.ceil(total / limit) });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
