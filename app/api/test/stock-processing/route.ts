// app/api/test/stock-processing/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-auth";

export async function POST(req: NextRequest) {
  try {
    const { response } = await requireAdmin();
    if (response) return response;

    const body = await req.json();
    
    const { orderId } = body;
    
    if (!orderId) {
      return NextResponse.json(
        { success: false, error: "Valid order ID is required" },
        { status: 400 }
      );
    }



    // 1. Get the order
    const order = await prisma.order.findUnique({ 
      where: { id: orderId } 
    });

    if (!order) {
      return NextResponse.json(
        { success: false, error: "Order not found" },
        { status: 404 }
      );
    }



    // 2. Check if order is completed
    const isCompleted = order.status?.toLowerCase() === "completed";
    if (!isCompleted) {
      return NextResponse.json({
        success: false,
        error: `Order is not completed. Status: ${order.status}`,
        orderStatus: order.status
      }, { status: 400 });
    }

    // 3. Process each item
    const results = [];
    for (const item of (order.items as any) || []) {
      const itemData = await prisma.item.findUnique(
        { where: { id: item.itemId }, select: { requiredStock: true, name: true } }
      );

      if (!itemData) {
        results.push({
          itemId: item.itemId,
          success: false,
          error: "Item not found"
        });
        continue;
      }



      // Check requiredStock
      if (!itemData.requiredStock || (itemData.requiredStock as any).length === 0) {
        results.push({
          itemId: item.itemId,
          itemName: itemData.name,
          success: false,
          error: "No requiredStock defined"
        });
        continue;
      }

      // Get stock details
      const stockIds = (itemData.requiredStock as any).map((rs: any) => rs.stockId);
      const stocks = await prisma.stock.findMany(
        { where: { id: { in: stockIds } } }
      );

      results.push({
        itemId: item.itemId,
        itemName: itemData.name,
        success: true,
        requiredStockCount: (itemData.requiredStock as any).length,
        requiredStock: (itemData.requiredStock as any).map((rs: any) => {
          const stock = stocks.find(s => s.id === rs.stockId);
          return {
            stockId: rs.stockId,
            quantity: rs.quantity,
            stockName: stock?.name || "Unknown",
            currentStock: stock?.currentStock || 0
          };
        })
      });
    }

    return NextResponse.json({
      success: true,
      message: "Test completed",
      orderId,
      orderStatus: order.status,
      itemsProcessed: results.length,
      results
    }, { status: 200 });

  } catch (error) {
    console.error("[ERROR] Test error:", error);
    return NextResponse.json(
      { 
        success: false,
        error: "Test failed", 
        details: (error as any).message 
      },
      { status: 500 }
    );
  }
}
