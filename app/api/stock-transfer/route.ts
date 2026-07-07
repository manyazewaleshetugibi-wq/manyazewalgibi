import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import * as z from "zod"

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
    const client = await clientPromise
    const db = client.db("gold")
    const { searchParams } = new URL(req.url)
    const stockId = searchParams.get("stockId")

    const query: any = {}
    if (stockId) query.stockId = stockId

    const transfers = await db
      .collection("stock_transfers")
      .find(query)
      .sort({ date: -1 })
      .toArray()

    const transfersWithStock = await Promise.all(
      transfers.map(async (t) => {
        const stock = await db.collection("stocks").findOne(
          { _id: new ObjectId(t.stockId) },
          { projection: { name: 1, unit: 1 } }
        )
        return { ...t, stockId: stock ? { ...stock, _id: t.stockId } : t.stockId }
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
    const body = await req.json()
    const validated = TransferCreateSchema.parse(body)
    const { stockId, quantity, receiverName, note, date } = validated

    const client = await clientPromise
    const db = client.db("gold")

    const stock = await db.collection("stocks").findOne({ _id: new ObjectId(stockId) })
    if (!stock) {
      return NextResponse.json({ success: false, message: "Stock not found" }, { status: 404 })
    }
    if (stock.currentStock < quantity) {
      return NextResponse.json(
        { success: false, message: `Insufficient stock. Available: ${stock.currentStock}` },
        { status: 400 }
      )
    }

    const session = client.startSession()
    try {
      await session.withTransaction(async () => {
        await db.collection("stock_transfers").insertOne(
          {
            stockId,
            quantity: Number(quantity),
            receiverName: receiverName.trim(),
            note: (note || "").trim(),
            date: date || new Date().toISOString().split("T")[0],
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          { session }
        )
        await db.collection("stocks").updateOne(
          { _id: new ObjectId(stockId) },
          { $inc: { currentStock: -Number(quantity) }, $set: { updatedAt: new Date() } },
          { session }
        )
      })
      return NextResponse.json({ success: true, message: "Transfer registered successfully" }, { status: 201 })
    } finally {
      await session.endSession()
    }
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
    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")
    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, message: "Valid transfer ID is required" }, { status: 400 })
    }

    const body = await req.json()
    const validated = TransferUpdateSchema.parse(body)

    const client = await clientPromise
    const db = client.db("gold")

    const existing = await db.collection("stock_transfers").findOne({ _id: new ObjectId(id) })
    if (!existing) {
      return NextResponse.json({ success: false, message: "Transfer not found" }, { status: 404 })
    }

    const quantityDiff = (validated.quantity ?? existing.quantity) - existing.quantity

    if (quantityDiff !== 0) {
      const stock = await db.collection("stocks").findOne({ _id: new ObjectId(existing.stockId) })
      if (!stock) {
        return NextResponse.json({ success: false, message: "Stock not found" }, { status: 404 })
      }
      if (stock.currentStock < quantityDiff) {
        return NextResponse.json(
          { success: false, message: `Insufficient stock. Available: ${stock.currentStock}` },
          { status: 400 }
        )
      }
    }

    const session = client.startSession()
    try {
      await session.withTransaction(async () => {
        await db.collection("stock_transfers").updateOne(
          { _id: new ObjectId(id) },
          { $set: { ...validated, updatedAt: new Date() } },
          { session }
        )
        if (quantityDiff !== 0) {
          await db.collection("stocks").updateOne(
            { _id: new ObjectId(existing.stockId) },
            { $inc: { currentStock: -quantityDiff }, $set: { updatedAt: new Date() } },
            { session }
          )
        }
      })
      return NextResponse.json({ success: true, message: "Transfer updated successfully" }, { status: 200 })
    } finally {
      await session.endSession()
    }
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
    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")
    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, message: "Valid transfer ID is required" }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db("gold")

    const transfer = await db.collection("stock_transfers").findOne({ _id: new ObjectId(id) })
    if (!transfer) {
      return NextResponse.json({ success: false, message: "Transfer not found" }, { status: 404 })
    }

    const session = client.startSession()
    try {
      await session.withTransaction(async () => {
        await db.collection("stocks").updateOne(
          { _id: new ObjectId(transfer.stockId) },
          { $inc: { currentStock: transfer.quantity }, $set: { updatedAt: new Date() } },
          { session }
        )
        await db.collection("stock_transfers").deleteOne({ _id: new ObjectId(id) }, { session })
      })
      return NextResponse.json({ success: true, message: "Transfer deleted and stock restored" }, { status: 200 })
    } finally {
      await session.endSession()
    }
  } catch (error) {
    console.error("DELETE /stock-transfer Error:", error)
    return NextResponse.json({ success: false, message: "Error deleting transfer" }, { status: 500 })
  }
}
