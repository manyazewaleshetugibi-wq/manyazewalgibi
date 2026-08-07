import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";
import { StockSchema } from "@/models/Stock";
import { createResponse } from "@/lib/utils";
import { requireRole } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  try {
    const { response } = await requireRole(["admin", "kitchen", "stock_manager", "pos"]);
    if (response) return response;

    const stocks = await prisma.stock.findMany();

    return createResponse(200, true, "Stocks retrieved successfully", stocks.map((s: any) => ({ ...s, _id: s.id })));
  } catch (error) {
    console.error("GET /stock Error:", error);
    return createResponse(500, false, "Internal Server Error", null);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { response } = await requireRole(["admin", "stock_manager", "kitchen"]);
    if (response) return response;

    const body = await req.json();
    const parsedData: any = StockSchema.parse(body);
    parsedData.createdAt = new Date();
    parsedData.updatedAt = new Date();

    const result = await prisma.stock.create({
      data: {
        id: randomUUID(),
        name: parsedData.name,
        categoryId: parsedData.categoryId,
        unit: parsedData.unit,
        minimumStock: parsedData.minimumStock,
        currentStock: parsedData.currentStock,
        reorderFrequency: parsedData.reorderFrequency,
        requiredAmount: parsedData.requiredAmount,
        isActive: parsedData.isActive,
        createdAt: parsedData.createdAt,
        updatedAt: parsedData.updatedAt,
      },
    });

    return createResponse(201, true, "Stock added successfully", { id: result.id });
  } catch (error) {
    console.error("POST /stock Error:", error);
    return createResponse(400, false, "Invalid request data", error instanceof Error ? error.message : null);
  }
}
