import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { TableOrderSchema } from "@/models/Orders";
import { getToken } from "next-auth/jwt";

// Debug flag
const DEBUG = true;
const BATCH_SIZE = 10; // Process 10 orders at a time (for manual batch only)
const PROCESSING_DELAY = 100; // 100ms delay between batches

function debugLog(message: string, data?: any) {
  if (DEBUG) {
    console.log(`[DEBUG] ${message}`, data ? data : '');
  }
}

function debugError(message: string, error: any) {
  console.error(`[ERROR] ${message}`, error);
}

// Helper function to check if order is completed (case-insensitive)
function isOrderCompleted(order: any): boolean {
  if (!order || !order.status) return false;
  const status = String(order.status).toLowerCase();
  return status === "completed";
}

// Helper function to normalize status to lowercase
function normalizeStatus(status: string): string {
  return status?.toLowerCase() || "pending";
}

// Helper function to get current user from JWT token
async function getCurrentUserData(req: NextRequest) {
  try {
    const token = await getToken({ 
      req, 
      secret: process.env.NEXTAUTH_SECRET 
    });
    
    if (!token) {
      debugLog("No authentication token found");
      return null;
    }
    
    debugLog("Token data received:", {
      id: token.sub || token.id,
      name: token.name,
      email: token.email,
      role: token.role,
      employeeId: token.employeeId,
      hasSub: !!token.sub,
      hasId: !!token.id,
      allTokenFields: Object.keys(token)
    });
    
    return {
      ...token,
      id: token.sub || token.id || "unknown",
      name: token.name || "Unknown User",
      email: token.email || "unknown@example.com",
      role: token.role || "employee",
      employeeId: token.employeeId || null
    };
  } catch (error) {
    debugError("Error getting user data from token:", error);
    return null;
  }
}

// Cache for employee data to reduce database queries
const employeeCache = new Map();
let lastEmployeeCacheUpdate = 0;
const EMPLOYEE_CACHE_TTL = 60000; // 1 minute

async function getEmployeeWithCache(db: any, email: string) {
  const now = Date.now();
  
  // Refresh cache every minute
  if (now - lastEmployeeCacheUpdate > EMPLOYEE_CACHE_TTL) {
    const allEmployees = await db.collection("employee_rank")
      .find({}, { projection: { email: 1, employeeId: 1, name: 1, points: 1, completedOrders: 1 } })
      .toArray();
    
    employeeCache.clear();
    allEmployees.forEach(emp => {
      if (emp.email) employeeCache.set(emp.email, emp);
      if (emp.employeeId) employeeCache.set(emp.employeeId, emp);
    });
    lastEmployeeCacheUpdate = now;
  }
  
  return employeeCache.get(email);
}

