// app/api/order/handle-transfer/route.ts (update the cancel section)
import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/auth";

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized', success: false },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { orderId, action, waiterId } = body;

    if (!orderId || !action) {
      return NextResponse.json(
        { error: 'Missing required fields', success: false },
        { status: 400 }
      );
    }

    if (action !== 'accept' && action !== 'cancel') {
      return NextResponse.json(
        { error: 'Invalid action. Must be "accept" or "cancel"', success: false },
        { status: 400 }
      );
    }

    const dbClient = await clientPromise;
    const db = dbClient.db("gold");

    // Get the order
    let order = null;
    try {
      if (ObjectId.isValid(orderId)) {
        order = await db.collection("orders").findOne({
          _id: new ObjectId(orderId)
        });
      } else {
        order = await db.collection("orders").findOne({
          _id: orderId
        });
      }
    } catch (err) {
      console.log("Error finding order:", err);
    }

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found', success: false },
        { status: 404 }
      );
    }

    // Check if there's a pending request
    if (!order.editRequest || order.editRequest.status !== 'pending') {
      return NextResponse.json(
        { error: 'No pending transfer request found', success: false },
        { status: 400 }
      );
    }

    // Get the current user's waiter info
    let currentWaiter = null;
    
    if (session.user.email) {
      currentWaiter = await db.collection("waitresses").findOne({ 
        email: session.user.email 
      });
    }
    
    if (!currentWaiter && waiterId) {
      try {
        if (ObjectId.isValid(waiterId)) {
          currentWaiter = await db.collection("waitresses").findOne({ 
            _id: new ObjectId(waiterId) 
          });
        } else {
          currentWaiter = await db.collection("waitresses").findOne({ 
            _id: waiterId 
          });
        }
      } catch (err) {
        console.log("Error finding current waiter:", err);
      }
    }

    const currentWaiterId = currentWaiter ? currentWaiter._id.toString() : session.user.id;
    
    // Verify that the requesting waiter is the target waiter
    const isTargetWaiter = order.editRequest.requestedWaiterId === currentWaiterId;
    const isOriginalRequester = order.editRequest.requestedBy === currentWaiterId;
    const userRole = session.user.role?.toString().toLowerCase() || '';
    const isAdmin = userRole === 'admin' || userRole === 'manager';

    if (!isTargetWaiter && !isOriginalRequester && !isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized to handle this transfer request', success: false },
        { status: 403 }
      );
    }

    let updateData: any = {};

    if (action === 'accept') {
      // Update order with new waiter ID
      updateData = {
        $set: {
          waiterId: order.editRequest.requestedWaiterId,
          waiterName: order.editRequest.requestedWaiterName,
          'editRequest.status': 'accepted',
          'editRequest.acceptedAt': new Date().toISOString(),
          'editRequest.acceptedBy': currentWaiterId,
          updatedAt: new Date()
        }
      };
    } else {
      // Cancel the request - store who cancelled it
      updateData = {
        $set: {
          'editRequest.status': 'cancelled',
          'editRequest.cancelledAt': new Date().toISOString(),
          'editRequest.cancelledBy': currentWaiterId,
          'editRequest.cancelledByRole': isOriginalRequester ? 'original_requester' : (isTargetWaiter ? 'target_waiter' : 'admin'),
          updatedAt: new Date()
        }
      };
    }

    const result = await db.collection("orders").updateOne(
      { _id: order._id },
      updateData
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: 'Failed to update order', success: false },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: action === 'accept' ? 'Transfer accepted successfully' : 'Transfer request cancelled'
    });

  } catch (error) {
    console.error('Error handling transfer:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to handle transfer request'
      },
      { status: 500 }
    );
  }
}