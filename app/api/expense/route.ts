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

    const allowedFields = ["name", "amount", "date", "category", "description", "receiptUrl", "paymentMethod", "taxDeductible", "taxAmount", "currency", "createdBy"];
    const data: any = {};
    for (const key of allowedFields) {
      if (expenseData[key as keyof Expense] !== undefined) {
        data[key] = expenseData[key as keyof Expense];
      }
    }
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

    const expenses = await prisma.expenseRecord.findMany({
      select: {
        id: true,
        title: true,
        amount: true,
        date: true,
        category: true,
        description: true,
        createdBy: true,
      }
    })

    return NextResponse.json({
      success: true,
      data: expenses.map(e => ({ ...e, _id: e.id })),
    })
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 })
  }
}
