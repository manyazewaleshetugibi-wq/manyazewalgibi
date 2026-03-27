import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { debugLog, debugError } from "../../utils/orderHelpers";
import { registerOrderActivity } from "../../utils/activityHelpers";

export async function GET(req: NextRequest) {
  try {
    const dbClient = await clientPromise;
    const db = dbClient.db("gold");
    
    const url = new URL(req.url);
    const fix = url.searchParams.get("fix") === "true";
    
    const completedOrders = await db.collection("orders").find({
      completedBy: { $exists: true }
    }).toArray();
    
    debugLog(`Found ${completedOrders.length} orders with completedBy field`);
    
    const results = [];
    let fixedCount = 0;
    
    if (fix) {
      for (const order of completedOrders) {
        if (order.completedBy && order.completedBy.userId) {
          try {
            const existingEmployee = await db.collection("employee_rank").findOne({
              $or: [
                { userId: order.completedBy.userId },
                { email: order.completedBy.email }
              ]
            });
            
            if (!existingEmployee) {
              const userData = {
                id: order.completedBy.userId,
                name: order.completedBy.name || "Unknown Employee",
                email: order.completedBy.email || "unknown@example.com",
                role: order.completedBy.role || "employee",
                employeeId: order.completedBy.employeeId || `EMP-${Date.now().toString().slice(-6)}`
              };
              
              const fixResult = await registerOrderActivity(db, userData, order, 'completed');
              
              results.push({
                orderId: order._id,
                orderNumber: order.orderNumber,
                userId: order.completedBy.userId,
                userName: order.completedBy.name,
                fixResult: fixResult.success ? "Fixed" : "Failed"
              });
              
              if (fixResult.success) fixedCount++;
            }
          } catch (error) {
            debugError(`Error fixing order ${order._id}:`, error);
            results.push({ orderId: order._id, error: (error as Error).message });
          }
        }
      }
    }
    
    const employeeStats = await db.collection("employee_rank").aggregate([
      {
        $group: {
          _id: null,
          totalEmployees: { $sum: 1 },
          totalCompletedOrders: { $sum: "$completedOrders" },
          totalPoints: { $sum: "$points" },
          avgPoints: { $avg: "$points" }
        }
      }
    ]).toArray();
    
    const allEmployees = await db.collection("employee_rank")
      .find({})
      .sort({ points: -1 })
      .limit(10)
      .toArray();
    
    return NextResponse.json({
      success: true,
      diagnostic: {
        ordersWithCompletedBy: completedOrders.length,
        employeeStats: employeeStats[0] || {},
        topEmployees: allEmployees,
        fixResults: results,
        fixedCount: fixedCount
      }
    }, { status: 200 });
    
  } catch (error) {
    debugError("Error in employee rank debug endpoint:", error);
    return NextResponse.json({
      success: false,
      error: (error as Error).message
    }, { status: 500 });
  }
}