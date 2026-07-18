import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { auth } from "@/auth";

// Type definitions
interface DateFilter {
  createdAt?: {
    $gte: Date;
    $lte: Date;
  };
  usedAt?: {
    $gte: Date;
    $lte: Date;
  };
}

interface StockGroupResult {
  _id: ObjectId;
  stockName: string;
  stockCategory: string;
  stockUnit: string;
  totalQuantityUsed: number;
  totalCost: number;
  frequency: number;
  lastUsed: Date;
}

interface StockWithDetails {
  stockId: string;
  stockName: string;
  stockCategory: string;
  stockUnit: string;
  totalQuantityUsed: number;
  totalCost: number;
  frequency: number;
  totalOrders: number;
  currentStock: number;
  minimumStock: number;
  stockStatus: 'normal' | 'low' | 'critical';
  lastUsed: Date | null;
  lastRestockedAt: Date | null;
  menuItems: any[];
  dailyUsage: Array<{ date: string; quantity: number; cost: number; ordersCount: number }>;
  usageRecords: Array<{
    orderId: string;
    orderNumber: string;
    quantityUsed: number;
    cost: number;
    usedAt: Date;
    items: Array<{ itemName: string; quantityUsed: number }>;
  }>;
}

interface FinalMenuItemData {
  itemId: string;
  itemName: string;
  totalQuantity: number;
  frequency: number;
  totalOrders: number;
  totalRevenue: number;
  averagePrice: number;
  lastOrderDate: Date | null;
  stocksUsed: Array<{
    stockId: string;
    stockName: string;
    stockCategory: string;
    stockUnit: string;
    quantityUsed: number;
    totalCost: number;
    percentageOfItem: number;
  }>;
  dailyUsage: Array<{ date: string; quantity: number; revenue: number; ordersCount: number }>;
}

// Helper: find stockIds that were used by menu items matching a search term
async function findStockIdsByMenuItemSearch(db: any, search: string, dateFilter: any): Promise<ObjectId[]> {
  try {
    // Find used_stock records where the nested items array contains matching item names
    const docs = await db.collection("used_stock")
      .aggregate([
        { $match: { ...dateFilter } },
        { $unwind: "$items" },
        { $match: { "items.itemName": { $regex: search, $options: 'i' } } },
        { $group: { _id: "$stockId" } }
      ], { allowDiskUse: true })
      .toArray();
    return docs.map((d: any) => d._id).filter((id: any) => id !== null);
  } catch (err) {
    console.error('findStockIdsByMenuItemSearch error:', err);
    return [];
  }
}

