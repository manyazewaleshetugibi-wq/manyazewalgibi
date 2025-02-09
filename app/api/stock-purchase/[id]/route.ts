import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { PurchaseSchema } from "@/models/Stock"; // Ensure this is correctly imported

// ✅ GET purchase by ID
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    if (!ObjectId.isValid(id)) return NextResponse.json({ error: "Invalid purchase ID" }, { status: 400 });

    const client = await clientPromise;
    const db = client.db();
    const purchase = await db.collection("stock_purchases").findOne({ _id: new ObjectId(id) });

    if (!purchase) return NextResponse.json({ error: "Purchase not found" }, { status: 404 });

    return NextResponse.json({ success: true, purchase }, { status: 200 });
  } catch (error) {
    console.error("GET /stock-purchase/[id] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// ✅ DELETE purchase by ID
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    if (!ObjectId.isValid(id)) return NextResponse.json({ error: "Invalid purchase ID" }, { status: 400 });

    const client = await clientPromise;
    const db = client.db();
    const result = await db.collection("stock_purchases").deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) return NextResponse.json({ error: "Purchase not found" }, { status: 404 });

    return NextResponse.json({ success: true, message: "Purchase deleted successfully" }, { status: 200 });
  } catch (error) {
    console.error("DELETE /stock-purchase/[id] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
    try {
      const { id } = params;
      if (!ObjectId.isValid(id)) return NextResponse.json({ error: "Invalid purchase ID" }, { status: 400 });
  
      const body = await req.json();
  
      // ✅ Convert Date object to string if necessary
      if (body.purchaseDate instanceof Date) {
        body.purchaseDate = body.purchaseDate.toISOString();
      }
  
      const parsed = PurchaseSchema.partial().parse(body); // Allow partial updates
  
      const client = await clientPromise;
      const db = client.db();
      const result = await db.collection("stock_purchases").updateOne(
        { _id: new ObjectId(id) },
        { $set: parsed }
      );
  
      if (result.matchedCount === 0) return NextResponse.json({ error: "Purchase not found" }, { status: 404 });
  
      return NextResponse.json({ success: true, message: "Purchase updated successfully" }, { status: 200 });
    } catch (error) {
      console.error("PUT /stock-purchase/[id] Error:", error);
      return NextResponse.json({ error: "Invalid request data" }, { status: 400 });
    }
  }
  