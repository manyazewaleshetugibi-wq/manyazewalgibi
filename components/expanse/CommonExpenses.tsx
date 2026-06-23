"use client"

import { useState, useEffect, useMemo } from "react"
import { format, eachDayOfInterval, parseISO } from "date-fns"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { Toaster, toast } from "react-hot-toast"
import { CalendarIcon, LayoutGrid, TrendingUp, Wallet, Sparkles, RefreshCw, Info } from "lucide-react"
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, AreaChart, Area, LineChart, Line } from "recharts"
import { commonApi } from "@/services/expense.service"
import { CommonExpense, DateFilterType } from "@/types/expense.types"
import { formatCurrency, formatShortCurrency, getDailyCommonAmount, getDateRange } from "@/lib/utils/expense.utils"

export function CommonExpenses() {
  const [expenses, setExpenses] = useState<CommonExpense[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [dateFilterType, setDateFilterType] = useState<DateFilterType>('today')
  const [customStartDate, setCustomStartDate] = useState<Date | null>(null)
  const [customEndDate, setCustomEndDate] = useState<Date | null>(null)
  const [chartView, setChartView] = useState<'bar' | 'area' | 'line'>('bar')

  useEffect(() => {
    fetchCommonExpenses()
  }, [])

  const fetchCommonExpenses = async () => {
    setIsLoading(true)
    try {
      const data = await commonApi.getExpenses()
      setExpenses(data)
    } catch (error) {
      console.error("Error fetching common expenses:", error)
      toast.error("Failed to load common expenses")
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      const data = await commonApi.getExpenses()
      setExpenses(data)
      toast.success("Expenses refreshed!")
    } catch (error) {
      toast.error("Failed to refresh")
    } finally {
      setIsRefreshing(false)
    }
  }

  const chartData = useMemo(() => {
    const { start, end } = getDateRange(dateFilterType, customStartDate || undefined, customEndDate || undefined)
    const dates = eachDayOfInterval({ start, end })
    
    return dates.map(date => {
      let dailyTotal = 0
      expenses.forEach(expense => {
        dailyTotal += getDailyCommonAmount(expense, date)
      })
      
      return {
        date: format(date, 'MMM dd'),
        fullDate: date,
        Amount: dailyTotal,
      }
    })
  }, [expenses, dateFilterType, customStartDate, customEndDate])

  const totalForPeriod = chartData.reduce((sum, day) => sum + day.Amount, 0)
  const averageDaily = chartData.length > 0 ? totalForPeriod / chartData.length : 0
  const monthlyProjected = averageDaily * 30

  const activeExpenses = expenses.filter(e => e.isActive)
  const totalMonthlyAmount = activeExpenses.reduce((sum, e) => {
    if (e.frequency === 'monthly') return sum + e.amount
    if (e.frequency === 'daily') return sum + (e.amount * 30)
    if (e.frequency === 'weekly') return sum + (e.amount * 4.33)
    if (e.frequency === 'yearly') return sum + (e.amount / 12)
    return sum + e.amount
  }, 0)

  const getFrequencyLabel = (freq: string) => {
    const labels: Record<string, string> = {
      daily: "Daily", weekly: "Weekly", monthly: "Monthly",
      quarterly: "Quarterly", yearly: "Yearly", "one-time": "One Time"
    }
    return labels[freq] || freq
  }

  const getFrequencyBadgeColor = (freq: string) => {
    const colors: Record<string, string> = {
      daily: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
      weekly: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
      monthly: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
      quarterly: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300",
      yearly: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
      "one-time": "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300",
    }
    return colors[freq] || colors.oneTime
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
              formatter={(value: number) => [formatCurrency(value), 'Daily Amount']}
              labelFormatter={(label) => `Date: ${label}`}
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
            />
            <Bar dataKey="Amount" fill="#8B5CF6" radius={[6, 6, 0, 0]} name="Daily Common Expenses" />
          </BarChart>
        )
      case 'area':
        return (
          <AreaChart {...commonProps}>
            <defs>
              <linearGradient id="commonGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.05}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
            <YAxis tickFormatter={(v) => formatShortCurrency(v)} tick={{ fontSize: 12 }} />
            <RechartsTooltip 
              formatter={(value: number) => [formatCurrency(value), 'Daily Amount']}
              labelFormatter={(label) => `Date: ${label}`}
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
            />
            <Area type="monotone" dataKey="Amount" stroke="#8B5CF6" strokeWidth={2} fill="url(#commonGradient)" name="Daily Common Expenses" />
          </AreaChart>
        )
      case 'line':
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
            <YAxis tickFormatter={(v) => formatShortCurrency(v)} tick={{ fontSize: 12 }} />
            <RechartsTooltip 
              formatter={(value: number) => [formatCurrency(value), 'Daily Amount']}
              labelFormatter={(label) => `Date: ${label}`}
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
            />
            <Line type="monotone" dataKey="Amount" stroke="#8B5CF6" strokeWidth={3} dot={{ r: 5, fill: "#8B5CF6" }} name="Daily Common Expenses" />
          </LineChart>
        )
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-indigo-400 bg-clip-text text-transparent">
              Common Expenses
            </h2>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">Recurring operational expenses (daily, weekly, monthly, etc.)</p>
        </div>
        <Button 
          variant="outline" 
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="rounded-full border-2 hover:border-purple-400 transition-all hover:shadow-md"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Date Filter Bar */}
      <Card className="rounded-2xl border-0 shadow-lg bg-gradient-to-r from-purple-50/50 to-indigo-50/30 dark:from-purple-950/20 dark:to-indigo-950/10 backdrop-blur-sm">
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
                      ? 'bg-purple-500 hover:bg-purple-600 shadow-lg shadow-purple-500/25' 
                      : 'hover:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/30'
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
                    ? 'bg-purple-500 hover:bg-purple-600 shadow-lg shadow-purple-500/25' 
                    : 'hover:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/30'
                }`}
              >
                🗓️ Custom
              </Button>
            </div>
            <Badge variant="secondary" className="rounded-full px-4 py-2 bg-white/50 dark:bg-black/20 backdrop-blur-sm">
              <CalendarIcon className="h-3 w-3 mr-1.5 text-purple-500" />
              {getDateDisplayText()}
            </Badge>
          </div>
          
          {dateFilterType === 'custom' && (
            <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-purple-200/30">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">From</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="rounded-full border-2 hover:border-purple-400 transition-colors">
                      {customStartDate ? format(customStartDate, "PPP") : "Select Date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="rounded-xl border-0 shadow-xl">
                    <Calendar mode="single" selected={customStartDate || undefined} onSelect={setCustomStartDate} />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">To</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="rounded-full border-2 hover:border-purple-400 transition-colors">
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

      {/* Chart Section */}
      <Card className="rounded-2xl border-0 shadow-lg overflow-hidden bg-gradient-to-br from-white to-purple-50/30 dark:from-gray-900 dark:to-purple-950/20">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-purple-500" />
              Daily Common Expense Trends
            </CardTitle>
            <CardDescription>Daily breakdown of recurring expenses over time</CardDescription>
          </div>
          <div className="flex gap-1 bg-muted/50 rounded-full p-1">
            <Button 
              variant={chartView === 'bar' ? "default" : "ghost"} 
              size="sm" 
              onClick={() => setChartView('bar')}
              className={`rounded-full ${chartView === 'bar' ? 'bg-purple-500 hover:bg-purple-600' : ''}`}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button 
              variant={chartView === 'area' ? "default" : "ghost"} 
              size="sm" 
              onClick={() => setChartView('area')}
              className={`rounded-full ${chartView === 'area' ? 'bg-purple-500 hover:bg-purple-600' : ''}`}
            >
              <TrendingUp className="h-4 w-4" />
            </Button>
            <Button 
              variant={chartView === 'line' ? "default" : "ghost"} 
              size="sm" 
              onClick={() => setChartView('line')}
              className={`rounded-full ${chartView === 'line' ? 'bg-purple-500 hover:bg-purple-600' : ''}`}
            >
              <TrendingUp className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            {renderChart()}
          </ResponsiveContainer>
          <div className="mt-4 flex items-center justify-center gap-2 text-xs sm:text-sm text-muted-foreground bg-purple-50/50 dark:bg-purple-950/20 rounded-xl p-3">
            <Info className="h-4 w-4 text-purple-400" />
            Each bar represents the daily common expense amount (e.g., 50 ETB daily + 100 ETB from monthly = 150 ETB per day)
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/30 dark:to-purple-900/20 border-0 shadow-md hover:shadow-lg transition-shadow">
          <CardContent className="pt-4 sm:pt-6">
            <p className="text-xs sm:text-sm text-muted-foreground">Active Expenses</p>
            <p className="text-xl sm:text-2xl font-bold text-purple-600">{activeExpenses.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20 border-0 shadow-md hover:shadow-lg transition-shadow">
          <CardContent className="pt-4 sm:pt-6">
            <p className="text-xs sm:text-sm text-muted-foreground">Period Total</p>
            <p className="text-xl sm:text-2xl font-bold text-blue-600">{formatCurrency(totalForPeriod)}</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Over {chartData.length} days</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/30 dark:to-emerald-900/20 border-0 shadow-md hover:shadow-lg transition-shadow">
          <CardContent className="pt-4 sm:pt-6">
            <p className="text-xs sm:text-sm text-muted-foreground">Avg. Daily</p>
            <p className="text-xl sm:text-2xl font-bold text-emerald-600">{formatCurrency(averageDaily)}</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Per day</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/30 dark:to-amber-900/20 border-0 shadow-md hover:shadow-lg transition-shadow">
          <CardContent className="pt-4 sm:pt-6">
            <p className="text-xs sm:text-sm text-muted-foreground">Monthly Projected</p>
            <p className="text-xl sm:text-2xl font-bold text-amber-600">{formatCurrency(monthlyProjected)}</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground">30-day projection</p>
          </CardContent>
        </Card>
      </div>

      {/* Expenses Table */}
      <Card className="rounded-2xl border-0 shadow-lg overflow-hidden">
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          ) : expenses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="p-4 rounded-full bg-purple-50 dark:bg-purple-950/30 mb-4">
                <Wallet className="h-8 w-8 text-purple-400" />
              </div>
              <p className="text-muted-foreground font-medium">No common expenses found</p>
              <p className="text-sm text-muted-foreground">Add your first recurring expense</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="font-semibold">Title</TableHead>
                    <TableHead className="font-semibold">Category</TableHead>
                    <TableHead className="text-right font-semibold">Amount</TableHead>
                    <TableHead className="font-semibold">Frequency</TableHead>
                    <TableHead className="text-right font-semibold">Daily Eq.</TableHead>
                    <TableHead className="font-semibold hidden md:table-cell">Start Date</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.map((expense) => {
                    let dailyEquivalent = 0
                    switch (expense.frequency) {
                      case 'daily': dailyEquivalent = expense.amount; break
                      case 'weekly': dailyEquivalent = expense.amount / 7; break
                      case 'monthly': dailyEquivalent = expense.amount / 30; break
                      case 'quarterly': dailyEquivalent = expense.amount / 91.25; break
                      case 'yearly': dailyEquivalent = expense.amount / 365; break
                      case 'one-time': dailyEquivalent = 0; break
                    }
                    return (
                      <TableRow key={expense._id} className="hover:bg-purple-50/50 dark:hover:bg-purple-950/20 transition-colors">
                        <TableCell className="font-medium">{expense.title}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="rounded-full border-purple-200 text-purple-700 dark:border-purple-800 dark:text-purple-300">
                            {expense.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-bold text-purple-600">
                          {formatCurrency(expense.amount)}
                        </TableCell>
                        <TableCell>
                          <Badge className={`rounded-full ${getFrequencyBadgeColor(expense.frequency)}`}>
                            {getFrequencyLabel(expense.frequency)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-emerald-600 font-medium">
                          {dailyEquivalent > 0 ? formatCurrency(dailyEquivalent) : '-'}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {format(parseISO(expense.startDate), 'PP')}
                        </TableCell>
                        <TableCell>
                          <Badge className={`rounded-full ${expense.isActive ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300'}`}>
                            {expense.isActive ? '✅ Active' : '⏸️ Inactive'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Explanation Card */}
      <Card className="bg-gradient-to-r from-purple-50/80 to-indigo-50/80 dark:from-purple-950/20 dark:to-indigo-950/20 border-0 shadow-md">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30 mt-0.5">
              <Info className="h-4 w-4 text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-purple-700 dark:text-purple-300">💡 How it works</p>
              <p className="text-sm text-muted-foreground">
                Common expenses are recurring costs that are spread across days. For example, a 3,000 ETB monthly expense adds 100 ETB to each day (3,000 ÷ 30 days), while a 50 ETB daily expense adds 50 ETB to each day. Total daily common expenses = 150 ETB.
              </p>
            </div>
          </div>
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