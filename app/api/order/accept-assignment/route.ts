// app/api/order/accept-assignment/route.ts
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

    if (action !== 'accept' && action !== 'reject') {
      return NextResponse.json(
        { error: 'Invalid action. Must be "accept" or "reject"', success: false },
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

    // Check if there's a pending assignment
    if (!order.assignmentRequest || order.assignmentRequest.status !== 'pending') {
      return NextResponse.json(
        { error: 'No pending assignment request found', success: false },
        { status: 400 }
      );
    }

    // Get the current waiter info
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
    
    // Verify that the requesting waiter is the assigned waiter
    const isAssignedWaiter = order.waiterId === currentWaiterId;

    if (!isAssignedWaiter) {
      return NextResponse.json(
        { error: 'Unauthorized to handle this assignment', success: false },
        { status: 403 }
      );
    }

    let updateData: any = {};

    if (action === 'accept') {
      // Update order status to PREPARING or ACKNOWLEDGED
      updateData = {
        $set: {
          status: 'PREPARING',
          'assignmentRequest.status': 'accepted',
          'assignmentRequest.acceptedAt': new Date().toISOString(),
          'assignmentRequest.acceptedBy': currentWaiterId,
          updatedAt: new Date()
        }
      };
      
      // Add notification to the order
      updateData.$push = {
        notifications: {
          type: 'assignment_accepted',
          message: `Waiter ${currentWaiter?.name || 'assigned waiter'} accepted the order`,
          createdAt: new Date().toISOString()
        }
      };
    } else {
      // Reject the assignment - this will trigger reassignment
      updateData = {
        $set: {
          'assignmentRequest.status': 'rejected',
          'assignmentRequest.rejectedAt': new Date().toISOString(),
          'assignmentRequest.rejectedBy': currentWaiterId,
          'assignmentRequest.rejectionReason': body.reason || 'Waiter rejected assignment',
          updatedAt: new Date()
        }
      };
      
      // If rejected, we need to reassign to another waiter
      // Get all active waiters except current one
      const otherWaiters = await db.collection("waitresses").find({
        isActive: true,
        _id: { $ne: new ObjectId(currentWaiterId) },
        role: { $in: ['waiter', 'waitress', 'server'] }
      }).toArray();
      
      if (otherWaiters.length > 0) {
        // Reassign to the next waiter (round-robin based on table number)
        const tableNumberMatch = order.tableNumber?.match(/\d+/);
        const tableNum = tableNumberMatch ? parseInt(tableNumberMatch[0]) : 0;
        const newWaiterIndex = (tableNum) % otherWaiters.length;
        const newWaiter = otherWaiters[newWaiterIndex];
        
        updateData.$set.waiterId = newWaiter._id.toString();
        updateData.$set.waiterName = newWaiter.name;
        updateData.$set['assignmentRequest.reassignedTo'] = newWaiter._id.toString();
        updateData.$set['assignmentRequest.reassignedAt'] = new Date().toISOString();
        
        // Also update the assignment request status to pending for new waiter
        updateData.$set['assignmentRequest.status'] = 'pending';
        updateData.$set['assignmentRequest.previousWaiter'] = currentWaiterId;
      } else {
        // No other waiters available, mark as unassigned
        updateData.$set.status = 'UNASSIGNED';
        updateData.$set['assignmentRequest.status'] = 'failed';
      }
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
      message: action === 'accept' ? 'Assignment accepted successfully' : 'Assignment rejected and reassigned',
      reassigned: action === 'reject' && updateData.$set?.waiterId ? true : false
    });

  } catch (error) {
    console.error('Error handling assignment:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to handle assignment request'
      },
      { status: 500 }
    );
  }
}