import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { PurchaseSchema } from "@/models/Stock";

// ✅ GET all purchases - RETURNS ACTUAL DATA
export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("gold");
    const purchases = await db.collection("stock_purchases").find({}).toArray();

    // ✅ Return the actual data
    return NextResponse.json({ 
      success: true, 
      data: purchases,
      message: "Purchases retrieved successfully" 
    }, { status: 200 });
  } catch (error) {
    console.error("GET /stock-purchase Error:", error);
    return NextResponse.json({ 
      success: false,
      error: "Internal Server Error" 
    }, { status: 500 });
  }
}

// ✅ POST (Create a new purchase) - RETURNS CREATED DATA
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = PurchaseSchema.parse(body);

    const client = await clientPromise;
    const db = client.db("gold");

    const result = await db.collection("stock_purchases").insertOne(parsed);

    return NextResponse.json({ 
      success: true, 
      data: { ...parsed, _id: result.insertedId },
      message: "Purchase created successfully" 
    }, { status: 201 });
  } catch (error) {
    console.error("POST /stock-purchase Error:", error);
    return NextResponse.json({ 
      success: false,
      error: "Invalid request data" 
    }, { status: 400 });
  }
}