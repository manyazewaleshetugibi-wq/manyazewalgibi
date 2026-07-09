"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { format, subDays, startOfMonth, eachDayOfInterval, startOfDay, endOfDay, parseISO, isSameDay } from "date-fns"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Toaster } from "react-hot-toast"
import { Package, Receipt, Wallet, TrendingUp, RefreshCw, AlertCircle, Loader2, BarChart3 } from "lucide-react"
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend } from "recharts"
import { CasualExpenses } from "@/components/expanse/CasualExpenses"
import { CommonExpenses } from "@/components/expanse/CommonExpenses"
import { StockPurchases } from "@/components/expanse/StockPurchases"
import { commonApi, stockApi, casualApi } from "@/services/expense.service"
import { CommonExpense, StockPurchase, CasualExpense, DateFilterType } from "@/types/expense.types"
import { formatCurrency, getDailyCommonAmount } from "@/lib/utils/expense.utils"

type TabType = "overview" | "casual" | "common" | "stock"

const CHART_COLORS = { common: "#818CF8", stock: "#34D399", casual: "#FBBF24" }

const DATE_FILTERS: { value: DateFilterType; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "7d", label: "7 Days" },
  { value: "14d", label: "14 Days" },
  { value: "28d", label: "28 Days" },
  { value: "month", label: "Month" },
]

// Fixed helper function to calculate daily common amount
const calculateDailyCommonAmount = (expense: CommonExpense, date: Date): number => {
  const expenseDate = parseISO(expense.startDate)
  
  // If expense is not active or start date is in the future, return 0
  if (!expense.isActive || expenseDate > date) return 0
  
  // For one-time expenses, only count on the start date
  if (expense.frequency === 'one-time') {
    return isSameDay(expenseDate, date) ? expense.amount : 0
  }
  
  // For recurring expenses, calculate daily amount
  switch (expense.frequency) {
    case 'daily':
      return expense.amount
    case 'weekly':
      return expense.amount / 7
    case 'monthly':
      return expense.amount / 30  // Using 30 days for monthly
    case 'quarterly':
      return expense.amount / 91.25  // 365/4
    case 'yearly':
      return expense.amount / 365
    default:
      return 0
  }
}

// Get monthly projection for an expense
const getMonthlyProjection = (expense: CommonExpense): number => {
  if (!expense.isActive) return 0
  
  switch (expense.frequency) {
    case 'daily': return expense.amount * 30
    case 'weekly': return (expense.amount / 7) * 30
    case 'monthly': return expense.amount
    case 'quarterly': return expense.amount / 3
    case 'yearly': return expense.amount / 12
    case 'one-time': return 0
    default: return 0
  }
}

