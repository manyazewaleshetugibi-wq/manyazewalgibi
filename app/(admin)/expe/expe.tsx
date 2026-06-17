"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Receipt,
  Wallet,
  Package,
  CalendarIcon,
  TrendingUp,
  DollarSign,
  CreditCard,
  FileText,
  RefreshCw,
  Edit,
  Trash2,
  X,
  Plus,
  PieChart,
  TrendingDown,
  ChevronDown,
  ChevronUp,
  Info,
  AlertCircle,
  CheckCircle,
  AlertTriangle,
  Building2,
  Users,
  Landmark,
  Coins
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { format, startOfDay, endOfDay, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns"
import { toast, Toaster } from "react-hot-toast"
import { StockPurchases } from "@/components/expanse/StockPurchases"
import { CasualExpenses } from "@/components/expanse/CasualExpenses"
import { useRouter } from "next/navigation"
import React from "react"

// ============================================================================
// TYPES
// ============================================================================

type DateFilterType = 'today' | 'yesterday' | 'week' | 'month' | 'custom'

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

interface StockPurchase {
  _id: string
  stockId: string
  stockName: string
  quantity: number
  unitPrice: number
  totalAmount: number
  supplier: string
  purchaseDate: string
  notes?: string
  createdAt?: string
}

interface Order {
  _id: string
  orderNumber: string
  tableNumber: string
  waiterId: string
  waiterName?: string
  numberOfGuests: number
  items: any[]
  totalAmount: number
  discount: number
  tax: number
  finalAmount: number
  status: string
  paymentMethod: string
  specialRequirements: string
  notes?: string
  createdAt: string
  updatedAt: string
  delivery?: boolean
  inTable?: boolean
  restaurantId?: string
  restaurantName?: string
}

interface DailyZReport {
  date: string
  totalExpense: number
  zReport: number
  cafetTransfer: number
  personnelTransfer: number
  totalCash: number
  totalBank: number
  dailySales: number
  difference: number
  isBalanced: boolean
  casualExpense: number
  stockPurchase: number
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

async function fetchDailyCash(): Promise<DailyCashEntry[]> {
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

async function fetchDailyRevenue(startDate?: string, endDate?: string): Promise<{ totalSales: number; orderCount: number; averageOrderValue: number; dailySales: Record<string, number> }> {
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
      
      data.orders.forEach((order: Order) => {
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
    console.error("Error fetching daily revenue:", error)
    return { totalSales: 0, orderCount: 0, averageOrderValue: 0, dailySales: {} }
  }
}

async function fetchStockPurchases(): Promise<StockPurchase[]> {
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

async function createDailyCashEntry(data: any): Promise<any> {
  const response = await fetch('/api/daily-cash', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error || "Failed to create Z-Report")
  }
  return response.json()
}

async function updateDailyCashEntry(id: string, data: any): Promise<any> {
  const response = await fetch(`/api/daily-cash?id=${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error || "Failed to update Z-Report")
  }
  return response.json()
}

async function deleteDailyCashEntry(id: string): Promise<any> {
  const response = await fetch(`/api/daily-cash?id=${id}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
  })
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error || "Failed to delete Z-Report")
  }
  return response.json()
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { 
    style: 'currency', 
    currency: 'ETB', 
    minimumFractionDigits: 2 
  }).format(amount)
}

function getDateRange(filterType: DateFilterType, customStart?: Date, customEnd?: Date): { start: Date; end: Date } {
  const now = new Date()
  let start = new Date()
  let end = new Date()
  end.setHours(23, 59, 59, 999)
  
  switch (filterType) {
    case 'today':
      start = startOfDay(now)
      end = endOfDay(now)
      break
    case 'yesterday':
      const yesterday = subDays(now, 1)
      start = startOfDay(yesterday)
      end = endOfDay(yesterday)
      break
    case 'week':
      start = startOfWeek(now, { weekStartsOn: 1 })
      end = endOfWeek(now, { weekStartsOn: 1 })
      break
    case 'month':
      start = startOfMonth(now)
      end = endOfMonth(now)
      break
    case 'custom':
      if (customStart) start = startOfDay(customStart)
      if (customEnd) end = endOfDay(customEnd)
      break
    default:
      start = startOfDay(now)
      end = endOfDay(now)
  }
  
  return { start, end }
}

function getDateRangeLabel(filterType: DateFilterType, customStart?: Date, customEnd?: Date): string {
  const { start, end } = getDateRange(filterType, customStart, customEnd)
  switch (filterType) {
    case 'today': return 'Today'
    case 'yesterday': return 'Yesterday'
    case 'week': return `This Week`
    case 'month': return format(start, 'MMMM yyyy')
    case 'custom': return `${format(start, 'MMM dd')} - ${format(end, 'MMM dd')}`
    default: return 'Today'
  }
}

// ============================================================================
// DATE FILTER COMPONENT - Mobile First
// ============================================================================

