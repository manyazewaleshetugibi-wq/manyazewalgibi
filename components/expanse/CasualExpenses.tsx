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
import { CalendarIcon, Filter, LayoutGrid, LayoutList, Plus, Search, TrendingUp, XCircle, Sparkles, ArrowUpRight, ArrowDownRight, Clock, CheckCircle2, AlertCircle } from "lucide-react"
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

  // Stats for dashboard cards
  const paidCount = getFilteredExpensesByDate.filter(e => e.status === 'Paid').length
  const pendingCount = getFilteredExpensesByDate.filter(e => e.status === 'Pending').length
  const paidAmount = getFilteredExpensesByDate.filter(e => e.status === 'Paid').reduce((sum, e) => sum + e.amount, 0)
  const pendingAmount = getFilteredExpensesByDate.filter(e => e.status === 'Pending').reduce((sum, e) => sum + e.amount, 0)

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
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
            <YAxis tickFormatter={(v) => formatShortCurrency(v)} tick={{ fontSize: 12 }} />
            <RechartsTooltip 
              formatter={(value: number) => [formatCurrency(value), 'Amount']}
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
            />
            <Bar dataKey="Amount" fill="#F59E0B" radius={[6, 6, 0, 0]} />
          </BarChart>
        )
      case 'area':
        return (
          <AreaChart {...commonProps}>
            <defs>
              <linearGradient id="casualGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.05}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
            <YAxis tickFormatter={(v) => formatShortCurrency(v)} tick={{ fontSize: 12 }} />
            <RechartsTooltip 
              formatter={(value: number) => [formatCurrency(value), 'Amount']}
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
            />
            <Area type="monotone" dataKey="Amount" stroke="#F59E0B" strokeWidth={2} fill="url(#casualGradient)" />
          </AreaChart>
        )
      case 'line':
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
            <YAxis tickFormatter={(v) => formatShortCurrency(v)} tick={{ fontSize: 12 }} />
            <RechartsTooltip 
              formatter={(value: number) => [formatCurrency(value), 'Amount']}
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
            />
            <Line type="monotone" dataKey="Amount" stroke="#F59E0B" strokeWidth={3} dot={{ r: 5, fill: "#F59E0B" }} />
          </LineChart>
        )
    }
  }

  return (
    <div className="space-y-6">
      {/* Header with Gradient */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-500" />
            <h2 className="text-2xl font-bold bg-gradient-to-r from-amber-600 to-amber-400 bg-clip-text text-transparent">
              Casual Expenses
            </h2>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">Track one-time and unexpected expenses</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search expenses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 w-[180px] sm:w-[200px] rounded-full border-2 focus:border-amber-400 transition-colors"
            />
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="rounded-full border-2 hover:border-amber-400 transition-colors">
                <Filter className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[200px] rounded-xl">
              <DropdownMenuLabel>Filter Expenses</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setFilterCategory(null)} className="rounded-lg">All Categories</DropdownMenuItem>
              {uniqueCategories.map((category) => (
                <DropdownMenuItem key={category} onClick={() => setFilterCategory(category)} className="rounded-lg">
                  {category}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setFilterStatus(null)} className="rounded-lg">All Statuses</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterStatus("Paid")} className="rounded-lg text-emerald-600">
                <CheckCircle2 className="h-4 w-4 mr-2" /> Paid
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterStatus("Pending")} className="rounded-lg text-amber-600">
                <Clock className="h-4 w-4 mr-2" /> Pending
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <div className="flex border-2 rounded-full overflow-hidden">
            <Button
              variant={viewMode === 'table' ? 'default' : 'ghost'}
              size="sm"
              className={`rounded-full px-3 ${viewMode === 'table' ? 'bg-amber-500 hover:bg-amber-600' : 'hover:bg-amber-50'}`}
              onClick={() => setViewMode('table')}
            >
              <LayoutList className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Table</span>
            </Button>
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              className={`rounded-full px-3 ${viewMode === 'grid' ? 'bg-amber-500 hover:bg-amber-600' : 'hover:bg-amber-50'}`}
              onClick={() => setViewMode('grid')}
            >
              <LayoutGrid className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Grid</span>
            </Button>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button disabled={isAdding} className="rounded-full bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-600 hover:to-amber-500 shadow-lg shadow-amber-500/25 transition-all hover:shadow-xl">
                <Plus className="mr-2 h-4 w-4" /> Add Expense
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[650px] rounded-2xl border-0 shadow-2xl">
              <DialogHeader>
                <DialogTitle className="text-2xl">Add New Casual Expense</DialogTitle>
                <DialogDescription>Fill in the details below to add a new expense.</DialogDescription>
              </DialogHeader>
              <ExpenseFormModal onSubmit={handleAddExpense} onClose={() => setIsDialogOpen(false)} loading={isAdding} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Date Filter Bar - Enhanced */}
      <Card className="rounded-2xl border-0 shadow-lg bg-gradient-to-r from-amber-50/50 to-amber-100/30 dark:from-amber-950/20 dark:to-amber-900/10 backdrop-blur-sm">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap gap-1.5">
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
                  className={`rounded-full px-4 capitalize transition-all ${
                    dateFilterType === filter 
                      ? 'bg-amber-500 hover:bg-amber-600 shadow-lg shadow-amber-500/25' 
                      : 'hover:border-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30'
                  }`}
                >
                  {filter === 'today' ? '📅 Today' : filter === 'yesterday' ? '📆 Yesterday' : filter === 'week' ? '📊 Week' : '📈 Month'}
                </Button>
              ))}
              <Button
                variant={dateFilterType === 'custom' ? "default" : "outline"}
                size="sm"
                onClick={() => setDateFilterType('custom')}
                className={`rounded-full px-4 transition-all ${
                  dateFilterType === 'custom' 
                    ? 'bg-amber-500 hover:bg-amber-600 shadow-lg shadow-amber-500/25' 
                    : 'hover:border-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30'
                }`}
              >
                🗓️ Custom
              </Button>
            </div>
            <Badge variant="secondary" className="rounded-full px-4 py-2 bg-white/50 dark:bg-black/20 backdrop-blur-sm">
              <CalendarIcon className="h-3 w-3 mr-1.5 text-amber-500" />
              {getDateDisplayText()}
            </Badge>
          </div>
          
          {dateFilterType === 'custom' && (
            <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-amber-200/30">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">From</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="rounded-full border-2 hover:border-amber-400 transition-colors">
                      {customStartDate ? format(customStartDate, "PPP") : "Select Date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="rounded-xl border-0 shadow-xl">
                    <Calendar mode="single" selected={customStartDate || undefined} onSelect={(day) => setCustomStartDate(day ?? null)} />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">To</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="rounded-full border-2 hover:border-amber-400 transition-colors">
                      {customEndDate ? format(customEndDate, "PPP") : "Select Date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="rounded-xl border-0 shadow-xl">
                    <Calendar mode="single" selected={customEndDate || undefined} onSelect={setCustomEndDate} />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Chart Section - Enhanced */}
      <Card className="rounded-2xl border-0 shadow-lg overflow-hidden bg-gradient-to-br from-white to-amber-50/30 dark:from-gray-900 dark:to-amber-950/20">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-amber-500" />
              Expense Trends
            </CardTitle>
            <CardDescription>Daily casual expenses over time</CardDescription>
          </div>
          <div className="flex gap-1 bg-muted/50 rounded-full p-1">
            <Button 
              variant={chartView === 'bar' ? "default" : "ghost"} 
              size="sm" 
              onClick={() => setChartView('bar')}
              className={`rounded-full ${chartView === 'bar' ? 'bg-amber-500 hover:bg-amber-600' : ''}`}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button 
              variant={chartView === 'area' ? "default" : "ghost"} 
              size="sm" 
              onClick={() => setChartView('area')}
              className={`rounded-full ${chartView === 'area' ? 'bg-amber-500 hover:bg-amber-600' : ''}`}
            >
              <TrendingUp className="h-4 w-4" />
            </Button>
            <Button 
              variant={chartView === 'line' ? "default" : "ghost"} 
              size="sm" 
              onClick={() => setChartView('line')}
              className={`rounded-full ${chartView === 'line' ? 'bg-amber-500 hover:bg-amber-600' : ''}`}
            >
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

      {/* Enhanced Filter Chips */}
      {(filterCategory || filterStatus || searchTerm) && (
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-sm text-muted-foreground font-medium">Active filters:</span>
          {filterCategory && (
            <Badge variant="secondary" className="gap-1 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border-0">
              Category: {filterCategory}
              <XCircle className="h-3 w-3 ml-1 cursor-pointer hover:text-red-500 transition-colors" onClick={() => setFilterCategory(null)} />
            </Badge>
          )}
          {filterStatus && (
            <Badge variant="secondary" className={`gap-1 rounded-full border-0 ${filterStatus === 'Paid' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'}`}>
              Status: {filterStatus}
              <XCircle className="h-3 w-3 ml-1 cursor-pointer hover:text-red-500 transition-colors" onClick={() => setFilterStatus(null)} />
            </Badge>
          )}
          {searchTerm && (
            <Badge variant="secondary" className="gap-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-0">
              Search: "{searchTerm}"
              <XCircle className="h-3 w-3 ml-1 cursor-pointer hover:text-red-500 transition-colors" onClick={() => setSearchTerm("")} />
            </Badge>
          )}
        </div>
      )}

      {/* Enhanced Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/30 dark:to-amber-900/20 border-0 shadow-md hover:shadow-lg transition-shadow">
          <CardContent className="pt-4 sm:pt-6">
            <p className="text-xs sm:text-sm text-muted-foreground">Total Expenses</p>
            <p className="text-xl sm:text-2xl font-bold text-amber-600">{filteredExpenses.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/30 dark:to-emerald-900/20 border-0 shadow-md hover:shadow-lg transition-shadow">
          <CardContent className="pt-4 sm:pt-6">
            <p className="text-xs sm:text-sm text-muted-foreground">Total Amount</p>
            <p className="text-xl sm:text-2xl font-bold text-emerald-600">{formatCurrency(totalAmount)}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/20 border-0 shadow-md hover:shadow-lg transition-shadow">
          <CardContent className="pt-4 sm:pt-6">
            <p className="text-xs sm:text-sm text-muted-foreground">Paid</p>
            <div className="flex items-end gap-2">
              <p className="text-xl sm:text-2xl font-bold text-green-600">{paidCount}</p>
              <span className="text-xs text-muted-foreground">{formatCurrency(paidAmount)}</span>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/30 dark:to-amber-900/20 border-0 shadow-md hover:shadow-lg transition-shadow">
          <CardContent className="pt-4 sm:pt-6">
            <p className="text-xs sm:text-sm text-muted-foreground">Pending</p>
            <div className="flex items-end gap-2">
              <p className="text-xl sm:text-2xl font-bold text-amber-600">{pendingCount}</p>
              <span className="text-xs text-muted-foreground">{formatCurrency(pendingAmount)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Expenses Display */}
      <Card className="rounded-2xl border-0 shadow-lg overflow-hidden">
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, index) => (
                <Skeleton key={index} className="h-20 w-full rounded-xl" />
              ))}
            </div>
          ) : filteredExpenses.length === 0 ? (
            <div className="flex flex-col h-[200px] items-center justify-center">
              <div className="p-4 rounded-full bg-amber-50 dark:bg-amber-950/30 mb-4">
                <Search className="h-8 w-8 text-amber-400" />
              </div>
              <p className="text-muted-foreground font-medium">No expenses found</p>
              <p className="text-sm text-muted-foreground">Try adjusting your filters or add a new expense</p>
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
      <Toaster position="top-right" toastOptions={{
        style: {
          borderRadius: '12px',
          padding: '12px 16px',
          fontSize: '14px',
        },
      }} />
    </div>
  )
}