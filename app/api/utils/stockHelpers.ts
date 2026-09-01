import { randomUUID } from "crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { debugLog, debugError, isOrderCompleted } from "./orderHelpers";
import { NextRequest } from "next/server";

// Floating-point-safe quantity helpers.
// Repeated fractional deductions (e.g. 0.1 liter milk) accumulate JS float error,
// so stock can end up at 0.0999999999999997 < required 0.1 and an order gets stuck
// as "partial" forever. Round all quantities and compare with a small epsilon.
function roundQty(n: number): number {
  return Math.round((Number(n) || 0) * 1e6) / 1e6;
}
const QTY_EPSILON = 1e-9;
function hasSufficientStock(current: number, required: number): boolean {
  return Number(current) + QTY_EPSILON >= roundQty(required);
}

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
  stillPending?: boolean;
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

// Transaction retry helper — Prisma handles serialization retries internally,
// but we keep a small retry loop for write-conflict / deadlock errors.
async function withTransactionRetry<T>(
  callback: (tx: Prisma.TransactionClient) => Promise<T>,
  maxRetries: number = 3,
  txOptions: { maxWait?: number; timeout?: number } = {}
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await prisma.$transaction(async (tx) => {
        return await callback(tx);
      }, {
        // Defaults must comfortably exceed the worst-case loop inside the
        // callback (several sequential queries per ingredient). Prisma's
        // default timeout is only 5s, which causes P2028
        // "Transaction already closed" when the DB is slow.
        maxWait: txOptions.maxWait ?? 10_000,
        timeout: txOptions.timeout ?? 90_000,
      });
    } catch (error: any) {
      lastError = error;

      const message = `${error?.message || ""} ${error?.cause?.message || ""}`;
      const isRetryable =
        error?.code === "P2034" || // write conflict / deadlock
        error?.code === "P2028" || // transaction API error
        /write.?conflict/i.test(message) ||
        /deadlock/i.test(message) ||
        /serialization/i.test(message);

      if (isRetryable && attempt < maxRetries) {
        const delay = attempt * 150;
        debugLog(`Retry ${attempt}/${maxRetries} in ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      throw error;
    }
  }
  
  throw lastError;
}

export async function processOrderStockUsage(order: any): Promise<ProcessOrderResult> {
  debugLog(`Processing order: ${order.orderNumber}`, {
    items: order.items?.length || 0,
    stockProcessed: order.stockProcessed
  });

  // Check if already has stock records
  const existingRecords = await prisma.usedStock.count({
    where: { orderId: order.id }
  });
  
  const isPartialOrder = order.hasPartialStock === true || 
    (order.pendingStockItems && order.pendingStockItems.length > 0);

  // Only skip if fully processed (existing records AND not a partial order)
  // Partial orders need to continue so remaining pendingStockItems get processed
  if (existingRecords > 0 && !isPartialOrder) {
    const set: any = {};
    if (!order.stockProcessed) {
      set.stockProcessed = true;
      set.stockProcessedAt = new Date();
    }
    if (order.stockProcessingError || order.stockProcessingFailedAt) {
      await prisma.order.updateMany(
        {
          where: { id: order.id },
          data: {
            ...set,
            stockProcessingError: Prisma.DbNull,
            stockProcessingFailedAt: null,
          },
        }
      );
    } else if (Object.keys(set).length) {
      await prisma.order.updateMany({ where: { id: order.id }, data: set });
    }
    return { success: true, alreadyProcessed: true };
  }

  // Fix inconsistent flag
  if (order.stockProcessed === true && existingRecords === 0) {
    await prisma.order.updateMany(
      {
        where: { id: order.id },
        data: { stockProcessed: false, stockProcessingError: null }
      }
    );
  }

  if (!isOrderCompleted(order)) {
    return { success: false, message: "Order not completed" };
  }

  if (!order.items?.length) {
    await prisma.order.updateMany(
      {
        where: { id: order.id },
        data: { stockProcessed: true, stockProcessingNote: "No items" }
      }
    );
    return { success: true, message: "No items" };
  }

  // Cheap pre-check for partial orders: if NONE of the pending stocks has been
  // replenished enough to fulfill the order, skip the expensive per-ingredient
  // loops entirely. Partial orders are re-checked on every batch run, so this
  // keeps the batch fast when the missing stock still hasn't arrived.
  if (isPartialOrder && order.pendingStockItems?.length) {
    const pendingIds = order.pendingStockItems
      .map((p: any) => (p.stockId ? p.stockId : null))
      .filter(Boolean);

    if (pendingIds.length > 0) {
      const pendingStocks = await prisma.stock.findMany({
        where: { id: { in: pendingIds } }
      });
      const stockById = new Map(
        pendingStocks.map((s: any) => [s.id, s])
      );
      const anyFulfillable = order.pendingStockItems.some((p: any) => {
        const s = stockById.get(p.stockId);
        if (!s) return false;
        return hasSufficientStock(s.currentStock, p.requiredQuantity);
      });

      if (!anyFulfillable) {
        return {
          success: false,
          stillPending: true,
          message: "Pending stocks still insufficient",
        };
      }
    }
  }

  // Process book quantity decrements
  // Books are stored in the "books" collection — just minus sold quantity, no stock/ingredient processing.
  // Guarded with bookStockProcessed so a failed/retried run can't double-decrement book stock.
  const bookItemIds: string[] = [];
  const booksAlreadyProcessed = order.bookStockProcessed === true || existingRecords > 0;
  if (!booksAlreadyProcessed) {
    await prisma.order.updateMany(
      {
        where: { id: order.id },
        data: { bookStockProcessed: true }
      }
    );

    // Total sold quantity per book (one book may appear on several order lines)
    const lineBookQty = new Map<string, number>();
    for (const line of order.items || []) {
      const id = line?.itemId?.toString();
      if (!id) continue;
      const qty = Number(line?.quantity) || 0;
      if (qty <= 0) continue;
      lineBookQty.set(id, (lineBookQty.get(id) || 0) + qty);
    }

    const bookIds = Array.from(lineBookQty.keys()).filter(Boolean);
    const bookDocs = bookIds.length
      ? await prisma.book.findMany({ where: { id: { in: bookIds } } })
      : [];
    const booksById = new Map(bookDocs.map((b: any) => [b.id, b]));

    for (const [id, qty] of lineBookQty.entries()) {
      const bookData: any = booksById.get(id);
      if (!bookData) continue;

      bookItemIds.push(id);

      const quantityToDeduct = roundQty(qty);
      const newQuantity = Math.max(0, (Number(bookData.quantity) || 0) - quantityToDeduct);
      await prisma.book.updateMany(
        {
          where: { id },
          data: {
            quantity: newQuantity,
            updatedAt: new Date(),
          },
        }
      );

      debugLog(`📚 Book "${bookData.name || bookData.title}": sold ${quantityToDeduct} (remaining clamped to 0)`);
    }
  }

  // Collect ingredients (skip books — they have no stock/ingredients)
  // IMPORTANT: deductions are accumulated per ORDER LINE and per UNIT inside
  // that line — NOT per aggregated item. The same menu item can appear more than
  // once, and each unit may carry its own ingredient choices
  // (`unitIngredientChoices`). The old code aggregated same-item lines and then
  // applied only the FIRST line's choice set to the whole quantity, silently
  // under-/over-deducting different stocks. Every unit now contributes exactly
  // what its own choices (or the recipe defaults) require.
  const allIngredients = new Map<string, any>();
  let hasIngredients = false;

  const stockCache = new Map<string, any>();
  const missingStocks = new Set<string>();

  for (const line of order.items || []) {
    const itemIdString = line?.itemId?.toString();
    if (!itemIdString) continue;
    if (bookItemIds.includes(itemIdString)) continue; // skip books

    const lineQty = Number(line?.quantity) || 0;
    if (lineQty <= 0) continue;

    const itemData: any = await prisma.item.findFirst({ where: { id: itemIdString } });
    if (!itemData?.requiredStock?.length) continue;

    hasIngredients = true;

    // Resolve per-unit choices for this line. New orders carry
    // `unitIngredientChoices` (one entry per unit); legacy orders carry a flat
    // `ingredientChoices` list that was applied identically to every unit.
    const rawUnits: any = Array.isArray(line?.unitIngredientChoices) ? line.unitIngredientChoices : null;
    const legacyChoices: any[] = Array.isArray(line?.ingredientChoices) ? line.ingredientChoices : [];
    const unitChoicesFor = (unitIndex: number): any[] => {
      if (rawUnits) {
        const u = rawUnits[unitIndex];
        return Array.isArray(u) ? u : [];
      }
      return legacyChoices;
    };

    for (let u = 0; u < lineQty; u++) {
      const unitChoices = unitChoicesFor(u);

      // Build a map: defaultStockId -> array of { chosenStockId, chosenQuantity }
      // Supports both old single-choice and new multi-choice formats
      const choicesMap = new Map<string, { chosenStockId: string; chosenQuantity: number }[]>();
      for (const choice of unitChoices) {
        if (!choice?.defaultStockId) continue;
        const existing = choicesMap.get(choice.defaultStockId) || [];
        existing.push({
          chosenStockId: choice.chosenStockId,
          chosenQuantity: Number(choice.chosenQuantity) || 0
        });
        choicesMap.set(choice.defaultStockId, existing);
      }

      for (const ingredient of itemData.requiredStock) {
        if (!ingredient.stockId) continue;

        const defaultStockIdString = ingredient.stockId.toString();
        const choices = choicesMap.get(defaultStockIdString);

        // Determine which stocks to deduct:
        // - If choices were made: use chosen stocks (may be multiple)
        // - If no choice made: use the default ingredient stock
        const stocksToDeduct: { stockId: string; quantity: number }[] = choices && choices.length > 0
          ? choices.map(c => ({ stockId: c.chosenStockId, quantity: c.chosenQuantity }))
          : [{ stockId: defaultStockIdString, quantity: Number(ingredient.quantity) || 0 }];

        for (const { stockId: effectiveStockId, quantity: qtyPerUnit } of stocksToDeduct) {
          if (!effectiveStockId) continue;

          const quantityNeeded = roundQty(qtyPerUnit);
          if (quantityNeeded <= 0) continue;

          let stockItem: any = stockCache.get(effectiveStockId);
          if (stockItem === undefined) {
            stockItem = await prisma.stock.findFirst({ where: { id: effectiveStockId } });
            stockCache.set(effectiveStockId, stockItem || null);
          }

          // A recipe referencing a stock that no longer exists must NOT be
          // silently skipped — the order would be marked finished while that
          // cost is never deducted. Collect it so the order fails loudly below.
          if (!stockItem) {
            missingStocks.add(effectiveStockId);
            continue;
          }

          const existing = allIngredients.get(effectiveStockId);
          if (existing) {
            existing.totalQuantityUsed = roundQty(existing.totalQuantityUsed + quantityNeeded);
            existing.items.push({
              itemId: itemIdString,
              itemName: line?.itemName || "Unknown",
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
                itemId: itemIdString,
                itemName: line?.itemName || "Unknown",
                quantityUsed: quantityNeeded
              }]
            });
          }
        }
      }
    }
  }

  if (missingStocks.size > 0) {
    const missingList = Array.from(missingStocks);
    debugLog(`❌ Order ${order.orderNumber} references missing stock(s): ${missingList.join(', ')}`);
    return {
      success: false,
      error: `Missing stock in menu recipe: ${missingList.join(', ')}. Update the menu item ingredient list or create the stock.`
    };
  }

  // No ingredients found
  if (!hasIngredients || allIngredients.size === 0) {
    await prisma.order.updateMany(
      {
        where: { id: order.id },
        data: { stockProcessed: true, stockProcessingNote: "No ingredients defined" }
      }
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
    if (!hasSufficientStock(ing.currentStock, ing.totalQuantityUsed)) {
      lowStockItems.push({
        stockId: stockIdString,
        stockName: ing.stockName,
        currentStock: roundQty(Number(ing.currentStock)),
        requiredQuantity: roundQty(ing.totalQuantityUsed),
        deficit: roundQty(Math.max(0, ing.totalQuantityUsed - Number(ing.currentStock))),
        unit: ing.stockUnit,
        orderNumber: order.orderNumber,
        menuItemName: ing.items[0]?.itemName || "Unknown",
        orderId: order.id
      });
    } else {
      sufficientIngredients.set(stockIdString, ing);
    }
  }

  // Process all sufficient ingredients in a transaction
  const newlyInsufficient: LowStockItem[] = [];

  if (sufficientIngredients.size > 0) {
    await withTransactionRetry(async (tx) => {
      // Clear from any earlier (aborted) attempt — the callback re-runs on retry
      newlyInsufficient.length = 0;

      for (const [stockIdString, ing] of sufficientIngredients.entries()) {
        const stockId = stockIdString;

        const existing = await tx.usedStock.findFirst({
          where: { orderId: order.id, stockId }
        });
        if (existing) continue;

        const stockItem: any = await tx.stock.findFirst({ where: { id: stockId } });
        if (!stockItem) continue;

        // Re-check stock inside transaction — if another order consumed it, skip gracefully
        if (!hasSufficientStock(stockItem.currentStock, ing.totalQuantityUsed)) {
          newlyInsufficient.push({
            stockId: stockIdString,
            stockName: ing.stockName,
            currentStock: roundQty(Number(stockItem.currentStock)),
            requiredQuantity: roundQty(ing.totalQuantityUsed),
            deficit: roundQty(Math.max(0, ing.totalQuantityUsed - Number(stockItem.currentStock))),
            unit: ing.stockUnit,
            orderNumber: order.orderNumber,
            menuItemName: ing.items[0]?.itemName || "Unknown",
            orderId: order.id
          });
          continue;
        }

        const newCurrent = Math.max(0, (Number(stockItem.currentStock) || 0) - ing.totalQuantityUsed);
        const updateResult = await tx.stock.updateMany(
          {
            where: { id: stockId, currentStock: { gte: ing.totalQuantityUsed - QTY_EPSILON } },
            data: {
              currentStock: newCurrent,
              lastUsed: new Date(),
              lastUsedInOrder: order.orderNumber,
            },
          }
        );

        // If gte guard failed (concurrent deduction won the race), treat as insufficient
        if (updateResult.count === 0) {
          newlyInsufficient.push({
            stockId: stockIdString,
            stockName: ing.stockName,
            currentStock: roundQty(Number(stockItem.currentStock)),
            requiredQuantity: roundQty(ing.totalQuantityUsed),
            deficit: roundQty(Math.max(0, ing.totalQuantityUsed - Number(stockItem.currentStock))),
            unit: ing.stockUnit,
            orderNumber: order.orderNumber,
            menuItemName: ing.items[0]?.itemName || "Unknown",
            orderId: order.id
          });
          continue;
        }

        await tx.usedStock.create({
          data: {
            id: randomUUID(),
            orderId: order.id,
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
          }
        });
      }
    }, 3);

    debugLog(`✅ Order ${order.orderNumber}: processed ${sufficientIngredients.size} sufficient stocks`);
  }

  // Merge original low stock items with newly discovered ones from race conditions
  lowStockItems.push(...newlyInsufficient);

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

    await prisma.order.updateMany(
      {
        where: { id: order.id },
        data: {
          stockProcessed: true,
          stockProcessedAt: new Date(),
          hasPartialStock: true,
          pendingStockItems,
          stockProcessingNote: `Partial: waiting for ${pendingStockItems.map(i => i.stockName).join(', ')}`,
          stockProcessingError: null,
          stockProcessingFailedAt: null
        }
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
  await prisma.order.updateMany(
    {
      where: { id: order.id },
      data: {
        stockProcessed: true,
        stockProcessedAt: new Date(),
        hasPartialStock: false,
        stockProcessingNote: `Fully processed ${sufficientIngredients.size} stock records`,
        stockProcessingError: null,
        stockProcessingFailedAt: null,
        pendingStockItems: Prisma.DbNull
      }
    }
  );

  debugLog(`✅ Order ${order.orderNumber}: fully processed`);

  return {
    success: true,
    recordsProcessed: sufficientIngredients.size
  };
}

export async function processAllCompletedOrders(req?: NextRequest, batchSize: number = 50) {
  debugLog(`Finding up to ${batchSize} orders to process...`);

  const completedWhere = {
    OR: [
      { status: { equals: "completed", mode: "insensitive" } as any },
      { status: { equals: "delivered", mode: "insensitive" } as any }
    ]
  };

  // 1. ALL partially-processed orders are re-checked every run (no take limit).
  //    The pre-check is a single cheap stock query, so a restocked partial order is
  //    always picked up — it never has to compete for a batch slot with fresh orders.
  //    Oldest partial first: those have been waiting longest and are most likely
  //    to have been restocked since. (Do NOT sort by completedAt — that column is
  //    null after the Mongo→Postgres migration, making the old query non-deterministic.)
  const partialOrders: any[] = await prisma.order.findMany({
    where: {
      ...completedWhere,
      hasPartialStock: true
    },
    orderBy: { stockProcessedAt: "asc" }
  });

  // Hoisted pre-check: resolve ALL pending stock levels with a single query, then only
  // run the expensive per-order processing for partials whose missing stock has been
  // replenished. Still-short orders are counted as partial without any per-order work.
  const pendingIds = new Set<string>();
  for (const o of partialOrders) {
    for (const p of o.pendingStockItems || []) {
      if (p.stockId) pendingIds.add(p.stockId);
    }
  }

  let pendingStocksById = new Map<string, any>();
  if (pendingIds.size > 0) {
    const stocks = await prisma.stock.findMany({
      where: { id: { in: Array.from(pendingIds) } }
    });
    pendingStocksById = new Map(stocks.map((s: any) => [s.id, s]));
  }

  const fulfillablePartial: any[] = [];
  let partial = 0;
  for (const o of partialOrders) {
    const anyFulfillable = (o.pendingStockItems || []).some((p: any) => {
      const s = pendingStocksById.get(p.stockId);
      return s && hasSufficientStock(s.currentStock, p.requiredQuantity);
    });
    if (anyFulfillable) {
      fulfillablePartial.push(o);
    } else {
      partial++;
    }
  }

  // 2. Fresh (never-processed) orders fill the remaining batch slots.
  const remainingSlots = Math.max(0, batchSize - fulfillablePartial.length);
  const freshOrders: any[] = await prisma.order.findMany({
    where: {
      ...completedWhere,
      AND: [
        { OR: [{ stockProcessed: { not: true } }, { stockProcessed: null }] },
        { OR: [{ hasPartialStock: { not: true } }, { hasPartialStock: null }] }
      ]
    },
    orderBy: { createdAt: "asc" },
    take: remainingSlots
  });

  const orders = [...freshOrders, ...fulfillablePartial];
  const totalConsidered = partialOrders.length + freshOrders.length;
  debugLog(`Found ${orders.length} orders to process (${fulfillablePartial.length} restocked partial, ${freshOrders.length} fresh)`);

  if (orders.length === 0) {
    return { 
      totalOrders: partial, 
      processedOrders: 0, 
      failedOrders: 0,
      partialOrders: partial,
      lowStockItems: [],
      errors: []
    };
  }

  let processed = 0;
  let failed = 0;
  const allLowStockItems: LowStockItem[] = [];
  const allErrors: ProcessingError[] = [];

  const ordersToProcess = [...freshOrders, ...fulfillablePartial];
  const CONCURRENCY = 3;

  const processOne = async (order: any) => {
    try {
      const result = await processOrderStockUsage(order);

      if (result.stillPending) {
        partial++;
      } else if (result.partiallyProcessed) {
        partial++;
        if (result.lowStockItems) allLowStockItems.push(...result.lowStockItems);
      } else if (result.success) {
        processed++;
      } else {
        failed++;
        if (result.lowStockItems) allLowStockItems.push(...result.lowStockItems);
        allErrors.push({
          orderNumber: order.orderNumber,
          orderId: order.id,
          error: result.error || result.message || "Processing failed"
        });
      }
    } catch (error) {
      failed++;
      const errorMessage = error instanceof Error ? error.message : String(error);
      allErrors.push({
        orderNumber: order.orderNumber,
        orderId: order.id,
        error: errorMessage
      });
      debugError(`Failed to process ${order.orderNumber}:`, error);
      await prisma.order.updateMany(
        {
          where: { id: order.id },
          data: { stockProcessingError: errorMessage, stockProcessingFailedAt: new Date() }
        }
      );
    }
  };

  for (let i = 0; i < ordersToProcess.length; i += CONCURRENCY) {
    await Promise.all(ordersToProcess.slice(i, i + CONCURRENCY).map(processOne));
  }

  const uniqueLowStockItems = Array.from(
    new Map(allLowStockItems.map(item => [item.stockId, item])).values()
  );

  return {
    totalOrders: totalConsidered,
    processedOrders: processed,
    failedOrders: failed,
    partialOrders: partial,
    lowStockItems: uniqueLowStockItems,
    errors: allErrors
  };
}
