import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET(req: NextRequest) {
  try {
    // Get authenticated session
    const session = await auth();

    if (!session || !session.user) {
      return NextResponse.json(
        {
          error: "Unauthorized",
          success: false,
        },
        { status: 401 }
      );
    }

    const url = new URL(req.url);

    const waiterId =
      url.searchParams.get("waiterId");

    let targetWaiterId = waiterId;

    // Auto-detect waiter from session
    if (!targetWaiterId) {
      const waiter =
        await prisma.waitress.findFirst({
          where: {
            email: session.user.email,
          },
        });

      if (waiter) {
        targetWaiterId =
          waiter.id;
      } else {
        targetWaiterId = session.user.id;
      }
    }

    if (!targetWaiterId) {
      return NextResponse.json(
        {
          error: "Waiter ID is required",
          success: false,
        },
        { status: 400 }
      );
    }

    // Find assigned pending table orders
    const orders = await prisma.order.findMany({
      where: {
        waiterId: targetWaiterId,
        status: "PENDING",
      },
    });

    // Filter nested assignmentRequest JSON (equivalent of Mongo dot-notation filter)
    const assignmentOrders = orders.filter(
      (order) =>
        (order.assignmentRequest as any)?.status ===
          "pending" &&
        (order.assignmentRequest as any)?.type ===
          "table_assignment"
    );

    // Transform response
    const transformedOrders = assignmentOrders.map(
      (order) => ({
        id: order.id,

        orderNumber: order.orderNumber,

        status: order.status,

        totalAmount: order.totalAmount,

        finalAmount: order.finalAmount,

        numberOfGuests:
          order.numberOfGuests,

        tableNumber: order.tableNumber,

        customerName:
          order.customerName || "Walk-in",

        notes: order.notes,

        createdAt: order.createdAt,

        orderItems:
          order.items ||
          order.orderItems ||
          [],

        assignmentRequest:
          order.assignmentRequest,
      })
    );

    return NextResponse.json({
      success: true,
      assignments: transformedOrders,
    });
  } catch (error) {
    console.error(
      "Error fetching table assignments:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Failed to fetch table assignments",
      },
      { status: 500 }
    );
  }
}
