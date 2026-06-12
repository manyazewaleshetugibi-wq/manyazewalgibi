// app/expenses/page.tsx

"use client"

import { useState, useEffect, useMemo } from "react"
import { format, subDays, startOfMonth, eachDayOfInterval } from "date-fns"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Toaster } from "react-hot-toast"
import { CalendarIcon, Package, Receipt, Wallet, ChevronRight } from "lucide-react"
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend } from "recharts"
import { CasualExpenses } from "@/components/expanse/CasualExpenses"
import { CommonExpenses } from "@/components/expanse/CommonExpenses"
import { StockPurchases } from "@/components/expanse/StockPurchases"
import { commonApi, stockApi, casualApi, salesApi } from "@/services/expense.service"
import { CommonExpense, StockPurchase, CasualExpense, OrderReport, DateFilterType } from "@/types/expense.types"
import { formatCurrency, formatShortCurrency, getDailyCommonAmount, getDateRange } from "@/lib/utils/expense.utils"

const CHART_COLORS = {
  common: "#8884D8",
  stock: "#00C49F",
  casual: "#FFBB28",
}

const ClickableCard = ({ title, value, icon, description, color, onClick }: {
  title: string
  value: string
  icon: React.ReactNode
  description: string
  color: string
  onClick: () => void
}) => {
  const colorStyles = {
    purple: "from-purple-500/10 to-purple-600/5",
    emerald: "from-emerald-500/10 to-emerald-600/5",
    amber: "from-amber-500/10 to-amber-600/5",
  }
  
  const iconStyles = {
    purple: "bg-purple-100 dark:bg-purple-900/30",
    emerald: "bg-emerald-100 dark:bg-emerald-900/30",
    amber: "bg-amber-100 dark:bg-amber-900/30",
  }
  
  const textStyles = {
    purple: "text-purple-600",
    emerald: "text-emerald-600",
    amber: "text-amber-600",
  }

  return (
    <div className="cursor-pointer transition-all hover:scale-105" onClick={onClick}>
      <Card className={`rounded-2xl border-0 shadow-lg bg-gradient-to-br ${colorStyles[color as keyof typeof colorStyles]} hover:shadow-xl transition-all`}>
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className={`p-3 rounded-2xl ${iconStyles[color as keyof typeof iconStyles]}`}>
              {icon}
            </div>
            <ChevronRight className={`h-5 w-5 ${textStyles[color as keyof typeof textStyles]} opacity-60`} />
          </div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className={`text-3xl font-bold ${textStyles[color as keyof typeof textStyles]} mt-1`}>{value}</p>
          <p className="text-xs text-muted-foreground mt-2">{description}</p>
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
  const [dateFilterType, setDateFilterType] = useState<DateFilterType>('month')
  const [activePage, setActivePage] = useState<'dashboard' | 'casual' | 'common' | 'stock'>('dashboard')

  const fetchAllData = async () => {
    setIsLoading(true)
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
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchAllData()
  }, [])

  const getDateRangeForDashboard = useMemo(() => {
    const now = new Date()
    switch (dateFilterType) {
      case '7d': return { start: subDays(now, 6), end: now }
      case '14d': return { start: subDays(now, 13), end: now }
      case '28d': return { start: subDays(now, 27), end: now }
      case 'today': return { start: new Date(now.setHours(0,0,0,0)), end: new Date(now.setHours(23,59,59,999)) }
      case 'yesterday': 
        const yesterday = subDays(now, 1)
        return { start: new Date(yesterday.setHours(0,0,0,0)), end: new Date(yesterday.setHours(23,59,59,999)) }
      case 'month': return { start: startOfMonth(now), end: now }
      default: return { start: startOfMonth(now), end: now }
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
    
    let totalRevenue = 0
    if (orderReport) {
      Object.entries(orderReport.dailySales).forEach(([date, sales]) => {
        const salesDate = new Date(date)
        const { start, end } = getDateRangeForDashboard
        if (salesDate >= start && salesDate <= end) {
          totalRevenue += sales
        }
      })
    }
    
    const totalProfit = totalRevenue - totalExpenses
    const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0
    
    return { 
      totalCommon, 
      totalStock, 
      totalCasual,
      totalExpenses, 
      totalRevenue, 
      totalProfit, 
      profitMargin 
    }
  }, [dailyExpenseData, casualExpenses, orderReport, getDateRangeForDashboard])

  const handleCasualClick = () => setActivePage('casual')
  const handleCommonClick = () => setActivePage('common')
  const handleStockClick = () => setActivePage('stock')
  const handleBackToDashboard = () => setActivePage('dashboard')

  // Render sub-pages
  if (activePage === 'casual') {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto py-6 px-4">
          <Button variant="ghost" onClick={handleBackToDashboard} className="mb-6 gap-2">
            ← Back to Dashboard
          </Button>
          <CasualExpenses />
        </main>
      </div>
    )
  }

  if (activePage === 'common') {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto py-6 px-4">
          <Button variant="ghost" onClick={handleBackToDashboard} className="mb-6 gap-2">
            ← Back to Dashboard
          </Button>
          <CommonExpenses />
        </main>
      </div>
    )
  }

  if (activePage === 'stock') {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto py-6 px-4">
          <Button variant="ghost" onClick={handleBackToDashboard} className="mb-6 gap-2">
            ← Back to Dashboard
          </Button>
          <StockPurchases />
        </main>
      </div>
    )
  }

  // Dashboard View
  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto py-6 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Expense Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Track common expenses, stock purchases & casual expenses
          </p>
        </div>

        {/* Date Filter */}
        <Card className="mb-8 rounded-2xl border-0 shadow-lg">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap gap-2">
                {['today', 'yesterday', '7d', '14d', '28d', 'month'].map((filter) => (
                  <Button
                    key={filter}
                    variant={dateFilterType === filter ? "default" : "outline"}
                    size="sm"
                    onClick={() => setDateFilterType(filter as DateFilterType)}
                    className="rounded-full px-4"
                  >
                    {filter === 'today' ? 'Today' : filter === 'yesterday' ? 'Yesterday' : filter === '7d' ? '7 Days' : filter === '14d' ? '14 Days' : filter === '28d' ? '28 Days' : 'Month'}
                  </Button>
                ))}
              </div>
              <Badge variant="secondary" className="rounded-full px-4 py-2">
                <CalendarIcon className="h-3 w-3 mr-1" />
                {dateFilterType === 'today' ? 'Today' : dateFilterType === 'yesterday' ? 'Yesterday' : dateFilterType === '7d' ? 'Last 7 Days' : dateFilterType === '14d' ? 'Last 14 Days' : dateFilterType === '28d' ? 'Last 28 Days' : 'This Month'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* 3 Clickable Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <ClickableCard
            title="Common Expenses"
            value={formatCurrency(totals.totalCommon)}
            icon={<Wallet className="h-6 w-6 text-purple-600" />}
            description="Recurring operational costs"
            color="purple"
            onClick={handleCommonClick}
          />
          
          <ClickableCard
            title="Stock Purchases"
            value={formatCurrency(totals.totalStock)}
            icon={<Package className="h-6 w-6 text-emerald-600" />}
            description="Inventory & raw materials"
            color="emerald"
            onClick={handleStockClick}
          />
          
          <ClickableCard
            title="Casual Expenses"
            value={formatCurrency(totals.totalCasual)}
            icon={<Receipt className="h-6 w-6 text-amber-600" />}
            description="One-time & unexpected costs"
            color="amber"
            onClick={handleCasualClick}
          />
        </div>

        {/* Profit Summary Card */}
        <Card className="mb-8 rounded-2xl border-0 shadow-lg bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-purple-500/10">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center md:text-left">
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(totals.totalRevenue)}</p>
              </div>
              <div className="text-center md:text-left">
                <p className="text-sm text-muted-foreground">Total Expenses</p>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(totals.totalExpenses)}</p>
              </div>
              <div className="text-center md:text-left">
                <p className="text-sm text-muted-foreground">Net Profit</p>
                <p className={`text-2xl font-bold ${totals.totalProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {formatCurrency(totals.totalProfit)}
                </p>
              </div>
              <div className="text-center md:text-left">
                <p className="text-sm text-muted-foreground">Profit Margin</p>
                <p className={`text-2xl font-bold ${totals.profitMargin >= 20 ? 'text-emerald-600' : totals.profitMargin >= 0 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {totals.profitMargin.toFixed(1)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Expense Trends Bar Chart */}
        <Card className="rounded-2xl border-0 shadow-lg overflow-hidden">
          <CardHeader>
            <CardTitle>Expense Trends</CardTitle>
            <CardDescription>Daily breakdown of all expense types</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={dailyExpenseData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="date" />
                <YAxis tickFormatter={(v) => formatShortCurrency(v)} />
                <RechartsTooltip 
                  formatter={(value: number, name: string) => [formatCurrency(value), name]}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend />
                <Bar dataKey="Common" stackId="expenses" fill={CHART_COLORS.common} radius={[4, 4, 0, 0]} name="Common Expenses" />
                <Bar dataKey="Stock" stackId="expenses" fill={CHART_COLORS.stock} radius={[4, 4, 0, 0]} name="Stock Purchases" />
                <Bar dataKey="Casual" stackId="expenses" fill={CHART_COLORS.casual} radius={[4, 4, 0, 0]} name="Casual Expenses" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </main>
      <Toaster position="top-right" />
    </div>
  )
}