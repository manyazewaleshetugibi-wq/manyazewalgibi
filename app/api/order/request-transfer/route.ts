// app/api/order/request-transfer/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

import { auth } from "@/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized', success: false },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { orderId, targetWaiterId, reason, currentWaiterId } = body;

    if (!orderId || !targetWaiterId || !reason) {
      return NextResponse.json(
        { error: 'Missing required fields', success: false },
        { status: 400 }
      );
    }

    // Get current waiter info
    let currentWaiter: any = null;
    
    if (currentWaiterId) {
      try {
        currentWaiter = await prisma.waitress.findFirst({ 
          where: { id: currentWaiterId } 
        });
      } catch (err) {

      }
    }
    
    if (!currentWaiter && session.user.email) {
      currentWaiter = await prisma.waitress.findFirst({ 
        where: { email: session.user.email } 
      });
    }

    if (!currentWaiter) {
      return NextResponse.json(
        { error: 'Current waiter not found. Please ensure you are registered as a waiter.', success: false },
        { status: 404 }
      );
    }

    // Get target waiter info
    let targetWaiter: any = null;
    
    try {
      targetWaiter = await prisma.waitress.findFirst({ 
        where: { id: targetWaiterId } 
      });
    } catch (err) {

    }

    if (!targetWaiter) {
      return NextResponse.json(
        { error: 'Target waiter not found. Please select a valid waiter.', success: false },
        { status: 404 }
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

    // Check if order is completed
    if (order.status === 'COMPLETED' || order.status === 'completed') {
      return NextResponse.json(
        { error: 'Cannot transfer completed order', success: false },
        { status: 400 }
      );
    }

    // Check for existing pending request
    if (order.editRequest && order.editRequest.status === 'pending') {
      return NextResponse.json(
        { error: 'A transfer request is already pending for this order', success: false },
        { status: 400 }
      );
    }

    // Check cooldown for cancelled requests - ONLY apply cooldown if the cancellation was done by the original requester
    // If the cancellation was done by the target waiter, no cooldown is applied
    if (order.editRequest && order.editRequest.status === 'cancelled') {
      // Check who cancelled the request
      const cancelledBy = order.editRequest.cancelledBy;
      const originalRequesterId = order.editRequest.requestedBy;
      
      // If the cancellation was done by the original requester (the one who sent the request), apply cooldown
      // If the cancellation was done by the target waiter (who received the request), no cooldown
      const isCancelledByOriginalRequester = cancelledBy === originalRequesterId;
      
      if (isCancelledByOriginalRequester) {
        // Apply 2-minute cooldown only when the original requester cancels their own request
        const lastRequestTime = new Date(order.editRequest.requestedAt).getTime();
        const now = Date.now();
        const cooldownMinutes = 2;
        const cooldownMs = cooldownMinutes * 60 * 1000;
        
        const timeElapsed = now - lastRequestTime;
        const timeRemainingMs = cooldownMs - timeElapsed;
        
        if (timeRemainingMs > 0) {
          const minutesRemaining = Math.floor(timeRemainingMs / 60000);
          const secondsRemaining = Math.ceil((timeRemainingMs % 60000) / 1000);
          
          let timeMessage = '';
          if (minutesRemaining > 0) {
            timeMessage = `${minutesRemaining} minute${minutesRemaining !== 1 ? 's' : ''}`;
            if (secondsRemaining > 0) {
              timeMessage += ` and ${secondsRemaining} second${secondsRemaining !== 1 ? 's' : ''}`;
            }
          } else {
            timeMessage = `${secondsRemaining} second${secondsRemaining !== 1 ? 's' : ''}`;
          }
          
          return NextResponse.json(
            { 
              error: `Please wait ${timeMessage} before requesting another transfer. You cancelled a previous request.`,
              cooldownRemaining: timeRemainingMs,
              success: false 
            },
            { status: 400 }
          );
        }
      }
      // If cancelled by target waiter, no cooldown - allow immediate retry
    }

    // Create edit request
    const editRequest = {
      requestedWaiterId: targetWaiter.id,
      requestedWaiterName: targetWaiter.name,
      status: 'pending',
      requestedBy: currentWaiter.id,
      requestedByName: currentWaiter.name,
      requestedAt: new Date().toISOString(),
      reason: reason,
      originalWaiterId: order.waiterId,
      originalWaiterName: currentWaiter.name
    };

    // Update order with edit request
    const result = await prisma.order.updateMany(
      { where: { id: order.id }, data: { editRequest, updatedAt: new Date() } }
    );

    if (result.count === 0) {
      return NextResponse.json(
        { error: 'Failed to update order', success: false },
        { status: 500 }
      );
    }

    // Fetch updated order
    const updatedOrder = await prisma.order.findFirst({
      where: { id: order.id }
    });

    if (!updatedOrder) {
      return NextResponse.json(
        { error: 'Failed to fetch updated order', success: false },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Transfer request sent successfully',
      order: {
        id: updatedOrder.id,
        orderNumber: updatedOrder.orderNumber,
        status: updatedOrder.status,
        editRequest: updatedOrder.editRequest
      }
    });

  } catch (error) {
    console.error('Error in transfer request:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to send transfer request'
      },
      { status: 500 }
    );
  }
}
