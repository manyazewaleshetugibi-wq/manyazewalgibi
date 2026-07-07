import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

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
  menuItems: any[];
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
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const url = new URL(req.url);
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');
    const groupBy = url.searchParams.get('groupBy') || 'stock';
    const search = url.searchParams.get('search') || '';
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
      // Parse as Ethiopia local time (UTC+3): local midnight = UTC midnight - 3h
      const ETH_OFFSET_MS = 3 * 60 * 60 * 1000
      const fromDate = new Date(new Date(from).setHours(0, 0, 0, 0) - ETH_OFFSET_MS);
      const toDate = new Date(new Date(to).setHours(23, 59, 59, 999) - ETH_OFFSET_MS);
      
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
        matchStage.$match = {
          ...stockDateFilter,
          $or: [
            { stockName: { $regex: search, $options: 'i' } },
            { stockCategory: { $regex: search, $options: 'i' } }
          ]
        };
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

      // Get total count
      let total = 0;
      try {
        const countPipeline = pipeline.filter(p => !p.$skip && !p.$limit);
        const countResult = await db.collection("used_stock")
          .aggregate([...countPipeline, { $count: "total" }], { allowDiskUse: true })
          .toArray();
        total = countResult[0]?.total || 0;
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

      // Fetch menuItems that used each stock in the date range
      const stockIdStrings = stockData.map(s => s._id?.toString()).filter(Boolean);
      let menuItemsByStock = new Map<string, any[]>();
      if (stockIdStrings.length > 0) {
        try {
          const usedStockDocs = await db.collection("used_stock")
            .find({ ...stockDateFilter, stockId: { $in: stockIdStrings } })
            .toArray();
          // Group by stockId, collect unique itemName + sum quantityUsed
          const grouped = new Map<string, Map<string, { itemName: string; quantityUsed: number; servingsCount: number }>>();
          usedStockDocs.forEach((doc: any) => {
            const sid = doc.stockId?.toString() || '';
            if (!grouped.has(sid)) grouped.set(sid, new Map());
            const itemKey = doc.itemId?.toString() || doc.itemName || 'Unknown';
            const existing = grouped.get(sid)!.get(itemKey);
            if (existing) {
              existing.quantityUsed += doc.totalQuantityUsed || 0;
              existing.servingsCount += 1;
            } else {
              grouped.get(sid)!.set(itemKey, {
                itemName: doc.itemName || 'Unknown',
                quantityUsed: doc.totalQuantityUsed || 0,
                servingsCount: 1,
              });
            }
          });
          grouped.forEach((itemMap, sid) => {
            menuItemsByStock.set(sid, Array.from(itemMap.values()));
          });
        } catch (err) {
          console.error('menuItems fetch error:', err);
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
        return {
          stockId: sid,
          stockName: item.stockName || 'Unknown',
          stockCategory: item.stockCategory || 'General',
          stockUnit: item.stockUnit || 'unit',
          totalQuantityUsed: item.totalQuantityUsed || 0,
          totalCost: item.totalCost || 0,
          frequency: item.frequency || 0,
          totalOrders: 0,
          currentStock,
          minimumStock,
          stockStatus,
          lastUsed: item.lastUsed || null,
          menuItems: menuItemsByStock.get(sid) || []
        };
      });

      const totalQuantityUsed = finalData.reduce((sum, s) => sum + s.totalQuantityUsed, 0);
      const totalCost = finalData.reduce((sum, s) => sum + s.totalCost, 0);

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
          totalCost
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
        menuItemsPipeline.push({
          $match: { "items.itemName": { $regex: search, $options: 'i' } }
        });
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
      
      // Step 6: Build final data structure
      const finalData: FinalMenuItemData[] = paginatedItems.map(item => {
        const stocks = stockUsageMap.get(item._id?.toString() || '') || [];
        const totalStockQuantity = stocks.reduce((sum: number, s: any) => sum + (s.quantityUsed || 0), 0);
        
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
          }))
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
