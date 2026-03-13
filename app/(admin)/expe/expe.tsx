"use client"

import { useRouter } from "next/navigation"
import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  BarChart, 
  DollarSign, 
  Download, 
  PieChart, 
  RefreshCcw, 
  Filter, 
  CalendarDays, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Wallet,
  TrendingDown,
  Calculator,
  FileSpreadsheet,
  Route
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts"
import * as XLSX from "xlsx";
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, parseISO } from "date-fns"
import { ArrowDown, ArrowUp, CalendarIcon } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import DailyCash from "../../../components/CommonExpenses/dailycash"

type Expense = {
  _id: string
  title: string
  description: string
  amount: number
  category: string
  date: string
  tags: string[]
  recurring: boolean
  frequency: string
  notes: string
  priority: string
  status: string
  createdBy: string
}

interface DailyCashEntry {
  _id: string
  date: string
  cashAmount: number
  bankAmount: number
  totalAmount: number
  notes?: string
  createdBy?: string
  createdAt?: string
  updatedAt?: string
}

interface DailyBalance {
  date: string
  formattedDate: string
  cashAmount: number
  bankAmount: number
  totalCash: number
  paidExpenses: number
  pendingExpenses: number
  balance: number
  remainingPending: number
  expenseCount: number
  paidCount: number
  pendingCount: number
}

type DateFilterType = 'today' | 'yesterday' | 'week' | 'month' | 'year' | 'custom' | 'all'

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82CA9D"]

// Status colors
const STATUS_COLORS = {
  Paid: "#10b981", // Green
  Pending: "#f59e0b", // Amber
  Overdue: "#ef4444" // Red
}

async function fetchExpenses(): Promise<Expense[]> {
  const response = await fetch("/api/expense")
  const data = await response.json()
  return data.data
}

async function fetchDailyCash(): Promise<DailyCashEntry[]> {
  const response = await fetch("/api/daily-cash")
  const data = await response.json()
  return data.data || []
}

// Add the missing exportToExcel function
function exportToExcel(data: Expense[], filename: string) {
  // Prepare data for export
  const exportData = data.map(expense => ({
    'Title': expense.title,
    'Description': expense.description,
    'Amount (ETB)': expense.amount.toFixed(2),
    'Category': expense.category,
    'Date': format(new Date(expense.date), 'PPP'),
    'Status': expense.status,
    'Priority': expense.priority,
    'Recurring': expense.recurring ? 'Yes' : 'No',
    'Frequency': expense.frequency || 'N/A',
    'Tags': expense.tags.join(', '),
    'Notes': expense.notes || '',
    'Created By': expense.createdBy || 'N/A'
  }))
  
  const worksheet = XLSX.utils.json_to_sheet(exportData)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, "Expenses")
  XLSX.writeFile(workbook, `${filename}.xlsx`)
}

