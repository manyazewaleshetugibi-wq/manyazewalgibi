// app/api/cron/process-stock/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { processAllCompletedOrders, processOrderStockUsage } from "../../utils/stockHelpers";
import { debugLog, debugError } from "../../utils/orderHelpers";
import { auth } from "@/auth";

// Simple rate limiting - only prevent too frequent runs
let lastRunTime = 0;
const MIN_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes between runs
const MAX_ORDERS_PER_RUN = 50; // Process 50 orders per run

const ALLOWED_ROLES = ["admin", "manager"];

// GET is the scheduled cron trigger. Verify either the CRON_SECRET bearer
// token (Vercel cron) or an authenticated admin/manager session.
function verifyCronAuth(req: NextRequest): boolean {
  const authHeader = req.headers.get("authorization") || "";
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) return true;
  return false;
}

export async function GET(req: NextRequest) {
  if (!verifyCronAuth(req)) {
    const session = await auth();
    const role = String((session?.user as any)?.role || "").toLowerCase();
    if (!ALLOWED_ROLES.includes(role)) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }
  }

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
    const session = await auth();
    const role = String((session?.user as any)?.role || "").toLowerCase();
    if (!ALLOWED_ROLES.includes(role)) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { orderId, retryFailed } = body;

    // Per-order processing (used by the "Retry stock" button)
    if (orderId) {
      const order = await prisma.order.findUnique({ where: { id: orderId } });

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
      const failedOrders = await (prisma.order as any).findMany({
        where: {
          OR: [
            { status: { equals: 'completed', mode: 'insensitive' } },
            { status: { equals: 'delivered', mode: 'insensitive' } }
          ],
          AND: [
            { OR: [{ stockProcessed: { not: true } }, { stockProcessed: null }] },
            { stockProcessingError: { not: "" } },
          ]
        },
        take: 50,
      });

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
          await (prisma.order as any).updateMany({ where: { id: order.id }, data: { stockProcessingError: error?.message || String(error), stockProcessingFailedAt: new Date() } });
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
    const result = await processAllCompletedOrders(undefined, 50);
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
