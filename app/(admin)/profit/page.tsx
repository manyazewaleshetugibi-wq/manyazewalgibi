"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  CalendarDays,
  Download,
  Filter,
  PieChart,
  LineChart as LineChartIcon,
  BarChart as BarChartIcon,
  RefreshCcw,
  Wallet
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, parseISO, isWithinInterval, eachDayOfInterval, isSameDay } from "date-fns"
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
} from "recharts"
import * as XLSX from "xlsx"
import { ExpenseList } from "@/components/CommonExpenses/ExpenseList"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

// Types
interface Order {
  _id: string
  orderNumber: string
  tableNumber: string
  waiterId: string
  numberOfGuests: number
  items: Array<{
    itemId: string
    quantity: number
    unitPrice: number
    subtotal: number
    status: string
  }>
  totalAmount: number
  discount: number
  tax: number
  finalAmount: number
  status: string
  paymentMethod: string
  specialRequirements: string
  createdAt: string
  updatedAt: string
}

interface Expense {
  _id: string
  title: string
  description?: string
  amount: number
  category: string
  date: string
  status?: string
  paymentMethod?: string
}

interface CommonExpense {
  _id: string
  title: string
  description?: string
  amount: number
  category: string
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'one-time'
  startDate: string
  endDate?: string | null
  isActive: boolean
  tags?: string[]
  createdBy: string
  createdAt: string
}

interface DailyProfit {
  date: string
  formattedDate: string
  sales: number
  regularExpenses: number
  commonExpenses: number
  totalExpenses: number
  profit: number
  margin: number
  orderCount: number
  regularExpenseCount: number
  commonExpenseCount: number
  commonExpensesList: CommonExpense[] // Added to track which common expenses belong to this day
}

interface ProfitMetrics {
  totalSales: number
  totalRegularExpenses: number
  totalCommonExpenses: number
  totalExpenses: number
  totalProfit: number
  averageMargin: number
  bestDay: DailyProfit | null
  worstDay: DailyProfit | null
  profitableDays: number
  lossDays: number
}

interface SalesData {
  totalSales: number
  orderCount: number
  totalTax: number
  totalDiscounts: number
  dailySales: Record<string, number>
  orders: Order[]
}

// API Functions
async function fetchSalesData(): Promise<SalesData> {
  const response = await fetch("/api/order/report")
  if (!response.ok) {
    throw new Error("Failed to fetch sales data")
  }
  const data = await response.json()
  return data
}

async function fetchRegularExpenses(): Promise<Expense[]> {
  const response = await fetch("/api/expense")
  if (!response.ok) {
    throw new Error("Failed to fetch regular expenses")
  }
  const data = await response.json()
  return data.data || []
}

// Fetch ALL common expenses - no date filtering (this is your "static data")
async function fetchCommonExpenses(): Promise<CommonExpense[]> {
  const response = await fetch("/api/common-expense")
  if (!response.ok) {
    throw new Error("Failed to fetch common expenses")
  }
  const data = await response.json()
  return data.data || []
}

async function createCommonExpense(expense: any): Promise<CommonExpense> {
  const response = await fetch('/api/common-expense', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(expense),
  })
  const data = await response.json()
  return data.data
}

