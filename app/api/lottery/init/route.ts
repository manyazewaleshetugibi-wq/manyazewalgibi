import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/api-auth';

export async function POST(request: NextRequest) {
  try {
    const { response } = await requireAdmin();
    if (response) return response;

    const { action } = await request.json();

    if (action === 'initialize-tickets') {
      // Initialize lottery tickets for all users with role="user"
      const users = await prisma.user.findMany({
        where: {
          role: 'user',
          status: 'active'
        }
      });

      const updates = users.map(user => prisma.user.updateMany({
        where: { id: user.id },
        data: {
          lotteryTickets: 1, // Give 1 ticket to each active user
          hasWonThisMonth: false,
          updatedAt: new Date()
        }
      }));

      if (updates.length > 0) {
        await prisma.$transaction(updates);
      }

      return NextResponse.json({
        success: true,
        message: `Initialized lottery data for ${updates.length} users`
      });
    }

    if (action === 'reset-month') {
      // Reset monthly lottery flags
      await prisma.user.updateMany(
        {
          where: { role: 'user' },
          data: {
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
