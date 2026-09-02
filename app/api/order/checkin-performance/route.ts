// app/api/order/checkin-performance/route.ts
// Returns aggregated checkin assignment performance data: per-user stats, per-day breakdown, item details
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";

interface PerformanceItem {
  itemName: string;
  itemId?: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  orderNumber?: string;
  orderId: string;
  date: string;
}

interface UserPerformance {
  userId: string;
  userName: string;
  totalItems: number;
  totalRevenue: number;
  todayItems: number;
  todayRevenue: number;
  daysActive: number;
  items: PerformanceItem[];
  dailyBreakdown: { date: string; items: number; revenue: number }[];
}

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
      return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const dateFrom = searchParams.get("dateFrom"); // YYYY-MM-DD
    const dateTo = searchParams.get("dateTo");     // YYYY-MM-DD
    const userId = searchParams.get("userId");     // optional: filter by specific user

    // Build where clause: only orders that have a checkin user assigned
    const where: any = {
      checkinUserId: { not: null },
    };

    if (userId) {
      where.checkinUserId = userId;
    }

    // Date filtering on createdAt
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) {
        const d = new Date(dateFrom);
        d.setHours(0, 0, 0, 0);
        where.createdAt.gte = d;
      }
      if (dateTo) {
        const d = new Date(dateTo);
        d.setHours(23, 59, 59, 999);
        where.createdAt.lte = d;
      }
    }

    const orders = await prisma.order.findMany({
      where,
      select: {
        id: true,
        orderNumber: true,
        checkinUserId: true,
        checkinUserName: true,
        items: true,
        createdAt: true,
        finalAmount: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // Today boundaries
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Aggregate per user
    const userMap = new Map<string, UserPerformance>();

    for (const order of orders) {
      if (!order.checkinUserId || !order.checkinUserName) continue;

      const uid = order.checkinUserId;
      if (!userMap.has(uid)) {
        userMap.set(uid, {
          userId: uid,
          userName: order.checkinUserName,
          totalItems: 0,
          totalRevenue: 0,
          todayItems: 0,
          todayRevenue: 0,
          daysActive: 0,
          items: [],
          dailyBreakdown: [],
        });
      }

      const perf = userMap.get(uid)!;
      const orderDate = order.createdAt ? new Date(order.createdAt) : new Date();
      const dateStr = orderDate.toISOString().split("T")[0];
      const isToday = orderDate >= today && orderDate < tomorrow;

      // Parse items from order
      let orderItems: any[] = [];
      if (Array.isArray(order.items)) {
        orderItems = order.items;
      } else if (typeof order.items === "object" && order.items !== null) {
        orderItems = Array.isArray((order.items as any).items) ? (order.items as any).items : [];
      }

      // Count items assigned to this user in this order
      let orderItemCount = 0;
      let orderItemRevenue = 0;

      for (const item of orderItems) {
        // For order-level assignment, all items belong to this user
        // For per-item assignment, only items with matching checkinUserId
        const itemUserId = item.checkinUserId || order.checkinUserId;
        if (itemUserId !== uid) continue;

        const quantity = item.quantity || 1;
        const unitPrice = item.unitPrice || item.price || 0;
        const subtotal = item.subtotal || unitPrice * quantity;

        orderItemCount += quantity;
        orderItemRevenue += subtotal;

        perf.items.push({
          itemName: item.name || item.itemName || "Unknown Item",
          itemId: item.itemId || item.id,
          quantity,
          unitPrice,
          subtotal,
          orderNumber: order.orderNumber || undefined,
          orderId: order.id,
          date: dateStr,
        });
      }

      perf.totalItems += orderItemCount;
      perf.totalRevenue += orderItemRevenue;

      if (isToday) {
        perf.todayItems += orderItemCount;
        perf.todayRevenue += orderItemRevenue;
      }

      // Daily breakdown
      const existingDay = perf.dailyBreakdown.find((d) => d.date === dateStr);
      if (existingDay) {
        existingDay.items += orderItemCount;
        existingDay.revenue += orderItemRevenue;
      } else {
        perf.dailyBreakdown.push({ date: dateStr, items: orderItemCount, revenue: orderItemRevenue });
      }
    }

    // Sort daily breakdowns descending and compute daysActive
    const result = Array.from(userMap.values()).map((perf) => {
      perf.dailyBreakdown.sort((a, b) => b.date.localeCompare(a.date));
      perf.daysActive = perf.dailyBreakdown.length;
      perf.items.sort((a, b) => b.date.localeCompare(a.date));
      return perf;
    });

    // Sort by total items descending
    result.sort((a, b) => b.totalItems - a.totalItems);

    return NextResponse.json({
      success: true,
      data: result,
      count: result.length,
    });
  } catch (error: any) {
    console.error("Error fetching checkin performance:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
