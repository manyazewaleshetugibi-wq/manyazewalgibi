import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";
import { StockCategorySubschema } from "@/models/Stock";
import { createResponse } from "@/lib/utils";
import { requireRole } from "@/lib/api-auth";

// GET all categories
export async function GET() {
  try {
    const { response } = await requireRole(["admin", "stock_manager", "kitchen", "finance"]);
    if (response) return response;
    
    const categories = await prisma.stockCategory.findMany();

    return createResponse(200, true, "Stock categories retrieved successfully", categories.map((c: any) => ({ ...c, _id: c.id })));
  } catch (error) {
    console.error("GET /stock-category Error:", error);
    return createResponse(500, false, "Internal Server Error");
  }
}

// ✅ POST (Create a new category)
export async function POST(req: NextRequest) {
  try {
    const { response } = await requireRole(["admin", "stock_manager"]);
    if (response) return response;
    
    const body = await req.json();
    const parsed = StockCategorySubschema.parse(body); // Validation using Zod

    const result = await prisma.stockCategory.create({
      data: { id: randomUUID(), ...parsed },
    });

    return createResponse(201, true, "Stock category created successfully", { id: result.id });
  } catch (error) {
    console.error("POST /stock-category Error:", error);
    return createResponse(400, false, "Invalid request data", error instanceof Error ? error.message : null);
  }
}
