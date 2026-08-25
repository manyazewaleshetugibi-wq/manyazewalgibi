import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";
import { PurchaseSchema } from "@/models/Stock";
import { requireRole } from "@/lib/api-auth";

// GET all purchases - RETURNS ACTUAL DATA
export async function GET() {
  try {
    const { response } = await requireRole(["admin", "stock_manager", "finance"]);
    if (response) return response;
    
    const purchases = await prisma.stockPurchase.findMany({
      select: {
        id: true,
        stockId: true,
        purchaseDate: true,
        quantity: true,
        unitPrice: true,
        supplier: true,
      }
    });

    // ✅ Return the actual data
    return NextResponse.json({ 
      success: true, 
      data: purchases.map((p: any) => ({ ...p, _id: p.id })),
      message: "Purchases retrieved successfully" 
    }, { status: 200 });
  } catch (error) {
    console.error("GET /stock-purchase Error:", error);
    return NextResponse.json({ 
      success: false,
      error: "Internal Server Error" 
    }, { status: 500 });
  }
}

// ✅ POST (Create a new purchase) - RETURNS CREATED DATA
export async function POST(req: NextRequest) {
  try {
    const { response } = await requireRole(["admin", "stock_manager"]);
    if (response) return response;
    
    const body = await req.json();
    const parsed = PurchaseSchema.parse(body);

    const id = randomUUID();
    await prisma.stockPurchase.create({ data: { id, ...parsed } });

    return NextResponse.json({ 
      success: true, 
      data: { ...parsed, _id: id, id },
      message: "Purchase created successfully" 
    }, { status: 201 });
  } catch (error) {
    console.error("POST /stock-purchase Error:", error);
    return NextResponse.json({ 
      success: false,
      error: "Invalid request data" 
    }, { status: 400 });
  }
}
