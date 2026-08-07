import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/api-auth';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { response } = await requireAdmin();
    if (response) return response;

    // Await the params in Next.js 15+
    const { id } = await params;
    
    const updates = await request.json();

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Invalid participant ID' },
        { status: 400 }
      );
    }

    // Remove fields that shouldn't be updated
    delete updates._id;
    delete updates.id;
    delete updates.email;
    delete updates.role;

    // Update participant lottery data
    const result = await prisma.user.updateMany(
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
        { success: false, message: 'Participant not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Participant lottery data updated successfully'
    });

  } catch (error: any) {
    console.error('Error updating participant lottery data:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to update participant lottery data',
        error: error.message 
      },
      { status: 500 }
    );
  }
}
