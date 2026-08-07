// /app/api/stock-wastage/route.tsx
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";
import { z } from "zod";
import { WastageCreateSchema } from "@/models/Stock"; // Import the schema

// GET - Fetch all wastages or filter by stockId
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const stockId = searchParams.get("stockId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    let query: any = {};
    
    if (stockId) {
      query.stockId = stockId;
    }
    
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.gte = startDate;
      if (endDate) query.date.lte = endDate;
    }

    const wastages = await prisma.stockWastage.findMany({
      where: query,
      orderBy: { date: 'desc' },
    });

    // Get stock details for each wastage
    const wastagesWithStock = await Promise.all(
      wastages.map(async (wastage) => {
        const stock = wastage.stockId
          ? await prisma.stock.findUnique({
              where: { id: wastage.stockId },
              select: { name: true, unit: true, categoryId: true },
            })
          : null;
        return {
          ...wastage,
          stockId: stock ? { ...stock, _id: wastage.stockId } : wastage.stockId
        };
      })
    );

    return NextResponse.json({ success: true, data: wastagesWithStock }, { status: 200 });
  } catch (error) {
    console.error("GET /stock-wastage Error:", error);
    return NextResponse.json(
      { success: false, message: "Error fetching wastages" },
      { status: 500 }
    );
  }
}

// POST - Create new wastage with validation
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // ✅ Validate with Zod schema
    const validatedData = WastageCreateSchema.parse(body);
    
    const { stockId, quantity, reason, date } = validatedData;

    // Check if stock exists and get current stock
    const stock = await prisma.stock.findUnique({
      where: { id: stockId }
    });

    if (!stock) {
      return NextResponse.json(
        { success: false, message: "Stock not found" },
        { status: 404 }
      );
    }

    // Check if enough stock available
    if ((stock.currentStock || 0) < quantity) {
      return NextResponse.json(
        { success: false, message: `Insufficient stock. Available: ${stock.currentStock}` },
        { status: 400 }
      );
    }

    // Start a transaction
    try {
      await prisma.$transaction(async (tx) => {
        // Create wastage record
        await tx.stockWastage.create({
          data: {
            id: randomUUID(),
            stockId: stockId,
            quantity: Number(quantity),
            reason: reason.trim(),
            date: date || new Date().toISOString().split("T")[0],
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });

        // Update stock current stock
        await tx.stock.update({
          where: { id: stockId },
          data: {
            currentStock: { decrement: Number(quantity) },
            updatedAt: new Date(),
          },
        });
      });

      return NextResponse.json({
        success: true,
        message: "Wastage registered successfully"
      }, { status: 201 });
    } catch (error) {
      console.error("Transaction error:", error);
      return NextResponse.json(
        { success: false, message: "Error registering wastage" },
        { status: 500 }
      );
    }
  } catch (error) {
    // ✅ Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Validation error", 
          errors: error.errors 
        },
        { status: 400 }
      );
    }
    
    console.error("POST /stock-wastage Error:", error);
    return NextResponse.json(
      { success: false, message: "Error creating wastage" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a wastage record
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, message: "Wastage ID is required" },
        { status: 400 }
      );
    }

    // Get the wastage record first to restore stock
    const wastage = await prisma.stockWastage.findUnique({
      where: { id }
    });

    if (!wastage) {
      return NextResponse.json(
        { success: false, message: "Wastage record not found" },
        { status: 404 }
      );
    }

    // Start a transaction
    try {
      await prisma.$transaction(async (tx) => {
        // Restore stock
        await tx.stock.update({
          where: { id: wastage.stockId as string },
          data: {
            currentStock: { increment: wastage.quantity || 0 },
            updatedAt: new Date(),
          },
        });

        // Delete wastage record
        await tx.stockWastage.delete({
          where: { id }
        });
      });

      return NextResponse.json({
        success: true,
        message: "Wastage deleted and stock restored successfully"
      }, { status: 200 });
    } catch (error) {
      console.error("Transaction error:", error);
      return NextResponse.json(
        { success: false, message: "Error deleting wastage" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("DELETE /stock-wastage Error:", error);
    return NextResponse.json(
      { success: false, message: "Error deleting wastage" },
      { status: 500 }
    );
  }
}
