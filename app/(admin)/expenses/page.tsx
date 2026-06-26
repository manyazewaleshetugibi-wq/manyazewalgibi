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
  <Card className="rounded-2xl border-0 shadow-lg bg-gradient-to-br from-gray-100/50 to-gray-200/30 dark:from-gray-800/30 dark:to-gray-700/20">
    <CardContent className="p-4 sm:p-6">
      <div className="flex items-start justify-between mb-3">
        <Skeleton className="h-12 w-12 rounded-xl" />
        <Skeleton className="h-5 w-5 rounded-full" />
      </div>
      <Skeleton className="h-4 w-24 mb-2" />
      <Skeleton className="h-8 w-32 mb-2" />
      <Skeleton className="h-3 w-28" />
    </CardContent>
  </Card>
)

// Enhanced Clickable Card with micro-interactions
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
    purple: { bg: "from-indigo-500/10 to-purple-500/5", icon: "bg-indigo-100 dark:bg-indigo-900/30", text: "text-indigo-600 dark:text-indigo-400", border: "hover:border-indigo-200 dark:hover:border-indigo-800", glow: "shadow-indigo-500/20" },
    emerald: { bg: "from-emerald-500/10 to-teal-500/5", icon: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-600 dark:text-emerald-400", border: "hover:border-emerald-200 dark:hover:border-emerald-800", glow: "shadow-emerald-500/20" },
    amber: { bg: "from-amber-500/10 to-yellow-500/5", icon: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-600 dark:text-amber-400", border: "hover:border-amber-200 dark:hover:border-amber-800", glow: "shadow-amber-500/20" },
  }

  const styles = colorMap[color as keyof typeof colorMap]

  if (isLoading) {
    return <SkeletonCard />
  }

  return (
    <div 
      className="cursor-pointer transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] group"
      onClick={onClick}
    >
      <Card className={`rounded-2xl border-2 border-transparent shadow-lg bg-gradient-to-br ${styles.bg} hover:shadow-xl ${styles.border} transition-all hover:${styles.glow}`}>
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-start justify-between mb-3">
            <div className={`p-2.5 rounded-xl ${styles.icon} transition-all group-hover:scale-110`}>
              {icon}
            </div>
            <ChevronRight className={`h-5 w-5 ${styles.text} opacity-40 group-hover:opacity-100 transition-all group-hover:translate-x-1`} />
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground font-medium">{title}</p>
          <div className="flex items-end justify-between mt-1">
            <p className={`text-2xl sm:text-3xl font-bold ${styles.text}`}>{value}</p>
            {trend && trendValue && (
              <div className={`flex items-center gap-0.5 text-xs font-medium ${trend === 'up' ? 'text-emerald-600' : trend === 'down' ? 'text-red-600' : 'text-gray-500'}`}>
                {trend === 'up' ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                {trendValue}
              </div>
            )}
          </div>
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-2 opacity-70">{description}</p>
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
    { value: 'today', label: '📅 Today' },
    { value: 'yesterday', label: '📆 Yesterday' },
    { value: '7d', label: '7 Days' },
    { value: '14d', label: '14 Days' },
    { value: '28d', label: '28 Days' },
    { value: 'month', label: '📈 Month' },
  ]

  const handleCasualClick = () => setActivePage('casual')
  const handleCommonClick = () => setActivePage('common')
  const handleStockClick = () => setActivePage('stock')
  const handleBackToDashboard = () => setActivePage('dashboard')

  // Render sub-pages
  if (activePage === 'casual') {
    return (
      <div className="min-h-screen bg-background p-4 sm:p-6">
        <Button variant="ghost" onClick={handleBackToDashboard} className="mb-4 gap-2 text-sm hover:bg-primary/10 transition-colors">
          ← Back to Dashboard
        </Button>
        <CasualExpenses />
      </div>
    )
  }

  if (activePage === 'common') {
    return (
      <div className="min-h-screen bg-background p-4 sm:p-6">
        <Button variant="ghost" onClick={handleBackToDashboard} className="mb-4 gap-2 text-sm hover:bg-primary/10 transition-colors">
          ← Back to Dashboard
        </Button>
        <CommonExpenses />
      </div>
    )
  }

  if (activePage === 'stock') {
    return (
      <div className="min-h-screen bg-background p-4 sm:p-6">
        <Button variant="ghost" onClick={handleBackToDashboard} className="mb-4 gap-2 text-sm hover:bg-primary/10 transition-colors">
          ← Back to Dashboard
        </Button>
        <StockPurchases />
      </div>
    )
  }

  // Loading State with Skeleton Cards
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-background/95 p-4 sm:p-6">
        <div className="container max-w-7xl mx-auto">
          {/* Header Skeleton */}
          <div className="mb-6 sm:mb-8">
            <div className="flex items-center gap-2 mb-1">
              <Skeleton className="h-5 w-5 rounded-full" />
              <Skeleton className="h-8 w-48" />
            </div>
            <Skeleton className="h-4 w-64" />
          </div>

          {/* Filter Skeleton */}
          <div className="mb-6 sm:mb-8">
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-9 w-20 rounded-full" />
              ))}
              <Skeleton className="h-9 w-32 rounded-full" />
            </div>
          </div>

          {/* Cards Skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6 mb-6 sm:mb-8">
            {[1, 2, 3].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>

          {/* Chart Skeleton */}
          <Card className="rounded-2xl border-0 shadow-lg overflow-hidden">
            <CardHeader className="pb-2 sm:pb-4">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-56" />
            </CardHeader>
            <CardContent className="p-2 sm:p-6">
              <div className="w-full h-[250px] sm:h-[350px] flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Error State
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-background/95 p-4 sm:p-6 flex items-center justify-center">
        <Card className="max-w-md w-full rounded-2xl border-0 shadow-lg bg-gradient-to-br from-red-50/50 to-red-100/30 dark:from-red-950/20 dark:to-red-900/10">
          <CardContent className="p-6 text-center">
            <div className="p-4 rounded-full bg-red-100 dark:bg-red-900/30 mx-auto w-fit mb-4">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Error Loading Data</h3>
            <p className="text-muted-foreground text-sm mb-4">{error}</p>
            <Button onClick={fetchAllData} className="rounded-full">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Dashboard View
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-background/95 p-2 sm:p-0">
      <main className="container max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-8">
        {/* Header with animated gradient */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="h-5 w-5 text-primary animate-pulse" />
                <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
                  Expense Dashboard
                </h1>
              </div>
              <p className="text-sm sm:text-base text-muted-foreground">
                Real-time expense tracking & analytics
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={refreshData}
              disabled={isRefreshing}
              className="rounded-full border-2 hover:border-primary/50 transition-all"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>
        </div>

        {/* Date Filter - Horizontal scroll for mobile */}
        <div className="mb-6 sm:mb-8 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
          <div className="flex gap-1.5 sm:gap-2 min-w-max">
            {filterButtons.map((filter) => (
              <Button
                key={filter.value}
                variant={dateFilterType === filter.value ? "default" : "outline"}
                size="sm"
                onClick={() => setDateFilterType(filter.value as DateFilterType)}
                className={`rounded-full px-3 sm:px-4 text-xs sm:text-sm transition-all ${
                  dateFilterType === filter.value 
                    ? 'shadow-lg shadow-primary/20 bg-gradient-to-r from-primary to-primary/80' 
                    : 'hover:shadow-md hover:border-primary/30'
                }`}
              >
                {filter.label}
              </Button>
            ))}
            <Badge variant="secondary" className="rounded-full px-3 py-1.5 text-xs whitespace-nowrap ml-1 bg-gradient-to-r from-primary/10 to-primary/5">
              <CalendarIcon className="h-3 w-3 mr-1" />
              {format(getDateRangeForDashboard.start, 'MMM d')} - {format(getDateRangeForDashboard.end, 'MMM d')}
            </Badge>
          </div>
        </div>

        {/* 3 Clickable Cards - Responsive grid */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6 mb-6 sm:mb-8">
          <ClickableCard
            title="Common Expenses"
            value={formatCurrency(totals.totalCommon)}
            icon={<Wallet className="h-5 w-5 text-indigo-600" />}
            description="Recurring operational costs"
            color="purple"
            onClick={handleCommonClick}
            trend={totals.totalCommon > 0 ? 'up' : 'neutral'}
            trendValue={totals.totalCommon > 0 ? 'active' : 'none'}
          />
          
          <ClickableCard
            title="Stock Purchases"
            value={formatCurrency(totals.totalStock)}
            icon={<Package className="h-5 w-5 text-emerald-600" />}
            description="Inventory & raw materials"
            color="emerald"
            onClick={handleStockClick}
            trend={totals.totalStock > 0 ? 'up' : 'neutral'}
            trendValue={totals.totalStock > 0 ? 'active' : 'none'}
          />
          
          <ClickableCard
            title="Casual Expenses"
            value={formatCurrency(totals.totalCasual)}
            icon={<Receipt className="h-5 w-5 text-amber-600" />}
            description="One-time & unexpected costs"
            color="amber"
            onClick={handleCasualClick}
            trend={totals.totalCasual > 0 ? 'up' : 'neutral'}
            trendValue={totals.totalCasual > 0 ? 'active' : 'none'}
          />
        </div>

        {/* Total Expenses Summary Card */}
        <Card className="mb-6 sm:mb-8 rounded-2xl border-0 shadow-lg bg-gradient-to-r from-primary/5 via-primary/5 to-primary/5 backdrop-blur-sm hover:shadow-xl transition-shadow">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">Total Expenses</p>
                <p className="text-3xl sm:text-4xl font-bold text-primary">{formatCurrency(totals.totalExpenses)}</p>
              </div>
              <div className="p-3 rounded-full bg-primary/10">
                <Wallet className="h-8 w-8 text-primary" />
              </div>
            </div>
            <div className="mt-4 flex gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Common: </span>
                <span className="font-semibold text-indigo-600">{formatCurrency(totals.totalCommon)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Stock: </span>
                <span className="font-semibold text-emerald-600">{formatCurrency(totals.totalStock)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Casual: </span>
                <span className="font-semibold text-amber-600">{formatCurrency(totals.totalCasual)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Expense Trends Chart */}
        <Card className="rounded-2xl border-0 shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
          <CardHeader className="pb-2 sm:pb-4">
            <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Expense Trends
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Daily breakdown of all expense types
            </CardDescription>
          </CardHeader>
          <CardContent className="p-2 sm:p-6">
            {dailyExpenseData.length === 0 ? (
              <div className="w-full h-[250px] sm:h-[350px] flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No data available for this period</p>
                </div>
              </div>
            ) : (
              <div className="w-full h-[250px] sm:h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailyExpenseData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: window.innerWidth < 640 ? 10 : 12 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis 
                      tickFormatter={(v) => formatShortCurrency(v)}
                      tick={{ fontSize: window.innerWidth < 640 ? 10 : 12 }}
                      tickLine={false}
                      axisLine={false}
                      width={window.innerWidth < 640 ? 40 : 60}
                    />
                    <RechartsTooltip 
                      formatter={(value: number, name: string) => [formatCurrency(value), name]}
                      contentStyle={{ 
                        borderRadius: '12px', 
                        border: 'none', 
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                        fontSize: window.innerWidth < 640 ? '12px' : '14px',
                        padding: window.innerWidth < 640 ? '8px 12px' : '12px 16px',
                      }}
                      cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                    />
                    <Legend 
                      wrapperStyle={{ fontSize: window.innerWidth < 640 ? '10px' : '12px', paddingTop: '10px' }}
                      iconSize={window.innerWidth < 640 ? 8 : 10}
                    />
                    <Bar 
                      dataKey="Common" 
                      stackId="expenses" 
                      fill={CHART_COLORS.common} 
                      radius={[4, 4, 0, 0]} 
                      name="Common" 
                      animationDuration={800}
                      animationBegin={200}
                    />
                    <Bar 
                      dataKey="Stock" 
                      stackId="expenses" 
                      fill={CHART_COLORS.stock} 
                      radius={[4, 4, 0, 0]} 
                      name="Stock" 
                      animationDuration={800}
                      animationBegin={400}
                    />
                    <Bar 
                      dataKey="Casual" 
                      stackId="expenses" 
                      fill={CHART_COLORS.casual} 
                      radius={[4, 4, 0, 0]} 
                      name="Casual" 
                      animationDuration={800}
                      animationBegin={600}
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
            borderRadius: '12px',
            padding: '12px 16px',
            fontSize: '14px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          },
          success: {
            iconTheme: {
              primary: '#10B981',
              secondary: 'white',
            },
          },
          error: {
            iconTheme: {
              primary: '#EF4444',
              secondary: 'white',
            },
          },
        }}
      />
    </div>
  )
}