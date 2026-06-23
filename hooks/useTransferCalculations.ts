// hooks/useTransferCalculations.ts
import { useMemo } from 'react'
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

export interface TransferData {
  date: string
  zReport: number
  totalCash: number
  totalBank: number
  cafetTransfer: number
  personnelTransfer: number
  totalExpense: number
  dailySales: number
  difference: number
  isBalanced: boolean
  casualExpense: number
  stockPurchase: number
}

export function useTransferCalculations(
  entries: DailyCashEntry[],
  casualExpenses: Expense[],
  stockPurchases: StockPurchase[],
  dailySales: Record<string, number>,
  startDate: Date,
  endDate: Date
) {
  return useMemo(() => {
    const data: TransferData[] = []
    
    // Get all dates in range
    const dates: string[] = []
    let currentDate = new Date(startDate)
    while (currentDate <= endDate) {
      dates.push(format(currentDate, 'yyyy-MM-dd'))
      currentDate = new Date(currentDate.setDate(currentDate.getDate() + 1))
    }
    
    dates.forEach(date => {
      // Find cash entry for this date
      const cashEntry = entries.find(e => e.date.startsWith(date))
      const zReport = cashEntry?.zedAmount || 0
      const totalCash = cashEntry?.cashAmount || 0
      const totalBank = cashEntry?.bankAmount || 0
      
      // Find casual expenses for this date
      const dailyCasual = casualExpenses.filter(e => e.date && e.date.startsWith(date))
      const casualExpense = dailyCasual.reduce((sum, e) => sum + (e.amount || 0), 0)
      
      // Find stock purchases for this date
      const dailyStock = stockPurchases.filter(p => p.purchaseDate && p.purchaseDate.startsWith(date))
      const stockPurchase = dailyStock.reduce((sum, p) => sum + (p.totalAmount || p.quantity * p.unitPrice || 0), 0)
      
      // Total Expense = Casual Expenses + Stock Purchases
      const totalExpense = casualExpense + stockPurchase
      
      // Get daily sales for this date
      const dailySale = dailySales[date] || 0
      
      // Calculate transfers
      const cafetTransfer = zReport / 2
      const personnelTransfer = (zReport / 2) + totalExpense - totalCash
      
      // Check balance: Total Cash + Bank vs Daily Sales
      const totalCashAndBank = totalCash + totalBank
      const difference = totalCashAndBank - dailySale
      const isBalanced = Math.abs(difference) < 1
      
      data.push({
        date,
        zReport,
        totalCash,
        totalBank,
        cafetTransfer,
        personnelTransfer,
        totalExpense,
        dailySales: dailySale,
        difference,
        isBalanced,
        casualExpense,
        stockPurchase
      })
    })
    
    // Calculate totals
    const totals = data.reduce((acc, d) => ({
      totalExpense: acc.totalExpense + d.totalExpense,
      zReport: acc.zReport + d.zReport,
      cafetTransfer: acc.cafetTransfer + d.cafetTransfer,
      personnelTransfer: acc.personnelTransfer + d.personnelTransfer,
      totalCash: acc.totalCash + d.totalCash,
      totalBank: acc.totalBank + d.totalBank,
      dailySales: acc.dailySales + d.dailySales,
      difference: acc.difference + d.difference,
      casualExpense: acc.casualExpense + d.casualExpense,
      stockPurchase: acc.stockPurchase + d.stockPurchase,
    }), {
      totalExpense: 0,
      zReport: 0,
      cafetTransfer: 0,
      personnelTransfer: 0,
      totalCash: 0,
      totalBank: 0,
      dailySales: 0,
      difference: 0,
      casualExpense: 0,
      stockPurchase: 0,
    })
    
    return {
      data,
      totals,
      isOverallBalanced: Math.abs(totals.difference) < 1
    }
  }, [entries, casualExpenses, stockPurchases, dailySales, startDate, endDate])
}