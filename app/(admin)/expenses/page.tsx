"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { format, subDays, startOfMonth, eachDayOfInterval, startOfDay, endOfDay } from "date-fns"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Toaster } from "react-hot-toast"
import { CalendarIcon, Package, Receipt, Wallet, ChevronRight, TrendingUp, TrendingDown, Sparkles, ArrowUpRight, ArrowDownRight, Loader2, AlertCircle, RefreshCw } from "lucide-react"
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend } from "recharts"
import { CasualExpenses } from "@/components/expanse/CasualExpenses"
import { CommonExpenses } from "@/components/expanse/CommonExpenses"
import { StockPurchases } from "@/components/expanse/StockPurchases"
import { commonApi, stockApi, casualApi, salesApi } from "@/services/expense.service"
import { CommonExpense, StockPurchase, CasualExpense, OrderReport, DateFilterType } from "@/types/expense.types"
import { formatCurrency, formatShortCurrency, getDailyCommonAmount, getDateRange } from "@/lib/utils/expense.utils"

const CHART_COLORS = {
  common: "#818CF8",
  stock: "#34D399",
  casual: "#FBBF24",
}

// Skeleton Card for loading state
const SkeletonCard = () => (
  <Card className="rounded-xl border border-gray-100/20 dark:border-gray-800/20 bg-white dark:bg-gray-900 shadow-sm">
    <CardContent className="p-4">
      <div className="flex items-start justify-between mb-3">
        <Skeleton className="h-9 w-9 rounded-lg" />
        <Skeleton className="h-3 w-3 rounded-full" />
      </div>
      <Skeleton className="h-3 w-16 mb-1" />
      <Skeleton className="h-6 w-20 mb-1" />
      <Skeleton className="h-3 w-20" />
    </CardContent>
  </Card>
)

