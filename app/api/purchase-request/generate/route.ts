import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";
import { createResponse } from "@/lib/utils";
import { requireRole } from "@/lib/api-auth";

function daysBetween(date1: Date, date2: Date): number {
  const diffTime = Math.abs(date2.getTime() - date1.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function getFrequencyDays(frequency: string): number {
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
  return map[frequency] || 30;
}

// Removed has21HoursPassed function - no longer needed

export async function POST(req: NextRequest) {
  try {
    const { response } = await requireRole(["admin", "finance", "stock_manager", "purchasing"]);
    if (response) return response;
    // Removed the 21-hour check - can generate anytime

    const today = new Date().toISOString().split('T')[0];
    const stocks = await prisma.stock.findMany({ where: { isActive: true } });
    const existingTodayRequests = await prisma.purchaseRequest.findMany({ where: { requestDate: today } });
    const existingStockIdsToday = new Set(existingTodayRequests.map(r => r.stockId));
    const purchases = await prisma.stockPurchase.findMany();

    const generatedRequests = [];

    for (const stock of stocks) {
      const stockIdStr = stock.id;

      if (existingStockIdsToday.has(stockIdStr)) {
        continue;
      }

      let requestedQuantity = 0;
      let reason: 'minimum_stock_reached' | 'reorder_frequency_due' = 'minimum_stock_reached';
      let needsReorder = false;

      // Calculate using requiredAmount - currentStock
      if (Number(stock.requiredAmount) > 0) {
        requestedQuantity = Math.max(0, Number(stock.requiredAmount) - Number(stock.currentStock));

        if (requestedQuantity > 0) {
          needsReorder = true;
          reason = 'minimum_stock_reached';
        }
      }

      // Check reorder frequency
      if (!needsReorder) {
        const stockPurchases = purchases.filter(p => p.stockId === stockIdStr);
        if (stockPurchases.length > 0) {
          const lastPurchase = stockPurchases.sort((a, b) =>
            new Date(b.purchaseDate!).getTime() - new Date(a.purchaseDate!).getTime()
          )[0];

          const lastPurchaseDate = new Date(lastPurchase.purchaseDate!);
          const daysSince = daysBetween(lastPurchaseDate, new Date());
          const frequencyDays = getFrequencyDays(stock.reorderFrequency || 'monthly');

          if (daysSince >= frequencyDays && Number(stock.requiredAmount) > 0) {
            needsReorder = true;
            reason = 'reorder_frequency_due';
            requestedQuantity = Math.max(0, Number(stock.requiredAmount) - Number(stock.currentStock));
          }
        }
      }

      if (needsReorder && requestedQuantity > 0) {
        const stockPurchases = purchases.filter(p => p.stockId === stockIdStr);
        const lastPurchases = stockPurchases
          .sort((a, b) => new Date(b.purchaseDate!).getTime() - new Date(a.purchaseDate!).getTime())
          .slice(0, 3);

        const avgUnitPrice = lastPurchases.length > 0
          ? lastPurchases.reduce((sum, p) => sum + Number(p.unitPrice), 0) / lastPurchases.length
          : 0;

        const request = {
          stockId: stockIdStr,
          stockName: stock.name,
          categoryId: stock.categoryId,
          unit: stock.unit,
          reorderFrequency: stock.reorderFrequency || 'monthly',
          requiredAmount: stock.requiredAmount || 0,
          requestDate: today,
          requestDateTime: new Date(),
          requestedQuantity: requestedQuantity,
          currentStock: stock.currentStock,
          minimumStock: stock.minimumStock,
          estimatedUnitPrice: avgUnitPrice,
          estimatedTotalCost: requestedQuantity * avgUnitPrice,
          isDelivered: false,
          isPurchased: false,
          isConfirmed: false,
          reason: reason,
          status: 'pending',
          notes: `Auto-generated: Required: ${stock.requiredAmount}, Current: ${stock.currentStock}, Need: ${requestedQuantity}`,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const id = randomUUID();
        await prisma.purchaseRequest.create({ data: { id, ...request } });
        generatedRequests.push({ ...request, _id: id, id });
      }
    }

    const existingSetting = await prisma.systemSetting.findFirst({ where: { key: "last_purchase_request_generation" } });
    if (existingSetting) {
      await prisma.systemSetting.update({
        where: { id: existingSetting.id },
        data: { value: new Date().toISOString(), updatedAt: new Date() }
      });
    } else {
      await prisma.systemSetting.create({
        data: {
          id: randomUUID(),
          key: "last_purchase_request_generation",
          value: new Date().toISOString(),
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
    }

    return createResponse(200, true, `${generatedRequests.length} purchase requests generated`, {
      count: generatedRequests.length,
      requests: generatedRequests,
      date: today,
      lastGeneratedAt: new Date()
    });
  } catch (error) {
    console.error("POST /purchase-request/generate Error:", error);
    return createResponse(500, false, "Internal Server Error", null);
  }
}

export async function GET(req: NextRequest) {
  try {
    const { response } = await requireRole(["admin", "finance", "stock_manager", "purchasing"]);
    if (response) return response;
    const settings = await prisma.systemSetting.findFirst({ where: { key: "last_purchase_request_generation" } });
    const lastGenerationTime = settings?.value ? new Date(settings.value as string) : null;

    // Always allow generation - no time limit
    // Return status with canGenerate always true
    return createResponse(200, true, "Generation status", {
      canGenerate: true,  // Always true now
      hoursRemaining: 0,  // No limit
      lastGeneratedAt: lastGenerationTime
    });
  } catch (error) {
    console.error("GET /purchase-request/generate Error:", error);
    return createResponse(500, false, "Internal Server Error", null);
  }
}
