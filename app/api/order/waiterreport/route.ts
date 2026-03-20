// app/api/order/waiterreport/route.ts
import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/auth";

// Debug flag
const DEBUG = true;

function debugLog(message: string, data?: any) {
  if (DEBUG) {
    console.log(`[DEBUG] ${message}`, data ? data : '');
  }
}

function debugError(message: string, error: any) {
  console.error(`[ERROR] ${message}`, error);
}

// GET: Fetch COMPLETED orders for reports with filtering by date and waiter
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
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
    const status = searchParams.get('status'); // Optional: filter by specific status (overrides default)
    const paymentMethod = searchParams.get('paymentMethod'); // Optional: filter by payment method
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;
    const page = searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1;
    const pageSize = 50; // Items per page
    const includeAllStatuses = searchParams.get('includeAllStatuses') === 'true'; // Optional: override to include all statuses

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
      // Get current waitress by email
      const currentWaitress = await db.collection("waitresses").findOne(
        { email: session.user.email }
      );
      if (currentWaitress) {
        targetWaiterId = currentWaitress._id.toString();
      }
    }

    debugLog(`Fetching reports from ${startDate} to ${endDate} for waiter: ${targetWaiterId}`);

    // Build query
    const query: any = {
      createdAt: {
        $gte: new Date(startDate),
        $lte: new Date(endDate + 'T23:59:59.999Z'),
      },
    };

    // Add waiter filter if specified and not 'all'
    if (targetWaiterId && targetWaiterId !== 'all' && ObjectId.isValid(targetWaiterId)) {
      query.waiterId = targetWaiterId;
    }

    // Set status filter - default to COMPLETED only unless includeAllStatuses is true
    if (includeAllStatuses) {
      // Include all statuses, but still apply specific status filter if provided
      if (status && status !== 'all') {
        query.status = status.toLowerCase();
      }
    } else {
      // Default: only show COMPLETED orders
      if (status && status !== 'all') {
        // If specific status is requested, use that instead of default
        query.status = status.toLowerCase();
      } else {
        // Default to COMPLETED only
        query.status = 'COMPLETED';
      }
    }

    // Add payment method filter if specified
    if (paymentMethod && paymentMethod !== 'all') {
      query.paymentMethod = paymentMethod;
    }

    debugLog('Query:', query);

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
          from: 'items',
          localField: 'items.itemId',
          foreignField: '_id',
          as: 'itemDetails',
        },
      },
      {
        $sort: { createdAt: -1 },
      },
    ];

    // Add pagination if limit is specified
    if (limit) {
      pipeline.push({ $limit: limit });
    } else {
      // Default pagination
      const skip = (page - 1) * pageSize;
      pipeline.push({ $skip: skip });
      pipeline.push({ $limit: pageSize });
    }

    // Fetch orders
    const orders = await db.collection("orders")
      .aggregate(pipeline)
      .toArray();

    // Get summary statistics
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

    // Get orders by status breakdown
    const statusBreakdownPipeline = [
      { $match: query },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          total: { $sum: '$finalAmount' },
        },
      },
    ];

    const statusBreakdown = await db.collection("orders")
      .aggregate(statusBreakdownPipeline)
      .toArray();

    // Get payment method breakdown
    const paymentBreakdownPipeline = [
      { $match: query },
      {
        $group: {
          _id: '$paymentMethod',
          count: { $sum: 1 },
          total: { $sum: '$finalAmount' },
        },
      },
    ];

    const paymentBreakdown = await db.collection("orders")
      .aggregate(paymentBreakdownPipeline)
      .toArray();

    // Get top selling items
    const topItemsPipeline = [
      { $match: query },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.itemId',
          name: { $first: '$items.name' },
          quantity: { $sum: '$items.quantity' },
          revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: 10 },
    ];

    const topItems = await db.collection("orders")
      .aggregate(topItemsPipeline)
      .toArray();

    // Get daily sales for chart
    const dailySalesPipeline = [
      { $match: query },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' },
          },
          date: { $first: '$createdAt' },
          total: { $sum: '$finalAmount' },
          orders: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
    ];

    const dailySales = await db.collection("orders")
      .aggregate(dailySalesPipeline)
      .toArray();

    // Format daily sales
    const formattedDailySales = dailySales.map(day => ({
      date: `${day._id.year}-${String(day._id.month).padStart(2, '0')}-${String(day._id.day).padStart(2, '0')}`,
      total: day.total || 0,
      orders: day.orders || 0,
      averageOrderValue: day.orders > 0 ? day.total / day.orders : 0,
    }));

    // Transform orders to match frontend interface
    const transformedOrders = orders.map(order => ({
      id: order._id.toString(),
      orderNumber: order.orderNumber || `ORD-${order._id.toString().slice(-6)}`,
      status: order.status || 'PENDING',
      totalAmount: order.totalAmount || 0,
      finalAmount: order.finalAmount || 0,
      tax: order.tax || 0,
      discount: order.discount || 0,
      numberOfGuests: order.numberOfGuests || 1,
      tableNumber: order.tableNumber || '',
      customerName: order.customerName || '',
      notes: order.notes || '',
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      orderItems: (order.items || []).map((item: any, index: number) => ({
        id: item.id || `item-${index}`,
        menuItemId: item.itemId || item.menuItemId || '',
        name: item.name || 'Unknown Item',
        price: item.price || 0,
        quantity: item.quantity || 1,
        specialInstructions: item.specialInstructions || '',
        total: (item.price || 0) * (item.quantity || 1),
      })),
      paymentStatus: order.paymentStatus || 'PENDING',
      paymentMethod: order.paymentMethod || 'CASH',
      waiterId: order.waiterId || '',
      waiterInfo: order.waiterInfo ? {
        id: order.waiterInfo._id?.toString() || '',
        name: order.waiterInfo.name || 'Unknown',
        role: order.waiterInfo.role || 'WAITER',
        shift: order.waiterInfo.shift || 'All Shifts',
      } : undefined,
    }));

    // Get all waiters for filter dropdown
    const allWaiters = await db.collection("waitresses")
      .find({})
      .project({
        _id: 1,
        name: 1,
        shift: 1,
        email: 1,
      })
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

    return NextResponse.json({
      success: true,
      orders: transformedOrders,
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
        byStatus: statusBreakdown.reduce((acc, item) => {
          acc[item._id || 'UNKNOWN'] = {
            count: item.count,
            total: item.total,
          };
          return acc;
        }, {} as Record<string, { count: number; total: number }>),
        byPayment: paymentBreakdown.reduce((acc, item) => {
          acc[item._id || 'CASH'] = {
            count: item.count,
            total: item.total,
          };
          return acc;
        }, {} as Record<string, { count: number; total: number }>),
      },
      topItems: topItems.map(item => ({
        id: item._id,
        name: item.name,
        quantity: item.quantity,
        revenue: item.revenue,
      })),
      dailySales: formattedDailySales,
      waiters: allWaiters.map(w => ({
        _id: w._id.toString(),
        name: w.name,
        shift: w.shift,
        email: w.email,
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
      // Add info about what status filter was applied
      filterInfo: {
        statusFilter: includeAllStatuses ? (status || 'all') : 'COMPLETED',
        includeAllStatuses
      }
    });

  } catch (error) {
    debugError('Error fetching waiter reports:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch reports',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST: Export reports in different formats
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized', success: false },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { format, data, dateRange, startDate, endDate, waiterId } = body;

    if (!format || !data) {
      return NextResponse.json(
        { error: 'Format and data are required', success: false },
        { status: 400 }
      );
    }

    // Generate filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `waiter_report_${timestamp}`;

    // Handle different export formats
    if (format === 'csv') {
      // Create CSV content
      const csvRows = [];
      
      // Add headers
      csvRows.push('Order Number,Date,Customer,Table,Waiter,Status,Payment Method,Items,Total');
      
      // Add data rows
      data.orders.forEach((order: any) => {
        csvRows.push([
          order.orderNumber,
          order.date,
          `"${order.customer}"`,
          order.table,
          `"${order.waiter}"`,
          order.status,
          order.paymentMethod,
          order.items,
          order.total.toFixed(2),
        ].join(','));
      });

      const csvContent = csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      
      return new NextResponse(blob, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${filename}.csv"`,
        },
      });
    }

    return NextResponse.json(
      { error: 'Unsupported export format', success: false },
      { status: 400 }
    );

  } catch (error) {
    debugError('Error exporting report:', error);
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