// Helper function to register any order activity
async function registerOrderActivity(
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
      debugLog("No user data available for order activity registration", { 
        userData,
        hasUserData: !!userData,
        hasUserId: userData?.id 
      });
      return { success: false, message: "No user data available" };
    }

    if (!order || !order._id) {
      debugLog("Invalid order data for activity registration", { order });
      return { success: false, message: "Invalid order data" };
    }

    const activityTypes = {
      'created': 'order_created',
      'updated': 'order_updated', 
      'completed': 'order_completed',
      'cancelled': 'order_cancelled'
    };
    
    const normalizedType = activityTypes[activityType as keyof typeof activityTypes] || activityType;
    
    debugLog("Registering order activity:", {
      userId: userData.id,
      userName: userData.name,
      orderId: order._id,
      orderNumber: order.orderNumber || 'No order number',
      activityType: normalizedType,
      status: order.status
    });

    try {
      const collections = await db.listCollections({ name: "employee_rank" }).toArray();
      
      if (collections.length === 0) {
        debugLog("Creating employee_rank collection...");
        await db.createCollection("employee_rank");
        debugLog("employee_rank collection created");
      }
    } catch (collectionError) {
      debugError("Error checking/creating employee_rank collection:", collectionError);
    }

    let userId = userData.id;
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
    
    if (userData.email) {
      matchQuery.email = userData.email;
    } else if (userData.employeeId) {
      matchQuery.employeeId = userData.employeeId;
    } else if (userData.id) {
      matchQuery.userId = userData.id;
    } else {
      debugLog("No matching criteria found for user");
      return { success: false, message: "No user identifier found" };
    }

    debugLog("Match query for employee rank:", matchQuery);

    try {
      const existingEmployee = await db.collection("employee_rank").findOne(matchQuery);
      
      if (existingEmployee) {
        debugLog("Found existing employee:", {
          employeeId: existingEmployee.employeeId,
          name: existingEmployee.name,
          currentPoints: existingEmployee.points,
          currentCompletedOrders: existingEmployee.completedOrders
        });

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

        debugLog("Updated existing employee:", {
          matchedCount: updateResult.matchedCount,
          modifiedCount: updateResult.modifiedCount
        });

        return { 
          success: true, 
          message: "Updated existing employee activity",
          employeeId: employeeId,
          pointsAwarded: pointsAwarded,
          isNew: false
        };
      } else {
        debugLog("No existing employee found, creating new one");

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

        const insertResult = await db.collection("employee_rank").insertOne(newEmployeeDoc);

        debugLog("Created new employee record:", {
          insertedId: insertResult.insertedId
        });

        return { 
          success: true, 
          message: "Created new employee activity record",
          employeeId: employeeId,
          pointsAwarded: pointsAwarded,
          isNew: true
        };
      }
    } catch (dbError: any) {
      debugError("Database error in registerOrderActivity:", dbError);
      
      if (dbError.code === 11000) {
        debugLog("Duplicate key error, trying alternative approach");
        
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

        try {
          const altInsertResult = await db.collection("employee_rank").insertOne(altEmployeeDoc);
          
          debugLog("Created employee with alternative ID:", {
            insertedId: altInsertResult.insertedId,
            employeeId: altEmployeeId
          });

          return { 
            success: true, 
            message: "Created employee with alternative ID",
            employeeId: altEmployeeId,
            pointsAwarded: pointsAwarded,
            isNew: true
          };
        } catch (altError) {
          debugError("Alternative insert also failed:", altError);
          throw altError;
        }
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

// Helper function to register waitress activity
async function registerWaitressActivity(db: any, order: any, activityType: string = 'completed') {
  try {
    if (!order.waiterId || !ObjectId.isValid(order.waiterId)) {
      debugLog("No valid waiterId for waitress activity");
      return;
    }

    debugLog("Registering waitress activity for order:", {
      orderId: order._id,
      waiterId: order.waiterId,
      activityType
    });

    const collectionsToCheck = ["waiters", "waitresses"];
    let waiter = null;
    
    for (const collectionName of collectionsToCheck) {
      try {
        waiter = await db.collection(collectionName).findOne({ _id: new ObjectId(order.waiterId) });
        if (waiter) {
          debugLog(`Found waiter in ${collectionName}:`, { 
            name: waiter.name,
            email: waiter.email 
          });
          break;
        }
      } catch (err) {
        debugError(`Error checking ${collectionName}:`, err);
        continue;
      }
    }

    if (!waiter) {
      debugLog(`Waitress/waiter not found for order ${order._id} with ID ${order.waiterId}`);
      
      const waitressData = {
        id: order.waiterId,
        name: "Unknown Waiter",
        email: "",
        role: "waitress",
        employeeId: `W-${order.waiterId.toString().slice(-6)}`
      };

      const result = await registerOrderActivity(db, waitressData, order, activityType);
      debugLog("Registered activity for unknown waiter:", result);
      return;
    }

    const waitressData = {
      id: waiter._id.toString(),
      name: waiter.name || "Unknown Waiter",
      email: waiter.email || "",
      role: "waitress",
      employeeId: waiter.employeeId || `W-${waiter._id.toString().slice(-6)}`
    };

    const result = await registerOrderActivity(db, waitressData, order, activityType);
    debugLog("Waitress activity registration result:", result);
  } catch (error) {
    debugError("Error registering waitress activity:", error);
  }
}

// Optimized stock processing - Now only processes a single order (no batch)
export async function processOrderStockUsage(order: any) {
  try {
    const dbClient = await clientPromise;
    const db = dbClient.db("gold");

    debugLog(`Starting stock processing for order:`, {
      orderId: order._id,
      orderNumber: order.orderNumber,
      status: order.status,
      normalizedStatus: normalizeStatus(order.status),
      stockProcessed: order.stockProcessed,
      itemsCount: order.items?.length || 0
    });

    // CRITICAL: Skip if already processed
    if (order.stockProcessed) {
      debugLog(`Stock already processed for order: ${order._id}`);
      return { 
        success: true, 
        message: "Stock already processed", 
        alreadyProcessed: true 
      };
    }

    // Only process COMPLETED orders
    if (!isOrderCompleted(order)) {
      debugLog(`Order ${order._id} is not completed. Status: ${order.status}`);
      return { 
        success: false, 
        message: `Order is not completed. Status: ${order.status}`,
        canProcess: false 
      };
    }

    if (!order.items || !Array.isArray(order.items) || order.items.length === 0) {
      debugLog(`Order ${order._id} has no items to process`);
      await db.collection("orders").updateOne(
        { _id: order._id },
        {
          $set: {
            stockProcessed: true,
            stockProcessedAt: new Date(),
            stockProcessingNote: "No items to process"
          },
        }
      );
      return { 
        success: true, 
        message: "Order has no items to process",
        itemsProcessed: 0,
        recordsProcessed: 0 
      };
    }

    debugLog(`Processing stock usage for order: ${order._id}`, {
      itemsCount: order.items.length
    });
    
    // Aggregate items
    const aggregatedItems = new Map<string, { quantity: number; itemName: string }>();
    for (const item of order.items) {
      if (!item.itemId) continue;
      
      const existing = aggregatedItems.get(item.itemId);
      if (existing) {
        existing.quantity += (Number(item.quantity) || 0);
      } else {
        aggregatedItems.set(item.itemId, {
          quantity: Number(item.quantity) || 0,
          itemName: item.itemName || "Unknown Item",
        });
      }
    }

    debugLog(`Aggregated ${order.items.length} items into ${aggregatedItems.size} unique items.`);

    if (aggregatedItems.size === 0) {
      await db.collection("orders").updateOne(
        { _id: order._id },
        {
          $set: {
            stockProcessed: true,
            stockProcessedAt: new Date(),
            stockProcessingNote: "No valid items to process"
          },
        }
      );
      return { 
        success: true, 
        message: "No valid items to process",
        itemsProcessed: 0,
        recordsProcessed: 0 
      };
    }

    // Get all items in one query
    const itemIds = Array.from(aggregatedItems.keys()).filter(id => ObjectId.isValid(id)).map(id => new ObjectId(id));
    
    if (itemIds.length === 0) {
      await db.collection("orders").updateOne(
        { _id: order._id },
        {
          $set: {
            stockProcessed: true,
            stockProcessedAt: new Date(),
            stockProcessingNote: "No valid item IDs"
          },
        }
      );
      return { success: true, message: "No valid item IDs" };
    }
    
    const itemsData = await db.collection("items")
      .find({ _id: { $in: itemIds } })
      .toArray();
    
    const itemsMap = new Map();
    itemsData.forEach(item => {
      itemsMap.set(item._id.toString(), item);
    });

    // Collect all required ingredients
    const allIngredients = new Map<string, { 
      stockName: string; 
      stockCategory: string; 
      stockUnit: string; 
      unitCost: number; 
      totalQuantityUsed: number; 
      items: { itemId: ObjectId; itemName: string; quantityUsed: number; }[];
    }>();

    let itemsWithIngredients = 0;
    const stockIdsNeeded = new Set<string>();
    
    for (const [itemIdString, aggregatedItem] of aggregatedItems.entries()) {
      const itemData = itemsMap.get(itemIdString);
      
      if (!itemData) {
        debugError(`Item not found: ${itemIdString}`, null);
        continue;
      }

      if (!itemData.requiredStock || !Array.isArray(itemData.requiredStock) || itemData.requiredStock.length === 0) {
        debugLog(`Item ${itemIdString} has no requiredStock`);
        continue;
      }

      itemsWithIngredients++;

      for (const ingredient of itemData.requiredStock) {
        if (!ingredient.stockId || !ObjectId.isValid(ingredient.stockId)) {
          debugError(`Invalid stockId in ingredient:`, ingredient);
          continue;
        }

        const stockIdString = ingredient.stockId;
        const quantityPerUnit = Number(ingredient.quantity) || 0;

        if (quantityPerUnit <= 0) continue;

        stockIdsNeeded.add(stockIdString);
        const totalQuantityNeeded = quantityPerUnit * aggregatedItem.quantity;

        const existingIngredient = allIngredients.get(stockIdString);
        if (existingIngredient) {
          existingIngredient.totalQuantityUsed += totalQuantityNeeded;
          existingIngredient.items.push({
            itemId: new ObjectId(itemIdString),
            itemName: aggregatedItem.itemName,
            quantityUsed: totalQuantityNeeded,
          });
        } else {
          allIngredients.set(stockIdString, {
            stockName: ingredient.stockName || "Unknown Stock",
            stockCategory: ingredient.stockCategory || "General",
            stockUnit: ingredient.stockUnit || "pcs",
            unitCost: Number(ingredient.unitCost) || 0,
            totalQuantityUsed: totalQuantityNeeded,
            items: [{
              itemId: new ObjectId(itemIdString),
              itemName: aggregatedItem.itemName,
              quantityUsed: totalQuantityNeeded,
            }],
          });
        }
      }
    }

    debugLog(`Collected ${allIngredients.size} unique ingredients from ${itemsWithIngredients} items with ingredients.`);

    if (allIngredients.size === 0) {
      debugLog(`No ingredients found for order ${order._id}`);
      
      await db.collection("orders").updateOne(
        { _id: order._id },
        {
          $set: {
            stockProcessed: true,
            stockProcessedAt: new Date(),
            updatedAt: new Date(),
            stockProcessingNote: "No ingredients defined for items"
          },
        }
      );
      
      return { 
        success: true, 
        message: "No ingredients defined for order items",
        itemsProcessed: aggregatedItems.size,
        recordsProcessed: 0,
        noIngredients: true
      };
    }

    // Get all required stock items in ONE query
    const stockIdsArray = Array.from(allIngredients.keys()).map(id => new ObjectId(id));
    const stockItems = await db.collection("stocks")
      .find({ _id: { $in: stockIdsArray } })
      .toArray();
    
    const stockMap = new Map();
    stockItems.forEach(stock => {
      stockMap.set(stock._id.toString(), stock);
    });

    // Verify all stock is available
    const insufficientStock = [];
    for (const [stockIdString, ingredientData] of allIngredients.entries()) {
      const stockItem = stockMap.get(stockIdString);
      const currentStock = stockItem ? (Number(stockItem.currentStock) || 0) : 0;
      
      if (!stockItem || currentStock < ingredientData.totalQuantityUsed) {
        insufficientStock.push({
          stockName: ingredientData.stockName,
          available: currentStock,
          required: ingredientData.totalQuantityUsed,
          stockId: stockIdString
        });
      }
    }
    
    if (insufficientStock.length > 0) {
      debugError(`Insufficient stock detected:`, insufficientStock);
      return { 
        success: false, 
        message: `Insufficient stock for ${insufficientStock[0].stockName}`,
        insufficientStock
      };
    }

    // Bulk update all stock in one operation
    const stockBulkOps = [];
    for (const [stockIdString, ingredientData] of allIngredients.entries()) {
      stockBulkOps.push({
        updateOne: {
          filter: { _id: new ObjectId(stockIdString), currentStock: { $gte: ingredientData.totalQuantityUsed } },
          update: { 
            $inc: { currentStock: -ingredientData.totalQuantityUsed, stockUsed: ingredientData.totalQuantityUsed },
            $set: { lastUsed: new Date(), lastUsedInOrder: order.orderNumber }
          }
        }
      });
    }
    
    if (stockBulkOps.length > 0) {
      const bulkResult = await db.collection("stocks").bulkWrite(stockBulkOps);
      debugLog(`Stock bulk update result:`, { matchedCount: bulkResult.matchedCount, modifiedCount: bulkResult.modifiedCount });
      
      if (bulkResult.modifiedCount !== stockBulkOps.length) {
        debugError(`Some stock updates failed`, { expected: stockBulkOps.length, actual: bulkResult.modifiedCount });
        return { success: false, message: "Stock update conflict detected" };
      }
    }

    // Create usage records in bulk
    const stockUsageRecords = [];
    for (const [stockIdString, ingredientData] of allIngredients.entries()) {
      const stockUsageRecord = {
        orderId: order._id,
        orderNumber: order.orderNumber || `ORD-${order._id.toString().slice(-6)}`,
        stockId: new ObjectId(stockIdString),
        stockName: ingredientData.stockName,
        stockCategory: ingredientData.stockCategory,
        stockUnit: ingredientData.stockUnit,
        unitCost: ingredientData.unitCost,
        totalQuantityUsed: ingredientData.totalQuantityUsed,
        totalCost: ingredientData.unitCost * ingredientData.totalQuantityUsed,
        items: ingredientData.items,
        usedAt: new Date(),
        processedAt: new Date(),
        notes: `Used in ${ingredientData.items.length} item type(s) for order ${order.orderNumber}`,
      };
      stockUsageRecords.push(stockUsageRecord);
    }
    
    if (stockUsageRecords.length > 0) {
      await db.collection("used_stock").insertMany(stockUsageRecords);
    }

    // Mark order as processed
    await db.collection("orders").updateOne(
      { _id: order._id },
      {
        $set: {
          stockProcessed: true,
          stockProcessedAt: new Date(),
          updatedAt: new Date(),
          stockProcessingNote: `Processed ${stockUsageRecords.length} stock records`
        },
      }
    );

    debugLog(`Order ${order._id} processed successfully with ${stockUsageRecords.length} stock records`);

    return { 
      success: true, 
      message: `Processed ${stockUsageRecords.length} stock records`,
      recordsProcessed: stockUsageRecords.length,
      itemsProcessed: aggregatedItems.size,
      stockUsageRecords
    };

  } catch (error) {
    debugError(`Error processing stock for order ${order._id}:`, error);
    
    try {
      const dbClient = await clientPromise;
      const db = dbClient.db("gold");
      
      await db.collection("orders").updateOne(
        { _id: order._id },
        {
          $set: {
            stockProcessed: false,
            stockProcessingError: (error as Error).message,
            stockLastAttempt: new Date()
          },
        }
      );
    } catch (markError) {
      debugError("Failed to mark order as failed:", markError);
    }
    
    throw error;
  }
}

// Function for manual batch processing (kept for admin use)
async function processAllCompletedOrdersBatch(req?: NextRequest) {
  try {
    const dbClient = await clientPromise;
    const db = dbClient.db("gold");

    debugLog("Manual batch processing: Looking for completed orders to process...");

    const completedOrders = await db.collection("orders").find({
      status: { $regex: /^completed$/i },
      $or: [
        { stockProcessed: { $ne: true } },
        { stockProcessed: { $exists: false } }
      ]
    })
    .project({ _id: 1, orderNumber: 1, status: 1, items: 1, waiterId: 1, stockProcessed: 1 })
    .limit(BATCH_SIZE)
    .toArray();

    if (completedOrders.length === 0) {
      debugLog(`Found 0 completed orders to process in batch`);
      return { totalOrders: 0, processedOrders: 0, failedOrders: 0, results: [] };
    }

    debugLog(`Found ${completedOrders.length} completed orders to process in batch`);

    const results = [];
    const userData = req ? await getCurrentUserData(req) : null;
    
    // Process orders sequentially to prevent stock conflicts
    for (const order of completedOrders) {
      try {
        debugLog(`Processing order in batch: ${order.orderNumber || order._id}`);
        
        const stockResult = await processOrderStockUsage(order);
        
        if (order.waiterId && stockResult.success) {
          await registerWaitressActivity(db, order, 'completed');
        }
        
        if (userData && stockResult.success) {
          await registerOrderActivity(db, userData, order, 'completed');
        }
        
        results.push({
          orderId: order._id,
          orderNumber: order.orderNumber,
          originalStatus: order.status,
          ...stockResult
        });
        
        debugLog(`Order ${order._id} processed successfully in batch`);
      } catch (error) {
        debugError(`Failed to process order ${order._id} in batch:`, error);
        results.push({
          orderId: order._id,
          orderNumber: order.orderNumber,
          success: false,
          error: (error as any).message
        });
      }
      
      // Small delay between orders in batch
      await new Promise(resolve => setTimeout(resolve, PROCESSING_DELAY));
    }

    const summary = {
      totalOrders: completedOrders.length,
      processedOrders: results.filter(r => r.success).length,
      failedOrders: results.filter(r => !r.success).length,
      results
    };

    debugLog("Manual batch processing summary:", summary);

    return summary;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error in processAllCompletedOrdersBatch";
    debugError("Error in processAllCompletedOrdersBatch:", { message: errorMessage, error });
    throw error;
  }
}

// Helper function for diagnostic requests
async function handleDiagnosticRequest() {
  try {
    const dbClient = await clientPromise;
    const db = dbClient.db("gold");
    
    debugLog("Running diagnostic check...");

    const allOrders = await db.collection("orders").find({}).toArray();
    
    debugLog(`Total orders in database: ${allOrders.length}`);
    
    const statusSummary = allOrders.reduce((acc, order) => {
      const status = order.status || 'unknown';
      acc[status] = (acc[status] || 0) + 1;
      acc.stockProcessed = (acc.stockProcessed || 0) + (order.stockProcessed ? 1 : 0);
      acc.completedBy = (acc.completedBy || 0) + (order.completedBy ? 1 : 0);
      return acc;
    }, {} as Record<string, number>);
    
    debugLog("Order status summary:", statusSummary);

    const completedOrders = await db.collection("orders").find({
      status: { $regex: /^completed$/i }
    }).toArray();
    
    debugLog(`Completed orders: ${completedOrders.length}`);
    
    const completedOrdersDetails = completedOrders.slice(0, 5).map(order => ({
      _id: order._id,
      orderNumber: order.orderNumber,
      status: order.status,
      completedBy: order.completedBy,
      stockProcessed: order.stockProcessed,
      stockProcessedAt: order.stockProcessedAt,
      itemsCount: order.items?.length || 0
    }));
    
    debugLog("Sample completed orders:", completedOrdersDetails);

    const queryResult = await db.collection("orders").find({
      status: { $regex: /^completed$/i },
      stockProcessed: { $ne: true }
    }).toArray();
    
    debugLog(`Unprocessed completed orders: ${queryResult.length}`);

    const usedStockCount = await db.collection("used_stock").countDocuments();
    debugLog(`Used stock records: ${usedStockCount}`);

    const itemsWithStock = await db.collection("items").find({
      "requiredStock.0": { $exists: true }
    }).toArray();
    
    debugLog(`Items with requiredStock defined: ${itemsWithStock.length}`);

    const employeeRankCount = await db.collection("employee_rank").countDocuments();
    debugLog(`Employee rank records: ${employeeRankCount}`);
    
    const topEmployees = await db.collection("employee_rank")
      .find({})
      .sort({ points: -1 })
      .limit(5)
      .toArray();
    
    debugLog("Top 5 employees by points:", topEmployees.map(e => ({
      name: e.name,
      email: e.email,
      completedOrders: e.completedOrders || 0,
      totalOrders: e.totalOrders || 0,
      points: e.points || 0,
      employeeId: e.employeeId
    })));

    return {
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
    };

  } catch (error) {
    debugError("Diagnostic error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return { 
      success: false,
      error: "Diagnostic failed", 
      details: errorMessage 
    };
  }
}

// Helper function to handle used stock requests
async function handleUsedStockRequest(req: NextRequest) {
  try {
    const dbClient = await clientPromise;
    const db = dbClient.db("gold");

    const url = new URL(req.url);
    const orderId = url.searchParams.get("orderId");
    const itemId = url.searchParams.get("itemId");
    const stockId = url.searchParams.get("stockId");
    const startDate = url.searchParams.get("startDate");
    const endDate = url.searchParams.get("endDate");
    const limit = parseInt(url.searchParams.get("limit") || "100");

    debugLog("Used stock request:", {
      orderId,
      itemId,
      stockId,
      startDate,
      endDate,
      limit
    });

    let query = {};

    if (orderId && ObjectId.isValid(orderId)) {
      query = { ...query, orderId: new ObjectId(orderId) };
    }

    if (itemId && ObjectId.isValid(itemId)) {
      query = { ...query, "items.itemId": new ObjectId(itemId) };
    }

    if (stockId && ObjectId.isValid(stockId)) {
      query = { ...query, stockId: new ObjectId(stockId) };
    }

    if (startDate && endDate) {
      query = {
        ...query,
        usedAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        },
      };
    }

    debugLog("Used stock query:", query);

    const usedStock = await db
      .collection("used_stock")
      .find(query)
      .sort({ usedAt: -1 })
      .limit(limit)
      .toArray();

    debugLog(`Found ${usedStock.length} used stock records`);

    const aggregation = [
      { $match: query },
      {
        $group: {
          _id: null,
          totalQuantity: { $sum: "$totalQuantityUsed" },
          totalCost: { $sum: "$totalCost" },
          count: { $sum: 1 }
        }
      }
    ];

    const totals = await db
      .collection("used_stock")
      .aggregate(aggregation)
      .toArray();

    return {
      success: true,
      usedStock,
      totals: totals[0] || { totalQuantity: 0, totalCost: 0, count: 0 },
      count: usedStock.length
    };

  } catch (error) {
    debugError("Error fetching used stock:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return { 
      success: false,
      error: "Internal Server Error", 
      details: errorMessage 
    };
  }
}

// GET endpoint - Now WITHOUT auto-processing (optimized)
export async function GET(req: NextRequest) {
  try {
    const dbClient = await clientPromise;
    const db = dbClient.db("gold");

    const url = new URL(req.url);
    const orderId = url.searchParams.get("id");
    const status = url.searchParams.get("status");
    const autoProcess = url.searchParams.get("autoProcess") === "true"; // Changed: Only process if explicitly true
    const action = url.searchParams.get("action");
    const diagnostic = url.searchParams.get("diagnostic");

    debugLog("GET request received:", {
      orderId,
      status,
      autoProcess,
      action,
      diagnostic,
      pathname: url.pathname
    });

    if (diagnostic === "true") {
      const result = await handleDiagnosticRequest();
      return NextResponse.json(result, { status: result.success ? 200 : 500 });
    }

    if (action === "usedStock") {
      const result = await handleUsedStockRequest(req);
      return NextResponse.json(result, { status: result.success ? 200 : 500 });
    }

    if (action === "debugEmployeeRank") {
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
                  
                  if (fixResult.success) {
                    fixedCount++;
                  }
                }
              } catch (error) {
                debugError(`Error fixing order ${order._id}:`, error);
                results.push({
                  orderId: order._id,
                  error: error.message
                });
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
          error: error.message
        }, { status: 500 });
      }
    }

    // REMOVED: Auto-processing completed orders on GET
    // Stock is now processed ONLY when status changes to COMPLETED
    if (autoProcess) {
      debugLog("⚠️ Auto-processing is disabled by default. Use action=processStock for manual batch processing.");
    }

    // Build query
    let query = {};
    
    if (orderId) {
      if (!ObjectId.isValid(orderId)) {
        return NextResponse.json(
          { success: false, error: "Invalid order ID format" },
          { status: 400 }
        );
      }
      query = { _id: new ObjectId(orderId) };
    }
    
    if (status) {
      query = { 
        ...query, 
        status: { $regex: new RegExp(`^${status}$`, 'i') }
      };
    } else if (!orderId) {
      // Default: Fetch all orders including completed ones (but stock is already processed)
      query = {};
    }

    const deliveryRestriction = {
      $or: [
        { delivery: { $ne: true } },
        { 
          delivery: true, 
          status: { $regex: /^confirmed$/i } 
        }
      ]
    };

    query = { $and: [query, deliveryRestriction] };

    debugLog("Database query:", query);

    const orders = await db.collection("orders")
      .find(query)
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray();

    debugLog(`Found ${orders.length} orders`);

    if (orders.length === 0) {
      return NextResponse.json(
        { success: true, message: "No orders found", orders: [] },
        { status: 200 }
      );
    }

    const ordersWithStockInfo = await Promise.all(
      orders.map(async (order) => {
        const usedStock = await db.collection("used_stock")
          .find({ orderId: order._id })
          .limit(5)
          .toArray();
        
        let additionalDetails = {};

        if ((order.inTable === true || order.waiterId) && (!order.delivery)) {
          try {
            if (order.waiterId && ObjectId.isValid(order.waiterId)) {
              let waiter = await db.collection("waitresses").findOne(
                { _id: new ObjectId(order.waiterId) },
                { projection: { name: 1, avatar: 1, shift: 1 } }
              );
              
              if (waiter) {
                additionalDetails = { waiter };
              }
            }
          } catch (err) {
            console.error(`Failed to fetch waiter for order ${order._id}`, err);
          }
        }
        
        if (order.delivery === true && (!order.inTable)) {
          if (!order.deliveryInfo) {
            order.deliveryInfo = {};
          }
          if (!order.paymentScreenshotUrl) {
            order.paymentScreenshotUrl = null;
          }
        }

        return {
          ...order,
          ...additionalDetails,
          usedStockCount: usedStock.length,
          usedStock: usedStock.length > 0 ? usedStock : []
        };
      })
    );

    return NextResponse.json(
      { 
        success: true,
        orders: ordersWithStockInfo,
        count: orders.length
      },
      { status: 200 }
    );

  } catch (error) {
    debugError("Error fetching orders:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { 
        success: false,
        error: "Internal Server Error", 
        details: errorMessage 
      },
      { status: 500 }
    );
  }
}

