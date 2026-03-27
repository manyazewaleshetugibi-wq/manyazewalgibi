// app/api/cron/process-stock/route.ts
import { NextRequest, NextResponse } from "next/server";
import { processAllCompletedOrders } from "../../utils/stockHelpers";
import { debugLog, debugError } from "../../utils/orderHelpers";

export async function GET(req: NextRequest) {
  try {
    // Verify cron job secret for security
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    
    // For development, you can skip auth if CRON_SECRET not set
    if (process.env.NODE_ENV === "production" && (!cronSecret || authHeader !== `Bearer ${cronSecret}`)) {
      debugLog("Unauthorized cron attempt", { authHeader });
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    
    debugLog("🕐 Cron job triggered - processing pending orders...");
    
    // Process in background to respond quickly
    // Use setImmediate to avoid blocking the response
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
        
        // Optional: Send notification if there were failures
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