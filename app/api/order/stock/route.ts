// app/api/order/stock/route.ts
import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { debugLog, debugError, getCurrentUserData } from "../../utils/orderHelpers";
import { processAllCompletedOrders, processOrderStockUsage } from "../../utils/stockHelpers";
import { registerOrderActivity } from "../../utils/activityHelpers";

// GET endpoint - Get stock usage records and pending orders status
export async function GET(req: NextRequest) {
  try {
    const dbClient = await clientPromise;
    const db = dbClient.db("gold");

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
      const pendingOrders = await db.collection("orders").find({
        status: { $regex: /^completed$/i },
        stockProcessed: { $ne: true },
        "items.0": { $exists: true }
      }).toArray();

      return NextResponse.json({
        success: true,
        pendingCount: pendingOrders.length,
        pendingOrders: pendingOrders.map(o => ({
          orderId: o._id,
          orderNumber: o.orderNumber,
          error: o.stockProcessingError || null,
          lastAttempt: o.stockLastAttempt || null
        }))
      }, { status: 200 });
    }

    // Otherwise, get stock usage records
    let query = {};

    if (orderId && ObjectId.isValid(orderId)) {
      query = { ...query, orderId: new ObjectId(orderId) };
    }

    if (itemId && ObjectId.isValid(itemId)) {
      query = { ...query, "items.itemId": new ObjectId(itemId) };
    }

    if (stockId && ObjectId.isValid(stockId)) {
      query = { ...query, stockId: new ObjectId(stockId) };
    }

    if (startDate && endDate) {
      query = {
        ...query,
        usedAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        },
      };
    }

    const usedStock = await db
      .collection("used_stock")
      .find(query)
      .sort({ usedAt: -1 })
      .limit(limit)
      .toArray();

    const aggregation = [
      { $match: query },
      {
        $group: {
          _id: null,
          totalQuantity: { $sum: "$totalQuantityUsed" },
          totalCost: { $sum: "$totalCost" },
          count: { $sum: 1 }
        }
      }
    ];

    const totals = await db
      .collection("used_stock")
      .aggregate(aggregation)
      .toArray();

    return NextResponse.json({
      success: true,
      usedStock,
      totals: totals[0] || { totalQuantity: 0, totalCost: 0, count: 0 },
      count: usedStock.length
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
    const dbClient = await clientPromise;
    const db = dbClient.db("gold");
    const body = await req.json();
    
    const { orderId } = body;
    
    if (!orderId || !ObjectId.isValid(orderId)) {
      return NextResponse.json(
        { success: false, error: "Valid order ID is required" },
        { status: 400 }
      );
    }

    const order = await db.collection("orders").findOne({ _id: new ObjectId(orderId) });

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
    const dbClient = await clientPromise;
    const db = dbClient.db("gold");
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
          await registerOrderActivity(db, userData, { 
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