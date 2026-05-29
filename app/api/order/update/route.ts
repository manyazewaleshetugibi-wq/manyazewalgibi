import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

import { auth } from "@/auth";

// Debug flag
const DEBUG = true;

function debugLog(message: string, data?: any) {
  if (DEBUG) {
    console.log(`[DEBUG] ${message}`, data ? data : '');
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

    // Connect to MongoDB
    const dbClient = await clientPromise;
    const db = dbClient.db("gold");
    
    // Get waitress by email
    const waitress = await db.collection("waitresses").findOne(
      { email: session.user.email }
    );

    if (!waitress) {
      return NextResponse.json(
        { error: 'Waitress not found' },
        { status: 404 }
      );
    }

    const waitressDbId = waitress._id.toString();
    
    // Verify the order belongs to this waitress using robust ID check
    let query: any = { _id: orderId, waiterId: waitressDbId };
    let existingOrder = await db.collection("orders").findOne(query);

    if (!existingOrder) {
      try {
        query = { _id: new ObjectId(orderId), waiterId: waitressDbId };
        existingOrder = await db.collection("orders").findOne(query);
      } catch {
        // Invalid ObjectId format, will fail check below
      }
    }

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
        let dbItem;
        try {
          if (ObjectId.isValid(itemId)) {
            dbItem = await db.collection("items").findOne({ _id: new ObjectId(itemId) });
          }
        } catch (e) {}
        
        if (!dbItem) {
          dbItem = await db.collection("items").findOne({ _id: itemId });
        }

        if (dbItem) {
          const quantity = Number(item.quantity) || 0;
          const price = dbItem.price || 0;
          const subtotal = price * quantity;
          
          totalAmount += subtotal;

          processedItems.push({
            id: item.id || new ObjectId().toString(),
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
            image: dbItem.imageUrl || dbItem.image || ""
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
    let result = await db.collection("orders").updateOne(
      query,
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: 'Failed to update order in database' },
        { status: 500 }
      );
    }

    // Fetch updated order
    const updatedOrder = await db.collection("orders").findOne(query);

    if (!updatedOrder) {
      return NextResponse.json(
        { error: 'Failed to retrieve updated order' },
        { status: 500 }
      );
    }

    // Transform order for response
    const transformedOrder = {
      id: updatedOrder._id.toString(),
      orderNumber: updatedOrder.orderNumber || `ORD-${updatedOrder._id.toString().slice(-6)}`,
      status: updatedOrder.status || 'PENDING',
      totalAmount: updatedOrder.totalAmount || 0,
      finalAmount: updatedOrder.finalAmount || updatedOrder.totalAmount || 0,
      notes: updatedOrder.notes || '',
      updatedAt: updatedOrder.updatedAt?.toISOString() || new Date().toISOString(),
      orderItems: updatedOrder.items || updatedOrder.orderItems || [],
      tableNumber: updatedOrder.tableNumber || updatedOrder.tableId || '',
      customerName: updatedOrder.customerName || '',
      numberOfGuests: updatedOrder.numberOfGuests || 1,
      specialRequirements: updatedOrder.specialRequirements || '',
      waiterId: updatedOrder.waiterId?.toString() || waitressDbId
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

    // Connect to MongoDB
    const dbClient = await clientPromise;
    const db = dbClient.db("gold");
    
    // Get waitress by email
    const waitress = await db.collection("waitresses").findOne(
      { email: session.user.email }
    );

    if (!waitress) {
      return NextResponse.json(
        { error: 'Waitress not found' },
        { status: 404 }
      );
    }

    const waitressDbId = waitress._id.toString();
    
    // Verify the order belongs to this waitress
    let query: any = { _id: orderId, waiterId: waitressDbId };
    let existingOrder = await db.collection("orders").findOne(query);

    if (!existingOrder) {
      try {
        query = { _id: new ObjectId(orderId), waiterId: waitressDbId };
        existingOrder = await db.collection("orders").findOne(query);
      } catch {
        return NextResponse.json(
          { error: 'Order not found or access denied' },
          { status: 404 }
        );
      }
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
    const result = await db.collection("orders").updateOne(
      query,
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: 'Failed to update order' },
        { status: 500 }
      );
    }

    // Fetch updated order
    const updatedOrder = await db.collection("orders").findOne(query);

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
        id: updatedOrder._id.toString(),
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

    // Connect to MongoDB
    const dbClient = await clientPromise;
    const db = dbClient.db("gold");
    
    // Get waitress by email
    const waitress = await db.collection("waitresses").findOne(
      { email: session.user.email }
    );

    if (!waitress) {
      return NextResponse.json(
        { error: 'Waitress not found' },
        { status: 404 }
      );
    }

    const waitressDbId = waitress._id.toString();
    
    // Delete order only if it belongs to this waitress
    let result = await db.collection("orders").deleteOne({
      _id: orderId,
      waiterId: waitressDbId
    });

    // If not deleted with string ID, try ObjectId
    if (result.deletedCount === 0) {
      try {
        result = await db.collection("orders").deleteOne({
          _id: new ObjectId(orderId),
          waiterId: waitressDbId
        });
      } catch {
        // ObjectId conversion failed
      }
    }

    if (result.deletedCount === 0) {
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
