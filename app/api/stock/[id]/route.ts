import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { StockSchema, ReorderFrequencyEnum } from "@/models/Stock";
import { ObjectId } from "mongodb";
import { createResponse } from "@/lib/utils";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    if (!ObjectId.isValid(id)) {
      return createResponse(400, false, "Invalid stock ID format");
    }

    const client = await clientPromise;
    const db = client.db("gold");
    const stock = await db.collection("stocks").findOne({ _id: new ObjectId(id) });

    if (!stock) {
      return createResponse(404, false, "Stock not found");
    }

    return createResponse(200, true, "Stock retrieved successfully", stock);
  } catch (error) {
    console.error("GET /stock/[id] Error:", error);
    return createResponse(500, false, "Internal Server Error");
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return createResponse(400, false, "Invalid stock ID format");
    }

    const body = await req.json();
    const { name, categoryId, unit, minimumStock, currentStock, currentUnitPrice, reorderFrequency, requiredAmount, isActive } = body;

    // Validate: currentStock must equal requiredAmount for manual updates
    if (requiredAmount > 0 && currentStock !== requiredAmount) {
      return createResponse(400, false, `Current stock (${currentStock}) must equal required amount (${requiredAmount}) when manually updating`, null);
    }

    const updateData: any = {
      ...(name && { name }),
      ...(categoryId && { categoryId }),
      ...(unit && { unit }),
      ...(minimumStock !== undefined && { minimumStock }),
      ...(currentStock !== undefined && { currentStock }),
      ...(currentUnitPrice !== undefined && { currentUnitPrice }),
      ...(reorderFrequency && ReorderFrequencyEnum.parse(reorderFrequency) && { reorderFrequency }),
      ...(requiredAmount !== undefined && { requiredAmount }),
      ...(isActive !== undefined && { isActive }),
      updatedAt: new Date(),
    };

    const client = await clientPromise;
    const db = client.db("gold");
    const result = await db.collection("stocks").updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return createResponse(404, false, "Stock not found");
    }

    return createResponse(200, true, "Stock updated successfully", { modifiedCount: result.modifiedCount });
  } catch (error) {
    console.error("PUT /stock/[id] Error:", error);
    return createResponse(400, false, "Invalid request data", error instanceof Error ? error.message : null);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    if (!ObjectId.isValid(id)) {
      return createResponse(400, false, "Invalid stock ID format");
    }

    const client = await clientPromise;
    const db = client.db("gold");
    const result = await db.collection("stocks").deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return createResponse(404, false, "Stock not found");
    }

    return createResponse(200, true, "Stock deleted successfully");
  } catch (error) {
    console.error("DELETE /stock/[id] Error:", error);
    return createResponse(500, false, "Internal Server Error");
  }
}