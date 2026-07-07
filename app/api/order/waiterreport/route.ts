// app/api/order/waiterreport/route.ts (FIXED)
import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
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

    // Connect to MongoDB
    const dbClient = await clientPromise;
    const db = dbClient.db("gold");

    // Get current waitress if no specific waiterId is provided or if it's 'all'
    let targetWaiterId = waiterId;
    if (waiterId === 'all' || !waiterId) {
      targetWaiterId = 'all';
    } else if (waiterId === 'current') {
      const currentWaitress = await db.collection("waitresses").findOne(
        { email: session.user.email }
      );
      if (currentWaitress) {
        targetWaiterId = currentWaitress._id.toString();
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

    const query: any = {
      createdAt: {
        $gte: fromDate,
        $lte: toDate,
      },
      status: 'COMPLETED',
    };

    // Exclude calculated orders if requested
    if (excludeCalculated) {
      query.calculated = { $ne: true };
    }

    // Add waiter filter if specified and not 'all'
    if (targetWaiterId && targetWaiterId !== 'all' && ObjectId.isValid(targetWaiterId)) {
      query.waiterId = targetWaiterId;
    }

    // Add restaurant filter if specified
    if (restaurantId && restaurantId !== 'all' && restaurantId !== 'unassigned') {
      if (ObjectId.isValid(restaurantId)) {
        query.restaurantId = restaurantId;
      } else {
        query.restaurantId = restaurantId;
      }
    }

    // Add payment method filter if specified
    if (paymentMethod && paymentMethod !== 'all') {
      query.paymentMethod = paymentMethod;
    }

    // Get total count for pagination
    const totalCount = await db.collection("orders").countDocuments(query);

    // Build aggregation pipeline
    const pipeline: any[] = [
      { $match: query },
      {
        $lookup: {
          from: 'waitresses',
          localField: 'waiterId',
          foreignField: '_id',
          as: 'waiterInfo',
        },
      },
      {
        $unwind: {
          path: '$waiterInfo',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: 'restaurants',
          localField: 'restaurantId',
          foreignField: '_id',
          as: 'restaurantInfo',
        },
      },
      {
        $unwind: {
          path: '$restaurantInfo',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: 'items',
          localField: 'items.itemId',
          foreignField: '_id',
          as: 'itemDetails',
        },
      },
      {
        $addFields: {
          waiterName: { $ifNull: ['$waiterInfo.name', '$waiterName'] },
          enrichedRestaurantName: {
            $ifNull: ['$restaurantInfo.name', '$restaurantName']
          },
          enrichedRestaurantId: {
            $ifNull: ['$restaurantInfo._id', '$restaurantId']
          }
        }
      },
      {
        $sort: { createdAt: -1 },
      },
    ];

    // Add pagination if limit is specified
    if (limit) {
      pipeline.push({ $limit: limit });
    } else {
      const skip = (page - 1) * pageSize;
      pipeline.push({ $skip: skip });
      pipeline.push({ $limit: pageSize });
    }

    // ✅ FIX: Fetch orders
    const orders = await db.collection("orders")
      .aggregate(pipeline)
      .toArray();

    // Get summary statistics (without pagination)
    const summaryPipeline = [
      { $match: query },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalSales: { $sum: '$finalAmount' },
          totalTax: { $sum: '$tax' },
          totalDiscount: { $sum: '$discount' },
          totalItems: { $sum: { $sum: '$items.quantity' } },
          totalGuests: { $sum: '$numberOfGuests' },
          averageOrderValue: { $avg: '$finalAmount' },
        },
      },
    ];

    const summaryResult = await db.collection("orders")
      .aggregate(summaryPipeline)
      .toArray();

    const summary = summaryResult[0] || {
      totalOrders: 0,
      totalSales: 0,
      totalTax: 0,
      totalDiscount: 0,
      totalItems: 0,
      totalGuests: 0,
      averageOrderValue: 0,
    };

    // ✅ FIX: Calculate breakdowns
    const breakdownPipeline = [
      { $match: query },
      {
        $facet: {
          byStatus: [
            { $group: { _id: '$status', count: { $sum: 1 }, total: { $sum: '$finalAmount' } } }
          ],
          byPayment: [
            { $group: { _id: '$paymentMethod', count: { $sum: 1 }, total: { $sum: '$finalAmount' } } }
          ]
        }
      }
    ];

    const breakdownResult = await db.collection("orders")
      .aggregate(breakdownPipeline)
      .toArray();

    const breakdown = breakdownResult[0] || { byStatus: [], byPayment: [] };

    // Convert breakdown arrays to objects
    const byStatus: Record<string, { count: number; total: number }> = {};
    breakdown.byStatus.forEach((item: any) => {
      byStatus[item._id || 'Unknown'] = { count: item.count, total: item.total };
    });

    const byPayment: Record<string, { count: number; total: number }> = {};
    breakdown.byPayment.forEach((item: any) => {
      byPayment[item._id || 'Unknown'] = { count: item.count, total: item.total };
    });

    // ✅ FIX: Calculate top items
    const topItemsPipeline = [
      { $match: query },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.itemId',
          name: { $first: '$items.name' },
          quantity: { $sum: '$items.quantity' },
          revenue: { $sum: { $multiply: ['$items.quantity', '$items.unitPrice'] } }
        }
      },
      { $sort: { revenue: -1 } },
      { $limit: 10 }
    ];

    const topItems = await db.collection("orders")
      .aggregate(topItemsPipeline)
      .toArray();

    // ✅ FIX: Calculate daily sales
    const dailySalesPipeline = [
      { $match: query },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          total: { $sum: '$finalAmount' },
          orders: { $sum: 1 },
          averageOrderValue: { $avg: '$finalAmount' }
        }
      },
      { $sort: { _id: 1 } }
    ];

    const dailySales = await db.collection("orders")
      .aggregate(dailySalesPipeline)
      .toArray();

    // ✅ FIX: Return COMPLETE data with orders
    return NextResponse.json({
      success: true,
      message: "Report data retrieved successfully",
      orders: orders, // ✅ THIS WAS MISSING!
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
      topItems: topItems.map((item: any) => ({
        id: item._id,
        name: item.name || 'Unknown Item',
        quantity: item.quantity || 0,
        revenue: item.revenue || 0,
      })),
      dailySales: dailySales.map((day: any) => ({
        date: day._id,
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