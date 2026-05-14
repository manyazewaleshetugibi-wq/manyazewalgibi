import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { debugLog, debugError, isOrderCompleted, normalizeStatus } from "./orderHelpers";
import { NextRequest } from "next/server";

// Helper to check if stock already processed for this order
async function isStockAlreadyProcessed(db: any, orderId: ObjectId, stockId: ObjectId): Promise<boolean> {
  const existing = await db.collection("used_stock").findOne({
    orderId: orderId,
    stockId: stockId
  });
  return !!existing;
}

// Helper to get all processed stock for an order
async function getProcessedStocksForOrder(db: any, orderId: ObjectId): Promise<string[]> {
  const records = await db.collection("used_stock")
    .find({ orderId: orderId })
    .project({ stockId: 1 })
    .toArray();
  return records.map((r: { stockId: ObjectId }) => r.stockId.toString());
}

export async function processOrderStockUsage(order: any) {
  // Use a lock to prevent concurrent processing
  const lockKey = `processing_lock_${order._id}`;
  
  try {
    const dbClient = await clientPromise;
    const db = dbClient.db("gold");

    debugLog(`Starting stock processing for order:`, {
      orderId: order._id,
      orderNumber: order.orderNumber,
      status: order.status,
      itemsCount: order.items?.length || 0
    });

    // CRITICAL FIX #1: Check both order flag AND existing records
    if (order.stockProcessed) {
      debugLog(`Order ${order._id} marked as processed, checking for actual records...`);
      
      // Verify records actually exist
      const existingRecords = await db.collection("used_stock")
        .countDocuments({ orderId: order._id });
      
      if (existingRecords > 0) {
        debugLog(`Stock already processed for order: ${order._id} with ${existingRecords} records`);
        return { 
          success: true, 
          message: "Stock already processed", 
          alreadyProcessed: true,
          recordsCount: existingRecords
        };
      } else {
        // Flag is true but no records - fix the flag
        debugLog(`Order ${order._id} has stockProcessed=true but no records. Fixing flag.`);
        await db.collection("orders").updateOne(
          { _id: order._id },
          { $set: { stockProcessed: false, stockProcessingNote: "Flag reset due to missing records" } }
        );
      }
    }

    // CRITICAL FIX #2: Check if already partially processed
    const existingProcessedStocks = await getProcessedStocksForOrder(db, order._id);
    if (existingProcessedStocks.length > 0) {
      debugLog(`Order ${order._id} already has ${existingProcessedStocks.length} stock records. Skipping to prevent duplicates.`);
      return { 
        success: true, 
        message: `Stock already partially processed with ${existingProcessedStocks.length} records`,
        alreadyProcessed: true,
        recordsCount: existingProcessedStocks.length
      };
    }

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
      return { 
        success: true, 
        message: "Order has no items to process",
        itemsProcessed: 0,
        recordsProcessed: 0 
      };
    }

    // Aggregate items by itemId
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

    if (aggregatedItems.size === 0) {
      debugLog(`No valid items to process for order ${order._id}`);
      return { 
        success: true, 
        message: "No valid items to process",
        itemsProcessed: 0,
        recordsProcessed: 0 
      };
    }

    // Collect all ingredients
    const allIngredients = new Map<string, any>();
    let itemsWithIngredients = 0;
    
    for (const [itemIdString, aggregatedItem] of aggregatedItems.entries()) {
      if (!ObjectId.isValid(itemIdString)) continue;

      const itemId = new ObjectId(itemIdString);
      const itemData = await db.collection("items").findOne({ _id: itemId });

      if (!itemData || !itemData.requiredStock?.length) continue;

      itemsWithIngredients++;

      for (const ingredient of itemData.requiredStock) {
        if (!ingredient.stockId || !ObjectId.isValid(ingredient.stockId)) continue;

        const stockIdString = ingredient.stockId.toString();
        const quantityPerUnit = Number(ingredient.quantity) || 0;
        if (quantityPerUnit <= 0) continue;

        const stockItem = await db.collection("stocks").findOne({ _id: new ObjectId(stockIdString) });
        if (!stockItem) continue;

        const totalQuantityNeeded = quantityPerUnit * aggregatedItem.quantity;
        if (totalQuantityNeeded <= 0) continue;

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
            stockName: stockItem.name || "Unknown Stock",
            stockCategory: stockItem.category || "General",
            stockUnit: stockItem.unit || "pcs",
            unitCost: Number(stockItem.unitCost) || Number(stockItem.costPerUnit) || 0,
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

    if (allIngredients.size === 0) {
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

    // CRITICAL FIX #3: Use transaction for atomic operations
    const session = dbClient.startSession();
    
    try {
      session.startTransaction();
      
      // Process each ingredient within transaction
      const stockUsageRecords = [];
      const processedStockIds = [];
      
      for (const [stockIdString, ingredientData] of allIngredients.entries()) {
        const stockId = new ObjectId(stockIdString);
        const { totalQuantityUsed, stockName } = ingredientData;

        // CRITICAL FIX #4: Check if this stock was already processed for this order
        const alreadyProcessed = await isStockAlreadyProcessed(db, order._id, stockId);
        if (alreadyProcessed) {
          debugLog(`Stock ${stockName} already processed for order ${order._id}, skipping`);
          continue;
        }

        const stockItem = await db.collection("stocks").findOne({ _id: stockId }, { session });
        if (!stockItem) continue;

        const currentStock = Number(stockItem.currentStock) || 0;
        
        if (currentStock < totalQuantityUsed) {
          throw new Error(`Insufficient stock for ${stockName}. Available: ${currentStock}, Required: ${totalQuantityUsed}`);
        }

        const updateResult = await db.collection("stocks").updateOne(
          { _id: stockId, currentStock: { $gte: totalQuantityUsed } },
          {
            $inc: { currentStock: -totalQuantityUsed },
            $set: {
              lastUsed: new Date(),
              lastUsedInOrder: order.orderNumber,
              updatedAt: new Date()
            }
          },
          { session }
        );

        if (updateResult.modifiedCount === 0) {
          throw new Error(`Concurrent stock update failed for ${stockName}`);
        }

        processedStockIds.push(stockIdString);

        const stockUsageRecord = {
          orderId: order._id,
          orderNumber: order.orderNumber || `ORD-${order._id.toString().slice(-6)}`,
          stockId: stockId,
          stockName: ingredientData.stockName,
          stockCategory: ingredientData.stockCategory,
          stockUnit: ingredientData.stockUnit,
          unitCost: ingredientData.unitCost,
          totalQuantityUsed: totalQuantityUsed,
          totalCost: ingredientData.unitCost * totalQuantityUsed,
          items: ingredientData.items,
          usedAt: new Date(),
          processedAt: new Date(),
          notes: `Used in ${ingredientData.items.length} item type(s) for order ${order.orderNumber}`,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        // CRITICAL FIX #5: Check again before insert to prevent race conditions
        const existingRecord = await db.collection("used_stock").findOne({
          orderId: order._id,
          stockId: stockId
        }, { session });
        
        if (existingRecord) {
          debugLog(`Record already exists for stock ${stockName}, skipping insert`);
          continue;
        }
        
        await db.collection("used_stock").insertOne(stockUsageRecord, { session });
        stockUsageRecords.push(stockUsageRecord);
      }

      // Mark order as processed
      await db.collection("orders").updateOne(
        { _id: order._id },
        {
          $set: {
            stockProcessed: true,
            stockProcessedAt: new Date(),
            updatedAt: new Date(),
            stockProcessingNote: `Processed ${stockUsageRecords.length} stock records from ${aggregatedItems.size} items`,
            stockProcessedCount: (order.stockProcessedCount || 0) + 1
          },
        },
        { session }
      );

      // Commit transaction
      await session.commitTransaction();
      
      debugLog(`Successfully processed order ${order._id} with ${stockUsageRecords.length} stock records`);
      
      return { 
        success: true, 
        message: `Processed ${stockUsageRecords.length} stock records from ${aggregatedItems.size} unique item types`,
        recordsProcessed: stockUsageRecords.length,
        itemsProcessed: aggregatedItems.size,
        stockUsageRecords,
        processedStockIds
      };
      
    } catch (error) {
      // Rollback transaction on error
      await session.abortTransaction();
      debugError(`Transaction failed for order ${order._id}:`, error);
      throw error;
    } finally {
      await session.endSession();
    }

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
            stockLastAttempt: new Date(),
            stockAttemptCount: (order.stockAttemptCount || 0) + 1
          },
        }
      );
    } catch (markError) {
      debugError("Failed to mark order as failed:", markError);
    }
    
    throw error;
  }
}

