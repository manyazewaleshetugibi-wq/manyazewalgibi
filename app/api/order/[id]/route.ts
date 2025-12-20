import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { TableOrderSchema, OrderStatus } from "@/models/Orders"; // Ensure correct schema import

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

    // Validate the order ID
    if (!ObjectId.isValid(orderId)) {
      return NextResponse.json({ error: "Invalid order ID" }, { status: 400 });
    }

    // Find the order by ID
    const order = await db
      .collection("orders")
      .findOne({ _id: new ObjectId(orderId) });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Fetch waiter details if it's a table order
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

    // Return the order
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

    // Validate the order ID
    if (!ObjectId.isValid(orderId)) {
      return NextResponse.json({ error: "Invalid order ID" }, { status: 400 });
    }

    const body = await req.json();

    // Validate the updated order data
    const validatedOrder = TableOrderSchema.parse({
      ...body,
      _id: undefined, // Ensure _id is not part of the body
    });

    // Update the order in the database
    const result = await db.collection("orders").updateOne(
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
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const dbClient = await clientPromise;
    const db = dbClient.db("gold");

    const orderId = params.id;

    // Validate the order ID
    if (!ObjectId.isValid(orderId)) {
      return NextResponse.json({ error: "Invalid order ID" }, { status: 400 });
    }

    // Delete the order from the database
    const result = await db
      .collection("orders")
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
export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const dbClient = await clientPromise;
    const db = dbClient.db("gold");
    const ordersCollection = db.collection("orders");

    if (!ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: "Invalid order ID" }, { status: 400 });
    }

    const { status } = await req.json();

    if (!Array.isArray(OrderStatus.options) || !OrderStatus.options.includes(status)) {
      return NextResponse.json({ error: "Invalid order status" }, { status: 400 });
    }

    // Update the order
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
