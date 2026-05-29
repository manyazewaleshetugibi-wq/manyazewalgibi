// app/api/cron/process-stock/route.ts
import { NextRequest, NextResponse } from "next/server";
import { processAllCompletedOrders } from "../../utils/stockHelpers";
import { debugLog, debugError } from "../../utils/orderHelpers";

// Simple rate limiting - only prevent too frequent runs
let lastRunTime = 0;
const MIN_INTERVAL_MS = 2 * 60 * 1000; // 5 minutes between runs
const MAX_ORDERS_PER_RUN = 500; // Process 5 orders per run

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
  
  debugLog(`🕐 Cron started - processing ${MAX_ORDERS_PER_RUN} orders...`);
  
  try {
    const startTime = Date.now();
    const result = await processAllCompletedOrders(undefined, MAX_ORDERS_PER_RUN);
    const duration = Date.now() - startTime;
    
    debugLog(`✅ Cron completed in ${duration}ms:`, {
      processed: result.processedOrders,
      failed: result.failedOrders,
      pending: result.totalOrders
    });
    
    return NextResponse.json({
      success: true,
      duration: `${duration}ms`,
      processedOrders: result.processedOrders,
      failedOrders: result.failedOrders,
      pendingOrders: result.totalOrders - result.processedOrders
    });
    
  } catch (error) {
    debugError("❌ Cron failed:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { getCurrentUserData } = await import("../../utils/orderHelpers");
    const userData = await getCurrentUserData(req);
    
    if (!userData || userData.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    debugLog(`👨‍💼 Manual trigger by admin: ${userData.name}`);
    
    const startTime = Date.now();
    const result = await processAllCompletedOrders(undefined, 100);
    const duration = Date.now() - startTime;
    
    return NextResponse.json({
      success: true,
      duration: `${duration}ms`,
      processedOrders: result.processedOrders,
      failedOrders: result.failedOrders,
      pendingOrders: result.totalOrders - result.processedOrders
    });
    
  } catch (error) {
    debugError("Manual processing error:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
