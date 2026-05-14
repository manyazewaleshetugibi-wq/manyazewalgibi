import { NextRequest, NextResponse } from "next/server";
import { processAllCompletedOrders } from "../../utils/stockHelpers";
import { debugLog, debugError } from "../../utils/orderHelpers";

// Track last run time to prevent too frequent executions
let lastRunTime = 0;
let isProcessing = false;
const MIN_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes (900,000 ms)
const MAX_ORDERS_PER_RUN = 10; // Process 10 orders per run

export async function GET(req: NextRequest) {
  // Check if already processing
  if (isProcessing) {
    debugLog("⏭️ Cron job already processing, skipping this execution");
    return NextResponse.json({
      success: false,
      message: "Already processing, skipping",
      reason: "concurrent_run",
      timestamp: new Date().toISOString()
    }, { status: 200 });
  }
  
  // Prevent too frequent runs
  const now = Date.now();
  if (lastRunTime > 0 && (now - lastRunTime) < MIN_INTERVAL_MS) {
    const minutesSinceLastRun = (now - lastRunTime) / 60000;
    const minutesUntilNext = (MIN_INTERVAL_MS - (now - lastRunTime)) / 60000;
    
    debugLog(`⏭️ Cron job skipped - last run was ${minutesSinceLastRun.toFixed(1)} minutes ago (need ${MIN_INTERVAL_MS/60000} min)`);
    
    return NextResponse.json({
      success: true,
      message: `Skipped - last run was ${minutesSinceLastRun.toFixed(1)} minutes ago`,
      reason: "rate_limited",
      lastRun: new Date(lastRunTime).toISOString(),
      nextAllowedRun: new Date(lastRunTime + MIN_INTERVAL_MS).toISOString(),
      minutesUntilNext: minutesUntilNext.toFixed(1)
    }, { status: 200 });
  }
  
  lastRunTime = now;
  isProcessing = true;
  
  debugLog(`🕐 Cron job triggered - processing up to ${MAX_ORDERS_PER_RUN} pending orders...`);
  debugLog(`  Min interval: ${MIN_INTERVAL_MS/60000} minutes`);
  debugLog(`  Batch size: ${MAX_ORDERS_PER_RUN}`);
  
  // Process in background but track completion
  setImmediate(async () => {
    try {
      const startTime = Date.now();
      const result = await processAllCompletedOrders(undefined, MAX_ORDERS_PER_RUN);
      const duration = Date.now() - startTime;
      
      debugLog(`✅ Cron job completed in ${duration}ms:`, {
        totalOrders: result.totalOrders,
        processedOrders: result.processedOrders,
        alreadyProcessed: result.alreadyProcessed,
        failedOrders: result.failedOrders,
        batchSize: MAX_ORDERS_PER_RUN
      });
      
      // Log warning if there are still pending orders
      if (result.totalOrders === MAX_ORDERS_PER_RUN && result.processedOrders > 0) {
        debugLog(`⚠️ Batch limit reached (${MAX_ORDERS_PER_RUN}). More orders pending for next run.`);
      }
    } catch (error) {
      debugError("❌ Cron job processing failed:", error);
    } finally {
      isProcessing = false;
    }
  });
  
  return NextResponse.json({
    success: true,
    message: "Stock processing triggered",
    batchSize: MAX_ORDERS_PER_RUN,
    minIntervalMinutes: MIN_INTERVAL_MS / 60000,
    timestamp: new Date().toISOString()
  }, { status: 200 });
}

export async function POST(req: NextRequest) {
  try {
    // Verify admin access
    const { getCurrentUserData } = await import("../../utils/orderHelpers");
    const userData = await getCurrentUserData(req);
    
    if (!userData || userData.role !== "admin") {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 401 }
      );
    }
    
    debugLog(`👨‍💼 Manual stock processing triggered by admin: ${userData.name}`);
    
    // Manual trigger can process more orders (up to 50)
    const MANUAL_BATCH_SIZE = 50;
    debugLog(`  Manual batch size: ${MANUAL_BATCH_SIZE}`);
    
    const startTime = Date.now();
    const result = await processAllCompletedOrders(undefined, MANUAL_BATCH_SIZE);
    const duration = Date.now() - startTime;
    
    debugLog(`✅ Manual processing completed in ${duration}ms:`, {
      totalOrders: result.totalOrders,
      processedOrders: result.processedOrders,
      alreadyProcessed: result.alreadyProcessed,
      failedOrders: result.failedOrders
    });
    
    return NextResponse.json({
      success: true,
      message: "Manual stock processing completed",
      triggeredBy: userData.name,
      duration: `${duration}ms`,
      processedOrders: result.processedOrders,
      alreadyProcessed: result.alreadyProcessed,
      failedOrders: result.failedOrders,
      totalOrdersConsidered: result.totalOrders,
      timestamp: new Date().toISOString()
    }, { status: 200 });
    
  } catch (error) {
    debugError("Manual stock processing error:", error);
    return NextResponse.json(
      { 
        success: false,
        error: "Manual processing failed", 
        details: (error as Error).message 
      },
      { status: 500 }
    );
  }
}