function DateFilter({ 
  filterType, 
  onFilterChange,
  customStart,
  customEnd,
  onCustomDateChange
}: { 
  filterType: DateFilterType
  onFilterChange: (filter: DateFilterType) => void
  customStart?: Date | null
  customEnd?: Date | null
  onCustomDateChange?: (start: Date | null, end: Date | null) => void
}) {
  const [showCustom, setShowCustom] = useState(false)

  return (
    <Card className="rounded-xl sm:rounded-2xl border-0 shadow-lg bg-gradient-to-r from-purple-50/50 to-purple-100/30 dark:from-purple-950/20 dark:to-purple-900/10 backdrop-blur-sm">
      <CardContent className="p-2 sm:p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-hide -mx-1 px-1 sm:mx-0 sm:px-0 sm:flex-wrap sm:overflow-visible">
            {['today', 'yesterday', 'week', 'month'].map((filter) => (
              <Button
                key={filter}
                variant={filterType === filter ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  onFilterChange(filter as DateFilterType)
                  if (onCustomDateChange) onCustomDateChange(null, null)
                }}
                className={`rounded-full px-2.5 sm:px-4 text-[10px] sm:text-xs md:text-sm capitalize transition-all whitespace-nowrap flex-shrink-0 ${
                  filterType === filter 
                    ? 'bg-purple-900 hover:bg-purple-800 shadow-lg shadow-purple-900/25' 
                    : 'hover:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/30 border-purple-200/50'
                }`}
              >
                <span className="sm:hidden">
                  {filter === 'today' ? '📅' : filter === 'yesterday' ? '📆' : filter === 'week' ? '📊' : '📈'}
                </span>
                <span className="hidden sm:inline">
                  {filter === 'today' ? '📅' : filter === 'yesterday' ? '📆' : filter === 'week' ? '📊' : '📈'}
                  <span className="ml-1">{filter}</span>
                </span>
              </Button>
            ))}
            <Button
              variant={filterType === 'custom' ? "default" : "outline"}
              size="sm"
              onClick={() => {
                onFilterChange('custom')
                setShowCustom(true)
              }}
              className={`rounded-full px-2.5 sm:px-4 text-[10px] sm:text-xs md:text-sm transition-all whitespace-nowrap flex-shrink-0 ${
                filterType === 'custom' 
                  ? 'bg-purple-900 hover:bg-purple-800 shadow-lg shadow-purple-900/25' 
                  : 'hover:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/30 border-purple-200/50'
              }`}
            >
              <span className="sm:hidden">🗓️</span>
              <span className="hidden sm:inline">🗓️ Custom</span>
            </Button>
          </div>
          
          <Badge variant="secondary" className="rounded-full px-2.5 py-1 sm:px-3 sm:py-1.5 bg-white/50 dark:bg-black/20 backdrop-blur-sm border-purple-200 text-[10px] sm:text-xs flex-shrink-0">
            <CalendarIcon className="h-3 w-3 mr-1 text-purple-900" />
            <span className="truncate max-w-[120px] sm:max-w-none">
              {getDateRangeLabel(filterType, customStart || undefined, customEnd || undefined)}
            </span>
          </Badge>
        </div>
        
        {filterType === 'custom' && showCustom && (
          <div className="flex flex-col sm:flex-row flex-wrap gap-2 mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-purple-200/30">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] sm:text-xs font-medium">From</span>
              <input
                type="date"
                className="px-2 py-1.5 text-xs border rounded-lg focus:ring-2 focus:ring-purple-900 focus:border-transparent outline-none w-full sm:w-auto"
                value={customStart ? format(customStart, 'yyyy-MM-dd') : ''}
                onChange={(e) => {
                  const date = e.target.value ? new Date(e.target.value) : null
                  if (onCustomDateChange) onCustomDateChange(date, customEnd || null)
                }}
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] sm:text-xs font-medium">To</span>
              <input
                type="date"
                className="px-2 py-1.5 text-xs border rounded-lg focus:ring-2 focus:ring-purple-900 focus:border-transparent outline-none w-full sm:w-auto"
                value={customEnd ? format(customEnd, 'yyyy-MM-dd') : ''}
                onChange={(e) => {
                  const date = e.target.value ? new Date(e.target.value) : null
                  if (onCustomDateChange) onCustomDateChange(customStart || null, date)
                }}
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (onCustomDateChange) onCustomDateChange(null, null)
                setShowCustom(false)
              }}
              className="rounded-full text-xs w-full sm:w-auto"
            >
              Close
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================================================
// MODULE CARD COMPONENT - Mobile First
// ============================================================================

