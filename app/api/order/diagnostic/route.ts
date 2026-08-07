import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { debugLog, debugError } from "../../utils/orderHelpers";

export async function GET(req: NextRequest) {
  try {
    // 1. Check all orders with their status
    const allOrders = await prisma.order.findMany();
    
    const statusSummary = allOrders.reduce((acc, order) => {
      const status = order.status || 'unknown';
      acc[status] = (acc[status] || 0) + 1;
      acc.stockProcessed = (acc.stockProcessed || 0) + (order.stockProcessed ? 1 : 0);
      acc.completedBy = (acc.completedBy || 0) + (order.completedBy ? 1 : 0);
      return acc;
    }, {} as Record<string, number>);

    // 2. Check specifically for completed orders
    const completedOrders = await prisma.order.findMany({
      where: {
        status: { contains: 'completed', mode: 'insensitive' }
      }
    });
    
    const completedOrdersDetails = completedOrders.slice(0, 5).map(order => ({
      _id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      completedBy: order.completedBy,
      stockProcessed: order.stockProcessed,
      itemsCount: (order.items as any)?.length || 0
    }));

    // 3. Check unprocessed completed orders
    const queryResult = await prisma.order.findMany({
      where: {
        status: { contains: 'completed', mode: 'insensitive' },
        OR: [
          { stockProcessed: { not: true } },
          { stockProcessed: null }
        ]
      }
    });

    // 4. Check used_stock collection
    const usedStockCount = await prisma.usedStock.count();

    // 5. Check items with requiredStock (JSON array, filtered in JS)
    const allItems = await prisma.item.findMany();
    const itemsWithStock = allItems.filter(i =>
      Array.isArray((i.requiredStock as any)) && (i.requiredStock as any).length > 0
    );

    // 6. Check employee_rank collection
    const employeeRankCount = await prisma.employeeRank.count();
    
    const topEmployees = await prisma.employeeRank.findMany({
      orderBy: { points: 'desc' },
      take: 5
    });

    return NextResponse.json({
      success: true,
      diagnostic: {
        totalOrders: allOrders.length,
        statusSummary,
        completedOrdersCount: completedOrders.length,
        completedOrdersSample: completedOrdersDetails,
        unprocessedCompletedOrders: queryResult.length,
        usedStockCount,
        itemsWithRequiredStock: itemsWithStock.length,
        employeeRankCount,
        topEmployees: topEmployees.map(e => ({
          name: e.name,
          email: e.email,
          completedOrders: e.completedOrders || 0,
          totalOrders: e.totalOrders || 0,
          points: e.points || 0,
          employeeId: e.employeeId
        })),
        sampleItem: itemsWithStock.length > 0 ? {
          _id: itemsWithStock[0].id,
          name: itemsWithStock[0].name,
          requiredStockCount: (itemsWithStock[0].requiredStock as any)?.length || 0,
          requiredStockSample: (itemsWithStock[0].requiredStock as any)?.slice(0, 3) || []
        } : null
      }
    }, { status: 200 });

  } catch (error) {
    debugError("Diagnostic error:", error);
    return NextResponse.json({ 
      success: false,
      error: "Diagnostic failed", 
      details: (error as Error).message 
    }, { status: 500 });
  }
}
