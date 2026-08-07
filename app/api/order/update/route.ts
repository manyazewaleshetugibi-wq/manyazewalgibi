import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import prisma from "@/lib/prisma";

import { auth } from "@/auth";

// Debug flag
const DEBUG = true;

function debugLog(message: string, data?: any) {
  if (DEBUG) {

  }
}

function debugError(message: string, error: any) {
  console.error(`[ERROR] ${message}`, error);
}

// Helper function to normalize status to lowercase
function normalizeStatus(status: string): string {
  return status?.toLowerCase() || "pending";
}

// PUT: Update an order (specifically for waitress updates)
export async function PUT(req: NextRequest) {
  try {
    const session = await auth();
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized', success: false },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { 
      orderId, 
      orderItems, 
      items, 
      notes, 
      tableNumber, 
      status, 
      customerName, 
      discount,
      numberOfGuests,
      specialRequirements,
      paymentMethod,
      paymentStatus
    } = body;

    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID is required', success: false },
        { status: 400 }
      );
    }

    // Get waitress by email
    const waitress = await prisma.waitress.findFirst(
      { where: { email: session.user.email } }
    );

    if (!waitress) {
      return NextResponse.json(
        { error: 'Waitress not found' },
        { status: 404 }
      );
    }

    const waitressDbId = waitress.id;
    
    // Verify the order belongs to this waitress
    const query: any = { id: orderId, waiterId: waitressDbId };
    let existingOrder = await prisma.order.findFirst({ where: query });

    if (!existingOrder) {
      return NextResponse.json(
        { error: 'Order not found or access denied' },
        { status: 404 }
      );
    }

    debugLog(`Updating order ${orderId} for waitress ${waitress.name}`);

    // Prepare update data
    const updateData: any = {
      updatedAt: new Date()
    };

    // Handle items update (support both orderItems and items from body)
    const itemsToUpdate = orderItems || items;

    if (itemsToUpdate && Array.isArray(itemsToUpdate)) {
      debugLog(`Updating items for order ${orderId}. Item count: ${itemsToUpdate.length}`);
      
      let totalAmount = 0;
      const processedItems = [];

      for (const item of itemsToUpdate) {
        const itemId = item.menuItemId || item.itemId || item._id;
        if (!itemId) continue;

        // Fetch item details from DB to ensure valid price/name
        const dbItem = await prisma.item.findFirst({ where: { id: itemId } });
        
        if (dbItem) {
          const quantity = Number(item.quantity) || 0;
          const price = dbItem.price || 0;
          const subtotal = price * quantity;
          
          totalAmount += subtotal;

          processedItems.push({
            id: item.id || randomUUID(),
            itemId: itemId,
            menuItemId: itemId,
            name: dbItem.name,
            itemName: dbItem.name,
            price: price,
            unitPrice: price,
            quantity: quantity,
            subtotal: subtotal,
            specialInstructions: item.specialInstructions || "",
            status: item.status || "PENDING",
            image: dbItem.imageUrl || ""
          });
        }
      }

      // Update 'items' field (standardizing on 'items')
      updateData.items = processedItems;
      // Also update 'orderItems' to keep in sync if it was used previously
      updateData.orderItems = processedItems;

      updateData.totalAmount = totalAmount;
      
      const taxAmount = totalAmount * 0.15;
      updateData.tax = taxAmount;
      const appliedDiscount = discount !== undefined ? discount : (existingOrder.discount || 0);
      updateData.discount = appliedDiscount;
      updateData.finalAmount = totalAmount + taxAmount - appliedDiscount;
      
      debugLog(`New totals: Subtotal=${totalAmount}, Tax=${taxAmount}, Final=${updateData.finalAmount}`);
    }

    if (notes !== undefined) updateData.notes = notes;
    if (tableNumber !== undefined) updateData.tableNumber = tableNumber;
    if (status) updateData.status = normalizeStatus(status);
    if (customerName !== undefined) updateData.customerName = customerName;
    if (discount !== undefined) updateData.discount = discount;
    if (numberOfGuests !== undefined) updateData.numberOfGuests = numberOfGuests;
    if (specialRequirements !== undefined) updateData.specialRequirements = specialRequirements;
    if (paymentMethod !== undefined) updateData.paymentMethod = paymentMethod;
    if (paymentStatus !== undefined) updateData.paymentStatus = paymentStatus;

    // Execute update
    let result = await prisma.order.updateMany(
      { where: query, data: updateData }
    );

    if (result.count === 0) {
      return NextResponse.json(
        { error: 'Failed to update order in database' },
        { status: 500 }
      );
    }

    // Fetch updated order
    const updatedOrder = await prisma.order.findFirst({ where: query });

    if (!updatedOrder) {
      return NextResponse.json(
        { error: 'Failed to retrieve updated order' },
        { status: 500 }
      );
    }

    // Transform order for response
    const transformedOrder = {
      id: updatedOrder.id,
      orderNumber: updatedOrder.orderNumber || `ORD-${updatedOrder.id.slice(-6)}`,
      status: updatedOrder.status || 'PENDING',
      totalAmount: updatedOrder.totalAmount || 0,
      finalAmount: updatedOrder.finalAmount || updatedOrder.totalAmount || 0,
      notes: updatedOrder.notes || '',
      updatedAt: updatedOrder.updatedAt?.toISOString() || new Date().toISOString(),
      orderItems: updatedOrder.items || updatedOrder.orderItems || [],
      tableNumber: updatedOrder.tableNumber || (updatedOrder.tableId as any) || '',
      customerName: updatedOrder.customerName || '',
      numberOfGuests: updatedOrder.numberOfGuests || 1,
      specialRequirements: updatedOrder.specialRequirements || '',
      waiterId: updatedOrder.waiterId || waitressDbId
    };

    return NextResponse.json({
      success: true,
      message: 'Order updated successfully',
      order: transformedOrder
    });
    
  } catch (error) {
    debugError('Error updating order:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to update order',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// PATCH endpoint for waitress-specific updates (partial updates)
export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized', success: false },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { orderId, updates } = body;

    if (!orderId || !updates) {
      return NextResponse.json(
        { error: 'Order ID and updates are required', success: false },
        { status: 400 }
      );
    }

    // Get waitress by email
    const waitress = await prisma.waitress.findFirst(
      { where: { email: session.user.email } }
    );

    if (!waitress) {
      return NextResponse.json(
        { error: 'Waitress not found' },
        { status: 404 }
      );
    }

    const waitressDbId = waitress.id;
    
    // Verify the order belongs to this waitress
    const query: any = { id: orderId, waiterId: waitressDbId };
    const existingOrder = await prisma.order.findFirst({ where: query });

    if (!existingOrder) {
      return NextResponse.json(
        { error: 'Order not found or access denied' },
        { status: 404 }
      );
    }

    debugLog(`PATCH update for order ${orderId} by waitress ${waitress.name}`, updates);

    // Prepare update data - only update provided fields
    const updateData: any = {
      updatedAt: new Date(),
      ...updates
    };

    // Remove any system fields that shouldn't be updated
    delete updateData._id;
    delete updateData.createdAt;
    delete updateData.waiterId;
    delete updateData.orderNumber;

    // Normalize status if provided
    if (updateData.status) {
      updateData.status = normalizeStatus(updateData.status);
    }

    // If updating items, recalculate totals
    if (updateData.items || updateData.orderItems) {
      const itemsToUpdate = updateData.items || updateData.orderItems;
      if (Array.isArray(itemsToUpdate)) {
        const totalAmount = itemsToUpdate.reduce((sum: number, item: any) => 
          sum + ((item.price || 0) * (item.quantity || 1)), 0
        );
        updateData.totalAmount = totalAmount;
        updateData.tax = totalAmount * 0.15;
        updateData.finalAmount = totalAmount + updateData.tax - (updateData.discount || existingOrder.discount || 0);
        
        // Ensure both fields are in sync
        updateData.items = itemsToUpdate;
        updateData.orderItems = itemsToUpdate;
      }
    }

    // Execute partial update
    const result = await prisma.order.updateMany(
      { where: query, data: updateData }
    );

    if (result.count === 0) {
      return NextResponse.json(
        { error: 'Failed to update order' },
        { status: 500 }
      );
    }

    // Fetch updated order
    const updatedOrder = await prisma.order.findFirst({ where: query });

    if (!updatedOrder) {
      return NextResponse.json(
        { error: 'Failed to retrieve updated order' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Order updated successfully',
      order: {
        id: updatedOrder.id,
        orderNumber: updatedOrder.orderNumber,
        status: updatedOrder.status,
        totalAmount: updatedOrder.totalAmount,
        finalAmount: updatedOrder.finalAmount,
        notes: updatedOrder.notes,
        tableNumber: updatedOrder.tableNumber,
        customerName: updatedOrder.customerName,
        updatedAt: updatedOrder.updatedAt
      }
    });
    
  } catch (error) {
    debugError('Error in PATCH update:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to update order',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// DELETE endpoint for waitress to delete their own orders
export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized', success: false },
        { status: 401 }
      );
    }

    const url = new URL(req.url);
    const orderId = url.searchParams.get('orderId');

    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID is required', success: false },
        { status: 400 }
      );
    }

    // Get waitress by email
    const waitress = await prisma.waitress.findFirst(
      { where: { email: session.user.email } }
    );

    if (!waitress) {
      return NextResponse.json(
        { error: 'Waitress not found' },
        { status: 404 }
      );
    }

    const waitressDbId = waitress.id;
    
    // Delete order only if it belongs to this waitress
    let result = await prisma.order.deleteMany({
      where: { id: orderId, waiterId: waitressDbId }
    });

    if (result.count === 0) {
      return NextResponse.json(
        { error: 'Order not found or access denied' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Order deleted successfully'
    });
    
  } catch (error) {
    debugError('Error in DELETE order:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to delete order',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
