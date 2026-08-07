import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/api-auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { response } = await requireAdmin();
    if (response) return response;

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Invalid prize ID' },
        { status: 400 }
      );
    }

    const prize = await prisma.prize.findFirst({
      where: { id }
    });

    if (!prize) {
      return NextResponse.json(
        { success: false, message: 'Prize not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        ...prize,
        id: prize.id,
        _id: undefined
      }
    });

  } catch (error: any) {
    console.error('Error fetching prize:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch prize' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { response } = await requireAdmin();
    if (response) return response;

    const { id } = await params;
    const updates: any = await request.json();

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Invalid prize ID' },
        { status: 400 }
      );
    }

    // Remove fields that shouldn't be updated
    delete updates._id;
    delete updates.id;
    delete updates.createdAt;
    delete updates.totalWon;

    updates.updatedAt = new Date();

    const result = await prisma.prize.updateMany(
      { where: { id }, data: updates }
    );

    if (result.count === 0) {
      return NextResponse.json(
        { success: false, message: 'Prize not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Prize updated successfully'
    });

  } catch (error: any) {
    console.error('Error updating prize:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update prize' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { response } = await requireAdmin();
    if (response) return response;

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Invalid prize ID' },
        { status: 400 }
      );
    }

    const result = await prisma.prize.deleteMany({
      where: { id }
    });

    if (result.count === 0) {
      return NextResponse.json(
        { success: false, message: 'Prize not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Prize deleted successfully'
    });

  } catch (error: any) {
    console.error('Error deleting prize:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to delete prize' },
      { status: 500 }
    );
  }
}