// Helper for Cloudinary upload on the server
async function uploadToCloudinary(file: File): Promise<string> {
  const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'dnqsoezfo';
  const CLOUDINARY_UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'photoupload';

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
    {
      method: 'POST',
      body: formData,
    }
  );

  if (!response.ok) {
    const errorBody = await response.text();
    debugError("Cloudinary upload failed", { status: response.status, body: errorBody });
    throw new Error('Failed to upload payment screenshot');
  }

  const data = await response.json();
  return data.secure_url;
}

// POST endpoint - Create new order (unchanged)
export async function POST(req: NextRequest) {
  try {
    const dbClient = await clientPromise;
    const db = dbClient.db("gold");
    
    const contentType = req.headers.get('content-type') || '';
    let body;

    try {
      if (contentType.includes('application/json')) {
        body = await req.json();
      } else if (contentType.includes('multipart/form-data')) {
        const formData = await req.formData();
        const orderDataString = formData.get('orderData') as string;
        if (!orderDataString) {
          return NextResponse.json({ success: false, error: "Missing 'orderData' in form data" }, { status: 400 });
        }
        body = JSON.parse(orderDataString);

        const paymentScreenshotFile = formData.get('paymentScreenshot') as File;
        if (paymentScreenshotFile) {
          debugLog("Uploading payment screenshot to Cloudinary from FormData...");
          const screenshotUrl = await uploadToCloudinary(paymentScreenshotFile);
          body.paymentScreenshotUrl = screenshotUrl;
          debugLog("Payment screenshot uploaded from FormData:", { url: screenshotUrl });
        }
      } else {
        const textBody = await req.text();
        if (!textBody) {
          return NextResponse.json({ success: false, error: 'Request body is empty' }, { status: 400 });
        }
        body = JSON.parse(textBody);
      }
    } catch (error: any) {
      debugError("Error parsing request body:", error);
      return NextResponse.json({ success: false, error: "Invalid request body.", details: error.message }, { status: 400 });
    }

    debugLog("POST request received:", { body });

    if (!body || !body.items || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json(
        { success: false, error: "At least one item is required" },
        { status: 400 }
      );
    }

    const lastOrder = await db.collection("orders")
      .find({}, { projection: { orderNumber: 1 } })
      .sort({ orderNumber: -1 })
      .limit(1)
      .toArray();

    let nextOrderNum = 1;
    if (lastOrder.length > 0 && lastOrder[0].orderNumber) {
      const match = lastOrder[0].orderNumber.match(/ORD-(\d+)/);
      if (match && match[1]) {
        nextOrderNum = parseInt(match[1], 10) + 1;
      }
    }

    const orderNumber = `ORD-${String(nextOrderNum).padStart(6, '0')}`;

    debugLog(`Generated order number: ${orderNumber}`);

    let totalAmount = 0;
    const processedItems = [];

    for (const item of body.items) {
      if (!ObjectId.isValid(item.itemId)) {
        return NextResponse.json(
          { success: false, error: "Invalid item ID format" },
          { status: 400 }
        );
      }

      debugLog(`Fetching item: ${item.itemId}`);

      const itemData = await db
        .collection("items")
        .findOne({ _id: new ObjectId(item.itemId) });

      if (!itemData) {
        return NextResponse.json(
          { success: false, error: `Item not found: ${item.itemId}` },
          { status: 404 }
        );
      }

      const subtotal = (Number(item.quantity) || 0) * (Number(itemData.price) || 0);
      totalAmount += subtotal;

      const processedItem = {
        itemId: item.itemId,
        itemName: itemData.name,
        quantity: Number(item.quantity) || 0,
        unitPrice: itemData.price,
        itemPrice: itemData.price,
        subtotal: subtotal,
        notes: item.notes || ""
      };

      processedItems.push(processedItem);

      debugLog(`Item processed:`, {
        itemId: item.itemId,
        name: itemData.name,
        quantity: item.quantity,
        price: itemData.price,
        subtotal
      });
    }

    const taxAmount = totalAmount * 0.15;
    const finalAmount = totalAmount + taxAmount - (Number(body.discount) || 0);

    debugLog("Amounts calculated:", {
      totalAmount,
      taxAmount,
      discount: body.discount || 0,
      finalAmount
    });

    const userData = await getCurrentUserData(req);
    
    debugLog("User data for order creation:", {
      hasUserData: !!userData,
      userData: userData ? {
        id: userData.id,
        name: userData.name,
        email: userData.email,
        role: userData.role
      } : null
    });

    const orderData = {
      orderNumber,
      tableNumber: body.tableNumber || null,
      waiterId: body.waiterId || null,
      customerId: body.customerId || "walk-in",
      numberOfGuests: body.numberOfGuests || 1,
      items: processedItems,
      totalAmount,
      tax: taxAmount,
      discount: Number(body.discount) || 0,
      finalAmount,
      paymentMethod: body.paymentMethod || "CARD",
      status: "PENDING",
      specialRequirements: body.specialRequirements || "",
      isActive: body.isActive !== undefined ? body.isActive : true,
      stockProcessed: false,
      inTable: body.inTable || false,
      delivery: body.delivery || false,
      deliveryInfo: body.deliveryInfo || null,
      paymentScreenshotUrl: body.paymentScreenshotUrl || null,
      createdAt: new Date(),
      updatedAt: new Date(),
      completedAt: null,
      stockProcessedAt: null
    };

    debugLog("Order data prepared for insertion:", {
      orderNumber: orderData.orderNumber,
      itemsCount: orderData.items.length,
      totalAmount: orderData.totalAmount,
      finalAmount: orderData.finalAmount
    });

    debugLog("Inserting new order...");

    const result = await db.collection("orders").insertOne(orderData as any);

    debugLog("Order inserted:", {
      insertedId: result.insertedId,
      acknowledged: result.acknowledged
    });

    const insertedOrder = await db.collection("orders").findOne({ _id: result.insertedId });

    if (userData && insertedOrder) {
      debugLog("Attempting to register employee activity for order creation...");
      const activityResult = await registerOrderActivity(db, userData, insertedOrder, 'created');
      debugLog("Employee activity registration result:", activityResult);
      
      if (insertedOrder.waiterId) {
        debugLog("Registering waitress activity...");
        const waitressResult = await registerWaitressActivity(db, insertedOrder, 'created');
        debugLog("Waitress activity registration result:", waitressResult);
      }
    } else {
      debugLog("Skipping employee activity registration:", {
        hasUserData: !!userData,
        hasInsertedOrder: !!insertedOrder
      });
    }

    return NextResponse.json(
      {
        success: true, 
        orderId: result.insertedId,
        orderNumber,
        finalAmount,
        tax: taxAmount,
        status: "pending",
        userRegistered: !!userData,
        createdAt: orderData.createdAt,
        completedAt: null
      },
      { status: 201 }
    );
  } catch (error) {
    debugError("Order placement error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { 
        success: false,
        error: "Internal Server Error", 
        details: errorMessage 
      },
      { status: 500 }
    );
  }
}

