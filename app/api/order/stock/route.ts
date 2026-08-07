// app/api/order/stock/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { debugLog, debugError, getCurrentUserData } from "../../utils/orderHelpers";
import { processAllCompletedOrders, processOrderStockUsage } from "../../utils/stockHelpers";
import { registerOrderActivity } from "../../utils/activityHelpers";

// GET endpoint - Get stock usage records and pending orders status
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const orderId = url.searchParams.get("orderId");
    const itemId = url.searchParams.get("itemId");
    const stockId = url.searchParams.get("stockId");
    const startDate = url.searchParams.get("startDate");
    const endDate = url.searchParams.get("endDate");
    const limit = parseInt(url.searchParams.get("limit") || "100");
    const checkPending = url.searchParams.get("checkPending") === "true";

    // If checking pending orders
    if (checkPending) {
      // Scan ALL completed orders that still need stock work — no time window,
      // so the button always shows the true number of pending/partial/failed orders.
      const allCompleted = await prisma.order.findMany({
        where: {
          OR: [
            { status: { contains: 'completed', mode: 'insensitive' } },
            { status: { contains: 'delivered', mode: 'insensitive' } }
          ],
          AND: [
            {
              OR: [
                { stockProcessed: { not: true } },
                { stockProcessed: null },
                { hasPartialStock: true }
              ]
            }
          ]
        },
        orderBy: { createdAt: 'desc' }
      });

      const withItems = allCompleted.filter(o =>
        Array.isArray((o.items as any)) && (o.items as any).length > 0
      );

      const toOrder = (o: any) => ({
        ...o,
        _id: o.id,
        orderId: o.id,
        error: o.stockProcessingError || null,
        lastAttempt: o.stockLastAttempt || null
      });

      const pendingOrders = withItems.filter(o =>
        o.stockProcessed !== true && !o.stockProcessingError
      );
      const partialOrders = withItems.filter(o =>
        o.stockProcessed === true && o.hasPartialStock === true
      );
      const failedOrders = withItems.filter(o =>
        o.stockProcessed !== true && !!o.stockProcessingError
      );

      return NextResponse.json({
        success: true,
        pendingCount: pendingOrders.length,
        partialCount: partialOrders.length,
        failedCount: failedOrders.length,
        pendingOrders: pendingOrders.map(toOrder),
        partialOrders: partialOrders.map(toOrder),
        failedOrders: failedOrders.map(toOrder)
      }, { status: 200 });
    }

    // Otherwise, get stock usage records
    const where: any = {};

    if (orderId) {
      where.orderId = orderId;
    }

    if (stockId) {
      where.stockId = stockId;
    }

    if (startDate && endDate) {
      where.usedAt = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    let usedStock = await prisma.usedStock.findMany({
      where,
      orderBy: { usedAt: 'desc' }
    });

    // "items.itemId" filter (JSON array), applied in JS after fetch
    if (itemId) {
      usedStock = usedStock.filter(u =>
        ((u.items as any) || []).some((i: any) => i.itemId === itemId)
      );
    }

    const totals = usedStock.reduce(
      (acc, u) => {
        acc.totalQuantity += Number(u.totalQuantityUsed) || 0;
        acc.totalCost += Number(u.totalCost) || 0;
        acc.count += 1;
        return acc;
      },
      { totalQuantity: 0, totalCost: 0, count: 0 }
    );

    const limitedStock = usedStock.slice(0, limit).map(u => ({ ...u, _id: u.id }));

    return NextResponse.json({
      success: true,
      usedStock: limitedStock,
      totals,
      count: limitedStock.length
    }, { status: 200 });

  } catch (error) {
    debugError("Error fetching used stock:", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error", details: (error as Error).message },
      { status: 500 }
    );
  }
}

// POST endpoint - Process stock for specific order
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    const { orderId } = body;
    
    if (!orderId) {
      return NextResponse.json(
        { success: false, error: "Valid order ID is required" },
        { status: 400 }
      );
    }

    const order = await prisma.order.findFirst({ where: { id: orderId } });

    if (!order) {
      return NextResponse.json(
        { success: false, error: "Order not found" },
        { status: 404 }
      );
    }

    debugLog(`Manual stock processing for order: ${order.orderNumber}`);
    const result = await processOrderStockUsage(order);

    return NextResponse.json({ ...result, orderId }, { status: 200 });

  } catch (error) {
    debugError("Stock processing error:", error);
    return NextResponse.json(
      { success: false, error: "Stock processing failed", details: (error as Error).message },
      { status: 500 }
    );
  }
}

// PATCH endpoint - Process all completed orders (manual trigger)
export async function PATCH(req: NextRequest) {
  try {
    const userData = await getCurrentUserData(req);
    
    debugLog("Manual batch stock processing triggered by:", userData?.name || "Unknown");
    
    // Process in background to respond quickly
    // Use setImmediate to avoid blocking
    setImmediate(async () => {
      try {
        debugLog("Starting background stock processing...");
        const result = await processAllCompletedOrders();
        debugLog(`Background processing completed: ${result.processedOrders} success, ${result.failedOrders} failed`);
        
        // Register activity if user triggered it
        if (userData && result.processedOrders > 0) {
          await registerOrderActivity(prisma, userData, { 
            _id: 'batch-process', 
            orderNumber: 'BATCH-PROCESS',
            status: 'manual_trigger'
          } as any, 'updated');
        }
      } catch (error) {
        debugError("Background processing failed:", error);
      }
    });
    
    // Return immediately
    return NextResponse.json({
      success: true,
      message: "Stock processing started in background",
      triggeredBy: userData ? { name: userData.name, id: userData.id } : null,
      timestamp: new Date().toISOString()
    }, { status: 200 });
    
  } catch (error) {
    debugError("Batch stock processing error:", error);
    return NextResponse.json(
      { success: false, error: "Batch processing failed", details: (error as Error).message },
      { status: 500 }
    );
  }
}
