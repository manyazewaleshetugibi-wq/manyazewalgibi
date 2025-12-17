import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { TableOrderSchema } from "@/models/Orders"; // Ensure correct schema import

export async function POST(req: NextRequest) {
  try {
    const dbClient = await clientPromise;
    const db = dbClient.db("gold");
    const body = await req.json();

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
      const unitPrice = itemData.price;
      const subtotal = item.quantity * unitPrice;
      totalAmount += subtotal;

      // Add subtotal and unitPrice to the item object
      item.subtotal = subtotal;
      item.unitPrice = unitPrice;
    }

    // Calculate tax and final amount
    taxAmount = totalAmount * 0.15; // Apply 15% tax
    finalAmount = totalAmount + taxAmount - (body.discount || 0);

    // Validate the order after calculating values
    const validatedOrder = TableOrderSchema.parse({
      ...body,
      totalAmount,
      tax: taxAmount,
      finalAmount,
      _id: undefined, // Ensure _id is not part of the body
    });

    // Deduct required stock
    for (const item of validatedOrder.items) {
      const itemData = await db
        .collection("items")
        .findOne({ _id: new ObjectId(item.itemId) });

      if (!itemData) {
        return NextResponse.json(
          { error: `Item not found: ${item.itemId}` },
          { status: 404 }
        );
      }

      for (const requiredStock of itemData.requiredStock) {
        const stock = await db
          .collection("stocks")
          .findOne({ _id: new ObjectId(requiredStock.stockId) });

        if (!stock) {
          return NextResponse.json(
            { error: `Stock not found for item: ${itemData.name}` },
            { status: 404 }
          );
        }

        const requiredQuantity = requiredStock.quantity * item.quantity;

        if (stock.currentStock < requiredQuantity) {
          return NextResponse.json(
            {
              error: `Insufficient stock for ${itemData.name}. Available: ${stock.currentStock}, Required: ${requiredQuantity}`,
            },
            { status: 400 }
          );
        }

        // Deduct stock
        await db.collection("stocks").updateOne(
          { _id: new ObjectId(requiredStock.stockId) },
          { $inc: { currentStock: -requiredQuantity } }
        );
      }
    }

    // Insert order into the database
    const newOrder = {
      ...validatedOrder,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection("orders").insertOne(newOrder);

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
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { error: "Internal Server Error", details: errorMessage },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const dbClient = await clientPromise;
    const db = dbClient.db("gold");

    // Fetch all orders from the 'orders' collection
    const orders = await db.collection("orders").find().toArray();

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

