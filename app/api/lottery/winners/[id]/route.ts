import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }  // params is now a Promise
) {
  try {
    // Must await params before accessing its properties
    const { id } = await params;
    
    const client = await clientPromise;
    const db = client.db();
    const updates = await request.json();

    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: 'Invalid winner ID' },
        { status: 400 }
      );
    }

    // Remove fields that shouldn't be updated
    delete updates._id;
    delete updates.id;

    const result = await db.collection('lottery_winners').updateOne(
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