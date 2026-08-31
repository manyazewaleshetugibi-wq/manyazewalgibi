import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/api-auth"

export const dynamic = "force-dynamic"

const ETH_OFFSET_MS = 3 * 60 * 60 * 1000
const ORDERS_CACHE_TTL_MS = 25_000
const DEFAULT_DAYS = 30
const MAX_DAYS = 90

let ordersSalesCache: { expiresAt: number; dailySales: Record<string, number>; totalSales: number; orderCount: number } | null = null

async function loadOrdersSales(days: number) {
  const now = Date.now()
  if (ordersSalesCache && ordersSalesCache.expiresAt > now) {
    return ordersSalesCache
  }

  const cutoff = new Date(now - days * 24 * 60 * 60 * 1000)

  const ordersRaw = await prisma.order.findMany({
    where: {
      status: "COMPLETED",
      createdAt: { gte: cutoff },
    },
    select: { createdAt: true, finalAmount: true },
  })

  const dailySales: Record<string, number> = {}
  let totalSales = 0

  for (const order of ordersRaw) {
    const createdAtMs = order.createdAt ? order.createdAt.getTime() : now
    const localDate = new Date(createdAtMs + ETH_OFFSET_MS)
    const date = localDate.toISOString().split("T")[0]
    const finalAmount = Number(order.finalAmount) || 0
    dailySales[date] = (dailySales[date] || 0) + finalAmount
    totalSales += finalAmount
  }

  const result = {
    expiresAt: now + ORDERS_CACHE_TTL_MS,
    dailySales,
    totalSales,
    orderCount: ordersRaw.length,
  }

  ordersSalesCache = result
  return result
}

async function loadTodaySales() {
  const now = Date.now()
  const todayStart = new Date(now - ETH_OFFSET_MS)
  todayStart.setHours(0, 0, 0, 0)
  todayStart.setTime(todayStart.getTime() - ETH_OFFSET_MS)

  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000 - 1)

  const todayOrders = await prisma.order.findMany({
    where: {
      status: "COMPLETED",
      createdAt: { gte: todayStart, lte: todayEnd },
    },
    select: { finalAmount: true },
  })

  let todaySales = 0
  for (const o of todayOrders) {
    todaySales += Number(o.finalAmount) || 0
  }

  const todayLabel = new Date(now + ETH_OFFSET_MS).toISOString().split("T")[0]

  return {
    dailySales: { [todayLabel]: todaySales },
    todaySales,
  }
}

export async function GET(req: NextRequest) {
  try {
    const { response } = await requireRole(["admin", "finance"])
    if (response) return response

    const url = new URL(req.url)
    const isTodayMode = url.searchParams.get("today") === "1"

    if (isTodayMode) {
      const today = await loadTodaySales()
      return NextResponse.json({
        success: true,
        data: {
          dailySales: today.dailySales,
          todaySales: today.todaySales,
        },
      })
    }

    const daysParam = Number(url.searchParams.get("days"))
    const days = Number.isFinite(daysParam) && daysParam > 0 ? Math.min(daysParam, MAX_DAYS) : DEFAULT_DAYS

    const [
      ordersSales,
      expensesRaw,
      commonExpensesRaw,
      stockRaw,
      stockPurchasesRaw,
      dailyCashRaw,
      menuItemsRaw,
      categoriesRaw,
    ] = await Promise.all([
      loadOrdersSales(days),
      prisma.expenseRecord.findMany({
        select: { id: true, title: true, amount: true, date: true, category: true, description: true, createdBy: true },
      }),
      prisma.commonExpense.findMany({ orderBy: { createdAt: "desc" } }),
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

    const orderReport = {
      dailySales: ordersSales.dailySales,
      totalSales: ordersSales.totalSales,
      orderCount: ordersSales.orderCount,
      orders: [],
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
