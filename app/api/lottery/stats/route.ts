import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function GET(request: NextRequest) {
  try {
    const client = await clientPromise;
    const db = client.db();

    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');
    const year = searchParams.get('year') || new Date().getFullYear().toString();

    // Build query for current month's winners
    const winnerQuery: any = {};
    if (month) {
      winnerQuery.month = `${year}-${month.toString().padStart(2, '0')}`;
    }

    // Get total spins (total winners count)
    const totalSpins = await db.collection('lottery_winners').countDocuments();

    // Get current month's winners
    const monthWinners = month 
      ? await db.collection('lottery_winners').find(winnerQuery).toArray()
      : [];

    // Calculate total prize value for current month
    const totalPrizeValue = monthWinners.reduce((sum, winner) => sum + (winner.prizeValue || 0), 0);

    // Get total participants (users with role="user")
    const totalParticipants = await db.collection('users').countDocuments({ role: 'user' });

    // Get active participants
    const activeParticipants = await db.collection('users').countDocuments({ 
      role: 'user',
      status: 'active'
    });

    // Calculate jackpot value (example formula - adjust as needed)
    const baseJackpot = 1000;
    const jackpotValue = baseJackpot + (totalSpins * 10) - totalPrizeValue;

    return NextResponse.json({
      success: true,
      data: {
        totalSpins,
        totalWinners: totalSpins,
        totalParticipants,
        activeParticipants,
        monthWinners: monthWinners.length,
        monthPrizeValue: totalPrizeValue,
        jackpotValue: Math.max(0, jackpotValue),
        lastUpdated: new Date().toISOString()
      }
    });

  } catch (error: any) {
    console.error('Error fetching lottery stats:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch lottery stats' },
      { status: 500 }
    );
  }
}
