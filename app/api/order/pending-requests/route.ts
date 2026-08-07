// app/api/order/pending-requests/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

import { auth } from "@/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    
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
      // Find waiter by email in waitresses collection
      const waiter = session.user.email
        ? await prisma.waitress.findFirst({ 
            where: { email: session.user.email } 
          })
        : null;
      
      if (waiter) {
        targetWaiterId = waiter.id;
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

    // Find orders with pending edit requests
    const orders = await prisma.order.findMany({
      where: {
        editRequest: {
          path: ['status'],
          equals: 'pending'
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Filter to orders where this waiter is the requested waiter
    const pendingOrders = orders.filter((order: any) =>
      order.editRequest?.requestedWaiterId === targetWaiterId
    );

    // Transform orders for response (matching your existing structure)
    const transformedOrders = pendingOrders.map((order: any) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      totalAmount: order.totalAmount,
      finalAmount: order.finalAmount,
      numberOfGuests: order.numberOfGuests,
      tableNumber: order.tableNumber,
      customerName: order.customerName,
      notes: order.notes,
      createdAt: order.createdAt,
      orderItems: (order.items as any) || [],
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
