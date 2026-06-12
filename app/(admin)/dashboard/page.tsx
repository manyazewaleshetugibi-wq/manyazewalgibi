"use client"

import type React from "react"
import { useState, useMemo, useCallback } from "react"
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query"
import axios from "axios"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer, AreaChart, Area, Tooltip as RechartsTooltip, PieChart, Pie, Cell } from "recharts"
import { motion, AnimatePresence } from "framer-motion"
import { useTheme } from "next-themes"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { ArrowDownIcon, DollarSign, ShoppingCart, Package, TrendingUp, Calendar, Users, Clock, ArrowUp, ArrowDown } from "lucide-react"
import { ChartContainer } from "@/components/ui/chart"
import { DateRangePicker } from "./date-range-picker"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { isSameDay, parseISO, format } from "date-fns"

// API client setup
const api = axios.create({
  baseURL: "/api",
})

// API functions
const fetchExpenses = () => api.get("/expense").then((res) => res.data.data)
const fetchCommonExpenses = () => api.get("/common-expense").then((res) => res.data.data)
const fetchOrderReport = () => api.get("/order/report").then((res) => res.data)
const fetchStock = () => api.get("/stock").then((res) => res.data.data)
const fetchStockPurchases = () => api.get("/stock-purchase").then((res) => res.data.purchases)

// Types
interface Expense {
  _id: string
  title: string
  category: string
  amount: number
  date: string
}

interface CommonExpense {
  _id: string
  title: string
  amount: number
  category: string
  frequency: string
  startDate: string
  endDate?: string
  isActive: boolean
}

interface OrderReport {
  dailySales: Record<string, number>
  orderCount: number
  dailyOrders?: Record<string, number>
}

interface StockItem {
  _id: string
  name: string
  currentStock: number
  minimumStock: number
  price?: number
  category?: string
  unit?: string
  lastPurchasePrice?: number
}

interface StockPurchase {
  _id: string
  purchaseDate: string
  quantity: number
  unitPrice: number
  stockId: string
  supplier: string
}

// Utility functions
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount) + " ETB"
}

const calculatePercentageChange = (current: number, previous: number) => {
  if (previous === 0) return current > 0 ? 100 : 0
  return ((current - previous) / previous) * 100
}

// Helper function to get daily amount from common expense
const getDailyCommonAmount = (expense: CommonExpense, date: Date): number => {
  if (!expense.isActive) return 0
  
  const start = new Date(expense.startDate)
  start.setHours(0, 0, 0, 0)
  if (date < start) return 0
  
  if (expense.endDate) {
    const end = new Date(expense.endDate)
    end.setHours(23, 59, 59, 999)
    if (date > end) return 0
  }

  switch (expense.frequency) {
    case 'daily': return expense.amount
    case 'weekly': return expense.amount / 7
    case 'monthly': return expense.amount / 30
    case 'yearly': return expense.amount / 365
    case 'one-time': return isSameDay(date, start) ? expense.amount : 0
    default: return 0
  }
}

// Helper function to normalize date for comparison
const normalizeDate = (dateStr: string): string => {
  try {
    return format(new Date(dateStr), 'yyyy-MM-dd')
  } catch {
    return dateStr.split('T')[0]
  }
}

// FIXED: Calculate total cost for a stock - SAME calculation as stock page
// Uses: current stock × last purchase price (not total historical purchases)
const calculateCurrentStockValue = (stock: StockItem, purchases: StockPurchase[]): number => {
  // Get last purchase price (most recent purchase by date)
  const stockPurchases = purchases
    .filter((purchase) => purchase.stockId === stock._id)
    .sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime())
  
  const lastPurchasePrice = stockPurchases.length > 0 ? stockPurchases[0].unitPrice : 0
  
  // Calculate value = current stock × last purchase price
  return stock.currentStock * lastPurchasePrice
}

// Loading Spinner Component
const LoadingSpinner = () => (
  <div className="flex justify-center items-center h-40">
    <div className="relative h-20 w-20">
      <div className="absolute inset-0 rounded-full border-t-2 border-primary animate-spin"></div>
      <div className="absolute inset-2 rounded-full border-r-2 border-primary/60 animate-spin animate-reverse"></div>
      <div className="absolute inset-4 rounded-full border-b-2 border-primary/40 animate-spin animate-delay-150"></div>
    </div>
  </div>
)

