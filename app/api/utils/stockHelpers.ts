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

// Helper function for transaction retry logic
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
      
      if (attempt > 1) {
        debugLog(`Transaction succeeded on attempt ${attempt}`);
      }
      
      return result;
      
    } catch (error: any) {
      await session.abortTransaction();
      lastError = error;
      
      // Check if retryable error
      const isRetryable = 
        error.code === 112 || // WriteConflict
        error.code === 225 || // TransactionAborted
        error.code === 50 || // MaxTimeMSExpired
        error.message?.includes('WriteConflict') ||
        error.message?.includes('aborted') ||
        error.message?.includes('timeout');
      
      if (isRetryable && attempt < maxRetries) {
        const delay = Math.min(100 * Math.pow(2, attempt), 1000);
        debugLog(`Transaction attempt ${attempt} failed, retrying in ${delay}ms... Error: ${error.message}`);
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

export async function processOrderStockUsage(order: any) {
  try {
    const dbClient = await clientPromise;
    const db = dbClient.db("gold");

    debugLog(`Starting stock processing for order:`, {
      orderId: order._id,
      orderNumber: order.orderNumber,
      status: order.status,
      itemsCount: order.items?.length || 0,
      stockProcessed: order.stockProcessed
    });

    // FIXED: Better check for existing records
    const existingRecords = await db.collection("used_stock")
      .countDocuments({ orderId: order._id });
    
    if (existingRecords > 0) {
      debugLog(`Order ${order._id} already has ${existingRecords} stock records. Marking as processed.`);
      
      // Fix inconsistent state
      if (!order.stockProcessed) {
        await db.collection("orders").updateOne(
          { _id: order._id },
          { 
            $set: { 
              stockProcessed: true,
              stockProcessedAt: new Date(),
              stockProcessingNote: `Already had ${existingRecords} records`
            },
            $unset: { stockProcessingError: "" }
          }
        );
      }
      
      return { 
        success: true, 
        message: "Stock already processed", 
        alreadyProcessed: true,
        recordsCount: existingRecords
      };
    }

    // If order is marked as processed but no records exist, fix the flag
    if (order.stockProcessed === true && existingRecords === 0) {
      debugLog(`Order ${order._id} has stockProcessed=true but no records. Fixing flag.`);
      await db.collection("orders").updateOne(
        { _id: order._id },
        { 
          $set: { 
            stockProcessed: false,
            stockProcessingNote: "Flag reset - had true but no records"
          },
          $unset: { stockProcessingError: "" }
        }
      );
      // Continue processing - don't return yet
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
      await db.collection("orders").updateOne(
        { _id: order._id },
        {
          $set: {
            stockProcessed: true,
            stockProcessedAt: new Date(),
            stockProcessingNote: "No items to process"
          }
        }
      );
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
      await db.collection("orders").updateOne(
        { _id: order._id },
        {
          $set: {
            stockProcessed: true,
            stockProcessedAt: new Date(),
            stockProcessingNote: "No valid items to process"
          }
        }
      );
      return { 
        success: true, 
        message: "No valid items to process",
        itemsProcessed: 0,
        recordsProcessed: 0 
      };
    }

    // Collect all ingredients (outside transaction for performance)
    const allIngredients = new Map<string, any>();
    let itemsWithIngredients = 0;
    
    for (const [itemIdString, aggregatedItem] of aggregatedItems.entries()) {
      if (!ObjectId.isValid(itemIdString)) continue;

      const itemId = new ObjectId(itemIdString);
      const itemData = await db.collection("items").findOne({ _id: itemId });

      if (!itemData || !itemData.requiredStock?.length) {
        debugLog(`Item ${aggregatedItem.itemName} has no requiredStock defined`);
        continue;
      }

      itemsWithIngredients++;

      for (const ingredient of itemData.requiredStock) {
        if (!ingredient.stockId || !ObjectId.isValid(ingredient.stockId)) continue;

        const stockIdString = ingredient.stockId.toString();
        const quantityPerUnit = Number(ingredient.quantity) || 0;
        if (quantityPerUnit <= 0) continue;

        const stockItem = await db.collection("stocks").findOne({ _id: new ObjectId(stockIdString) });
        if (!stockItem) {
          debugLog(`Stock ${ingredient.stockId} not found for item ${aggregatedItem.itemName}`);
          continue;
        }

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
      const note = itemsWithIngredients === 0 
        ? "No items have ingredients defined" 
        : "Items have ingredients but stocks not found";
      
      await db.collection("orders").updateOne(
        { _id: order._id },
        {
          $set: {
            stockProcessed: true,
            stockProcessedAt: new Date(),
            updatedAt: new Date(),
            stockProcessingNote: note
          },
        }
      );
      
      return { 
        success: true, 
        message: note,
        itemsProcessed: aggregatedItems.size,
        recordsProcessed: 0,
        noIngredients: true
      };
    }

    // Use transaction with retry for atomic operations
    return await withTransactionRetry(dbClient, async (session) => {
      debugLog(`Processing order ${order._id} within transaction...`);
      
      // Re-check within transaction to ensure no race condition
      const stillPending = await db.collection("orders").findOne(
        { _id: order._id, stockProcessed: { $ne: true } },
        { session }
      );
      
      if (!stillPending) {
        debugLog(`Order ${order._id} was already processed, skipping`);
        return { success: true, alreadyProcessed: true };
      }
      
      // Process each ingredient within transaction
      const stockUsageRecords = [];
      const processedStockIds = [];
      
      for (const [stockIdString, ingredientData] of allIngredients.entries()) {
        const stockId = new ObjectId(stockIdString);
        const { totalQuantityUsed, stockName } = ingredientData;

        // Check if this stock was already processed for this order (within transaction)
        const alreadyProcessed = await isStockAlreadyProcessed(db, order._id, stockId);
        if (alreadyProcessed) {
          debugLog(`Stock ${stockName} already processed for order ${order._id}, skipping`);
          continue;
        }

        const stockItem = await db.collection("stocks").findOne({ _id: stockId }, { session });
        if (!stockItem) {
          debugLog(`Stock ${stockName} not found, skipping`);
          continue;
        }

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

        // Check again before insert to prevent race conditions
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
          $unset: { stockProcessingError: "" }
        },
        { session }
      );
      
      debugLog(`Successfully processed order ${order._id} with ${stockUsageRecords.length} stock records`);
      
      return { 
        success: true, 
        message: `Processed ${stockUsageRecords.length} stock records from ${aggregatedItems.size} unique item types`,
        recordsProcessed: stockUsageRecords.length,
        itemsProcessed: aggregatedItems.size,
        stockUsageRecords,
        processedStockIds
      };
      
    }, 5); // 5 retry attempts
    
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

export async function processAllCompletedOrders(req?: NextRequest, batchSize: number = 10) {
  // Global lock to prevent concurrent runs
  const globalLock = await getGlobalLock();
  if (!globalLock) {
    debugLog("Another cron job is already running, skipping...");
    return {
      totalOrders: 0,
      processedOrders: 0,
      failedOrders: 0,
      alreadyProcessed: 0,
      message: "Skipped - another instance is already running"
    };
  }
  
  try {
    const dbClient = await clientPromise;
    const db = dbClient.db("gold");

    debugLog(`Looking for up to ${batchSize} completed orders to process...`);

    // Get orders that are completed and NOT yet processed
    const completedOrders = await db.collection("orders").aggregate([
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
          "existingStock": { $size: 0 }  // No existing stock records
        }
      },
      {
        $limit: batchSize
      }
    ]).toArray();

    debugLog(`Found ${completedOrders.length} orders to process (batch size limit: ${batchSize})`);

    if (completedOrders.length === 0) {
      // Check for inconsistent orders (marked processed but no records)
      const inconsistentOrders = await db.collection("orders").countDocuments({
        status: { $regex: /^completed$/i },
        stockProcessed: true
      });
      
      if (inconsistentOrders > 0) {
        debugLog(`⚠️ Found ${inconsistentOrders} orders with stockProcessed=true. They may need reset.`);
      }
      
      return {
        totalOrders: 0,
        processedOrders: 0,
        failedOrders: 0,
        alreadyProcessed: 0,
        message: "No pending orders found"
      };
    }

    const results = [];
    let processedCount = 0;
    let alreadyProcessedCount = 0;
    let failedCount = 0;
    
    for (const order of completedOrders) {
      // Add delay between orders to prevent overwhelming
      await new Promise(resolve => setTimeout(resolve, 500));
      
      try {
        const stockResult = await processOrderStockUsage(order);
        
        if (stockResult.success) {
          if (stockResult.alreadyProcessed) {
            alreadyProcessedCount++;
          } else {
            processedCount++;
          }
        } else {
          failedCount++;
        }
        
        results.push({
          orderId: order._id,
          orderNumber: order.orderNumber,
          originalStatus: order.status,
          ...stockResult
        });
      } catch (error) {
        failedCount++;
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
      processedOrders: processedCount,
      alreadyProcessed: alreadyProcessedCount,
      failedOrders: failedCount,
      results,
      batchSize
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