// app/api/order/waiterreport/route.ts (FIXED)
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";

// GET: Fetch orders for reports with filtering by date, waiter, and restaurant
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized', success: false },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const waiterId = searchParams.get('waiterId');
    const restaurantId = searchParams.get('restaurantId');
    const paymentMethod = searchParams.get('paymentMethod');
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;
    const page = searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1;
    const pageSize = 50;
    const excludeCalculated = searchParams.get('excludeCalculated') === 'true';

    // Validate required parameters
    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'Start date and end date are required', success: false },
        { status: 400 }
      );
    }

    // Get current waitress if no specific waiterId is provided or if it's 'all'
    let targetWaiterId = waiterId;
    if (waiterId === 'all' || !waiterId) {
      targetWaiterId = 'all';
    } else if (waiterId === 'current') {
      const currentWaitress = await prisma.waitress.findFirst(
        { where: { email: session.user.email } }
      );
      if (currentWaitress) {
        targetWaiterId = currentWaitress.id;
      }
    }

    // Parse dates — support both 'yyyy-MM-dd' and full ISO datetime strings
    // For date-only strings, treat as Ethiopia local time (UTC+3)
    const ETH_OFFSET_MS = 3 * 60 * 60 * 1000
    let fromDate: Date, toDate: Date
    if (startDate.includes('T')) {
      // Full ISO string from frontend (already local time)
      fromDate = new Date(startDate)
      toDate = new Date(endDate)
    } else {
      // Date-only string: treat midnight as Ethiopia local midnight
      fromDate = new Date(new Date(startDate + 'T00:00:00.000Z').getTime() - ETH_OFFSET_MS)
      toDate = new Date(new Date(endDate + 'T23:59:59.999Z').getTime() - ETH_OFFSET_MS)
    }

    const where: any = {
      createdAt: {
        gte: fromDate,
        lte: toDate,
      },
      status: 'COMPLETED',
    };

    // Exclude calculated orders if requested
    if (excludeCalculated) {
      where.OR = [
        { calculated: { not: true } },
        { calculated: null },
      ];
    }

    // Add waiter filter if specified and not 'all'
    if (targetWaiterId && targetWaiterId !== 'all') {
      where.waiterId = targetWaiterId;
    }

    // Add restaurant filter if specified
    if (restaurantId && restaurantId !== 'all' && restaurantId !== 'unassigned') {
      where.restaurantId = restaurantId;
    }

    // Add payment method filter if specified
    if (paymentMethod && paymentMethod !== 'all') {
      where.paymentMethod = paymentMethod;
    }

    // Get total count for pagination
    const totalCount = await prisma.order.count({ where });

    // Fetch orders with pagination
    const orders = await prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      ...(limit ? { take: limit } : { skip: (page - 1) * pageSize, take: pageSize }),
    });

    // Enrich orders with waiter/restaurant/item details (equivalent of $lookup pipeline)
    const waiterIds = [...new Set(orders.map(o => o.waiterId).filter(Boolean))] as string[];
    const restaurantIds = [...new Set(orders.map(o => o.restaurantId).filter(Boolean))] as string[];
    const itemIds = [...new Set(
      orders.flatMap(o => ((o.items as any) || []).map((i: any) => i.itemId).filter(Boolean))
    )] as string[];

    const [waiters, restaurants, itemDocs] = await Promise.all([
      waiterIds.length
        ? prisma.waitress.findMany({ where: { id: { in: waiterIds } } })
        : Promise.resolve([]),
      restaurantIds.length
        ? prisma.restaurant.findMany({ where: { id: { in: restaurantIds } } })
        : Promise.resolve([]),
      itemIds.length
        ? prisma.item.findMany({ where: { id: { in: itemIds } } })
        : Promise.resolve([]),
    ]);

    const waiterMap = new Map(waiters.map(w => [w.id, w]));
    const restaurantMap = new Map(restaurants.map(r => [r.id, r]));

    const enrichedOrders = orders.map(o => ({
      ...o,
      _id: o.id,
      waiterName: (o.waiterId && waiterMap.get(o.waiterId)?.name) || o.waiterName,
      enrichedRestaurantName:
        (o.restaurantId && restaurantMap.get(o.restaurantId)?.name) || o.restaurantName,
      enrichedRestaurantId:
        (o.restaurantId && restaurantMap.get(o.restaurantId)?.id) || o.restaurantId,
      waiterInfo: (o.waiterId && waiterMap.get(o.waiterId)) || null,
      restaurantInfo: (o.restaurantId && restaurantMap.get(o.restaurantId)) || null,
      itemDetails: ((o.items as any) || [])
        .map((i: any) => itemDocs.find(it => it.id === i.itemId))
        .filter(Boolean) || [],
    }));

    // Get summary statistics (computed in JS from all matching orders)
    const summaryOrders = await prisma.order.findMany({ where });

    const totalSales = summaryOrders.reduce((acc, o) => acc + (o.finalAmount || 0), 0);
    const summary = {
      totalOrders: summaryOrders.length,
      totalSales,
      totalTax: summaryOrders.reduce((acc, o) => acc + (o.tax || 0), 0),
      totalDiscount: summaryOrders.reduce((acc, o) => acc + (o.discount || 0), 0),
      totalItems: summaryOrders.reduce(
        (acc, o) => acc + ((o.items as any) || []).reduce((s: number, i: any) => s + (Number(i.quantity) || 0), 0),
        0
      ),
      totalGuests: summaryOrders.reduce((acc, o) => acc + (o.numberOfGuests || 0), 0),
      averageOrderValue: summaryOrders.length ? totalSales / summaryOrders.length : 0,
    };

    // Calculate breakdowns
    const byStatus: Record<string, { count: number; total: number }> = {};
    const byPayment: Record<string, { count: number; total: number }> = {};
    for (const o of summaryOrders) {
      const s = o.status || 'Unknown';
      byStatus[s] = {
        count: (byStatus[s]?.count || 0) + 1,
        total: (byStatus[s]?.total || 0) + (o.finalAmount || 0),
      };
      const p = o.paymentMethod || 'Unknown';
      byPayment[p] = {
        count: (byPayment[p]?.count || 0) + 1,
        total: (byPayment[p]?.total || 0) + (o.finalAmount || 0),
      };
    }

    // Calculate top items
    const itemAgg = new Map<string, { name: string; quantity: number; revenue: number }>();
    for (const o of summaryOrders) {
      for (const it of (o.items as any) || []) {
        const id = it.itemId || 'Unknown';
        const cur = itemAgg.get(id) || { name: it.name || 'Unknown Item', quantity: 0, revenue: 0 };
        const qty = Number(it.quantity) || 0;
        cur.quantity += qty;
        cur.revenue += qty * (Number(it.unitPrice) || 0);
        itemAgg.set(id, cur);
      }
    }
    const topItems = Array.from(itemAgg.entries())
      .map(([id, v]) => ({ id, name: v.name, quantity: v.quantity, revenue: v.revenue }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // Calculate daily sales (grouped by UTC date, matching $dateToString %Y-%m-%d)
    const dailyMap = new Map<string, { total: number; orders: number; averageOrderValue: number }>();
    for (const o of summaryOrders) {
      if (!o.createdAt) continue;
      const key = o.createdAt.toISOString().slice(0, 10);
      const cur = dailyMap.get(key) || { total: 0, orders: 0, averageOrderValue: 0 };
      cur.total += o.finalAmount || 0;
      cur.orders += 1;
      dailyMap.set(key, cur);
    }
    const dailySales = Array.from(dailyMap.entries())
      .map(([date, v]) => ({ date, total: v.total, orders: v.orders, averageOrderValue: v.total / v.orders }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // ✅ FIX: Return COMPLETE data with orders
    return NextResponse.json({
      success: true,
      message: "Report data retrieved successfully",
      orders: enrichedOrders, // ✅ THIS WAS MISSING!
      summary: {
        totalOrders: summary.totalOrders || 0,
        totalSales: summary.totalSales || 0,
        totalTax: summary.totalTax || 0,
        totalDiscount: summary.totalDiscount || 0,
        totalItems: summary.totalItems || 0,
        totalGuests: summary.totalGuests || 0,
        averageOrderValue: summary.averageOrderValue || 0,
      },
      breakdown: {
        byStatus,
        byPayment,
      },
      topItems: topItems.map((item) => ({
        id: item.id,
        name: item.name || 'Unknown Item',
        quantity: item.quantity || 0,
        revenue: item.revenue || 0,
      })),
      dailySales: dailySales.map((day) => ({
        date: day.date,
        total: day.total || 0,
        orders: day.orders || 0,
        averageOrderValue: day.averageOrderValue || 0,
      })),
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize),
      },
      dateRange: {
        start: startDate,
        end: endDate,
      },
    });

  } catch (error) {
    console.error('Error in waiterreport API:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch reports',
        message: error instanceof Error ? error.message : 'Unknown error',
        orders: [] // ✅ Always return empty array on error
      },
      { status: 500 }
    );
  }
}

// POST: Export reports in different formats
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized', success: false },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { format } = body;

    return NextResponse.json({
      success: true,
      message: "Export request processed successfully",
    });

  } catch (error) {
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to export report',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
