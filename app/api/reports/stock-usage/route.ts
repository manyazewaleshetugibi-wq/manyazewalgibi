import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

// Type definitions
interface DateFilter {
  createdAt?: {
    gte: Date;
    lte: Date;
  };
  usedAt?: {
    gte: Date;
    lte: Date;
  };
}

interface StockGroupResult {
  _id: string;
  stockName: string;
  stockCategory: string;
  stockUnit: string;
  totalQuantityUsed: number;
  totalCost: number;
  frequency: number;
  lastUsed: Date | null;
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
async function findStockIdsByMenuItemSearch(search: string, dateFilter: any): Promise<string[]> {
  try {
    const docs = await prisma.usedStock.findMany({
      where: dateFilter,
      select: { stockId: true, items: true },
    });
    const lowerSearch = search.toLowerCase();
    const stockIds = new Set<string>();
    docs.forEach((doc) => {
      const items = (doc.items as any) || [];
      if (items.some((item: any) => item.itemName && String(item.itemName).toLowerCase().includes(lowerSearch))) {
        if (doc.stockId) stockIds.add(doc.stockId);
      }
    });
    return Array.from(stockIds);
  } catch (err) {
    console.error('findStockIdsByMenuItemSearch error:', err);
    return [];
  }
}

// Helper: find menuItemIds matching a search term
async function findMenuItemIdsBySearch(search: string, dateFilter: any): Promise<string[]> {
  try {
    const docs = await prisma.usedStock.findMany({
      where: dateFilter,
      select: { items: true },
    });
    const lowerSearch = search.toLowerCase();
    const itemIds = new Set<string>();
    docs.forEach((doc) => {
      const items = (doc.items as any) || [];
      items.forEach((item: any) => {
        if (item.itemName && String(item.itemName).toLowerCase().includes(lowerSearch) && item.itemId) {
          itemIds.add(String(item.itemId));
        }
      });
    });
    return Array.from(itemIds);
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
        gte: fromDate,
        lte: toDate,
      };

      stockDateFilter.usedAt = {
        gte: fromDate,
        lte: toDate,
      };


    } else {

    }

