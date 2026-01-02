import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../api//auth/[...nextauth]/auth';


export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // In a real app, fetch points from database
    // const points = await db.collection('user_points').findOne({ userId: session.user.id });
    // const transactions = await db.collection('point_transactions').find({ userId: session.user.id }).toArray();

    const mockPoints = {
      totalPoints: 125,
      availablePoints: 125,
      transactions: [
        { id: '1', type: 'referral', points: 10, description: 'Referral bonus - John Doe', date: '2024-01-15' },
        { id: '2', type: 'order', points: 5, description: 'Order #ORD-001', date: '2024-01-14' },
        { id: '3', type: 'referral', points: 10, description: 'Referral bonus - Jane Smith', date: '2024-01-13' },
        { id: '4', type: 'order', points: 5, description: 'Order #ORD-002', date: '2024-01-12' },
      ]
    };

    return NextResponse.json(mockPoints);
  } catch (error) {
    console.error('Error fetching points:', error);
    return NextResponse.json(
      { error: 'Failed to fetch points' },
      { status: 500 }
    );
  }
}