// PATCH endpoint - Update order status and process stock immediately when COMPLETED
export async function PATCH(req: NextRequest) {
  try {
    const dbClient = await clientPromise;
    const db = dbClient.db("gold");
    const body = await req.json();

    debugLog("PATCH request received:", { body });

    const { orderId, action, status, forceProcess } = body;

    // Handle manual batch stock processing (admin only)
    if (action === "processStock") {
      debugLog("Manual batch stock processing requested", { forceProcess });
      
      const userData = await getCurrentUserData(req);
      const processResult = await processAllCompletedOrdersBatch(req);
      
      if (userData && processResult.processedOrders > 0) {
        debugLog("Registering batch process activity...");
        await registerOrderActivity(db, userData, { 
          _id: 'batch-process', 
          orderNumber: 'BATCH-PROCESS' 
        } as any, 'updated');
      }
      
      return NextResponse.json(
        {
          success: true,
          message: `Batch stock processing completed`,
          ...processResult,
          triggeredBy: userData ? { name: userData.name, id: userData.id } : null
        },
        { status: 200 }
      );
    }

    // Handle individual order status update
    if (orderId && status) {
      if (!ObjectId.isValid(orderId)) {
        return NextResponse.json(
          { success: false, error: "Valid order ID is required" },
          { status: 400 }
        );
      }

      debugLog(`Updating order ${orderId} status to: ${status}`);

      const userData = await getCurrentUserData(req);
      const normalizedStatus = normalizeStatus(status);
      
      const order = await db.collection("orders").findOne({ _id: new ObjectId(orderId) });
      
      if (!order) {
        return NextResponse.json(
          { success: false, error: "Order not found" },
          { status: 404 }
        );
      }

      const updateData: any = {
        status: normalizedStatus,
        updatedAt: new Date(),
      };

      if (normalizedStatus === "completed") {
        updateData.completedAt = new Date();
        
        if (userData) {
          updateData.completedBy = {
            userId: userData.id,
            name: userData.name,
            email: userData.email,
            role: userData.role,
            completedAt: new Date()
          };
        }
      }

      const updateResult = await db.collection("orders").updateOne(
        { _id: new ObjectId(orderId) },
        { $set: updateData }
      );

      if (updateResult.matchedCount === 0) {
        return NextResponse.json(
          { success: false, error: "Order not found" },
          { status: 404 }
        );
      }

      const updatedOrder = await db.collection("orders").findOne({ 
        _id: new ObjectId(orderId) 
      });

      if (!updatedOrder) {
        return NextResponse.json(
          { success: false, error: "Failed to retrieve updated order" },
          { status: 500 }
        );
      }

      // Register employee activity for status change
      if (userData) {
        debugLog("Registering employee activity for status update...");
        await registerOrderActivity(db, userData, updatedOrder, 'updated');
      }

      // CRITICAL: Process stock IMMEDIATELY when order is COMPLETED
      if (normalizedStatus === "completed") {
        try {
          debugLog("🔄 Order marked as COMPLETED - Processing stock immediately...");
          
          // Process stock usage for this single order
          const stockResult = await processOrderStockUsage(updatedOrder);
          
          // Register employee completion activity
          if (userData) {
            debugLog("Registering employee completion activity...");
            const completionResult = await registerOrderActivity(db, userData, updatedOrder, 'completed');
            debugLog("Employee completion activity result:", completionResult);
          }
          
          // Register waitress activity if order has waiter
          if (updatedOrder.waiterId) {
            debugLog("Registering waitress completion activity...");
            const waitressResult = await registerWaitressActivity(db, updatedOrder, 'completed');
            debugLog("Waitress completion activity result:", waitressResult);
          }
          
          debugLog(`✅ Stock processed successfully for order ${orderId}`);
          
          return NextResponse.json(
            { 
              ...stockResult, 
              orderId,
              employeeRegistered: !!userData,
              waitressRegistered: !!updatedOrder.waiterId,
              completedAt: updatedOrder.completedAt,
              message: `Order completed and stock processed successfully`,
              processedAt: new Date().toISOString()
            },
            { status: 200 }
          );
        } catch (stockError) {
          debugError("❌ Stock processing failed:", stockError);
          const errorMessage = stockError instanceof Error ? stockError.message : "Unknown stock processing error";
          
          // Still register completion activity even if stock fails (for audit)
          if (userData) {
            debugLog("Registering completion activity despite stock failure...");
            await registerOrderActivity(db, userData, updatedOrder, 'completed');
          }
          
          return NextResponse.json({
            success: true,
            message: "Order completed, but stock processing failed. Please check inventory.",
            orderId,
            completedAt: updatedOrder.completedAt,
            error: errorMessage,
            employeeRegistered: !!userData,
            stockProcessed: false
          }, { status: 200 });
        }
      }

      return NextResponse.json({
        success: true,
        message: `Order status updated to ${normalizedStatus}`,
        orderId,
        updatedBy: userData ? { name: userData.name, id: userData.id } : null,
        completedAt: normalizedStatus === "completed" ? updatedOrder.completedAt : order.completedAt
      }, { status: 200 });
    }

    return NextResponse.json(
      { success: false, error: "Invalid request. Provide orderId and status or action=processStock" },
      { status: 400 }
    );
  } catch (error) {
    debugError("Order update error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { 
        success: false,
        error: "Failed to update order", 
        details: errorMessage 
      },
      { status: 500 }
    );
  }
}

