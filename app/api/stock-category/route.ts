import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { StockCategorySubschema } from "@/models/Stock";
import { createResponse } from "@/lib/utils";

// ✅ GET all categories
export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("gold");
    const categories = await db.collection("stock_categories").find({}).toArray();

    return createResponse(200, true, "Stock categories retrieved successfully", categories);
  } catch (error) {
    console.error("GET /stock-category Error:", error);
    return createResponse(500, false, "Internal Server Error");
  }
}

// ✅ POST (Create a new category)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = StockCategorySubschema.parse(body); // Validation using Zod

    const client = await clientPromise;
    const db = client.db("gold");
    const result = await db.collection("stock_categories").insertOne(parsed);

    return createResponse(201, true, "Stock category created successfully", { id: result.insertedId });
  } catch (error) {
    console.error("POST /stock-category Error:", error);
    return createResponse(400, false, "Invalid request data", error instanceof Error ? error.message : null);
  }
}
