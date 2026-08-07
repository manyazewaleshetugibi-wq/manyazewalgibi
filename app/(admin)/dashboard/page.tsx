// app/dashboard/page.tsx (UPDATED - WITH PROFIT PAGE INTEGRATION)
"use client"

import type React from "react"
import { useState, useMemo, useCallback, useEffect } from "react"
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query"
import axios from "axios"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer, AreaChart, Area, Tooltip as RechartsTooltip, PieChart, Pie, Cell } from "recharts"
import { motion, AnimatePresence } from "framer-motion"
import { useTheme } from "next-themes"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { ArrowDownIcon, DollarSign, ShoppingCart, Package, TrendingUp, Calendar, Users, Clock, ArrowUp, ArrowDown, Loader2, Building2, UserCog, TrendingDown, PieChart as PieChartIcon, Percent, LayoutGrid, Home, Briefcase, Coffee, Utensils, CreditCard, Eye, ThumbsUp, MessageCircle, BarChart3, Menu, X, ChevronRight } from "lucide-react"
import { ChartContainer } from "@/components/ui/chart"
import { DateRangePicker } from "./date-range-picker"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { isSameDay, parseISO, format, eachDayOfInterval, startOfDay, endOfDay, subDays } from "date-fns"
import { useCachedProfitCalculations } from "@/hooks/useProfitCalculations"
import { CommonExpenses } from "@/components/expanse/CommonExpenses"

// API client setup
const api = axios.create({
  baseURL: "/api",
})

// API functions
const fetchExpenses = () => api.get("/expense").then((res) => res.data.data)
const fetchCommonExpenses = () => api.get("/common-expense").then((res) => res.data.data)
const fetchOrderReport = () => api.get("/order/report").then((res) => res.data)
const fetchStock = () => api.get("/stock").then((res) => res.data.data)

// ✅ FIXED: Properly handle the API response for stock purchases
const fetchStockPurchases = async () => {
  try {
    const response = await api.get("/stock-purchase")
    return response.data.data || []
  } catch (error) {
    console.error("Error fetching stock purchases:", error)
    return []
  }
}

const fetchDailyCash = () => api.get("/daily-cash").then((res) => res.data.data)

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
  totalAmount?: number
}

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

// Utility functions
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount) + " ETB"
}

const calculatePercentageChange = (current: number, previous: number) => {
  if (previous === 0) return current > 0 ? 100 : 0
  return ((current - previous) / previous) * 100
}

// ============================================
// FIXED: CORRECT DAILY COMMON AMOUNT CALCULATION (Same as CommonExpenses component)
// ============================================
const getDailyCommonAmount = (expense: CommonExpense, date: Date): number => {
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

// Helper function to normalize date for comparison
const normalizeDate = (dateStr: string): string => {
  try {
    return format(new Date(dateStr), 'yyyy-MM-dd')
  } catch {
    return dateStr.split('T')[0]
  }
}

// Calculate total cost for a stock
const calculateCurrentStockValue = (stock: StockItem, purchases: StockPurchase[]): number => {
  const stockPurchases = purchases
    .filter((purchase) => purchase.stockId === stock._id)
    .sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime())
  
  const lastPurchasePrice = stockPurchases.length > 0 ? stockPurchases[0].unitPrice : 0
  return stock.currentStock * lastPurchasePrice
}

// Calculate transfer amounts for today
const calculateTodayTransfers = (
  cashEntries: DailyCashEntry[],
  expenses: Expense[],
  stockPurchases: StockPurchase[],
  todayStr: string
): { cafetTransfer: number; personnelTransfer: number; zReport: number; totalExpense: number; totalCash: number } => {
  const todayCashEntry = cashEntries.find(e => e.date.startsWith(todayStr))
  const zReport = todayCashEntry?.zedAmount || 0
  const totalCash = todayCashEntry?.cashAmount || 0
  
  let totalExpense = 0
  
  if (expenses) {
    totalExpense += expenses
      .filter((expense) => {
        const expenseDate = normalizeDate(expense.date)
        return expenseDate === todayStr
      })
      .reduce((sum, expense) => sum + expense.amount, 0)
  }
  
  if (stockPurchases) {
    totalExpense += stockPurchases
      .filter((purchase) => purchase.purchaseDate?.startsWith(todayStr))
      .reduce((sum, purchase) => sum + (purchase.quantity * purchase.unitPrice), 0)
  }
  
  const cafetTransfer = zReport / 2
  const personnelTransfer = (zReport / 2) + totalExpense - totalCash
  
  return {
    cafetTransfer,
    personnelTransfer,
    zReport,
    totalExpense,
    totalCash
  }
}

// ============================================
// MOBILE COMPONENTS (YouTube Studio Style)
// ============================================

