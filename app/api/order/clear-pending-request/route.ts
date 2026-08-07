// app/api/order/clear-pending-request/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

import { auth } from "@/auth";

// This is a utility endpoint to clear pending requests (for debugging)
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

    const result = await prisma.order.updateMany(
      { where: { id: orderId }, data: { editRequest: Prisma.DbNull } }
    );

    if (result.count === 0) {
      return NextResponse.json(
        { error: 'Order not found', success: false },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Pending request cleared successfully'
    });

  } catch (error) {
    console.error('Error clearing pending request:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to clear pending request',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
