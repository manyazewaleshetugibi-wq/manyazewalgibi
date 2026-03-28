// app/api/order/table-assignments/route.ts
import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized', success: false },
        { status: 401 }
      );
    }

    const url = new URL(req.url);
    const waiterId = url.searchParams.get('waiterId');
    
    let targetWaiterId = waiterId;
    
    if (!targetWaiterId) {
      const dbClient = await clientPromise;
      const db = dbClient.db("gold");
      
      // Find waiter by email
      const waiter = await db.collection("waitresses").findOne({ 
        email: session.user.email 
      });
      
      if (waiter) {
        targetWaiterId = waiter._id.toString();
      } else {
        targetWaiterId = session.user.id;
      }
    }

    if (!targetWaiterId) {
      return NextResponse.json(
        { error: 'Waiter ID is required', success: false },
        { status: 400 }
      );
    }

    const dbClient = await clientPromise;
    const db = dbClient.db("gold");

    // Find orders that are:
    // 1. Assigned to this waiter
    // 2. Status is PENDING (not yet acknowledged by waiter)
    // 3. Have assignment request (to differentiate from transfers)
    const orders = await db.collection("orders").find({
      waiterId: targetWaiterId,
      status: 'PENDING',
      'assignmentRequest.status': 'pending', // New field to track assignment status
      'assignmentRequest.type': 'table_assignment' // Type to identify it's a table assignment
    }).toArray();

    // Transform orders for response
    const transformedOrders = orders.map(order => ({
      id: order._id.toString(),
      orderNumber: order.orderNumber,
      status: order.status,
      totalAmount: order.totalAmount,
      finalAmount: order.finalAmount,
      numberOfGuests: order.numberOfGuests,
      tableNumber: order.tableNumber,
      customerName: order.customerName || 'Walk-in',
      notes: order.notes,
      createdAt: order.createdAt,
      orderItems: order.items || order.orderItems || [],
      assignmentRequest: order.assignmentRequest
    }));

    return NextResponse.json({
      success: true,
      assignments: transformedOrders
    });

  } catch (error) {
    console.error('Error fetching table assignments:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch table assignments'
      },
      { status: 500 }
    );
  }
}