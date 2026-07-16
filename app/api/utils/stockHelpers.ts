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
  lowStockItems?: LowStockItem[];
  partiallyProcessed?: boolean;
  error?: string;
};

type LowStockItem = {
  stockId: string;
  stockName: string;
  currentStock: number;
  requiredQuantity: number;
  deficit: number;
  unit: string;
  orderNumber: string;
  menuItemName: string;
  orderId: string;
};

type ProcessingError = {
  orderNumber: string;
  orderId: string;
  error: string;
  failedItems?: {
    itemName: string;
    stockName: string;
    requiredQuantity: number;
    availableStock: number;
  }[];
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
  
  const isPartialOrder = order.hasPartialStock === true || 
    (order.pendingStockItems && order.pendingStockItems.length > 0);

  // Only skip if fully processed (existing records AND not a partial order)
  // Partial orders need to continue so remaining pendingStockItems get processed
  if (existingRecords > 0 && !isPartialOrder) {
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

  // Process book quantity decrements
  // Books are stored in the "books" collection — just minus sold quantity, no stock/ingredient processing
  const bookItemIds: string[] = [];
  for (const [itemIdString, aggItem] of aggregatedItems.entries()) {
    if (!ObjectId.isValid(itemIdString)) continue;

    const bookData = await db.collection("books").findOne({ _id: new ObjectId(itemIdString) });
    if (!bookData) continue;

    bookItemIds.push(itemIdString);

    const newQuantity = Math.max(0, (Number(bookData.quantity) || 0) - aggItem.quantity);
    await db.collection("books").updateOne(
      { _id: new ObjectId(itemIdString) },
      { $set: { quantity: newQuantity, updatedAt: new Date() } }
    );

    debugLog(`📚 Book "${aggItem.itemName}": ${bookData.quantity} -> ${newQuantity} (sold ${aggItem.quantity})`);
  }

  // Collect ingredients (skip books — they have no stock/ingredients)
  const allIngredients = new Map<string, any>();
  let hasIngredients = false;

  for (const [itemIdString, aggItem] of aggregatedItems.entries()) {
    if (!ObjectId.isValid(itemIdString)) continue;
    if (bookItemIds.includes(itemIdString)) continue; // skip books
    
    const itemData = await db.collection("items").findOne({ _id: new ObjectId(itemIdString) });
    if (!itemData?.requiredStock?.length) continue;
    
    hasIngredients = true;

    // Build a map: defaultStockId -> array of { chosenStockId, chosenQuantity }
    // Supports both old single-choice and new multi-choice formats
    const choicesMap = new Map<string, { chosenStockId: string; chosenQuantity: number }[]>();
    const orderItem = order.items?.find((i: any) => i.itemId?.toString() === itemIdString);
    if (orderItem?.ingredientChoices?.length) {
      for (const choice of orderItem.ingredientChoices) {
        const existing = choicesMap.get(choice.defaultStockId) || [];
        existing.push({ chosenStockId: choice.chosenStockId, chosenQuantity: choice.chosenQuantity });
        choicesMap.set(choice.defaultStockId, existing);
      }
    }

    for (const ingredient of itemData.requiredStock) {
      if (!ingredient.stockId || !ObjectId.isValid(ingredient.stockId)) continue;

      const defaultStockIdString = ingredient.stockId.toString();
      const choices = choicesMap.get(defaultStockIdString);

      // Determine which stocks to deduct:
      // - If waiter made choices: use chosen stocks (may be multiple)
      // - If no choice made: use the default ingredient stock
      const stocksToDeduct: { stockId: string; quantity: number }[] = choices && choices.length > 0
        ? choices.map(c => ({ stockId: c.chosenStockId, quantity: c.chosenQuantity }))
        : [{ stockId: defaultStockIdString, quantity: Number(ingredient.quantity) || 0 }];

      for (const { stockId: effectiveStockId, quantity: qtyPerUnit } of stocksToDeduct) {
        if (!ObjectId.isValid(effectiveStockId)) continue;

        const quantityNeeded = qtyPerUnit * aggItem.quantity;
        if (quantityNeeded <= 0) continue;

        const stockItem = await db.collection("stocks").findOne({ _id: new ObjectId(effectiveStockId) });
        if (!stockItem) continue;

        const existing = allIngredients.get(effectiveStockId);
        if (existing) {
          existing.totalQuantityUsed += quantityNeeded;
          existing.items.push({
            itemId: new ObjectId(itemIdString),
            itemName: aggItem.itemName,
            quantityUsed: quantityNeeded
          });
        } else {
          allIngredients.set(effectiveStockId, {
            stockId: effectiveStockId,
            stockName: stockItem.name,
            stockCategory: stockItem.category || "General",
            stockUnit: stockItem.unit || "pcs",
            unitCost: Number(stockItem.currentUnitPrice) || Number(stockItem.unitCost) || Number(stockItem.costPerUnit) || 0,
            totalQuantityUsed: quantityNeeded,
            currentStock: Number(stockItem.currentStock) || 0,
            items: [{
              itemId: new ObjectId(itemIdString),
              itemName: aggItem.itemName,
              quantityUsed: quantityNeeded
            }]
          });
        }
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

  // --- PARTIAL PROCESSING: split into sufficient and insufficient ---
  // If this order already has pendingStockItems saved, only process those
  const savedPending: any[] = order.pendingStockItems || [];
  const ingredientsToProcess = savedPending.length > 0
    ? new Map(
        [...allIngredients.entries()].filter(([id]) =>
          savedPending.some((p: any) => p.stockId === id)
        )
      )
    : allIngredients;

  const lowStockItems: LowStockItem[] = [];
  const sufficientIngredients = new Map<string, any>();

  for (const [stockIdString, ing] of ingredientsToProcess.entries()) {
    if (ing.currentStock < ing.totalQuantityUsed) {
      lowStockItems.push({
        stockId: stockIdString,
        stockName: ing.stockName,
        currentStock: ing.currentStock,
        requiredQuantity: ing.totalQuantityUsed,
        deficit: ing.totalQuantityUsed - ing.currentStock,
        unit: ing.stockUnit,
        orderNumber: order.orderNumber,
        menuItemName: ing.items[0]?.itemName || "Unknown",
        orderId: order._id.toString()
      });
    } else {
      sufficientIngredients.set(stockIdString, ing);
    }
  }

  // Process all sufficient ingredients in a transaction
  if (sufficientIngredients.size > 0) {
    await withTransactionRetry(dbClient, async (session) => {
      for (const [stockIdString, ing] of sufficientIngredients.entries()) {
        const stockId = new ObjectId(stockIdString);

        const existing = await db.collection("used_stock").findOne(
          { orderId: order._id, stockId },
          { session }
        );
        if (existing) continue;

        const stockItem = await db.collection("stocks").findOne({ _id: stockId }, { session });
        if (!stockItem) continue;

        if (Number(stockItem.currentStock) < ing.totalQuantityUsed) {
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

        await db.collection("used_stock").insertOne({
          orderId: order._id,
          orderNumber: order.orderNumber,
          stockId,
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
        }, { session });
      }
    }, 3);

    debugLog(`✅ Order ${order.orderNumber}: processed ${sufficientIngredients.size} sufficient stocks`);
  }

  // If some ingredients were insufficient, save them as pending and mark partial
  if (lowStockItems.length > 0) {
    const pendingStockItems = lowStockItems.map(i => ({
      stockId: i.stockId,
      stockName: i.stockName,
      requiredQuantity: i.requiredQuantity,
      currentStock: i.currentStock,
      deficit: i.deficit,
      unit: i.unit,
      menuItemName: i.menuItemName
    }));

    await db.collection("orders").updateOne(
      { _id: order._id },
      {
        $set: {
          stockProcessed: true,
          stockProcessedAt: new Date(),
          hasPartialStock: true,
          pendingStockItems,
          stockProcessingNote: `Partial: waiting for ${pendingStockItems.map(i => i.stockName).join(', ')}`
        },
        $unset: { stockProcessingError: "", stockProcessingFailedAt: "" }
      }
    );

    debugLog(`⚠️ Order ${order.orderNumber}: partial — pending stocks: ${pendingStockItems.map(i => i.stockName).join(', ')}`);

    return {
      success: true,
      partiallyProcessed: true,
      recordsProcessed: sufficientIngredients.size,
      lowStockItems,
      message: `Partial: ${lowStockItems.map(i => i.stockName).join(', ')} insufficient`
    };
  }

  // All ingredients were sufficient — fully processed
  await db.collection("orders").updateOne(
    { _id: order._id },
    {
      $set: {
        stockProcessed: true,
        stockProcessedAt: new Date(),
        hasPartialStock: false,
        stockProcessingNote: `Fully processed ${sufficientIngredients.size} stock records`
      },
      $unset: {
        stockProcessingError: "",
        stockProcessingFailedAt: "",
        pendingStockItems: ""
      }
    }
  );

  debugLog(`✅ Order ${order.orderNumber}: fully processed`);

  return {
    success: true,
    recordsProcessed: sufficientIngredients.size
  };
}

export async function processAllCompletedOrders(req?: NextRequest, batchSize: number = 20) {
  const dbClient = await clientPromise;
  const db = dbClient.db("gold");

  debugLog(`Finding up to ${batchSize} orders to process...`);

  // Find orders ready for processing:
  // 1. Not yet processed at all (stockProcessed != true)
  // 2. Partially processed (stockProcessed=true but hasPartialStock=true — pending ingredients)
  const orders = await db.collection("orders").find({
    status: { $regex: /^completed$/i },
    "items.0": { $exists: true },
    $or: [
      { stockProcessed: { $ne: true } },
      { hasPartialStock: true }
    ]
  }).limit(batchSize).toArray();

  debugLog(`Found ${orders.length} orders to process`);

  if (orders.length === 0) {
    return { 
      totalOrders: 0, 
      processedOrders: 0, 
      failedOrders: 0,
      lowStockItems: [],
      errors: []
    };
  }

  let processed = 0;
  let failed = 0;
  let partial = 0;
  const allLowStockItems: LowStockItem[] = [];
  const allErrors: ProcessingError[] = [];

  for (const order of orders) {
    try {
      const result = await processOrderStockUsage(order);

      if (result.partiallyProcessed) {
        partial++;
        if (result.lowStockItems) allLowStockItems.push(...result.lowStockItems);
      } else if (result.success) {
        processed++;
      } else {
        failed++;
        if (result.lowStockItems) allLowStockItems.push(...result.lowStockItems);
        allErrors.push({
          orderNumber: order.orderNumber,
          orderId: order._id.toString(),
          error: result.message || "Processing failed"
        });
      }
    } catch (error) {
      failed++;
      const errorMessage = error instanceof Error ? error.message : String(error);
      allErrors.push({
        orderNumber: order.orderNumber,
        orderId: order._id.toString(),
        error: errorMessage
      });
      debugError(`Failed to process ${order.orderNumber}:`, error);
      await db.collection("orders").updateOne(
        { _id: order._id },
        { $set: { stockProcessingError: errorMessage, stockProcessingFailedAt: new Date() } }
      );
    }

    await new Promise(resolve => setTimeout(resolve, 100));
  }

  const uniqueLowStockItems = Array.from(
    new Map(allLowStockItems.map(item => [item.stockId, item])).values()
  );

  return {
    totalOrders: orders.length,
    processedOrders: processed,
    failedOrders: failed,
    partialOrders: partial,
    lowStockItems: uniqueLowStockItems,
    errors: allErrors
  };
}