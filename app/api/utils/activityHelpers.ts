import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { debugLog, debugError } from "./orderHelpers";

export async function registerOrderActivity(
  db: any, 
  userData: any, 
  order: any, 
  activityType: 'created' | 'updated' | 'completed' | 'cancelled' | string
) {
  try {
    debugLog("=== Starting registerOrderActivity ===", {
      userData: userData ? {
        id: userData.id,
        name: userData.name,
        email: userData.email,
        role: userData.role,
        employeeId: userData.employeeId
      } : null,
      orderId: order?._id,
      orderNumber: order?.orderNumber,
      activityType
    });

    if (!userData || !userData.id) {
      debugLog("No user data available for order activity registration");
      return { success: false, message: "No user data available" };
    }

    if (!order || !order._id) {
      debugLog("Invalid order data for activity registration");
      return { success: false, message: "Invalid order data" };
    }

    const activityTypes = {
      'created': 'order_created',
      'updated': 'order_updated', 
      'completed': 'order_completed',
      'cancelled': 'order_cancelled'
    };
    
    const normalizedType = activityTypes[activityType as keyof typeof activityTypes] || activityType;

    const employeeId = userData.employeeId || `EMP-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substr(2, 4)}`;
    
    let pointsAwarded = 1;
    let shouldIncrementCompleted = false;
    let shouldIncrementTotal = false;
    
    if (normalizedType === 'order_completed') {
      pointsAwarded = 10;
      shouldIncrementCompleted = true;
      shouldIncrementTotal = true;
      
      const totalItems = order.items?.reduce((acc: number, item: any) => acc + (Number(item.quantity) || 0), 0) || 0;
      if (totalItems > 5) {
        const bonus = Math.floor(totalItems / 5);
        pointsAwarded = Math.min(pointsAwarded + bonus, 25);
        debugLog(`🎯 Completion bonus: +${bonus} points for ${totalItems} items`);
      }
      debugLog(`🎯 Completion points awarded: ${pointsAwarded}`);
    } else if (normalizedType === 'order_created') {
      pointsAwarded = 2;
      shouldIncrementTotal = true;
      debugLog(`📝 Creation points: 2 points`);
    } else if (normalizedType === 'order_updated') {
      pointsAwarded = 1;
      debugLog(`🔄 Update points: 1 point`);
    }

    const activityRecord = {
      type: normalizedType,
      orderId: order._id,
      orderNumber: order.orderNumber || `ORD-${order._id.toString().slice(-6)}`,
      timestamp: new Date(),
      status: order.status || 'unknown',
      pointsAwarded: pointsAwarded,
      userId: userData.id,
      userName: userData.name || 'Unknown User',
      employeeId: employeeId,
      role: userData.role || 'employee'
    };

    const matchQuery: any = {};
    if (userData.email) matchQuery.email = userData.email;
    else if (userData.employeeId) matchQuery.employeeId = userData.employeeId;
    else if (userData.id) matchQuery.userId = userData.id;
    else return { success: false, message: "No user identifier found" };

    try {
      const existingEmployee = await prisma.employeeRank.findFirst({ where: matchQuery });
      
      if (existingEmployee) {
        debugLog(`Found existing employee: ${existingEmployee.name}`, {
          currentPoints: existingEmployee.points,
          currentCompletedOrders: existingEmployee.completedOrders || 0,
          currentTotalOrders: existingEmployee.totalOrders || 0,
          lastActivity: existingEmployee.lastActivityType
        });
        
        // Build update data (emulate $set, $inc, and $push with $slice -100)
        const newHistory = [...((existingEmployee.activityHistory as any[]) || []), activityRecord].slice(-100);
        
        const updateData: any = {
          name: userData.name || existingEmployee.name,
          email: userData.email || existingEmployee.email,
          role: userData.role || existingEmployee.role,
          employeeId: employeeId,
          lastActivity: new Date(),
          lastActivityType: normalizedType,
          lastOrderId: order._id,
          lastOrderNumber: order.orderNumber || `ORD-${order._id.toString().slice(-6)}`,
          updatedAt: new Date(),
          points: { increment: pointsAwarded },
          totalPoints: { increment: pointsAwarded },
          activityHistory: newHistory
        };
        
        // Increment the appropriate counters
        if (shouldIncrementCompleted) {
          updateData.completedOrders = { increment: 1 };
          debugLog(`📊 Incrementing completedOrders by 1`);
        }
        
        if (shouldIncrementTotal) {
          updateData.totalOrders = { increment: 1 };
          debugLog(`📊 Incrementing totalOrders by 1`);
        }
        
        const updateResult = await prisma.employeeRank.update(
          { where: { id: existingEmployee.id }, data: updateData }
        );

        debugLog(`✅ Employee updated: +${pointsAwarded} points, completed: ${shouldIncrementCompleted ? '+1' : '0'}, total: ${shouldIncrementTotal ? '+1' : '0'}`);

        return { 
          success: true, 
          message: `Updated existing employee - ${shouldIncrementCompleted ? 'completed order' : activityType} activity`,
          employeeId: employeeId,
          pointsAwarded: pointsAwarded,
          isNew: false,
          completedOrdersIncremented: shouldIncrementCompleted,
          totalOrdersIncremented: shouldIncrementTotal
        };
      } else {
        debugLog(`Creating new employee record for: ${userData.name || userData.email}`);
        
        const newEmployeeDoc = {
          userId: userData.id,
          name: userData.name || 'Unknown User',
          email: userData.email || 'unknown@example.com',
          role: userData.role || 'employee',
          employeeId: employeeId,
          points: pointsAwarded,
          totalPoints: pointsAwarded,
          completedOrders: normalizedType === 'order_completed' ? 1 : 0,
          totalOrders: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
          lastActivity: new Date(),
          lastActivityType: normalizedType,
          lastOrderId: order._id,
          lastOrderNumber: order.orderNumber || `ORD-${order._id.toString().slice(-6)}`,
          activityHistory: [activityRecord]
        };

        await prisma.employeeRank.create({ data: { id: randomUUID(), ...newEmployeeDoc } as any });

        debugLog(`✅ New employee created with ${pointsAwarded} points`);

        return { 
          success: true, 
          message: "Created new employee activity record",
          employeeId: employeeId,
          pointsAwarded: pointsAwarded,
          isNew: true,
          completedOrdersIncremented: normalizedType === 'order_completed',
          totalOrdersIncremented: true
        };
      }
    } catch (dbError: any) {
      debugError("Database error in registerOrderActivity:", dbError);
      
      if (dbError.code === 'P2002') {
        const altEmployeeId = `EMP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        debugLog(`Duplicate key error, using alternative ID: ${altEmployeeId}`);
        
        const altEmployeeDoc = {
          userId: userData.id,
          name: userData.name || 'Unknown User',
          email: userData.email || 'unknown@example.com',
          role: userData.role || 'employee',
          employeeId: altEmployeeId,
          points: pointsAwarded,
          totalPoints: pointsAwarded,
          completedOrders: normalizedType === 'order_completed' ? 1 : 0,
          totalOrders: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
          lastActivity: new Date(),
          lastActivityType: normalizedType,
          lastOrderId: order._id,
          lastOrderNumber: order.orderNumber || `ORD-${order._id.toString().slice(-6)}`,
          activityHistory: [activityRecord]
        };

        await prisma.employeeRank.create({ data: { id: randomUUID(), ...altEmployeeDoc } as any });
        
        return { 
          success: true, 
          message: "Created employee with alternative ID",
          employeeId: altEmployeeId,
          pointsAwarded: pointsAwarded,
          isNew: true,
          completedOrdersIncremented: normalizedType === 'order_completed',
          totalOrdersIncremented: true
        };
      }
      throw dbError;
    }
    
  } catch (error) {
    debugError("Failed to register order activity:", error);
    return { 
      success: false, 
      message: "Failed to register order activity",
      error: (error as any).message 
    };
  }
}

export async function registerWaitressActivity(db: any, order: any, activityType: string = 'completed') {
  try {
    if (!order.waiterId) {
      debugLog("No waiterId for waitress activity");
      return { success: false, message: "No waiterId" };
    }

    let waiter: any = null;
    
    try {
      waiter = await prisma.waitress.findFirst({ where: { id: order.waiterId } });
      if (waiter) {
        debugLog(`Found waiter in waitresses:`, { name: waiter.name, email: waiter.email });
      }
    } catch (err) {
      debugError(`Error checking waitresses:`, err);
    }

    if (!waiter) {
      try {
        waiter = await prisma.waiter.findFirst({ where: { id: order.waiterId } });
        if (waiter) {
          debugLog(`Found waiter in waiters:`, { name: waiter.name, email: waiter.email });
        }
      } catch (err) {
        debugError(`Error checking waiters:`, err);
      }
    }

    const waitressData = {
      id: waiter?.id?.toString() || order.waiterId,
      name: waiter?.name || "Unknown Waiter",
      email: waiter?.email || "",
      role: "waitress",
      employeeId: waiter?.employeeId || `W-${order.waiterId.toString().slice(-6)}`
    };

    debugLog(`Registering waitress activity for order ${order.orderNumber}`, { waitressData });
    
    return await registerOrderActivity(db, waitressData, order, activityType);
  } catch (error) {
    debugError("Error registering waitress activity:", error);
    return { success: false, message: (error as Error).message };
  }
}
