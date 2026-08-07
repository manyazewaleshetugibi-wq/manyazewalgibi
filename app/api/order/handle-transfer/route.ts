// app/api/order/handle-transfer/route.ts (update the cancel section)
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

    if (action !== 'accept' && action !== 'cancel') {
      return NextResponse.json(
        { error: 'Invalid action. Must be "accept" or "cancel"', success: false },
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

    // Check if there's a pending request
    if (!order.editRequest || order.editRequest.status !== 'pending') {
      return NextResponse.json(
        { error: 'No pending transfer request found', success: false },
        { status: 400 }
      );
    }

    // Get the current user's waiter info
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

    const editRequest = order.editRequest ? { ...order.editRequest } : {};

    let updateData: any = {};

    if (action === 'accept') {
      // Update order with new waiter ID
      updateData = {
        waiterId: order.editRequest.requestedWaiterId,
        waiterName: order.editRequest.requestedWaiterName,
        editRequest: {
          ...editRequest,
          status: 'accepted',
          acceptedAt: new Date().toISOString(),
          acceptedBy: currentWaiterId
        },
        updatedAt: new Date()
      };
    } else {
      // Cancel the request - store who cancelled it
      updateData = {
        editRequest: {
          ...editRequest,
          status: 'cancelled',
          cancelledAt: new Date().toISOString(),
          cancelledBy: currentWaiterId,
          cancelledByRole: isOriginalRequester ? 'original_requester' : (isTargetWaiter ? 'target_waiter' : 'admin')
        },
        updatedAt: new Date()
      };
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
