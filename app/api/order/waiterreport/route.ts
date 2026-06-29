// app/api/order/waiterreport/route.ts
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

    // Build query - ONLY COMPLETED ORDERS
    const query: any = {
      createdAt: {
        $gte: new Date(startDate),
        $lte: new Date(endDate + 'T23:59:59.999Z'),
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

    // Fetch orders
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

    // Return ONLY success message, completely hiding all order data
    return NextResponse.json({
      success: true,
      message: "Report data retrieved successfully",
      summary: {
        totalOrders: summary.totalOrders || 0,
        totalSales: summary.totalSales || 0,
        averageOrderValue: summary.averageOrderValue || 0,
      },
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
    const session = await auth();
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized', success: false },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { format } = body;

    // Return success message without actual data
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