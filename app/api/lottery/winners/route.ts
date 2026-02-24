import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET(request: NextRequest) {
  try {
    const client = await clientPromise;
    const db = client.db();

    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');
    const year = searchParams.get('year');
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50;

    const query: any = {};
    
    if (month && year) {
      query.month = `${year}-${month.toString().padStart(2, '0')}`;
    }

    const winners = await db.collection('lottery_winners')
      .find(query)
      .sort({ winDate: -1 })
      .limit(limit)
      .toArray();

    // Map to ensure _id is string
    const mappedWinners = winners.map(winner => ({
      ...winner,
      id: winner._id.toString(),
      _id: undefined
    }));

    return NextResponse.json({
      success: true,
      data: mappedWinners,
      total: mappedWinners.length
    });

  } catch (error: any) {
    console.error('Error fetching lottery winners:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch winners' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const client = await clientPromise;
    const db = client.db();
    const winnerData = await request.json();

    // Validate required fields
    if (!winnerData.employeeId || !winnerData.employeeName || !winnerData.prize) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }

    const winner = {
      ...winnerData,
      claimed: winnerData.claimed || false,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db.collection('lottery_winners').insertOne(winner);

    return NextResponse.json({
      success: true,
      data: { id: result.insertedId.toString(), ...winnerData }
    });

  } catch (error: any) {
    console.error('Error saving lottery winner:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to save winner' },
      { status: 500 }
    );
  }
}