// Helper: find menuItemIds matching a search term
async function findMenuItemIdsBySearch(db: any, search: string, dateFilter: any): Promise<string[]> {
  try {
    const docs = await db.collection("used_stock")
      .aggregate([
        { $match: { ...dateFilter } },
        { $unwind: "$items" },
        { $match: { "items.itemName": { $regex: search, $options: 'i' } } },
        { $group: { _id: "$items.itemId" } }
      ], { allowDiskUse: true })
      .toArray();
    return docs.map((d: any) => d._id?.toString()).filter((id: any) => id);
  } catch (err) {
    console.error('findMenuItemIdsBySearch error:', err);
    return [];
  }
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');
    const groupBy = url.searchParams.get('groupBy') || 'stock';
    const search = url.searchParams.get('search') || '';
    const searchType = url.searchParams.get('searchType') || 'all'; // 'all' | 'stock' | 'menu'
    const sortBy = url.searchParams.get('sortBy') || 'frequency';
    const sortOrder = url.searchParams.get('sortOrder') || 'desc';
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 50);
    const page = parseInt(url.searchParams.get('page') || '1');
    const skip = (page - 1) * limit;

    const client = await clientPromise;
    const db = client.db("gold");

    // CRITICAL FIX: Build date filter - ONLY apply if BOTH from AND to exist AND are not 'null'
    const orderDateFilter: any = {};
    const stockDateFilter: any = {};
    
    if (from && to && from !== 'null' && to !== 'null') {
      // Parse as Ethiopia local time (UTC+3): use explicit offset to avoid server timezone issues
      const fromDateStr = new Date(from).toISOString().split('T')[0];
      const toDateStr = new Date(to).toISOString().split('T')[0];
      const fromDate = new Date(`${fromDateStr}T00:00:00+03:00`);
      const toDate = new Date(`${toDateStr}T23:59:59.999+03:00`);
      
      orderDateFilter.createdAt = {
        $gte: fromDate,
        $lte: toDate
      };
      
      stockDateFilter.usedAt = {
        $gte: fromDate,
        $lte: toDate
      };
      
      console.log(`[API] Applying date filter: ${fromDate.toISOString()} to ${toDate.toISOString()}`);
    } else {
      console.log(`[API] No date filter applied - fetching ALL data`);
    }

    if (groupBy === 'stock') {
      // ============================================
      // STOCK REPORT - from used_stock collection
      // ============================================
      
      const matchStage: any = { $match: stockDateFilter };
      
      if (search) {
        if (searchType === 'menu') {
          // Search by menu item names - find stockIds that were used by matching menu items
          const matchingStockIds = await findStockIdsByMenuItemSearch(db, search, stockDateFilter);
          matchStage.$match = {
            ...stockDateFilter,
            ...(matchingStockIds.length > 0
              ? { stockId: { $in: matchingStockIds } }
              : { stockId: { $in: [] } }) // No match = empty result
          };
        } else if (searchType === 'all') {
          // Search both stock names AND menu item names
          const matchingStockIdsFromMenu = await findStockIdsByMenuItemSearch(db, search, stockDateFilter);
          matchStage.$match = {
            ...stockDateFilter,
            $or: [
              { stockName: { $regex: search, $options: 'i' } },
              { stockCategory: { $regex: search, $options: 'i' } },
              ...(matchingStockIdsFromMenu.length > 0
                ? [{ stockId: { $in: matchingStockIdsFromMenu } }]
                : [])
            ]
          };
        } else {
          // Default: search by stock name/category only
          matchStage.$match = {
            ...stockDateFilter,
            $or: [
              { stockName: { $regex: search, $options: 'i' } },
              { stockCategory: { $regex: search, $options: 'i' } }
            ]
          };
        }
      }

      const pipeline: any[] = [
        matchStage,
        {
          $group: {
            _id: "$stockId",
            stockName: { $first: "$stockName" },
            stockCategory: { $first: "$stockCategory" },
            stockUnit: { $first: "$stockUnit" },
            totalQuantityUsed: { $sum: { $ifNull: ["$totalQuantityUsed", 0] } },
            totalCost: { $sum: { $ifNull: ["$totalCost", 0] } },
            frequency: { $sum: 1 },
            lastUsed: { $max: "$usedAt" }
          }
        },
        {
          $addFields: {
            totalQuantityUsed: { $round: ["$totalQuantityUsed", 3] },
            totalCost: { $round: ["$totalCost", 2] }
          }
        }
      ];

      // Add sorting
      const sortDirection = sortOrder === 'asc' ? 1 : -1;
      if (sortBy === 'name') {
        pipeline.push({ $sort: { stockName: sortDirection } });
      } else if (sortBy === 'usage') {
        pipeline.push({ $sort: { totalQuantityUsed: sortDirection } });
      } else {
        pipeline.push({ $sort: { frequency: sortDirection } });
      }

      // Get total count and total frequency across ALL stocks (not just paginated page)
      let total = 0;
      let totalFrequencyAllPages = 0;
      try {
        const countPipeline = pipeline.filter(p => !p.$skip && !p.$limit);
        const countResult = await db.collection("used_stock")
          .aggregate([...countPipeline, { $count: "total" }], { allowDiskUse: true })
          .toArray();
        total = countResult[0]?.total || 0;

        const freqResult = await db.collection("used_stock")
          .aggregate([...countPipeline, { $group: { _id: null, totalFreq: { $sum: "$frequency" } } }], { allowDiskUse: true })
          .toArray();
        totalFrequencyAllPages = freqResult[0]?.totalFreq || 0;
      } catch (err) {
        console.error("Count error:", err);
        total = 0;
      }

      // Apply pagination
      pipeline.push({ $skip: skip });
      pipeline.push({ $limit: limit });

      // Execute query
      let stockData: StockGroupResult[] = [];
      try {
        stockData = await db.collection("used_stock")
          .aggregate(pipeline, { allowDiskUse: true })
          .toArray() as StockGroupResult[];
      } catch (err) {
        console.error("Data fetch error:", err);
        stockData = [];
      }

      // Enrich with current stock data
      const stockIds = stockData.map(s => s._id).filter((id): id is ObjectId => id !== null);
      const stocksData = await db.collection("stocks")
        .find({ _id: { $in: stockIds } })
        .toArray();
      
      const stockMap = new Map<string, any>();
      stocksData.forEach(stock => {
        stockMap.set(stock._id.toString(), stock);
      });

      // Fetch last restock date per stock from stock_purchases
      const lastRestockMap = new Map<string, Date>();
      if (stockIds.length > 0) {
        try {
          const stockIdStringsForPurchases = stockIds.map(id => id.toString());
          const purchases = await db.collection("stock_purchases")
            .find({ stockId: { $in: stockIdStringsForPurchases } })
            .project({ stockId: 1, purchaseDate: 1 })
            .toArray();
          // Group by stockId, find most recent purchaseDate
          const purchaseGroups = new Map<string, Date>();
          purchases.forEach((p: any) => {
            const sid = p.stockId?.toString() || '';
            const pDate = new Date(p.purchaseDate);
            if (!purchaseGroups.has(sid) || pDate > purchaseGroups.get(sid)!) {
              purchaseGroups.set(sid, pDate);
            }
          });
          purchaseGroups.forEach((date, sid) => {
            lastRestockMap.set(sid, date);
          });
        } catch (err) {
          console.error('lastRestock fetch error:', err);
        }
      }

      // Fetch all used_stock docs for these stocks ONCE, then derive menuItems, orderCounts, dailyUsage, usageRecords
      const stockIdStrings = stockData.map(s => s._id?.toString()).filter(Boolean);
      const stockObjectIds = stockIds;
      let menuItemsByStock = new Map<string, any[]>();
      const stockOrderCounts = new Map<string, Set<string>>();
      const dailyUsageByStock = new Map<string, Map<string, { quantity: number; cost: number; orders: Set<string> }>>();
      const usageRecordsByStock = new Map<string, Array<{
        orderId: string; orderNumber: string; quantityUsed: number; cost: number; usedAt: Date;
        items: Array<{ itemName: string; quantityUsed: number }>;
      }>>();

      if (stockIdStrings.length > 0) {
        try {
          const allUsedDocsRaw = await db.collection("used_stock")
            .find({ ...stockDateFilter, stockId: { $in: stockObjectIds } })
            .toArray();
          // Filter: only include usage records AFTER the last restock for each stock
          const allUsedDocs = allUsedDocsRaw.filter((doc: any) => {
            const sid = doc.stockId?.toString() || '';
            const lastRestock = lastRestockMap.get(sid);
            if (!lastRestock) return true;
            const usedAt = doc.usedAt ? new Date(doc.usedAt) : new Date();
            return usedAt >= lastRestock;
          });

          // Derive menuItems per stock
          const grouped = new Map<string, Map<string, { itemName: string; itemId: string; quantityUsed: number; ordersCount: number; orders: Set<string> }>>();
          allUsedDocs.forEach((doc: any) => {
            const sid = doc.stockId?.toString() || '';
            if (!grouped.has(sid)) grouped.set(sid, new Map());
            const itemMap = grouped.get(sid)!;
            const orderId = doc.orderId?.toString() || '';
            const items = doc.items || [];
            if (items.length === 0) {
              const itemKey = 'unknown';
              const existing = itemMap.get(itemKey);
              if (existing) {
                existing.quantityUsed += doc.totalQuantityUsed || 0;
                existing.ordersCount += 1;
                if (orderId) existing.orders.add(orderId);
              } else {
                itemMap.set(itemKey, {
                  itemName: doc.stockName || 'Unknown',
                  itemId: itemKey,
                  quantityUsed: doc.totalQuantityUsed || 0,
                  ordersCount: 1,
                  orders: orderId ? new Set([orderId]) : new Set(),
                });
              }
            } else {
              items.forEach((item: any) => {
                const itemKey = item.itemId?.toString() || item.itemName || 'Unknown';
                const existing = itemMap.get(itemKey);
                if (existing) {
                  existing.quantityUsed += item.quantityUsed || 0;
                  existing.ordersCount += 1;
                  if (orderId) existing.orders.add(orderId);
                } else {
                  itemMap.set(itemKey, {
                    itemName: item.itemName || 'Unknown',
                    itemId: itemKey,
                    quantityUsed: item.quantityUsed || 0,
                    ordersCount: 1,
                    orders: orderId ? new Set([orderId]) : new Set(),
                  });
                }
              });
            }
          });
          grouped.forEach((itemMap, sid) => {
            const items = Array.from(itemMap.values()).map(item => ({
              itemName: item.itemName,
              itemId: item.itemId,
              quantityUsed: parseFloat(item.quantityUsed.toFixed(3)),
              servingsCount: item.ordersCount,
              ordersCount: item.orders.size,
            }));
            menuItemsByStock.set(sid, items);
          });

          // Derive order counts per stock
          allUsedDocs.forEach((doc: any) => {
            const sid = doc.stockId?.toString() || '';
            const oid = doc.orderId?.toString() || '';
            if (!stockOrderCounts.has(sid)) stockOrderCounts.set(sid, new Set());
            if (oid) stockOrderCounts.get(sid)!.add(oid);
          });

          // Derive dailyUsage and usageRecords per stock
          allUsedDocs.forEach((doc: any) => {
            const sid = doc.stockId?.toString() || '';
            const usedAt = doc.usedAt ? new Date(doc.usedAt) : new Date();
            const dateKey = usedAt.toISOString().split('T')[0];
            const orderId = doc.orderId?.toString() || '';

            if (!dailyUsageByStock.has(sid)) dailyUsageByStock.set(sid, new Map());
            const dayMap = dailyUsageByStock.get(sid)!;
            if (!dayMap.has(dateKey)) dayMap.set(dateKey, { quantity: 0, cost: 0, orders: new Set() });
            const dayEntry = dayMap.get(dateKey)!;
            dayEntry.quantity += doc.totalQuantityUsed || 0;
            dayEntry.cost += doc.totalCost || 0;
            if (orderId) dayEntry.orders.add(orderId);

            if (!usageRecordsByStock.has(sid)) usageRecordsByStock.set(sid, []);
            usageRecordsByStock.get(sid)!.push({
              orderId,
              orderNumber: doc.orderNumber || 'Unknown',
              quantityUsed: doc.totalQuantityUsed || 0,
              cost: doc.totalCost || 0,
              usedAt,
              items: (doc.items || []).map((item: any) => ({
                itemName: item.itemName || 'Unknown',
                quantityUsed: item.quantityUsed || 0,
              })),
            });
          });
        } catch (err) {
          console.error('used_stock enrichment error:', err);
        }
      }

      const finalData: StockWithDetails[] = stockData.map(item => {
        const stockInfo = stockMap.get(item._id?.toString() || '');
        const currentStock = stockInfo?.currentStock || 0;
        const minimumStock = stockInfo?.minimumStock || 0;
        
        let stockStatus: 'normal' | 'low' | 'critical' = 'normal';
        if (currentStock <= 0) stockStatus = 'critical';
        else if (currentStock <= minimumStock) stockStatus = 'low';
        
        const sid = item._id?.toString() || '';
        const menuItems = menuItemsByStock.get(sid) || [];
        const uniqueOrders = stockOrderCounts.get(sid)?.size || 0;

        // Build dailyUsage array sorted by date
        const dayMap = dailyUsageByStock.get(sid) || new Map();
        const dailyUsage = Array.from(dayMap.entries())
          .map(([date, data]) => ({
            date,
            quantity: parseFloat(data.quantity.toFixed(3)),
            cost: parseFloat(data.cost.toFixed(2)),
            ordersCount: data.orders.size,
          }))
          .sort((a, b) => a.date.localeCompare(b.date));

        // Build usageRecords sorted by date desc
        const usageRecords = (usageRecordsByStock.get(sid) || [])
          .sort((a, b) => new Date(b.usedAt).getTime() - new Date(a.usedAt).getTime());
        
        return {
          stockId: sid,
          stockName: item.stockName || 'Unknown',
          stockCategory: item.stockCategory || 'General',
          stockUnit: item.stockUnit || 'unit',
          totalQuantityUsed: item.totalQuantityUsed || 0,
          totalCost: item.totalCost || 0,
          frequency: item.frequency || 0,
          totalOrders: uniqueOrders,
          currentStock,
          minimumStock,
          stockStatus,
          lastUsed: item.lastUsed || null,
          lastRestockedAt: lastRestockMap.get(sid) || null,
          menuItems,
          dailyUsage,
          usageRecords,
        };
      });

      const totalQuantityUsed = finalData.reduce((sum, s) => sum + s.totalQuantityUsed, 0);
      const totalCost = finalData.reduce((sum, s) => sum + s.totalCost, 0);
      const totalProcessedMenuItems = finalData.reduce((sum, s) => sum + s.menuItems.length, 0);
      const totalUniqueOrders = finalData.reduce((sum, s) => sum + s.totalOrders, 0);

      return NextResponse.json({
        success: true,
        data: finalData,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        },
        summary: {
          totalStocks: finalData.length,
          totalQuantityUsed,
          totalCost,
          totalFrequency: totalFrequencyAllPages,
          totalProcessedMenuItems,
          totalUniqueOrders
        }
      });

    } else {
      // ============================================
      // MENU ITEM REPORT - FROM ORDERS COLLECTION
      // ============================================
      
      console.log(`[Menu Report] Date range from=${from}, to=${to}`);
      console.log(`[Menu Report] Date filter applied:`, orderDateFilter);
      
      // Step 1: Get total counts for ALL orders (for validation)
      const allOrdersCount = await db.collection("orders").countDocuments(orderDateFilter);
      console.log(`[Menu Report] Total orders in date range: ${allOrdersCount}`);
      
      // Step 2: Get total revenue from ALL orders in date range
      const allOrdersRevenue = await db.collection("orders").aggregate([
        { $match: orderDateFilter },
        { $group: { _id: null, total: { $sum: "$total" } } }
      ]).toArray();
      const grandTotalRevenueAll = allOrdersRevenue[0]?.total || 0;
      console.log(`[Menu Report] Total revenue in date range: ${grandTotalRevenueAll} Birr`);
      
      // Step 3: Build pipeline for menu items aggregation
      const menuItemsPipeline: any[] = [];
      
      // Add match stage with date filter (if any)
      if (Object.keys(orderDateFilter).length > 0) {
        menuItemsPipeline.push({ $match: orderDateFilter });
      }
      
      // Unwind items array to get individual items per order
      menuItemsPipeline.push({ $unwind: "$items" });
      
      // Add search filter if needed
      if (search) {
        if (searchType === 'stock') {
          // Find menu items that used matching stocks
          const matchingItemIds = await findMenuItemIdsBySearch(db, search, stockDateFilter);
          if (matchingItemIds.length > 0) {
            const objectIds = matchingItemIds.map(id => {
              try { return new ObjectId(id); } catch { return id; }
            });
            menuItemsPipeline.push({
              $match: { "items.itemId": { $in: objectIds } }
            });
          } else {
            // No matching stocks = no results
            menuItemsPipeline.push({ $match: { "items.itemId": { $in: [] } } });
          }
        } else if (searchType === 'all') {
          // Search both menu item names AND stock-based menu items
          const matchingItemIds = await findMenuItemIdsBySearch(db, search, stockDateFilter);
          const orConditions: any[] = [
            { "items.itemName": { $regex: search, $options: 'i' } }
          ];
          if (matchingItemIds.length > 0) {
            const objectIds = matchingItemIds.map(id => {
              try { return new ObjectId(id); } catch { return id; }
            });
            orConditions.push({ "items.itemId": { $in: objectIds } });
          }
          menuItemsPipeline.push({ $match: { $or: orConditions } });
        } else {
          // Default: search by menu item name only
          menuItemsPipeline.push({
            $match: { "items.itemName": { $regex: search, $options: 'i' } }
          });
        }
      }
      
      // Group by itemId to aggregate all occurrences
      menuItemsPipeline.push({
        $group: {
          _id: "$items.itemId",
          itemName: { $first: "$items.itemName" },
          totalQuantity: { $sum: { $ifNull: ["$items.quantity", 0] } },
          frequency: { $sum: 1 },  // Count of orders containing this item
          totalRevenue: { 
            $sum: { 
              $multiply: [
                { $ifNull: ["$items.quantity", 0] },
                { $ifNull: ["$items.unitPrice", 0] }
              ]
            }
          },
          totalOrderIds: { $addToSet: "$_id" },  // Track unique order IDs
          lastOrderDate: { $max: "$createdAt" },
          avgUnitPrice: { $avg: { $ifNull: ["$items.unitPrice", 0] } }
        }
      });
      
      // Execute to get ALL menu items (not paginated yet)
      let allMenuItemsData: any[] = [];
      try {
        allMenuItemsData = await db.collection("orders")
          .aggregate(menuItemsPipeline, { allowDiskUse: true })
          .toArray();
        
        console.log(`[Menu Report] Found ${allMenuItemsData.length} unique menu items from orders`);
        
        // Calculate total revenue from this aggregation to verify
        const totalRevenueFromAgg = allMenuItemsData.reduce((sum, i) => sum + (i.totalRevenue || 0), 0);
        console.log(`[Menu Report] Total revenue from aggregation: ${totalRevenueFromAgg.toFixed(2)} Birr`);
        
        // Log discrepancy if any
        if (Math.abs(totalRevenueFromAgg - grandTotalRevenueAll) > 1) {
          console.warn(`[Menu Report] Revenue mismatch: Agg=${totalRevenueFromAgg}, Total=${grandTotalRevenueAll}`);
        }
        
      } catch (err) {
        console.error("Error fetching menu items from orders:", err);
        allMenuItemsData = [];
      }
      
      // Step 4: Apply sorting to ALL items
      const sortDirection = sortOrder === 'asc' ? 1 : -1;
      allMenuItemsData.sort((a, b) => {
        if (sortBy === 'name') {
          return sortDirection * (a.itemName || '').localeCompare(b.itemName || '');
        } else if (sortBy === 'usage') {
          return sortDirection * ((a.totalQuantity || 0) - (b.totalQuantity || 0));
        } else if (sortBy === 'revenue') {
          return sortDirection * ((a.totalRevenue || 0) - (b.totalRevenue || 0));
        } else {
          // Default: sort by frequency
          return sortDirection * ((a.frequency || 0) - (b.frequency || 0));
        }
      });
      
      const total = allMenuItemsData.length;
      const paginatedItems = allMenuItemsData.slice(skip, skip + limit);
      
      console.log(`[Menu Report] Pagination: page=${page}, limit=${limit}, total=${total}, pages=${Math.ceil(total/limit)}`);
      
      // Step 5: Get stock usage data for paginated menu items (ingredient tracking)
      const itemIds = paginatedItems.map(item => item._id).filter((id): id is string => id !== null && id !== undefined);
      let stockUsageMap = new Map<string, any[]>();
      
      if (itemIds.length > 0) {
        try {
          // Convert string IDs to ObjectId for MongoDB query
          const objectIds = itemIds.map(id => {
            try { return new ObjectId(id); } catch { return id; }
          });
          
          // Apply the same date filter so ingredients shown match the selected period
          const stockPipeline = [
            { $match: { ...stockDateFilter, "items.itemId": { $in: objectIds } } },
            { $unwind: "$items" },
            { $match: { "items.itemId": { $in: objectIds } } },
            {
              $group: {
                _id: {
                  itemId: "$items.itemId",
                  stockId: "$stockId"
                },
                itemId: { $first: "$items.itemId" },
                stockName: { $first: "$stockName" },
                stockCategory: { $first: "$stockCategory" },
                stockUnit: { $first: "$stockUnit" },
                quantityUsed: { $sum: "$items.quantityUsed" },
                totalCost: { $sum: "$totalCost" }
              }
            },
            {
              $group: {
                _id: "$itemId",
                stocks: {
                  $push: {
                    stockId: "$_id.stockId",
                    stockName: "$stockName",
                    stockCategory: "$stockCategory",
                    stockUnit: "$stockUnit",
                    quantityUsed: "$quantityUsed",
                    totalCost: "$totalCost"
                  }
                }
              }
            }
          ];
          
          const stockData = await db.collection("used_stock")
            .aggregate(stockPipeline, { allowDiskUse: true })
            .toArray();
          
          stockData.forEach(item => {
            stockUsageMap.set(item._id?.toString() || '', item.stocks);
          });
          
          console.log(`[Menu Report] Found stock usage for ${stockUsageMap.size} menu items`);
          
        } catch (err) {
          console.error("Error fetching stock usage:", err);
        }
      }
      
      // Step 5.5: Get daily usage for paginated menu items
      const dailyUsageByMenuItem = new Map<string, Map<string, { quantity: number; revenue: number; orders: Set<string> }>>();
      if (itemIds.length > 0) {
        try {
          const objectIdsDaily = itemIds.map(id => {
            try { return new ObjectId(id); } catch { return id; }
          });
          const dateMatchPipeline: any[] = [];
          if (Object.keys(orderDateFilter).length > 0) {
            dateMatchPipeline.push({ $match: orderDateFilter });
          }
          const dailyPipeline = [
            ...dateMatchPipeline,
            { $unwind: "$items" },
            { $match: { "items.itemId": { $in: objectIdsDaily } } },
            {
              $group: {
                _id: {
                  itemId: "$items.itemId",
                  date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }
                },
                quantity: { $sum: { $ifNull: ["$items.quantity", 0] } },
                revenue: { $sum: { $multiply: [{ $ifNull: ["$items.quantity", 0] }, { $ifNull: ["$items.unitPrice", 0] }] } },
                orderIds: { $addToSet: "$_id" }
              }
            }
          ];
          const dailyResults = await db.collection("orders")
            .aggregate(dailyPipeline, { allowDiskUse: true })
            .toArray();
          
          dailyResults.forEach((doc: any) => {
            const itemId = doc._id?.itemId?.toString() || '';
            const date = doc._id?.date || '';
            if (!itemId || !date) return;
            if (!dailyUsageByMenuItem.has(itemId)) dailyUsageByMenuItem.set(itemId, new Map());
            const dayMap = dailyUsageByMenuItem.get(itemId)!;
            dayMap.set(date, {
              quantity: doc.quantity || 0,
              revenue: doc.revenue || 0,
              orders: new Set(doc.orderIds || []),
            });
          });
        } catch (err) {
          console.error('dailyUsage for menu items error:', err);
        }
      }

      // Step 6: Build final data structure
      const finalData: FinalMenuItemData[] = paginatedItems.map(item => {
        const stocks = stockUsageMap.get(item._id?.toString() || '') || [];
        const totalStockQuantity = stocks.reduce((sum: number, s: any) => sum + (s.quantityUsed || 0), 0);
        
        // Build dailyUsage array sorted by date
        const dayMap = dailyUsageByMenuItem.get(item._id?.toString() || '') || new Map();
        const dailyUsage = Array.from(dayMap.entries())
          .map(([date, data]) => ({
            date,
            quantity: parseFloat((data.quantity || 0).toFixed(3)),
            revenue: parseFloat((data.revenue || 0).toFixed(2)),
            ordersCount: data.orders.size,
          }))
          .sort((a, b) => a.date.localeCompare(b.date));
        
        return {
          itemId: item._id?.toString() || '',
          itemName: item.itemName || 'Unknown',
          totalQuantity: item.totalQuantity || 0,
          frequency: item.frequency || 0,
          totalOrders: item.totalOrderIds?.length || 0,
          totalRevenue: item.totalRevenue || 0,
          averagePrice: item.avgUnitPrice || 0,
          lastOrderDate: item.lastOrderDate || null,
          stocksUsed: stocks.map((s: any) => ({
            stockId: s.stockId?.toString() || '',
            stockName: s.stockName || 'Unknown',
            stockCategory: s.stockCategory || 'General',
            stockUnit: s.stockUnit || 'unit',
            quantityUsed: s.quantityUsed || 0,
            totalCost: s.totalCost || 0,
            percentageOfItem: totalStockQuantity > 0 ? (s.quantityUsed / totalStockQuantity) * 100 : 0
          })),
          dailyUsage,
        };
      });
      
      // Step 7: Calculate summary from ALL menu items (not just paginated)
      const summaryTotalRevenue = allMenuItemsData.reduce((sum, i) => sum + (i.totalRevenue || 0), 0);
      const summaryTotalOrders = allMenuItemsData.reduce((sum, i) => sum + (i.totalOrderIds?.length || 0), 0);
      
      console.log(`=== MENU ITEM REPORT SUMMARY ===`);
      console.log(`Total Unique Menu Items: ${total}`);
      console.log(`Total Revenue (All): ${summaryTotalRevenue.toFixed(2)} Birr`);
      console.log(`Total Orders (All): ${summaryTotalOrders}`);
      console.log(`Displaying: ${finalData.length} items (page ${page} of ${Math.ceil(total/limit)})`);
      console.log(`================================`);
      
      return NextResponse.json({
        success: true,
        data: finalData,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        },
        summary: {
          totalItems: total,
          totalRevenue: summaryTotalRevenue,
          totalOrders: summaryTotalOrders
        }
      });
    }

  } catch (error) {
    console.error("Report API Error:", error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to generate report",
      },
      { status: 500 }
    );
  }
}
