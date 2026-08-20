import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/api-auth"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { response } = await requireRole(["admin", "finance"]);
    if (response) return response;

    const { id } = await params // Unwrap the params Promise
    
    const expense = await prisma.expenseRecord.findFirst({ where: { id } })

    if (!expense) {
      return NextResponse.json({ success: false, error: "Expense not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: { ...expense, _id: expense.id } })
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { response } = await requireRole(["admin", "finance"]);
    if (response) return response;

    const { id } = await params // Unwrap the params Promise
    
    const expenseData: any = await req.json()
    delete expenseData._id // Ensure _id is not updated

    // Filter to only allow safe fields
    const allowedFields = ['title', 'description', 'amount', 'category', 'date', 'tags', 'recurring', 'frequency', 'notes', 'priority', 'status'];
    const safeData: Record<string, any> = {};
    for (const key of Object.keys(expenseData)) {
      if (allowedFields.includes(key)) {
        safeData[key] = expenseData[key];
      }
    }

    if (safeData.amount !== undefined) {
      safeData.amount = parseFloat(safeData.amount);
      if (isNaN(safeData.amount)) {
        return NextResponse.json({ success: false, error: "Invalid amount value" }, { status: 400 })
      }
    }

    const result = await prisma.expenseRecord.updateMany({ where: { id }, data: safeData })

    if (result.count === 0) {
      return NextResponse.json({ success: false, error: "Expense not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, message: "Expense updated successfully" })
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { response } = await requireRole(["admin", "finance"]);
    if (response) return response;

    const { id } = await params // Unwrap the params Promise
    
    const result = await prisma.expenseRecord.deleteMany({ where: { id } })

    if (result.count === 0) {
      return NextResponse.json({ success: false, error: "Expense not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, message: "Expense deleted successfully" })
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 })
  }
}
