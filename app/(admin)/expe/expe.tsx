"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BarChart, DollarSign, Download, PieChart, RefreshCcw, Filter, CalendarDays, TrendingUp } from "lucide-react"
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
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns"
import { ArrowDown, ArrowUp, CalendarIcon, FileSpreadsheet } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"

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

type DateFilterType = 'today' | 'yesterday' | 'week' | 'month' | 'year' | 'custom' | 'all'

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82CA9D"]

async function fetchExpenses(): Promise<Expense[]> {
  const response = await fetch("/api/expense")
  const data = await response.json()
  return data.data
}

function exportToExcel(data: Expense[], filename: string) {
  const exportData = data.map(expense => ({
    'Title': expense.title,
    'Description': expense.description,
    'Amount (ETB)': expense.amount,
    'Category': expense.category,
    'Date': format(new Date(expense.date), 'yyyy-MM-dd'),
    'Tags': expense.tags.join(', '),
    'Recurring': expense.recurring ? 'Yes' : 'No',
    'Frequency': expense.frequency,
    'Priority': expense.priority,
    'Status': expense.status,
    'Notes': expense.notes,
  }))
  
  const worksheet = XLSX.utils.json_to_sheet(exportData)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, "Expenses")
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
  const [filteredExpenses, setFilteredExpenses] = useState<Expense[]>([])
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

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      const data = await fetchExpenses()
      setExpenses(data)
      setFilteredExpenses(data)
      setIsLoading(false)
    }
    loadData()
  }, [])

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

  const handleExport = (section: 'overview' | 'analytics') => {
    const filename = section === 'overview' ? 'expenses_overview_report' : 'expenses_analytics_report'
    exportToExcel(filteredExpenses, filename)
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

    return {
      totalExpenses,
      averageExpense,
      highPriorityCount,
      recurringCount,
      paidAmount,
      pendingAmount,
      totalCount: filteredExpenses.length
    }
  }

  const metrics = calculateMetrics()

  const getChartData = () => {
    const dailyData: Record<string, number> = {}
    filteredExpenses.forEach(expense => {
      const date = format(new Date(expense.date), 'MMM dd')
      dailyData[date] = (dailyData[date] || 0) + expense.amount
    })
    
    return Object.entries(dailyData)
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }

  const getCategoryData = () => {
    const categoryData = filteredExpenses.reduce(
      (acc, expense) => {
        acc[expense.category] = (acc[expense.category] || 0) + expense.amount
        return acc
      },
      {} as Record<string, number>,
    )

    return Object.entries(categoryData).map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10) // Top 10 categories
  }

  const dailyChartData = getChartData()
  const categoryData = getCategoryData()
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
        return <Badge variant={status === "Paid" ? "default" : "secondary"}>{status}</Badge>
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
                    <Badge variant={expense.status === "Paid" ? "default" : "secondary"}>{expense.status}</Badge>
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
          <h2 className="text-3xl font-bold tracking-tight">Expenses Dashboard</h2>
          <div className="flex items-center space-x-2">
            <Button onClick={() => handleExport(activeTab as 'overview' | 'analytics')} variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export to Excel
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
                Showing {filteredExpenses.length} of {expenses.length} expenses
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

              {dateFilterType !== 'all' && (
                <div className="mt-2 text-sm text-muted-foreground">
                  Showing expenses from:{" "}
                  <span className="font-medium">
                    {dateFilterType === 'custom' && customStartDate && customEndDate
                      ? `${format(customStartDate, "PPP")} to ${format(customEndDate, "PPP")}`
                      : format(getDateRange(dateFilterType).start, "PPP")}
                    {dateFilterType !== 'custom' && (
                      <>
                        {" to "}
                        {format(getDateRange(dateFilterType).end, "PPP")}
                      </>
                    )}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="overview" className="space-y-4" onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
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
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Paid Expenses</CardTitle>
                  <BarChart className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: "ETB",
                    }).format(metrics.paidAmount)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {metrics.totalExpenses > 0 ? ((metrics.paidAmount / metrics.totalExpenses) * 100).toFixed(1) : 0}% of total
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending Expenses</CardTitle>
                  <RefreshCcw className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: "ETB",
                    }).format(metrics.pendingAmount)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {metrics.totalExpenses > 0 ? ((metrics.pendingAmount / metrics.totalExpenses) * 100).toFixed(1) : 0}% of total
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Charts Section */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
              <Card className="col-span-4">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Daily Expenses Trend</CardTitle>
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
                        formatter={(value) => [new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: 'ETB',
                        }).format(value as number), 'Amount']}
                      />
                      <Legend />
                      <Line type="monotone" dataKey="amount" stroke="#8884d8" activeDot={{ r: 8 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card className="col-span-3">
                <CardHeader>
                  <CardTitle>Expense Distribution by Category</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={350}>
                    <RechartsPieChart>
                      <Pie
                        data={pieChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {pieChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value) => [new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: 'ETB',
                        }).format(value as number), 'Amount']}
                      />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Top Expenses Table */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Recent Expenses</CardTitle>
                  <div className="flex items-center gap-2">
                    <Select value={sortBy} onValueChange={(value) => setSortBy(value as keyof Expense)}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Sort by" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="date">Date</SelectItem>
                        <SelectItem value="amount">Amount</SelectItem>
                        <SelectItem value="title">Title</SelectItem>
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
                      {filteredExpenses.slice(0, 10).map((expense) => (
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
                  <div className="mt-4 flex items-center gap-2">
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

            {/* Category Breakdown Chart */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Category Breakdown</CardTitle>
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
                      formatter={(value) => [new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: 'ETB',
                      }).format(value as number), 'Amount']}
                    />
                    <Legend />
                    <Bar dataKey="value" fill="#8884d8" />
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
    </div>
  )
}