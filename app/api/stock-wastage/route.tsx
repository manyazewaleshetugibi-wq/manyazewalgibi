// /app/api/stock-wastage/route.tsx
import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { WastageCreateSchema } from "@/models/Stock"; // Import the schema

// GET - Fetch all wastages or filter by stockId
export async function GET(req: NextRequest) {
  try {
    const client = await clientPromise;
    const db = client.db("gold");
    
    const { searchParams } = new URL(req.url);
    const stockId = searchParams.get("stockId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    let query: any = {};
    
    if (stockId) {
      query.stockId = stockId;
    }
    
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = startDate;
      if (endDate) query.date.$lte = endDate;
    }

    const wastages = await db.collection("stock_wastages")
      .find(query)
      .sort({ date: -1 })
      .toArray();

    // Get stock details for each wastage
    const wastagesWithStock = await Promise.all(
      wastages.map(async (wastage) => {
        const stock = await db.collection("stocks").findOne(
          { _id: new ObjectId(wastage.stockId) },
          { projection: { name: 1, unit: 1, categoryId: 1 } }
        );
        return {
          ...wastage,
          stockId: stock ? { ...stock, _id: wastage.stockId } : wastage.stockId
        };
      })
    );

    return NextResponse.json({ success: true, data: wastagesWithStock }, { status: 200 });
  } catch (error) {
    console.error("GET /stock-wastage Error:", error);
    return NextResponse.json(
      { success: false, message: "Error fetching wastages" },
      { status: 500 }
    );
  }
}

// POST - Create new wastage with validation
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // ✅ Validate with Zod schema
    const validatedData = WastageCreateSchema.parse(body);
    
    const { stockId, quantity, reason, date } = validatedData;

    const client = await clientPromise;
    const db = client.db("gold");

    // Check if stock exists and get current stock
    const stock = await db.collection("stocks").findOne(
      { _id: new ObjectId(stockId) }
    );

    if (!stock) {
      return NextResponse.json(
        { success: false, message: "Stock not found" },
        { status: 404 }
      );
    }

    // Check if enough stock available
    if (stock.currentStock < quantity) {
      return NextResponse.json(
        { success: false, message: `Insufficient stock. Available: ${stock.currentStock}` },
        { status: 400 }
      );
    }

    // Start a session for transaction
    const session = client.startSession();

    try {
      await session.withTransaction(async () => {
        // Create wastage record
        const wastageDoc = {
          stockId: stockId,
          quantity: Number(quantity),
          reason: reason.trim(),
          date: date || new Date().toISOString().split("T")[0],
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        await db.collection("stock_wastages").insertOne(wastageDoc, { session });

        // Update stock current stock
        await db.collection("stocks").updateOne(
          { _id: new ObjectId(stockId) },
          { 
            $inc: { currentStock: -Number(quantity) },
            $set: { updatedAt: new Date() }
          },
          { session }
        );
      });

      return NextResponse.json({
        success: true,
        message: "Wastage registered successfully"
      }, { status: 201 });
    } catch (error) {
      console.error("Transaction error:", error);
      return NextResponse.json(
        { success: false, message: "Error registering wastage" },
        { status: 500 }
      );
    } finally {
      await session.endSession();
    }
  } catch (error) {
    // ✅ Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Validation error", 
          errors: error.errors 
        },
        { status: 400 }
      );
    }
    
    console.error("POST /stock-wastage Error:", error);
    return NextResponse.json(
      { success: false, message: "Error creating wastage" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a wastage record
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, message: "Wastage ID is required" },
        { status: 400 }
      );
    }

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid wastage ID" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db("gold");

    // Get the wastage record first to restore stock
    const wastage = await db.collection("stock_wastages").findOne(
      { _id: new ObjectId(id) }
    );

    if (!wastage) {
      return NextResponse.json(
        { success: false, message: "Wastage record not found" },
        { status: 404 }
      );
    }

    // Start a session for transaction
    const session = client.startSession();

    try {
      await session.withTransaction(async () => {
        // Restore stock
        await db.collection("stocks").updateOne(
          { _id: new ObjectId(wastage.stockId) },
          { 
            $inc: { currentStock: wastage.quantity },
            $set: { updatedAt: new Date() }
          },
          { session }
        );

        // Delete wastage record
        await db.collection("stock_wastages").deleteOne(
          { _id: new ObjectId(id) },
          { session }
        );
      });

      return NextResponse.json({
        success: true,
        message: "Wastage deleted and stock restored successfully"
      }, { status: 200 });
    } catch (error) {
      console.error("Transaction error:", error);
      return NextResponse.json(
        { success: false, message: "Error deleting wastage" },
        { status: 500 }
      );
    } finally {
      await session.endSession();
    }
  } catch (error) {
    console.error("DELETE /stock-wastage Error:", error);
    return NextResponse.json(
      { success: false, message: "Error deleting wastage" },
      { status: 500 }
    );
  }
}