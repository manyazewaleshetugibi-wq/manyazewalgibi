import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { randomUUID } from "crypto"
import * as z from "zod"
import { requireRole } from "@/lib/api-auth"

const TransferCreateSchema = z.object({
  stockId: z.string().min(1, "Stock ID is required"),
  quantity: z.number().min(0.01, "Quantity must be greater than 0"),
  receiverName: z.string().min(1, "Receiver name is required").max(200),
  note: z.string().max(500).optional().default(""),
  date: z.string().optional(),
})

const TransferUpdateSchema = z.object({
  quantity: z.number().min(0.01).optional(),
  receiverName: z.string().min(1).max(200).optional(),
  note: z.string().max(500).optional(),
  date: z.string().optional(),
})

export async function GET(req: NextRequest) {
  try {
    const { response } = await requireRole(["admin", "stock_manager", "kitchen", "finance"]);
    if (response) return response;
    
    const { searchParams } = new URL(req.url)
    const stockId = searchParams.get("stockId")

    const query: any = {}
    if (stockId) query.stockId = stockId

    const transfers = await prisma.stockTransfer.findMany({
      where: query,
      orderBy: { date: "desc" },
    })

    const transfersWithStock = await Promise.all(
      transfers.map(async (t) => {
        const stock = t.stockId
          ? await prisma.stock.findUnique(
              { where: { id: t.stockId }, select: { name: true, unit: true } },
            )
          : null
        return { ...t, _id: t.id, stockId: stock ? { ...stock, _id: t.stockId } : t.stockId }
      })
    )

    return NextResponse.json({ success: true, data: transfersWithStock }, { status: 200 })
  } catch (error) {
    console.error("GET /stock-transfer Error:", error)
    return NextResponse.json({ success: false, message: "Error fetching transfers" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { response } = await requireRole(["admin", "stock_manager", "kitchen"]);
    if (response) return response;
    
    const body = await req.json()
    const validated = TransferCreateSchema.parse(body)
    const { stockId, quantity, receiverName, note, date } = validated

    const stock = await prisma.stock.findUnique({ where: { id: stockId } })
    if (!stock) {
      return NextResponse.json({ success: false, message: "Stock not found" }, { status: 404 })
    }

    await prisma.stockTransfer.create({
      data: {
        id: randomUUID(),
        stockId,
        quantity: Number(quantity),
        receiverName: receiverName.trim(),
        note: (note || "").trim(),
        date: date || new Date().toISOString().split("T")[0],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    })

    return NextResponse.json({ success: true, message: "Transfer registered successfully" }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, message: "Validation error", errors: error.errors }, { status: 400 })
    }
    console.error("POST /stock-transfer Error:", error)
    return NextResponse.json({ success: false, message: "Error registering transfer" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { response } = await requireRole(["admin", "stock_manager"]);
    if (response) return response;
    
    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")
    if (!id) {
      return NextResponse.json({ success: false, message: "Valid transfer ID is required" }, { status: 400 })
    }

    const body = await req.json()
    const validated = TransferUpdateSchema.parse(body)

    const existing = await prisma.stockTransfer.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ success: false, message: "Transfer not found" }, { status: 404 })
    }

    await prisma.stockTransfer.update({
      where: { id },
      data: { ...validated, updatedAt: new Date() },
    })
    return NextResponse.json({ success: true, message: "Transfer updated successfully" }, { status: 200 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, message: "Validation error", errors: error.errors }, { status: 400 })
    }
    console.error("PUT /stock-transfer Error:", error)
    return NextResponse.json({ success: false, message: "Error updating transfer" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { response } = await requireRole(["admin", "stock_manager"]);
    if (response) return response;
    
    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")
    if (!id) {
      return NextResponse.json({ success: false, message: "Valid transfer ID is required" }, { status: 400 })
    }

    const transfer = await prisma.stockTransfer.findUnique({ where: { id } })
    if (!transfer) {
      return NextResponse.json({ success: false, message: "Transfer not found" }, { status: 404 })
    }

    await prisma.stockTransfer.deleteMany({ where: { id } })
    return NextResponse.json({ success: true, message: "Transfer deleted" }, { status: 200 })
  } catch (error) {
    console.error("DELETE /stock-transfer Error:", error)
    return NextResponse.json({ success: false, message: "Error deleting transfer" }, { status: 500 })
  }
}
