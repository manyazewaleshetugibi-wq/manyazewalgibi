import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import type { Expense } from "@/models/Expense"
import { ObjectId } from "mongodb"

export async function POST(req: NextRequest) {
  try {
    const client = await clientPromise
    const db = client.db()
    const expenseCollection = db.collection<Expense>("expenses")

    const expenseData: Expense = await req.json()
    expenseData.createdBy = new ObjectId(expenseData.createdBy as unknown as string)

    const result = await expenseCollection.insertOne(expenseData)

    return NextResponse.json({ success: true, id: result.insertedId }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 })
  }
}
export async function GET(req: NextRequest) {
  try {
    const client = await clientPromise
    const db = client.db()
    const expenseCollection = db.collection<Expense>("expenses")

    const expenses = await expenseCollection.find().toArray()

    return NextResponse.json({
      success: true,
      data: expenses,
    })
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 })
  }
}