// New endpoint for direct testing
export async function POST_TEST_PROCESS(req: NextRequest) {
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

    debugLog(`Manual test processing for order: ${orderId}`);

    const order = await db.collection("orders").findOne({ 
      _id: new ObjectId(orderId) 
    });

    if (!order) {
      return NextResponse.json(
        { success: false, error: "Order not found" },
        { status: 404 }
      );
    }

    debugLog("Order found:", {
      orderId: order._id,
      status: order.status,
      stockProcessed: order.stockProcessed,
      itemsCount: order.items?.length || 0
    });

    const result = await processOrderStockUsage(order);

    return NextResponse.json(
      { ...result, orderId, orderStatus: order.status },
      { status: 200 }
    );

  } catch (error) {
    debugError("Test processing error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { 
        success: false,
        error: "Test processing failed", 
        details: errorMessage 
      },
      { status: 500 }
    );
  }
}

// New endpoint to get employee rankings
export async function GET_EMPLOYEE_RANKINGS(req: NextRequest) {
  try {
    const dbClient = await clientPromise;
    const db = dbClient.db("gold");

    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get("limit") || "10");
    const sortBy = url.searchParams.get("sortBy") || "points";
    const role = url.searchParams.get("role");

    debugLog("Employee rankings request:", { limit, sortBy, role });

    let query = {};
    if (role) {
      query = { role: { $regex: new RegExp(`^${role}$`, 'i') } };
    }

    const rankings = await db.collection("employee_rank")
      .find(query)
      .sort({ [sortBy]: -1 })
      .limit(limit)
      .toArray();

    const stats = await db.collection("employee_rank").aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalEmployees: { $sum: 1 },
          totalCompletedOrders: { $sum: "$completedOrders" },
          totalOrders: { $sum: "$totalOrders" },
          totalPoints: { $sum: "$points" },
          averageCompletedOrders: { $avg: "$completedOrders" },
          averagePoints: { $avg: "$points" }
        }
      }
    ]).toArray();

    return NextResponse.json(
      {
        success: true,
        rankings,
        stats: stats[0] || {},
        count: rankings.length,
        timestamp: new Date()
      },
      { status: 200 }
    );

  } catch (error) {
    debugError("Error fetching employee rankings:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { 
        success: false,
        error: "Failed to fetch employee rankings", 
        details: errorMessage 
      },
      { status: 500 }
    );
  }
}