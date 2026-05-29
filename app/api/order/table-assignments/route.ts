import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
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

    const dbClient = await clientPromise;

    const db = dbClient.db("gold");

    // Auto-detect waiter from session
    if (!targetWaiterId) {
      const waiter =
        await db.collection("waitresses").findOne({
          email: session.user.email,
        });

      if (waiter) {
        targetWaiterId =
          waiter._id.toString();
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
    const orders = await db
      .collection("orders")
      .find({
        waiterId: targetWaiterId,

        status: "PENDING",

        "assignmentRequest.status":
          "pending",

        "assignmentRequest.type":
          "table_assignment",
      })
      .toArray();

    // Transform response
    const transformedOrders = orders.map(
      (order) => ({
        id: order._id.toString(),

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
