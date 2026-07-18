import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { auth } from "@/auth";

// GET all used stock records with filtering
export async function GET(req: NextRequest) {
  try {
    const authSession = await auth();
    if (!authSession?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const stockId = url.searchParams.get('stockId');
    const orderId = url.searchParams.get('orderId');
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');
    const limit = parseInt(url.searchParams.get('limit') || '100');
    const page = parseInt(url.searchParams.get('page') || '1');
    const skip = (page - 1) * limit;

    const client = await clientPromise;
    const db = client.db("gold");

    // Build query
    const query: any = {};
    
    if (stockId && stockId !== 'all') {
      query.stockId = new ObjectId(stockId);
    }

    if (orderId) {
      query.orderId = new ObjectId(orderId);
    }

    if (startDate || endDate) {
      query.usedAt = {};
      if (startDate) {
        query.usedAt.$gte = new Date(startDate);
      }
      if (endDate) {
        query.usedAt.$lte = new Date(endDate);
      }
    }

    // Get total count for pagination
    const total = await db.collection("used_stock").countDocuments(query);

    // Get used stock records with pagination
    const usedStock = await db
      .collection("used_stock")
      .find(query)
      .sort({ usedAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    // Convert ObjectIds to strings for JSON serialization
    const serializedUsedStock = usedStock.map(record => ({
      ...record,
      _id: record._id.toString(),
      stockId: record.stockId.toString(),
      orderId: record.orderId?.toString(),
      items: record.items?.map((item: any) => ({
        ...item,
        itemId: item.itemId?.toString(),
      })),
    }));

    return NextResponse.json({
      success: true,
      data: serializedUsedStock,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching used stock:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch used stock" },
      { status: 500 }
    );
  }
}

// POST - Create new used stock record (from order processing)
export async function POST(req: NextRequest) {
  try {
    const authSession = await auth();
    if (!authSession?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      orderId,
      orderNumber,
      stockId,
      stockName,
      stockCategory,
      stockUnit,
      unitCost,
      totalQuantityUsed,
      totalCost,
      items,
      usedAt,
      notes,
    } = body;

    // Validate required fields
    if (!orderId || !stockId || !stockName || totalQuantityUsed === undefined) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Order ID, Stock ID, Stock Name, and Quantity are required" 
        },
        { status: 400 }
      );
    }

    // Validate quantity
    if (typeof totalQuantityUsed !== 'number' || totalQuantityUsed <= 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Quantity must be a positive number" 
        },
        { status: 400 }
      );
    }

    // Ensure quantity has proper decimal places (max 3)
    const formattedQuantity = parseFloat(totalQuantityUsed.toFixed(3));

    if (!ObjectId.isValid(orderId) || !ObjectId.isValid(stockId)) {
      return NextResponse.json(
        { success: false, error: "Invalid ID format" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db("gold");

    // Get current stock to update quantity
    const stock = await db.collection("stocks").findOne({ _id: new ObjectId(stockId) });
    
    if (!stock) {
      return NextResponse.json(
        { success: false, error: "Stock item not found" },
        { status: 404 }
      );
    }

    // Check if stock has enough quantity (with decimal precision)
    if (stock.currentStock < formattedQuantity) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Insufficient stock. Available: ${stock.currentStock} ${stock.unit || 'units'}, Requested: ${formattedQuantity} ${stock.unit || 'units'}` 
        },
        { status: 400 }
      );
    }

    // Calculate total cost if not provided
    const calculatedTotalCost = totalCost || (formattedQuantity * (unitCost || stock.costPerUnit || 0));

    // Start a session for transaction
    const session = client.startSession();

    try {
      session.startTransaction();

      // Create used stock record with formatted quantity
      const usedStockRecord = {
        orderId: new ObjectId(orderId),
        orderNumber,
        stockId: new ObjectId(stockId),
        stockName,
        stockCategory: stockCategory || stock.category || 'General',
        stockUnit: stockUnit || stock.unit || 'unit',
        unitCost: unitCost || stock.costPerUnit || 0,
        totalQuantityUsed: formattedQuantity, // Store with proper formatting
        totalCost: calculatedTotalCost,
        items: items?.map((item: any) => ({
          itemId: new ObjectId(item.itemId),
          itemName: item.itemName,
          quantityUsed: parseFloat(item.quantityUsed.toFixed(3)), // Format item quantities too
        })) || [],
        usedAt: usedAt ? new Date(usedAt) : new Date(),
        processedAt: new Date(),
        notes: notes || `Used in ${items?.length || 1} item type(s) for order ${orderNumber}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await db.collection("used_stock").insertOne(usedStockRecord, { session });

      // Update stock current quantity (atomic decrement with guard)
      const updateResult = await db.collection("stocks").updateOne(
        { _id: new ObjectId(stockId), currentStock: { $gte: formattedQuantity } },
        {
          $inc: { currentStock: -formattedQuantity },
          $set: { updatedAt: new Date() },
          $push: {
            transactions: {
              type: 'used',
              quantity: formattedQuantity,
              previousQuantity: stock.currentStock,
              newQuantity: stock.currentStock - formattedQuantity,
              orderId: new ObjectId(orderId),
              orderNumber,
              items: items?.map((item: any) => ({
                itemId: new ObjectId(item.itemId),
                itemName: item.itemName,
                quantityUsed: parseFloat(item.quantityUsed.toFixed(3)),
              })),
              reason: `Order ${orderNumber}`,
              performedBy: 'system',
              createdAt: new Date(),
            },
          },
        },
        { session }
      );

      if (updateResult.matchedCount === 0) {
        await session.abortTransaction();
        await session.endSession();
        return NextResponse.json(
          { success: false, error: "Insufficient stock — concurrent deduction detected" },
          { status: 400 }
        );
      }

      await session.commitTransaction();

      // Convert ObjectIds to strings for response
      const createdRecord = {
        ...usedStockRecord,
        _id: result.insertedId.toString(),
        orderId: usedStockRecord.orderId.toString(),
        stockId: usedStockRecord.stockId.toString(),
        items: usedStockRecord.items?.map((item: any) => ({
          ...item,
          itemId: item.itemId.toString(),
        })),
      };

      return NextResponse.json({
        success: true,
        message: "Stock usage recorded successfully",
        data: createdRecord,
      });
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  } catch (error) {
    console.error("Error creating used stock record:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create used stock record" },
      { status: 500 }
    );
  }
}

// GET summary statistics
export async function PUT(req: NextRequest) {
  try {
    const authSession = await auth();
    if (!authSession?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    if (action === 'summary') {
      const client = await clientPromise;
      const db = client.db("gold");

      const [totalStats, topUsed, dailyUsage, categoryStats] = await Promise.all([
        // Total statistics
        db.collection("used_stock").aggregate([
          {
            $group: {
              _id: null,
              totalQuantity: { $sum: "$totalQuantityUsed" },
              totalCost: { $sum: "$totalCost" },
              totalRecords: { $sum: 1 },
              uniqueOrders: { $addToSet: "$orderId" },
              uniqueStocks: { $addToSet: "$stockId" },
            },
          },
          {
            $project: {
              totalQuantity: { $round: ["$totalQuantity", 3] },
              totalCost: 1,
              totalRecords: 1,
              uniqueOrders: { $size: "$uniqueOrders" },
              uniqueStocks: { $size: "$uniqueStocks" },
            },
          },
        ]).toArray(),

        // Top used items
        db.collection("used_stock").aggregate([
          {
            $group: {
              _id: "$stockId",
              stockName: { $first: "$stockName" },
              stockCategory: { $first: "$stockCategory" },
              stockUnit: { $first: "$stockUnit" },
              totalUsed: { $sum: "$totalQuantityUsed" },
              totalCost: { $sum: "$totalCost" },
              usageCount: { $sum: 1 },
            },
          },
          {
            $project: {
              stockId: "$_id",
              stockName: 1,
              stockCategory: 1,
              stockUnit: 1,
              totalUsed: { $round: ["$totalUsed", 3] },
              totalCost: 1,
              usageCount: 1,
            },
          },
          { $sort: { totalUsed: -1 } },
          { $limit: 10 },
        ]).toArray(),

        // Daily usage for last 30 days
        db.collection("used_stock").aggregate([
          {
            $match: {
              usedAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
            },
          },
          {
            $group: {
              _id: {
                year: { $year: "$usedAt" },
                month: { $month: "$usedAt" },
                day: { $dayOfMonth: "$usedAt" },
              },
              totalUsed: { $sum: "$totalQuantityUsed" },
              totalCost: { $sum: "$totalCost" },
              count: { $sum: 1 },
            },
          },
          {
            $project: {
              date: {
                $dateToString: {
                  format: "%Y-%m-%d",
                  date: {
                    $dateFromParts: {
                      year: "$_id.year",
                      month: "$_id.month",
                      day: "$_id.day",
                    },
                  },
                },
              },
              totalUsed: { $round: ["$totalUsed", 3] },
              totalCost: 1,
              count: 1,
            },
          },
          { $sort: { date: 1 } },
        ]).toArray(),

        // Usage by category
        db.collection("used_stock").aggregate([
          {
            $group: {
              _id: "$stockCategory",
              totalUsed: { $sum: "$totalQuantityUsed" },
              totalCost: { $sum: "$totalCost" },
              count: { $sum: 1 },
            },
          },
          {
            $project: {
              category: "$_id",
              totalUsed: { $round: ["$totalUsed", 3] },
              totalCost: 1,
              count: 1,
            },
          },
          { $sort: { totalUsed: -1 } },
        ]).toArray(),
      ]);

      // Format top used items to include _id as string
      const formattedTopUsed = topUsed.map((item: any) => ({
        ...item,
        _id: item._id.toString(),
      }));

      return NextResponse.json({
        success: true,
        data: {
          total: totalStats[0] || {
            totalQuantity: 0,
            totalCost: 0,
            totalRecords: 0,
            uniqueOrders: 0,
            uniqueStocks: 0,
          },
          topUsed: formattedTopUsed,
          dailyUsage,
          byCategory: categoryStats,
        },
      });
    }

    return NextResponse.json(
      { success: false, error: "Invalid action" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error fetching used stock summary:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch summary" },
      { status: 500 }
    );
  }
}

// DELETE a used stock record (for corrections)
export async function DELETE(req: NextRequest) {
  try {
    const authSession = await auth();
    if (!authSession?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    const restoreStock = url.searchParams.get('restoreStock') === 'true';

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID is required" },
        { status: 400 }
      );
    }

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid ID" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db("gold");

    // Start a session for transaction
    const session = client.startSession();

    try {
      session.startTransaction();

      // Get the record first
      const record = await db.collection("used_stock").findOne(
        { _id: new ObjectId(id) },
        { session }
      );

      if (!record) {
        await session.abortTransaction();
        return NextResponse.json(
          { success: false, error: "Record not found" },
          { status: 404 }
        );
      }

      // Restore stock quantity if requested
      if (restoreStock) {
        const stock = await db.collection("stocks").findOne(
          { _id: record.stockId },
          { session }
        );

        if (stock) {
          const newQuantity = parseFloat((stock.currentStock + record.totalQuantityUsed).toFixed(3));
          
          await db.collection("stocks").updateOne(
            { _id: record.stockId },
            {
              $set: { 
                currentStock: newQuantity,
                updatedAt: new Date() 
              },
            },
            { session }
          );
        }
      }

      // Delete the record
      const result = await db.collection("used_stock").deleteOne(
        { _id: new ObjectId(id) },
        { session }
      );

      await session.commitTransaction();

      return NextResponse.json({
        success: true,
        message: restoreStock 
          ? "Used stock record deleted and stock restored" 
          : "Used stock record deleted",
      });
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  } catch (error) {
    console.error("Error deleting used stock:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete used stock record" },
      { status: 500 }
    );
  }
}
