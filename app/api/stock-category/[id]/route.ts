import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { StockCategorySubschema } from "@/models/Stock";

// ✅ GET category by ID    
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const category = await prisma.stockCategory.findUnique({ where: { id } });

    if (!category) return NextResponse.json({ error: "Category not found" }, { status: 404 });

    return NextResponse.json({ success: true, category }, { status: 200 });
  } catch (error) {
    console.error("GET /stock-category/[id] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// ✅ PUT (Update Category by ID)
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const body = await req.json();
    const parsed = StockCategorySubschema.partial().parse(body); // Partial update

    const updateData: any = {
      ...(parsed.name !== undefined && { name: parsed.name }),
      ...(parsed.description !== undefined && { description: parsed.description }),
      updatedAt: new Date(),
    };

    try {
      await prisma.stockCategory.update({ where: { id }, data: updateData });
    } catch (e: any) {
      if (e?.code === 'P2025') return NextResponse.json({ error: "Category not found" }, { status: 404 });
      throw e;
    }

    return NextResponse.json({ success: true, message: "Category updated successfully" }, { status: 200 });
  } catch (error) {
    console.error("PUT /stock-category/[id] Error:", error);
    return NextResponse.json({ error: "Invalid request data" }, { status: 400 });
  }
}

// ✅ DELETE Category
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const result = await prisma.stockCategory.deleteMany({ where: { id } });

    if (result.count === 0) return NextResponse.json({ error: "Category not found" }, { status: 404 });

    return NextResponse.json({ success: true, message: "Category deleted successfully" }, { status: 200 });
  } catch (error) {
    console.error("DELETE /stock-category/[id] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
