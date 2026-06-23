// services/transfer.service.ts
import { format } from 'date-fns'

interface DailyCashEntry {
  _id: string
  date: string
  cashAmount: number
  bankAmount: number
  zedAmount: number
  totalAmount: number
  notes?: string
  createdAt: string
}

interface Expense {
  _id: string
  date: string
  amount: number
  status?: string
  [key: string]: any
}

interface StockPurchase {
  _id: string
  purchaseDate: string
  totalAmount: number
  quantity: number
  unitPrice: number
  [key: string]: any
}

export interface TransferSummary {
  totalZReport: number
  totalCafetTransfer: number
  totalPersonnelTransfer: number
  totalCash: number
  totalBank: number
  totalExpense: number
  totalSales: number
  difference: number
  isBalanced: boolean
  reportCount: number
}

export class TransferService {
  static async getDailyCashEntries(): Promise<DailyCashEntry[]> {
    try {
      const response = await fetch("/api/daily-cash")
      if (!response.ok) throw new Error("Failed to fetch daily cash")
      const data = await response.json()
      return data.data || []
    } catch (error) {
      console.error("Error fetching daily cash:", error)
      return []
    }
  }

  static async getCasualExpenses(): Promise<Expense[]> {
    try {
      const response = await fetch("/api/expense")
      if (!response.ok) throw new Error("Failed to fetch expenses")
      const data = await response.json()
      return data.data || []
    } catch (error) {
      console.error("Error fetching casual expenses:", error)
      return []
    }
  }

  static async getStockPurchases(): Promise<StockPurchase[]> {
    try {
      const { stockApi } = await import("@/services/expense.service")
      const purchasesData = await stockApi.getStockPurchases()
      const stocks = await stockApi.getStockItems()
      const stockMap = new Map(stocks.map(s => [s._id, s.name]))
      
      return purchasesData.map((p: any) => ({
        ...p,
        stockName: stockMap.get(p.stockId) || "Unknown",
        totalAmount: (p.quantity || 0) * (p.unitPrice || 0)
      }))
    } catch (error) {
      console.warn("Stock API not available:", error)
      return []
    }
  }

  static async getDailySales(startDate?: string, endDate?: string): Promise<{ totalSales: number; orderCount: number; averageOrderValue: number; dailySales: Record<string, number> }> {
    try {
      const params = new URLSearchParams()
      if (startDate) params.append('startDate', startDate)
      if (endDate) params.append('endDate', endDate)
      params.append('limit', '999999')
      
      const url = `/api/order/waiterreport${params.toString() ? `?${params.toString()}` : ''}`
      const response = await fetch(url)
      const data = await response.json()
      
      if (data.success && data.orders) {
        let totalSales = 0
        let orderCount = data.orders.length
        const dailySales: Record<string, number> = {}
        
        data.orders.forEach((order: any) => {
          const date = new Date(order.createdAt).toISOString().split('T')[0]
          const amount = order.finalAmount || order.totalAmount || 0
          totalSales += amount
          dailySales[date] = (dailySales[date] || 0) + amount
        })
        
        const averageOrderValue = orderCount > 0 ? totalSales / orderCount : 0
        
        return { totalSales, orderCount, averageOrderValue, dailySales }
      }
      return { totalSales: 0, orderCount: 0, averageOrderValue: 0, dailySales: {} }
    } catch (error) {
      console.error("Error fetching daily sales:", error)
      return { totalSales: 0, orderCount: 0, averageOrderValue: 0, dailySales: {} }
    }
  }

  static calculateTransfers(
    entries: DailyCashEntry[],
    casualExpenses: Expense[],
    stockPurchases: StockPurchase[],
    dailySales: Record<string, number>,
    startDate: Date,
    endDate: Date
  ): TransferSummary {
    let totalZReport = 0
    let totalCash = 0
    let totalBank = 0
    let totalExpense = 0
    let reportCount = 0

    // Get all dates in range
    const dates: string[] = []
    let currentDate = new Date(startDate)
    while (currentDate <= endDate) {
      dates.push(format(currentDate, 'yyyy-MM-dd'))
      currentDate = new Date(currentDate.setDate(currentDate.getDate() + 1))
    }

    let totalSales = 0

    dates.forEach(date => {
      const cashEntry = entries.find(e => e.date.startsWith(date))
      
      if (cashEntry) {
        totalZReport += cashEntry.zedAmount || 0
        totalCash += cashEntry.cashAmount || 0
        totalBank += cashEntry.bankAmount || 0
        reportCount++
      }

      // Calculate expenses for this date
      const dailyCasual = casualExpenses.filter(e => e.date && e.date.startsWith(date))
      const dailyCasualTotal = dailyCasual.reduce((sum, e) => sum + (e.amount || 0), 0)

      const dailyStock = stockPurchases.filter(p => p.purchaseDate && p.purchaseDate.startsWith(date))
      const dailyStockTotal = dailyStock.reduce((sum, p) => sum + (p.totalAmount || p.quantity * p.unitPrice || 0), 0)

      totalExpense += dailyCasualTotal + dailyStockTotal
      totalSales += dailySales[date] || 0
    })

    // Calculate transfers based on totals
    const cafetTransfer = totalZReport / 2
    const personnelTransfer = (totalZReport / 2) + totalExpense - totalCash

    const totalCashAndBank = totalCash + totalBank
    const difference = totalCashAndBank - totalSales
    const isBalanced = Math.abs(difference) < 1

    return {
      totalZReport,
      totalCafetTransfer: cafetTransfer,
      totalPersonnelTransfer: personnelTransfer,
      totalCash,
      totalBank,
      totalExpense,
      totalSales,
      difference,
      isBalanced,
      reportCount
    }
  }
}