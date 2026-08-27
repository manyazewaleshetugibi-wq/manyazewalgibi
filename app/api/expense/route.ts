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

    const allowedFields = ["title", "description", "amount", "category", "date", "tags", "recurring", "frequency", "notes", "priority", "status", "createdBy"];
    const data: any = {};
    for (const key of allowedFields) {
      if (expenseData[key as keyof Expense] !== undefined) {
        data[key] = expenseData[key as keyof Expense];
      }
    }
    // Backward compatibility: older clients may send the field as "name"
    if (data.title === undefined && (expenseData as any).name !== undefined) {
      data.title = (expenseData as any).name;
    }
    data.createdBy = expenseData.createdBy ? String(expenseData.createdBy) : null

    if (data.amount !== undefined) {
      data.amount = parseFloat(data.amount);
      if (isNaN(data.amount)) {
        return NextResponse.json({ success: false, error: "Invalid amount value" }, { status: 400 })
      }
    }
    if (data.date !== undefined && !(data.date instanceof Date)) {
      data.date = new Date(data.date);
    }

    const result = await prisma.expenseRecord.create({
      data: { id: randomUUID(), ...data }
    })

    return NextResponse.json({ success: true, id: result.id, data: { ...result, _id: result.id } }, { status: 201 })
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
        description: true,
        amount: true,
        category: true,
        date: true,
        tags: true,
        recurring: true,
        frequency: true,
        notes: true,
        priority: true,
        status: true,
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
