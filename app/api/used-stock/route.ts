import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { randomUUID } from "crypto";
import { auth } from "@/auth";

class HttpError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number) {
    super(message);
    this.name = "HttpError";
    this.statusCode = statusCode;
  }
}

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

    // Build query
    const where: any = {};

    if (stockId && stockId !== 'all') {
      where.stockId = stockId;
    }

    if (orderId) {
      where.orderId = orderId;
    }

    if (startDate || endDate) {
      where.usedAt = {};
      if (startDate) {
        where.usedAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.usedAt.lte = new Date(endDate);
      }
    }

    // Get total count for pagination
    const total = await prisma.usedStock.count({ where });

    // Get used stock records with pagination
    const usedStock = await prisma.usedStock.findMany({
      where,
      orderBy: { usedAt: 'desc' },
      skip,
      take: limit,
    });

    // Convert ids to strings for JSON serialization
    const serializedUsedStock = usedStock.map(record => ({
      ...record,
      _id: record.id,
      stockId: record.stockId,
      orderId: record.orderId,
      items: (record.items as any)?.map((item: any) => ({
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

    // Get current stock to update quantity
    const stock = await prisma.stock.findFirst({ where: { id: stockId } });

    if (!stock) {
      return NextResponse.json(
        { success: false, error: "Stock item not found" },
        { status: 404 }
      );
    }

    const stockAny = stock as any;

    // Check if stock has enough quantity (with decimal precision)
    if (stock.currentStock != null && stock.currentStock < formattedQuantity) {
      return NextResponse.json(
        {
          success: false,
          error: `Insufficient stock. Available: ${stock.currentStock} ${stock.unit || 'units'}, Requested: ${formattedQuantity} ${stock.unit || 'units'}`
        },
        { status: 400 }
      );
    }

    // Calculate total cost if not provided
    const calculatedTotalCost = totalCost || (formattedQuantity * (unitCost || stockAny.costPerUnit || 0));
    const computedNotes = notes || `Used in ${items?.length || 1} item type(s) for order ${orderNumber}`;

    try {
      // Create used stock record with formatted quantity inside a transaction
      const created = await prisma.$transaction(async (tx) => {
        const createdRecord = await tx.usedStock.create({
          data: {
            id: randomUUID(),
            orderId,
            orderNumber,
            stockId,
            stockName,
            stockCategory: stockCategory || stockAny.category || 'General',
            stockUnit: stockUnit || stock.unit || 'unit',
            unitCost: unitCost || stockAny.costPerUnit || 0,
            totalQuantityUsed: formattedQuantity, // Store with proper formatting
            totalCost: calculatedTotalCost,
            items: items && (items as any[]).length > 0 ? (items as Prisma.InputJsonValue) : Prisma.DbNull,
            usedAt: usedAt ? new Date(usedAt) : new Date(),
            processedAt: new Date(),
            createdAt: new Date(),
          },
        });

        // Update stock current quantity (atomic decrement with guard)
        const updateResult = await tx.stock.updateMany(
          {
            where: { id: stockId, currentStock: { gte: formattedQuantity } },
            data: { currentStock: { decrement: formattedQuantity }, updatedAt: new Date() },
          }
        );

        if (updateResult.count === 0) {
          throw new HttpError("Insufficient stock — concurrent deduction detected", 400);
        }

        return createdRecord;
      });

      // Convert ids to strings for response
      const createdRecord = {
        orderId: created.orderId,
        orderNumber: created.orderNumber,
        stockId: created.stockId,
        stockName: created.stockName,
        stockCategory: created.stockCategory,
        stockUnit: created.stockUnit,
        unitCost: created.unitCost,
        totalQuantityUsed: created.totalQuantityUsed,
        totalCost: created.totalCost,
        items: (created.items as any)?.map((item: any) => ({
          ...item,
          itemId: item.itemId?.toString(),
        })) || [],
        usedAt: created.usedAt,
        processedAt: created.processedAt,
        notes: computedNotes,
        createdAt: created.createdAt,
        updatedAt: new Date(),
        _id: created.id,
      };

      return NextResponse.json({
        success: true,
        message: "Stock usage recorded successfully",
        data: createdRecord,
      });
    } catch (error: any) {
      if (error instanceof HttpError) {
        return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
      }
      throw error;
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
      // Fetch all used_stock records once and compute statistics in JS
      const allRecords = await prisma.usedStock.findMany({
        select: {
          stockId: true,
          stockName: true,
          stockCategory: true,
          stockUnit: true,
          totalQuantityUsed: true,
          totalCost: true,
          orderId: true,
          usedAt: true,
        },
      });

      // Total statistics
      let totalQuantity = 0;
      let totalCostTotal = 0;
      const uniqueOrders = new Set<string>();
      const uniqueStocks = new Set<string>();
      allRecords.forEach((record) => {
        totalQuantity += record.totalQuantityUsed || 0;
        totalCostTotal += record.totalCost || 0;
        uniqueOrders.add(record.orderId || '');
        uniqueStocks.add(record.stockId || '');
      });

      const totalStats = [{
        totalQuantity: parseFloat(totalQuantity.toFixed(3)),
        totalCost: totalCostTotal,
        totalRecords: allRecords.length,
        uniqueOrders: uniqueOrders.size,
        uniqueStocks: uniqueStocks.size,
      }];

      // Top used items
      const topMap = new Map<string, any>();
      allRecords.forEach((record) => {
        const sid = record.stockId || '';
        if (!topMap.has(sid)) {
          topMap.set(sid, {
            stockId: sid,
            stockName: record.stockName || '',
            stockCategory: record.stockCategory || '',
            stockUnit: record.stockUnit || '',
            totalUsed: 0,
            totalCost: 0,
            usageCount: 0,
          });
        }
        const entry = topMap.get(sid)!;
        entry.totalUsed += record.totalQuantityUsed || 0;
        entry.totalCost += record.totalCost || 0;
        entry.usageCount += 1;
      });

      const topUsed = Array.from(topMap.values())
        .map((item: any) => ({
          ...item,
          totalUsed: parseFloat((item.totalUsed || 0).toFixed(3)),
        }))
        .sort((a: any, b: any) => (b.totalUsed || 0) - (a.totalUsed || 0))
        .slice(0, 10);

      // Format top used items to include _id as string
      const formattedTopUsed = topUsed.map((item: any) => ({
        ...item,
        _id: item.stockId?.toString() || '',
      }));

      // Daily usage for last 30 days
      const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const dailyMap = new Map<string, { year: number; month: number; day: number; totalUsed: number; totalCost: number; count: number }>();
      allRecords.forEach((record) => {
        const usedAt = record.usedAt;
        if (!usedAt || usedAt.getTime() < cutoff.getTime()) return;
        const date = usedAt.toISOString().split('T')[0];
        if (!dailyMap.has(date)) {
          dailyMap.set(date, {
            year: usedAt.getUTCFullYear(),
            month: usedAt.getUTCMonth() + 1,
            day: usedAt.getUTCDate(),
            totalUsed: 0,
            totalCost: 0,
            count: 0,
          });
        }
        const entry = dailyMap.get(date)!;
        entry.totalUsed += record.totalQuantityUsed || 0;
        entry.totalCost += record.totalCost || 0;
        entry.count += 1;
      });

      const dailyUsage = Array.from(dailyMap.entries())
        .map(([date, entry]) => ({
          _id: { year: entry.year, month: entry.month, day: entry.day },
          date,
          totalUsed: parseFloat(entry.totalUsed.toFixed(3)),
          totalCost: entry.totalCost,
          count: entry.count,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

      // Usage by category
      const categoryMap = new Map<string, any>();
      allRecords.forEach((record) => {
        const category = record.stockCategory || '';
        if (!categoryMap.has(category)) {
          categoryMap.set(category, {
            _id: category,
            category,
            totalUsed: 0,
            totalCost: 0,
            count: 0,
          });
        }
        const entry = categoryMap.get(category)!;
        entry.totalUsed += record.totalQuantityUsed || 0;
        entry.totalCost += record.totalCost || 0;
        entry.count += 1;
      });

      const categoryStats = Array.from(categoryMap.values())
        .map((item: any) => ({
          ...item,
          totalUsed: parseFloat((item.totalUsed || 0).toFixed(3)),
        }))
        .sort((a: any, b: any) => (b.totalUsed || 0) - (a.totalUsed || 0));

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

    await prisma.$transaction(async (tx) => {
      // Get the record first
      const record = await tx.usedStock.findFirst({ where: { id } });

      if (!record) {
        throw new HttpError("Record not found", 404);
      }

      // Restore stock quantity if requested
      if (restoreStock) {
        const stock = await tx.stock.findFirst({ where: { id: record.stockId || '' } });

        if (stock) {
          const newQuantity = parseFloat(((stock.currentStock || 0) + (record.totalQuantityUsed || 0)).toFixed(3));

          await tx.stock.update({
            where: { id: stock.id },
            data: {
              currentStock: newQuantity,
              updatedAt: new Date()
            },
          });
        }
      }

      // Delete the record
      await tx.usedStock.deleteMany({ where: { id } });
    });

    return NextResponse.json({
      success: true,
      message: restoreStock
        ? "Used stock record deleted and stock restored"
        : "Used stock record deleted",
    });
  } catch (error: any) {
    if (error instanceof HttpError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    }
    console.error("Error deleting used stock:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete used stock record" },
      { status: 500 }
    );
  }
}
