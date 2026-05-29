import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { debugLog, debugError } from "../../utils/orderHelpers";

export async function GET(req: NextRequest) {
  try {
    const dbClient = await clientPromise;
    const db = dbClient.db("gold");

    // 1. Check all orders with their status
    const allOrders = await db.collection("orders").find({}).toArray();
    
    const statusSummary = allOrders.reduce((acc, order) => {
      const status = order.status || 'unknown';
      acc[status] = (acc[status] || 0) + 1;
      acc.stockProcessed = (acc.stockProcessed || 0) + (order.stockProcessed ? 1 : 0);
      acc.completedBy = (acc.completedBy || 0) + (order.completedBy ? 1 : 0);
      return acc;
    }, {} as Record<string, number>);

    // 2. Check specifically for completed orders
    const completedOrders = await db.collection("orders").find({
      status: { $regex: /^completed$/i }
    }).toArray();
    
    const completedOrdersDetails = completedOrders.slice(0, 5).map(order => ({
      _id: order._id,
      orderNumber: order.orderNumber,
      status: order.status,
      completedBy: order.completedBy,
      stockProcessed: order.stockProcessed,
      itemsCount: order.items?.length || 0
    }));

    // 3. Check unprocessed completed orders
    const queryResult = await db.collection("orders").find({
      status: { $regex: /^completed$/i },
      stockProcessed: { $ne: true }
    }).toArray();

    // 4. Check used_stock collection
    const usedStockCount = await db.collection("used_stock").countDocuments();

    // 5. Check items with requiredStock
    const itemsWithStock = await db.collection("items").find({
      "requiredStock.0": { $exists: true }
    }).toArray();

    // 6. Check employee_rank collection
    const employeeRankCount = await db.collection("employee_rank").countDocuments();
    
    const topEmployees = await db.collection("employee_rank")
      .find({})
      .sort({ points: -1 })
      .limit(5)
      .toArray();

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
          _id: itemsWithStock[0]._id,
          name: itemsWithStock[0].name,
          requiredStockCount: itemsWithStock[0].requiredStock?.length || 0,
          requiredStockSample: itemsWithStock[0].requiredStock?.slice(0, 3) || []
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
