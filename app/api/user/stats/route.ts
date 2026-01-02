import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../api/auth/[...nextauth]/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Generate referral code
    const referralCode = `REF-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

    return NextResponse.json({
      totalPoints: 0,
      availablePoints: 0,
      transactions: [],
      referralCode
    });
  } catch (error) {
    console.error('Error fetching points:', error);
    return NextResponse.json(
      { error: 'Failed to fetch points' },
      { status: 500 }
    );
  }
}