import { ObjectId } from "mongodb";
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

    // Create employee_rank collection if not exists
    try {
      const collections = await db.listCollections({ name: "employee_rank" }).toArray();
      if (collections.length === 0) {
        await db.createCollection("employee_rank");
      }
    } catch (collectionError) {
      debugError("Error checking/creating employee_rank collection:", collectionError);
    }

    const employeeId = userData.employeeId || `EMP-${Date.now().toString().slice(-6)}`;
    
    let pointsAwarded = 1;
    let incrementField = 'totalOrders';
    
    if (normalizedType === 'order_completed') {
      pointsAwarded = 10;
      incrementField = 'completedOrders';
      
      const totalItems = order.items?.reduce((acc: number, item: any) => acc + (Number(item.quantity) || 0), 0) || 0;
      if (totalItems > 5) {
        pointsAwarded = Math.min(pointsAwarded + Math.floor(totalItems / 5), 25);
      }
    } else if (normalizedType === 'order_created') {
      pointsAwarded = 2;
    }

    const activityRecord = {
      type: normalizedType,
      orderId: order._id,
      orderNumber: order.orderNumber || `ORD-${order._id.toString().slice(-6)}`,
      timestamp: new Date(),
      status: order.status || 'unknown',
      pointsAwarded: pointsAwarded,
      userId: userData.id,
      userName: userData.name || 'Unknown User'
    };

    const matchQuery: any = {};
    if (userData.email) matchQuery.email = userData.email;
    else if (userData.employeeId) matchQuery.employeeId = userData.employeeId;
    else if (userData.id) matchQuery.userId = userData.id;
    else return { success: false, message: "No user identifier found" };

    try {
      const existingEmployee = await db.collection("employee_rank").findOne(matchQuery);
      
      if (existingEmployee) {
        const updateResult = await db.collection("employee_rank").updateOne(
          { _id: existingEmployee._id },
          {
            $set: {
              name: userData.name || existingEmployee.name,
              email: userData.email || existingEmployee.email,
              role: userData.role || existingEmployee.role,
              employeeId: employeeId,
              lastActivity: new Date(),
              lastActivityType: normalizedType,
              lastOrderId: order._id,
              lastOrderNumber: order.orderNumber || `ORD-${order._id.toString().slice(-6)}`,
              updatedAt: new Date()
            },
            $inc: { 
              [incrementField]: 1,
              points: pointsAwarded,
              totalPoints: pointsAwarded
            },
            $push: {
              activityHistory: {
                $each: [activityRecord],
                $slice: -100
              }
            }
          }
        );

        return { 
          success: true, 
          message: "Updated existing employee activity",
          employeeId: employeeId,
          pointsAwarded: pointsAwarded,
          isNew: false
        };
      } else {
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

        await db.collection("employee_rank").insertOne(newEmployeeDoc);

        return { 
          success: true, 
          message: "Created new employee activity record",
          employeeId: employeeId,
          pointsAwarded: pointsAwarded,
          isNew: true
        };
      }
    } catch (dbError: any) {
      if (dbError.code === 11000) {
        const altEmployeeId = `EMP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
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

        await db.collection("employee_rank").insertOne(altEmployeeDoc);
        
        return { 
          success: true, 
          message: "Created employee with alternative ID",
          employeeId: altEmployeeId,
          pointsAwarded: pointsAwarded,
          isNew: true
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
    if (!order.waiterId || !ObjectId.isValid(order.waiterId)) {
      debugLog("No valid waiterId for waitress activity");
      return;
    }

    const collectionsToCheck = ["waiters", "waitresses"];
    let waiter = null;
    
    for (const collectionName of collectionsToCheck) {
      try {
        waiter = await db.collection(collectionName).findOne({ _id: new ObjectId(order.waiterId) });
        if (waiter) break;
      } catch (err) {
        continue;
      }
    }

    const waitressData = {
      id: waiter?._id?.toString() || order.waiterId,
      name: waiter?.name || "Unknown Waiter",
      email: waiter?.email || "",
      role: "waitress",
      employeeId: waiter?.employeeId || `W-${order.waiterId.toString().slice(-6)}`
    };

    return await registerOrderActivity(db, waitressData, order, activityType);
  } catch (error) {
    debugError("Error registering waitress activity:", error);
  }
}