// Mobile-optimized Clickable Card
const ClickableCard = ({ title, value, icon, description, color, onClick, trend, trendValue, isLoading }: {
  title: string
  value: string
  icon: React.ReactNode
  description: string
  color: string
  onClick: () => void
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
  isLoading?: boolean
}) => {
  const colorMap = {
    purple: { 
      bg: "bg-indigo-50 dark:bg-indigo-950/30", 
      text: "text-indigo-600 dark:text-indigo-400",
      dot: "bg-indigo-500"
    },
    emerald: { 
      bg: "bg-emerald-50 dark:bg-emerald-950/30", 
      text: "text-emerald-600 dark:text-emerald-400",
      dot: "bg-emerald-500"
    },
    amber: { 
      bg: "bg-amber-50 dark:bg-amber-950/30", 
      text: "text-amber-600 dark:text-amber-400",
      dot: "bg-amber-500"
    },
  }

  const styles = colorMap[color as keyof typeof colorMap]

  if (isLoading) {
    return <SkeletonCard />
  }

  return (
    <div 
      className="cursor-pointer transition-all duration-200 active:scale-[0.98]"
      onClick={onClick}
    >
      <Card className="rounded-xl border border-gray-100/50 dark:border-gray-800/50 bg-white dark:bg-gray-900 shadow-sm hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium truncate">{title}</p>
              <p className={`text-lg font-bold mt-0.5 ${styles.text}`}>{value}</p>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 truncate">{description}</p>
            </div>
            <div className={`p-2 rounded-lg ${styles.bg} flex-shrink-0 ml-2`}>
              {icon}
            </div>
          </div>
          {trend && trendValue && (
            <div className={`flex items-center gap-1 mt-1.5 text-[10px] font-medium ${trend === 'up' ? 'text-green-600 dark:text-green-400' : trend === 'down' ? 'text-red-600 dark:text-red-400' : 'text-gray-400'}`}>
              {trend === 'up' ? <ArrowUpRight className="h-2.5 w-2.5" /> : trend === 'down' ? <ArrowDownRight className="h-2.5 w-2.5" /> : null}
              {trendValue}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function EnhancedExpensePage() {
  const [commonExpenses, setCommonExpenses] = useState<CommonExpense[]>([])
  const [stockPurchases, setStockPurchases] = useState<StockPurchase[]>([])
  const [casualExpenses, setCasualExpenses] = useState<CasualExpense[]>([])
  const [orderReport, setOrderReport] = useState<OrderReport | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dateFilterType, setDateFilterType] = useState<DateFilterType>('today')
  const [activePage, setActivePage] = useState<'dashboard' | 'casual' | 'common' | 'stock'>('dashboard')

  const fetchAllData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [common, purchases, casual, sales] = await Promise.all([
        commonApi.getExpenses(),
        stockApi.getStockPurchases(),
        casualApi.getCosts(),
        salesApi.getOrderReport(),
      ])
      
      setCommonExpenses(common)
      
      const stocks = await stockApi.getStockItems()
      const stockMap = new Map(stocks.map(s => [s._id, s.name]))
      const enrichedPurchases = purchases.map((p: any) => ({
        ...p,
        stockName: stockMap.get(p.stockId) || "Unknown",
        totalAmount: (p.quantity || 0) * (p.unitPrice || 0)
      }))
      setStockPurchases(enrichedPurchases)
      setCasualExpenses(casual)
      setOrderReport(sales)
    } catch (error) {
      console.error("Error fetching data:", error)
      setError("Failed to load expense data. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }, [])

  const refreshData = useCallback(async () => {
    setIsRefreshing(true)
    setError(null)
    try {
      const [common, purchases, casual, sales] = await Promise.all([
        commonApi.getExpenses(),
        stockApi.getStockPurchases(),
        casualApi.getCosts(),
        salesApi.getOrderReport(),
      ])
      
      setCommonExpenses(common)
      
      const stocks = await stockApi.getStockItems()
      const stockMap = new Map(stocks.map(s => [s._id, s.name]))
      const enrichedPurchases = purchases.map((p: any) => ({
        ...p,
        stockName: stockMap.get(p.stockId) || "Unknown",
        totalAmount: (p.quantity || 0) * (p.unitPrice || 0)
      }))
      setStockPurchases(enrichedPurchases)
      setCasualExpenses(casual)
      setOrderReport(sales)
    } catch (error) {
      console.error("Error refreshing data:", error)
      setError("Failed to refresh data. Please try again.")
    } finally {
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchAllData()
  }, [fetchAllData])

  const getDateRangeForDashboard = useMemo(() => {
    const now = new Date()
    switch (dateFilterType) {
      case 'today': 
        return { start: startOfDay(now), end: endOfDay(now) }
      case 'yesterday': 
        const yesterday = subDays(now, 1)
        return { start: startOfDay(yesterday), end: endOfDay(yesterday) }
      case '7d': return { start: subDays(now, 6), end: now }
      case '14d': return { start: subDays(now, 13), end: now }
      case '28d': return { start: subDays(now, 27), end: now }
      case 'month': return { start: startOfMonth(now), end: now }
      default: return { start: startOfDay(now), end: endOfDay(now) }
    }
  }, [dateFilterType])

  const dailyExpenseData = useMemo(() => {
    const { start, end } = getDateRangeForDashboard
    const dates = eachDayOfInterval({ start, end })
    
    return dates.map(date => {
      const dateStr = format(date, 'yyyy-MM-dd')
      
      let commonTotal = 0
      commonExpenses.forEach(expense => {
        commonTotal += getDailyCommonAmount(expense, date)
      })
      
      const stockTotal = stockPurchases
        .filter(p => p.purchaseDate.startsWith(dateStr))
        .reduce((sum, p) => sum + p.totalAmount, 0)
      
      const casualTotal = casualExpenses
        .filter(e => e.date && e.date.startsWith(dateStr))
        .reduce((sum, e) => sum + e.amount, 0)
      
      return {
        date: format(date, 'MMM dd'),
        Common: commonTotal,
        Stock: stockTotal,
        Casual: casualTotal,
        Total: commonTotal + stockTotal + casualTotal,
      }
    })
  }, [commonExpenses, stockPurchases, casualExpenses, getDateRangeForDashboard])

  const totals = useMemo(() => {
    const totalCommon = dailyExpenseData.reduce((sum, d) => sum + d.Common, 0)
    const totalStock = dailyExpenseData.reduce((sum, d) => sum + d.Stock, 0)
    const totalCasual = dailyExpenseData.reduce((sum, d) => sum + d.Casual, 0)
    const totalExpenses = dailyExpenseData.reduce((sum, d) => sum + d.Total, 0)
    
    return { 
      totalCommon, 
      totalStock, 
      totalCasual,
      totalExpenses, 
    }
  }, [dailyExpenseData])

  const filterButtons = [
    { value: 'today', label: 'Today' },
    { value: 'yesterday', label: 'Yesterday' },
    { value: '7d', label: '7D' },
    { value: '14d', label: '14D' },
    { value: '28d', label: '28D' },
    { value: 'month', label: 'Month' },
  ]

  const handleCasualClick = () => setActivePage('casual')
  const handleCommonClick = () => setActivePage('common')
  const handleStockClick = () => setActivePage('stock')
  const handleBackToDashboard = () => setActivePage('dashboard')

  // Render sub-pages
  if (activePage === 'casual') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4">
        <Button variant="ghost" onClick={handleBackToDashboard} className="mb-4 gap-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full -ml-2">
          ← Back
        </Button>
        <CasualExpenses />
      </div>
    )
  }

  if (activePage === 'common') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4">
        <Button variant="ghost" onClick={handleBackToDashboard} className="mb-4 gap-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full -ml-2">
          ← Back
        </Button>
        <CommonExpenses />
      </div>
    )
  }

  if (activePage === 'stock') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4">
        <Button variant="ghost" onClick={handleBackToDashboard} className="mb-4 gap-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full -ml-2">
          ← Back
        </Button>
        <StockPurchases />
      </div>
    )
  }

  // Loading State
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4">
        <div className="max-w-md mx-auto">
          <div className="mb-6">
            <Skeleton className="h-7 w-32 mb-1" />
            <Skeleton className="h-3 w-40" />
          </div>
          
          <div className="grid grid-cols-2 gap-3 mb-4">
            {[1, 2, 3, 4].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
          
          <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-7 w-14 rounded-full flex-shrink-0" />
            ))}
          </div>
          
          <div className="grid grid-cols-3 gap-2 mb-4">
            {[1, 2, 3].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
          
          <Skeleton className="h-[180px] w-full rounded-xl" />
        </div>
      </div>
    )
  }

  // Error State
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4 flex items-center justify-center">
        <Card className="max-w-sm w-full rounded-xl border-0 shadow-lg bg-white dark:bg-gray-900">
          <CardContent className="p-6 text-center">
            <div className="p-3 rounded-full bg-red-100 dark:bg-red-900/30 mx-auto w-fit mb-3">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="text-base font-semibold mb-1">Error Loading Data</h3>
            <p className="text-gray-500 text-sm mb-4">{error}</p>
            <Button onClick={fetchAllData} className="rounded-full bg-blue-600 hover:bg-blue-700 text-white text-sm px-4">
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Dashboard View - Mobile First YouTube Studio Style
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <main className="max-w-md mx-auto px-4 py-5">
        {/* Header */}
        <div className="mb-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5 mb-0.5">
                <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <h1 className="text-lg font-bold text-gray-900 dark:text-white">
                  Dashboard
                </h1>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Expense tracking
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={refreshData}
              disabled={isRefreshing}
              className="rounded-full h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Analytics Grid - 2x2 like YouTube Studio */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2.5">
            <h2 className="text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wide">Analytics</h2>
            <span className="text-[10px] text-gray-400 dark:text-gray-500">Last 28 days</span>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <Card className="rounded-xl border border-gray-100/50 dark:border-gray-800/50 bg-white dark:bg-gray-900 shadow-sm">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">Views</p>
                    <p className="text-base font-bold text-gray-900 dark:text-white">89.9K</p>
                  </div>
                  <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/30">
                    <TrendingUp className="h-3.5 w-3.5 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="rounded-xl border border-gray-100/50 dark:border-gray-800/50 bg-white dark:bg-gray-900 shadow-sm">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">Watch time</p>
                    <p className="text-base font-bold text-gray-900 dark:text-white">9.2K</p>
                    <p className="text-[9px] text-gray-400 dark:text-gray-500">hours</p>
                  </div>
                  <div className="p-1.5 rounded-lg bg-green-50 dark:bg-green-950/30">
                    <Clock className="h-3.5 w-3.5 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="rounded-xl border border-gray-100/50 dark:border-gray-800/50 bg-white dark:bg-gray-900 shadow-sm">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">Subscribers</p>
                    <p className="text-base font-bold text-green-600 dark:text-green-400">+1.6K</p>
                  </div>
                  <div className="p-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/30">
                    <Users className="h-3.5 w-3.5 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="rounded-xl border border-gray-100/50 dark:border-gray-800/50 bg-white dark:bg-gray-900 shadow-sm">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">Revenue</p>
                    <p className="text-base font-bold text-amber-600 dark:text-amber-400">$268</p>
                  </div>
                  <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/30">
                    <DollarSign className="h-3.5 w-3.5 text-amber-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Date Filter - Horizontal scroll */}
        <div className="mb-4 overflow-x-auto pb-1.5 -mx-1 px-1">
          <div className="flex gap-1 min-w-max">
            {filterButtons.map((filter) => (
              <Button
                key={filter.value}
                variant={dateFilterType === filter.value ? "default" : "ghost"}
                size="sm"
                onClick={() => setDateFilterType(filter.value as DateFilterType)}
                className={`rounded-full px-3 text-[10px] transition-all h-7 ${
                  dateFilterType === filter.value 
                    ? 'bg-blue-600 text-white hover:bg-blue-700' 
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                {filter.label}
              </Button>
            ))}
            <Badge variant="secondary" className="rounded-full px-2 py-0.5 text-[9px] whitespace-nowrap bg-gray-100 dark:bg-gray-800 border-0 text-gray-500 dark:text-gray-400">
              <CalendarIcon className="h-2.5 w-2.5 mr-0.5" />
              {format(getDateRangeForDashboard.start, 'MMM d')} - {format(getDateRangeForDashboard.end, 'MMM d')}
            </Badge>
          </div>
        </div>

        {/* 3 Expense Cards - Full width on mobile */}
        <div className="space-y-2.5 mb-4">
          <ClickableCard
            title="Common Expenses"
            value={formatCurrency(totals.totalCommon)}
            icon={<Wallet className="h-3.5 w-3.5 text-indigo-600" />}
            description="Recurring operational costs"
            color="purple"
            onClick={handleCommonClick}
            trend={totals.totalCommon > 0 ? 'up' : 'neutral'}
            trendValue={totals.totalCommon > 0 ? 'Active' : 'None'}
          />
          
          <ClickableCard
            title="Stock Purchases"
            value={formatCurrency(totals.totalStock)}
            icon={<Package className="h-3.5 w-3.5 text-emerald-600" />}
            description="Inventory & raw materials"
            color="emerald"
            onClick={handleStockClick}
            trend={totals.totalStock > 0 ? 'up' : 'neutral'}
            trendValue={totals.totalStock > 0 ? 'Active' : 'None'}
          />
          
          <ClickableCard
            title="Casual Expenses"
            value={formatCurrency(totals.totalCasual)}
            icon={<Receipt className="h-3.5 w-3.5 text-amber-600" />}
            description="One-time & unexpected costs"
            color="amber"
            onClick={handleCasualClick}
            trend={totals.totalCasual > 0 ? 'up' : 'neutral'}
            trendValue={totals.totalCasual > 0 ? 'Active' : 'None'}
          />
        </div>

        {/* Total Expenses Summary */}
        <Card className="rounded-xl border border-gray-100/50 dark:border-gray-800/50 bg-white dark:bg-gray-900 shadow-sm mb-4">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">Total Expenses</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{formatCurrency(totals.totalExpenses)}</p>
              </div>
              <div className="flex items-center gap-2 text-[10px]">
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-indigo-500" />
                  <span className="text-gray-500 dark:text-gray-400">{formatCurrency(totals.totalCommon)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-gray-500 dark:text-gray-400">{formatCurrency(totals.totalStock)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span className="text-gray-500 dark:text-gray-400">{formatCurrency(totals.totalCasual)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Expense Trends Chart */}
        <Card className="rounded-xl border border-gray-100/50 dark:border-gray-800/50 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
          <CardHeader className="pb-1 pt-3 px-3.5">
            <CardTitle className="text-xs font-semibold flex items-center gap-1.5 text-gray-900 dark:text-white">
              <TrendingUp className="h-3.5 w-3.5 text-blue-600" />
              Expense Trends
            </CardTitle>
            <CardDescription className="text-[9px] text-gray-400 dark:text-gray-500">
              Daily breakdown by category
            </CardDescription>
          </CardHeader>
          <CardContent className="p-1.5">
            {dailyExpenseData.length === 0 ? (
              <div className="w-full h-[180px] flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <AlertCircle className="h-8 w-8 mx-auto mb-1.5 opacity-50" />
                  <p className="text-[10px]">No data available</p>
                </div>
              </div>
            ) : (
              <div className="w-full h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailyExpenseData} margin={{ top: 5, right: 5, left: -5, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.08} vertical={false} />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 8 }}
                      tickLine={false}
                      axisLine={false}
                      interval={Math.floor(dailyExpenseData.length / 5)}
                    />
                    <YAxis 
                      tickFormatter={(v) => formatShortCurrency(v)}
                      tick={{ fontSize: 8 }}
                      tickLine={false}
                      axisLine={false}
                      width={25}
                    />
                    <RechartsTooltip 
                      formatter={(value: number, name: string) => [formatCurrency(value), name]}
                      contentStyle={{ 
                        borderRadius: '8px', 
                        border: 'none', 
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                        fontSize: '9px',
                        padding: '6px 10px',
                      }}
                      cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                    />
                    <Legend 
                      wrapperStyle={{ fontSize: '8px', paddingTop: '2px' }}
                      iconSize={6}
                    />
                    <Bar 
                      dataKey="Common" 
                      stackId="expenses" 
                      fill={CHART_COLORS.common} 
                      radius={[2, 2, 0, 0]} 
                      name="Common" 
                      animationDuration={600}
                    />
                    <Bar 
                      dataKey="Stock" 
                      stackId="expenses" 
                      fill={CHART_COLORS.stock} 
                      radius={[2, 2, 0, 0]} 
                      name="Stock" 
                      animationDuration={600}
                    />
                    <Bar 
                      dataKey="Casual" 
                      stackId="expenses" 
                      fill={CHART_COLORS.casual} 
                      radius={[2, 2, 0, 0]} 
                      name="Casual" 
                      animationDuration={600}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
      <Toaster 
        position="top-right" 
        toastOptions={{
          style: {
            borderRadius: '10px',
            padding: '8px 12px',
            fontSize: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          },
        }}
      />
    </div>
  )
}

// Missing icons import
import { Clock, Users, DollarSign } from "lucide-react"