    if (groupBy === 'stock') {
      // ============================================
      // STOCK REPORT - from used_stock collection
      // ============================================

      const where: any = { ...stockDateFilter };

      if (search) {
        if (searchType === 'menu') {
          // Search by menu item names - find stockIds that were used by matching menu items
          const matchingStockIds = await findStockIdsByMenuItemSearch(search, stockDateFilter);
          where.stockId = matchingStockIds.length > 0
            ? { in: matchingStockIds }
            : { in: [] }; // No match = empty result
        } else if (searchType === 'all') {
          // Search both stock names AND menu item names
          const matchingStockIdsFromMenu = await findStockIdsByMenuItemSearch(search, stockDateFilter);
          where.OR = [
            { stockName: { contains: search, mode: 'insensitive' } },
            { stockCategory: { contains: search, mode: 'insensitive' } },
            ...(matchingStockIdsFromMenu.length > 0
              ? [{ stockId: { in: matchingStockIdsFromMenu } }]
              : [])
          ];
        } else {
          // Default: search by stock name/category only
          where.OR = [
            { stockName: { contains: search, mode: 'insensitive' } },
            { stockCategory: { contains: search, mode: 'insensitive' } }
          ];
        }
      }

      // Fetch all matching used_stock docs and group in JS
      const allDocs = await prisma.usedStock.findMany({ where });

      const groups = new Map<string, StockGroupResult>();
      allDocs.forEach((doc) => {
        const sid = doc.stockId || '';
        if (!groups.has(sid)) {
          groups.set(sid, {
            _id: sid,
            stockName: doc.stockName || '',
            stockCategory: doc.stockCategory || '',
            stockUnit: doc.stockUnit || '',
            totalQuantityUsed: 0,
            totalCost: 0,
            frequency: 0,
            lastUsed: null,
          });
        }
        const g = groups.get(sid)!;
        g.totalQuantityUsed += doc.totalQuantityUsed || 0;
        g.totalCost += doc.totalCost || 0;
        g.frequency += 1;
        if (doc.usedAt && (!g.lastUsed || doc.usedAt > g.lastUsed)) {
          g.lastUsed = doc.usedAt;
        }
      });

      let stockData: StockGroupResult[] = Array.from(groups.values());
      stockData.forEach((s) => {
        s.totalQuantityUsed = parseFloat(s.totalQuantityUsed.toFixed(3));
        s.totalCost = parseFloat(s.totalCost.toFixed(2));
      });

      // Get total count and total frequency across ALL stocks (not just paginated page)
      const total = stockData.length;
      const totalFrequencyAllPages = stockData.reduce((sum, s) => sum + s.frequency, 0);

      // Apply sorting
      const sortDirection = sortOrder === 'asc' ? 1 : -1;
      stockData.sort((a, b) => {
        if (sortBy === 'name') {
          return sortDirection * (a.stockName || '').localeCompare(b.stockName || '');
        } else if (sortBy === 'usage') {
          return sortDirection * ((a.totalQuantityUsed || 0) - (b.totalQuantityUsed || 0));
        }
        return sortDirection * ((a.frequency || 0) - (b.frequency || 0));
      });

      // Apply pagination
      const paginatedData = stockData.slice(skip, skip + limit);

      // Enrich with current stock data
      const stockIds = paginatedData.map(s => s._id).filter((id): id is string => id !== null && id !== '');
      const stocksData = await prisma.stock.findMany({
        where: { id: { in: stockIds } },
      });

      const stockMap = new Map<string, any>();
      stocksData.forEach(stock => {
        stockMap.set(stock.id, stock);
      });

      // Fetch last restock date per stock from stock_purchases
      const lastRestockMap = new Map<string, Date>();
      if (stockIds.length > 0) {
        try {
          const purchases = await prisma.stockPurchase.findMany({
            where: { stockId: { in: stockIds } },
            select: { stockId: true, purchaseDate: true },
          });
          // Group by stockId, find most recent purchaseDate
          const purchaseGroups = new Map<string, Date>();
          purchases.forEach((p: any) => {
            const sid = p.stockId?.toString() || '';
            const pDate = p.purchaseDate ? new Date(p.purchaseDate) : new Date(0);
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
      const stockIdStrings = paginatedData.map(s => s._id).filter(Boolean);
      let menuItemsByStock = new Map<string, any[]>();
      const stockOrderCounts = new Map<string, Set<string>>();
      const dailyUsageByStock = new Map<string, Map<string, { quantity: number; cost: number; orders: Set<string> }>>();
      const usageRecordsByStock = new Map<string, Array<{
        orderId: string; orderNumber: string; quantityUsed: number; cost: number; usedAt: Date;
        items: Array<{ itemName: string; quantityUsed: number }>;
      }>>();

      if (stockIdStrings.length > 0) {
        try {
          const allUsedDocsRaw = await prisma.usedStock.findMany({
            where: { ...stockDateFilter, stockId: { in: stockIds } },
          });
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
            const items = (doc.items as any) || [];
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
              items: ((doc.items as any) || []).map((item: any) => ({
                itemName: item.itemName || 'Unknown',
                quantityUsed: item.quantityUsed || 0,
              })),
            });
          });
        } catch (err) {
          console.error('used_stock enrichment error:', err);
        }
      }

      const finalData: StockWithDetails[] = paginatedData.map(item => {
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




      // Step 1: Get total counts for ALL orders (for validation)
      const allOrdersCount = await prisma.order.count({ where: orderDateFilter });


      // Step 2: Get total revenue from ALL orders in date range
      const allOrders = await prisma.order.findMany({
        where: orderDateFilter,
        select: { id: true, createdAt: true, items: true, totalAmount: true },
      });
      const grandTotalRevenueAll = allOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);


      // Step 3: Aggregate menu items from orders in JS
      const matchingItemIds = search ? await findMenuItemIdsBySearch(search, stockDateFilter) : [];
      const menuGroups = new Map<string, any>();

      allOrders.forEach((order) => {
        const orderItems = (order.items as any) || [];
        const orderId = order.id;
        orderItems.forEach((item: any) => {
          const itemId = item?.itemId ? String(item.itemId) : (item?.itemName ? String(item.itemName) : null);
          if (!itemId) return;

          // Apply search filter
          if (search) {
            if (searchType === 'stock') {
              // Find menu items that used matching stocks
              if (!(matchingItemIds.length > 0 && matchingItemIds.includes(itemId))) return;
            } else if (searchType === 'all') {
              // Search both menu item names AND stock-based menu items
              const nameMatch = item.itemName && String(item.itemName).toLowerCase().includes(search.toLowerCase());
              const idMatch = matchingItemIds.includes(itemId);
              if (!nameMatch && !idMatch) return;
            } else {
              // Default: search by menu item name only
              if (!(item.itemName && String(item.itemName).toLowerCase().includes(search.toLowerCase()))) return;
            }
          }

          if (!menuGroups.has(itemId)) {
            menuGroups.set(itemId, {
              _id: itemId,
              itemName: item.itemName || 'Unknown',
              totalQuantity: 0,
              frequency: 0, // Count of orders containing this item
              totalRevenue: 0,
              totalOrderIds: new Set<string>(), // Track unique order IDs
              lastOrderDate: null as Date | null,
              avgUnitPrice: 0,
              avgCount: 0,
            });
          }

          const g = menuGroups.get(itemId)!;
          const quantity = item.quantity || 0;
          const unitPrice = item.unitPrice || 0;
          g.totalQuantity += quantity;
          g.frequency += 1;
          g.totalRevenue += quantity * unitPrice;
          g.totalOrderIds.add(orderId);
          if (order.createdAt && (!g.lastOrderDate || order.createdAt > g.lastOrderDate)) {
            g.lastOrderDate = order.createdAt;
          }
          g.avgUnitPrice += unitPrice;
          g.avgCount += 1;
        });
      });

      // Execute to get ALL menu items (not paginated yet)
      let allMenuItemsData: any[] = Array.from(menuGroups.values()).map((g: any) => ({
        _id: g._id,
        itemName: g.itemName,
        totalQuantity: g.totalQuantity,
        frequency: g.frequency,
        totalRevenue: g.totalRevenue,
        totalOrderIds: Array.from(g.totalOrderIds),
        lastOrderDate: g.lastOrderDate,
        avgUnitPrice: g.avgCount > 0 ? g.avgUnitPrice / g.avgCount : 0,
      }));



      // Calculate total revenue from this aggregation to verify
      const totalRevenueFromAgg = allMenuItemsData.reduce((sum, i) => sum + (i.totalRevenue || 0), 0);


      // Log discrepancy if any
      if (Math.abs(totalRevenueFromAgg - grandTotalRevenueAll) > 1) {
        console.warn(`[Menu Report] Revenue mismatch: Agg=${totalRevenueFromAgg}, Total=${grandTotalRevenueAll}`);
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
        }
        // Default: sort by frequency
        return sortDirection * ((a.frequency || 0) - (b.frequency || 0));
      });