function exportBalanceToExcel(data: DailyBalance[], filename: string) {
  const exportData = data.map(balance => ({
    'Date': balance.formattedDate,
    'Cash Amount (ETB)': balance.cashAmount.toFixed(2),
    'Bank Amount (ETB)': balance.bankAmount.toFixed(2),
    'Total Cash (ETB)': balance.totalCash.toFixed(2),
    'Paid Expenses (ETB)': balance.paidExpenses.toFixed(2),
    'Pending Expenses (ETB)': balance.pendingExpenses.toFixed(2),
    'Balance After Paid (ETB)': balance.balance.toFixed(2),
    'Remaining Pending (ETB)': balance.remainingPending.toFixed(2),
    'Total Expenses Count': balance.expenseCount,
    'Paid Count': balance.paidCount,
    'Pending Count': balance.pendingCount,
  }))
  
  const worksheet = XLSX.utils.json_to_sheet(exportData)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, "Daily Balance")
  XLSX.writeFile(workbook, `${filename}.xlsx`)
}

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

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [dailyCashEntries, setDailyCashEntries] = useState<DailyCashEntry[]>([])
  const [filteredExpenses, setFilteredExpenses] = useState<Expense[]>([])
  const [dailyBalances, setDailyBalances] = useState<DailyBalance[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filterCategory, setFilterCategory] = useState("all")
  const [filterPriority, setFilterPriority] = useState("all")
  const [filterStatus, setFilterStatus] = useState("all")
  const [dateFilterType, setDateFilterType] = useState<DateFilterType>('all')
  const [customStartDate, setCustomStartDate] = useState<Date | null>(null)
  const [customEndDate, setCustomEndDate] = useState<Date | null>(null)
  const [sortBy, setSortBy] = useState<keyof Expense>("date")
  const [sortOrder, setSortOrder] = useState("desc")
  const [searchTerm, setSearchTerm] = useState("")
  const [activeTab, setActiveTab] = useState("overview")
  const [expandedSections, setExpandedSections] = useState<string[]>(["pending", "paid"])
  const [showDailyCash, setShowDailyCash] = useState(false)
  const [balanceTab, setBalanceTab] = useState<'daily' | 'summary'>('daily')

  const router = useRouter()

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      try {
        const [expensesData, dailyCashData] = await Promise.all([
          fetchExpenses(),
          fetchDailyCash()
        ])
        setExpenses(expensesData)
        setDailyCashEntries(dailyCashData)
        setFilteredExpenses(expensesData)
      } catch (error) {
        console.error("Error loading data:", error)
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [])

  // Calculate daily balances
  useEffect(() => {
    const { start, end } = getDateRange(dateFilterType, customStartDate || undefined, customEndDate || undefined)
    
    // Group expenses by date
    const expensesByDate: Record<string, { paid: number; pending: number; count: number; paidCount: number; pendingCount: number }> = {}
    
    expenses.forEach(expense => {
      const date = format(new Date(expense.date), 'yyyy-MM-dd')
      if (!expensesByDate[date]) {
        expensesByDate[date] = { paid: 0, pending: 0, count: 0, paidCount: 0, pendingCount: 0 }
      }
      expensesByDate[date].count++
      if (expense.status === "Paid") {
        expensesByDate[date].paid += expense.amount
        expensesByDate[date].paidCount++
      } else if (expense.status === "Pending") {
        expensesByDate[date].pending += expense.amount
        expensesByDate[date].pendingCount++
      }
    })

    // Create balances for dates that have either cash entries or expenses
    const allDates = new Set([
      ...dailyCashEntries.map(entry => entry.date),
      ...Object.keys(expensesByDate)
    ])

    const balances: DailyBalance[] = Array.from(allDates)
      .filter(date => {
        const dateObj = new Date(date)
        return dateObj >= start && dateObj <= end
      })
      .map(date => {
        const cashEntry = dailyCashEntries.find(entry => entry.date === date)
        const expenseData = expensesByDate[date] || { paid: 0, pending: 0, count: 0, paidCount: 0, pendingCount: 0 }
        
        const cashAmount = cashEntry?.cashAmount || 0
        const bankAmount = cashEntry?.bankAmount || 0
        const totalCash = cashAmount + bankAmount
        const paidExpenses = expenseData.paid
        const pendingExpenses = expenseData.pending
        const balance = totalCash - paidExpenses // Only subtract paid expenses
        const remainingPending = pendingExpenses // Amount still pending to be paid

        return {
          date,
          formattedDate: format(parseISO(date), 'PPP'),
          cashAmount,
          bankAmount,
          totalCash,
          paidExpenses,
          pendingExpenses,
          balance,
          remainingPending,
          expenseCount: expenseData.count,
          paidCount: expenseData.paidCount,
          pendingCount: expenseData.pendingCount
        }
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    setDailyBalances(balances)
  }, [expenses, dailyCashEntries, dateFilterType, customStartDate, customEndDate])

  const getFilteredExpenses = useMemo(() => {
    const { start, end } = getDateRange(dateFilterType, customStartDate || undefined, customEndDate || undefined)
    
    return expenses.filter((expense) => {
      const expenseDate = new Date(expense.date)
      const matchesDate = dateFilterType === 'all' || (expenseDate >= start && expenseDate <= end)
      const matchesCategory = filterCategory === "all" || expense.category === filterCategory
      const matchesPriority = filterPriority === "all" || expense.priority === filterPriority
      const matchesStatus = filterStatus === "all" || expense.status === filterStatus
      const matchesSearch = searchTerm === "" || 
        expense.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        expense.description.toLowerCase().includes(searchTerm.toLowerCase())

      return matchesDate && matchesCategory && matchesPriority && matchesStatus && matchesSearch
    }).sort((a, b) => {
      if (a[sortBy] < b[sortBy]) return sortOrder === "asc" ? -1 : 1
      if (a[sortBy] > b[sortBy]) return sortOrder === "asc" ? 1 : -1
      return 0
    })
  }, [expenses, filterCategory, filterPriority, filterStatus, dateFilterType, customStartDate, customEndDate, searchTerm, sortBy, sortOrder])

  useEffect(() => {
    setFilteredExpenses(getFilteredExpenses)
  }, [getFilteredExpenses])

  // Separate expenses by status
  const pendingExpenses = filteredExpenses.filter(expense => expense.status === "Pending")
  const paidExpenses = filteredExpenses.filter(expense => expense.status === "Paid")

  const handleExport = (section: 'overview' | 'analytics' | 'balance') => {
    if (section === 'balance') {
      exportBalanceToExcel(dailyBalances, `daily_balance_report_${format(new Date(), 'yyyy-MM-dd')}`)
    } else {
      const filename = section === 'overview' ? 'expenses_overview_report' : 'expenses_analytics_report'
      exportToExcel(filteredExpenses, filename)
    }
  }

  const handleDateFilterChange = (type: DateFilterType) => {
    setDateFilterType(type)
    if (type === 'custom') {
      if (!customStartDate || !customEndDate) {
        const now = new Date()
        setCustomStartDate(new Date(now.setHours(0, 0, 0, 0)))
        setCustomEndDate(new Date(now.setHours(23, 59, 59, 999)))
      }
    }
  }

  const calculateMetrics = () => {
    const totalExpenses = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0)
    const averageExpense = filteredExpenses.length > 0 ? totalExpenses / filteredExpenses.length : 0
    const highPriorityCount = filteredExpenses.filter((expense) => expense.priority === "High").length
    const recurringCount = filteredExpenses.filter((expense) => expense.recurring).length
    const paidExpenses = filteredExpenses.filter((expense) => expense.status === "Paid")
    const pendingExpenses = filteredExpenses.filter((expense) => expense.status === "Pending")
    const paidAmount = paidExpenses.reduce((sum, expense) => sum + expense.amount, 0)
    const pendingAmount = pendingExpenses.reduce((sum, expense) => sum + expense.amount, 0)
    const paidCount = paidExpenses.length
    const pendingCount = pendingExpenses.length

    // Calculate balance metrics from dailyBalances
    const totalCash = dailyBalances.reduce((sum, balance) => sum + balance.totalCash, 0)
    const totalPaidExpenses = dailyBalances.reduce((sum, balance) => sum + balance.paidExpenses, 0)
    const totalPendingExpenses = dailyBalances.reduce((sum, balance) => sum + balance.pendingExpenses, 0)
    const totalBalance = dailyBalances.reduce((sum, balance) => sum + balance.balance, 0)
    const totalRemainingPending = dailyBalances.reduce((sum, balance) => sum + balance.remainingPending, 0)

    return {
      totalExpenses,
      averageExpense,
      highPriorityCount,
      recurringCount,
      paidAmount,
      pendingAmount,
      paidCount,
      pendingCount,
      totalCount: filteredExpenses.length,
      // Balance metrics
      totalCash,
      totalPaidExpenses,
      totalPendingExpenses,
      totalBalance,
      totalRemainingPending,
      balanceDays: dailyBalances.length
    }
  }

  const metrics = calculateMetrics()

  const getChartData = () => {
    const dailyData: Record<string, { total: number; paid: number; pending: number }> = {}
    filteredExpenses.forEach(expense => {
      const date = format(new Date(expense.date), 'MMM dd')
      if (!dailyData[date]) {
        dailyData[date] = { total: 0, paid: 0, pending: 0 }
      }
      dailyData[date].total += expense.amount
      if (expense.status === "Paid") {
        dailyData[date].paid += expense.amount
      } else if (expense.status === "Pending") {
        dailyData[date].pending += expense.amount
      }
    })
    
    return Object.entries(dailyData)
      .map(([date, amounts]) => ({ date, ...amounts }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }

  const getCategoryData = (status?: 'Paid' | 'Pending') => {
    let expensesToFilter = filteredExpenses
    if (status) {
      expensesToFilter = filteredExpenses.filter(e => e.status === status)
    }
    
    const categoryData = expensesToFilter.reduce(
      (acc, expense) => {
        acc[expense.category] = (acc[expense.category] || 0) + expense.amount
        return acc
      },
      {} as Record<string, number>,
    )

    return Object.entries(categoryData).map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)
  }

  const getStatusBreakdownData = () => {
    const paid = filteredExpenses.filter(e => e.status === "Paid").reduce((sum, e) => sum + e.amount, 0)
    const pending = filteredExpenses.filter(e => e.status === "Pending").reduce((sum, e) => sum + e.amount, 0)
    
    return [
      { name: "Paid", value: paid, color: STATUS_COLORS.Paid },
      { name: "Pending", value: pending, color: STATUS_COLORS.Pending }
    ]
  }

  const getBalanceChartData = () => {
    return dailyBalances.slice(0, 10).map(balance => ({
      date: format(parseISO(balance.date), 'MMM dd'),
      totalCash: balance.totalCash,
      paidExpenses: balance.paidExpenses,
      balance: balance.balance,
      pending: balance.pendingExpenses
    })).reverse()
  }

  const dailyChartData = getChartData()
  const categoryData = getCategoryData()
  const paidCategoryData = getCategoryData('Paid')
  const pendingCategoryData = getCategoryData('Pending')
  const statusBreakdownData = getStatusBreakdownData()
  const balanceChartData = getBalanceChartData()
  const pieChartData = categoryData

  const columns = [
    { accessorKey: "title", header: "Title" },
    {
      accessorKey: "amount",
      header: "Amount",
      cell: ({ row }: { row: { getValue: (key: string) => string } }) => {
        const amount = Number.parseFloat(row.getValue("amount"))
        const formatted = new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "ETB",
        }).format(amount)
        return <div className="text-right font-medium">{formatted}</div>
      },
    },
    { accessorKey: "category", header: "Category" },
    {
      accessorKey: "date",
      header: "Date",
      cell: ({ row }: { row: { getValue: (key: string) => string } }) => format(new Date(row.getValue("date")), "PP"),
    },
    {
      accessorKey: "priority",
      header: "Priority",
      cell: ({ row }: { row: { getValue: (key: string) => string } }) => {
        const priority = row.getValue("priority")
        return (
          <Badge variant={priority === "High" ? "destructive" : priority === "Medium" ? "default" : "secondary"}>
            {priority}
          </Badge>
        )
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }: { row: { getValue: (key: string) => string } }) => {
        const status = row.getValue("status")
        return (
          <Badge 
            variant="outline"
            className={
              status === "Paid" 
                ? "bg-green-100 text-green-800 border-green-200" 
                : "bg-yellow-100 text-yellow-800 border-yellow-200"
            }
          >
            {status === "Paid" ? <CheckCircle className="w-3 h-3 mr-1" /> : <Clock className="w-3 h-3 mr-1" />}
            {status}
          </Badge>
        )
      },
    },
    {
      id: "actions",
      cell: ({ row }: { row: { original: Expense } }) => {
        const expense = row.original
        return (
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <BarChart className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Expense Details</DialogTitle>
                <DialogDescription>Full details for expense {expense.title}</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <span className="font-bold">Title:</span>
                  <span className="col-span-3">{expense.title}</span>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <span className="font-bold">Description:</span>
                  <span className="col-span-3">{expense.description}</span>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <span className="font-bold">Amount:</span>
                  <span className="col-span-3">
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: "ETB",
                    }).format(expense.amount)}
                  </span>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <span className="font-bold">Category:</span>
                  <span className="col-span-3">{expense.category}</span>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <span className="font-bold">Date:</span>
                  <span className="col-span-3">{format(new Date(expense.date), "PP")}</span>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <span className="font-bold">Tags:</span>
                  <span className="col-span-3">{expense.tags.join(", ")}</span>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <span className="font-bold">Recurring:</span>
                  <span className="col-span-3">{expense.recurring ? "Yes" : "No"}</span>
                </div>
                {expense.recurring && (
                  <div className="grid grid-cols-4 items-center gap-4">
                    <span className="font-bold">Frequency:</span>
                    <span className="col-span-3">{expense.frequency}</span>
                  </div>
                )}
                <div className="grid grid-cols-4 items-center gap-4">
                  <span className="font-bold">Priority:</span>
                  <span className="col-span-3">
                    <Badge
                      variant={
                        expense.priority === "High"
                          ? "destructive"
                          : expense.priority === "Medium"
                            ? "default"
                            : "secondary"
                      }
                    >
                      {expense.priority}
                    </Badge>
                  </span>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <span className="font-bold">Status:</span>
                  <span className="col-span-3">
                    <Badge 
                      variant="outline"
                      className={
                        expense.status === "Paid" 
                          ? "bg-green-100 text-green-800 border-green-200" 
                          : "bg-yellow-100 text-yellow-800 border-yellow-200"
                      }
                    >
                      {expense.status === "Paid" ? <CheckCircle className="w-3 h-3 mr-1" /> : <Clock className="w-3 h-3 mr-1" />}
                      {expense.status}
                    </Badge>
                  </span>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <span className="font-bold">Notes:</span>
                  <span className="col-span-3">{expense.notes}</span>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )
      },
    },
  ]

  if (isLoading) {
    return (
      <div className="flex-col md:flex">
        <div className="flex-1 space-y-4 p-8 pt-6">
          <Skeleton className="w-[250px] h-[36px]" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
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
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Expenses & Cash Dashboard</h2>
          <div className="flex items-center space-x-2">
            <Button
            onClick={() => router.push("expenses")}
            className="bg-blue-600 hover:bg-blue-700"
            variant="default"
            >
              <Wallet className="mr-2 h-4 w-4" />
              Daily expenses
            </Button>
            <Button 
              onClick={() => setShowDailyCash(true)} 
              variant="default"
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Wallet className="mr-2 h-4 w-4" />
              Daily Cash
            </Button>
            <Button onClick={() => handleExport('balance')} variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export Balance
            </Button>
            <Button onClick={() => handleExport(activeTab as 'overview' | 'analytics')} variant="outline">
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Export Expenses
            </Button>
          </div>
        </div>

        {/* Date Filter Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Date Range Filter
              </CardTitle>
              <div className="text-sm text-muted-foreground">
                Showing {filteredExpenses.length} expenses & {dailyBalances.length} days with cash
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={dateFilterType === 'all' ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleDateFilterChange('all')}
                >
                  All Time
                </Button>
                <Button
                  variant={dateFilterType === 'today' ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleDateFilterChange('today')}
                >
                  Today
                </Button>
                <Button
                  variant={dateFilterType === 'yesterday' ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleDateFilterChange('yesterday')}
                >
                  Yesterday
                </Button>
                <Button
                  variant={dateFilterType === 'week' ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleDateFilterChange('week')}
                >
                  This Week
                </Button>
                <Button
                  variant={dateFilterType === 'month' ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleDateFilterChange('month')}
                >
                  This Month
                </Button>
                <Button
                  variant={dateFilterType === 'year' ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleDateFilterChange('year')}
                >
                  This Year
                </Button>
                <Button
                  variant={dateFilterType === 'custom' ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleDateFilterChange('custom')}
                >
                  Custom Range
                </Button>
              </div>

              {dateFilterType === 'custom' && (
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <Label htmlFor="start-date">Start Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full mt-1 justify-start text-left font-normal"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
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
                    <Label htmlFor="end-date">End Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full mt-1 justify-start text-left font-normal"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
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

        <Tabs defaultValue="overview" className="space-y-4" onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="balance">Cash Balance</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-4">
            {/* Metrics Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: "ETB",
                    }).format(metrics.totalExpenses)}
                  </div>
                  <p className="text-xs text-muted-foreground">{metrics.totalCount} expenses</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Average Expense</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: "ETB",
                    }).format(metrics.averageExpense)}
                  </div>
                  <p className="text-xs text-muted-foreground">Per expense</p>
                </CardContent>
              </Card>
              <Card className="border-green-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-green-600">Paid Expenses</CardTitle>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: "ETB",
                    }).format(metrics.paidAmount)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {metrics.paidCount} expenses ({metrics.totalExpenses > 0 ? ((metrics.paidAmount / metrics.totalExpenses) * 100).toFixed(1) : 0}% of total)
                  </p>
                </CardContent>
              </Card>
              <Card className="border-yellow-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-yellow-600">Pending Expenses</CardTitle>
                  <Clock className="h-4 w-4 text-yellow-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-600">
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: "ETB",
                    }).format(metrics.pendingAmount)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {metrics.pendingCount} expenses ({metrics.totalExpenses > 0 ? ((metrics.pendingAmount / metrics.totalExpenses) * 100).toFixed(1) : 0}% of total)
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Charts Section */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
              <Card className="col-span-4">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Daily Expenses Trend by Status</CardTitle>
                    <Button variant="outline" size="sm" onClick={() => handleExport('overview')}>
                      <FileSpreadsheet className="mr-2 h-4 w-4" />
                      Export Data
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pl-2">
                  <ResponsiveContainer width="100%" height={350}>
                    <LineChart data={dailyChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis 
                        tickFormatter={(value) => new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: 'ETB',
                          minimumFractionDigits: 0
                        }).format(value)}
                      />
                      <Tooltip 
                        formatter={(value: number) => [new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: 'ETB',
                        }).format(value), 'Amount']}
                      />
                      <Legend />
                      <Line type="monotone" dataKey="total" stroke="#8884d8" name="Total" strokeWidth={2} />
                      <Line type="monotone" dataKey="paid" stroke={STATUS_COLORS.Paid} name="Paid" strokeWidth={2} />
                      <Line type="monotone" dataKey="pending" stroke={STATUS_COLORS.Pending} name="Pending" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card className="col-span-3">
                <CardHeader>
                  <CardTitle>Expense Status Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={350}>
                    <RechartsPieChart>
                      <Pie
                        data={statusBreakdownData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                        outerRadius={80}
                        dataKey="value"
                      >
                        {statusBreakdownData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: number) => [new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: 'ETB',
                        }).format(value), 'Amount']}
                      />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Expenses by Status Sections */}
            <div className="space-y-4">
              {/* Pending Expenses Section */}
              <Card className="border-yellow-200">
                <CardHeader className="bg-yellow-50/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-yellow-600" />
                      <CardTitle className="text-yellow-600">Pending Expenses ({pendingExpenses.length})</CardTitle>
                    </div>
                    <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">
                      Total: {new Intl.NumberFormat("en-US", { style: "currency", currency: "ETB" }).format(metrics.pendingAmount)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <Accordion type="multiple" defaultValue={["pending-list"]} className="w-full">
                    <AccordionItem value="pending-list">
                      <AccordionTrigger className="hover:no-underline">
                        <span className="text-sm font-medium">View Pending Expenses</span>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="rounded-md border mt-2">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                {columns.map((column) => (
                                  <TableHead key={column.accessorKey || column.id}>{column.header}</TableHead>
                                ))}
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {pendingExpenses.length > 0 ? (
                                pendingExpenses.map((expense) => (
                                  <TableRow key={expense._id} className="hover:bg-yellow-50/50">
                                    {columns.map((column) => (
                                      <TableCell key={`${expense._id}-${column.accessorKey || column.id}`}>
                                        {column.cell && column.accessorKey
                                          ? column.cell({
                                              row: { getValue: (key: string) => expense[key as keyof Expense], original: expense },
                                            } as any)
                                          : expense[column.accessorKey as keyof Expense]}
                                      </TableCell>
                                    ))}
                                  </TableRow>
                                ))
                              ) : (
                                <TableRow>
                                  <TableCell colSpan={columns.length} className="text-center py-8 text-muted-foreground">
                                    No pending expenses found
                                  </TableCell>
                                </TableRow>
                              )}
                            </TableBody>
                          </Table>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </CardContent>
              </Card>

              {/* Paid Expenses Section */}
              <Card className="border-green-200">
                <CardHeader className="bg-green-50/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <CardTitle className="text-green-600">Paid Expenses ({paidExpenses.length})</CardTitle>
                    </div>
                    <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
                      Total: {new Intl.NumberFormat("en-US", { style: "currency", currency: "ETB" }).format(metrics.paidAmount)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <Accordion type="multiple" defaultValue={["paid-list"]} className="w-full">
                    <AccordionItem value="paid-list">
                      <AccordionTrigger className="hover:no-underline">
                        <span className="text-sm font-medium">View Paid Expenses</span>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="rounded-md border mt-2">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                {columns.map((column) => (
                                  <TableHead key={column.accessorKey || column.id}>{column.header}</TableHead>
                                ))}
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {paidExpenses.length > 0 ? (
                                paidExpenses.map((expense) => (
                                  <TableRow key={expense._id} className="hover:bg-green-50/50">
                                    {columns.map((column) => (
                                      <TableCell key={`${expense._id}-${column.accessorKey || column.id}`}>
                                        {column.cell && column.accessorKey
                                          ? column.cell({
                                              row: { getValue: (key: string) => expense[key as keyof Expense], original: expense },
                                            } as any)
                                          : expense[column.accessorKey as keyof Expense]}
                                      </TableCell>
                                    ))}
                                  </TableRow>
                                ))
                              ) : (
                                <TableRow>
                                  <TableCell colSpan={columns.length} className="text-center py-8 text-muted-foreground">
                                    No paid expenses found
                                  </TableCell>
                                </TableRow>
                              )}
                            </TableBody>
                          </Table>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </CardContent>
              </Card>
            </div>

            {/* Category Distribution by Status */}
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-yellow-600" />
                    Pending Expenses by Category
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsPieChart>
                      <Pie
                        data={pendingCategoryData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                        outerRadius={80}
                        dataKey="value"
                      >
                        {pendingCategoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: number) => [new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: 'ETB',
                        }).format(value), 'Amount']}
                      />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Paid Expenses by Category
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsPieChart>
                      <Pie
                        data={paidCategoryData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                        outerRadius={80}
                        dataKey="value"
                      >
                        {paidCategoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: number) => [new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: 'ETB',
                        }).format(value), 'Amount']}
                      />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="balance" className="space-y-4">
            {/* Balance Summary Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Cash</CardTitle>
                  <Wallet className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: "ETB",
                    }).format(metrics.totalCash)}
                  </div>
                  <p className="text-xs text-muted-foreground">Over {metrics.balanceDays} days</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Paid Expenses</CardTitle>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: "ETB",
                    }).format(metrics.totalPaidExpenses)}
                  </div>
                  <p className="text-xs text-muted-foreground">Subtracted from cash</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending Expenses</CardTitle>
                  <Clock className="h-4 w-4 text-yellow-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-600">
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: "ETB",
                    }).format(metrics.totalPendingExpenses)}
                  </div>
                  <p className="text-xs text-muted-foreground">Still to be paid</p>
                </CardContent>
              </Card>

              <Card className="border-purple-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-purple-600">Net Balance</CardTitle>
                  <Calculator className="h-4 w-4 text-purple-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-600">
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: "ETB",
                    }).format(metrics.totalBalance)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Cash - Paid Expenses
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Balance Chart */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Daily Cash Balance Trend</CardTitle>
                  <div className="flex gap-2">
                    <Button
                      variant={balanceTab === 'daily' ? "default" : "outline"}
                      size="sm"
                      onClick={() => setBalanceTab('daily')}
                    >
                      Daily
                    </Button>
                    <Button
                      variant={balanceTab === 'summary' ? "default" : "outline"}
                      size="sm"
                      onClick={() => setBalanceTab('summary')}
                    >
                      Summary
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={balanceChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis 
                      tickFormatter={(value) => new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: 'ETB',
                        minimumFractionDigits: 0
                      }).format(value)}
                    />
                    <Tooltip 
                      formatter={(value: number) => [new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: 'ETB',
                      }).format(value), 'Amount']}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="totalCash" stroke="#3b82f6" name="Total Cash" strokeWidth={2} />
                    <Line type="monotone" dataKey="paidExpenses" stroke="#10b981" name="Paid Expenses" strokeWidth={2} />
                    <Line type="monotone" dataKey="balance" stroke="#8b5cf6" name="Balance" strokeWidth={3} />
                    <Line type="monotone" dataKey="pending" stroke="#f59e0b" name="Pending" strokeWidth={2} strokeDasharray="5 5" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Daily Balance Table */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Daily Balance Details</CardTitle>
                  <Button onClick={() => handleExport('balance')} variant="outline" size="sm">
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    Export Balance
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Cash</TableHead>
                        <TableHead className="text-right">Bank</TableHead>
                        <TableHead className="text-right">Total Cash</TableHead>
                        <TableHead className="text-right">Paid Expenses</TableHead>
                        <TableHead className="text-right">Balance</TableHead>
                        <TableHead className="text-right">Pending</TableHead>
                        <TableHead className="text-right">Remaining</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dailyBalances.slice(0, 10).map((balance) => (
                        <TableRow key={balance.date}>
                          <TableCell className="font-medium">{balance.formattedDate}</TableCell>
                          <TableCell className="text-right text-blue-600">
                            {new Intl.NumberFormat("en-US", { style: "currency", currency: "ETB" }).format(balance.cashAmount)}
                          </TableCell>
                          <TableCell className="text-right text-blue-600">
                            {new Intl.NumberFormat("en-US", { style: "currency", currency: "ETB" }).format(balance.bankAmount)}
                          </TableCell>
                          <TableCell className="text-right font-medium text-blue-600">
                            {new Intl.NumberFormat("en-US", { style: "currency", currency: "ETB" }).format(balance.totalCash)}
                          </TableCell>
                          <TableCell className="text-right text-green-600">
                            {new Intl.NumberFormat("en-US", { style: "currency", currency: "ETB" }).format(balance.paidExpenses)}
                          </TableCell>
                          <TableCell className={`text-right font-bold ${
                            balance.balance >= 0 ? 'text-purple-600' : 'text-red-600'
                          }`}>
                            {new Intl.NumberFormat("en-US", { style: "currency", currency: "ETB" }).format(balance.balance)}
                          </TableCell>
                          <TableCell className="text-right text-yellow-600">
                            {new Intl.NumberFormat("en-US", { style: "currency", currency: "ETB" }).format(balance.pendingExpenses)}
                          </TableCell>
                          <TableCell className={`text-right ${
                            balance.remainingPending > 0 ? 'text-yellow-600' : 'text-green-600'
                          }`}>
                            {new Intl.NumberFormat("en-US", { style: "currency", currency: "ETB" }).format(balance.remainingPending)}
                          </TableCell>
                          <TableCell className="text-center">
                            {balance.pendingExpenses > 0 ? (
                              <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
                                {balance.pendingCount} Pending
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-green-100 text-green-800">
                                All Paid
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {dailyBalances.length > 10 && (
                  <div className="mt-4 text-center text-sm text-muted-foreground">
                    Showing 10 of {dailyBalances.length} days. Use date filters to see more.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="analytics" className="space-y-4">
            {/* Analytics Filters */}
            <Card>
              <CardHeader>
                <CardTitle>Analytics Filters</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col space-y-4 md:flex-row md:space-x-4 md:space-y-0">
                  <div className="flex-1 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label>Search</Label>
                        <Input
                          placeholder="Search expenses..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label>Category</Label>
                        <Select value={filterCategory} onValueChange={setFilterCategory}>
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="All Categories" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Categories</SelectItem>
                            {Array.from(new Set(expenses.map((e) => e.category))).map((category) => (
                              <SelectItem key={category} value={category}>
                                {category}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Priority</Label>
                        <Select value={filterPriority} onValueChange={setFilterPriority}>
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="All Priorities" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Priorities</SelectItem>
                            <SelectItem value="High">High</SelectItem>
                            <SelectItem value="Medium">Medium</SelectItem>
                            <SelectItem value="Low">Low</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Status</Label>
                        <Select value={filterStatus} onValueChange={setFilterStatus}>
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="All Statuses" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Statuses</SelectItem>
                            <SelectItem value="Paid">Paid</SelectItem>
                            <SelectItem value="Pending">Pending</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Active Filters Summary */}
                {(filterCategory !== 'all' || filterPriority !== 'all' || filterStatus !== 'all' || dateFilterType !== 'all' || searchTerm) && (
                  <div className="mt-4 flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-muted-foreground">Active filters:</span>
                    {filterCategory !== 'all' && (
                      <Badge variant="secondary" className="gap-1">
                        Category: {filterCategory}
                        <button
                          onClick={() => setFilterCategory('all')}
                          className="ml-1 rounded-full hover:bg-muted"
                        >
                          ×
                        </button>
                      </Badge>
                    )}
                    {filterPriority !== 'all' && (
                      <Badge variant="secondary" className="gap-1">
                        Priority: {filterPriority}
                        <button
                          onClick={() => setFilterPriority('all')}
                          className="ml-1 rounded-full hover:bg-muted"
                        >
                          ×
                        </button>
                      </Badge>
                    )}
                    {filterStatus !== 'all' && (
                      <Badge variant="secondary" className="gap-1">
                        Status: {filterStatus}
                        <button
                          onClick={() => setFilterStatus('all')}
                          className="ml-1 rounded-full hover:bg-muted"
                        >
                          ×
                        </button>
                      </Badge>
                    )}
                    {dateFilterType !== 'all' && (
                      <Badge variant="secondary" className="gap-1">
                        Date: {dateFilterType}
                        <button
                          onClick={() => setDateFilterType('all')}
                          className="ml-1 rounded-full hover:bg-muted"
                        >
                          ×
                        </button>
                      </Badge>
                    )}
                    {searchTerm && (
                      <Badge variant="secondary" className="gap-1">
                        Search: {searchTerm}
                        <button
                          onClick={() => setSearchTerm('')}
                          className="ml-1 rounded-full hover:bg-muted"
                        >
                          ×
                        </button>
                      </Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setFilterCategory('all')
                        setFilterPriority('all')
                        setFilterStatus('all')
                        setDateFilterType('all')
                        setSearchTerm('')
                        setCustomStartDate(null)
                        setCustomEndDate(null)
                      }}
                      className="ml-auto"
                    >
                      Clear All Filters
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Status Breakdown Cards */}
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="border-yellow-200">
                <CardHeader className="bg-yellow-50/50 pb-2">
                  <CardTitle className="flex items-center gap-2 text-yellow-600">
                    <Clock className="h-5 w-5" />
                    Pending Expenses Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Total Pending Amount:</span>
                      <span className="text-xl font-bold text-yellow-600">
                        {new Intl.NumberFormat("en-US", { style: "currency", currency: "ETB" }).format(metrics.pendingAmount)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Number of Pending Expenses:</span>
                      <span className="text-xl font-bold">{metrics.pendingCount}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Average Pending Amount:</span>
                      <span className="text-lg font-semibold">
                        {new Intl.NumberFormat("en-US", { style: "currency", currency: "ETB" }).format(
                          metrics.pendingCount > 0 ? metrics.pendingAmount / metrics.pendingCount : 0
                        )}
                      </span>
                    </div>
                    <Separator />
                    <div className="mt-2">
                      <h4 className="text-sm font-medium mb-2">Top Pending Categories</h4>
                      {pendingCategoryData.slice(0, 3).map((cat, idx) => (
                        <div key={cat.name} className="flex justify-between items-center py-1">
                          <span className="text-sm">{cat.name}</span>
                          <span className="text-sm font-medium">
                            {new Intl.NumberFormat("en-US", { style: "currency", currency: "ETB" }).format(cat.value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-green-200">
                <CardHeader className="bg-green-50/50 pb-2">
                  <CardTitle className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="h-5 w-5" />
                    Paid Expenses Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Total Paid Amount:</span>
                      <span className="text-xl font-bold text-green-600">
                        {new Intl.NumberFormat("en-US", { style: "currency", currency: "ETB" }).format(metrics.paidAmount)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Number of Paid Expenses:</span>
                      <span className="text-xl font-bold">{metrics.paidCount}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Average Paid Amount:</span>
                      <span className="text-lg font-semibold">
                        {new Intl.NumberFormat("en-US", { style: "currency", currency: "ETB" }).format(
                          metrics.paidCount > 0 ? metrics.paidAmount / metrics.paidCount : 0
                        )}
                      </span>
                    </div>
                    <Separator />
                    <div className="mt-2">
                      <h4 className="text-sm font-medium mb-2">Top Paid Categories</h4>
                      {paidCategoryData.slice(0, 3).map((cat, idx) => (
                        <div key={cat.name} className="flex justify-between items-center py-1">
                          <span className="text-sm">{cat.name}</span>
                          <span className="text-sm font-medium">
                            {new Intl.NumberFormat("en-US", { style: "currency", currency: "ETB" }).format(cat.value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Category Breakdown Chart */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Category Breakdown by Status</CardTitle>
                  <Button onClick={() => handleExport('analytics')} variant="outline" size="sm">
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    Export Analytics
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <RechartsBarChart
                    data={categoryData}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      type="number"
                      tickFormatter={(value) => new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: 'ETB',
                        minimumFractionDigits: 0
                      }).format(value)}
                    />
                    <YAxis type="category" dataKey="name" width={100} />
                    <Tooltip 
                      formatter={(value: number) => [new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: 'ETB',
                      }).format(value), 'Amount']}
                    />
                    <Legend />
                    <Bar dataKey="value" fill="#8884d8" name="Total" />
                  </RechartsBarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Detailed Expenses Table */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Detailed Expenses ({filteredExpenses.length})</CardTitle>
                  <div className="flex items-center gap-2">
                    <Select value={sortBy} onValueChange={(value) => setSortBy(value as keyof Expense)}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Sort by" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="date">Date</SelectItem>
                        <SelectItem value="amount">Amount</SelectItem>
                        <SelectItem value="title">Title</SelectItem>
                        <SelectItem value="category">Category</SelectItem>
                        <SelectItem value="priority">Priority</SelectItem>
                        <SelectItem value="status">Status</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                    >
                      {sortOrder === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {columns.map((column) => (
                          <TableHead key={column.accessorKey || column.id}>{column.header}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredExpenses.map((expense) => (
                        <TableRow key={expense._id}>
                          {columns.map((column) => (
                            <TableCell key={`${expense._id}-${column.accessorKey || column.id}`}>
                              {column.cell && column.accessorKey
                                ? column.cell({
                                    row: { getValue: (key: string) => expense[key as keyof Expense], original: expense },
                                  } as any)
                                : expense[column.accessorKey as keyof Expense]}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Daily Cash Dialog */}
      <Dialog open={showDailyCash} onOpenChange={setShowDailyCash}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Daily Cash Management
            </DialogTitle>
            <DialogDescription>
              Manage daily cash transactions, openings, and closings
            </DialogDescription>
          </DialogHeader>
          <DailyCash />
        </DialogContent>
      </Dialog>
    </div>
  )
}