import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

import { auth } from "@/auth";

export async function PATCH(request: NextRequest) {
  try {

    
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { orderIds, calculated } = body;



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

    // Get current waitress
    const currentWaitress = await prisma.waitress.findFirst(
      { where: { email: session.user.email } }
    );

    if (!currentWaitress) {
      return NextResponse.json(
        { success: false, error: 'Waitress profile not found.' },
        { status: 404 }
      );
    }



    // Collect order IDs as strings
    const validOrderIds = [];
    const invalidIds = [];

    for (const id of orderIds) {
      try {
        const idStr = String(id).trim();
        
        if (idStr) {
          validOrderIds.push(idStr);

        } else {
          invalidIds.push(idStr);
          console.warn(`❌ Invalid ID format: ${idStr}`);
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



    // Build query with waiterId as string
    const waiterIdString = currentWaitress.id;
    
    const checkQuery = {
      id: { in: validOrderIds },
      waiterId: waiterIdString
    };

    // Check if orders exist
    const existingOrders = await prisma.order.findMany({ where: checkQuery });
    

    
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
    
    const updateResult = await prisma.order.updateMany(
      { where: checkQuery, data: updateData }
    );



    return NextResponse.json({
      success: true,
      message: `Successfully updated ${updateResult.count} orders`,
      updatedCount: updateResult.count,
      matchedCount: updateResult.count,
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