      const total = allMenuItemsData.length;
      const paginatedItems = allMenuItemsData.slice(skip, skip + limit);



      // Step 5: Get stock usage data for paginated menu items (ingredient tracking)
      const itemIds = paginatedItems.map(item => item._id).filter((id): id is string => id !== null && id !== undefined);
      let stockUsageMap = new Map<string, any[]>();

      if (itemIds.length > 0) {
        try {
          // Apply the same date filter so ingredients shown match the selected period
          const usedDocs = await prisma.usedStock.findMany({ where: stockDateFilter });
          const stockGroupMap = new Map<string, Map<string, any>>();

          usedDocs.forEach((doc) => {
            const items = (doc.items as any) || [];
            const docTotalCost = doc.totalCost || 0;
            items.forEach((item: any) => {
              const iid = item?.itemId ? String(item.itemId) : null;
              if (!iid || !itemIds.includes(iid)) return;
              const sid = doc.stockId?.toString() || '';
              const key = `${iid}|${sid}`;
              if (!stockGroupMap.has(iid)) stockGroupMap.set(iid, new Map());
              const inner = stockGroupMap.get(iid)!;
              if (!inner.has(key)) {
                inner.set(key, {
                  stockId: sid,
                  stockName: doc.stockName || '',
                  stockCategory: doc.stockCategory || '',
                  stockUnit: doc.stockUnit || '',
                  quantityUsed: 0,
                  totalCost: 0,
                });
              }
              const entry = inner.get(key)!;
              entry.quantityUsed += item.quantityUsed || 0;
              entry.totalCost += docTotalCost;
            });
          });

          stockGroupMap.forEach((inner, iid) => {
            stockUsageMap.set(iid, Array.from(inner.values()));
          });



        } catch (err) {
          console.error("Error fetching stock usage:", err);
        }
      }

      // Step 5.5: Get daily usage for paginated menu items
      const dailyUsageByMenuItem = new Map<string, Map<string, { quantity: number; revenue: number; orders: Set<string> }>>();
      if (itemIds.length > 0) {
        try {
          allOrders.forEach((order) => {
            const orderItems = (order.items as any) || [];
            if (!order.createdAt) return;
            const dateKey = order.createdAt.toISOString().split('T')[0];
            orderItems.forEach((item: any) => {
              const iid = item?.itemId ? String(item.itemId) : null;
              if (!iid || !itemIds.includes(iid)) return;
              const quantity = item.quantity || 0;
              const revenue = quantity * (item.unitPrice || 0);

              if (!dailyUsageByMenuItem.has(iid)) dailyUsageByMenuItem.set(iid, new Map());
              const dayMap = dailyUsageByMenuItem.get(iid)!;
              if (!dayMap.has(dateKey)) dayMap.set(dateKey, { quantity: 0, revenue: 0, orders: new Set() });
              const dayEntry = dayMap.get(dateKey)!;
              dayEntry.quantity += quantity;
              dayEntry.revenue += revenue;
              dayEntry.orders.add(order.id);
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
