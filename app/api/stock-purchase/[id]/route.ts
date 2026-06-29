import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { PurchaseSchema } from "@/models/Stock";

// ✅ GET purchase by ID - RETURNS ACTUAL DATA
export async function GET(
  req: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ 
        success: false,
        error: "Invalid purchase ID" 
      }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("gold");
    const purchase = await db.collection("stock_purchases").findOne({ _id: new ObjectId(id) });

    if (!purchase) {
      return NextResponse.json({ 
        success: false,
        error: "Purchase not found" 
      }, { status: 404 });
    }

    // ✅ Return the actual purchase data
    return NextResponse.json({ 
      success: true, 
      data: purchase,
      message: "Purchase retrieved successfully" 
    }, { status: 200 });
  } catch (error) {
    console.error("GET /stock-purchase/[id] Error:", error);
    return NextResponse.json({ 
      success: false,
      error: "Internal Server Error" 
    }, { status: 500 });
  }
}

// ✅ DELETE purchase by ID - RETURNS DELETED ID
export async function DELETE(
  req: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ 
        success: false,
        error: "Invalid purchase ID" 
      }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("gold");
    const result = await db.collection("stock_purchases").deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json({ 
        success: false,
        error: "Purchase not found" 
      }, { status: 404 });
    }

    // ✅ Return the deleted ID for reference
    return NextResponse.json({ 
      success: true, 
      data: { deletedId: id },
      message: "Purchase deleted successfully" 
    }, { status: 200 });
  } catch (error) {
    console.error("DELETE /stock-purchase/[id] Error:", error);
    return NextResponse.json({ 
      success: false,
      error: "Internal Server Error" 
    }, { status: 500 });
  }
}

// ✅ PUT (update) purchase by ID - RETURNS UPDATED DATA
export async function PUT(
  req: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ 
        success: false,
        error: "Invalid purchase ID" 
      }, { status: 400 });
    }

    const body = await req.json();

    // Handle date conversion if needed
    if (body.purchaseDate instanceof Date) {
      body.purchaseDate = body.purchaseDate.toISOString();
    }

    const parsed = PurchaseSchema.partial().parse(body);

    const client = await clientPromise;
    const db = client.db("gold");
    
    // Update the document
    const result = await db.collection("stock_purchases").updateOne(
      { _id: new ObjectId(id) },
      { $set: parsed }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ 
        success: false,
        error: "Purchase not found" 
      }, { status: 404 });
    }

    // Get the updated document
    const updatedPurchase = await db.collection("stock_purchases").findOne({ _id: new ObjectId(id) });

    // ✅ Return the updated data
    return NextResponse.json({ 
      success: true, 
      data: updatedPurchase,
      message: "Purchase updated successfully" 
    }, { status: 200 });
  } catch (error) {
    console.error("PUT /stock-purchase/[id] Error:", error);
    return NextResponse.json({ 
      success: false,
      error: "Invalid request data" 
    }, { status: 400 });
  }
}