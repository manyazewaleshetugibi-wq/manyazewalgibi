import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/api-auth"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const { response } = await requireRole(["admin", "finance"])
    if (response) return response

    const [
      expensesRaw,
      commonExpensesRaw,
      ordersRaw,
      stockRaw,
      stockPurchasesRaw,
      dailyCashRaw,
      menuItemsRaw,
      categoriesRaw,
    ] = await Promise.all([
      prisma.expenseRecord.findMany({
        select: { id: true, title: true, amount: true, date: true, category: true, description: true, createdBy: true },
      }),
      prisma.commonExpense.findMany({ orderBy: { createdAt: "desc" } }),
      prisma.order.findMany({
        where: { status: "COMPLETED" },
        select: {
          id: true, createdAt: true, finalAmount: true, tax: true, discount: true,
          totalAmount: true, subtotal: true, items: true, status: true,
          paymentMethod: true, waiterId: true, waiterName: true, tableNumber: true,
          orderNumber: true, completedAt: true,
        },
      }),
      prisma.stock.findMany({
        select: {
          id: true, name: true, currentStock: true, minimumStock: true,
          categoryId: true, unit: true, requiredAmount: true,
          reorderFrequency: true, isActive: true, createdAt: true, updatedAt: true,
        },
      }),
      prisma.stockPurchase.findMany({
        select: {
          id: true, stockId: true, purchaseDate: true,
          quantity: true, unitPrice: true, supplier: true,
        },
        orderBy: { purchaseDate: "desc" },
      }),
      prisma.dailyCash.findMany({
        orderBy: { date: "desc" },
        take: 100,
      }),
      prisma.item.findMany({
        select: {
          id: true, name: true, description: true, categoryId: true,
          price: true, isActive: true, isFeatured: true, preparationTime: true,
          requiredStock: true, imageUrl: true, createdAt: true, updatedAt: true,
        },
        where: { isActive: true },
      }),
      prisma.itemCategory.findMany({
        select: { id: true, name: true, description: true, type: true, imageUrl: true },
      }),
    ])

    const safeToISOString = (dateValue: unknown): string | null => {
      if (!dateValue) return null
      if (dateValue instanceof Date) return dateValue.toISOString()
      if (typeof dateValue === "string") {
        const d = new Date(dateValue)
        if (!isNaN(d.getTime())) return d.toISOString()
      }
      return null
    }

    const expenses = expensesRaw.map((e) => ({ ...e, _id: e.id }))

    const commonExpenses = commonExpensesRaw.map((expense) => ({
      ...expense,
      _id: expense.id,
      startDate: safeToISOString(expense.startDate),
      endDate: safeToISOString(expense.endDate),
      createdAt: safeToISOString(expense.createdAt),
      updatedAt: safeToISOString(expense.updatedAt),
    }))

    const ETH_OFFSET_MS = 3 * 60 * 60 * 1000
    const dailySales: Record<string, number> = {}
    let totalSales = 0

    ordersRaw.forEach((order) => {
      const createdAtMs = order.createdAt ? order.createdAt.getTime() : Date.now()
      const localDate = new Date(createdAtMs + ETH_OFFSET_MS)
      const date = localDate.toISOString().split("T")[0]
      const finalAmount = Number(order.finalAmount) || 0
      if (!dailySales[date]) dailySales[date] = 0
      dailySales[date] += finalAmount
      totalSales += finalAmount
    })

    const orderReport = {
      dailySales,
      totalSales,
      orderCount: ordersRaw.length,
      orders: ordersRaw.map((o) => ({ ...o, _id: o.id })),
    }

    const stock = stockRaw.map((s) => ({ ...s, _id: s.id }))

    const stockPurchases = stockPurchasesRaw.map((p) => ({
      ...p,
      _id: p.id,
      purchaseDate: p.purchaseDate ? new Date(p.purchaseDate).toISOString() : null,
    }))

    const dailyCash = dailyCashRaw.map((entry) => ({
      ...entry,
      _id: entry.id,
      createdAt: entry.createdAt?.toISOString(),
      updatedAt: entry.updatedAt?.toISOString(),
    }))

    const menuItems = menuItemsRaw.map((item) => ({
      ...item,
      _id: item.id,
      requiredStock: item.requiredStock || [],
    }))

    const categories = categoriesRaw.map((c) => ({ ...c, _id: c.id }))

    return NextResponse.json({
      success: true,
      data: {
        expenses,
        commonExpenses,
        orderReport,
        stock,
        stockPurchases,
        dailyCash,
        menuItems,
        categories,
      },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error"
    console.error("Dashboard API error:", error)
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
