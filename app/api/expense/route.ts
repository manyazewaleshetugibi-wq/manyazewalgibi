import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import type { Expense } from "@/models/Expense"
import { randomUUID } from "crypto"
import { requireRole } from "@/lib/api-auth"

export async function POST(req: NextRequest) {
  try {
    const { response } = await requireRole(["admin", "finance"]);
    if (response) return response;

    const expenseData: Expense = await req.json()
    const data: any = { ...expenseData }
    delete data._id
    data.createdBy = expenseData.createdBy ? String(expenseData.createdBy) : null

    const result = await prisma.expenseRecord.create({
      data: { id: randomUUID(), ...data }
    })

    return NextResponse.json({ success: true, id: result.id }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 })
  }
}
export async function GET(req: NextRequest) {
  try {
    const { response } = await requireRole(["admin", "finance"]);
    if (response) return response;

    const expenses = await prisma.expenseRecord.findMany()

    return NextResponse.json({
      success: true,
      data: expenses.map(e => ({ ...e, _id: e.id })),
    })
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 })
  }
}
