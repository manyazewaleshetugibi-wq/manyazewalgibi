import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import type { Expense } from "@/models/Expense"
import { ObjectId } from "mongodb"

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const client = await clientPromise
    const db = client.db("gold")
    const expenseCollection = db.collection<Expense>("expenses")

    const expense = await expenseCollection.findOne({ _id: new ObjectId(params.id) })

    if (!expense) {
      return NextResponse.json({ success: false, error: "Expense not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: expense })
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const client = await clientPromise
    const db = client.db("gold")
    const expenseCollection = db.collection<Expense>("expenses")

    const expenseData: Partial<Expense> = await req.json()
    delete expenseData._id // Ensure _id is not updated

    if (expenseData.createdBy) {
      expenseData.createdBy = new ObjectId(expenseData.createdBy as unknown as string)
    }

    const result = await expenseCollection.updateOne({ _id: new ObjectId(params.id) }, { $set: expenseData })

    if (result.matchedCount === 0) {
      return NextResponse.json({ success: false, error: "Expense not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, message: "Expense updated successfully" })
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const client = await clientPromise
    const db = client.db("gold")
    const expenseCollection = db.collection<Expense>("expenses")

    const result = await expenseCollection.deleteOne({ _id: new ObjectId(params.id) })

    if (result.deletedCount === 0) {
      return NextResponse.json({ success: false, error: "Expense not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, message: "Expense deleted successfully" })
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 })
  }
}

