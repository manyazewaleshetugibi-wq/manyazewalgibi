import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/api-auth';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }  // params is now a Promise
) {
  try {
    const { response } = await requireAdmin();
    if (response) return response;

    // Must await params before accessing its properties
    const { id } = await params;
    
    const updates: any = await request.json();

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Invalid winner ID' },
        { status: 400 }
      );
    }

    // Remove fields that shouldn't be updated
    delete updates._id;
    delete updates.id;

    const result = await prisma.lotteryWinner.updateMany(
      {
        where: { id },
        data: {
          ...updates,
          updatedAt: new Date()
        }
      }
    );

    if (result.count === 0) {
      return NextResponse.json(
        { success: false, message: 'Winner not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Winner updated successfully'
    });

  } catch (error: any) {
    console.error('Error updating winner:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to update winner',
        error: error.message 
      },
      { status: 500 }
    );
  }
}
