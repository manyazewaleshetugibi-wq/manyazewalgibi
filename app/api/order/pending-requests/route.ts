// app/api/order/pending-requests/route.ts
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
      
      // Find waiter by email in waitresses collection
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

    // Find orders with pending edit requests where this waiter is the requested waiter
    const orders = await db.collection("orders").find({
      'editRequest.status': 'pending',
      'editRequest.requestedWaiterId': targetWaiterId
    }).toArray();

    // Transform orders for response (matching your existing structure)
    const transformedOrders = orders.map(order => ({
      id: order._id.toString(),
      orderNumber: order.orderNumber,
      status: order.status,
      totalAmount: order.totalAmount,
      finalAmount: order.finalAmount,
      numberOfGuests: order.numberOfGuests,
      tableNumber: order.tableNumber,
      customerName: order.customerName,
      notes: order.notes,
      createdAt: order.createdAt,
      orderItems: order.items || order.orderItems || [],
      editRequest: order.editRequest
    }));

    return NextResponse.json({
      success: true,
      requests: transformedOrders
    });

  } catch (error) {
    console.error('Error fetching pending requests:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch pending requests'
      },
      { status: 500 }
    );
  }
}