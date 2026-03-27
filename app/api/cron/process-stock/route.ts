// app/api/cron/process-stock/route.ts
import { NextRequest, NextResponse } from "next/server";
import { processAllCompletedOrders } from "../../utils/stockHelpers";
import { debugLog, debugError } from "../../utils/orderHelpers";

export async function GET(req: NextRequest) {
  try {
    debugLog("🕐 Cron job triggered - processing pending orders...");
    
    // Process in background to respond quickly
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
        
        // Optional: Log if there were failures
        if (result.failedOrders > 0) {
          debugLog(`⚠️ ${result.failedOrders} orders failed to process`);
        }
      } catch (error) {
        debugError("❌ Cron job processing failed:", error);
      }
    });
    
    // Return immediately
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

// POST endpoint for manual trigger (admin only)
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
    
    // Process immediately (not background for manual trigger)
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