import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  try {
    const { response } = await requireRole(["admin", "stock_manager", "finance"]);
    if (response) return response;
    
    const { searchParams } = new URL(req.url);
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");

    // ✅ Validate required params
    if (!startDateParam || !endDateParam) {
      return NextResponse.json({ error: "startDate and endDate are required" }, { status: 400 });
    }

    // ✅ Convert to Date objects
    const startDate = new Date(startDateParam);
    const endDate = new Date(endDateParam);
    endDate.setHours(23, 59, 59, 999); // Ensure full-day range




    // ✅ Fetch stock purchases
    const purchases = await prisma.stockPurchase.findMany({
      where: {
        purchaseDate: { gte: startDate, lte: endDate }
      }
    });

    // ✅ Fetch stock details for the purchase stockIds
    const stockIds = Array.from(new Set(purchases.map(p => p.stockId).filter((id): id is string => !!id)));
    const stocks = stockIds.length > 0
      ? await prisma.stock.findMany({ where: { id: { in: stockIds } } })
      : [];
    const stockById = new Map(stocks.map(s => [s.id, s]));

    const data = purchases.map(purchase => {
      const stock = purchase.stockId ? stockById.get(purchase.stockId) : undefined;
      const totalCost = (Number(purchase.quantity) || 0) * (Number(purchase.unitPrice) || 0);
      return {
        _id: purchase.id,
        stockId: purchase.stockId,
        purchaseDate: purchase.purchaseDate,
        quantity: purchase.quantity,
        unitPrice: purchase.unitPrice,
        totalCost,
        stock: {
          name: stock?.name ?? null,
          categoryId: stock?.categoryId ?? null,
          unit: stock?.unit ?? null,
        }
      };
    });

    return NextResponse.json({ success: true, data }, { status: 200 });

  } catch (error) {
    console.error("❌ Error fetching stock purchase report:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
