import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ReorderFrequencyEnum } from "@/models/Stock";
import { createResponse } from "@/lib/utils";
import { requireRole } from "@/lib/api-auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { response } = await requireRole(["admin", "kitchen", "stock_manager", "pos"]);
    if (response) return response;

    const { id } = await params;

    // Still check if stock exists but don't return data
    const stock = await prisma.stock.findUnique({ where: { id } });

    if (!stock) {
      return createResponse(404, false, "Stock not found");
    }

    return createResponse(200, true, "Stock retrieved successfully", stock);
  } catch (error) {
    return createResponse(500, false, "Internal Server Error");
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { response } = await requireRole(["admin", "stock_manager", "kitchen"]);
    if (response) return response;

    const { id } = await params;

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
      ...(minimumStock !== undefined && { minimumStock: Number(minimumStock) }),
      ...(currentStock !== undefined && { currentStock: Number(currentStock) }),
      ...(reorderFrequency && ReorderFrequencyEnum.parse(reorderFrequency) && { reorderFrequency }),
      ...(requiredAmount !== undefined && { requiredAmount: Number(requiredAmount) }),
      ...(isActive !== undefined && { isActive }),
      updatedAt: new Date(),
    };

    try {
      await prisma.stock.update({ where: { id }, data: updateData });
    } catch (e: any) {
      if (e?.code === 'P2025') {
        return createResponse(404, false, "Stock not found");
      }
      throw e;
    }

    return createResponse(200, true, "Stock updated successfully", null);
  } catch (error) {
    return createResponse(400, false, "Invalid request data", error instanceof Error ? error.message : null);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { response } = await requireRole(["admin", "stock_manager", "kitchen"]);
    if (response) return response;

    const { id } = await params;

    const result = await prisma.stock.deleteMany({ where: { id } });

    if (result.count === 0) {
      return createResponse(404, false, "Stock not found");
    }

    return createResponse(200, true, "Stock deleted successfully", null);
  } catch (error) {
    return createResponse(500, false, "Internal Server Error");
  }
}
