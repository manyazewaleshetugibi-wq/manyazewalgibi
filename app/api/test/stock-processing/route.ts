// app/api/test/stock-processing/route.ts
import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function POST(req: NextRequest) {
  try {
    const dbClient = await clientPromise;
    const db = dbClient.db("gold");
    const body = await req.json();
    
    const { orderId } = body;
    
    if (!orderId || !ObjectId.isValid(orderId)) {
      return NextResponse.json(
        { success: false, error: "Valid order ID is required" },
        { status: 400 }
      );
    }

    console.log(`[TEST] Testing stock processing for order: ${orderId}`);

    // 1. Get the order
    const order = await db.collection("orders").findOne({ 
      _id: new ObjectId(orderId) 
    });

    if (!order) {
      return NextResponse.json(
        { success: false, error: "Order not found" },
        { status: 404 }
      );
    }

    console.log(`[TEST] Order found:`, {
      orderNumber: order.orderNumber,
      status: order.status,
      items: order.items?.length || 0
    });

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
    for (const item of order.items) {
      const itemData = await db.collection("items").findOne(
        { _id: new ObjectId(item.itemId) },
        { projection: { requiredStock: 1, name: 1 } }
      );

      if (!itemData) {
        results.push({
          itemId: item.itemId,
          success: false,
          error: "Item not found"
        });
        continue;
      }

      console.log(`[TEST] Item ${itemData.name} has ${itemData.requiredStock?.length || 0} required stocks`);

      // Check requiredStock
      if (!itemData.requiredStock || itemData.requiredStock.length === 0) {
        results.push({
          itemId: item.itemId,
          itemName: itemData.name,
          success: false,
          error: "No requiredStock defined"
        });
        continue;
      }

      // Get stock details
      const stockIds = itemData.requiredStock.map(rs => new ObjectId(rs.stockId));
      const stocks = await db.collection("stocks").find(
        { _id: { $in: stockIds } }
      ).toArray();

      results.push({
        itemId: item.itemId,
        itemName: itemData.name,
        success: true,
        requiredStockCount: itemData.requiredStock.length,
        requiredStock: itemData.requiredStock.map(rs => {
          const stock = stocks.find(s => s._id.toString() === rs.stockId);
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
        details: error.message 
      },
      { status: 500 }
    );
  }
}