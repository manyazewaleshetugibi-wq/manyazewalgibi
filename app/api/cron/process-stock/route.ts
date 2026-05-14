import { NextRequest, NextResponse } from "next/server";
import { processAllCompletedOrders } from "../../utils/stockHelpers";
import { debugLog, debugError } from "../../utils/orderHelpers";

// Track last run time to prevent too frequent executions
let lastRunTime = 0;
const MIN_INTERVAL_MS = 900000; 

export async function GET(req: NextRequest) {
  try {
    // Prevent too frequent runs
    const now = Date.now();
    if (now - lastRunTime < MIN_INTERVAL_MS) {
      debugLog(`Cron job skipped - last run was ${(now - lastRunTime) / 1000}s ago`);
      return NextResponse.json({
        success: true,
        message: "Skipped - too frequent",
        lastRun: new Date(lastRunTime).toISOString()
      }, { status: 200 });
    }
    
    lastRunTime = now;
    
    debugLog("🕐 Cron job triggered - processing pending orders...");
    
    // Process in background
    setImmediate(async () => {
      try {
        const startTime = Date.now();
        const result = await processAllCompletedOrders();
        const duration = Date.now() - startTime;
        
        debugLog(`✅ Cron job completed in ${duration}ms:`, {
          totalOrders: result.totalOrders,
          processedOrders: result.processedOrders,
          failedOrders: result.failedOrders
        });
      } catch (error) {
        debugError("❌ Cron job processing failed:", error);
      }
    });
    
    return NextResponse.json({
      success: true,
      message: "Stock processing triggered",
      timestamp: new Date().toISOString()
    }, { status: 200 });
    
  } catch (error) {
    debugError("Cron job error:", error);
    return NextResponse.json(
      { 
        success: false,
        error: "Cron job failed", 
        details: (error as Error).message 
      },
      { status: 500 }
    );
  }
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
    
    const result = await processAllCompletedOrders();
    
    return NextResponse.json({
      success: true,
      message: "Manual stock processing completed",
      triggeredBy: userData.name,
      ...result,
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