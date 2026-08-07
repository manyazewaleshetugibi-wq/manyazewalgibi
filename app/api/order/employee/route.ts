import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { debugLog, debugError } from "../../utils/orderHelpers";
import { registerOrderActivity } from "../../utils/activityHelpers";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const fix = url.searchParams.get("fix") === "true";
    
    const completedOrders = await prisma.order.findMany({
      where: { completedBy: { not: Prisma.DbNull } }
    });
    
    debugLog(`Found ${completedOrders.length} orders with completedBy field`);
    
    const results = [];
    let fixedCount = 0;
    
    if (fix) {
      for (const order of completedOrders) {
        const completedBy = (order.completedBy as any) || {};
        if (completedBy.userId) {
          try {
            const existingEmployee = await prisma.employeeRank.findFirst({
              where: {
                OR: [
                  { userId: completedBy.userId },
                  { email: completedBy.email }
                ]
              }
            });
            
            if (!existingEmployee) {
              const userData = {
                id: completedBy.userId,
                name: completedBy.name || "Unknown Employee",
                email: completedBy.email || "unknown@example.com",
                role: completedBy.role || "employee",
                employeeId: completedBy.employeeId || `EMP-${Date.now().toString().slice(-6)}`
              };
              
              const fixResult = await registerOrderActivity(prisma, userData, order, 'completed');
              
              results.push({
                orderId: order.id,
                orderNumber: order.orderNumber,
                userId: completedBy.userId,
                userName: completedBy.name,
                fixResult: fixResult.success ? "Fixed" : "Failed"
              });
              
              if (fixResult.success) fixedCount++;
            }
          } catch (error) {
            debugError(`Error fixing order ${order.id}:`, error);
            results.push({ orderId: order.id, error: (error as Error).message });
          }
        }
      }
    }
    
    const allEmployees = await prisma.employeeRank.findMany({});
    
    const employeeStats = {
      totalEmployees: allEmployees.length,
      totalCompletedOrders: allEmployees.reduce((sum, e) => sum + (e.completedOrders || 0), 0),
      totalPoints: allEmployees.reduce((sum, e) => sum + (e.points || 0), 0),
      avgPoints: allEmployees.length > 0
        ? allEmployees.reduce((sum, e) => sum + (e.points || 0), 0) / allEmployees.length
        : 0
    };
    
    const topEmployees = await prisma.employeeRank.findMany({
      orderBy: { points: 'desc' },
      take: 10
    });
    
    return NextResponse.json({
      success: true,
      diagnostic: {
        ordersWithCompletedBy: completedOrders.length,
        employeeStats,
        topEmployees: topEmployees.map(e => ({ ...e, _id: e.id })),
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
