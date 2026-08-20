import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";
import { PurchaseSchema } from "@/models/Stock";
import { requireRole } from "@/lib/api-auth";

// ✅ GET purchase by ID - RETURNS ACTUAL DATA
export async function GET(
  req: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const purchase = await prisma.stockPurchase.findUnique({ where: { id } });

    if (!purchase) {
      return NextResponse.json({ 
        success: false,
        error: "Purchase not found" 
      }, { status: 404 });
    }

    // ✅ Return the actual purchase data
    return NextResponse.json({ 
      success: true, 
      data: purchase,
      message: "Purchase retrieved successfully" 
    }, { status: 200 });
  } catch (error) {
    console.error("GET /stock-purchase/[id] Error:", error);
    return NextResponse.json({ 
      success: false,
      error: "Internal Server Error" 
    }, { status: 500 });
  }
}

// ✅ DELETE purchase by ID - RETURNS DELETED ID
export async function DELETE(
  req: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { response } = await requireRole(["admin", "stock_manager"]);
    if (response) return response;
    
    const { id } = await params;

    const result = await prisma.stockPurchase.deleteMany({ where: { id } });

    if (result.count === 0) {
      return NextResponse.json({ 
        success: false,
        error: "Purchase not found" 
      }, { status: 404 });
    }

    // ✅ Return the deleted ID for reference
    return NextResponse.json({ 
      success: true, 
      data: { deletedId: id },
      message: "Purchase deleted successfully" 
    }, { status: 200 });
  } catch (error) {
    console.error("DELETE /stock-purchase/[id] Error:", error);
    return NextResponse.json({ 
      success: false,
      error: "Internal Server Error" 
    }, { status: 500 });
  }
}

// ✅ PUT (update) purchase by ID - RETURNS UPDATED DATA
export async function PUT(
  req: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { response } = await requireRole(["admin", "stock_manager"]);
    if (response) return response;
    
    const { id } = await params;

    const body = await req.json();

    // Handle date conversion if needed
    if (body.purchaseDate instanceof Date) {
      body.purchaseDate = body.purchaseDate.toISOString();
    }

    const parsed = PurchaseSchema.partial().parse(body);

    // Update the document
    let updatedPurchase;
    try {
      updatedPurchase = await prisma.stockPurchase.update({
        where: { id },
        data: parsed,
      });
    } catch (e: any) {
      if (e?.code === 'P2025') {
        return NextResponse.json({ 
          success: false,
          error: "Purchase not found" 
        }, { status: 404 });
      }
      throw e;
    }

    // ✅ Return the updated data
    return NextResponse.json({ 
      success: true, 
      data: updatedPurchase,
      message: "Purchase updated successfully" 
    }, { status: 200 });
  } catch (error) {
    console.error("PUT /stock-purchase/[id] Error:", error);
    return NextResponse.json({ 
      success: false,
      error: "Invalid request data" 
    }, { status: 400 });
  }
}