function ModuleCard({ 
  title, 
  value, 
  subtitle,
  isActive, 
  onClick 
}: { 
  title: string
  value: string | number
  subtitle?: string
  isActive: boolean
  onClick: () => void
}) {
  return (
    <div className="cursor-pointer transition-all duration-300 active:scale-95 touch-manipulation" onClick={onClick}>
      <Card className={`rounded-xl sm:rounded-2xl border-0 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden ${
        isActive ? 'ring-2 ring-offset-2 ring-purple-900 shadow-xl' : ''
      }`}>
        <CardContent className="p-2.5 sm:p-4">
          <div className="flex flex-col">
            <p className="text-[8px] sm:text-[10px] md:text-xs font-medium text-muted-foreground truncate">{title}</p>
            <p className="text-sm sm:text-base md:text-xl font-bold text-purple-900 dark:text-purple-300 mt-0.5 truncate">
              {value}
            </p>
            {subtitle && (
              <p className="text-[6px] sm:text-[8px] md:text-[10px] text-muted-foreground mt-0.5 truncate">{subtitle}</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================================================
// Z-REPORT DETAIL CARD - Mobile Component
// ============================================================================

function ZReportMobileCard({ 
  row, 
  isExpanded, 
  onToggle 
}: { 
  row: DailyZReport
  isExpanded: boolean
  onToggle: () => void
}) {
  const isRowBalanced = Math.abs(row.difference) < 1
  
  return (
    <Card className={`rounded-xl border-0 shadow-md overflow-hidden ${
      isRowBalanced ? 'bg-emerald-50/30 dark:bg-emerald-950/10' : 'bg-red-50/30 dark:bg-red-950/10'
    }`}>
      <CardContent className="p-3">
        {/* Header */}
        <div className="flex justify-between items-start mb-2">
          <div>
            <p className="text-xs font-bold text-purple-900 dark:text-purple-300">
              {format(new Date(row.date), 'MMM dd, yyyy')}
            </p>
            <Badge className={`mt-1 text-[8px] ${isRowBalanced ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
              {isRowBalanced ? '✅ Balanced' : '⚠️ Check'}
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            className="h-7 w-7 p-0 rounded-full hover:bg-purple-100 dark:hover:bg-purple-900/30"
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4 text-purple-600" />
            ) : (
              <ChevronDown className="h-4 w-4 text-purple-600" />
            )}
          </Button>
        </div>
        
        {/* Main Metrics Grid */}
        <div className="grid grid-cols-2 gap-1.5 text-[10px]">
          <div className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-1.5">
            <p className="text-muted-foreground text-[8px]">Z Report</p>
            <p className="font-bold text-purple-600 text-xs">{formatCurrency(row.zReport)}</p>
          </div>
          <div className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-1.5">
            <p className="text-muted-foreground text-[8px]">Sales</p>
            <p className="font-bold text-green-600 text-xs">{formatCurrency(row.dailySales)}</p>
          </div>
          <div className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-1.5">
            <p className="text-muted-foreground text-[8px]">Cash</p>
            <p className="font-bold text-emerald-600 text-xs">{formatCurrency(row.totalCash)}</p>
          </div>
          <div className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-1.5">
            <p className="text-muted-foreground text-[8px]">Bank</p>
            <p className="font-bold text-cyan-600 text-xs">{formatCurrency(row.totalBank)}</p>
          </div>
          <div className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-1.5">
            <p className="text-muted-foreground text-[8px]">Expense</p>
            <p className="font-bold text-red-600 text-xs">{formatCurrency(row.totalExpense)}</p>
          </div>
          <div className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-1.5">
            <p className="text-muted-foreground text-[8px]">Diff</p>
            <p className={`font-bold text-xs ${isRowBalanced ? 'text-emerald-600' : 'text-red-600'}`}>
              {formatCurrency(row.difference)}
            </p>
          </div>
        </div>
        
        {/* Transfer Cards - Always Visible */}
        <div className="grid grid-cols-2 gap-2 mt-2">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20 rounded-xl p-2 border border-blue-200/30">
            <div className="flex items-center gap-1.5 mb-1">
              <Building2 className="h-3 w-3 text-blue-600" />
              <p className="text-[8px] font-semibold text-blue-700">Cafet Transfer</p>
            </div>
            <p className="text-sm font-bold text-blue-600">{formatCurrency(row.cafetTransfer)}</p>
            <p className="text-[7px] text-muted-foreground">Z Report / 2</p>
          </div>
          <div className="bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-950/30 dark:to-orange-900/20 rounded-xl p-2 border border-orange-200/30">
            <div className="flex items-center gap-1.5 mb-1">
              <Users className="h-3 w-3 text-orange-600" />
              <p className="text-[8px] font-semibold text-orange-700">Personnel Transfer</p>
            </div>
            <p className="text-sm font-bold text-orange-600">{formatCurrency(row.personnelTransfer)}</p>
            <p className="text-[7px] text-muted-foreground">(Z/2) + Expense - Cash</p>
          </div>
        </div>
        
        {/* Expanded Details */}
        {isExpanded && (
          <div className="mt-3 pt-3 border-t border-purple-200/30 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="grid grid-cols-2 gap-1.5 text-[9px]">
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-1.5">
                <p className="text-muted-foreground text-[7px]">Casual Expense</p>
                <p className="font-medium text-red-600">{formatCurrency(row.casualExpense)}</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-1.5">
                <p className="text-muted-foreground text-[7px]">Stock Purchase</p>
                <p className="font-medium text-orange-600">{formatCurrency(row.stockPurchase)}</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-1.5">
                <p className="text-muted-foreground text-[7px]">Cash + Bank</p>
                <p className="font-bold text-blue-700">{formatCurrency(row.totalCash + row.totalBank)}</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-1.5">
                <p className="text-muted-foreground text-[7px]">Formula</p>
                <p className={`font-bold ${isRowBalanced ? 'text-emerald-600' : 'text-red-600'}`}>
                  {isRowBalanced ? '✅ Matches' : '❌ Mismatch'}
                </p>
              </div>
            </div>
            <div className="mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
              <p className="text-[7px] font-mono text-center break-all">
                Cash ({formatCurrency(row.totalCash)}) + Bank ({formatCurrency(row.totalBank)}) 
                = {formatCurrency(row.totalCash + row.totalBank)} 
                {isRowBalanced ? ' ✅' : ' ❌'} Sales ({formatCurrency(row.dailySales)})
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================================================
// DAILY Z REPORT TABLE COMPONENT - Mobile First
// ============================================================================

function DailyZReportTable({ 
  entries, 
  casualExpenses, 
  stockPurchases,
  dailySales,
  startDate,
  endDate
}: { 
  entries: DailyCashEntry[]
  casualExpenses: any[]
  stockPurchases: StockPurchase[]
  dailySales: Record<string, number>
  startDate: Date
  endDate: Date
}) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  const toggleRow = (date: string) => {
    const newSet = new Set(expandedRows)
    if (newSet.has(date)) {
      newSet.delete(date)
    } else {
      newSet.add(date)
    }
    setExpandedRows(newSet)
  }

  // Calculate Z Report data for each day
  const zReportData = useMemo(() => {
    const data: DailyZReport[] = []
    
    const dates: string[] = []
    let currentDate = new Date(startDate)
    while (currentDate <= endDate) {
      dates.push(format(currentDate, 'yyyy-MM-dd'))
      currentDate = new Date(currentDate.setDate(currentDate.getDate() + 1))
    }
    
    dates.forEach(date => {
      const cashEntry = entries.find(e => e.date.startsWith(date))
      const zReport = cashEntry?.zedAmount || 0
      const totalCash = cashEntry?.cashAmount || 0
      const totalBank = cashEntry?.bankAmount || 0
      
      const dailyCasual = casualExpenses.filter(e => e.date && e.date.startsWith(date))
      const casualExpense = dailyCasual.reduce((sum, e) => sum + (e.amount || 0), 0)
      
      const dailyStock = stockPurchases.filter(p => p.purchaseDate && p.purchaseDate.startsWith(date))
      const stockPurchase = dailyStock.reduce((sum, p) => sum + (p.totalAmount || p.quantity * p.unitPrice || 0), 0)
      
      const totalExpense = casualExpense + stockPurchase
      const dailySale = dailySales[date] || 0
      
      const cafetTransfer = zReport / 2
      const personnelTransfer = (zReport / 2) + totalExpense - totalCash
      
      const totalCashAndBank = totalCash + totalBank
      const difference = totalCashAndBank - dailySale
      const isBalanced = Math.abs(difference) < 1
      
      data.push({
        date,
        totalExpense,
        zReport,
        cafetTransfer,
        personnelTransfer,
        totalCash,
        totalBank,
        dailySales: dailySale,
        difference,
        isBalanced,
        casualExpense,
        stockPurchase
      })
    })
    
    return data.filter(d => d.zReport > 0 || d.totalExpense > 0 || d.dailySales > 0)
  }, [entries, casualExpenses, stockPurchases, dailySales, startDate, endDate])
  
  const totals = useMemo(() => {
    return zReportData.reduce((acc, d) => ({
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
  }, [zReportData])
  
  if (zReportData.length === 0) {
    return (
      <Card className="rounded-xl sm:rounded-2xl border-0 shadow-lg">
        <CardContent className="p-6 sm:p-8 text-center">
          <FileText className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm sm:text-base text-muted-foreground">No Z-Report data found for the selected period</p>
        </CardContent>
      </Card>
    )
  }
  
  const isOverallBalanced = Math.abs(totals.difference) < 1
  
  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Balance Status Card - Mobile First */}
      <Card className={`rounded-xl sm:rounded-2xl border-0 shadow-lg overflow-hidden ${
        isOverallBalanced 
          ? 'bg-gradient-to-r from-emerald-50 to-emerald-100/50 dark:from-emerald-950/30 dark:to-emerald-900/20' 
          : 'bg-gradient-to-r from-red-50 to-red-100/50 dark:from-red-950/30 dark:to-red-900/20'
      }`}>
        <CardContent className="p-3 sm:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
              {isOverallBalanced ? (
                <CheckCircle className="h-5 w-5 sm:h-8 sm:w-8 text-emerald-600 flex-shrink-0" />
              ) : (
                <AlertCircle className="h-5 w-5 sm:h-8 sm:w-8 text-red-600 flex-shrink-0" />
              )}
              <div className="min-w-0">
                <h4 className="text-sm sm:text-lg font-semibold truncate">
                  {isOverallBalanced ? '✅ Balanced!' : '⚠️ Not Balanced!'}
                </h4>
                <p className="text-[10px] sm:text-sm text-muted-foreground truncate">
                  {isOverallBalanced 
                    ? 'Cash + Bank match Daily Sales' 
                    : `Diff: ${formatCurrency(Math.abs(totals.difference))}`}
                </p>
              </div>
            </div>
            <div className="text-right w-full sm:w-auto">
              <p className="text-[10px] sm:text-sm text-muted-foreground">Difference</p>
              <p className={`text-base sm:text-xl font-bold ${isOverallBalanced ? 'text-emerald-600' : 'text-red-600'}`}>
                {formatCurrency(totals.difference)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Mobile Card View - shows on small screens */}
      <div className="block sm:hidden space-y-3">
        {zReportData.map((row) => (
          <ZReportMobileCard
            key={row.date}
            row={row}
            isExpanded={expandedRows.has(row.date)}
            onToggle={() => toggleRow(row.date)}
          />
        ))}
      </div>
      
      {/* Desktop Table View - hidden on mobile */}
      <div className="hidden sm:block">
        <Card className="rounded-2xl border-0 shadow-lg overflow-hidden">
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-xs sm:text-sm">
              <thead className="bg-purple-50 dark:bg-purple-950/30">
                <tr className="border-b">
                  <th className="text-left p-2 sm:p-3 font-semibold text-purple-900 dark:text-purple-300 whitespace-nowrap">Date</th>
                  <th className="text-right p-2 sm:p-3 font-semibold text-purple-900 dark:text-purple-300 whitespace-nowrap">Expense</th>
                  <th className="text-right p-2 sm:p-3 font-semibold text-purple-900 dark:text-purple-300 whitespace-nowrap">Z Report</th>
                  <th className="text-right p-2 sm:p-3 font-semibold text-purple-900 dark:text-purple-300 whitespace-nowrap">Cafet</th>
                  <th className="text-right p-2 sm:p-3 font-semibold text-purple-900 dark:text-purple-300 whitespace-nowrap">Personnel</th>
                  <th className="text-right p-2 sm:p-3 font-semibold text-purple-900 dark:text-purple-300 whitespace-nowrap">Cash</th>
                  <th className="text-right p-2 sm:p-3 font-semibold text-purple-900 dark:text-purple-300 whitespace-nowrap">Bank</th>
                  <th className="text-right p-2 sm:p-3 font-semibold text-purple-900 dark:text-purple-300 whitespace-nowrap">Sales</th>
                  <th className="text-center p-2 sm:p-3 font-semibold text-purple-900 dark:text-purple-300 whitespace-nowrap">Status</th>
                  <th className="text-center p-2 sm:p-3 font-semibold text-purple-900 dark:text-purple-300 whitespace-nowrap">Details</th>
                </tr>
              </thead>
              <tbody>
                {zReportData.map((row) => {
                  const isRowBalanced = Math.abs(row.difference) < 1
                  const isExpanded = expandedRows.has(row.date)
                  
                  return (
                    <React.Fragment key={row.date}>
                      <tr className={`border-b hover:bg-purple-50/50 dark:hover:bg-purple-950/20 transition-colors ${
                        isRowBalanced ? 'bg-emerald-50/30 dark:bg-emerald-950/10' : 'bg-red-50/30 dark:bg-red-950/10'
                      }`}>
                        <td className="p-2 sm:p-3 font-medium whitespace-nowrap">{format(new Date(row.date), 'MMM dd, yyyy')}</td>
                        <td className="text-right p-2 sm:p-3 text-red-600 whitespace-nowrap">{formatCurrency(row.totalExpense)}</td>
                        <td className="text-right p-2 sm:p-3 font-bold text-purple-600 whitespace-nowrap">{formatCurrency(row.zReport)}</td>
                        <td className="text-right p-2 sm:p-3 text-blue-600 whitespace-nowrap">{formatCurrency(row.cafetTransfer)}</td>
                        <td className="text-right p-2 sm:p-3 text-orange-600 whitespace-nowrap">{formatCurrency(row.personnelTransfer)}</td>
                        <td className="text-right p-2 sm:p-3 text-emerald-600 whitespace-nowrap">{formatCurrency(row.totalCash)}</td>
                        <td className="text-right p-2 sm:p-3 text-cyan-600 whitespace-nowrap">{formatCurrency(row.totalBank)}</td>
                        <td className="text-right p-2 sm:p-3 font-bold text-green-600 whitespace-nowrap">{formatCurrency(row.dailySales)}</td>
                        <td className="text-center p-2 sm:p-3 whitespace-nowrap">
                          <Badge className={isRowBalanced ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}>
                            {isRowBalanced ? '✅' : '⚠️'}
                          </Badge>
                        </td>
                        <td className="text-center p-2 sm:p-3 whitespace-nowrap">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleRow(row.date)}
                            className="h-7 w-7 p-0 rounded-full hover:bg-purple-100 dark:hover:bg-purple-900/30"
                          >
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4 text-purple-600" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-purple-600" />
                            )}
                          </Button>
                        </td>
                      </tr>
                      
                      {isExpanded && (
                        <tr className="bg-purple-50/50 dark:bg-purple-950/20">
                          <td colSpan={10} className="p-3 sm:p-4">
                            <Card className="border-0 shadow-sm bg-white dark:bg-gray-900">
                              <CardContent className="p-3 sm:p-4">
                                <h5 className="text-xs sm:text-sm font-semibold mb-2 sm:mb-3 text-purple-900 dark:text-purple-300">
                                  Details for {format(new Date(row.date), 'MMMM dd, yyyy')}
                                </h5>
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
                                  <div className="space-y-0.5">
                                    <p className="text-[8px] sm:text-xs text-muted-foreground">Casual Expenses</p>
                                    <p className="text-xs sm:text-sm font-medium text-red-600">{formatCurrency(row.casualExpense)}</p>
                                  </div>
                                  <div className="space-y-0.5">
                                    <p className="text-[8px] sm:text-xs text-muted-foreground">Stock Purchases</p>
                                    <p className="text-xs sm:text-sm font-medium text-orange-600">{formatCurrency(row.stockPurchase)}</p>
                                  </div>
                                  <div className="space-y-0.5">
                                    <p className="text-[8px] sm:text-xs text-muted-foreground">Total Expense</p>
                                    <p className="text-xs sm:text-sm font-bold text-red-700">{formatCurrency(row.totalExpense)}</p>
                                  </div>
                                  <div className="space-y-0.5">
                                    <p className="text-[8px] sm:text-xs text-muted-foreground">Z Report</p>
                                    <p className="text-xs sm:text-sm font-medium text-purple-600">{formatCurrency(row.zReport)}</p>
                                  </div>
                                  <div className="space-y-0.5">
                                    <p className="text-[8px] sm:text-xs text-muted-foreground">Cafet Transfer</p>
                                    <p className="text-xs sm:text-sm font-medium text-blue-600">{formatCurrency(row.cafetTransfer)}</p>
                                  </div>
                                  <div className="space-y-0.5">
                                    <p className="text-[8px] sm:text-xs text-muted-foreground">Personnel Transfer</p>
                                    <p className="text-xs sm:text-sm font-medium text-orange-600">{formatCurrency(row.personnelTransfer)}</p>
                                  </div>
                                  <div className="space-y-0.5">
                                    <p className="text-[8px] sm:text-xs text-muted-foreground">Total Cash</p>
                                    <p className="text-xs sm:text-sm font-medium text-emerald-600">{formatCurrency(row.totalCash)}</p>
                                  </div>
                                  <div className="space-y-0.5">
                                    <p className="text-[8px] sm:text-xs text-muted-foreground">Total Bank</p>
                                    <p className="text-xs sm:text-sm font-medium text-cyan-600">{formatCurrency(row.totalBank)}</p>
                                  </div>
                                  <div className="space-y-0.5">
                                    <p className="text-[8px] sm:text-xs text-muted-foreground">Cash + Bank</p>
                                    <p className="text-xs sm:text-sm font-bold text-blue-700">{formatCurrency(row.totalCash + row.totalBank)}</p>
                                  </div>
                                  <div className="space-y-0.5">
                                    <p className="text-[8px] sm:text-xs text-muted-foreground">Daily Sales</p>
                                    <p className="text-xs sm:text-sm font-medium text-green-600">{formatCurrency(row.dailySales)}</p>
                                  </div>
                                  <div className="space-y-0.5">
                                    <p className="text-[8px] sm:text-xs text-muted-foreground">Difference</p>
                                    <p className={`text-xs sm:text-sm font-bold ${row.isBalanced ? 'text-emerald-600' : 'text-red-600'}`}>
                                      {formatCurrency(row.difference)}
                                    </p>
                                  </div>
                                  <div className="space-y-0.5 col-span-full">
                                    <p className="text-[8px] sm:text-xs text-muted-foreground">Formula Check</p>
                                    <p className="text-[8px] sm:text-xs font-mono bg-gray-100 dark:bg-gray-800 p-1.5 sm:p-2 rounded-lg">
                                      Cash ({formatCurrency(row.totalCash)}) + Bank ({formatCurrency(row.totalBank)}) 
                                      = {formatCurrency(row.totalCash + row.totalBank)} 
                                      {row.isBalanced ? ' ✅' : ' ❌'} Sales ({formatCurrency(row.dailySales)})
                                    </p>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })}
                
                <tr className={`font-bold ${
                  isOverallBalanced 
                    ? 'bg-emerald-100/50 dark:bg-emerald-900/20' 
                    : 'bg-red-100/50 dark:bg-red-900/20'
                }`}>
                  <td className="p-2 sm:p-3 text-purple-900 dark:text-purple-300">TOTAL</td>
                  <td className="text-right p-2 sm:p-3 text-red-700">{formatCurrency(totals.totalExpense)}</td>
                  <td className="text-right p-2 sm:p-3 text-purple-700">{formatCurrency(totals.zReport)}</td>
                  <td className="text-right p-2 sm:p-3 text-blue-700">{formatCurrency(totals.cafetTransfer)}</td>
                  <td className="text-right p-2 sm:p-3 text-orange-700">{formatCurrency(totals.personnelTransfer)}</td>
                  <td className="text-right p-2 sm:p-3 text-emerald-700">{formatCurrency(totals.totalCash)}</td>
                  <td className="text-right p-2 sm:p-3 text-cyan-700">{formatCurrency(totals.totalBank)}</td>
                  <td className="text-right p-2 sm:p-3 text-green-700">{formatCurrency(totals.dailySales)}</td>
                  <td className="text-center p-2 sm:p-3">
                    <Badge className={isOverallBalanced ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}>
                      {isOverallBalanced ? '✅' : '⚠️'}
                    </Badge>
                  </td>
                  <td className="text-center p-2 sm:p-3"></td>
                </tr>
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
      
      {/* Summary Cards - Mobile First */}
      <div className="grid grid-cols-2 gap-1.5 sm:gap-2 md:grid-cols-4">
        <Card className="rounded-xl sm:rounded-2xl border-0 shadow-md bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-950/30 dark:to-red-900/20">
          <CardContent className="pt-2 sm:pt-4 px-2 sm:px-4 pb-2 sm:pb-4">
            <p className="text-[6px] sm:text-[10px] md:text-xs text-muted-foreground">Expense</p>
            <p className="text-xs sm:text-sm md:text-xl font-bold text-red-600 truncate">{formatCurrency(totals.totalExpense)}</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl sm:rounded-2xl border-0 shadow-md bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20">
          <CardContent className="pt-2 sm:pt-4 px-2 sm:px-4 pb-2 sm:pb-4">
            <p className="text-[6px] sm:text-[10px] md:text-xs text-muted-foreground">Z Report</p>
            <p className="text-xs sm:text-sm md:text-xl font-bold text-blue-600 truncate">{formatCurrency(totals.zReport)}</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl sm:rounded-2xl border-0 shadow-md bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/30 dark:to-green-900/20">
          <CardContent className="pt-2 sm:pt-4 px-2 sm:px-4 pb-2 sm:pb-4">
            <p className="text-[6px] sm:text-[10px] md:text-xs text-muted-foreground">Sales</p>
            <p className="text-xs sm:text-sm md:text-xl font-bold text-green-600 truncate">{formatCurrency(totals.dailySales)}</p>
          </CardContent>
        </Card>
        <Card className={`rounded-xl sm:rounded-2xl border-0 shadow-md ${isOverallBalanced ? 'bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/30 dark:to-emerald-900/20' : 'bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-950/30 dark:to-red-900/20'}`}>
          <CardContent className="pt-2 sm:pt-4 px-2 sm:px-4 pb-2 sm:pb-4">
            <p className="text-[6px] sm:text-[10px] md:text-xs text-muted-foreground">Diff</p>
            <p className={`text-xs sm:text-sm md:text-xl font-bold truncate ${isOverallBalanced ? 'text-emerald-600' : 'text-red-600'}`}>
              {formatCurrency(totals.difference)}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ============================================================================
// DAILY CASH MANAGER COMPONENT - Mobile First
// ============================================================================

function DailyCashManager({ 
  onRefresh, 
  dateFilterType,
  customStart,
  customEnd,
  casualExpenses,
  stockPurchases,
  dailySales
}: { 
  onRefresh?: () => void
  dateFilterType: DateFilterType
  customStart?: Date | null
  customEnd?: Date | null
  casualExpenses: any[]
  stockPurchases: StockPurchase[]
  dailySales: Record<string, number>
}) {
  const [entries, setEntries] = useState<DailyCashEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingEntry, setEditingEntry] = useState<DailyCashEntry | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    cashAmount: "",
    bankAmount: "",
    zedAmount: "",
    notes: "",
  })

  const loadData = async () => {
    setIsLoading(true)
    try {
      const data = await fetchDailyCash()
      setEntries(data)
    } catch (error) {
      console.error("Error loading data:", error)
      toast.error("Failed to load Z-Reports")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  const { start, end } = getDateRange(dateFilterType, customStart || undefined, customEnd || undefined)
  
  const filteredEntries = entries
    .filter(e => {
      const entryDate = new Date(e.date)
      return entryDate >= start && entryDate <= end
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const totals = filteredEntries.reduce((acc, e) => ({
    totalCash: acc.totalCash + e.cashAmount,
    totalBank: acc.totalBank + e.bankAmount,
    totalZed: acc.totalZed + e.zedAmount,
    count: acc.count + 1,
  }), { totalCash: 0, totalBank: 0, totalZed: 0, count: 0 })

  const handleSubmit = async () => {
    if (!formData.zedAmount) {
      toast.error("Zed Amount is required")
      return
    }

    setIsSubmitting(true)
    const payload = {
      date: formData.date,
      cashAmount: parseFloat(formData.cashAmount) || 0,
      bankAmount: parseFloat(formData.bankAmount) || 0,
      zedAmount: parseFloat(formData.zedAmount) || 0,
      notes: formData.notes,
    }

    try {
      if (editingEntry) {
        await updateDailyCashEntry(editingEntry._id, payload)
        toast.success("Z-Report updated successfully!")
      } else {
        await createDailyCashEntry(payload)
        toast.success("Z-Report saved successfully!")
      }
      
      await loadData()
      if (onRefresh) onRefresh()
      setShowForm(false)
      setEditingEntry(null)
      setFormData({ date: new Date().toISOString().split('T')[0], cashAmount: "", bankAmount: "", zedAmount: "", notes: "" })
    } catch (error: any) {
      toast.error(error.message || "Failed to save Z-Report")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = (entry: DailyCashEntry) => {
    setEditingEntry(entry)
    setFormData({
      date: entry.date.split('T')[0] || entry.date,
      cashAmount: entry.cashAmount.toString(),
      bankAmount: entry.bankAmount.toString(),
      zedAmount: entry.zedAmount.toString(),
      notes: entry.notes || "",
    })
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this Z-Report?")) return
    
    try {
      await deleteDailyCashEntry(id)
      toast.success("Z-Report deleted successfully!")
      await loadData()
      if (onRefresh) onRefresh()
    } catch (error: any) {
      toast.error(error.message || "Failed to delete Z-Report")
    }
  }

  if (isLoading) return <div className="p-4"><Skeleton className="h-[300px] w-full rounded-xl sm:rounded-2xl" /></div>

  return (
    <div className="space-y-3 sm:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-3">
        <div className="w-full sm:w-auto">
          <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-purple-900 dark:text-purple-300">Daily Z-Report</h3>
          <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground">
            {format(start, 'MMM dd')} - {format(end, 'MMM dd, yyyy')}
          </p>
        </div>
        <Button 
          onClick={() => {
            setEditingEntry(null)
            setFormData({ date: new Date().toISOString().split('T')[0], cashAmount: "", bankAmount: "", zedAmount: "", notes: "" })
            setShowForm(true)
          }} 
          className="w-full sm:w-auto bg-purple-900 hover:bg-purple-800 rounded-full px-3 sm:px-6 shadow-lg shadow-purple-900/25 text-xs sm:text-sm py-1.5 sm:py-2"
        >
          <Plus className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
          New Z-Report
        </Button>
      </div>

      {/* Stats Cards - Mobile First */}
      <div className="grid grid-cols-2 gap-1.5 sm:gap-2 md:grid-cols-4">
        <Card className="rounded-xl sm:rounded-2xl border-0 shadow-md bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/30 dark:to-emerald-900/20">
          <CardContent className="pt-2 sm:pt-4 px-2 sm:px-4 pb-2 sm:pb-4">
            <p className="text-[6px] sm:text-[10px] md:text-xs text-muted-foreground">Cash</p>
            <p className="text-xs sm:text-sm md:text-xl font-bold text-emerald-600 truncate">{formatCurrency(totals.totalCash)}</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl sm:rounded-2xl border-0 shadow-md bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20">
          <CardContent className="pt-2 sm:pt-4 px-2 sm:px-4 pb-2 sm:pb-4">
            <p className="text-[6px] sm:text-[10px] md:text-xs text-muted-foreground">Bank</p>
            <p className="text-xs sm:text-sm md:text-xl font-bold text-blue-600 truncate">{formatCurrency(totals.totalBank)}</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl sm:rounded-2xl border-0 shadow-md bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/30 dark:to-purple-900/20">
          <CardContent className="pt-2 sm:pt-4 px-2 sm:px-4 pb-2 sm:pb-4">
            <p className="text-[6px] sm:text-[10px] md:text-xs text-muted-foreground">Z-Report</p>
            <p className="text-xs sm:text-sm md:text-xl font-bold text-purple-600 truncate">{formatCurrency(totals.totalZed)}</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl sm:rounded-2xl border-0 shadow-md bg-gradient-to-br from-gray-50 to-gray-100/50 dark:from-gray-950/30 dark:to-gray-900/20">
          <CardContent className="pt-2 sm:pt-4 px-2 sm:px-4 pb-2 sm:pb-4">
            <p className="text-[6px] sm:text-[10px] md:text-xs text-muted-foreground">Reports</p>
            <p className="text-xs sm:text-sm md:text-xl font-bold text-gray-600">{totals.count}</p>
          </CardContent>
        </Card>
      </div>

      {/* Daily Z Report Table */}
      <DailyZReportTable 
        entries={filteredEntries}
        casualExpenses={casualExpenses}
        stockPurchases={stockPurchases}
        dailySales={dailySales}
        startDate={start}
        endDate={end}
      />

      {/* Create/Edit Modal - Mobile First */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-2 sm:p-4">
          <Card className="w-full max-w-md rounded-xl sm:rounded-2xl border-0 shadow-2xl max-h-[90vh] overflow-y-auto">
            <CardContent className="p-4 sm:p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-purple-900 dark:text-purple-300">
                  {editingEntry ? 'Edit Z-Report' : 'New Z-Report'}
                </h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setShowForm(false)
                    setEditingEntry(null)
                  }}
                  className="rounded-full hover:bg-purple-50 dark:hover:bg-purple-950/30 h-8 w-8 sm:h-10 sm:w-10"
                  disabled={isSubmitting}
                >
                  <X className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
              </div>
              <div className="space-y-3 sm:space-y-4">
                <div>
                  <label className="text-xs sm:text-sm font-medium text-purple-900 dark:text-purple-300">Date</label>
                  <input 
                    type="date" 
                    className="w-full p-2 sm:p-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-purple-900 focus:border-transparent outline-none"
                    value={formData.date} 
                    onChange={(e) => setFormData({...formData, date: e.target.value})} 
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <label className="text-xs sm:text-sm font-medium text-purple-900 dark:text-purple-300">Cash Amount</label>
                  <input 
                    type="number" 
                    placeholder="0.00" 
                    className="w-full p-2 sm:p-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-purple-900 focus:border-transparent outline-none"
                    value={formData.cashAmount} 
                    onChange={(e) => setFormData({...formData, cashAmount: e.target.value})} 
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <label className="text-xs sm:text-sm font-medium text-purple-900 dark:text-purple-300">Bank Amount</label>
                  <input 
                    type="number" 
                    placeholder="0.00" 
                    className="w-full p-2 sm:p-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-purple-900 focus:border-transparent outline-none"
                    value={formData.bankAmount} 
                    onChange={(e) => setFormData({...formData, bankAmount: e.target.value})} 
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <label className="text-xs sm:text-sm font-medium text-purple-900 dark:text-purple-300">
                    Zed Amount *
                  </label>
                  <input 
                    type="number" 
                    placeholder="0.00" 
                    required 
                    className="w-full p-2 sm:p-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-purple-900 focus:border-transparent outline-none"
                    value={formData.zedAmount} 
                    onChange={(e) => setFormData({...formData, zedAmount: e.target.value})} 
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <label className="text-xs sm:text-sm font-medium text-purple-900 dark:text-purple-300">Notes</label>
                  <input 
                    type="text" 
                    placeholder="Optional notes" 
                    className="w-full p-2 sm:p-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-purple-900 focus:border-transparent outline-none"
                    value={formData.notes} 
                    onChange={(e) => setFormData({...formData, notes: e.target.value})} 
                    disabled={isSubmitting}
                  />
                </div>
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-2">
                  <Button 
                    onClick={handleSubmit} 
                    className="w-full sm:flex-1 bg-purple-900 hover:bg-purple-800 rounded-full shadow-lg shadow-purple-900/25 text-sm"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Saving...' : (editingEntry ? 'Update' : 'Save')}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setShowForm(false)
                      setEditingEntry(null)
                    }} 
                    className="w-full sm:flex-1 rounded-full hover:bg-purple-50 dark:hover:bg-purple-950/30 text-sm"
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT - Mobile First
// ============================================================================

export default function FinancialManagementPage() {
  const router = useRouter()
  const [activeModule, setActiveModule] = useState<'casual' | 'cash' | 'stock'>('cash')
  const [dateFilterType, setDateFilterType] = useState<DateFilterType>('today')
  const [customStart, setCustomStart] = useState<Date | null>(null)
  const [customEnd, setCustomEnd] = useState<Date | null>(null)
  const [metrics, setMetrics] = useState({
    dailyRevenue: 0,
    dailyOrderCount: 0,
    dailyAverageOrderValue: 0,
    casualTotalAmount: 0,
    casualCount: 0,
    pendingCount: 0,
    pendingAmount: 0,
    paidCount: 0,
    paidAmount: 0,
    stockTotalAmount: 0,
    stockCount: 0,
    totalZedAmount: 0,
    lastCash: 0,
    cashCount: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)
  const [casualExpensesData, setCasualExpensesData] = useState<any[]>([])
  const [stockPurchasesData, setStockPurchasesData] = useState<StockPurchase[]>([])
  const [dailySalesData, setDailySalesData] = useState<Record<string, number>>({})

  const fetchAllMetrics = useCallback(async () => {
    setIsLoading(true)
    try {
      const { start, end } = getDateRange(dateFilterType, customStart || undefined, customEnd || undefined)
      
      const startDateStr = format(start, 'yyyy-MM-dd')
      const endDateStr = format(end, 'yyyy-MM-dd')
      
      const [casualExpenses, stockData, cashData, revenueData] = await Promise.all([
        fetch("/api/expense").then(res => res.json()).then(data => data.data || []),
        fetchStockPurchases(),
        fetchDailyCash(),
        fetchDailyRevenue(startDateStr, endDateStr),
      ])
      
      setCasualExpensesData(casualExpenses)
      setStockPurchasesData(stockData)
      setDailySalesData(revenueData.dailySales || {})
      
      const filteredCasual = casualExpenses.filter((expense: any) => {
        if (!expense?.date) return false
        const expenseDate = new Date(expense.date)
        return expenseDate >= start && expenseDate <= end
      })
      
      const totalAmount = filteredCasual.reduce((sum: number, e: any) => sum + (e.amount || 0), 0)
      const pendingExpenses = filteredCasual.filter((e: any) => e.status === "Pending")
      const paidExpenses = filteredCasual.filter((e: any) => e.status === "Paid")
      const pendingTotal = pendingExpenses.reduce((sum: number, e: any) => sum + (e.amount || 0), 0)
      const paidTotal = paidExpenses.reduce((sum: number, e: any) => sum + (e.amount || 0), 0)
      
      const filteredStock = stockData.filter((purchase: StockPurchase) => {
        if (!purchase?.purchaseDate) return false
        const purchaseDate = new Date(purchase.purchaseDate)
        return purchaseDate >= start && purchaseDate <= end
      })
      const stockTotal = filteredStock.reduce((sum: number, e: StockPurchase) => sum + (e.totalAmount || e.quantity * e.unitPrice || 0), 0)
      
      const filteredCash = cashData.filter((entry: DailyCashEntry) => {
        if (!entry?.date) return false
        const entryDate = new Date(entry.date)
        return entryDate >= start && entryDate <= end
      })
      const totalZed = filteredCash.reduce((sum: number, e: DailyCashEntry) => sum + (e.zedAmount || 0), 0)
      const lastCash = filteredCash.length > 0 ? filteredCash[filteredCash.length - 1]?.zedAmount || 0 : 0
      
      setMetrics({
        dailyRevenue: revenueData.totalSales,
        dailyOrderCount: revenueData.orderCount,
        dailyAverageOrderValue: revenueData.averageOrderValue,
        casualTotalAmount: totalAmount,
        casualCount: filteredCasual.length,
        pendingCount: pendingExpenses.length,
        pendingAmount: pendingTotal,
        paidCount: paidExpenses.length,
        paidAmount: paidTotal,
        stockTotalAmount: stockTotal,
        stockCount: filteredStock.length,
        totalZedAmount: totalZed,
        lastCash: lastCash,
        cashCount: filteredCash.length,
      })
    } catch (error) {
      console.error("Error fetching metrics:", error)
    } finally {
      setIsLoading(false)
    }
  }, [dateFilterType, customStart, customEnd])

  useEffect(() => {
    fetchAllMetrics()
  }, [fetchAllMetrics, refreshKey])

  const handleRefresh = () => setRefreshKey(prev => prev + 1)

  const handleDateFilterChange = (filter: DateFilterType) => {
    setDateFilterType(filter)
    if (filter !== 'custom') {
      setCustomStart(null)
      setCustomEnd(null)
    }
  }

  const handleCustomDateChange = (start: Date | null, end: Date | null) => {
    setCustomStart(start)
    setCustomEnd(end)
    if (start && end) setRefreshKey(prev => prev + 1)
  }

  const goToSalesPage = () => {
    router.push('/sales')
  }

  const modules = [
    {
      id: 'cash' as const,
      title: `Z-Reports`,
      value: formatCurrency(metrics.totalZedAmount),
      subtitle: `${metrics.cashCount} • ${formatCurrency(metrics.lastCash)}`,
    },
    {
      id: 'casual' as const,
      title: `Casual Expenses`,
      value: formatCurrency(metrics.casualTotalAmount),
      subtitle: `${metrics.casualCount} • ${metrics.pendingCount} pending`,
    },
    {
      id: 'stock' as const,
      title: `Stock Purchases`,
      value: formatCurrency(metrics.stockTotalAmount),
      subtitle: `${metrics.stockCount}`,
    },
    {
      id: 'revenue' as const,
      title: `Daily Revenue`,
      value: formatCurrency(metrics.dailyRevenue),
      subtitle: `${metrics.dailyOrderCount} • ${formatCurrency(metrics.dailyAverageOrderValue)}`,
    },
  ]

  if (isLoading) {
    return (
      <div className="flex-1 space-y-3 sm:space-y-6 p-2 sm:p-8 pt-3 sm:pt-6">
        <Skeleton className="h-8 sm:h-10 w-32 sm:w-48 rounded-xl sm:rounded-2xl" />
        <Skeleton className="h-10 sm:h-14 w-full rounded-xl sm:rounded-2xl" />
        <div className="grid gap-1.5 sm:gap-3 grid-cols-2 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-16 sm:h-20 w-full rounded-xl sm:rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-[300px] w-full rounded-xl sm:rounded-2xl" />
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-3 sm:space-y-6 p-2 sm:p-8 pt-3 sm:pt-6 bg-gradient-to-br from-purple-50/30 via-white to-purple-50/20 dark:from-gray-950 dark:via-gray-900 dark:to-purple-950/20 min-h-screen">
      {/* Header - Mobile First */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl md:text-4xl font-bold bg-gradient-to-r from-purple-900 to-purple-600 bg-clip-text text-transparent tracking-tight">
            Financial Management
          </h2>
          <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground mt-0.5">
            Manage revenue, expenses, stock, and reports
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Badge variant="secondary" className="rounded-full px-2 py-0.5 sm:px-3 sm:py-1 bg-purple-100 text-purple-900 dark:bg-purple-900/30 dark:text-purple-300 border-0">
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[8px] sm:text-xs hidden xs:inline">Live</span>
            </span>
          </Badge>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            className="rounded-full hover:bg-purple-50 dark:hover:bg-purple-950/30 border-purple-200 text-[10px] sm:text-xs md:text-sm px-2 sm:px-3"
          >
            <RefreshCw className="mr-1 h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden xs:inline">Refresh</span>
          </Button>
        </div>
      </div>

      {/* Global Date Filter */}
      <DateFilter 
        filterType={dateFilterType}
        onFilterChange={handleDateFilterChange}
        customStart={customStart}
        customEnd={customEnd}
        onCustomDateChange={handleCustomDateChange}
      />

      {/* Four Module Cards - Mobile First Grid */}
      <div className="grid gap-1.5 sm:gap-3 grid-cols-2 sm:grid-cols-2 lg:grid-cols-4">
        {modules.map((module) => {
          let isActive = false
          let onClick = () => {}
          
          if (module.id === 'cash') {
            isActive = activeModule === 'cash'
            onClick = () => setActiveModule('cash')
          } else if (module.id === 'casual') {
            isActive = activeModule === 'casual'
            onClick = () => setActiveModule('casual')
          } else if (module.id === 'stock') {
            isActive = activeModule === 'stock'
            onClick = () => setActiveModule('stock')
          } else if (module.id === 'revenue') {
            isActive = false
            onClick = goToSalesPage
          }
          
          return (
            <ModuleCard
              key={module.id}
              title={module.title}
              value={module.value}
              subtitle={module.subtitle}
              isActive={isActive}
              onClick={onClick}
            />
          )
        })}
      </div>

      {/* Module Content */}
      <div className="mt-2 sm:mt-6">
        {activeModule === 'cash' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <DailyCashManager 
              onRefresh={handleRefresh}
              dateFilterType={dateFilterType}
              customStart={customStart}
              customEnd={customEnd}
              casualExpenses={casualExpensesData}
              stockPurchases={stockPurchasesData}
              dailySales={dailySalesData}
            />
          </div>
        )}

        {activeModule === 'casual' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <CasualExpenses />
          </div>
        )}

        {activeModule === 'stock' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <StockPurchases />
          </div>
        )}
      </div>

      <Toaster 
        position="top-right" 
        toastOptions={{
          style: {
            borderRadius: '12px',
            padding: '10px 14px',
            fontSize: '13px',
          },
        }} 
      />
    </div>
  )
}