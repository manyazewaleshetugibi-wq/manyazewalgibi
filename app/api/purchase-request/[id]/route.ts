import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";
import { createResponse } from "@/lib/utils";
import { requireRole } from "@/lib/api-auth";

function getNextReorderDate(frequency: string, fromDate: Date): Date {
  const map: Record<string, number> = {
    daily: 1,
    "3days": 3,
    "5days": 5,
    weekly: 7,
    "9days": 9,
    "11days": 11,
    "2weeks": 14,
    monthly: 30,
    "2months": 60,
    "3months": 90,
    "6months": 180,
    yearly: 365,
  };
  const days = map[frequency] || 30;
  const nextDate = new Date(fromDate);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { response } = await requireRole(["admin", "finance", "stock_manager", "purchasing"]);
    if (response) return response;
    
    const { id } = await params;

    const request = await prisma.purchaseRequest.findUnique({ where: { id } });

    if (!request) {
      return createResponse(404, false, "Purchase request not found");
    }

    let stock = null;
    if (request.stockId) {
      stock = await prisma.stock.findUnique({ where: { id: request.stockId } });
    }

    const requestWithStock = {
      ...request,
      _id: request.id,
      currentStockLevel: stock?.currentStock || 0,
      stockUnit: stock?.unit || request.unit,
      requiredAmount: stock?.requiredAmount || request.requiredAmount || 0,
    };

    return createResponse(200, true, "Purchase request retrieved successfully", requestWithStock);
  } catch (error) {
    console.error("GET /purchase-request/[id] Error:", error);
    return createResponse(500, false, "Internal Server Error");
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { response } = await requireRole(["admin", "finance", "stock_manager", "purchasing"]);
    if (response) return response;
    
    const { id } = await params;

    const body = await req.json();
    const { action, actualUnitPrice, actualTotalCost, userId, notes } = body;

    const request = await prisma.purchaseRequest.findUnique({ where: { id } });
    if (!request) {
      return createResponse(404, false, "Purchase request not found");
    }

    let updateData: any = {
      updatedAt: new Date(),
      notes: notes || request.notes,
    };

    if (action === 'purchased') {
      updateData.isPurchased = !request.isPurchased;
      if (updateData.isPurchased) {
        updateData.purchasedAt = new Date();
        updateData.purchasedBy = userId;
        updateData.status = 'purchased';

        if (actualUnitPrice) {
          updateData.actualUnitPrice = actualUnitPrice;
          updateData.actualTotalCost = actualTotalCost || (actualUnitPrice * (request.requestedQuantity || 0));
        }
      } else {
        updateData.purchasedAt = null;
        updateData.purchasedBy = null;
        updateData.status = 'pending';
        updateData.actualUnitPrice = null;
        updateData.actualTotalCost = null;
      }
    }
    else if (action === 'confirm') {
      if (!request.isPurchased) {
        return createResponse(400, false, "Cannot confirm before purchase is completed", null);
      }

      updateData.isConfirmed = !request.isConfirmed;
      if (updateData.isConfirmed) {
        updateData.confirmedAt = new Date();
        updateData.confirmedBy = userId;
        updateData.status = 'completed';

        let stock = null;
        if (request.stockId) {
          stock = await prisma.stock.findUnique({ where: { id: request.stockId } });
        }

        if (stock) {
          // Get the actual price values
          const actualUnitPriceValue = request.actualUnitPrice || actualUnitPrice || request.estimatedUnitPrice;
          const actualTotalCostValue = request.actualTotalCost || actualTotalCost || (actualUnitPriceValue * (request.requestedQuantity || 0));

          // Update stock to required amount
          const requiredAmount = stock.requiredAmount || request.requiredAmount || request.requestedQuantity || 0;
          const newStock = requiredAmount;

          await prisma.stock.update({
            where: { id: stock.id },
            data: { currentStock: newStock, updatedAt: new Date() }
          });

          // =============================================
          // REGISTER PURCHASE (Same as Buy button functionality)
          // =============================================
          await prisma.stockPurchase.create({
            data: {
              id: randomUUID(),
              stockId: request.stockId,
              purchaseDate: new Date(),
              quantity: request.requestedQuantity || 0,
              unitPrice: actualUnitPriceValue || 0,
              supplier: "Purchase Request System",
            }
          });

          // EXPENSE REGISTRATION REMOVED - No longer creating expense records
        }
      } else {
        updateData.confirmedAt = null;
        updateData.confirmedBy = null;
        updateData.status = 'purchased';
      }
    }

    const result = await prisma.purchaseRequest.update({
      where: { id },
      data: updateData
    });

    return createResponse(200, true, "Purchase request updated successfully", updateData);
  } catch (error) {
    console.error("PUT /purchase-request/[id] Error:", error);
    return createResponse(400, false, "Invalid request data", error instanceof Error ? error.message : null);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { response } = await requireRole(["admin", "stock_manager"]);
    if (response) return response;
    
    const { id } = await params;

    // EXPENSE DELETION REMOVED - No longer deleting expense records

    const result = await prisma.purchaseRequest.delete({
      where: { id }
    });

    return createResponse(200, true, "Purchase request and associated purchase records deleted successfully");
  } catch (error) {
    console.error("DELETE /purchase-request/[id] Error:", error);
    return createResponse(500, false, "Internal Server Error");
  }
}
