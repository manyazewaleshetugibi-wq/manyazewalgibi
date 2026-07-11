// app/api/cron/process-stock/route.ts
import { NextRequest, NextResponse } from "next/server";
import { processAllCompletedOrders } from "../../utils/stockHelpers";
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
    debugLog(`Manual stock processing triggered`);
    
    const startTime = Date.now();
    const result = await processAllCompletedOrders(undefined, 100);
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