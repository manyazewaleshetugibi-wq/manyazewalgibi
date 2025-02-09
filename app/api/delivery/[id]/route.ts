import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { DeliveryOrderSchema, OrderStatus } from "@/models/DeliveryOrders"; // Ensure correct schema import

// GET: Retrieve an order by ID
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const dbClient = await clientPromise;
    const db = dbClient.db();

    const orderId = params.id;

    // Validate the order ID
    if (!ObjectId.isValid(orderId)) {
      return NextResponse.json({ error: "Invalid order ID" }, { status: 400 });
    }

    // Find the order by ID
    const order = await db
      .collection("delivery")
      .findOne({ _id: new ObjectId(orderId) });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Return the order
    return NextResponse.json({ success: true, order }, { status: 200 });
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
  { params }: { params: { id: string } }
) {
  try {
    const dbClient = await clientPromise;
    const db = dbClient.db();

    const orderId = params.id;

    // Validate the order ID
    if (!ObjectId.isValid(orderId)) {
      return NextResponse.json({ error: "Invalid order ID" }, { status: 400 });
    }

    const body = await req.json();

    // Validate the updated order data
    const validatedOrder = DeliveryOrderSchema.omit({ _id: true }).parse(body); // Omit _id for validation

    // Update the order in the database
    const result = await db.collection("delivery").updateOne(
      { _id: new ObjectId(orderId) },
      {
        $set: {
          ...validatedOrder,
          updatedAt: new Date(), // Update the updatedAt field
        },
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Return success response
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

// DELETE: Delete an order by ID
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const dbClient = await clientPromise;
    const db = dbClient.db();

    const orderId = params.id;

    // Validate the order ID
    if (!ObjectId.isValid(orderId)) {
      return NextResponse.json({ error: "Invalid order ID" }, { status: 400 });
    }

    // Delete the order from the database
    const result = await db
      .collection("delivery")
      .deleteOne({ _id: new ObjectId(orderId) });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Return success response
    return NextResponse.json(
      { success: true, message: "Order deleted successfully" },
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

// PATCH: Update the status of an order
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const dbClient = await clientPromise;
    const db = dbClient.db();
    const ordersCollection = db.collection("delivery");

    if (!ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: "Invalid order ID" }, { status: 400 });
    }

    const { status } = await req.json();

    if (!OrderStatus.options.includes(status)) {
      return NextResponse.json({ error: "Invalid order status" }, { status: 400 });
    }

    // Update the order status
    const updateResult = await ordersCollection.updateOne(
      { _id: new ObjectId(params.id) },
      { $set: { status, updatedAt: new Date() } }
    );

    if (updateResult.matchedCount === 0) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Fetch the updated order
    const updatedOrder = await ordersCollection.findOne({ _id: new ObjectId(params.id) });

    return NextResponse.json({ message: "Order status updated", order: updatedOrder }, { status: 200 });

  } catch (error) {
    console.error("Error updating order:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
