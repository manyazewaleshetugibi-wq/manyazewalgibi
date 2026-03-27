import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { debugLog, debugError, isOrderCompleted, normalizeStatus } from "./orderHelpers";
import { NextRequest } from "next/server";

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

    if (order.stockProcessed) {
      debugLog(`Stock already processed for order: ${order._id}`);
      return { 
        success: true, 
        message: "Stock already processed", 
        alreadyProcessed: true 
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

        const stockIdString = ingredient.stockId;
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
            unitCost: Number(stockItem.unitCost) || 0,
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

    // Process each ingredient
    const stockUsageRecords = [];
    const processedStockIds = [];
    
    for (const [stockIdString, ingredientData] of allIngredients.entries()) {
      const stockId = new ObjectId(stockIdString);
      const { totalQuantityUsed, stockName } = ingredientData;

      try {
        const stockItem = await db.collection("stocks").findOne({ _id: stockId });
        if (!stockItem) continue;

        const currentStock = Number(stockItem.currentStock) || 0;
        
        if (currentStock < totalQuantityUsed) {
          // Rollback
          for (const processedId of processedStockIds) {
            await db.collection("stocks").updateOne(
              { _id: new ObjectId(processedId) },
              { $inc: { currentStock: allIngredients.get(processedId)?.totalQuantityUsed || 0 } }
            );
          }
          
          return { 
            success: false, 
            message: `Insufficient stock for ${stockName}. Available: ${currentStock}, Required: ${totalQuantityUsed}`,
            stockName,
            available: currentStock,
            required: totalQuantityUsed
          };
        }

        const updateResult = await db.collection("stocks").updateOne(
          { _id: stockId, currentStock: { $gte: totalQuantityUsed } },
          {
            $inc: { currentStock: -totalQuantityUsed, stockUsed: totalQuantityUsed },
            $set: {
              lastUsed: new Date(),
              lastUsedInOrder: order.orderNumber
            }
          }
        );

        if (updateResult.modifiedCount === 0) {
          // Rollback
          for (const processedId of processedStockIds) {
            await db.collection("stocks").updateOne(
              { _id: new ObjectId(processedId) },
              { $inc: { currentStock: allIngredients.get(processedId)?.totalQuantityUsed || 0 } }
            );
          }
          
          return { 
            success: false, 
            message: `Concurrent stock update failed for ${stockName}` 
          };
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
        };

        await db.collection("used_stock").insertOne(stockUsageRecord);
        stockUsageRecords.push(stockUsageRecord);

      } catch (dbError) {
        // Rollback
        for (const processedId of processedStockIds) {
          await db.collection("stocks").updateOne(
            { _id: new ObjectId(processedId) },
            { $inc: { currentStock: allIngredients.get(processedId)?.totalQuantityUsed || 0 } }
          );
        }
        throw dbError;
      }
    }

    // Mark order as processed
    await db.collection("orders").updateOne(
      { _id: order._id },
      {
        $set: {
          stockProcessed: true,
          stockProcessedAt: new Date(),
          updatedAt: new Date(),
          stockProcessingNote: `Processed ${stockUsageRecords.length} stock records from ${aggregatedItems.size} items`
        },
      }
    );

    return { 
      success: true, 
      message: `Processed ${stockUsageRecords.length} stock records from ${aggregatedItems.size} unique item types`,
      recordsProcessed: stockUsageRecords.length,
      itemsProcessed: aggregatedItems.size,
      stockUsageRecords,
      processedStockIds
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

export async function processAllCompletedOrders(req?: NextRequest) {
  try {
    const dbClient = await clientPromise;
    const db = dbClient.db("gold");

    debugLog("Looking for completed orders to process...");

    const completedOrders = await db.collection("orders").find({
      status: { $regex: /^completed$/i },
      stockProcessed: { $ne: true },
      "items.0": { $exists: true }
    }).toArray();

    debugLog(`Found ${completedOrders.length} completed orders to process`);

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
  }
}