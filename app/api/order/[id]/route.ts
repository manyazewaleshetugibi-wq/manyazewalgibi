import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { getCurrentUserData } from "../../utils/orderHelpers";

// Helper function to check if a user role is admin
const isAdminRole = (role: string | undefined): boolean => {
  if (!role) return false;
  return ['ADMIN', 'admin', 'Admin', 'SUPER_ADMIN'].includes(role);
};

// GET: Retrieve an order by ID
export async function GET(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const dbClient = await clientPromise;
    const db = dbClient.db("gold");

    const orderId = params.id;

    if (!ObjectId.isValid(orderId)) {
      return NextResponse.json({ error: "Invalid order ID" }, { status: 400 });
    }

    const order = await db
      .collection("orders")
      .findOne({ _id: new ObjectId(orderId) });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    let additionalDetails = {};
    if (order.inTable === true && (!order.delivery) && order.waiterId) {
      try {
        if (ObjectId.isValid(order.waiterId)) {
          const waiter = await db.collection("waiters").findOne(
            { _id: new ObjectId(order.waiterId) },
            { projection: { name: 1, avatar: 1, shift: 1 } }
          );
          if (waiter) {
            additionalDetails = { waiter };
          }
        }
      } catch (err) {
        console.error(`Failed to fetch waiter for order ${order._id}`, err);
      }
    }

    return NextResponse.json({ success: true, order: { ...order, ...additionalDetails } }, { status: 200 });
  } catch (error) {
    console.error("Error fetching order:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// PUT: Update an order by ID
export async function PUT(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const dbClient = await clientPromise;
    const db = dbClient.db("gold");

    const orderId = params.id;

    if (!ObjectId.isValid(orderId)) {
      return NextResponse.json({ error: "Invalid order ID" }, { status: 400 });
    }

    const body = await req.json();

    const result = await db.collection("orders").updateOne(
      { _id: new ObjectId(orderId) },
      {
        $set: {
          ...body,
          updatedAt: new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json(
      { success: true, message: "Order updated successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating order:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// DELETE: Delete an order (Admin only)
export async function DELETE(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const dbClient = await clientPromise;
    const db = dbClient.db("gold");

    const orderId = params.id;
    const url = new URL(req.url);
    const reason = url.searchParams.get("reason") || "Admin deletion";

    if (!ObjectId.isValid(orderId)) {
      return NextResponse.json({ error: "Invalid order ID" }, { status: 400 });
    }

    const userData = await getCurrentUserData(req);
    
    // Check if user is admin
    const isAdmin = isAdminRole(userData?.role);
    
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Unauthorized. Only administrators can delete orders." },
        { status: 403 }
      );
    }

    const order = await db.collection("orders").findOne({ _id: new ObjectId(orderId) });
    
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Soft delete - mark as deleted
    const updateResult = await db.collection("orders").updateOne(
      { _id: new ObjectId(orderId) },
      { 
        $set: { 
          deletedAt: new Date(),
          deletedBy: userData?.name || userData?.email || "Unknown Admin",
          deletionReason: reason,
          isActive: false,
          updatedAt: new Date()
        } 
      }
    );

    if (updateResult.matchedCount === 0) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Log deletion
    await db.collection("deletion_logs").insertOne({
      orderId: new ObjectId(orderId),
      orderNumber: order.orderNumber,
      deletedBy: userData?.name || userData?.email || "Unknown Admin",
      deletedByRole: userData?.role,
      deletionReason: reason,
      orderData: {
        orderNumber: order.orderNumber,
        finalAmount: order.finalAmount,
        status: order.status,
        createdAt: order.createdAt
      },
      deletedAt: new Date()
    });

    // Update deletion request status if exists
    if (order.markedForDeletion) {
      await db.collection("deletion_requests").updateOne(
        { orderId: new ObjectId(orderId), status: "pending" },
        { 
          $set: { 
            status: "approved",
            approvedBy: userData?.name,
            approvedAt: new Date()
          } 
        }
      );
    }

    return NextResponse.json(
      { 
        success: true, 
        message: `Order ${order.orderNumber} deleted successfully`,
        deletedBy: userData?.name || "Unknown Admin",
        deletedAt: new Date().toISOString()
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting order:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// PATCH: Update order status or mark for deletion
export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const dbClient = await clientPromise;
    const db = dbClient.db("gold");
    const ordersCollection = db.collection("orders");

    if (!ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: "Invalid order ID" }, { status: 400 });
    }

    const body = await req.json();
    const { status, action, reason, requestedBy, requestedAt } = body;

    // Handle mark for deletion
    if (action === "mark-for-deletion") {
      if (!reason) {
        return NextResponse.json(
          { error: "Deletion reason is required" },
          { status: 400 }
        );
      }

      const userData = await getCurrentUserData(req);

      const updateResult = await ordersCollection.updateOne(
        { _id: new ObjectId(params.id) },
        { 
          $set: { 
            markedForDeletion: true,
            deletionRequestReason: reason,
            deletionRequestedBy: requestedBy || userData?.name || userData?.email || "Unknown User",
            deletionRequestedAt: requestedAt || new Date().toISOString(),
            updatedAt: new Date()
          } 
        }
      );

      if (updateResult.matchedCount === 0) {
        return NextResponse.json({ error: "Order not found" }, { status: 404 });
      }

      // Create audit log
      await db.collection("deletion_requests").insertOne({
        orderId: new ObjectId(params.id),
        reason: reason,
        requestedBy: requestedBy || userData?.name || userData?.email || "Unknown User",
        requestedAt: new Date(),
        status: "pending",
        createdAt: new Date()
      });

      const updatedOrder = await ordersCollection.findOne({ _id: new ObjectId(params.id) });

      return NextResponse.json({ 
        message: "Order marked for deletion successfully", 
        order: updatedOrder,
        markedForDeletion: true
      }, { status: 200 });
    }

    // Handle regular status update
    if (!status) {
      return NextResponse.json({ error: "Status is required" }, { status: 400 });
    }

    const updateResult = await ordersCollection.updateOne(
      { _id: new ObjectId(params.id) },
      { $set: { status, updatedAt: new Date() } }
    );

    if (updateResult.matchedCount === 0) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const updatedOrder = await ordersCollection.findOne({ _id: new ObjectId(params.id) });

    return NextResponse.json({ 
      message: "Order status updated", 
      order: updatedOrder 
    }, { status: 200 });

  } catch (error) {
    console.error("Error updating order:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}