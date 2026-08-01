// app/api/cron/process-stock/route.ts
import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { processAllCompletedOrders, processOrderStockUsage } from "../../utils/stockHelpers";
import { debugLog, debugError } from "../../utils/orderHelpers";

// Simple rate limiting - only prevent too frequent runs
let lastRunTime = 0;
const MIN_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes between runs
const MAX_ORDERS_PER_RUN = 100; // Process 100 orders per run

export async function GET(req: NextRequest) {
  const now = Date.now();
  
  // Rate limiting - prevent too frequent runs
  if (lastRunTime > 0 && (now - lastRunTime) < MIN_INTERVAL_MS) {
    const secondsSinceLastRun = (now - lastRunTime) / 1000;
    debugLog(`Cron skipped - last run ${secondsSinceLastRun.toFixed(0)}s ago`);
    return NextResponse.json({
      success: true,
      message: `Rate limited - last run ${secondsSinceLastRun.toFixed(0)}s ago`,
      nextRunIn: Math.ceil((MIN_INTERVAL_MS - (now - lastRunTime)) / 1000)
    });
  }
  
  lastRunTime = now;
  
  debugLog(`🕐 Cron started - processing up to ${MAX_ORDERS_PER_RUN} orders...`);
  
  try {
    const startTime = Date.now();
    const result = await processAllCompletedOrders(undefined, MAX_ORDERS_PER_RUN);
    const duration = Date.now() - startTime;
    
    debugLog(`✅ Cron completed in ${duration}ms:`, {
      processed: result.processedOrders,
      failed: result.failedOrders,
      pending: result.totalOrders - result.processedOrders - result.failedOrders,
      lowStockCount: result.lowStockItems?.length || 0,
      errorCount: result.errors?.length || 0
    });
    
    // Log low stock items for debugging
    if (result.lowStockItems && result.lowStockItems.length > 0) {
      debugLog(`⚠️ Low stock items detected:`, result.lowStockItems.map((item: any) => ({
        name: item.stockName,
        current: item.currentStock,
        required: item.requiredQuantity,
        deficit: item.deficit,
        unit: item.unit,
        order: item.orderNumber
      })));
    }
    
    // Log errors for debugging
    if (result.errors && result.errors.length > 0) {
      debugLog(`❌ Processing errors:`, result.errors);
    }
    
    return NextResponse.json({
      success: true,
      duration: `${duration}ms`,
      processedOrders: result.processedOrders,
      failedOrders: result.failedOrders,
      partialOrders: result.partialOrders,
      pendingOrders: result.totalOrders - result.processedOrders - result.failedOrders,
      lowStockItems: result.lowStockItems || [],
      errors: result.errors || []
    });
    
  } catch (error) {
    debugError("❌ Cron failed:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: String(error),
        processedOrders: 0,
        failedOrders: 0,
        partialOrders: 0,
        pendingOrders: 0,
        lowStockItems: [],
        errors: []
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { orderId, retryFailed } = body;

    // Per-order processing (used by the "Retry stock" button)
    if (orderId) {
      if (!ObjectId.isValid(orderId)) {
        return NextResponse.json(
          { success: false, error: "Invalid order ID" },
          { status: 400 }
        );
      }

      const dbClient = await clientPromise;
      const db = dbClient.db("gold");
      const order = await db.collection("orders").findOne({ _id: new ObjectId(orderId) });

      if (!order) {
        return NextResponse.json(
          { success: false, error: "Order not found" },
          { status: 404 }
        );
      }

      debugLog(`Manual stock processing for order: ${order.orderNumber}`);
      const result = await processOrderStockUsage(order);

      return NextResponse.json({
        success: result.success,
        orderId,
        orderNumber: order.orderNumber,
        processedOrders: result.success && !result.partiallyProcessed && !result.alreadyProcessed ? 1 : 0,
        partialOrders: result.partiallyProcessed || result.stillPending ? 1 : 0,
        failedOrders: result.success ? 0 : 1,
        alreadyProcessed: result.alreadyProcessed || false,
        lowStockItems: result.lowStockItems || [],
        message: result.message || null,
        error: result.error || (result.success ? null : (result.message || "Processing failed")),
      });
    }

    // Retry only previously-failed orders
    if (retryFailed) {
      const dbClient = await clientPromise;
      const db = dbClient.db("gold");

      const failedOrders = await db.collection("orders").find({
        status: { $regex: /^completed$/i },
        stockProcessed: { $ne: true },
        stockProcessingError: { $exists: true, $ne: "" },
      }).limit(50).toArray();

      let processed = 0;
      let stillFailed = 0;
      for (const order of failedOrders) {
        try {
          const result = await processOrderStockUsage(order);
          if (result.success && !result.partiallyProcessed && !result.stillPending) {
            processed++;
          } else if (result.stillPending || result.partiallyProcessed) {
            // still waiting — leave as-is
          } else {
            stillFailed++;
          }
        } catch (error: any) {
          stillFailed++;
          debugError(`Failed to retry ${order.orderNumber}:`, error);
          await db.collection("orders").updateOne(
            { _id: order._id },
            { $set: { stockProcessingError: error?.message || String(error), stockProcessingFailedAt: new Date() } }
          );
        }
      }

      return NextResponse.json({
        success: true,
        processedOrders: processed,
        failedOrders: stillFailed,
        partialOrders: failedOrders.length - processed - stillFailed,
      });
    }

    // Default: process the batch of pending + partial orders
    debugLog(`Manual stock processing triggered`);
    const startTime = Date.now();
    const result = await processAllCompletedOrders(undefined, 10);
    const duration = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      duration: `${duration}ms`,
      processedOrders: result.processedOrders,
      failedOrders: result.failedOrders,
      partialOrders: result.partialOrders,
      pendingOrders: result.totalOrders - result.processedOrders - result.failedOrders,
      lowStockItems: result.lowStockItems || [],
      errors: result.errors || []
    });

  } catch (error) {
    debugError("Manual processing error:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: String(error),
        processedOrders: 0,
        failedOrders: 0,
        partialOrders: 0,
        pendingOrders: 0,
        lowStockItems: [],
        errors: []
      },
      { status: 500 }
    );
  }
}