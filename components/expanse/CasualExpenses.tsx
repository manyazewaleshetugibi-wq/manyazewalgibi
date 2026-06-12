// components/CasualExpenses.tsx

"use client"

import { useState, useEffect, useMemo } from "react"
import { format, eachDayOfInterval } from "date-fns"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Skeleton } from "@/components/ui/skeleton"
import { Toaster, toast } from "react-hot-toast"
import { cn } from "@/lib/utils"
import { CalendarIcon, Filter, LayoutGrid, LayoutList, Plus, Search, TrendingUp, XCircle } from "lucide-react"
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, AreaChart, Area, LineChart, Line } from "recharts"
import { casualApi } from "@/services/expense.service"
import { CasualExpense, CostFormData, SortConfig, DateFilterType } from "@/types/expense.types"
import { formatCurrency, formatShortCurrency, getDateRange, casualCategories } from "@/lib/utils/expense.utils"
import { ExpenseFormModal } from "../expanse/ExpenseFormModal"
import { ExpenseTable } from "../expanse/ExpenseTable"
import { ExpenseCard } from "../expanse/ExpenseCard"

export function CasualExpenses() {
  const [expenses, setExpenses] = useState<CasualExpense[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [isUpdating, setIsUpdating] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterCategory, setFilterCategory] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<CasualExpense["status"] | null>(null)
  const [viewMode, setViewMode] = useState<"table" | "grid">("table")
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: "date", direction: "desc" })
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [dateFilterType, setDateFilterType] = useState<DateFilterType>('today')
  const [customStartDate, setCustomStartDate] = useState<Date | null>(null)
  const [customEndDate, setCustomEndDate] = useState<Date | null>(null)
  const [chartView, setChartView] = useState<'bar' | 'area' | 'line'>('bar')

  const fetchExpenses = async () => {
    setIsLoading(true)
    try {
      const data = await casualApi.getCosts()
      setExpenses(data)
    } catch (error) {
      console.error("Error fetching expenses:", error)
      toast.error("Failed to load expenses")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchExpenses()
  }, [])

  const getFilteredExpensesByDate = useMemo(() => {
    const { start, end } = getDateRange(dateFilterType, customStartDate || undefined, customEndDate || undefined)
    return expenses.filter(expense => {
      const expenseDate = new Date(expense.date)
      return expenseDate >= start && expenseDate <= end
    })
  }, [expenses, dateFilterType, customStartDate, customEndDate])

  const chartData = useMemo(() => {
    const { start, end } = getDateRange(dateFilterType, customStartDate || undefined, customEndDate || undefined)
    const dates = eachDayOfInterval({ start, end })
    
    return dates.map(date => {
      const dateStr = format(date, 'yyyy-MM-dd')
      const dailyTotal = getFilteredExpensesByDate
        .filter(e => e.date && e.date.startsWith(dateStr) && e.status === 'Paid')
        .reduce((sum, e) => sum + e.amount, 0)
      
      return {
        date: format(date, 'MMM dd'),
        fullDate: dateStr,
        Amount: dailyTotal,
      }
    })
  }, [getFilteredExpensesByDate, dateFilterType, customStartDate, customEndDate])

  const filteredExpenses = useMemo(() => {
    return getFilteredExpensesByDate
      .filter((expense) =>
        expense.title?.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .filter((expense) => !filterCategory || expense.category === filterCategory)
      .filter((expense) => !filterStatus || expense.status === filterStatus)
      .sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === "asc" ? -1 : 1
        if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === "asc" ? 1 : -1
        return 0
      })
  }, [getFilteredExpensesByDate, searchTerm, filterCategory, filterStatus, sortConfig])

  const totalAmount = filteredExpenses.reduce((sum, e) => sum + e.amount, 0)
  const uniqueCategories = useMemo(() => [...new Set(expenses.map(e => e.category))], [expenses])

  const handleAddExpense = async (formData: CostFormData) => {
    setIsAdding(true)
    try {
      const expenseData = {
        ...formData,
        date: formData.date.toISOString(),
        tags: typeof formData.tags === "string" ? formData.tags.split(",").map((tag) => tag.trim()) : formData.tags,
      }
      const response = await casualApi.addCost(expenseData)
      if (response.success || response.data) {
        const newExpense = response.data || response
        setExpenses((prev) => [newExpense, ...prev])
        toast.success("Expense added successfully!")
        setIsDialogOpen(false)
      }
    } catch (error) {
      toast.error("Failed to add expense")
    } finally {
      setIsAdding(false)
    }
  }

  const handleUpdateExpense = async (id: string, formData: CostFormData) => {
    setIsUpdating(id)
    try {
      const expenseData = {
        ...formData,
        date: formData.date.toISOString(),
        tags: typeof formData.tags === "string" ? formData.tags.split(",").map((tag) => tag.trim()) : formData.tags,
      }
      const response = await casualApi.updateCost(id, expenseData)
      if (response.success || response.data) {
        const updatedExpense = response.data || response
        setExpenses((prev) => prev.map((exp) => exp._id === id ? updatedExpense : exp))
        toast.success("Expense updated successfully!")
      }
    } catch (error) {
      toast.error("Failed to update expense")
    } finally {
      setIsUpdating(null)
    }
  }

  const handleDeleteExpense = async (id: string) => {
    try {
      await casualApi.deleteCost(id)
      setExpenses((prev) => prev.filter((exp) => exp._id !== id))
      toast.success("Expense deleted successfully!")
    } catch (error) {
      toast.error("Failed to delete expense")
    }
  }

  const handleSort = (key: keyof CasualExpense) => {
    setSortConfig((current) => ({
      key,
      direction: current.key === key && current.direction === "asc" ? "desc" : "asc",
    }))
  }

  const getDateDisplayText = () => {
    const { start, end } = getDateRange(dateFilterType, customStartDate || undefined, customEndDate || undefined)
    switch (dateFilterType) {
      case 'today': return 'Today'
      case 'yesterday': return 'Yesterday'
      case 'week': return `Week of ${format(start, 'MMM dd')}`
      case 'month': return format(start, 'MMMM yyyy')
      case 'custom': return `${format(start, 'MMM dd')} - ${format(end, 'MMM dd, yyyy')}`
      default: return 'Today'
    }
  }

  const renderChart = () => {
    const commonProps = {
      data: chartData,
      margin: { top: 20, right: 30, left: 20, bottom: 5 }
    }

    switch (chartView) {
      case 'bar':
        return (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="date" />
            <YAxis tickFormatter={(v) => formatShortCurrency(v)} />
            <RechartsTooltip formatter={(value: number) => formatCurrency(value)} />
            <Bar dataKey="Amount" fill="#f59e0b" radius={[4, 4, 0, 0]} />
          </BarChart>
        )
      case 'area':
        return (
          <AreaChart {...commonProps}>
            <defs>
              <linearGradient id="casualGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.1}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="date" />
            <YAxis tickFormatter={(v) => formatShortCurrency(v)} />
            <RechartsTooltip formatter={(value: number) => formatCurrency(value)} />
            <Area type="monotone" dataKey="Amount" stroke="#f59e0b" fill="url(#casualGradient)" />
          </AreaChart>
        )
      case 'line':
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="date" />
            <YAxis tickFormatter={(v) => formatShortCurrency(v)} />
            <RechartsTooltip formatter={(value: number) => formatCurrency(value)} />
            <Line type="monotone" dataKey="Amount" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} />
          </LineChart>
        )
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Casual Expenses</h2>
          <p className="text-muted-foreground">One-time and unexpected expenses</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search expenses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 w-[200px]"
            />
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <Filter className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[200px]">
              <DropdownMenuLabel>Filter Expenses</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setFilterCategory(null)}>All Categories</DropdownMenuItem>
              {uniqueCategories.map((category) => (
                <DropdownMenuItem key={category} onClick={() => setFilterCategory(category)}>
                  {category}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setFilterStatus(null)}>All Statuses</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterStatus("Paid")}>Paid</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterStatus("Pending")}>Pending</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <div className="flex border rounded-md overflow-hidden">
            <Button
              variant={viewMode === 'table' ? 'default' : 'ghost'}
              size="sm"
              className="rounded-none px-3"
              onClick={() => setViewMode('table')}
            >
              <LayoutList className="h-4 w-4 mr-2" />
              Table
            </Button>
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              className="rounded-none px-3"
              onClick={() => setViewMode('grid')}
            >
              <LayoutGrid className="h-4 w-4 mr-2" />
              Grid
            </Button>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button disabled={isAdding}>
                <Plus className="mr-2 h-4 w-4" /> Add Expense
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[650px] bg-white p-6 rounded-lg shadow-lg z-50">
              <DialogHeader>
                <DialogTitle>Add New Casual Expense</DialogTitle>
                <DialogDescription>Fill in the details below to add a new expense.</DialogDescription>
              </DialogHeader>
              <ExpenseFormModal onSubmit={handleAddExpense} onClose={() => setIsDialogOpen(false)} loading={isAdding} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Date Filter Bar */}
      <Card className="rounded-2xl border-0 shadow-lg">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap gap-2">
              {['today', 'yesterday', 'week', 'month'].map((filter) => (
                <Button
                  key={filter}
                  variant={dateFilterType === filter ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setDateFilterType(filter as DateFilterType)
                    setCustomStartDate(null)
                    setCustomEndDate(null)
                  }}
                  className="rounded-full px-4 capitalize"
                >
                  {filter === 'today' ? 'Today' : filter === 'yesterday' ? 'Yesterday' : filter === 'week' ? 'This Week' : 'This Month'}
                </Button>
              ))}
              <Button
                variant={dateFilterType === 'custom' ? "default" : "outline"}
                size="sm"
                onClick={() => setDateFilterType('custom')}
                className="rounded-full px-4"
              >
                Custom
              </Button>
            </div>
            <Badge variant="secondary" className="rounded-full px-4 py-2">
              <CalendarIcon className="h-3 w-3 mr-1" />
              {getDateDisplayText()}
            </Badge>
          </div>
          
          {dateFilterType === 'custom' && (
            <div className="flex gap-4 mt-4">
              <div>
                <label className="text-sm font-medium">Start Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="ml-2">
                      {customStartDate ? format(customStartDate, "PPP") : "Select"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent>
                    <Calendar mode="single" selected={customStartDate || undefined} onSelect={setCustomStartDate} />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <label className="text-sm font-medium">End Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="ml-2">
                      {customEndDate ? format(customEndDate, "PPP") : "Select"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent>
                    <Calendar mode="single" selected={customEndDate || undefined} onSelect={setCustomEndDate} />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Chart Section */}
      <Card className="rounded-2xl border-0 shadow-lg overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Expense Trends</CardTitle>
            <CardDescription>Daily casual expenses over time</CardDescription>
          </div>
          <div className="flex gap-1">
            <Button variant={chartView === 'bar' ? "default" : "outline"} size="sm" onClick={() => setChartView('bar')}>
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button variant={chartView === 'area' ? "default" : "outline"} size="sm" onClick={() => setChartView('area')}>
              <TrendingUp className="h-4 w-4" />
            </Button>
            <Button variant={chartView === 'line' ? "default" : "outline"} size="sm" onClick={() => setChartView('line')}>
              <TrendingUp className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            {renderChart()}
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Filter Chips */}
      {(filterCategory || filterStatus) && (
        <div className="flex flex-wrap gap-2">
          <span className="text-sm text-muted-foreground">Active filters:</span>
          {filterCategory && (
            <Badge variant="secondary" className="gap-1">
              Category: {filterCategory}
              <XCircle className="h-3 w-3 ml-1 cursor-pointer" onClick={() => setFilterCategory(null)} />
            </Badge>
          )}
          {filterStatus && (
            <Badge variant="secondary" className="gap-1">
              Status: {filterStatus}
              <XCircle className="h-3 w-3 ml-1 cursor-pointer" onClick={() => setFilterStatus(null)} />
            </Badge>
          )}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-amber-50 to-amber-100">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Expenses</p>
            <p className="text-2xl font-bold text-amber-600">{filteredExpenses.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-50 to-green-100">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Amount</p>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(totalAmount)}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Paid Expenses</p>
            <p className="text-2xl font-bold text-blue-600">{getFilteredExpensesByDate.filter(e => e.status === 'Paid').length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Expenses Display */}
      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, index) => (
                <Skeleton key={index} className="h-20 w-full" />
              ))}
            </div>
          ) : filteredExpenses.length === 0 ? (
            <div className="flex h-[200px] items-center justify-center">
              <p className="text-muted-foreground">No expenses found.</p>
            </div>
          ) : viewMode === "table" ? (
            <ExpenseTable
              expenses={filteredExpenses}
              sortConfig={sortConfig}
              onSort={handleSort}
              onUpdate={handleUpdateExpense}
              onDelete={handleDeleteExpense}
              updatingId={isUpdating}
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredExpenses.map((expense) => (
                <ExpenseCard 
                  key={expense._id} 
                  expense={expense} 
                  onUpdate={handleUpdateExpense} 
                  onDelete={handleDeleteExpense}
                  isUpdating={isUpdating === expense._id}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      <Toaster position="top-right" />
    </div>
  )
}