// app/api/search/route.ts
import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function GET(request: Request) {
  try {
    const client = await clientPromise;
    const db = client.db("gold");
    
    const { searchParams } = new URL(request.url);
    
    const query = searchParams.get("q") || "";
    const searchType = searchParams.get("type") || "all";
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const waiterId = searchParams.get("waiterId");
    const restaurantId = searchParams.get("restaurantId");
    const status = searchParams.get("status");
    const orderType = searchParams.get("orderType");
    const stockStatus = searchParams.get("stockStatus");
    const userRole = searchParams.get("userRole");
    const sortBy = searchParams.get("sortBy") || "relevance";
    const limit = parseInt(searchParams.get("limit") || "500");
    
    // Build date filter for orders
    let dateFilter: any = {};
    if (startDate && endDate) {
      dateFilter = {
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate + "T23:59:59.999Z")
        }
      };
    }
    
    // ============ ORDERS SEARCH ============
    let orderQuery: any = { ...dateFilter };
    
    if (query) {
      orderQuery.$or = [
        { orderNumber: { $regex: query, $options: "i" } },
        { customerName: { $regex: query, $options: "i" } },
        { tableNumber: { $regex: query, $options: "i" } },
        { specialRequirements: { $regex: query, $options: "i" } },
        { "deliveryInfo.fullName": { $regex: query, $options: "i" } },
        { "deliveryInfo.phoneNumber": { $regex: query, $options: "i" } },
        { waiterName: { $regex: query, $options: "i" } }
      ];
    }
    
    if (waiterId && waiterId !== "all" && ObjectId.isValid(waiterId)) {
      orderQuery.waiterId = new ObjectId(waiterId);
    }
    
    if (restaurantId && restaurantId !== "all") {
      if (restaurantId === "manyazewal1") {
        orderQuery.$or = [
          { restaurantId: "manyazewal1" },
          { delivery: true },
          { restaurantName: { $regex: "1|Manyazewal Eshetu Gibi 1", $options: "i" } }
        ];
      } else if (restaurantId === "manyazewal2") {
        orderQuery.$or = [
          { restaurantId: "manyazewal2" },
          { restaurantName: { $regex: "2|Manyazewal Eshetu Gibi 2", $options: "i" } }
        ];
      }
    }
    
    if (status && status !== "all") {
      orderQuery.status = status;
    }
    
    if (orderType && orderType !== "all") {
      if (orderType === "intable") orderQuery.inTable = true;
      else if (orderType === "delivery") orderQuery.delivery = true;
      else if (orderType === "pos") {
        orderQuery.inTable = { $ne: true };
        orderQuery.delivery = { $ne: true };
      }
    }
    
    // Determine sort order
    let sortOrder: any = { createdAt: -1 };
    if (sortBy === "date_asc") sortOrder = { createdAt: 1 };
    else if (sortBy === "amount_desc") sortOrder = { finalAmount: -1 };
    else if (sortBy === "amount_asc") sortOrder = { finalAmount: 1 };
    
    // Fetch orders
    let orders = await db.collection("orders")
      .find(orderQuery)
      .sort(sortOrder)
      .limit(limit)
      .toArray();
    
    // Fetch waitresses for waiter names
    const waitresses = await db.collection("waitresses").find({}).toArray();
    const waitressMap = new Map(waitresses.map(w => [w._id.toString(), w]));
    
    // Enhance orders with waiter names and format items
    orders = orders.map(order => ({
      ...order,
      waiterName: order.waiterId ? waitressMap.get(order.waiterId.toString())?.name || order.waiterName || "Unknown" : order.waiterName || "Unknown",
      items: order.items || order.orderItems || [],
      finalAmount: order.finalAmount || 0,
      totalAmount: order.totalAmount || 0,
      discount: order.discount || 0,
      tax: order.tax || 0
    }));
    
    // ============ ANALYTICS CALCULATIONS ============
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, order) => sum + (order.finalAmount || 0), 0);
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const completedOrders = orders.filter(o => o.status === "COMPLETED").length;
    const completionRate = totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0;
    
    // Daily distribution
    const dailyDistribution: Record<string, number> = {};
    orders.forEach(order => {
      const day = new Date(order.createdAt).toLocaleDateString();
      dailyDistribution[day] = (dailyDistribution[day] || 0) + 1;
    });

    // Orders by status
    const ordersByStatus: Record<string, number> = {};
    orders.forEach(order => {
      ordersByStatus[order.status] = (ordersByStatus[order.status] || 0) + 1;
    });
    
    // Orders by payment method
    const ordersByPaymentMethod: Record<string, number> = {};
    orders.forEach(order => {
      const method = order.paymentMethod || "CASH";
      ordersByPaymentMethod[method] = (ordersByPaymentMethod[method] || 0) + 1;
    });
    
    // Popular order types
    const popularOrderTypes: Record<string, number> = {
      intable: orders.filter(o => o.inTable === true).length,
      delivery: orders.filter(o => o.delivery === true).length,
      pos: orders.filter(o => !o.inTable && !o.delivery).length
    };
    
    // Hourly distribution
    const hourlyDistribution: Record<number, number> = {};
    orders.forEach(order => {
      const hour = new Date(order.createdAt).getHours();
      hourlyDistribution[hour] = (hourlyDistribution[hour] || 0) + 1;
    });
    
    // Restaurant distribution
    const restaurantDistribution: Record<string, number> = {};
    orders.forEach(order => {
      let restaurantName = order.restaurantName || "Unknown";
      if (order.delivery) restaurantName = "Manyazewal 1 (Delivery)";
      else if (order.restaurantId === "manyazewal1") restaurantName = "Manyazewal 1";
      else if (order.restaurantId === "manyazewal2") restaurantName = "Manyazewal 2";
      restaurantDistribution[restaurantName] = (restaurantDistribution[restaurantName] || 0) + 1;
    });
    
    // Top selling items - FIXED: Declare only once
    const itemSales: Record<string, { name: string; quantity: number; revenue: number; orderCount: number; averagePrice: number }> = {};
    
    // Resolve item names from items collection if they are missing in order documents
    const uniqueItemIdsInOrders = new Set<string>();
    orders.forEach(order => {
      (order.items || []).forEach((item: any) => {
        const id = item.itemId || item.menuItemId;
        if (id) uniqueItemIdsInOrders.add(id.toString());
      });
    });

    const itemNamesMap = new Map<string, string>();
    if (uniqueItemIdsInOrders.size > 0) {
      const validIds = Array.from(uniqueItemIdsInOrders).filter(id => ObjectId.isValid(id));
      if (validIds.length > 0) {
        const menuItems = await db.collection("items").find({
          _id: { $in: validIds.map(id => new ObjectId(id)) }
        }).toArray();
        menuItems.forEach(mi => itemNamesMap.set(mi._id?.toString() || mi.id, mi.name));
      }
    }

    orders.forEach(order => {
      const namesInThisOrder = new Set<string>();
      (order.items || []).forEach((item: any) => {
        const id = (item.itemId || item.menuItemId || "unknown").toString();
        const itemName = item.name || itemNamesMap.get(id) || id || "Unknown Item";
        
        if (!itemSales[itemName]) {
          itemSales[itemName] = { 
            name: itemName, 
            quantity: 0, 
            revenue: 0, 
            orderCount: 0,
            averagePrice: 0
          };
        }
        itemSales[itemName].quantity += item.quantity || 0;
        itemSales[itemName].revenue += item.subtotal || 0;
        namesInThisOrder.add(itemName);
      });
      namesInThisOrder.forEach(name => { 
        if (itemSales[name]) itemSales[name].orderCount++; 
      });
    });

    // Calculate average price and create top selling items array
    const topSellingItems = Object.values(itemSales)
      .map(item => ({
        ...item,
        averagePrice: item.quantity > 0 ? item.revenue / item.quantity : 0
      }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 20);
    
    // Top waiters
    const waiterStats: Record<string, { name: string; orders: number; sales: number; averageOrderValue: number }> = {};
    orders.forEach(order => {
      const waiterName = order.waiterName || "Unknown";
      if (!waiterStats[waiterName]) {
        waiterStats[waiterName] = { name: waiterName, orders: 0, sales: 0, averageOrderValue: 0 };
      }
      waiterStats[waiterName].orders++;
      waiterStats[waiterName].sales += order.finalAmount || 0;
    });
    
    Object.values(waiterStats).forEach(waiter => {
      waiter.averageOrderValue = waiter.orders > 0 ? waiter.sales / waiter.orders : 0;
    });
    
    const topWaiters = Object.values(waiterStats)
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 10);
    
    // ============ STOCKS SEARCH ============
    let stockQuery: any = {};
    if (query) {
      stockQuery.name = { $regex: query, $options: "i" };
    }
    
    let stocks = await db.collection("stocks").find(stockQuery).limit(limit).toArray();
    
    // Get categories
    const stockCategories = await db.collection("stock_categories").find({}).toArray();
    const categoryMap = new Map(stockCategories.map(c => [c._id.toString(), c.name]));
    
    // Get purchases and usages
    const stockIds = stocks.map(s => s._id.toString());
    let purchases: any[] = [];
    let usages: any[] = [];
    
    if (stockIds.length > 0) {
      purchases = await db.collection("stock_purchases")
        .find({ stockId: { $in: stockIds.map(id => new ObjectId(id)) } })
        .toArray();
      
      usages = await db.collection("used_stock")
        .find({ stockId: { $in: stockIds.map(id => new ObjectId(id)) } })
        .toArray();
    }
    
    // Calculate totals
    const stockPurchaseMap = new Map();
    const stockUsageMap = new Map();
    const stockOrderMap = new Map();
    
    purchases.forEach(p => {
      const id = p.stockId.toString();
      stockPurchaseMap.set(id, (stockPurchaseMap.get(id) || 0) + (p.quantity || 0));
    });
    
    usages.forEach(u => {
      const id = u.stockId.toString();
      const qty = u.totalQuantityUsed || u.quantity || 0;
      stockUsageMap.set(id, (stockUsageMap.get(id) || 0) + qty);
      if (u.orderId) {
        const ordersSet = stockOrderMap.get(id) || new Set();
        ordersSet.add(u.orderId.toString());
        stockOrderMap.set(id, ordersSet);
      }
    });
    
    // Apply stock status filter
    if (stockStatus && stockStatus !== "all") {
      stocks = stocks.filter(stock => {
        const ratio = (stock.currentStock || 0) / (stock.minimumStock || 1);
        let stockStat = "good";
        if (stock.currentStock === 0 || ratio <= 0.5) stockStat = "critical";
        else if (ratio <= 1) stockStat = "low";
        else if (ratio > 2) stockStat = "overstock";
        return stockStat === stockStatus;
      });
    }
    
    // Enhance stocks
    const enhancedStocks = stocks.map(stock => ({
      ...stock,
      categoryName: categoryMap.get(stock.categoryId?.toString() || "") || stock.category || "Unknown",
      totalPurchased: stockPurchaseMap.get(stock._id.toString()) || 0,
      totalUsed: stockUsageMap.get(stock._id.toString()) || 0,
      uniqueOrdersCount: stockOrderMap.get(stock._id.toString())?.size || 0,
      status: (() => {
        const ratio = (stock.currentStock || 0) / (stock.minimumStock || 1);
        if (stock.currentStock === 0 || ratio <= 0.5) return "critical";
        if (ratio <= 1) return "low";
        if (ratio <= 2) return "good";
        return "overstock";
      })()
    }));
    
    // ============ WAITRESSES SEARCH ============
    let waitressQuery: any = {};
    if (query) {
      waitressQuery.$or = [
        { name: { $regex: query, $options: "i" } },
        { phone: { $regex: query, $options: "i" } },
        { email: { $regex: query, $options: "i" } },
        { shift: { $regex: query, $options: "i" } }
      ];
    }
    const searchWaitresses = await db.collection("waitresses").find(waitressQuery).limit(limit).toArray();
    
    // Calculate waitress performance
    const waitressOrdersMap = new Map();
    orders.forEach(order => {
      if (order.waiterId) {
        const wid = order.waiterId.toString();
        if (!waitressOrdersMap.has(wid)) {
          waitressOrdersMap.set(wid, { orders: 0, sales: 0 });
        }
        const stats = waitressOrdersMap.get(wid);
        stats.orders++;
        stats.sales += order.finalAmount || 0;
      }
    });
    
    const waitressWithStats = searchWaitresses.map(waiter => ({
      ...waiter,
      totalOrders: waitressOrdersMap.get(waiter._id.toString())?.orders || 0,
      totalSales: waitressOrdersMap.get(waiter._id.toString())?.sales || 0,
      averageOrderValue: waitressOrdersMap.get(waiter._id.toString())?.orders > 0 
        ? waitressOrdersMap.get(waiter._id.toString()).sales / waitressOrdersMap.get(waiter._id.toString()).orders 
        : 0
    }));
    
    // ============ USERS SEARCH ============
    let userQuery: any = {};
    if (query) {
      userQuery.$or = [
        { name: { $regex: query, $options: "i" } },
        { email: { $regex: query, $options: "i" } },
        { phone: { $regex: query, $options: "i" } },
        { employeeId: { $regex: query, $options: "i" } },
        { role: { $regex: query, $options: "i" } }
      ];
    }
    if (userRole && userRole !== "all") {
      userQuery.role = userRole;
    }
    const users = await db.collection("users")
      .find(userQuery)
      .project({ password: 0 })
      .limit(limit)
      .toArray();

    const userStats = {
      total: users.length,
      active: users.filter(u => u.status === "active").length,
      inactive: users.filter(u => u.status !== "active").length,
      byRole: users.reduce((acc: any, u) => {
        const role = u.role || "unknown";
        acc[role] = (acc[role] || 0) + 1;
        return acc;
      }, {}),
      recentRegistrations: users.filter(u => {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return new Date(u.createdAt) > thirtyDaysAgo;
      }).length
    };
    
    // ============ MENU ITEMS SEARCH ============
    let menuItemQuery: any = {};
    if (query && searchType === "items") {
      menuItemQuery.$or = [
        { name: { $regex: query, $options: "i" } },
        { description: { $regex: query, $options: "i" } }
      ];
    }
    
    const menuItems = await db.collection("items")
      .find(menuItemQuery)
      .limit(limit)
      .toArray();
    
    const menuItemsWithSales = menuItems.map(item => {
      const sales = itemSales[item.name] || { quantity: 0, revenue: 0, orderCount: 0 };
      return {
        ...item,
        totalOrdered: sales.quantity,
        totalRevenue: sales.revenue,
        orderCount: sales.orderCount,
        averagePrice: sales.orderCount > 0 ? sales.revenue / sales.orderCount : item.price || 0
      };
    });
    
    // ============ CATEGORIES SEARCH ============
    let categoryQuery: any = {};
    if (query && searchType === "categories") {
      categoryQuery.$or = [
        { name: { $regex: query, $options: "i" } },
        { description: { $regex: query, $options: "i" } }
      ];
    }
    
    const categories = await db.collection("categories")
      .find(categoryQuery)
      .limit(limit)
      .toArray();
    
    // Count items per category
    const categoryItemCount = new Map();
    menuItems.forEach(item => {
      if (item.categoryId) {
        categoryItemCount.set(item.categoryId.toString(), (categoryItemCount.get(item.categoryId.toString()) || 0) + 1);
      }
    });
    
    const categoriesWithStats = categories.map(cat => ({
      ...cat,
      itemCount: categoryItemCount.get(cat._id.toString()) || 0
    }));
    
    // Calculate stock health
    const criticalStocks = enhancedStocks.filter(s => s.status === "critical").length;
    const lowStocks = enhancedStocks.filter(s => s.status === "low").length;
    const totalStockUsed = Array.from(stockUsageMap.values()).reduce((sum: number, val: any) => sum + val, 0);
    const totalItemsSold = Object.values(itemSales).reduce((sum, i) => sum + i.quantity, 0);
    
    return NextResponse.json({
      success: true,
      data: {
        orders,
        stocks: enhancedStocks,
        users,
        waitresses: waitressWithStats,
        menuItems: menuItemsWithSales,
        categories: categoriesWithStats,
        analytics: {
          topSellingItems,
          topWaiters,
          topUsedStocks: [...enhancedStocks].sort((a: any, b: any) => (b.totalUsed || 0) - (a.totalUsed || 0)).slice(0, 10),
          ordersByStatus,
          ordersByPaymentMethod,
          popularOrderTypes,
          hourlyDistribution,
          dailyDistribution,
          restaurantDistribution,
          userStats,
          searchSummary: {
            totalOrders,
            totalRevenue,
            totalUsers: users.length,
            totalWaitresses: searchWaitresses.length,
            totalStocks: stocks.length,
            totalMenuItems: menuItems.length,
            totalCategories: categories.length,
            totalItemsSold,
            totalStockUsed,
            completionRate: parseFloat(completionRate.toFixed(1)),
            pendingOrders: orders.filter(o => o.status === "PENDING").length,
            cancelledOrders: orders.filter(o => o.status === "CANCELLED").length,
            criticalStocks,
            lowStocks,
            totalStockValue: enhancedStocks.reduce((sum, s) => sum + ((s.currentStock || 0) * (s.unitCost || 0)), 0)
          }
        }
      }
    });
    
  } catch (error) {
    console.error("Search API error:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Internal server error"
    }, { status: 500 });
  }
}