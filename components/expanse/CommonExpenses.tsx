// components/CommonExpenses.tsx

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
import { CalendarIcon, LayoutGrid, TrendingUp, Wallet } from "lucide-react"
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, AreaChart, Area, LineChart, Line } from "recharts"
import { commonApi } from "@/services/expense.service"
import { CommonExpense, DateFilterType } from "@/types/expense.types"
import { formatCurrency, formatShortCurrency, getDailyCommonAmount, getDateRange } from "@/lib/utils/expense.utils"

export function CommonExpenses() {
  const [expenses, setExpenses] = useState<CommonExpense[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [dateFilterType, setDateFilterType] = useState<DateFilterType>('month')
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

  const getDateDisplayText = () => {
    const { start, end } = getDateRange(dateFilterType, customStartDate || undefined, customEndDate || undefined)
    switch (dateFilterType) {
      case 'today': return 'Today'
      case 'yesterday': return 'Yesterday'
      case 'week': return `Week of ${format(start, 'MMM dd')}`
      case 'month': return format(start, 'MMMM yyyy')
      case 'custom': return `${format(start, 'MMM dd')} - ${format(end, 'MMM dd, yyyy')}`
      default: return format(start, 'MMMM yyyy')
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
            <RechartsTooltip 
              formatter={(value: number) => [formatCurrency(value), 'Daily Amount']}
              labelFormatter={(label) => `Date: ${label}`}
            />
            <Bar dataKey="Amount" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Daily Common Expenses" />
          </BarChart>
        )
      case 'area':
        return (
          <AreaChart {...commonProps}>
            <defs>
              <linearGradient id="commonGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.1}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="date" />
            <YAxis tickFormatter={(v) => formatShortCurrency(v)} />
            <RechartsTooltip 
              formatter={(value: number) => [formatCurrency(value), 'Daily Amount']}
              labelFormatter={(label) => `Date: ${label}`}
            />
            <Area type="monotone" dataKey="Amount" stroke="#8b5cf6" fill="url(#commonGradient)" name="Daily Common Expenses" />
          </AreaChart>
        )
      case 'line':
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="date" />
            <YAxis tickFormatter={(v) => formatShortCurrency(v)} />
            <RechartsTooltip 
              formatter={(value: number) => [formatCurrency(value), 'Daily Amount']}
              labelFormatter={(label) => `Date: ${label}`}
            />
            <Line type="monotone" dataKey="Amount" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 4 }} name="Daily Common Expenses" />
          </LineChart>
        )
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Common Expenses</h2>
          <p className="text-muted-foreground">Recurring operational expenses (daily, weekly, monthly, etc.)</p>
        </div>
        <Button variant="outline" onClick={fetchCommonExpenses}>
          Refresh
        </Button>
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
            <CardTitle>Daily Common Expense Trends</CardTitle>
            <CardDescription>Daily breakdown of recurring expenses over time</CardDescription>
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
          <ResponsiveContainer width="100%" height={350}>
            {renderChart()}
          </ResponsiveContainer>
          <div className="mt-4 text-center text-sm text-muted-foreground">
            Each bar represents the daily common expense amount (e.g., 50 ETB daily + 100 ETB from monthly = 150 ETB per day)
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Active Expenses</p>
            <p className="text-2xl font-bold text-purple-600">{activeExpenses.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total for Period</p>
            <p className="text-2xl font-bold text-blue-600">{formatCurrency(totalForPeriod)}</p>
            <p className="text-xs text-muted-foreground">Over {chartData.length} days</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Average Daily</p>
            <p className="text-2xl font-bold text-emerald-600">{formatCurrency(averageDaily)}</p>
            <p className="text-xs text-muted-foreground">Per day</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-50 to-amber-100">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Monthly Projected</p>
            <p className="text-2xl font-bold text-amber-600">{formatCurrency(monthlyProjected)}</p>
            <p className="text-xs text-muted-foreground">Based on 30-day month</p>
          </CardContent>
        </Card>
      </div>

      {/* Expenses Table */}
      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : expenses.length === 0 ? (
            <div className="text-center py-12">
              <Wallet className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No common expenses found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Frequency</TableHead>
                    <TableHead className="text-right">Daily Equivalent</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>Status</TableHead>
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
                      <TableRow key={expense._id}>
                        <TableCell className="font-medium">{expense.title}</TableCell>
                        <TableCell>{expense.category}</TableCell>
                        <TableCell className="text-right font-semibold text-purple-600">
                          {formatCurrency(expense.amount)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="rounded-full">
                            {getFrequencyLabel(expense.frequency)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-emerald-600">
                          {dailyEquivalent > 0 ? formatCurrency(dailyEquivalent) : '-'}
                        </TableCell>
                        <TableCell>{format(parseISO(expense.startDate), 'PP')}</TableCell>
                        <TableCell>
                          <Badge className={expense.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}>
                            {expense.isActive ? 'Active' : 'Inactive'}
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
      <Card className="bg-gradient-to-r from-indigo-50 to-purple-50">
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">
            <strong>💡 How it works:</strong> Common expenses are recurring costs that are spread across days.
            For example, a 3,000 ETB monthly expense adds 100 ETB to each day (3,000 ÷ 30 days),
            while a 50 ETB daily expense adds 50 ETB to each day. Total daily common expenses = 150 ETB.
          </p>
        </CardContent>
      </Card>
      <Toaster position="top-right" />
    </div>
  )
}