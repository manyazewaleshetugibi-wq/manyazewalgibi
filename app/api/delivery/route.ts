import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { DeliveryOrderSchema } from "@/models/DeliveryOrders";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/auth";

export async function POST(req: NextRequest) {
  try {
    const dbClient = await clientPromise;
    const db = dbClient.db();

    const body = await req.json();

    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Validate that items are present in the request body
    if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json(
        { error: "At least one item is required" },
        { status: 400 }
      );
    }

    let totalAmount = 0;
    let taxAmount = 0;
    let finalAmount = 0;

    // Fetch unitPrice for each item and calculate subtotal
    for (const item of body.items) {
      if (!ObjectId.isValid(item.itemId)) {
        return NextResponse.json(
          { error: "Invalid item ID format" },
          { status: 400 }
        );
      }

      // Fetch the item details from the database
      const itemData = await db
        .collection("items")
        .findOne({ _id: new ObjectId(item.itemId) });

      if (!itemData) {
        return NextResponse.json(
          { error: `Item not found: ${item.itemId}` },
          { status: 404 }
        );
      }

      // Calculate subtotal for the item
      const unitPrice = itemData.price; // Fetch unitPrice from the database
      const subtotal = item.quantity * unitPrice;

      // Add subtotal to the total amount
      totalAmount += subtotal;

      // Add subtotal and unitPrice to the item object
      item.subtotal = subtotal;
      item.unitPrice = unitPrice; // Ensure unitPrice is updated
    }

    // Calculate tax and final amount
    taxAmount = totalAmount * 0.15; // Apply 15% tax
    finalAmount = totalAmount + taxAmount - (body.discount || 0); // Apply discount if present

    // Validate the order after calculating values
    const validatedOrder = DeliveryOrderSchema.parse({
      ...body,
      totalAmount,
      tax: taxAmount,
      finalAmount,
      _id: undefined, // Ensure _id is not part of the body
      userId: session.user.id, // Add user ID to the order data
    });

    // Deduct required stock
    const stockPromises = validatedOrder.items.map(async (item) => {
      const itemData = await db
        .collection("items")
        .findOne({ _id: new ObjectId(item.itemId) });

      if (!itemData) {
        return NextResponse.json(
          { error: `Item not found: ${item.itemId}` },
          { status: 404 }
        );
      }

      // Check if required stock is sufficient
      for (const requiredStock of itemData.requiredStock) {
        const stock = await db
          .collection("stocks")
          .findOne({ _id: new ObjectId(requiredStock.stockId) });

        if (!stock || stock.quantity < requiredStock.quantity * item.quantity) {
          return NextResponse.json(
            { error: `Insufficient stock for item: ${itemData.name}` },
            { status: 400 }
          );
        }

        // Deduct stock
        await db.collection("stocks").updateOne(
          { _id: new ObjectId(requiredStock.stockId) },
          { $inc: { quantity: -requiredStock.quantity * item.quantity } }
        );
      }
    });

    // Wait for all stock updates to complete
    await Promise.all(stockPromises);

    // Insert order into the database
    const newOrder = {
      ...validatedOrder,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection("delivery").insertOne(newOrder);

    return NextResponse.json(
      {
        success: true,
        orderId: result.insertedId,
        finalAmount,
        tax: taxAmount,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Order placement error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const dbClient = await clientPromise;
    const db = dbClient.db();

    // Fetch all orders from the 'delivery' collection
    const orders = await db.collection("delivery").find().toArray();

    // If no orders are found
    if (orders.length === 0) {
      return NextResponse.json(
        { message: "No orders found" },
        { status: 404 }
      );
    }

    // Return the orders in the response
    return NextResponse.json(
      { orders },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching orders:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