export async function processAllCompletedOrders(req?: NextRequest) {
  // CRITICAL FIX #6: Use a global lock to prevent concurrent runs
  const globalLock = await getGlobalLock();
  if (!globalLock) {
    debugLog("Another cron job is already running, skipping...");
    return {
      totalOrders: 0,
      processedOrders: 0,
      failedOrders: 0,
      message: "Skipped - another instance is already running"
    };
  }
  
  try {
    const dbClient = await clientPromise;
    const db = dbClient.db("gold");

    debugLog("Looking for completed orders to process...");

    // Only get orders that haven't been processed AND don't have existing used_stock records
    const completedOrders = await db.collection("orders").aggregate([
      {
        $match: {
          status: { $regex: /^completed$/i },
          stockProcessed: { $ne: true },
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
          "existingStock": { $size: 0 } // Only orders with NO stock records
        }
      },
      {
        $limit: 100 // Process in batches to prevent overload
      }
    ]).toArray();

    debugLog(`Found ${completedOrders.length} completed orders to process (no existing stock records)`);

    const results = [];
    
    for (const order of completedOrders) {
      try {
        const stockResult = await processOrderStockUsage(order);
        results.push({
          orderId: order._id,
          orderNumber: order.orderNumber,
          originalStatus: order.status,
          ...stockResult
        });
      } catch (error) {
        debugError(`Failed to process order ${order._id}:`, error);
        results.push({
          orderId: order._id,
          orderNumber: order.orderNumber,
          success: false,
          error: (error as any).message
        });
      }
    }

    return {
      totalOrders: completedOrders.length,
      processedOrders: results.filter(r => r.success).length,
      failedOrders: results.filter(r => !r.success).length,
      results
    };

  } catch (error) {
    debugError("Error in processAllCompletedOrders:", error);
    throw error;
  } finally {
    await releaseGlobalLock();
  }
}

// Global lock mechanism to prevent concurrent cron runs
let isProcessing = false;

async function getGlobalLock(): Promise<boolean> {
  if (isProcessing) return false;
  isProcessing = true;
  return true;
}

async function releaseGlobalLock(): Promise<void> {
  isProcessing = false;
}