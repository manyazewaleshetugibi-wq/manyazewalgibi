import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { StockCategorySubschema } from "@/models/Stock";
import { ObjectId } from "mongodb";

// ✅ GET category by ID    
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    if (!ObjectId.isValid(id)) return NextResponse.json({ error: "Invalid category ID" }, { status: 400 });

    const client = await clientPromise;
    const db = client.db("gold");
    const category = await db.collection("stock_categories").findOne({ _id: new ObjectId(id) });

    if (!category) return NextResponse.json({ error: "Category not found" }, { status: 404 });

    return NextResponse.json({ success: true, category }, { status: 200 });
  } catch (error) {
    console.error("GET /stock-category/[id] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// ✅ PUT (Update Category by ID)
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    if (!ObjectId.isValid(id)) return NextResponse.json({ error: "Invalid category ID" }, { status: 400 });

    const body = await req.json();
    const parsed = StockCategorySubschema.partial().parse(body); // Partial update

    const client = await clientPromise;
    const db = client.db("gold");
    const result = await db.collection("stock_categories").updateOne(
      { _id: new ObjectId(id) },
      { $set: { ...parsed, updatedAt: new Date() } }
    );

    if (result.matchedCount === 0) return NextResponse.json({ error: "Category not found" }, { status: 404 });

    return NextResponse.json({ success: true, message: "Category updated successfully" }, { status: 200 });
  } catch (error) {
    console.error("PUT /stock-category/[id] Error:", error);
    return NextResponse.json({ error: "Invalid request data" }, { status: 400 });
  }
}

// ✅ DELETE Category
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    if (!ObjectId.isValid(id)) return NextResponse.json({ error: "Invalid category ID" }, { status: 400 });

    const client = await clientPromise;
    const db = client.db("gold");
    const result = await db.collection("stock_categories").deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) return NextResponse.json({ error: "Category not found" }, { status: 404 });

    return NextResponse.json({ success: true, message: "Category deleted successfully" }, { status: 200 });
  } catch (error) {
    console.error("DELETE /stock-category/[id] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
