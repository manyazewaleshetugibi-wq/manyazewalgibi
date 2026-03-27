import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/auth";

export async function PATCH(request: NextRequest) {
  try {
    console.log('=== API: update-calculated-status called ===');
    
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { orderIds, calculated } = body;

    console.log('Received request:', { orderIds, calculated });

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid input. orderIds array is required.' },
        { status: 400 }
      );
    }

    if (typeof calculated !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'Invalid input. calculated must be a boolean.' },
        { status: 400 }
      );
    }

    const dbClient = await clientPromise;
    const db = dbClient.db("gold");

    // Get current waitress
    const currentWaitress = await db.collection("waitresses").findOne(
      { email: session.user.email }
    );

    if (!currentWaitress) {
      return NextResponse.json(
        { success: false, error: 'Waitress profile not found.' },
        { status: 404 }
      );
    }

    console.log('Current waitress:', { id: currentWaitress._id, name: currentWaitress.name });

    // Convert order IDs to ObjectId
    const validOrderIds = [];
    const invalidIds = [];

    for (const id of orderIds) {
      try {
        const idStr = String(id).trim();
        
        if (ObjectId.isValid(idStr)) {
          validOrderIds.push(new ObjectId(idStr));
          console.log(`✅ Valid ID: ${idStr}`);
        } else {
          invalidIds.push(idStr);
          console.warn(`❌ Invalid ObjectId format: ${idStr} (length: ${idStr.length})`);
        }
      } catch (err) {
        invalidIds.push(id);
        console.error(`Error processing ID ${id}:`, err);
      }
    }

    if (validOrderIds.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'No valid order IDs provided.',
          invalidIds: invalidIds
        },
        { status: 400 }
      );
    }

    console.log(`Processing ${validOrderIds.length} valid order IDs`);

    // Build query with waiterId as string
    const waiterIdString = currentWaitress._id.toString();
    
    const checkQuery = {
      _id: { $in: validOrderIds },
      waiterId: waiterIdString
    };

    // Check if orders exist
    const existingOrders = await db.collection("orders").find(checkQuery).toArray();
    
    console.log(`Found ${existingOrders.length} orders to update`);
    
    if (existingOrders.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'No orders found to update. Orders may not belong to you.',
          requestedCount: validOrderIds.length,
          foundCount: 0
        },
        { status: 404 }
      );
    }

    // Update orders
    const updateData: any = { 
      calculated: calculated,
      updatedAt: new Date()
    };
    
    if (calculated) {
      updateData.status = 'COMPLETED';
    }
    
    const updateResult = await db.collection("orders").updateMany(
      checkQuery,
      { $set: updateData }
    );

    console.log('Update result:', {
      matchedCount: updateResult.matchedCount,
      modifiedCount: updateResult.modifiedCount
    });

    return NextResponse.json({
      success: true,
      message: `Successfully updated ${updateResult.modifiedCount} orders`,
      updatedCount: updateResult.modifiedCount,
      matchedCount: updateResult.matchedCount,
      updatedOrders: existingOrders.map(o => o.orderNumber)
    });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    );
  }
}