// Mobile Top Header
const MobileHeader = ({ 
  onNavigate
}: { 
  onNavigate: (path: string) => void
}) => {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuItems = [
    { icon: Home, label: "Dashboard", path: "/" },
    { icon: DollarSign, label: "Sales", path: "/sales" },
    { icon: ArrowDownIcon, label: "Expenses", path: "/expenses" },
    { icon: Package, label: "Stock", path: "/stock" },
    { icon: ShoppingCart, label: "Orders", path: "/orders" },
    { icon: TrendingUp, label: "Profit", path: "/profit" },
    { icon: Building2, label: "Transfers", path: "/expe" },
    { icon: BarChart3, label: "Analytics", path: "/analytics" },
  ]

  return (
    <>
      <div className="sticky top-0 z-40 bg-white/95 dark:bg-gray-950/95 backdrop-blur-md border-b border-purple-100/30 dark:border-purple-900/30">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center text-white font-bold text-sm shadow-md flex-shrink-0">
              RD
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-purple-900 dark:text-purple-100 leading-tight truncate">
                Restaurant Dashboard
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Admin Panel
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

// Mobile Stat Card
const MobileStatCard = ({ 
  label, 
  value, 
  change, 
  icon: Icon, 
  color = "purple",
  onClick,
  subtitle,
  isLoading
}: { 
  label: string
  value: string
  change?: number
  icon: any
  color?: "purple" | "green" | "red" | "blue" | "orange"
  onClick?: () => void
  subtitle?: string
  isLoading?: boolean
}) => {
  const colorMap = {
    purple: "bg-purple-50 dark:bg-purple-950/30 border-purple-200/50 dark:border-purple-800/30",
    green: "bg-green-50 dark:bg-green-950/30 border-green-200/50 dark:border-green-800/30",
    red: "bg-red-50 dark:bg-red-950/30 border-red-200/50 dark:border-red-800/30",
    blue: "bg-blue-50 dark:bg-blue-950/30 border-blue-200/50 dark:border-blue-800/30",
    orange: "bg-orange-50 dark:bg-orange-950/30 border-orange-200/50 dark:border-orange-800/30",
  }
  
  const iconColorMap = {
    purple: "text-purple-600",
    green: "text-green-600",
    red: "text-red-600",
    blue: "text-blue-600",
    orange: "text-orange-600",
  }

  if (isLoading) {
    return (
      <div className={`rounded-xl border ${colorMap[color]} p-4`}>
        <Skeleton className="h-4 w-20 mb-2" />
        <Skeleton className="h-7 w-24" />
        <Skeleton className="h-3 w-16 mt-1" />
      </div>
    )
  }

  return (
    <motion.div
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className="cursor-pointer"
    >
      <div className={`rounded-xl border ${colorMap[color]} p-4 transition-all hover:shadow-md active:bg-purple-100/20`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg bg-white/50 dark:bg-gray-800/50`}>
              <Icon className={`h-4 w-4 ${iconColorMap[color]}`} />
            </div>
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{label}</span>
          </div>
          {change !== undefined && (
            <Badge variant="outline" className={`text-[10px] ${change >= 0 ? 'text-green-600 border-green-200 dark:border-green-800' : 'text-red-600 border-red-200 dark:border-red-800'}`}>
              {change >= 0 ? '↑' : '↓'} {Math.abs(change).toFixed(1)}%
            </Badge>
          )}
        </div>
        <p className="text-lg font-bold text-purple-900 dark:text-purple-100 mt-1">{value}</p>
        {subtitle && <p className="text-[10px] text-gray-400 dark:text-gray-500">{subtitle}</p>}
      </div>
    </motion.div>
  )
}

// Mobile Transfer Card
const MobileTransferCard = ({
  cafetTransfer,
  personnelTransfer,
  zReport,
  totalExpense,
  totalCash,
  isLoading,
  onClick
}: {
  cafetTransfer: number
  personnelTransfer: number
  zReport: number
  totalExpense: number
  totalCash: number
  isLoading: boolean
  onClick?: () => void
}) => {
  if (isLoading) {
    return (
      <Card className="border-purple-200/50 dark:border-purple-800/30">
        <CardContent className="p-4">
          <div className="space-y-3">
            <Skeleton className="h-4 w-24" />
            <div className="grid grid-cols-2 gap-3">
              <Skeleton className="h-16 rounded-xl" />
              <Skeleton className="h-16 rounded-xl" />
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="cursor-pointer"
    >
      <Card className="border-purple-200/50 dark:border-purple-800/30 bg-gradient-to-br from-purple-50/80 to-purple-100/30 dark:from-purple-950/30 dark:to-purple-900/10 hover:shadow-lg transition-all">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <LayoutGrid className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-bold text-purple-900 dark:text-purple-300">Transfers</span>
            </div>
            <Badge variant="secondary" className="bg-purple-200 text-purple-800 dark:bg-purple-800/50 dark:text-purple-300 text-[10px] border-0">
              Today
            </Badge>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white/70 dark:bg-gray-800/50 rounded-xl p-3 text-center border border-purple-200/50 dark:border-purple-800/30">
              <div className="flex items-center justify-center gap-1 mb-0.5">
                <Building2 className="h-3.5 w-3.5 text-purple-600" />
                <p className="text-[10px] font-medium text-purple-800 dark:text-purple-300">Cafet</p>
              </div>
              <p className="text-base font-bold text-purple-700 dark:text-purple-400">{formatCurrency(cafetTransfer)}</p>
            </div>
            <div className="bg-white/70 dark:bg-gray-800/50 rounded-xl p-3 text-center border border-purple-200/50 dark:border-purple-800/30">
              <div className="flex items-center justify-center gap-1 mb-0.5">
                <UserCog className="h-3.5 w-3.5 text-purple-600" />
                <p className="text-[10px] font-medium text-purple-800 dark:text-purple-300">Personnel</p>
              </div>
              <p className="text-base font-bold text-purple-700 dark:text-purple-400">{formatCurrency(personnelTransfer)}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-purple-200/30 dark:border-purple-700/30">
            <div className="text-center">
              <p className="text-[8px] text-gray-500 dark:text-gray-400">Expense</p>
              <p className="text-xs font-bold text-red-600">{formatCurrency(totalExpense)}</p>
            </div>
            <div className="text-center">
              <p className="text-[8px] text-gray-500 dark:text-gray-400">Cash</p>
              <p className="text-xs font-bold text-emerald-600">{formatCurrency(totalCash)}</p>
            </div>
            <div className="text-center">
              <p className="text-[8px] text-gray-500 dark:text-gray-400">Z Report</p>
              <p className="text-xs font-bold text-purple-600">{formatCurrency(zReport)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// Mobile Profit Card
const MobileProfitCard = ({
  profit,
  profitMargin,
  isLoading,
  onClick
}: {
  profit: number
  profitMargin: number
  isLoading: boolean
  onClick?: () => void
}) => {
  if (isLoading) {
    return (
      <Card className="border-purple-200/50 dark:border-purple-800/30">
        <CardContent className="p-4">
          <div className="space-y-3">
            <Skeleton className="h-4 w-24" />
            <div className="grid grid-cols-2 gap-2">
              <Skeleton className="h-16 rounded-xl" />
              <Skeleton className="h-16 rounded-xl" />
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const isProfitable = profit >= 0

  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="cursor-pointer"
    >
      <Card className={`border-purple-200/50 dark:border-purple-800/30 bg-gradient-to-br ${isProfitable ? 'from-emerald-50/80 to-emerald-100/30 dark:from-emerald-950/30 dark:to-emerald-900/10' : 'from-red-50/80 to-red-100/30 dark:from-red-950/30 dark:to-red-900/10'} hover:shadow-lg transition-all`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className={`h-4 w-4 ${isProfitable ? 'text-emerald-600' : 'text-red-600'}`} />
              <span className="text-sm font-bold text-purple-900 dark:text-purple-300">Profit</span>
            </div>
            <Badge className={`text-[10px] border-0 ${isProfitable ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
              {isProfitable ? 'Profitable' : 'Loss'}
            </Badge>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <div className={`bg-white/70 dark:bg-gray-800/50 rounded-xl p-2.5 text-center border ${isProfitable ? 'border-emerald-200/50 dark:border-emerald-800/30' : 'border-red-200/50 dark:border-red-800/30'}`}>
              <p className="text-[8px] text-gray-500 dark:text-gray-400">Profit</p>
              <p className={`text-sm font-bold ${isProfitable ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                {formatCurrency(profit)}
              </p>
            </div>
            <div className={`bg-white/70 dark:bg-gray-800/50 rounded-xl p-2.5 text-center border ${profitMargin >= 20 ? 'border-emerald-200/50 dark:border-emerald-800/30' : profitMargin >= 0 ? 'border-yellow-200/50 dark:border-yellow-800/30' : 'border-red-200/50 dark:border-red-800/30'}`}>
              <p className="text-[8px] text-gray-500 dark:text-gray-400">Margin</p>
              <p className={`text-sm font-bold ${profitMargin >= 20 ? 'text-emerald-600 dark:text-emerald-400' : profitMargin >= 0 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'}`}>
                {profitMargin.toFixed(1)}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// ============================================
// DESKTOP COMPONENTS
// ============================================

// Skeleton Stat Card
const SkeletonStatCard = () => (
  <Card className="h-full border dark:border-gray-800">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-8 w-8 rounded-full" />
    </CardHeader>
    <CardContent>
      <Skeleton className="h-8 w-28 mb-2" />
      <Skeleton className="h-3 w-20" />
    </CardContent>
  </Card>
)

// Desktop Stat Card
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
    primary: "from-purple-100/50 to-purple-50/30 border-purple-200 dark:from-purple-900/20 dark:to-purple-900/10 dark:border-purple-800/30",
    success: "from-green-100/50 to-green-50/30 border-green-200 dark:from-green-900/20 dark:to-green-900/10 dark:border-green-800/30",
    warning: "from-amber-100/50 to-amber-50/30 border-amber-200 dark:from-amber-900/20 dark:to-amber-900/10 dark:border-amber-800/30",
    danger: "from-red-100/50 to-red-50/30 border-red-200 dark:from-red-900/20 dark:to-red-900/10 dark:border-red-800/30",
    info: "from-blue-100/50 to-blue-50/30 border-blue-200 dark:from-blue-900/20 dark:to-blue-900/10 dark:border-blue-800/30"
  }

  const iconStyles = {
    primary: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
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

  if (isLoading) {
    return <SkeletonStatCard />
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
          <div className="absolute top-0 right-0 h-24 w-24 bg-gradient-to-bl from-purple-500/[0.03] to-transparent dark:from-white/[0.01] rounded-full -mr-12 -mt-12 opacity-70"></div>
          <CardTitle className="text-sm font-medium text-purple-900 dark:text-purple-300">{title}</CardTitle>
          <div className={`p-2 rounded-full ${iconStyles[color]}`}>
            {icon}
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold tracking-tight transition-all duration-200 group-hover:scale-105 origin-left text-purple-900 dark:text-purple-100">{value}</div>
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
        </CardContent>
      </Card>
    </motion.div>
  )
}

// Desktop Transfer Card
const TransferCard = ({
  cafetTransfer,
  personnelTransfer,
  zReport,
  totalExpense,
  totalCash,
  isLoading,
}: {
  cafetTransfer: number
  personnelTransfer: number
  zReport: number
  totalExpense: number
  totalCash: number
  isLoading: boolean
}) => {
  const router = useRouter()

  if (isLoading) {
    return (
      <Card className="h-full border dark:border-gray-800">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-20 rounded-xl" />
            <Skeleton className="h-20 rounded-xl" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <motion.div 
      whileHover={{ y: -5, boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)" }}
      transition={{ duration: 0.2 }}
      onClick={() => router.push('/expe')}
      className="cursor-pointer"
    >
      <Card className="bg-gradient-to-br from-purple-50/80 via-purple-100/50 to-purple-200/30 border-purple-200 dark:from-purple-950/30 dark:via-purple-900/20 dark:to-purple-800/10 dark:border-purple-800/30 hover:shadow-lg transition-all duration-300 h-full overflow-hidden group">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base font-bold flex items-center gap-2 text-purple-900 dark:text-purple-300">
            <LayoutGrid className="h-5 w-5 text-purple-700" />
            Transfers
          </CardTitle>
          <Badge variant="secondary" className="bg-purple-200 text-purple-800 dark:bg-purple-800/50 dark:text-purple-300 border-0 text-xs">
            Today
          </Badge>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/70 dark:bg-gray-800/50 rounded-xl p-4 border border-purple-200/50 dark:border-purple-800/30 shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <Building2 className="h-4 w-4 text-purple-700" />
                <p className="text-xs font-semibold text-purple-800 dark:text-purple-300">Cafet</p>
              </div>
              <p className="text-xl font-bold text-purple-700 dark:text-purple-400">
                {formatCurrency(cafetTransfer)}
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">Z Report / 2</p>
            </div>
            
            <div className="bg-white/70 dark:bg-gray-800/50 rounded-xl p-4 border border-purple-200/50 dark:border-purple-800/30 shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <UserCog className="h-4 w-4 text-purple-700" />
                <p className="text-xs font-semibold text-purple-800 dark:text-purple-300">Personnel</p>
              </div>
              <p className="text-xl font-bold text-purple-700 dark:text-purple-400">
                {formatCurrency(personnelTransfer)}
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">(Z/2) + Expense - Cash</p>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-purple-200/30 dark:border-purple-700/30">
            <div className="text-center">
              <p className="text-[8px] text-muted-foreground">Z Report</p>
              <p className="text-sm font-bold text-purple-600 dark:text-purple-400">{formatCurrency(zReport)}</p>
            </div>
            <div className="text-center">
              <p className="text-[8px] text-muted-foreground">Expense</p>
              <p className="text-sm font-bold text-red-500">{formatCurrency(totalExpense)}</p>
            </div>
            <div className="text-center">
              <p className="text-[8px] text-muted-foreground">Cash</p>
              <p className="text-sm font-bold text-emerald-600">{formatCurrency(totalCash)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// Desktop Profit Card - UPDATED to use profit page data
const DailyProfitCard = ({
  profit,
  profitMargin,
  isLoading,
}: {
  profit: number
  profitMargin: number
  isLoading: boolean
}) => {
  const router = useRouter()

  if (isLoading) {
    return (
      <Card className="h-full border dark:border-gray-800">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-14 rounded-xl" />
            <Skeleton className="h-14 rounded-xl" />
          </div>
        </CardContent>
      </Card>
    )
  }

  const isProfitable = profit >= 0

  return (
    <motion.div 
      whileHover={{ y: -5, boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)" }}
      transition={{ duration: 0.2 }}
      onClick={() => router.push('/profit')}
      className="cursor-pointer"
    >
      <Card className={`bg-gradient-to-br ${isProfitable ? 'from-purple-50/80 via-emerald-100/50 to-emerald-200/30 border-purple-200 dark:from-purple-950/30 dark:via-emerald-900/20 dark:to-emerald-800/10 dark:border-purple-800/30' : 'from-purple-50/80 via-red-100/50 to-red-200/30 border-purple-200 dark:from-purple-950/30 dark:via-red-900/20 dark:to-red-800/10 dark:border-purple-800/30'} hover:shadow-lg transition-all duration-300 h-full overflow-hidden group`}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base font-bold flex items-center gap-2 text-purple-900 dark:text-purple-300">
            <TrendingUp className={`h-5 w-5 ${isProfitable ? 'text-emerald-600' : 'text-red-600'}`} />
            Daily Profit
          </CardTitle>
          <Badge variant="secondary" className={`${isProfitable ? 'bg-emerald-200 text-emerald-800 dark:bg-emerald-800/50 dark:text-emerald-300' : 'bg-red-200 text-red-800 dark:bg-red-800/50 dark:text-red-300'} border-0 text-xs`}>
            {isProfitable ? '💰 Profitable' : '📉 Loss'}
          </Badge>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <div className={`bg-white/70 dark:bg-gray-800/50 rounded-xl p-3 text-center border ${isProfitable ? 'border-emerald-200/50 dark:border-emerald-800/30' : 'border-red-200/50 dark:border-red-800/30'} shadow-sm`}>
              <p className="text-[10px] text-muted-foreground font-medium">Net Profit</p>
              <p className={`text-lg font-bold ${isProfitable ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                {formatCurrency(profit)}
              </p>
              <p className="text-[8px] text-muted-foreground">After operational costs</p>
            </div>
            
            <div className={`bg-white/70 dark:bg-gray-800/50 rounded-xl p-3 text-center border ${profitMargin >= 20 ? 'border-emerald-200/50 dark:border-emerald-800/30' : profitMargin >= 0 ? 'border-yellow-200/50 dark:border-yellow-800/30' : 'border-red-200/50 dark:border-red-800/30'} shadow-sm`}>
              <p className="text-[10px] text-muted-foreground font-medium">Margin</p>
              <p className={`text-lg font-bold ${profitMargin >= 20 ? 'text-emerald-600 dark:text-emerald-400' : profitMargin >= 0 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'}`}>
                {profitMargin.toFixed(1)}%
              </p>
              <p className="text-[8px] text-muted-foreground">Net profit margin</p>
            </div>
          </div>
          
          <div className="mt-3 pt-3 border-t border-purple-200/30 dark:border-purple-700/30">
            <p className="text-[9px] text-center text-muted-foreground">
              Profit = Revenue - Stock Cost - Casual - Common Expenses
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// ============================================
// MAIN DASHBOARD COMPONENT
// ============================================

function Dashboard() {
  const router = useRouter()
  const { theme } = useTheme()
  const [isClient, setIsClient] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({ 
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 
    to: new Date() 
  })

  useEffect(() => {
    setIsClient(true)
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // ============================================
  // USE PROFIT PAGE CALCULATIONS
  // ============================================
  const {
    summary: profitSummary,
    items: profitItems,
    isLoading: isLoadingProfit,
    refresh: refreshProfit
  } = useCachedProfitCalculations(
    new Date(),
    {
      sortBy: 'margin',
      sortOrder: 'desc'
    }
  )

  const queryOptions = {
    staleTime: 30000,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
  }

  const { data: expenses, isLoading: isLoadingExpenses } = useQuery<Expense[]>({ 
    queryKey: ["expenses"], 
    queryFn: fetchExpenses,
    ...queryOptions
  })
  
  const { data: commonExpenses, isLoading: isLoadingCommon } = useQuery<CommonExpense[]>({
    queryKey: ["commonExpenses"],
    queryFn: fetchCommonExpenses,
    ...queryOptions
  })
  
  const { data: orderReport, isLoading: isLoadingOrderReport } = useQuery<OrderReport>({
    queryKey: ["orderReport"],
    queryFn: fetchOrderReport,
    ...queryOptions
  })
  
  const { data: stock, isLoading: isLoadingStock } = useQuery<StockItem[]>({ 
    queryKey: ["stock"], 
    queryFn: fetchStock,
    ...queryOptions
  })
  
  const { data: stockPurchases, isLoading: isLoadingStockPurchases } = useQuery<StockPurchase[]>({
    queryKey: ["stockPurchases"],
    queryFn: fetchStockPurchases,
    ...queryOptions
  })

  const { data: dailyCashEntries, isLoading: isLoadingDailyCash } = useQuery<DailyCashEntry[]>({
    queryKey: ["dailyCash"],
    queryFn: fetchDailyCash,
    ...queryOptions
  })

  // Combine loading states
  const isLoading = isLoadingExpenses || isLoadingCommon || isLoadingOrderReport || 
                    isLoadingStock || isLoadingStockPurchases || isLoadingDailyCash || 
                    isLoadingProfit

  const ETH_OFFSET_MS = 3 * 60 * 60 * 1000
  const todayLocalDate = new Date(Date.now() + ETH_OFFSET_MS)
  const todayStr = todayLocalDate.toISOString().split("T")[0]
  const todayDate = new Date()
  
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayLocalDate = new Date(yesterday.getTime() + ETH_OFFSET_MS)
  const yesterdayStr = yesterdayLocalDate.toISOString().split("T")[0]
  const yesterdayDate = yesterday

  // ============================================
  // DAILY EXPENSE CALCULATION (Matches CommonExpenses component)
  // ============================================

  // Get TODAY's daily common expenses
  const todaysDailyCommon = useMemo(() => {
    if (!commonExpenses) return 0
    let total = 0
    commonExpenses.forEach((expense: CommonExpense) => {
      total += getDailyCommonAmount(expense, todayDate)
    })
    return total
  }, [commonExpenses, todayDate])

  // Get TODAY's casual expenses
  const todaysCasual = useMemo(() => {
    if (!expenses) return 0
    return expenses
      .filter((expense) => normalizeDate(expense.date) === todayStr)
      .reduce((sum, expense) => sum + expense.amount, 0)
  }, [expenses, todayStr])

  // Get TODAY's stock purchases
  const todaysStock = useMemo(() => {
    if (!stockPurchases) return 0
    return stockPurchases
      .filter((purchase) => purchase.purchaseDate?.startsWith(todayStr))
      .reduce((sum, purchase) => sum + (purchase.quantity * purchase.unitPrice), 0)
  }, [stockPurchases, todayStr])

  // TOTAL DAILY EXPENSES
  const todaysExpenses = useMemo(() => {
    return todaysDailyCommon + todaysCasual + todaysStock
  }, [todaysDailyCommon, todaysCasual, todaysStock])

  // Get YESTERDAY's daily common expenses
  const yesterdaysDailyCommon = useMemo(() => {
    if (!commonExpenses) return 0
    let total = 0
    commonExpenses.forEach((expense: CommonExpense) => {
      total += getDailyCommonAmount(expense, yesterdayDate)
    })
    return total
  }, [commonExpenses, yesterdayDate])

  // Get YESTERDAY's casual expenses
  const yesterdaysCasual = useMemo(() => {
    if (!expenses) return 0
    return expenses
      .filter((expense) => normalizeDate(expense.date) === yesterdayStr)
      .reduce((sum, expense) => sum + expense.amount, 0)
  }, [expenses, yesterdayStr])

  // Get YESTERDAY's stock purchases
  const yesterdaysStock = useMemo(() => {
    if (!stockPurchases) return 0
    return stockPurchases
      .filter((purchase) => purchase.purchaseDate?.startsWith(yesterdayStr))
      .reduce((sum, purchase) => sum + (purchase.quantity * purchase.unitPrice), 0)
  }, [stockPurchases, yesterdayStr])

  // TOTAL YESTERDAY'S EXPENSES
  const yesterdaysExpenses = useMemo(() => {
    return yesterdaysDailyCommon + yesterdaysCasual + yesterdaysStock
  }, [yesterdaysDailyCommon, yesterdaysCasual, yesterdaysStock])

  const todaysRevenue = useMemo(() => {
    if (!orderReport) return 0
    return orderReport.dailySales[todayStr] || 0
  }, [orderReport, todayStr])

  const yesterdaysRevenue = useMemo(() => {
    if (!orderReport) return 0
    return orderReport.dailySales[yesterdayStr] || 0
  }, [orderReport, yesterdayStr])

  // ============================================
  // PROFIT CALCULATION FROM PROFIT PAGE
  // ============================================
  
  // Get net profit from profit page data minus operational expenses
  const todaysNetProfit = useMemo(() => {
    if (!profitSummary) return 0
    // profitSummary.totalProfit is gross profit from sales
    // Subtract operational expenses (common + casual) 
    const operationalExpenses = todaysDailyCommon + todaysCasual
    return profitSummary.totalProfit - operationalExpenses
  }, [profitSummary, todaysDailyCommon, todaysCasual])

  // Profit margin calculation
  const profitMargin = useMemo(() => {
    if (!profitSummary || profitSummary.totalRevenue === 0) return 0
    return (todaysNetProfit / profitSummary.totalRevenue) * 100
  }, [profitSummary, todaysNetProfit])

  // Get today's orders from profit page
  const todaysOrders = useMemo(() => {
    if (!profitSummary) return 0
    return profitSummary.totalOrders || 0
  }, [profitSummary])

  const yesterdaysOrders = useMemo(() => {
    // For yesterday's orders, we need to fetch separately or calculate
    // For now, return a default value
    return 0
  }, [])

  const currentStockValue = useMemo(() => {
    if (!stock || !stockPurchases) return 0
    
    let totalValue = 0
    stock.forEach((item) => {
      totalValue += calculateCurrentStockValue(item, stockPurchases)
    })
    
    return totalValue
  }, [stock, stockPurchases])

  const yesterdayStockValue = useMemo(() => {
    if (!stock || !stockPurchases) return currentStockValue * 0.95
    
    let totalValue = 0
    stock.forEach((item) => {
      const previousPurchases = stockPurchases
        .filter(p => p.stockId === item._id && !p.purchaseDate?.startsWith(todayStr))
        .sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime())
      
      const lastPurchasePrice = previousPurchases.length > 0 ? previousPurchases[0].unitPrice : 0
      
      const todayPurchasesQuantity = stockPurchases
        .filter(p => p.stockId === item._id && p.purchaseDate?.startsWith(todayStr))
        .reduce((sum, p) => sum + p.quantity, 0)
      
      const yesterdayStock = item.currentStock - todayPurchasesQuantity
      totalValue += yesterdayStock * lastPurchasePrice
    })
    
    return totalValue
  }, [stock, stockPurchases, currentStockValue, todayStr])

  const todayTransfers = useMemo(() => {
    if (!dailyCashEntries) return { cafetTransfer: 0, personnelTransfer: 0, zReport: 0, totalExpense: 0, totalCash: 0 }
    
    return calculateTodayTransfers(
      dailyCashEntries,
      expenses || [],
      stockPurchases || [],
      todayStr
    )
  }, [dailyCashEntries, expenses, stockPurchases, todayStr])

  const revenueChange = calculatePercentageChange(todaysRevenue, yesterdaysRevenue)
  const expensesChange = calculatePercentageChange(todaysExpenses, yesterdaysExpenses)
  const ordersChange = calculatePercentageChange(todaysOrders, yesterdaysOrders)
  const stockChange = calculatePercentageChange(currentStockValue, yesterdayStockValue)

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

  type StockStatus = 'critical' | 'low' | 'good';
  
  const getStockStatus = (item: StockItem): StockStatus => {
    if (item.minimumStock === 0) return 'good'
    const ratio = item.currentStock / item.minimumStock
    if (ratio <= 0.5) return 'critical'
    if (ratio <= 1) return 'low'
    return 'good'
  }

  const criticalStock = useMemo(() => {
    if (!stock) return []
    return stock.filter(item => getStockStatus(item) === 'critical')
  }, [stock])

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

  const recentCasualExpenses = useMemo(() => {
    if (!expenses) return []
    return [...expenses]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5)
  }, [expenses])

  if (!isClient) {
    return (
      <div className="container mx-auto p-4 min-h-screen">
        <div className="space-y-8">
          <Skeleton className="h-10 w-64 mx-auto" />
          <Skeleton className="h-8 w-48" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map(i => <SkeletonStatCard key={i} />)}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {[1, 2].map(i => <Skeleton key={i} className="h-40 rounded-xl" />)}
          </div>
          <Skeleton className="h-[400px] w-full rounded-xl" />
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-[300px] rounded-xl" />
            <Skeleton className="h-[300px] rounded-xl" />
          </div>
        </div>
      </div>
    )
  }

  // ============================================
  // MOBILE VIEW
  // ============================================
  if (isMobile) {
    return (
      <div className="bg-gradient-to-b from-purple-50/30 via-white to-purple-50/20 dark:from-gray-950 dark:via-gray-900 dark:to-purple-950/20 min-h-screen">
        <MobileHeader onNavigate={(path) => router.push(path)} />

        <div className="p-4 space-y-4 pb-24">
          {/* Stats Grid - 2x2 */}
          <div className="grid grid-cols-2 gap-3">
            <MobileStatCard
              label="Revenue"
              value={formatCurrency(todaysRevenue)}
              change={revenueChange}
              icon={DollarSign}
              color="green"
              subtitle="Today"
              isLoading={isLoading}
              onClick={() => router.push('/sales')}
            />
            <MobileStatCard
              label="Expenses"
              value={formatCurrency(todaysExpenses)}
              change={expensesChange}
              icon={ArrowDownIcon}
              color="red"
              subtitle={`Common: ${formatCurrency(todaysDailyCommon)}`}
              isLoading={isLoading}
              onClick={() => router.push('/expenses')}
            />
            <MobileStatCard
              label="Orders"
              value={todaysOrders.toString()}
              change={ordersChange}
              icon={ShoppingCart}
              color="orange"
              subtitle={`${todaysOrders} today`}
              isLoading={isLoading}
              onClick={() => router.push('/orders')}
            />
            <MobileStatCard
              label="Stock Value"
              value={formatCurrency(currentStockValue)}
              change={stockChange}
              icon={Package}
              color="blue"
              subtitle="Current"
              isLoading={isLoading}
              onClick={() => router.push('/stock')}
            />
          </div>

          {/* Transfer + Profit Cards - UPDATED with profit page data */}
          <div className="space-y-3">
            <MobileTransferCard
              cafetTransfer={todayTransfers.cafetTransfer}
              personnelTransfer={todayTransfers.personnelTransfer}
              zReport={todayTransfers.zReport}
              totalExpense={todayTransfers.totalExpense}
              totalCash={todayTransfers.totalCash}
              isLoading={isLoading}
              onClick={() => router.push('/expe')}
            />
            
            <MobileProfitCard
              profit={todaysNetProfit}
              profitMargin={profitMargin}
              isLoading={isLoadingProfit}
              onClick={() => router.push('/profit')}
            />
          </div>

          {/* Sales Chart - Compact */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-sm font-bold text-purple-900 dark:text-purple-300 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-purple-600" />
                Sales Overview
              </h2>
              <DateRangePicker
                from={dateRange.from}
                to={dateRange.to}
                onSelect={handleDateRangeSelect}
              />
            </div>
            
            <Card className="border-purple-200/50 dark:border-purple-800/30 shadow-lg">
              <CardContent className="p-3">
                <div className="h-[200px]">
                  {filteredSalesData.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full">
                      <Calendar className="h-10 w-10 text-gray-300 dark:text-gray-600 mb-2" />
                      <p className="text-xs text-gray-500 dark:text-gray-400 text-center">No sales data available</p>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="mt-2 border-purple-300 text-purple-700 hover:bg-purple-50 text-xs" 
                        onClick={handleResetDateRange}
                      >
                        Reset
                      </Button>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={filteredSalesData}>
                        <defs>
                          <linearGradient id="colorSalesMobile" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                        <XAxis 
                          dataKey="date" 
                          tickMargin={6}
                          tick={{ fontSize: 10 }}
                          tickFormatter={(value) => {
                            const date = new Date(value);
                            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                          }}
                        />
                        <YAxis 
                          tick={{ fontSize: 10 }}
                          tickFormatter={(value) => {
                            if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
                            return value;
                          }}
                        />
                        <RechartsTooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              return (
                                <div className="bg-white dark:bg-gray-800 p-2 border border-purple-200 dark:border-purple-800 shadow-lg rounded-lg text-xs">
                                  <p className="text-gray-500">{new Date(payload[0].payload.date).toLocaleDateString()}</p>
                                  <p className="text-sm font-bold text-purple-900">{formatCurrency(payload[0].value as number)}</p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="sales"
                          stroke="#7c3aed"
                          strokeWidth={2}
                          fillOpacity={1}
                          fill="url(#colorSalesMobile)"
                          activeDot={{ r: 4 }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions - Bottom Navigation */}
          <div className="fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-gray-950/80 backdrop-blur-sm border-t border-purple-200/30 dark:border-purple-800/30 z-30">
            <div className="grid grid-cols-4 gap-1 p-2">
              {[
                { icon: Home, label: "Home", path: "/" },
                { icon: DollarSign, label: "Sales", path: "/sales" },
                { icon: Package, label: "Stock", path: "/stock" },
                { icon: TrendingUp, label: "Profit", path: "/profit" },
              ].map((item) => (
                <button
                  key={item.path}
                  onClick={() => router.push(item.path)}
                  className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-purple-100/50 dark:hover:bg-purple-900/20 transition-all active:scale-95"
                >
                  <item.icon className="h-5 w-5 text-purple-600" />
                  <span className="text-[10px] font-medium text-purple-900 dark:text-purple-300">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ============================================
  // DESKTOP VIEW - WITH COMMONEXPENSES COMPONENT
  // ============================================
  return (
    <div className="container mx-auto p-4 min-h-screen bg-gradient-to-b from-purple-50/30 via-white to-purple-50/20 dark:from-gray-950 dark:via-gray-900 dark:to-purple-950/20">
      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div 
            key="loading"
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="space-y-8"
          >
            <div className="flex justify-between items-center">
              <Skeleton className="h-10 w-64" />
              <Skeleton className="h-8 w-32" />
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map(i => <SkeletonStatCard key={i} />)}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {[1, 2].map(i => <Skeleton key={i} className="h-44 rounded-xl" />)}
            </div>

            <Skeleton className="h-[400px] w-full rounded-xl" />

            <div className="grid gap-4 md:grid-cols-2">
              <Skeleton className="h-[300px] rounded-xl" />
              <Skeleton className="h-[300px] rounded-xl" />
            </div>

            <Skeleton className="h-[400px] w-full rounded-xl" />
            <Skeleton className="h-[120px] w-full rounded-xl" />
          </motion.div>
        ) : (
          <motion.div 
            key="content"
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            {/* Desktop Header */}
            <motion.div 
              className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <div>
                <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-purple-900 to-purple-600 bg-clip-text text-transparent tracking-tight">
                  Restaurant Dashboard
                </h1>
                <p className="text-sm text-muted-foreground mt-1">Overview of your restaurant's performance</p>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-900/50 rounded-xl p-3 shadow-sm border border-purple-200/50 dark:border-purple-800/30">
                <Calendar className="h-4 w-4 text-purple-600" />
                <span className="font-medium">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
              </div>
            </motion.div>

            {/* 4 Main Metric Cards - UPDATED with profit page data */}
            <motion.div 
              className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.1 }}
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
                change={expensesChange}
                trend={expensesChange <= 0 ? "down" : "up"}
                isLoading={isLoading}
                color="danger"
                description={`Common: ${formatCurrency(todaysDailyCommon)} • Casual: ${formatCurrency(todaysCasual)} • Stock: ${formatCurrency(todaysStock)}`}
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

            {/* Transfer + Profit Cards - UPDATED with profit page data */}
            <motion.div
              className="grid gap-4 md:grid-cols-2"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.15 }}
            >
              <TransferCard
                cafetTransfer={todayTransfers.cafetTransfer}
                personnelTransfer={todayTransfers.personnelTransfer}
                zReport={todayTransfers.zReport}
                totalExpense={todayTransfers.totalExpense}
                totalCash={todayTransfers.totalCash}
                isLoading={isLoading}
              />

              <DailyProfitCard
                profit={todaysNetProfit}
                profitMargin={profitMargin}
                isLoading={isLoadingProfit}
              />
            </motion.div>

            {/* Sales Overview Chart */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.25 }}
            >
              <Card className="border-purple-200/50 dark:border-purple-800/30 shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div>
                    <CardTitle className="text-xl font-bold text-purple-900 dark:text-purple-300">Sales Overview</CardTitle>
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
                          className="mt-4 border-purple-300 text-purple-700 hover:bg-purple-50" 
                          onClick={handleResetDateRange}
                        >
                          Reset to Last 30 Days
                        </Button>
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={filteredSalesData}>
                          <defs>
                            <linearGradient id="colorSalesDesktop" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.8} />
                              <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
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
                                  <div className="bg-white dark:bg-gray-800 p-3 border border-purple-200 dark:border-purple-800 shadow-lg rounded-xl">
                                    <p className="text-gray-500 text-xs">{new Date(payload[0].payload.date).toLocaleDateString('en-US', { 
                                      weekday: 'long', 
                                      year: 'numeric', 
                                      month: 'long', 
                                      day: 'numeric' 
                                    })}</p>
                                    <p className="text-lg font-bold text-purple-900">
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
                            stroke="#7c3aed"
                            strokeWidth={3}
                            fillOpacity={1}
                            fill="url(#colorSalesDesktop)"
                            activeDot={{ r: 6, strokeWidth: 2, stroke: "white" }}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    )}
                  </ChartContainer>
                </CardContent>
              </Card>
            </motion.div>

            {/* Two Column - Expenses with CommonExpenses Component */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.3 }}
              className="grid gap-4 md:grid-cols-2"
            >
              <Card className="border-purple-200/50 dark:border-purple-800/30 shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center text-purple-900 dark:text-purple-300">
                    <ArrowDownIcon className="h-5 w-5 mr-2 text-red-500" />
                    Recent Casual Expenses
                  </CardTitle>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => router.push('/expenses')}
                    className="text-purple-700 hover:text-purple-900 hover:bg-purple-50"
                  >
                    View All →
                  </Button>
                </CardHeader>
                <CardDescription className="px-6 pb-2">Latest one-time expenses</CardDescription>
                <CardContent>
                  {recentCasualExpenses.length > 0 ? (
                    <div className="rounded-md border border-purple-200/50 dark:border-purple-800/30 overflow-hidden">
                      <Table>
                        <TableHeader className="bg-purple-50 dark:bg-purple-950/30">
                          <TableRow>
                            <TableHead className="text-purple-900 dark:text-purple-300">Title</TableHead>
                            <TableHead className="text-purple-900 dark:text-purple-300">Category</TableHead>
                            <TableHead className="text-purple-900 dark:text-purple-300 text-right">Amount</TableHead>
                            <TableHead className="text-purple-900 dark:text-purple-300">Date</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {recentCasualExpenses.map((expense) => (
                            <TableRow key={expense._id} className="hover:bg-purple-50/50 dark:hover:bg-purple-950/20">
                              <TableCell className="font-medium">{expense.title}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800/30 text-purple-700 dark:text-purple-300">
                                  {expense.category}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-red-600 dark:text-red-400 font-medium text-right">{formatCurrency(expense.amount)}</TableCell>
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
                      <div className="bg-purple-100 dark:bg-purple-900/30 p-3 rounded-full mb-4">
                        <Clock className="h-8 w-8 text-purple-400" />
                      </div>
                      <p className="text-gray-700 dark:text-gray-300 font-medium">No recent expenses</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mt-1">
                        There are no expense records available to display
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* === COMMON EXPENSES COMPONENT INTEGRATED === */}
              <Card className="border-purple-200/50 dark:border-purple-800/30 shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center text-purple-900 dark:text-purple-300">
                    <Package className="h-5 w-5 mr-2 text-purple-500" />
                    Common Expenses
                  </CardTitle>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => router.push('/common-expense')}
                    className="text-purple-700 hover:text-purple-900 hover:bg-purple-50"
                  >
                    View All →
                  </Button>
                </CardHeader>
                <CardDescription className="px-6 pb-2">Recurring operational costs with daily breakdown</CardDescription>
                <CardContent className="p-0">
                  {/* Integrated CommonExpenses component */}
                  <CommonExpenses />
                </CardContent>
              </Card>
            </motion.div>

            {/* Stock Management */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.35 }}
            >
              <Card className="border-purple-200/50 dark:border-purple-800/30 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center text-purple-900 dark:text-purple-300">
                    <Package className="h-5 w-5 mr-2 text-purple-500" />
                    Stock Management Overview
                  </CardTitle>
                  <CardDescription>Monitor your inventory levels and stock status</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-6 lg:grid-cols-2">
                    <div>
                      <h4 className="text-sm font-medium mb-4 text-purple-900 dark:text-purple-300">Stock Status Distribution</h4>
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

                    <div>
                      <h4 className="text-sm font-medium mb-4 flex items-center text-purple-900 dark:text-purple-300">
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
                          {criticalStock.slice(0, 5).map((item, index) => {
                            const percentage = Math.min(100, Math.round((item.currentStock / item.minimumStock) * 100));
                            return (
                              <div key={`${item._id}-${index}`} className="p-3 rounded-lg border border-red-100 dark:border-red-800/30 bg-gradient-to-br from-red-50 to-red-50/50 dark:from-red-900/10 dark:to-red-900/5">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="font-medium text-purple-900 dark:text-purple-300">{item.name}</div>
                                  <Badge className="bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 border-0">
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
                              <Button variant="outline" size="sm" onClick={() => router.push('/stock')} className="border-purple-300 text-purple-700 hover:bg-purple-50">
                                View all {criticalStock.length} items
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mt-6 pt-4 border-t border-purple-200/30 dark:border-purple-800/30">
                    <div className="text-center cursor-pointer hover:bg-purple-50/50 dark:hover:bg-purple-950/20 p-3 rounded-xl transition-colors" onClick={() => router.push('/stock?filter=critical')}>
                      <div className="flex items-center justify-center gap-2">
                        <span className="h-3 w-3 rounded-full bg-red-500"></span>
                        <span className="text-sm font-medium text-purple-900 dark:text-purple-300">Critical</span>
                      </div>
                      <p className="text-2xl font-bold text-purple-900 dark:text-purple-100 mt-1">{stockStatusCounts.critical}</p>
                    </div>
                    <div className="text-center cursor-pointer hover:bg-purple-50/50 dark:hover:bg-purple-950/20 p-3 rounded-xl transition-colors" onClick={() => router.push('/stock?filter=low')}>
                      <div className="flex items-center justify-center gap-2">
                        <span className="h-3 w-3 rounded-full bg-amber-500"></span>
                        <span className="text-sm font-medium text-purple-900 dark:text-purple-300">Low Stock</span>
                      </div>
                      <p className="text-2xl font-bold text-purple-900 dark:text-purple-100 mt-1">{stockStatusCounts.low}</p>
                    </div>
                    <div className="text-center cursor-pointer hover:bg-purple-50/50 dark:hover:bg-purple-950/20 p-3 rounded-xl transition-colors" onClick={() => router.push('/stock?filter=good')}>
                      <div className="flex items-center justify-center gap-2">
                        <span className="h-3 w-3 rounded-full bg-green-500"></span>
                        <span className="text-sm font-medium text-purple-900 dark:text-purple-300">Good Stock</span>
                      </div>
                      <p className="text-2xl font-bold text-purple-900 dark:text-purple-100 mt-1">{stockStatusCounts.good}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Quick Navigation */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.4 }}
            >
              <Card className="border-purple-200/50 dark:border-purple-800/30 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-purple-900 dark:text-purple-300">
                    <TrendingUp className="h-5 w-5 text-purple-600" />
                    Quick Navigation
                  </CardTitle>
                  <CardDescription>Access different sections of your restaurant management system</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <Button 
                      variant="outline" 
                      className="h-auto py-4 flex flex-col gap-2 hover:scale-105 transition-transform border-purple-200/50 hover:border-purple-400 hover:bg-purple-50/50 dark:border-purple-800/30 dark:hover:bg-purple-950/20"
                      onClick={() => router.push('/')}
                    >
                      <Home className="h-5 w-5 text-purple-600" />
                      <span className="text-xs font-medium text-purple-900 dark:text-purple-300">Home</span>
                    </Button>
                    <Button 
                      variant="outline" 
                      className="h-auto py-4 flex flex-col gap-2 hover:scale-105 transition-transform border-purple-200/50 hover:border-purple-400 hover:bg-purple-50/50 dark:border-purple-800/30 dark:hover:bg-purple-950/20"
                      onClick={() => router.push('/sales')}
                    >
                      <DollarSign className="h-5 w-5 text-green-600" />
                      <span className="text-xs font-medium text-purple-900 dark:text-purple-300">Sales</span>
                    </Button>
                    <Button 
                      variant="outline" 
                      className="h-auto py-4 flex flex-col gap-2 hover:scale-105 transition-transform border-purple-200/50 hover:border-purple-400 hover:bg-purple-50/50 dark:border-purple-800/30 dark:hover:bg-purple-950/20"
                      onClick={() => router.push('/expenses')}
                    >
                      <ArrowDownIcon className="h-5 w-5 text-red-600" />
                      <span className="text-xs font-medium text-purple-900 dark:text-purple-300">Expenses</span>
                    </Button>
                    <Button 
                      variant="outline" 
                      className="h-auto py-4 flex flex-col gap-2 hover:scale-105 transition-transform border-purple-200/50 hover:border-purple-400 hover:bg-purple-50/50 dark:border-purple-800/30 dark:hover:bg-purple-950/20"
                      onClick={() => router.push('/stock')}
                    >
                      <Package className="h-5 w-5 text-blue-600" />
                      <span className="text-xs font-medium text-purple-900 dark:text-purple-300">Inventory</span>
                    </Button>
                    <Button 
                      variant="outline" 
                      className="h-auto py-4 flex flex-col gap-2 hover:scale-105 transition-transform border-purple-200/50 hover:border-purple-400 hover:bg-purple-50/50 dark:border-purple-800/30 dark:hover:bg-purple-950/20"
                      onClick={() => router.push('/orders')}
                    >
                      <ShoppingCart className="h-5 w-5 text-orange-600" />
                      <span className="text-xs font-medium text-purple-900 dark:text-purple-300">Orders</span>
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

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000,
      refetchOnWindowFocus: false,
      refetchOnMount: true,
    },
  },
})

export default function DashboardWithQueryClient() {
  return (
    <QueryClientProvider client={queryClient}>
      <Dashboard />
    </QueryClientProvider>
  )
}