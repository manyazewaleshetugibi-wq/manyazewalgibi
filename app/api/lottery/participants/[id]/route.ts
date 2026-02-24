import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await the params in Next.js 15+
    const { id } = await params;
    
    const client = await clientPromise;
    const db = client.db();
    const updates = await request.json();

    if (!id || !ObjectId.isValid(id)) {
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
    const result = await db.collection('users').updateOne(
      { _id: new ObjectId(id) },
      { 
        $set: {
          ...updates,
          updatedAt: new Date()
        }
      }
    );

    if (result.matchedCount === 0) {
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