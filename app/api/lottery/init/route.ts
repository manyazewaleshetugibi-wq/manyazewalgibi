import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { requireAdmin } from '@/lib/api-auth';

export async function POST(request: NextRequest) {
  try {
    const { response } = await requireAdmin();
    if (response) return response;

    const client = await clientPromise;
    const db = client.db();

    const { action } = await request.json();

    if (action === 'initialize-tickets') {
      // Initialize lottery tickets for all users with role="user"
      const users = await db.collection('users').find({ 
        role: 'user',
        status: 'active'
      }).toArray();

      const updates = users.map(user => ({
        updateOne: {
          filter: { _id: user._id },
          update: {
            $set: {
              lotteryTickets: 1, // Give 1 ticket to each active user
              hasWonThisMonth: false,
              totalWins: 0,
              points: 0,
              updatedAt: new Date()
            }
          }
        }
      }));

      if (updates.length > 0) {
        await db.collection('users').bulkWrite(updates);
      }

      return NextResponse.json({
        success: true,
        message: `Initialized lottery data for ${updates.length} users`
      });
    }

    if (action === 'reset-month') {
      // Reset monthly lottery flags
      await db.collection('users').updateMany(
        { role: 'user' },
        {
          $set: {
            hasWonThisMonth: false,
            updatedAt: new Date()
          }
        }
      );

      return NextResponse.json({
        success: true,
        message: 'Monthly lottery flags reset successfully'
      });
    }

    return NextResponse.json(
      { success: false, message: 'Invalid action' },
      { status: 400 }
    );

  } catch (error: any) {
    console.error('Error initializing lottery data:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to initialize lottery data' },
      { status: 500 }
    );
  }
}
