import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { StockSchema } from "@/models/Stock";
import { ObjectId } from "mongodb";
import { createResponse } from "@/lib/utils";

// ✅ GET all stocks
export async function GET(req: NextRequest) {
  try {
    const client = await clientPromise;
    const db = client.db();
    const stocks = await db.collection("stocks").find().toArray();

    return createResponse(200, true, "Stocks retrieved successfully", stocks);
  } catch (error) {
    console.error("GET /stock Error:", error);
    return createResponse(500, false, "Internal Server Error", null);
  }
}

// ✅ POST: Add new stock
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsedData = StockSchema.parse(body);
    parsedData.createdAt = new Date();
    parsedData.updatedAt = new Date();

    const client = await clientPromise;
    const db = client.db();
    const result = await db.collection("stocks").insertOne(parsedData);

    if (!result.acknowledged) {
      return createResponse(500, false, "Failed to insert stock", null);
    }

    return createResponse(201, true, "Stock added successfully", { id: result.insertedId });
  } catch (error) {
    console.error("POST /stock Error:", error);
    return createResponse(400, false, "Invalid request data", error instanceof Error ? error.message : null);
  }
}