// Stat Card Component with Click Navigation
const StatCard = ({
  title,
  value,
  icon,
  change,
  isLoading,
  trend,
  description,
  color = "primary",
  navigateTo,
}: {
  title: string
  value: string
  icon: React.ReactNode
  change?: number
  isLoading: boolean
  trend?: "up" | "down" | "neutral"
  description?: string
  color?: "primary" | "success" | "warning" | "danger" | "info"
  navigateTo: string
}) => {
  const router = useRouter()
  
  const colorStyles = {
    primary: "from-primary/10 to-primary/5 border-primary/20 dark:from-primary/20 dark:to-primary/5 dark:border-primary/30",
    success: "from-green-100/50 to-green-50/30 border-green-200 dark:from-green-900/20 dark:to-green-900/10 dark:border-green-800/30",
    warning: "from-amber-100/50 to-amber-50/30 border-amber-200 dark:from-amber-900/20 dark:to-amber-900/10 dark:border-amber-800/30",
    danger: "from-red-100/50 to-red-50/30 border-red-200 dark:from-red-900/20 dark:to-red-900/10 dark:border-red-800/30",
    info: "from-blue-100/50 to-blue-50/30 border-blue-200 dark:from-blue-900/20 dark:to-blue-900/10 dark:border-blue-800/30"
  }

  const iconStyles = {
    primary: "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-foreground",
    success: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    warning: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    danger: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    info: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
  }

  const trendStyles = {
    up: "text-green-600 dark:text-green-400",
    down: "text-red-600 dark:text-red-400",
    neutral: "text-gray-500 dark:text-gray-400"
  }

  return (
    <motion.div 
      whileHover={{ y: -5, boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)" }}
      transition={{ duration: 0.2 }}
      onClick={() => router.push(navigateTo)}
      className="cursor-pointer"
    >
      <Card className={`bg-gradient-to-br ${colorStyles[color]} hover:shadow-lg transition-all duration-300 h-full border dark:border-opacity-40 overflow-hidden group`}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
          <div className="absolute top-0 right-0 h-24 w-24 bg-gradient-to-bl from-black/[0.01] to-transparent dark:from-white/[0.01] rounded-full -mr-12 -mt-12 opacity-70"></div>
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <div className={`p-2 rounded-full ${iconStyles[color]}`}>
            {icon}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-8 w-[100px]" />
          ) : (
            <>
              <div className="text-2xl font-bold tracking-tight transition-all duration-200 group-hover:scale-105 origin-left">{value}</div>
              {description && (
                <p className="text-xs text-muted-foreground mt-1">{description}</p>
              )}
              {typeof change !== 'undefined' && (
                <div className="flex items-center mt-2 text-sm">
                  <span className={trendStyles[trend || 'neutral']}>
                    {trend === 'up' ? <ArrowUp className="h-3 w-3 mr-1 inline" /> : trend === 'down' ? <ArrowDown className="h-3 w-3 mr-1 inline" /> : null}
                    {change > 0 ? "+" : ""}{change.toFixed(1)}%
                  </span>
                  <span className="text-xs text-muted-foreground ml-2">from yesterday</span>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

// Stock Status Helper
type StockStatus = 'critical' | 'low' | 'good';

const getStockStatus = (item: StockItem): StockStatus => {
  if (item.minimumStock === 0) return 'good'
  const ratio = item.currentStock / item.minimumStock
  if (ratio <= 0.5) return 'critical'
  if (ratio <= 1) return 'low'
  return 'good'
}

// Main Dashboard Component
function Dashboard() {
  const router = useRouter()
  const { theme } = useTheme()
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({ 
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 
    to: new Date() 
  })

  const { data: expenses, isLoading: isLoadingExpenses } = useQuery<Expense[]>({ 
    queryKey: ["expenses"], 
    queryFn: fetchExpenses 
  })
  
  const { data: commonExpenses, isLoading: isLoadingCommon } = useQuery<CommonExpense[]>({
    queryKey: ["commonExpenses"],
    queryFn: fetchCommonExpenses,
  })
  
  const { data: orderReport, isLoading: isLoadingOrderReport } = useQuery<OrderReport>({
    queryKey: ["orderReport"],
    queryFn: fetchOrderReport,
  })
  
  const { data: stock, isLoading: isLoadingStock } = useQuery<StockItem[]>({ 
    queryKey: ["stock"], 
    queryFn: fetchStock 
  })
  
  const { data: stockPurchases, isLoading: isLoadingStockPurchases } = useQuery<StockPurchase[]>({
    queryKey: ["stockPurchases"],
    queryFn: fetchStockPurchases,
  })

  const isLoading = isLoadingExpenses || isLoadingCommon || isLoadingOrderReport || isLoadingStock || isLoadingStockPurchases

  // Get today's date string
  const todayStr = new Date().toISOString().split("T")[0]
  const todayDate = new Date()
  
  // Get yesterday's date string
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().split("T")[0]
  const yesterdayDate = yesterday

  // Calculate Today's Revenue (from dailySales)
  const todaysRevenue = useMemo(() => {
    if (!orderReport) return 0
    return orderReport.dailySales[todayStr] || 0
  }, [orderReport, todayStr])

  // Calculate Yesterday's Revenue
  const yesterdaysRevenue = useMemo(() => {
    if (!orderReport) return 0
    return orderReport.dailySales[yesterdayStr] || 0
  }, [orderReport, yesterdayStr])

  // Calculate Today's Expenses (Common + Casual + Stock Purchases)
  const todaysExpenses = useMemo(() => {
    let total = 0
    
    // 1. Casual Expenses from /api/expense
    if (expenses) {
      total += expenses
        .filter((expense) => {
          const expenseDate = normalizeDate(expense.date)
          return expenseDate === todayStr
        })
        .reduce((sum, expense) => sum + expense.amount, 0)
    }
    
    // 2. Common Expenses (amortized daily)
    if (commonExpenses) {
      commonExpenses.forEach(expense => {
        total += getDailyCommonAmount(expense, todayDate)
      })
    }
    
    // 3. Stock Purchases from /api/stock-purchase
    if (stockPurchases) {
      total += stockPurchases
        .filter((purchase) => purchase.purchaseDate?.startsWith(todayStr))
        .reduce((sum, purchase) => sum + (purchase.quantity * purchase.unitPrice), 0)
    }
    
    return total
  }, [expenses, commonExpenses, stockPurchases, todayStr, todayDate])

  // Calculate Yesterday's Expenses
  const yesterdaysExpenses = useMemo(() => {
    let total = 0
    
    if (expenses) {
      total += expenses
        .filter((expense) => {
          const expenseDate = normalizeDate(expense.date)
          return expenseDate === yesterdayStr
        })
        .reduce((sum, expense) => sum + expense.amount, 0)
    }
    
    if (commonExpenses) {
      commonExpenses.forEach(expense => {
        total += getDailyCommonAmount(expense, yesterdayDate)
      })
    }
    
    if (stockPurchases) {
      total += stockPurchases
        .filter((purchase) => purchase.purchaseDate?.startsWith(yesterdayStr))
        .reduce((sum, purchase) => sum + (purchase.quantity * purchase.unitPrice), 0)
    }
    
    return total
  }, [expenses, commonExpenses, stockPurchases, yesterdayStr, yesterdayDate])

  // Calculate Today's Orders
  const todaysOrders = useMemo(() => {
    if (!orderReport) return 0
    if (orderReport.dailyOrders) {
      return orderReport.dailyOrders[todayStr] || 0
    }
    const avgOrderValue = 500
    const estimatedOrders = Math.round(todaysRevenue / avgOrderValue)
    return estimatedOrders
  }, [orderReport, todayStr, todaysRevenue])

  // Calculate Yesterday's Orders
  const yesterdaysOrders = useMemo(() => {
    if (!orderReport) return 0
    if (orderReport.dailyOrders) {
      return orderReport.dailyOrders[yesterdayStr] || 0
    }
    const avgOrderValue = 500
    return Math.round(yesterdaysRevenue / avgOrderValue)
  }, [orderReport, yesterdayStr, yesterdaysRevenue])

  // FIXED: Calculate Current Stock Value - SAME calculation as stock page
  // Uses: current stock × last purchase price (not total historical purchases)
  const currentStockValue = useMemo(() => {
    if (!stock || !stockPurchases) return 0
    
    let totalValue = 0
    stock.forEach((item) => {
      totalValue += calculateCurrentStockValue(item, stockPurchases)
    })
    
    return totalValue
  }, [stock, stockPurchases])

  // Calculate Yesterday's Stock Value (estimate)
  const yesterdayStockValue = useMemo(() => {
    if (!stock || !stockPurchases) return currentStockValue * 0.95
    
    // Calculate yesterday's value by estimating stock levels before today's purchases
    let totalValue = 0
    stock.forEach((item) => {
      // Get purchases before today
      const previousPurchases = stockPurchases
        .filter(p => p.stockId === item._id && !p.purchaseDate?.startsWith(todayStr))
        .sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime())
      
      const lastPurchasePrice = previousPurchases.length > 0 ? previousPurchases[0].unitPrice : 0
      
      // Estimate yesterday's stock (today's stock minus today's purchases)
      const todayPurchasesQuantity = stockPurchases
        .filter(p => p.stockId === item._id && p.purchaseDate?.startsWith(todayStr))
        .reduce((sum, p) => sum + p.quantity, 0)
      
      const yesterdayStock = item.currentStock - todayPurchasesQuantity
      totalValue += yesterdayStock * lastPurchasePrice
    })
    
    return totalValue
  }, [stock, stockPurchases, currentStockValue, todayStr])

  // Calculate Today's Stock Costs (purchases made today)
  const todaysStockCosts = useMemo(() => {
    if (!stockPurchases) return 0
    return stockPurchases
      .filter((purchase) => purchase.purchaseDate?.startsWith(todayStr))
      .reduce((sum: number, purchase) => sum + purchase.quantity * purchase.unitPrice, 0)
  }, [stockPurchases, todayStr])

  // Calculate percentage changes
  const revenueChange = calculatePercentageChange(todaysRevenue, yesterdaysRevenue)
  const expensesChange = calculatePercentageChange(todaysExpenses, yesterdaysExpenses)
  const ordersChange = calculatePercentageChange(todaysOrders, yesterdaysOrders)
  const stockChange = calculatePercentageChange(currentStockValue, yesterdayStockValue)

  // Filtered sales data for chart
  const filteredSalesData = useMemo(() => {
    if (!orderReport) return []
    return Object.entries(orderReport.dailySales)
      .filter(([date]) => {
        const salesDate = new Date(date)
        return salesDate >= dateRange.from && salesDate <= dateRange.to
      })
      .map(([date, sales]) => ({
        date: new Date(date).toISOString().split("T")[0],
        sales,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }, [orderReport, dateRange])

  // Critical stock items
  const criticalStock = useMemo(() => {
    if (!stock) return []
    return stock.filter(item => getStockStatus(item) === 'critical')
  }, [stock])

  // Stock status counts for pie chart
  const stockStatusCounts = useMemo(() => {
    if (!stock) return { critical: 0, low: 0, good: 0, total: 0 }
    return stock.reduce((acc, item) => {
      const status = getStockStatus(item)
      acc[status]++
      acc.total++
      return acc
    }, { critical: 0, low: 0, good: 0, total: 0 })
  }, [stock])

  const stockStatusPieData = [
    { name: 'Critical', value: stockStatusCounts.critical, color: '#ef4444' },
    { name: 'Low', value: stockStatusCounts.low, color: '#f59e0b' },
    { name: 'Good', value: stockStatusCounts.good, color: '#10b981' }
  ].filter(item => item.value > 0)

  const handleDateRangeSelect = useCallback((range: { from?: Date; to?: Date }) => {
    if (range.from && range.to) {
      setDateRange({ from: range.from, to: range.to })
    }
  }, [])

  const handleResetDateRange = useCallback(() => {
    setDateRange({ 
      from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 
      to: new Date() 
    })
  }, [])

  // Calculate total revenue all time
  const totalRevenueAllTime = useMemo(() => {
    if (!orderReport) return 0
    return Object.values(orderReport.dailySales).reduce((a, b) => a + b, 0)
  }, [orderReport])

  // Calculate casual expenses breakdown for display
  const recentCasualExpenses = useMemo(() => {
    if (!expenses) return []
    return [...expenses]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5)
  }, [expenses])

  return (
    <div className="container mx-auto p-4 min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-950 dark:to-gray-900">
      <AnimatePresence>
        {isLoading ? (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center mt-16"
          >
            <LoadingSpinner />
            <p className="mt-4 text-gray-500 dark:text-gray-400">Loading dashboard data...</p>
          </motion.div>
        ) : (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="space-y-8"
          >
            {/* Header Section */}
            <motion.h1 
              className="text-4xl font-bold text-center bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent dark:from-primary dark:to-blue-400"
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              Restaurant Dashboard
            </motion.h1>

            {/* Date Display */}
            <motion.div
              initial={{ y: -10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-900/50 rounded-lg p-3 w-fit shadow-sm border dark:border-gray-800"
            >
              <Calendar className="h-4 w-4" />
              <span>{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
            </motion.div>

            {/* 4 Main Metric Cards - All Clickable */}
            <motion.div 
              className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
              <StatCard
                title="Today's Revenue"
                value={formatCurrency(todaysRevenue)}
                icon={<DollarSign className="h-4 w-4" />}
                change={revenueChange}
                trend={revenueChange >= 0 ? "up" : "down"}
                isLoading={isLoading}
                color="success"
                description="Total sales for today"
                navigateTo="/sales"
              />
              <StatCard
                title="Today's Expenses"
                value={formatCurrency(todaysExpenses)}
                icon={<ArrowDownIcon className="h-4 w-4" />}
                change={Math.abs(expensesChange)}
                trend={expensesChange <= 0 ? "down" : "up"}
                isLoading={isLoading}
                color="danger"
                description="All expenses (Common + Casual + Stock)"
                navigateTo="/expenses"
              />
              <StatCard
                title="Today's Orders"
                value={todaysOrders.toString()}
                icon={<ShoppingCart className="h-4 w-4" />}
                change={ordersChange}
                trend={ordersChange >= 0 ? "up" : "down"}
                isLoading={isLoading}
                color="warning"
                description="Orders processed today"
                navigateTo="/orders"
              />
              <StatCard
                title="Current Stock Value"
                value={formatCurrency(currentStockValue)}
                icon={<Package className="h-4 w-4" />}
                change={stockChange}
                trend={stockChange >= 0 ? "up" : "down"}
                isLoading={isLoading}
                color="info"
                description="Current stock × last purchase price"
                navigateTo="/stock"
              />
            </motion.div>

            {/* Today's Stock Costs Card */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.15 }}
            >
              <Card className="border dark:border-gray-800 bg-gradient-to-br from-indigo-100/50 to-indigo-50/30 border-indigo-200 dark:from-indigo-900/20 dark:to-indigo-900/10 dark:border-indigo-800/30">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-indigo-700 dark:text-indigo-300">Today's Stock Purchases</CardTitle>
                  <div className="p-2 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">
                    <Package className="h-4 w-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                    {formatCurrency(todaysStockCosts)}
                  </div>
                  <p className="text-xs text-indigo-500 dark:text-indigo-400 mt-1">
                    Total spent on inventory today
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            {/* Sales Overview Chart */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.2 }}
            >
              <Card className="border dark:border-gray-800">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div>
                    <CardTitle className="text-xl">Sales Overview</CardTitle>
                    <CardDescription>Daily revenue over time</CardDescription>
                  </div>
                  <DateRangePicker
                    from={dateRange.from}
                    to={dateRange.to}
                    onSelect={handleDateRangeSelect}
                  />
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={{
                      sales: {
                        label: "Sales",
                        color: "hsl(var(--chart-1))",
                      },
                    }}
                    className="h-[400px]"
                  >
                    {filteredSalesData.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full">
                        <Calendar className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-4" />
                        <p className="text-gray-500 dark:text-gray-400">No sales data available for the selected period</p>
                        <Button 
                          variant="outline" 
                          className="mt-4" 
                          onClick={handleResetDateRange}
                        >
                          Reset to Last 30 Days
                        </Button>
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={filteredSalesData}>
                          <defs>
                            <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="var(--color-sales)" stopOpacity={0.8} />
                              <stop offset="95%" stopColor="var(--color-sales)" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                          <XAxis 
                            dataKey="date" 
                            tickMargin={10}
                            tickFormatter={(value) => {
                              const date = new Date(value);
                              return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                            }}
                          />
                          <YAxis 
                            tickFormatter={(value) => {
                              if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
                              return value;
                            }}
                          />
                          <RechartsTooltip
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                return (
                                  <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 shadow-lg rounded-lg">
                                    <p className="text-gray-500 text-xs">{new Date(payload[0].payload.date).toLocaleDateString('en-US', { 
                                      weekday: 'long', 
                                      year: 'numeric', 
                                      month: 'long', 
                                      day: 'numeric' 
                                    })}</p>
                                    <p className="text-lg font-bold text-primary">
                                      {formatCurrency(payload[0].value as number)}
                                    </p>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Area
                            type="monotone"
                            dataKey="sales"
                            stroke="var(--color-sales)"
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#colorSales)"
                            activeDot={{ r: 6, strokeWidth: 2, stroke: "white" }}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    )}
                  </ChartContainer>
                </CardContent>
              </Card>
            </motion.div>

            {/* Second Row Charts - Expenses Breakdown */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.3 }}
              className="grid gap-4 md:grid-cols-2"
            >
              {/* Recent Casual Expenses Card */}
              <Card className="border dark:border-gray-800">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center">
                    <ArrowDownIcon className="h-5 w-5 mr-2 text-red-500" />
                    Recent Casual Expenses
                  </CardTitle>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => router.push('/expenses')}
                    className="text-xs"
                  >
                    View All →
                  </Button>
                </CardHeader>
                <CardDescription className="px-6 pb-2">Latest one-time expenses</CardDescription>
                <CardContent>
                  {recentCasualExpenses.length > 0 ? (
                    <div className="rounded-md border dark:border-gray-800 overflow-hidden">
                      <Table>
                        <TableHeader className="bg-gray-50 dark:bg-gray-900/50">
                          <TableRow>
                            <TableHead>Title</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Date</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {recentCasualExpenses.map((expense) => (
                            <TableRow key={expense._id} className="hover:bg-gray-50 dark:hover:bg-gray-900/30">
                              <TableCell className="font-medium">{expense.title}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="bg-gray-50 dark:bg-gray-800">
                                  {expense.category}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-red-600 dark:text-red-400 font-medium">{formatCurrency(expense.amount)}</TableCell>
                              <TableCell className="text-gray-500 dark:text-gray-400">
                                {new Date(expense.date).toLocaleDateString()}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-full mb-4">
                        <Clock className="h-8 w-8 text-gray-400" />
                      </div>
                      <p className="text-gray-700 dark:text-gray-300 font-medium">No recent expenses</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mt-1">
                        There are no expense records available to display
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Common Expenses Summary Card */}
              <Card className="border dark:border-gray-800">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center">
                    <Package className="h-5 w-5 mr-2 text-purple-500" />
                    Common Expenses
                  </CardTitle>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => router.push('/common-expense')}
                    className="text-xs"
                  >
                    View All →
                  </Button>
                </CardHeader>
                <CardDescription className="px-6 pb-2">Recurring operational costs (daily amortized)</CardDescription>
                <CardContent>
                  {commonExpenses && commonExpenses.filter(e => e.isActive).length > 0 ? (
                    <div className="space-y-3">
                      {commonExpenses.filter(e => e.isActive).slice(0, 5).map((expense) => {
                        const dailyAmount = getDailyCommonAmount(expense, todayDate)
                        return (
                          <div key={expense._id} className="flex justify-between items-center p-2 border-b last:border-0">
                            <div>
                              <p className="font-medium text-sm">{expense.title}</p>
                              <p className="text-xs text-muted-foreground">{expense.frequency} • {expense.category}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-semibold text-purple-600">{formatCurrency(dailyAmount)}</p>
                              <p className="text-xs text-muted-foreground">daily avg</p>
                            </div>
                          </div>
                        )
                      })}
                      {commonExpenses.filter(e => e.isActive).length > 5 && (
                        <p className="text-center text-xs text-muted-foreground pt-2">
                          +{commonExpenses.filter(e => e.isActive).length - 5} more
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-full mb-4">
                        <Package className="h-8 w-8 text-gray-400" />
                      </div>
                      <p className="text-gray-700 dark:text-gray-300 font-medium">No common expenses</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mt-1">
                        Add common expenses to track recurring costs
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Stock Management Section */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.4 }}
            >
              <Card className="border dark:border-gray-800">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Package className="h-5 w-5 mr-2 text-blue-500" />
                    Stock Management Overview
                  </CardTitle>
                  <CardDescription>Monitor your inventory levels and stock status</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-6 lg:grid-cols-2">
                    {/* Stock Status Distribution */}
                    <div>
                      <h4 className="text-sm font-medium mb-4">Stock Status Distribution</h4>
                      <div className="h-64">
                        {stockStatusPieData.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={stockStatusPieData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                              >
                                {stockStatusPieData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Pie>
                              <RechartsTooltip
                                formatter={(value) => [`${value} items`, 'Count']}
                              />
                              <Legend />
                            </PieChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="flex flex-col items-center justify-center text-center py-8">
                            <Package className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-4" />
                            <p className="text-gray-500 dark:text-gray-400">No stock data available</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Critical Stock Items */}
                    <div>
                      <h4 className="text-sm font-medium mb-4 flex items-center">
                        <span className="h-2 w-2 rounded-full bg-red-500 mr-2"></span>
                        Critical Stock Items
                      </h4>
                      {criticalStock.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                          <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-full mb-4">
                            <Package className="h-8 w-8 text-green-600 dark:text-green-400" />
                          </div>
                          <p className="text-gray-700 dark:text-gray-300 font-medium">All inventory items are at healthy levels</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mt-1">
                            There are no items below their minimum stock threshold
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3 max-h-64 overflow-y-auto">
                          {criticalStock.slice(0, 5).map((item) => {
                            const percentage = Math.min(100, Math.round((item.currentStock / item.minimumStock) * 100));
                            return (
                              <div key={item._id} className="p-3 rounded-lg border border-red-100 dark:border-red-800/30 bg-gradient-to-br from-red-50 to-red-50/50 dark:from-red-900/10 dark:to-red-900/5">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="font-medium">{item.name}</div>
                                  <Badge className="bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300">
                                    Critical
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-3">
                                  <div className="w-full">
                                    <Progress value={percentage} className="h-2 bg-red-200" />
                                    <div className="flex justify-between mt-1 text-xs text-gray-500 dark:text-gray-400">
                                      <span>Current: <span className="text-red-600 dark:text-red-400">{item.currentStock}</span></span>
                                      <span>Minimum: {item.minimumStock}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                          {criticalStock.length > 5 && (
                            <div className="text-center pt-2">
                              <Button variant="outline" size="sm" onClick={() => router.push('/stock')}>
                                View all {criticalStock.length} items
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Stock Level Indicators */}
                  <div className="grid grid-cols-3 gap-4 mt-6 pt-4 border-t dark:border-gray-800">
                    <div className="text-center cursor-pointer" onClick={() => router.push('/stock?filter=critical')}>
                      <div className="flex items-center justify-center gap-2">
                        <span className="h-3 w-3 rounded-full bg-red-500"></span>
                        <span className="text-sm">Critical</span>
                      </div>
                      <p className="text-2xl font-bold mt-1">{stockStatusCounts.critical}</p>
                    </div>
                    <div className="text-center cursor-pointer" onClick={() => router.push('/stock?filter=low')}>
                      <div className="flex items-center justify-center gap-2">
                        <span className="h-3 w-3 rounded-full bg-amber-500"></span>
                        <span className="text-sm">Low Stock</span>
                      </div>
                      <p className="text-2xl font-bold mt-1">{stockStatusCounts.low}</p>
                    </div>
                    <div className="text-center cursor-pointer" onClick={() => router.push('/stock?filter=good')}>
                      <div className="flex items-center justify-center gap-2">
                        <span className="h-3 w-3 rounded-full bg-green-500"></span>
                        <span className="text-sm">Good Stock</span>
                      </div>
                      <p className="text-2xl font-bold mt-1">{stockStatusCounts.good}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Quick Stats Row */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.5 }}
              className="grid gap-4 md:grid-cols-3"
            >
              <Card className="border dark:border-gray-800 bg-gradient-to-br from-purple-100/50 to-purple-50/30 border-purple-200 dark:from-purple-900/20 dark:to-purple-900/10 dark:border-purple-800/30">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-purple-700 dark:text-purple-300">Net Profit Today</CardTitle>
                  <div className="p-2 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                    <TrendingUp className="h-4 w-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {formatCurrency(todaysRevenue - todaysExpenses)}
                  </div>
                  <p className="text-xs text-purple-500 dark:text-purple-400 mt-1">
                    Revenue - All Expenses
                  </p>
                </CardContent>
              </Card>

              <Card className="border dark:border-gray-800 bg-gradient-to-br from-emerald-100/50 to-emerald-50/30 border-emerald-200 dark:from-emerald-900/20 dark:to-emerald-900/10 dark:border-emerald-800/30">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Profit Margin</CardTitle>
                  <div className="p-2 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                    <TrendingUp className="h-4 w-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                    {todaysRevenue > 0 ? ((todaysRevenue - todaysExpenses) / todaysRevenue * 100).toFixed(1) : 0}%
                  </div>
                  <p className="text-xs text-emerald-500 dark:text-emerald-400 mt-1">
                    Net profit percentage
                  </p>
                </CardContent>
              </Card>

              <Card className="border dark:border-gray-800 bg-gradient-to-br from-cyan-100/50 to-cyan-50/30 border-cyan-200 dark:from-cyan-900/20 dark:to-cyan-900/10 dark:border-cyan-800/30">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-cyan-700 dark:text-cyan-300">Total Revenue (All Time)</CardTitle>
                  <div className="p-2 rounded-full bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400">
                    <DollarSign className="h-4 w-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">
                    {formatCurrency(totalRevenueAllTime)}
                  </div>
                  <p className="text-xs text-cyan-500 dark:text-cyan-400 mt-1">
                    Total lifetime revenue
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            {/* Quick Navigation Section */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.6 }}
            >
              <Card className="border dark:border-gray-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    Quick Navigation
                  </CardTitle>
                  <CardDescription>Access different sections of your restaurant management system</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Button variant="outline" className="h-auto py-3 flex flex-col gap-2 hover:scale-105 transition-transform" onClick={() => router.push('/sales')}>
                      <DollarSign className="h-5 w-5 text-green-600" />
                      <span className="text-xs">Sales</span>
                    </Button>
                    <Button variant="outline" className="h-auto py-3 flex flex-col gap-2 hover:scale-105 transition-transform" onClick={() => router.push('/expenses')}>
                      <ArrowDownIcon className="h-5 w-5 text-red-600" />
                      <span className="text-xs">Expenses</span>
                    </Button>
                    <Button variant="outline" className="h-auto py-3 flex flex-col gap-2 hover:scale-105 transition-transform" onClick={() => router.push('/stock')}>
                      <Package className="h-5 w-5 text-blue-600" />
                      <span className="text-xs">Inventory</span>
                    </Button>
                    <Button variant="outline" className="h-auto py-3 flex flex-col gap-2 hover:scale-105 transition-transform" onClick={() => router.push('/orders')}>
                      <ShoppingCart className="h-5 w-5 text-orange-600" />
                      <span className="text-xs">Orders</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

const queryClient = new QueryClient()

export default function DashboardWithQueryClient() {
  return (
    <QueryClientProvider client={queryClient}>
      <Dashboard />
    </QueryClientProvider>
  )
}