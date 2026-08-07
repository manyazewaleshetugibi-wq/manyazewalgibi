import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { randomUUID } from 'crypto';
import { requireAdmin } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  try {
    const { response } = await requireAdmin();
    if (response) return response;

    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');
    const year = searchParams.get('year');
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50;

    const query: any = {};
    
    if (month && year) {
      query.month = `${year}-${month.toString().padStart(2, '0')}`;
    }

    const winners = await prisma.lotteryWinner.findMany({
      where: query,
      orderBy: { winDate: 'desc' },
      take: limit
    });

    // Map to ensure _id is string
    const mappedWinners = winners.map(winner => ({
      ...winner,
      id: winner.id,
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
    const { response } = await requireAdmin();
    if (response) return response;

    const winnerData = await request.json();

    // Validate required fields
    if (!winnerData.employeeId || !winnerData.employeeName || !winnerData.prize) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }

    const winner: any = {
      ...winnerData,
      claimed: winnerData.claimed || false,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await prisma.lotteryWinner.create({
      data: { id: randomUUID(), ...winner }
    });

    return NextResponse.json({
      success: true,
      data: { id: result.id, ...winnerData }
    });

  } catch (error: any) {
    console.error('Error saving lottery winner:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to save winner' },
      { status: 500 }
    );
  }
}