export default function ExpensePage() {
  const [activeTab, setActiveTab] = useState<TabType>("overview")
  const [dateFilter, setDateFilter] = useState<DateFilterType>("today")
  const [commonExpenses, setCommonExpenses] = useState<CommonExpense[]>([])
  const [stockPurchases, setStockPurchases] = useState<StockPurchase[]>([])
  const [casualExpenses, setCasualExpenses] = useState<CasualExpense[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getDateRange = useCallback((filter: DateFilterType) => {
    const now = new Date()
    switch (filter) {
      case "today": return { start: startOfDay(now), end: endOfDay(now) }
      case "yesterday": { const y = subDays(now, 1); return { start: startOfDay(y), end: endOfDay(y) } }
      case "7d": return { start: subDays(now, 6), end: now }
      case "14d": return { start: subDays(now, 13), end: now }
      case "28d": return { start: subDays(now, 27), end: now }
      case "month": return { start: startOfMonth(now), end: now }
      default: return { start: startOfDay(now), end: endOfDay(now) }
    }
  }, [])

  const loadData = useCallback(async () => {
    setError(null)
    try {
      const [common, purchases, casual] = await Promise.all([
        commonApi.getExpenses(),
        stockApi.getStockPurchases(),
        casualApi.getCosts(),
      ])
      setCommonExpenses(common)
      const stocks = await stockApi.getStockItems()
      const stockMap = new Map(stocks.map((s: any) => [s._id, s.name]))
      setStockPurchases(purchases.map((p: any) => ({
        ...p,
        stockName: stockMap.get(p.stockId) || "Unknown",
        totalAmount: (p.quantity || 0) * (p.unitPrice || 0),
      })))
      setCasualExpenses(casual)
    } catch {
      setError("Failed to load expense data.")
    }
  }, [])

  useEffect(() => {
    setIsLoading(true)
    loadData().finally(() => setIsLoading(false))
  }, [loadData])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await loadData()
    setIsRefreshing(false)
  }

  const { start, end } = useMemo(() => getDateRange(dateFilter), [dateFilter, getDateRange])

  // FIXED: Calculate totals correctly using the daily common amount
  const totals = useMemo(() => {
    const dates = eachDayOfInterval({ start, end })
    let totalCommon = 0, totalStock = 0, totalCasual = 0

    dates.forEach(date => {
      const dateStr = format(date, "yyyy-MM-dd")
      
      // FIXED: Calculate daily common expense correctly
      commonExpenses.forEach(e => {
        totalCommon += calculateDailyCommonAmount(e, date)
      })
      
      totalStock += stockPurchases
        .filter(p => p.purchaseDate.startsWith(dateStr))
        .reduce((s, p) => s + p.totalAmount, 0)
      
      totalCasual += casualExpenses
        .filter(e => e.date?.startsWith(dateStr))
        .reduce((s, e) => s + e.amount, 0)
    })

    return { 
      totalCommon, 
      totalStock, 
      totalCasual, 
      total: totalCommon + totalStock + totalCasual 
    }
  }, [commonExpenses, stockPurchases, casualExpenses, start, end])

  // FIXED: Chart data with correct daily common amounts
  const chartData = useMemo(() => {
    const dates = eachDayOfInterval({ start, end })
    return dates.map(date => {
      const dateStr = format(date, "yyyy-MM-dd")
      let common = 0
      
      // FIXED: Calculate daily common correctly
      commonExpenses.forEach(e => {
        common += calculateDailyCommonAmount(e, date)
      })
      
      const stock = stockPurchases
        .filter(p => p.purchaseDate.startsWith(dateStr))
        .reduce((s, p) => s + p.totalAmount, 0)
      
      const casual = casualExpenses
        .filter(e => e.date?.startsWith(dateStr))
        .reduce((s, e) => s + e.amount, 0)
      
      return { 
        date: format(date, "MMM dd"), 
        Common: Math.round(common * 100) / 100,
        Stock: stock, 
        Casual: casual 
      }
    })
  }, [commonExpenses, stockPurchases, casualExpenses, start, end])

  // FIXED: Calculate active common expenses count and monthly projection
  const commonSummary = useMemo(() => {
    const activeCount = commonExpenses.filter(e => e.isActive).length
    const totalMonthly = commonExpenses
      .filter(e => e.isActive)
      .reduce((sum, e) => sum + getMonthlyProjection(e), 0)
    
    return { activeCount, totalMonthly }
  }, [commonExpenses])

  const tabs: { id: TabType; label: string; icon: any; color: string; amount: number }[] = [
    { id: "overview", label: "Overview", icon: BarChart3, color: "purple", amount: totals.total },
    { id: "common", label: "Common", icon: Wallet, color: "indigo", amount: totals.totalCommon },
    { id: "stock", label: "Stock", icon: Package, color: "emerald", amount: totals.totalStock },
    { id: "casual", label: "Casual", icon: Receipt, color: "amber", amount: totals.totalCasual },
  ]

  const tabColorMap: Record<string, string> = {
    purple: "bg-purple-600 text-white shadow-purple-200 dark:shadow-purple-900/30",
    indigo: "bg-indigo-600 text-white shadow-indigo-200 dark:shadow-indigo-900/30",
    emerald: "bg-emerald-600 text-white shadow-emerald-200 dark:shadow-emerald-900/30",
    amber: "bg-amber-500 text-white shadow-amber-200 dark:shadow-amber-900/30",
  }

  const tabInactiveMap: Record<string, string> = {
    purple: "text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/30",
    indigo: "text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/30",
    emerald: "text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30",
    amber: "text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/30",
  }

  if (isLoading) {
    return (
      <div className="min-h-screen p-4 space-y-4">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-4 gap-2">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-16 rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[1,2,3].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        </div>
        <Skeleton className="h-64 rounded-2xl" />
        <div className="flex items-center justify-center h-32">
          <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-sm w-full rounded-2xl border-0 shadow-xl">
          <CardContent className="p-8 text-center">
            <div className="p-4 rounded-full bg-red-100 dark:bg-red-900/30 w-fit mx-auto mb-4">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
            <p className="font-semibold mb-1">Failed to load</p>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => { setIsLoading(true); loadData().finally(() => setIsLoading(false)) }} className="rounded-full">
              <RefreshCw className="h-4 w-4 mr-2" /> Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50/30 via-white to-purple-50/20 dark:from-gray-950 dark:via-gray-900 dark:to-purple-950/20">
      <div className="max-w-7xl mx-auto p-3 sm:p-6 space-y-4 sm:space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-purple-900 to-purple-600 bg-clip-text text-transparent">
              Expenses
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              {format(start, "MMM d")} – {format(end, "MMM d, yyyy")}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="rounded-full border-purple-200 hover:border-purple-400 dark:border-purple-800"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""} sm:mr-2`} />
            <span className="hidden sm:inline">{isRefreshing ? "Refreshing..." : "Refresh"}</span>
          </Button>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-purple-100 dark:border-purple-900/30 p-1.5">
          <div className="grid grid-cols-4 gap-1">
            {tabs.map(tab => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-1 sm:gap-2 px-2 sm:px-4 py-2.5 sm:py-3 rounded-xl transition-all duration-200 ${
                    isActive
                      ? `${tabColorMap[tab.color]} shadow-md`
                      : `${tabInactiveMap[tab.color]} bg-transparent`
                  }`}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  <div className="text-center sm:text-left min-w-0">
                    <p className="text-[10px] sm:text-xs font-semibold leading-tight truncate">{tab.label}</p>
                    {isActive && (
                      <p className="text-[9px] sm:text-[10px] opacity-80 leading-tight hidden sm:block truncate">
                        {formatCurrency(tab.amount)}
                      </p>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Date Filter — only on overview */}
        {activeTab === "overview" && (
          <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
            <div className="flex gap-1.5 min-w-max sm:flex-wrap sm:min-w-0">
              {DATE_FILTERS.map(f => (
                <button
                  key={f.value}
                  onClick={() => setDateFilter(f.value)}
                  className={`px-3 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                    dateFilter === f.value
                      ? "bg-purple-600 text-white shadow-md shadow-purple-200 dark:shadow-purple-900/30"
                      : "bg-white dark:bg-gray-900 border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 hover:border-purple-400"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="space-y-4 sm:space-y-6">
            {/* 3 Summary Cards - FIXED: Showing correct common amount */}
            <div className="grid grid-cols-3 gap-2 sm:gap-4">
              {[
                { 
                  label: "Common", 
                  amount: totals.totalCommon, 
                  color: "indigo", 
                  icon: Wallet, 
                  tab: "common" as TabType,
                  subText: `${commonSummary.activeCount} active expenses`
                },
                { 
                  label: "Stock", 
                  amount: totals.totalStock, 
                  color: "emerald", 
                  icon: Package, 
                  tab: "stock" as TabType,
                  subText: `${stockPurchases.length} purchases`
                },
                { 
                  label: "Casual", 
                  amount: totals.totalCasual, 
                  color: "amber", 
                  icon: Receipt, 
                  tab: "casual" as TabType,
                  subText: `${casualExpenses.length} expenses`
                },
              ].map(item => {
                const Icon = item.icon
                const pct = totals.total > 0 ? (item.amount / totals.total) * 100 : 0
                return (
                  <button
                    key={item.label}
                    onClick={() => setActiveTab(item.tab)}
                    className="text-left group"
                  >
                    <Card className={`border-0 shadow-md hover:shadow-lg transition-all rounded-2xl bg-gradient-to-br ${
                      item.color === "indigo" ? "from-indigo-50 to-indigo-100/50 dark:from-indigo-950/30 dark:to-indigo-900/20" :
                      item.color === "emerald" ? "from-emerald-50 to-emerald-100/50 dark:from-emerald-950/30 dark:to-emerald-900/20" :
                      "from-amber-50 to-amber-100/50 dark:from-amber-950/30 dark:to-amber-900/20"
                    }`}>
                      <CardContent className="p-3 sm:p-5">
                        <div className={`p-2 rounded-xl w-fit mb-2 sm:mb-3 ${
                          item.color === "indigo" ? "bg-indigo-100 dark:bg-indigo-900/40" :
                          item.color === "emerald" ? "bg-emerald-100 dark:bg-emerald-900/40" :
                          "bg-amber-100 dark:bg-amber-900/40"
                        }`}>
                          <Icon className={`h-4 w-4 sm:h-5 sm:w-5 ${
                            item.color === "indigo" ? "text-indigo-600" :
                            item.color === "emerald" ? "text-emerald-600" : "text-amber-600"
                          }`} />
                        </div>
                        <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">{item.label}</p>
                        <p className={`text-sm sm:text-xl font-bold mt-0.5 ${
                          item.color === "indigo" ? "text-indigo-700 dark:text-indigo-300" :
                          item.color === "emerald" ? "text-emerald-700 dark:text-emerald-300" : "text-amber-700 dark:text-amber-300"
                        }`}>
                          {formatCurrency(item.amount)}
                        </p>
                        <p className="text-[9px] sm:text-xs text-muted-foreground mt-1">
                          {pct.toFixed(1)}% of total · {item.subText}
                        </p>
                      </CardContent>
                    </Card>
                  </button>
                )
              })}
            </div>

            {/* Total Banner - FIXED: Shows correct total */}
            <Card className="border-0 shadow-lg rounded-2xl bg-gradient-to-r from-purple-600 to-purple-700 dark:from-purple-800 dark:to-purple-900 text-white overflow-hidden">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-200 text-xs sm:text-sm font-medium">Total Expenses</p>
                    <p className="text-2xl sm:text-4xl font-bold mt-0.5">{formatCurrency(totals.total)}</p>
                    <p className="text-purple-200 text-[10px] sm:text-xs mt-1">
                      {format(start, "MMM d")} – {format(end, "MMM d")}
                    </p>
                  </div>
                  <div className="p-3 sm:p-4 rounded-2xl bg-white/10">
                    <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
                  </div>
                </div>
                {/* Mini breakdown with correct common amount */}
                <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-white/20">
                  <div className="text-center">
                    <p className="text-purple-200 text-[9px] sm:text-xs">Common</p>
                    <p className="text-white font-bold text-xs sm:text-sm">{formatCurrency(totals.totalCommon)}</p>
                    <p className="text-purple-200 text-[8px] sm:text-[10px]">{commonSummary.activeCount} active</p>
                  </div>
                  <div className="text-center border-x border-white/20">
                    <p className="text-purple-200 text-[9px] sm:text-xs">Stock</p>
                    <p className="text-white font-bold text-xs sm:text-sm">{formatCurrency(totals.totalStock)}</p>
                    <p className="text-purple-200 text-[8px] sm:text-[10px]">{stockPurchases.length} items</p>
                  </div>
                  <div className="text-center">
                    <p className="text-purple-200 text-[9px] sm:text-xs">Casual</p>
                    <p className="text-white font-bold text-xs sm:text-sm">{formatCurrency(totals.totalCasual)}</p>
                    <p className="text-purple-200 text-[8px] sm:text-[10px]">{casualExpenses.length} expenses</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Chart - FIXED: Shows correct daily common amounts */}
            <Card className="border-0 shadow-lg rounded-2xl overflow-hidden">
              <CardContent className="p-3 sm:p-6">
                <div className="flex items-center gap-2 mb-4">
                  <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
                  <p className="font-semibold text-sm sm:text-base text-purple-900 dark:text-purple-100">Daily Breakdown</p>
                </div>
                {chartData.every(d => d.Common === 0 && d.Stock === 0 && d.Casual === 0) ? (
                  <div className="h-48 flex flex-col items-center justify-center text-muted-foreground">
                    <AlertCircle className="h-8 w-8 mb-2 opacity-40" />
                    <p className="text-sm">No data for this period</p>
                  </div>
                ) : (
                  <div className="h-48 sm:h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.15} vertical={false} />
                        <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                        <YAxis tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={36} />
                        <RechartsTooltip
                          formatter={(v: number, n: string) => [formatCurrency(v), n]}
                          contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", fontSize: 12 }}
                          cursor={{ fill: "rgba(0,0,0,0.04)" }}
                        />
                        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} iconSize={8} />
                        <Bar dataKey="Common" stackId="a" fill={CHART_COLORS.common} radius={[0,0,0,0]} />
                        <Bar dataKey="Stock" stackId="a" fill={CHART_COLORS.stock} radius={[0,0,0,0]} />
                        <Bar dataKey="Casual" stackId="a" fill={CHART_COLORS.casual} radius={[4,4,0,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick nav to sub-pages */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {[
                { tab: "common" as TabType, label: "View Common", color: "indigo", icon: Wallet },
                { tab: "stock" as TabType, label: "View Stock", color: "emerald", icon: Package },
                { tab: "casual" as TabType, label: "View Casual", color: "amber", icon: Receipt },
              ].map(item => {
                const Icon = item.icon
                return (
                  <button
                    key={item.tab}
                    onClick={() => setActiveTab(item.tab)}
                    className={`flex items-center justify-center gap-1.5 py-2.5 sm:py-3 px-2 sm:px-4 rounded-xl border-2 text-xs sm:text-sm font-medium transition-all hover:shadow-md ${
                      item.color === "indigo" ? "border-indigo-200 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-300 dark:hover:bg-indigo-950/30" :
                      item.color === "emerald" ? "border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-950/30" :
                      "border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-300 dark:hover:bg-amber-950/30"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    <span className="hidden sm:inline">{item.label}</span>
                    <span className="sm:hidden">{item.tab.charAt(0).toUpperCase() + item.tab.slice(1)}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Sub-page tabs */}
        {activeTab === "common" && <CommonExpenses />}
        {activeTab === "stock" && <StockPurchases />}
        {activeTab === "casual" && <CasualExpenses />}
      </div>

      <Toaster position="top-right" toastOptions={{
        style: { borderRadius: 12, padding: "12px 16px", fontSize: 14 },
        success: { iconTheme: { primary: "#10B981", secondary: "white" } },
        error: { iconTheme: { primary: "#EF4444", secondary: "white" } },
      }} />
    </div>
  )
}