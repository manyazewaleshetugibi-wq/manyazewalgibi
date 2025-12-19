
import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { TableOrderSchema } from "@/models/Orders";
import { getToken } from "next-auth/jwt";

// Debug flag
const DEBUG = true;

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
    
    return {
      ...token,
      id: token.sub || token.id,
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

// Helper function to register user activity in employee_rank collection
async function registerEmployeeActivity(db: any, userData: any, orderData: any) {
  try {
    if (!userData || !userData.id) {
      debugLog("No user data available for employee rank registration");
      return { success: false, message: "No user data available" };
    }
    
    debugLog("Registering employee activity:", {
      userId: userData.id,
      userName: userData.name,
      orderId: orderData._id,
      orderNumber: orderData.orderNumber
    });
    
    // Check if employee_rank collection exists
    const collections = await db.listCollections({ name: "employee_rank" }).toArray();
    
    if (collections.length === 0) {
      debugLog("Creating employee_rank collection...");
      await db.createCollection("employee_rank");
      debugLog("employee_rank collection created");
    }
    
    // Prepare user identifier - handle both string and ObjectId
    let userId;
    if (ObjectId.isValid(userData.id)) {
      userId = new ObjectId(userData.id);
    } else {
      userId = userData.id;
    }
    
    // Generate employee ID if not provided
    const employeeId = userData.employeeId || `EMP-${Date.now().toString().slice(-6)}`;
    
    // Upsert operation: update if exists, insert if not
    const updateResult = await db.collection("employee_rank").updateOne(
      { 
        $or: [
          { userId: userId },
          { employeeId: employeeId },
          { email: userData.email }
        ]
      },
      {
        $set: {
          name: userData.name,
          email: userData.email,
          role: userData.role,
          employeeId: employeeId,
          lastActivity: new Date(),
          lastActivityType: "order_completed",
          lastOrderId: orderData._id,
          lastOrderNumber: orderData.orderNumber
        },
        $inc: { 
          completedOrders: 1,
          totalOrdersProcessed: 1,
          points: 10 // Award points for completing an order
        },
        $setOnInsert: {
          userId: userId,
          createdAt: new Date(),
          totalPoints: 10,
          activityHistory: []
        }
      },
      { upsert: true }
    );
    
    // Add to activity history
    const activityRecord = {
      type: "order_completed",
      orderId: orderData._id,
      orderNumber: orderData.orderNumber,
      timestamp: new Date(),
      pointsAwarded: 10
    };
    
    await db.collection("employee_rank").updateOne(
      { 
        $or: [
          { userId: userId },
          { employeeId: employeeId }
        ]
      },
      {
        $push: {
          activityHistory: {
            $each: [activityRecord],
            $slice: -50 // Keep last 50 activities
          }
        }
      }
    );
    
    debugLog("Employee activity registered successfully:", {
      userId: userData.id,
      upsertedId: updateResult.upsertedId,
      matchedCount: updateResult.matchedCount,
      modifiedCount: updateResult.modifiedCount
    });
    
    return { 
      success: true, 
      message: "Employee activity registered",
      employeeId: employeeId
    };
    
  } catch (error) {
    debugError("Failed to register employee activity:", error);
    return { 
      success: false, 
      message: "Failed to register employee activity",
      error: (error as any).message 
    };
  }
}

// Helper function to process stock usage for a single order
export async function processOrderStockUsage(order: any) {
  try {
    const dbClient = await clientPromise;
    const db = dbClient.db("gold");

    debugLog(`Starting stock processing for order:`, {
      orderId: order._id,
      orderNumber: order.orderNumber,
      status: order.status,
      normalizedStatus: normalizeStatus(order.status),
      stockProcessed: order.stockProcessed
    });

    // Check if stock has already been processed for this order
    if (order.stockProcessed) {
      debugLog(`Stock already processed for order: ${order._id}`);
      return { success: true, message: "Already processed" };
    }

    // Check if order is completed (case-insensitive)
    if (!isOrderCompleted(order)) {
      debugLog(`Order ${order._id} is not completed. Status: ${order.status}`);
      return { success: false, message: `Order is not completed. Status: ${order.status}` };
    }

    debugLog(`Processing stock usage for order: ${order._id}`, {
      itemsCount: order.items?.length || 0
    });
    
    // Aggregate items by itemId to handle multiple orders of the same item
    const aggregatedItems = new Map<string, { quantity: number; itemName: string }>();
    for (const item of order.items) {
      const existing = aggregatedItems.get(item.itemId);
      if (existing) {
        existing.quantity += item.quantity;
      } else {
        aggregatedItems.set(item.itemId, {
          quantity: item.quantity,
          itemName: item.itemName,
        });
      }
    }

    debugLog(`Aggregated ${order.items.length} items into ${aggregatedItems.size} unique items.`);

    // Step 1: Collect all required ingredients from all items in the order
    const allIngredients = new Map<string, { stockName: string; stockCategory: string; stockUnit: string; unitCost: number; totalQuantityUsed: number; items: { itemId: ObjectId; itemName: string; quantityUsed: number }[] }>();

    for (const [itemIdString, aggregatedItem] of aggregatedItems.entries()) {
      const itemId = new ObjectId(itemIdString);

      // Get item details including ingredients/requiredStock from items collection
      const itemData = await db
        .collection("items")
        .findOne({ _id: new ObjectId(itemId) });

      if (!itemData) {
        debugError(`Item not found in items collection: ${itemId}`, null);
        continue;
      }

      // Check if item has requiredStock (ingredients)
      if (
        !itemData.requiredStock ||
        !Array.isArray(itemData.requiredStock) ||
        itemData.requiredStock.length === 0
      ) {
        continue;
      }

      // Process each ingredient/stock item required for this item
      for (const ingredient of itemData.requiredStock) {
        const stockIdString = ingredient.stockId;
        const quantityPerUnit = ingredient.quantity;

        // Get the stock item details
        const stockItem = await db
          .collection("stocks")
          .findOne({ _id: new ObjectId(stockIdString) });

        if (!stockItem) {
          debugError(`Stock item not found: ${stockIdString}`, ingredient);
          continue;
        }

        const totalQuantityNeeded = quantityPerUnit * aggregatedItem.quantity;

        // Aggregate by stockId
        const existingIngredient = allIngredients.get(stockIdString);
        if (existingIngredient) {
          existingIngredient.totalQuantityUsed += totalQuantityNeeded;
          existingIngredient.items.push({
            itemId: itemId,
            itemName: aggregatedItem.itemName,
            quantityUsed: totalQuantityNeeded,
          });
        } else {
          allIngredients.set(stockIdString, {
            stockName: stockItem.name,
            stockCategory: stockItem.category || "General",
            stockUnit: stockItem.unit || "pcs",
            unitCost: stockItem.unitCost || 0,
            totalQuantityUsed: totalQuantityNeeded,
            items: [{
              itemId: itemId,
              itemName: aggregatedItem.itemName,
              quantityUsed: totalQuantityNeeded,
            }],
          });
        }
      }
    }

    debugLog(`Collected ${allIngredients.size} unique ingredients for the order.`);

    // Step 2: Process each unique ingredient for stock deduction and logging
    const stockUsageRecords = [];
    for (const [stockIdString, ingredientData] of allIngredients.entries()) {
      const stockId = new ObjectId(stockIdString);
      const { totalQuantityUsed, stockName, items } = ingredientData;

      // Get current stock level
      const stockItem = await db.collection("stocks").findOne({ _id: stockId });
      if (!stockItem || stockItem.currentStock < totalQuantityUsed) {
        const available = stockItem?.currentStock || 0;
        debugError(`Insufficient stock for ${stockName}`, { available, required: totalQuantityUsed });
        return { success: false, message: `Insufficient stock for ${stockName}. Available: ${available}, Required: ${totalQuantityUsed}` };
      }

        try {
          // Deduct the stock from inventory
          const updateResult = await db.collection("stocks").updateOne(
            { _id: new ObjectId(stockId) },
            {
              $inc: { currentStock: -totalQuantityUsed, stockUsed: totalQuantityUsed },
            }
          );

          if (updateResult.modifiedCount === 0) {
            debugError(`Failed to deduct stock for ${stockName}`, updateResult);
            continue;
          }

          // Create a single usage record for this ingredient for this order
          const stockUsageRecord = {
            orderId: order._id,
            orderNumber: order.orderNumber || `ORD-${order._id.toString().slice(-6)}`,
            stockId: stockId,
            stockName: stockName,
            stockCategory: ingredientData.stockCategory,
            stockUnit: ingredientData.stockUnit,
            totalQuantityUsed: totalQuantityUsed,
            totalCost: ingredientData.unitCost * totalQuantityUsed,
            items: items, // Array of items that used this stock
            usedAt: new Date(),
            notes: `Used in ${items.length} item type(s) for order ${order.orderNumber}`,
          };

          const insertResult = await db
            .collection("used_stock")
            .insertOne(stockUsageRecord);

          stockUsageRecords.push(stockUsageRecord);

        } catch (dbError) {
          debugError(`Database operation failed for stock ${stockId}`, dbError);
          throw dbError;
        }
    }

    const totalStockRecords = stockUsageRecords.length;
    const processedItems = aggregatedItems.size;

    // Mark the order as processed only if there were items to process
    if (aggregatedItems.size > 0) {
      const updateOrderResult = await db.collection("orders").updateOne(
        { _id: order._id },
        {
          $set: {
            stockProcessed: true,
            stockProcessedAt: new Date(),
            updatedAt: new Date(),
          },
        }
      );

      debugLog(`Order marked as processed:`, {
        matchedCount: updateOrderResult.matchedCount,
        modifiedCount: updateOrderResult.modifiedCount,
      });
    }

    debugLog(`Successfully processed ${totalStockRecords} stock records for order: ${order._id}`, {
      uniqueItemTypesProcessed: processedItems,
      totalStockRecords,
    });

    return { 
      success: true, 
      message: `Processed ${totalStockRecords} stock records from ${processedItems} unique item types`,
      recordsProcessed: totalStockRecords,
      itemsProcessed: processedItems, // This now represents unique item types
      stockUsageRecords
    };

  } catch (error) {
    debugError(`Error processing stock for order ${order._id}:`, error);
    throw error;
  }
}

// Main function to find and process all completed orders
async function processAllCompletedOrders(req?: NextRequest) {
  try {
    const dbClient = await clientPromise;
    const db = dbClient.db("gold");

    debugLog("Looking for completed orders to process...");

    // Find all completed orders (case-insensitive) that haven't been processed for stock usage
    const completedOrders = await db.collection("orders").find({
      $or: [
        { status: "completed" },
        { status: "COMPLETED" },
        { status: "Completed" }
      ],
      stockProcessed: { $ne: true }
    }).toArray();

    debugLog(`Found ${completedOrders.length} completed orders to process`, {
      orderIds: completedOrders.map(o => ({
        id: o._id,
        status: o.status,
        stockProcessed: o.stockProcessed
      }))
    });

    const results = [];
    for (const order of completedOrders) {
      try {
        debugLog(`Processing order: ${order.orderNumber || order._id}`, {
          status: order.status,
          items: order.items?.length || 0
        });
        
        const result = await processOrderStockUsage(order);
        
        // If this was triggered by a PATCH request with user context, register employee activity
        if (req) {
          const userData = await getCurrentUserData(req);
          if (userData) {
            await registerEmployeeActivity(db, userData, order);
          }
        }
        
        results.push({
          orderId: order._id,
          orderNumber: order.orderNumber,
          originalStatus: order.status,
          ...result
        });
      } catch (error) {
        debugError(`Failed to process order ${order._id}:`, error);
        results.push({
          orderId: order._id,
          success: false,
          error: (error as any).message
        });
      }
    }

    const summary = {
      totalOrders: completedOrders.length,
      processedOrders: results.filter(r => r.success).length,
      failedOrders: results.filter(r => !r.success).length,
      results
    };

    debugLog("Completed order processing summary:", summary);

    return summary;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error in processAllCompletedOrders";
    debugError("Error in processAllCompletedOrders:", { message: errorMessage, error });
    throw error;
  }
}

// Helper function for diagnostic requests
async function handleDiagnosticRequest() {
  try {
    const dbClient = await clientPromise;
    const db = dbClient.db("gold");
    
    debugLog("Running diagnostic check...");

    // 1. Check all orders with their status
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

    // 2. Check specifically for completed orders (case-insensitive)
    const completedOrders = await db.collection("orders").find({
      $or: [
        { status: "completed" },
        { status: "COMPLETED" },
        { status: "Completed" }
      ]
    }).toArray();
    
    debugLog(`Completed orders: ${completedOrders.length}`);
    
    const completedOrdersDetails = completedOrders.map(order => ({
      _id: order._id,
      orderNumber: order.orderNumber,
      status: order.status,
      completedBy: order.completedBy,
      stockProcessed: order.stockProcessed,
      stockProcessedAt: order.stockProcessedAt,
      itemsCount: order.items?.length || 0,
      items: order.items?.map((item: any) => ({
        itemId: item.itemId,
        quantity: item.quantity
      })) || []
    }));
    
    debugLog("Completed orders details:", completedOrdersDetails);

    // 3. Check the query that's used for processing
    const queryResult = await db.collection("orders").find({
      $or: [
        { status: "completed" },
        { status: "COMPLETED" },
        { status: "Completed" }
      ],
      stockProcessed: { $ne: true }
    }).toArray();
    
    debugLog(`Unprocessed completed orders: ${queryResult.length}`);

    // 4. Check used_stock collection
    const usedStockCount = await db.collection("used_stock").countDocuments();
    debugLog(`Used stock records: ${usedStockCount}`);

    // 5. Check if items have requiredStock
    const itemsWithStock = await db.collection("items").find({
      "requiredStock.0": { $exists: true }
    }).toArray();
    
    debugLog(`Items with requiredStock defined: ${itemsWithStock.length}`);

    // 6. Check employee_rank collection
    const employeeRankCount = await db.collection("employee_rank").countDocuments();
    debugLog(`Employee rank records: ${employeeRankCount}`);
    
    const topEmployees = await db.collection("employee_rank")
      .find({})
      .sort({ completedOrders: -1 })
      .limit(5)
      .toArray();
    
    debugLog("Top 5 employees by completed orders:", topEmployees);

    return NextResponse.json({
      success: true,
      diagnostic: {
        totalOrders: allOrders.length,
        statusSummary,
        completedOrdersCount: completedOrders.length,
        completedOrders: completedOrdersDetails,
        unprocessedCompletedOrders: queryResult.length,
        usedStockCount,
        itemsWithRequiredStock: itemsWithStock.length,
        employeeRankCount,
        topEmployees,
        sampleItem: itemsWithStock.length > 0 ? {
          _id: itemsWithStock[0]._id,
          name: itemsWithStock[0].name,
          requiredStockCount: itemsWithStock[0].requiredStock?.length || 0,
          requiredStock: itemsWithStock[0].requiredStock?.slice(0, 3) || []
        } : null
      }
    }, { status: 200 });

  } catch (error) {
    debugError("Diagnostic error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { 
        success: false,
        error: "Diagnostic failed", 
        details: errorMessage 
      },
      { status: 500 }
    );
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

    debugLog("Used stock request:", {
      orderId,
      itemId,
      stockId,
      startDate,
      endDate
    });

    let query = {};

    if (orderId && ObjectId.isValid(orderId)) {
      query = { ...query, orderId: new ObjectId(orderId) };
    }

    if (itemId && ObjectId.isValid(itemId)) {
      query = { ...query, itemId: new ObjectId(itemId) };
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
      .toArray();

    debugLog(`Found ${usedStock.length} used stock records`);

    // Get aggregated totals
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

    return NextResponse.json(
      { 
        success: true,
        usedStock,
        totals: totals[0] || { totalQuantity: 0, totalCost: 0, count: 0 },
        count: usedStock.length
      },
      { status: 200 }
    );
  } catch (error) {
    debugError("Error fetching used stock:", error);
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

// GET endpoint - Main function that gets orders and automatically processes completed ones
export async function GET(req: NextRequest) {
  try {
    const dbClient = await clientPromise;
    const db = dbClient.db("gold");

    const url = new URL(req.url);
    const orderId = url.searchParams.get("id");
    const status = url.searchParams.get("status");
    const autoProcess = url.searchParams.get("autoProcess") !== "false"; // Default is true
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

    // Handle diagnostic request
    if (diagnostic === "true") {
      return await handleDiagnosticRequest();
    }

    // Handle used_stock request
    if (action === "usedStock") {
      return await handleUsedStockRequest(req);
    }

    // Auto-process completed orders when fetching orders
    if (autoProcess) {
      try {
        debugLog("Auto-processing completed orders...");
        const processResult = await processAllCompletedOrders(req);
        if (processResult.processedOrders > 0) {
          debugLog(`Auto-processed ${processResult.processedOrders} completed orders`);
        }
      } catch (error) {
        debugError("Auto-processing failed:", error);
        // Don't fail the entire request if auto-processing fails
      }
    }

    // Build query based on parameters
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
      // Handle case-insensitive status query
      const normalizedStatus = normalizeStatus(status);
      query = { 
        ...query, 
        $or: [
          { status: normalizedStatus },
          { status: normalizedStatus.toUpperCase() },
          { status: normalizedStatus.charAt(0).toUpperCase() + normalizedStatus.slice(1) }
        ]
      };
    }

    debugLog("Database query:", query);

    // Fetch orders based on query
    const orders = await db.collection("orders").find(query).toArray();

    debugLog(`Found ${orders.length} orders`);

    if (orders.length === 0) {
      return NextResponse.json(
        { success: true, message: "No orders found", orders: [] },
        { status: 200 }
      );
    }

    // For each order, check if it has used stock records
    const ordersWithStockInfo = await Promise.all(
      orders.map(async (order) => {
        const usedStock = await db.collection("used_stock")
          .find({ orderId: order._id })
          .toArray();
        
        return {
          ...order,
          usedStockCount: usedStock.length,
          usedStock: usedStock.length > 0 ? usedStock.slice(0, 5) : [] // Return first 5 records
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

// POST endpoint - Create new order
export async function POST(req: NextRequest) {
  try {
    const dbClient = await clientPromise;
    const db = dbClient.db("gold");
    const body = await req.json();

    debugLog("POST request received:", { body });

    // Validation
    if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json(
        { success: false, error: "At least one item is required" },
        { status: 400 }
      );
    }

    // Generate order number
    const orderCount = await db.collection("orders").countDocuments();
    const orderNumber = `ORD-${String(orderCount + 1).padStart(6, '0')}`;

    debugLog(`Generated order number: ${orderNumber}`);

    let totalAmount = 0;

    // Process each item
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

      const subtotal = item.quantity * itemData.price;
      totalAmount += subtotal;

      // Store item details
      item.subtotal = subtotal;
      item.unitPrice = itemData.price;
      item.itemName = itemData.name;

      debugLog(`Item processed:`, {
        itemId: item.itemId,
        name: itemData.name,
        quantity: item.quantity,
        price: itemData.price,
        subtotal
      });
    }

    // Calculate amounts
    const taxAmount = totalAmount * 0.15;
    const finalAmount = totalAmount + taxAmount - (body.discount || 0);

    debugLog("Amounts calculated:", {
      totalAmount,
      taxAmount,
      discount: body.discount || 0,
      finalAmount
    });

    // Validate the order
    const validatedOrder = TableOrderSchema.parse({
      ...body,
      totalAmount,
      tax: taxAmount,
      finalAmount,
      orderNumber,
      status: "PENDING",
      stockProcessed: false,
      // Zod will strip this, but it resolves the TS error
      _id: undefined,
    });

    // Insert order
    const newOrder = {
      ...validatedOrder,
      createdAt: new Date(),
      updatedAt: new Date(),
      completedAt: null,
      stockProcessedAt: null,
    };

    debugLog("Inserting new order...");

    const result = await db.collection("orders").insertOne(newOrder as any);

    debugLog("Order inserted:", {
      insertedId: result.insertedId,
      acknowledged: result.acknowledged
    });

    return NextResponse.json(
      {
        success: true, 
        orderId: result.insertedId,
        orderNumber,
        finalAmount,
        tax: taxAmount,
        status: "pending",
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

// PATCH endpoint - Update order status or manually process stock
export async function PATCH(req: NextRequest) {
  try {
    const dbClient = await clientPromise;
    const db = dbClient.db("gold");
    const body = await req.json();

    debugLog("PATCH request received:", { body });

    const { orderId, action, status } = body;

    // Handle manual stock processing for all completed orders
    if (action === "processStock") {
      debugLog("Manual stock processing requested");
      const result = await processAllCompletedOrders(req);
      
      return NextResponse.json(
        {
          success: true,
          message: `Stock processing completed`,
          ...result
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

      // Get current user data
      const userData = await getCurrentUserData(req);

      // Normalize status
      const normalizedStatus = normalizeStatus(status);
      
      // Prepare update data
      const updateData: any = {
        status: normalizedStatus,
        updatedAt: new Date(),
      };

      // If completing order, add completion details
      if (normalizedStatus === "completed") {
        updateData.completedAt = new Date();
        
        // Store who completed the order if user data is available
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

      // Update order status
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

      // If order is completed, process stock and register employee activity
      if (normalizedStatus === "completed") {
        try {
          const updatedOrder = await db.collection("orders").findOne({ 
            _id: new ObjectId(orderId) 
          });
          
          if (updatedOrder) {
            debugLog("Processing stock for newly completed order");
            
            // Register employee activity if user data is available
            let employeeRegistration = null;
            if (userData) {
              employeeRegistration = await registerEmployeeActivity(db, userData, updatedOrder);
              debugLog("Employee registration result:", employeeRegistration);
            }
            
            // Process stock usage
            const stockResult = await processOrderStockUsage(updatedOrder);
            
            return NextResponse.json(
              { 
                ...stockResult, 
                orderId,
                employeeRegistered: !!employeeRegistration?.success,
                employeeRegistration: employeeRegistration
              },
              { status: 200 }
            );
          }
        } catch (stockError) {
          debugError("Stock processing failed:", stockError);
          const errorMessage = stockError instanceof Error ? stockError.message : "Unknown stock processing error";
          return NextResponse.json({
            success: true,
            message: "Order completed, but stock processing failed.",
            orderId,
            error: errorMessage
          }, { status: 200 });
        }
      }

      return NextResponse.json({
        success: true,
        message: `Order status updated to ${normalizedStatus}`,
        orderId,
        updatedBy: userData ? { name: userData.name, id: userData.id } : null
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

    // Get the order
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

    // Test stock processing
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
    const sortBy = url.searchParams.get("sortBy") || "completedOrders";

    debugLog("Employee rankings request:", { limit, sortBy });

    // Get employee rankings
    const rankings = await db.collection("employee_rank")
      .find({})
      .sort({ [sortBy]: -1 })
      .limit(limit)
      .toArray();

    // Get summary statistics
    const stats = await db.collection("employee_rank").aggregate([
      {
        $group: {
          _id: null,
          totalEmployees: { $sum: 1 },
          totalCompletedOrders: { $sum: "$completedOrders" },
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