import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const client = await clientPromise;
    const db = client.db();

    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: 'Invalid prize ID' },
        { status: 400 }
      );
    }

    const prize = await db.collection('prizes').findOne({
      _id: new ObjectId(id)
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
        id: prize._id.toString(),
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
    const { id } = await params;
    const client = await clientPromise;
    const db = client.db();
    const updates = await request.json();

    if (!id || !ObjectId.isValid(id)) {
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

    const result = await db.collection('prizes').updateOne(
      { _id: new ObjectId(id) },
      { $set: updates }
    );

    if (result.matchedCount === 0) {
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
    const { id } = await params;
    const client = await clientPromise;
    const db = client.db();

    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: 'Invalid prize ID' },
        { status: 400 }
      );
    }

    const result = await db.collection('prizes').deleteOne({
      _id: new ObjectId(id)
    });

    if (result.deletedCount === 0) {
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