async function updateCommonExpense(id: string, expense: any): Promise<CommonExpense> {
  const response = await fetch(`/api/common-expense/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(expense),
  })
  const data = await response.json()
  return data.data
}

async function deleteCommonExpense(id: string): Promise<boolean> {
  const response = await fetch(`/api/common-expense?id=${id}`, {
    method: 'DELETE',
  })
  return response.ok
}

// Utility Functions
function exportToExcel(data: any[], filename: string) {
  const worksheet = XLSX.utils.json_to_sheet(data)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, "Profit Data")
  XLSX.writeFile(workbook, `${filename}.xlsx`)
}

type DateFilterType = 'today' | 'yesterday' | 'week' | 'month' | 'year' | 'custom' | 'all'

function getDateRange(type: DateFilterType, customStart?: Date, customEnd?: Date) {
  const now = new Date()
  let start: Date
  let end: Date

  switch (type) {
    case 'today':
      start = new Date(now.setHours(0, 0, 0, 0))
      end = new Date(now.setHours(23, 59, 59, 999))
      break
    case 'yesterday':
      const yesterday = subDays(now, 1)
      start = new Date(yesterday.setHours(0, 0, 0, 0))
      end = new Date(yesterday.setHours(23, 59, 59, 999))
      break
    case 'week':
      start = startOfWeek(now, { weekStartsOn: 1 })
      end = endOfWeek(now, { weekStartsOn: 1 })
      break
    case 'month':
      start = startOfMonth(now)
      end = endOfMonth(now)
      break
    case 'year':
      start = startOfYear(now)
      end = endOfYear(now)
      break
    case 'custom':
      start = customStart || new Date(now.setHours(0, 0, 0, 0))
      end = customEnd || new Date(now.setHours(23, 59, 59, 999))
      break
    case 'all':
    default:
      start = new Date('1970-01-01')
      end = new Date('2100-12-31')
      break
  }

  return { start, end }
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82CA9D"]

export default function ProfitPage() {
  const [salesData, setSalesData] = useState<SalesData | null>(null)
  const [regularExpenses, setRegularExpenses] = useState<Expense[]>([])
  const [commonExpenses, setCommonExpenses] = useState<CommonExpense[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [dateFilterType, setDateFilterType] = useState<DateFilterType>('month')
  const [customStartDate, setCustomStartDate] = useState<Date | null>(null)
  const [customEndDate, setCustomEndDate] = useState<Date | null>(null)
  const [chartType, setChartType] = useState<'line' | 'bar'>('line')
  const [activeTab, setActiveTab] = useState("overview")
  const [showExpenseManager, setShowExpenseManager] = useState(false)

  // Fetch data on component mount
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      try {
        const [sales, regular, common] = await Promise.all([
          fetchSalesData(),
          fetchRegularExpenses(),
          fetchCommonExpenses() // This fetches ALL common expenses (static data)
        ])
        setSalesData(sales)
        setRegularExpenses(regular)
        setCommonExpenses(common)
      } catch (error) {
        console.error("Error loading data:", error)
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [])

  const handleAddExpense = async (formData: any) => {
    try {
      const newExpense = await createCommonExpense(formData)
      setCommonExpenses(prev => [newExpense, ...prev])
    } catch (error) {
      console.error('Error adding expense:', error)
    }
  }

  const handleEditExpense = async (id: string, formData: any) => {
    try {
      const updatedExpense = await updateCommonExpense(id, formData)
      setCommonExpenses(prev => prev.map(exp => 
        exp._id === id ? updatedExpense : exp
      ))
    } catch (error) {
      console.error('Error editing expense:', error)
    }
  }

  const handleDeleteExpense = async (id: string) => {
    if (confirm('Are you sure you want to delete this expense?')) {
      try {
        await deleteCommonExpense(id)
        setCommonExpenses(prev => prev.filter(expense => expense._id !== id))
      } catch (error) {
        console.error('Error deleting expense:', error)
      }
    }
  }

  const handleRefresh = async () => {
    setIsLoading(true)
    try {
      const [sales, regular, common] = await Promise.all([
        fetchSalesData(),
        fetchRegularExpenses(),
        fetchCommonExpenses() // Fetch ALL common expenses again (static data)
      ])
      setSalesData(sales)
      setRegularExpenses(regular)
      setCommonExpenses(common)
    } catch (error) {
      console.error("Error refreshing data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  // Helper to calculate daily amount for a common expense - FIXED with safety check
  const getDailyAmount = (expense: CommonExpense | undefined, date: Date) => {
    // Add safety check for undefined expense
    if (!expense) return 0
    if (!expense.isActive) return 0
    
    // Use common expenses as constant data for all dates as requested
    // We ignore start/end dates for recurring expenses to apply them retroactively/proactively
    // const start = new Date(expense.startDate)
    // const end = expense.endDate ? new Date(expense.endDate) : null
    // if (date < start) return 0
    // if (end && date > end) return 0

    switch (expense.frequency) {
      case 'daily': return expense.amount
      case 'weekly': return expense.amount / 7
      case 'monthly': return expense.amount / 30
      case 'quarterly': return expense.amount / 91.25 // Approx 365/4
      case 'yearly': return expense.amount / 365
      case 'one-time': 
        // For one-time, we still need to respect the specific date
        const start = new Date(expense.startDate)
        return isSameDay(date, start) ? expense.amount : 0
      default: return 0
    }
  }

  // Calculate daily profit based on filtered date range
  const filteredData = useMemo(() => {
    if (!salesData) {
      return { 
        dailyProfit: [] as DailyProfit[], 
        metrics: null,
        categoryData: []
      }
    }

    const { start, end } = getDateRange(dateFilterType, customStartDate || undefined, customEndDate || undefined)
    
    // Filter orders by date
    const filteredOrders = salesData.orders.filter(order => {
      const orderDate = new Date(order.createdAt)
      return orderDate >= start && orderDate <= end
    })

    // Filter regular expenses by date
    const filteredRegularExpenses = regularExpenses.filter(expense => {
      const expenseDate = new Date(expense.date)
      return expenseDate >= start && expenseDate <= end
    })

    // Group sales by date
    const salesByDate: Record<string, { total: number; count: number }> = {}
    filteredOrders.forEach(order => {
      const date = format(new Date(order.createdAt), 'yyyy-MM-dd')
      if (!salesByDate[date]) {
        salesByDate[date] = { total: 0, count: 0 }
      }
      salesByDate[date].total += order.finalAmount
      salesByDate[date].count++
    })

    // Group regular expenses by date
    const regularExpensesByDate: Record<string, { total: number; count: number }> = {}
    filteredRegularExpenses.forEach(expense => {
      const date = format(new Date(expense.date), 'yyyy-MM-dd')
      if (!regularExpensesByDate[date]) {
        regularExpensesByDate[date] = { total: 0, count: 0 }
      }
      regularExpensesByDate[date].total += expense.amount
      regularExpensesByDate[date].count++
    })

    // Determine dates to process
    let datesToProcess: Date[] = []
    if (dateFilterType === 'all') {
      // For 'all', use only dates with actual data to avoid infinite range
      const allDataDates = new Set([
        ...Object.keys(salesByDate), 
        ...Object.keys(regularExpensesByDate)
      ])
      datesToProcess = Array.from(allDataDates).sort().map(d => new Date(d))
    } else {
      // For specific ranges, generate all days in the interval
      datesToProcess = eachDayOfInterval({ start, end })
    }
    
    // Create daily profit array
    const dailyProfit: DailyProfit[] = datesToProcess.map(dateObj => {
        const date = format(dateObj, 'yyyy-MM-dd')
        const sales = salesByDate[date]?.total || 0
        const regularExpenses = regularExpensesByDate[date]?.total || 0
        
        // Calculate common expenses for this day
        let dailyCommonTotal = 0
        const activeCommonExpenses: CommonExpense[] = []
        
        commonExpenses.forEach(expense => {
          const amount = getDailyAmount(expense, dateObj)
          if (amount > 0) {
            dailyCommonTotal += amount
            activeCommonExpenses.push(expense)
          }
        })

        const totalExpenses = regularExpenses + dailyCommonTotal
        const profit = sales - totalExpenses
        const margin = sales > 0 ? (profit / sales) * 100 : 0

        return {
          date,
          formattedDate: format(parseISO(date), 'PPP'),
          sales,
          regularExpenses,
          commonExpenses: dailyCommonTotal,
          totalExpenses,
          profit,
          margin,
          orderCount: salesByDate[date]?.count || 0,
          regularExpenseCount: regularExpensesByDate[date]?.count || 0,
          commonExpenseCount: activeCommonExpenses.length,
          commonExpensesList: activeCommonExpenses // Store the actual expenses for this day
        }
      })

    // Calculate metrics
    const totalSales = dailyProfit.reduce((sum, day) => sum + day.sales, 0)
    const totalRegularExpenses = dailyProfit.reduce((sum, day) => sum + day.regularExpenses, 0)
    const totalCommonExpenses = dailyProfit.reduce((sum, day) => sum + day.commonExpenses, 0)
    const totalExpenses = dailyProfit.reduce((sum, day) => sum + day.totalExpenses, 0)
    const totalProfit = dailyProfit.reduce((sum, day) => sum + day.profit, 0)
    const averageMargin = totalSales > 0 ? (totalProfit / totalSales) * 100 : 0

    const profitableDays = dailyProfit.filter(day => day.profit > 0).length
    const lossDays = dailyProfit.filter(day => day.profit < 0).length

    let bestDay: DailyProfit | null = null
    let worstDay: DailyProfit | null = null

    if (dailyProfit.length > 0) {
      bestDay = dailyProfit.reduce((max, day) => day.profit > max.profit ? day : max, dailyProfit[0])
      worstDay = dailyProfit.reduce((min, day) => day.profit < min.profit ? day : min, dailyProfit[0])
    }

    const metrics: ProfitMetrics = {
      totalSales,
      totalRegularExpenses,
      totalCommonExpenses,
      totalExpenses,
      totalProfit,
      averageMargin,
      bestDay: bestDay && bestDay.profit > 0 ? bestDay : null,
      worstDay: worstDay && worstDay.profit < 0 ? worstDay : null,
      profitableDays,
      lossDays
    }

    // Calculate category data for pie chart - FIXED with safety checks
    // For regular expenses, use the filtered list
    const regularExpensesForChart = filteredRegularExpenses.map(e => ({ category: e.category, amount: e.amount }))
    
    // For common expenses, sum up the daily amortized amounts across the period
    const commonExpensesForChart = dailyProfit.flatMap(day => 
      // Filter out any undefined expenses and ensure we have valid objects
      (day.commonExpensesList || [])
        .filter(expense => expense && expense._id) // Ensure expense exists and has an ID
        .map(expense => ({
          category: expense.category,
          amount: getDailyAmount(expense, new Date(day.date))
        }))
    )

    const allExpenses = [...regularExpensesForChart, ...commonExpensesForChart]

    const categoryTotals = allExpenses.reduce((acc, expense) => {
      acc[expense.category] = (acc[expense.category] || 0) + expense.amount
      return acc
    }, {} as Record<string, number>)

    const categoryData = Object.entries(categoryTotals)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8)

    return { dailyProfit, metrics, categoryData }
  }, [salesData, regularExpenses, commonExpenses, dateFilterType, customStartDate, customEndDate])

  const handleExport = () => {
    if (!filteredData.dailyProfit.length) return

    const exportData = filteredData.dailyProfit.map(day => ({
      'Date': day.formattedDate,
      'Sales (ETB)': day.sales.toFixed(2),
      'Regular Expenses (ETB)': day.regularExpenses.toFixed(2),
      'Common Expenses (ETB)': day.commonExpenses.toFixed(2),
      'Total Expenses (ETB)': day.totalExpenses.toFixed(2),
      'Profit (ETB)': day.profit.toFixed(2),
      'Profit Margin (%)': day.margin.toFixed(2),
      'Number of Orders': day.orderCount,
      'Regular Expenses Count': day.regularExpenseCount,
      'Common Expenses Count': day.commonExpenseCount
    }))

    exportToExcel(exportData, `profit_report_${format(new Date(), 'yyyy-MM-dd')}`)
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'ETB',
      minimumFractionDigits: 2
    }).format(value)
  }

  if (isLoading) {
    return (
      <div className="flex-col md:flex">
        <div className="flex-1 space-y-4 p-8 pt-6">
          <div className="flex items-center justify-between">
            <Skeleton className="h-9 w-48" />
            <div className="flex gap-2">
              <Skeleton className="h-10 w-40" />
              <Skeleton className="h-10 w-32" />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-[125px] w-full" />
            ))}
          </div>
          <Skeleton className="h-[350px] w-full" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex-col md:flex">
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Profit Dashboard</h2>
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <Button 
              variant="outline" 
              onClick={() => setShowExpenseManager(true)}
              className="flex-1 sm:flex-none"
            >
              <Wallet className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Manage Common Expenses</span>
              <span className="inline sm:hidden">Expenses</span>
            </Button>
            <Button onClick={handleRefresh} variant="outline" size="icon">
              <RefreshCcw className="h-4 w-4" />
            </Button>
            <Button onClick={handleExport} variant="outline" className="flex-1 sm:flex-none">
              <Download className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Export Report</span>
              <span className="inline sm:hidden">Export</span>
            </Button>
          </div>
        </div>

        {/* Date Filter */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Date Range
              </CardTitle>
              <div className="text-sm text-muted-foreground">
                {filteredData.dailyProfit.length} days of data
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={dateFilterType === 'today' ? "default" : "outline"}
                  size="sm"
                  onClick={() => setDateFilterType('today')}
                >
                  Today
                </Button>
                <Button
                  variant={dateFilterType === 'yesterday' ? "default" : "outline"}
                  size="sm"
                  onClick={() => setDateFilterType('yesterday')}
                >
                  Yesterday
                </Button>
                <Button
                  variant={dateFilterType === 'week' ? "default" : "outline"}
                  size="sm"
                  onClick={() => setDateFilterType('week')}
                >
                  This Week
                </Button>
                <Button
                  variant={dateFilterType === 'month' ? "default" : "outline"}
                  size="sm"
                  onClick={() => setDateFilterType('month')}
                >
                  This Month
                </Button>
                <Button
                  variant={dateFilterType === 'year' ? "default" : "outline"}
                  size="sm"
                  onClick={() => setDateFilterType('year')}
                >
                  This Year
                </Button>
                <Button
                  variant={dateFilterType === 'all' ? "default" : "outline"}
                  size="sm"
                  onClick={() => setDateFilterType('all')}
                >
                  All Time
                </Button>
                <Button
                  variant={dateFilterType === 'custom' ? "default" : "outline"}
                  size="sm"
                  onClick={() => setDateFilterType('custom')}
                >
                  Custom Range
                </Button>
              </div>

              {dateFilterType === 'custom' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Start Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full mt-1 justify-start text-left font-normal">
                          <CalendarDays className="mr-2 h-4 w-4" />
                          {customStartDate ? format(customStartDate, "PPP") : "Select start date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={customStartDate || undefined}
                          onSelect={setCustomStartDate}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <Label>End Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full mt-1 justify-start text-left font-normal">
                          <CalendarDays className="mr-2 h-4 w-4" />
                          {customEndDate ? format(customEndDate, "PPP") : "Select end date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={customEndDate || undefined}
                          onSelect={setCustomEndDate}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="overview" onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="details">Daily Details</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {/* Key Metrics - Now with 6 cards */}
            {filteredData.metrics && (
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      {formatCurrency(filteredData.metrics.totalSales)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {filteredData.dailyProfit.reduce((sum, day) => sum + day.orderCount, 0)} orders
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Regular Expenses</CardTitle>
                    <TrendingDown className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-orange-600">
                      {formatCurrency(filteredData.metrics.totalRegularExpenses)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {filteredData.dailyProfit.reduce((sum, day) => sum + day.regularExpenseCount, 0)} expenses
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Common Expenses</CardTitle>
                    <TrendingDown className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-purple-600">
                      {formatCurrency(filteredData.metrics.totalCommonExpenses)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {filteredData.dailyProfit.reduce((sum, day) => sum + day.commonExpenseCount, 0)} expenses
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
                    <TrendingDown className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">
                      {formatCurrency(filteredData.metrics.totalExpenses)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Combined total
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className={`text-2xl font-bold ${filteredData.metrics.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(filteredData.metrics.totalProfit)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Margin: {filteredData.metrics.averageMargin.toFixed(1)}%
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Performance</CardTitle>
                    <PieChart className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {filteredData.metrics.profitableDays}/{filteredData.dailyProfit.length}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {filteredData.metrics.lossDays} loss days
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Charts */}
            <div className="grid gap-4 grid-cols-1 lg:grid-cols-7">
              <Card className="col-span-1 lg:col-span-4">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Daily Profit Trend</CardTitle>
                    <div className="flex items-center gap-2">
                      <Button
                        variant={chartType === "line" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setChartType("line")}
                      >
                        <LineChartIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        variant={chartType === "bar" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setChartType("bar")}
                      >
                        <BarChartIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pl-2">
                  <ResponsiveContainer width="100%" height={350}>
                    {chartType === "line" ? (
                      <LineChart data={filteredData.dailyProfit}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="date" 
                          tickFormatter={(date) => format(parseISO(date), 'MMM dd')}
                        />
                        <YAxis 
                          tickFormatter={(value) => formatCurrency(value)}
                        />
                        <Tooltip 
                          formatter={(value: number) => [formatCurrency(value), 'Amount']}
                          labelFormatter={(label) => format(parseISO(label), 'PPP')}
                        />
                        <Legend />
                        <Line type="monotone" dataKey="sales" stroke="#4CAF50" name="Sales" strokeWidth={2} />
                        <Line type="monotone" dataKey="regularExpenses" stroke="#FF9800" name="Regular Expenses" strokeWidth={2} />
                        <Line type="monotone" dataKey="commonExpenses" stroke="#9C27B0" name="Common Expenses" strokeWidth={2} />
                        <Line type="monotone" dataKey="profit" stroke="#2196F3" name="Profit" strokeWidth={3} />
                      </LineChart>
                    ) : (
                      <BarChart data={filteredData.dailyProfit}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="date" 
                          tickFormatter={(date) => format(parseISO(date), 'MMM dd')}
                        />
                        <YAxis 
                          tickFormatter={(value) => formatCurrency(value)}
                        />
                        <Tooltip 
                          formatter={(value: number) => [formatCurrency(value), 'Amount']}
                          labelFormatter={(label) => format(parseISO(label), 'PPP')}
                        />
                        <Legend />
                        <Bar dataKey="sales" fill="#4CAF50" name="Sales" />
                        <Bar dataKey="regularExpenses" fill="#FF9800" name="Regular Expenses" />
                        <Bar dataKey="commonExpenses" fill="#9C27B0" name="Common Expenses" />
                        <Bar dataKey="profit" fill="#2196F3" name="Profit" />
                      </BarChart>
                    )}
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="col-span-1 lg:col-span-3">
                <CardHeader>
                  <CardTitle>Expense Categories</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={350}>
                    <RechartsPieChart>
                      <Pie
                        data={filteredData.categoryData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {filteredData.categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: number) => [formatCurrency(value), 'Amount']}
                      />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Best and Worst Days */}
            {filteredData.metrics && (
              <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                {filteredData.metrics.bestDay && (
                  <Card className="border-green-200">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-green-600 flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" />
                        Best Performing Day
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">
                        {formatCurrency(filteredData.metrics.bestDay.profit)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {filteredData.metrics.bestDay.formattedDate}
                      </p>
                      <div className="mt-2 text-sm">
                        <span className="text-muted-foreground">Sales: </span>
                        <span className="text-green-600">{formatCurrency(filteredData.metrics.bestDay.sales)}</span>
                        <span className="text-muted-foreground ml-2">Expenses: </span>
                        <span className="text-red-600">{formatCurrency(filteredData.metrics.bestDay.totalExpenses)}</span>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {filteredData.metrics.worstDay && (
                  <Card className="border-red-200">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-red-600 flex items-center gap-2">
                        <TrendingDown className="h-4 w-4" />
                        Worst Performing Day
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-red-600">
                        {formatCurrency(filteredData.metrics.worstDay.profit)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {filteredData.metrics.worstDay.formattedDate}
                      </p>
                      <div className="mt-2 text-sm">
                        <span className="text-muted-foreground">Sales: </span>
                        <span className="text-green-600">{formatCurrency(filteredData.metrics.worstDay.sales)}</span>
                        <span className="text-muted-foreground ml-2">Expenses: </span>
                        <span className="text-red-600">{formatCurrency(filteredData.metrics.worstDay.totalExpenses)}</span>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="details" className="space-y-4">
            {/* Daily Profit Table */}
            <Card>
              <CardHeader>
                <CardTitle>Daily Profit Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Sales</TableHead>
                        <TableHead className="text-right">Regular Exp</TableHead>
                        <TableHead className="text-right">Common Exp</TableHead>
                        <TableHead className="text-right">Total Exp</TableHead>
                        <TableHead className="text-right">Profit</TableHead>
                        <TableHead className="text-right">Margin</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredData.dailyProfit.map((day) => (
                        <TableRow key={day.date}>
                          <TableCell className="font-medium">
                            {day.formattedDate}
                          </TableCell>
                          <TableCell className="text-right text-green-600">
                            {formatCurrency(day.sales)}
                          </TableCell>
                          <TableCell className="text-right text-orange-600">
                            {formatCurrency(day.regularExpenses)}
                          </TableCell>
                          <TableCell className="text-right text-purple-600">
                            {formatCurrency(day.commonExpenses)}
                          </TableCell>
                          <TableCell className="text-right text-red-600">
                            {formatCurrency(day.totalExpenses)}
                          </TableCell>
                          <TableCell className={`text-right font-bold ${
                            day.profit >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {formatCurrency(day.profit)}
                          </TableCell>
                          <TableCell className="text-right">
                            {day.margin.toFixed(1)}%
                          </TableCell>
                          <TableCell>
                            <Badge variant={day.profit >= 0 ? "default" : "destructive"}>
                              {day.profit >= 0 ? 'Profitable' : 'Loss'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}

                      {filteredData.dailyProfit.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                            No data available for the selected date range
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Summary Row */}
                {filteredData.dailyProfit.length > 0 && filteredData.metrics && (
                  <div className="mt-4 p-4 bg-muted rounded-lg">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Days</p>
                        <p className="text-2xl font-bold">{filteredData.dailyProfit.length}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Total Sales</p>
                        <p className="text-2xl font-bold text-green-600">
                          {formatCurrency(filteredData.metrics.totalSales)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Regular Expenses</p>
                        <p className="text-2xl font-bold text-orange-600">
                          {formatCurrency(filteredData.metrics.totalRegularExpenses)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Common Expenses</p>
                        <p className="text-2xl font-bold text-purple-600">
                          {formatCurrency(filteredData.metrics.totalCommonExpenses)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Total Expenses</p>
                        <p className="text-2xl font-bold text-red-600">
                          {formatCurrency(filteredData.metrics.totalExpenses)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Net Profit</p>
                        <p className={`text-2xl font-bold ${filteredData.metrics.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(filteredData.metrics.totalProfit)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Avg Margin</p>
                        <p className="text-2xl font-bold">
                          {filteredData.metrics.averageMargin.toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Expense Manager Dialog */}
      <Dialog open={showExpenseManager} onOpenChange={setShowExpenseManager}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Common Expenses</DialogTitle>
          </DialogHeader>
          <ExpenseList
            expenses={commonExpenses}
            isLoading={isLoading}
            onAdd={handleAddExpense}
            onEdit={handleEditExpense}
            onDelete={handleDeleteExpense}
            onRefresh={handleRefresh}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}