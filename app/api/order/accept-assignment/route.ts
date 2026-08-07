// app/api/order/accept-assignment/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

import { auth } from "@/auth";

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

    // Get the order
    let order: any = null;
    try {
      order = await prisma.order.findFirst({
        where: { id: orderId }
      });
    } catch (err) {

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
    let currentWaiter: any = null;
    
    if (session.user.email) {
      currentWaiter = await prisma.waitress.findFirst({ 
        where: { email: session.user.email } 
      });
    }
    
    if (!currentWaiter && waiterId) {
      try {
        currentWaiter = await prisma.waitress.findFirst({ 
          where: { id: waiterId } 
        });
      } catch (err) {

      }
    }

    const currentWaiterId = currentWaiter ? currentWaiter.id : session.user.id;
    
    // Verify that the requesting waiter is the assigned waiter
    const isAssignedWaiter = order.waiterId === currentWaiterId;

    if (!isAssignedWaiter) {
      return NextResponse.json(
        { error: 'Unauthorized to handle this assignment', success: false },
        { status: 403 }
      );
    }

    const assignmentRequest = order.assignmentRequest ? { ...order.assignmentRequest } : {};

    let updateData: any = {};

    if (action === 'accept') {
      // Update order status to PREPARING or ACKNOWLEDGED
      const notifications = Array.isArray(order.notifications) ? order.notifications : [];
      updateData = {
        status: 'PREPARING',
        assignmentRequest: {
          ...assignmentRequest,
          status: 'accepted',
          acceptedAt: new Date().toISOString(),
          acceptedBy: currentWaiterId
        },
        // Add notification to the order
        notifications: [
          ...notifications,
          {
            type: 'assignment_accepted',
            message: `Waiter ${currentWaiter?.name || 'assigned waiter'} accepted the order`,
            createdAt: new Date().toISOString()
          }
        ],
        updatedAt: new Date()
      };
    } else {
      // Reject the assignment - this will trigger reassignment
      updateData = {
        assignmentRequest: {
          ...assignmentRequest,
          status: 'rejected',
          rejectedAt: new Date().toISOString(),
          rejectedBy: currentWaiterId,
          rejectionReason: body.reason || 'Waiter rejected assignment'
        },
        updatedAt: new Date()
      };
      
      // If rejected, we need to reassign to another waiter
      // Get all active waiters except current one
      const otherWaiters = await prisma.waitress.findMany({
        where: {
          isActive: true,
          id: { not: currentWaiterId },
          role: { in: ['waiter', 'waitress', 'server'] }
        }
      });
      
      if (otherWaiters.length > 0) {
        // Reassign to the next waiter (round-robin based on table number)
        const tableNumberMatch = order.tableNumber?.match(/\d+/);
        const tableNum = tableNumberMatch ? parseInt(tableNumberMatch[0]) : 0;
        const newWaiterIndex = (tableNum) % otherWaiters.length;
        const newWaiter = otherWaiters[newWaiterIndex];
        
        updateData.waiterId = newWaiter.id;
        updateData.waiterName = newWaiter.name;
        updateData.assignmentRequest.reassignedTo = newWaiter.id;
        updateData.assignmentRequest.reassignedAt = new Date().toISOString();
        
        // Also update the assignment request status to pending for new waiter
        updateData.assignmentRequest.status = 'pending';
        updateData.assignmentRequest.previousWaiter = currentWaiterId;
      } else {
        // No other waiters available, mark as unassigned
        updateData.status = 'UNASSIGNED';
        updateData.assignmentRequest.status = 'failed';
      }
    }

    const result = await prisma.order.updateMany(
      { where: { id: order.id }, data: updateData }
    );

    if (result.count === 0) {
      return NextResponse.json(
        { error: 'Failed to update order', success: false },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: action === 'accept' ? 'Assignment accepted successfully' : 'Assignment rejected and reassigned',
      reassigned: action === 'reject' && updateData.waiterId ? true : false
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
