import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { debugLog, debugError, isOrderCompleted } from "./orderHelpers";
import { NextRequest } from "next/server";

// Define return type for processOrderStockUsage
type ProcessOrderResult = {
  success: boolean;
  alreadyProcessed?: boolean;
  recordsProcessed?: number;
  message?: string;
  noIngredients?: boolean;
  itemsProcessed?: number;
  stockUsageRecords?: any[];
  processedStockIds?: string[];
};

// Transaction retry helper
async function withTransactionRetry<T>(
  dbClient: any,
  callback: (session: any) => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const session = dbClient.startSession();
    
    try {
      session.startTransaction({
        readConcern: { level: 'snapshot' },
        writeConcern: { w: 'majority' },
        maxCommitTimeMS: 10000
      });
      
      const result = await callback(session);
      await session.commitTransaction();
      return result;
      
    } catch (error: any) {
      await session.abortTransaction();
      lastError = error;
      
      const isRetryable = 
        error.code === 112 || // WriteConflict
        error.code === 225 || // TransactionAborted
        error.message?.includes('WriteConflict') ||
        error.message?.includes('aborted');
      
      if (isRetryable && attempt < maxRetries) {
        const delay = attempt * 100;
        debugLog(`Retry ${attempt}/${maxRetries} in ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      throw error;
    } finally {
      await session.endSession();
    }
  }
  
  throw lastError;
}

export async function processOrderStockUsage(order: any): Promise<ProcessOrderResult> {
  const dbClient = await clientPromise;
  const db = dbClient.db("gold");

  debugLog(`Processing order: ${order.orderNumber}`, {
    items: order.items?.length || 0,
    stockProcessed: order.stockProcessed
  });

  // Check if already has stock records
  const existingRecords = await db.collection("used_stock")
    .countDocuments({ orderId: order._id });
  
  if (existingRecords > 0) {
    if (!order.stockProcessed) {
      await db.collection("orders").updateOne(
        { _id: order._id },
        { $set: { stockProcessed: true, stockProcessedAt: new Date() } }
      );
    }
    return { success: true, alreadyProcessed: true };
  }

  // Fix inconsistent flag
  if (order.stockProcessed === true && existingRecords === 0) {
    await db.collection("orders").updateOne(
      { _id: order._id },
      { $set: { stockProcessed: false }, $unset: { stockProcessingError: "" } }
    );
  }

  if (!isOrderCompleted(order)) {
    return { success: false, message: "Order not completed" };
  }

  if (!order.items?.length) {
    await db.collection("orders").updateOne(
      { _id: order._id },
      { $set: { stockProcessed: true, stockProcessingNote: "No items" } }
    );
    return { success: true, message: "No items" };
  }

  // Aggregate items by ID
  const aggregatedItems = new Map<string, { quantity: number; itemName: string }>();
  for (const item of order.items) {
    if (!item.itemId) continue;
    const existing = aggregatedItems.get(item.itemId);
    if (existing) {
      existing.quantity += Number(item.quantity) || 0;
    } else {
      aggregatedItems.set(item.itemId, {
        quantity: Number(item.quantity) || 0,
        itemName: item.itemName || "Unknown"
      });
    }
  }

  // Collect ingredients
  const allIngredients = new Map<string, any>();
  let hasIngredients = false;

  for (const [itemIdString, aggItem] of aggregatedItems.entries()) {
    if (!ObjectId.isValid(itemIdString)) continue;
    
    const itemData = await db.collection("items").findOne({ _id: new ObjectId(itemIdString) });
    if (!itemData?.requiredStock?.length) continue;
    
    hasIngredients = true;
    
    for (const ingredient of itemData.requiredStock) {
      if (!ingredient.stockId || !ObjectId.isValid(ingredient.stockId)) continue;
      
      const stockIdString = ingredient.stockId.toString();
      const quantityNeeded = (Number(ingredient.quantity) || 0) * aggItem.quantity;
      if (quantityNeeded <= 0) continue;
      
      const stockItem = await db.collection("stocks").findOne({ _id: new ObjectId(stockIdString) });
      if (!stockItem) continue;
      
      const existing = allIngredients.get(stockIdString);
      if (existing) {
        existing.totalQuantityUsed += quantityNeeded;
        existing.items.push({
          itemId: new ObjectId(itemIdString),
          itemName: aggItem.itemName,
          quantityUsed: quantityNeeded
        });
      } else {
        allIngredients.set(stockIdString, {
          stockId: stockIdString,
          stockName: stockItem.name,
          stockCategory: stockItem.category || "General",
          stockUnit: stockItem.unit || "pcs",
          unitCost: Number(stockItem.unitCost) || Number(stockItem.costPerUnit) || 0,
          totalQuantityUsed: quantityNeeded,
          items: [{
            itemId: new ObjectId(itemIdString),
            itemName: aggItem.itemName,
            quantityUsed: quantityNeeded
          }]
        });
      }
    }
  }

  // No ingredients found
  if (!hasIngredients || allIngredients.size === 0) {
    await db.collection("orders").updateOne(
      { _id: order._id },
      { $set: { stockProcessed: true, stockProcessingNote: "No ingredients defined" } }
    );
    return { success: true, message: "No ingredients", noIngredients: true };
  }

  // Process with transaction
  return await withTransactionRetry(dbClient, async (session) => {
    const stillPending = await db.collection("orders").findOne(
      { _id: order._id, stockProcessed: { $ne: true } },
      { session }
    );
    
    if (!stillPending) {
      return { success: true, alreadyProcessed: true };
    }
    
    const stockRecords = [];
    
    for (const [stockIdString, ing] of allIngredients.entries()) {
      const stockId = new ObjectId(stockIdString);
      
      // Check for existing record
      const existing = await db.collection("used_stock").findOne(
        { orderId: order._id, stockId: stockId },
        { session }
      );
      if (existing) continue;
      
      // Get and update stock
      const stockItem = await db.collection("stocks").findOne({ _id: stockId }, { session });
      if (!stockItem) continue;
      
      const currentStock = Number(stockItem.currentStock) || 0;
      if (currentStock < ing.totalQuantityUsed) {
        throw new Error(`Insufficient stock: ${ing.stockName}`);
      }
      
      await db.collection("stocks").updateOne(
        { _id: stockId, currentStock: { $gte: ing.totalQuantityUsed } },
        {
          $inc: { currentStock: -ing.totalQuantityUsed },
          $set: { lastUsed: new Date(), lastUsedInOrder: order.orderNumber }
        },
        { session }
      );
      
      // Create record
      const record = {
        orderId: order._id,
        orderNumber: order.orderNumber,
        stockId: stockId,
        stockName: ing.stockName,
        stockCategory: ing.stockCategory,
        stockUnit: ing.stockUnit,
        unitCost: ing.unitCost,
        totalQuantityUsed: ing.totalQuantityUsed,
        totalCost: ing.unitCost * ing.totalQuantityUsed,
        items: ing.items,
        usedAt: new Date(),
        processedAt: new Date(),
        createdAt: new Date()
      };
      
      await db.collection("used_stock").insertOne(record, { session });
      stockRecords.push(record);
    }
    
    // Mark order as processed
    await db.collection("orders").updateOne(
      { _id: order._id },
      {
        $set: {
          stockProcessed: true,
          stockProcessedAt: new Date(),
          stockProcessingNote: `Processed ${stockRecords.length} stock records`
        },
        $unset: { stockProcessingError: "" }
      },
      { session }
    );
    
    debugLog(`✅ Order ${order.orderNumber}: ${stockRecords.length} stock records`);
    
    return { success: true, recordsProcessed: stockRecords.length };
  }, 3);
}

export async function processAllCompletedOrders(req?: NextRequest, batchSize: number = 20) {
  const dbClient = await clientPromise;
  const db = dbClient.db("gold");

  debugLog(`Finding up to ${batchSize} orders to process...`);

  // Find orders ready for processing
  const orders = await db.collection("orders").aggregate([
    {
      $match: {
        status: { $regex: /^completed$/i },
        "items.0": { $exists: true }
      }
    },
    {
      $lookup: {
        from: "used_stock",
        localField: "_id",
        foreignField: "orderId",
        as: "existingStock"
      }
    },
    {
      $match: {
        "existingStock": { $size: 0 }
      }
    },
    { $limit: batchSize }
  ]).toArray();

  debugLog(`Found ${orders.length} orders to process`);

  if (orders.length === 0) {
    return { totalOrders: 0, processedOrders: 0, failedOrders: 0 };
  }

  let processed = 0;
  let failed = 0;

  for (const order of orders) {
    try {
      const result = await processOrderStockUsage(order);
      // Check if the result indicates success (either newly processed or already processed)
      if (result.success) {
        processed++;
      } else {
        failed++;
      }
    } catch (error) {
      failed++;
      debugError(`Failed to process ${order.orderNumber}:`, error);
    }
    
    // Small delay between orders
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return {
    totalOrders: orders.length,
    processedOrders: processed,
    failedOrders: failed
  };
}