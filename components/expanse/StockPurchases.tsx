"use client"

import { useState, useEffect, useMemo } from "react"
import { format, eachDayOfInterval, parseISO } from "date-fns"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { Toaster, toast } from "react-hot-toast"
import { CalendarIcon, LayoutGrid, Package, Search, TrendingUp, Sparkles, RefreshCw, Building2, DollarSign, ShoppingBag } from "lucide-react"
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, AreaChart, Area, LineChart, Line } from "recharts"
import { stockApi } from "@/services/expense.service"
import { StockPurchase, DateFilterType } from "@/types/expense.types"
import { formatCurrency, formatShortCurrency, getDateRange } from "@/lib/utils/expense.utils"

export function StockPurchases() {
  const [purchases, setPurchases] = useState<StockPurchase[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [dateFilterType, setDateFilterType] = useState<DateFilterType>('today')
  const [customStartDate, setCustomStartDate] = useState<Date | null>(null)
  const [customEndDate, setCustomEndDate] = useState<Date | null>(null)
  const [chartView, setChartView] = useState<'bar' | 'area' | 'line'>('bar')

  useEffect(() => {
    fetchStockPurchases()
  }, [])

  const fetchStockPurchases = async () => {
    setIsLoading(true)
    try {
      const purchasesData = await stockApi.getStockPurchases()
      const stocks = await stockApi.getStockItems()
      const stockMap = new Map(stocks.map(s => [s._id, s.name]))
      
      const enrichedPurchases = purchasesData.map((p: any) => ({
        ...p,
        stockName: stockMap.get(p.stockId) || "Unknown",
        totalAmount: (p.quantity || 0) * (p.unitPrice || 0)
      }))
      
      setPurchases(enrichedPurchases)
    } catch (error) {
      console.error("Error fetching stock purchases:", error)
      toast.error("Failed to load stock purchases")
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await fetchStockPurchases()
      toast.success("Purchases refreshed!")
    } catch (error) {
      toast.error("Failed to refresh")
    } finally {
      setIsRefreshing(false)
    }
  }

  const getFilteredPurchasesByDate = useMemo(() => {
    const { start, end } = getDateRange(dateFilterType, customStartDate || undefined, customEndDate || undefined)
    return purchases.filter(purchase => {
      const purchaseDate = new Date(purchase.purchaseDate)
      return purchaseDate >= start && purchaseDate <= end
    })
  }, [purchases, dateFilterType, customStartDate, customEndDate])

  const chartData = useMemo(() => {
    const { start, end } = getDateRange(dateFilterType, customStartDate || undefined, customEndDate || undefined)
    const dates = eachDayOfInterval({ start, end })
    
    return dates.map(date => {
      const dateStr = format(date, 'yyyy-MM-dd')
      const dailyTotal = getFilteredPurchasesByDate
        .filter(p => p.purchaseDate.startsWith(dateStr))
        .reduce((sum, p) => sum + p.totalAmount, 0)
      
      return {
        date: format(date, 'MMM dd'),
        Amount: dailyTotal,
      }
    })
  }, [getFilteredPurchasesByDate, dateFilterType, customStartDate, customEndDate])

  const filteredPurchases = useMemo(() => {
    return getFilteredPurchasesByDate.filter(p => 
      p.stockName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.supplier?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [getFilteredPurchasesByDate, searchTerm])

  const totalAmount = filteredPurchases.reduce((sum, p) => sum + p.totalAmount, 0)
  const totalQuantity = filteredPurchases.reduce((sum, p) => sum + p.quantity, 0)
  const uniqueSuppliers = new Set(filteredPurchases.map(p => p.supplier)).size
  const uniqueItems = new Set(filteredPurchases.map(p => p.stockName)).size

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
            <Bar dataKey="Amount" fill="#10B981" radius={[6, 6, 0, 0]} />
          </BarChart>
        )
      case 'area':
        return (
          <AreaChart {...commonProps}>
            <defs>
              <linearGradient id="stockGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#10B981" stopOpacity={0.05}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
            <YAxis tickFormatter={(v) => formatShortCurrency(v)} tick={{ fontSize: 12 }} />
            <RechartsTooltip 
              formatter={(value: number) => [formatCurrency(value), 'Amount']}
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
            />
            <Area type="monotone" dataKey="Amount" stroke="#10B981" strokeWidth={2} fill="url(#stockGradient)" />
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
            <Line type="monotone" dataKey="Amount" stroke="#10B981" strokeWidth={3} dot={{ r: 5, fill: "#10B981" }} />
          </LineChart>
        )
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-emerald-500" />
            <h2 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-green-400 bg-clip-text text-transparent">
              Stock Purchases
            </h2>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">Track inventory and raw material purchases</p>
        </div>
        <Button 
          variant="outline" 
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="rounded-full border-2 hover:border-emerald-400 transition-all hover:shadow-md"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Date Filter Bar */}
      <Card className="rounded-2xl border-0 shadow-lg bg-gradient-to-r from-emerald-50/50 to-green-50/30 dark:from-emerald-950/20 dark:to-green-950/10 backdrop-blur-sm">
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
                      ? 'bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-500/25' 
                      : 'hover:border-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
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
                    ? 'bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-500/25' 
                    : 'hover:border-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                }`}
              >
                🗓️ Custom
              </Button>
            </div>
            <Badge variant="secondary" className="rounded-full px-4 py-2 bg-white/50 dark:bg-black/20 backdrop-blur-sm">
              <CalendarIcon className="h-3 w-3 mr-1.5 text-emerald-500" />
              {getDateDisplayText()}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Chart Section */}
      <Card className="rounded-2xl border-0 shadow-lg overflow-hidden bg-gradient-to-br from-white to-emerald-50/30 dark:from-gray-900 dark:to-emerald-950/20">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-500" />
              Purchase Trends
            </CardTitle>
            <CardDescription>Daily stock purchase amounts over time</CardDescription>
          </div>
          <div className="flex gap-1 bg-muted/50 rounded-full p-1">
            <Button 
              variant={chartView === 'bar' ? "default" : "ghost"} 
              size="sm" 
              onClick={() => setChartView('bar')}
              className={`rounded-full ${chartView === 'bar' ? 'bg-emerald-500 hover:bg-emerald-600' : ''}`}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button 
              variant={chartView === 'area' ? "default" : "ghost"} 
              size="sm" 
              onClick={() => setChartView('area')}
              className={`rounded-full ${chartView === 'area' ? 'bg-emerald-500 hover:bg-emerald-600' : ''}`}
            >
              <TrendingUp className="h-4 w-4" />
            </Button>
            <Button 
              variant={chartView === 'line' ? "default" : "ghost"} 
              size="sm" 
              onClick={() => setChartView('line')}
              className={`rounded-full ${chartView === 'line' ? 'bg-emerald-500 hover:bg-emerald-600' : ''}`}
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

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by item name or supplier..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 rounded-full border-2 focus:border-emerald-400 transition-colors"
        />
      </div>

      {/* Enhanced Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/30 dark:to-emerald-900/20 border-0 shadow-md hover:shadow-lg transition-shadow">
          <CardContent className="pt-4 sm:pt-6">
            <p className="text-xs sm:text-sm text-muted-foreground">Total Purchases</p>
            <p className="text-xl sm:text-2xl font-bold text-emerald-600">{filteredPurchases.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20 border-0 shadow-md hover:shadow-lg transition-shadow">
          <CardContent className="pt-4 sm:pt-6">
            <p className="text-xs sm:text-sm text-muted-foreground">Total Amount</p>
            <p className="text-xl sm:text-2xl font-bold text-blue-600">{formatCurrency(totalAmount)}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/30 dark:to-purple-900/20 border-0 shadow-md hover:shadow-lg transition-shadow">
          <CardContent className="pt-4 sm:pt-6">
            <p className="text-xs sm:text-sm text-muted-foreground">Suppliers</p>
            <p className="text-xl sm:text-2xl font-bold text-purple-600">{uniqueSuppliers}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/30 dark:to-amber-900/20 border-0 shadow-md hover:shadow-lg transition-shadow">
          <CardContent className="pt-4 sm:pt-6">
            <p className="text-xs sm:text-sm text-muted-foreground">Items</p>
            <p className="text-xl sm:text-2xl font-bold text-amber-600">{uniqueItems}</p>
          </CardContent>
        </Card>
      </div>

      {/* Purchases Table */}
      <Card className="rounded-2xl border-0 shadow-lg overflow-hidden">
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          ) : filteredPurchases.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="p-4 rounded-full bg-emerald-50 dark:bg-emerald-950/30 mb-4">
                <Package className="h-8 w-8 text-emerald-400" />
              </div>
              <p className="text-muted-foreground font-medium">No stock purchases found</p>
              <p className="text-sm text-muted-foreground">Try adjusting your filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="font-semibold">Item</TableHead>
                    <TableHead className="font-semibold">Supplier</TableHead>
                    <TableHead className="text-right font-semibold">Qty</TableHead>
                    <TableHead className="text-right font-semibold hidden sm:table-cell">Unit Price</TableHead>
                    <TableHead className="text-right font-semibold">Total</TableHead>
                    <TableHead className="font-semibold hidden md:table-cell">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPurchases.map((purchase) => (
                    <TableRow key={purchase._id} className="hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 transition-colors">
                      <TableCell className="font-medium flex items-center gap-2">
                        <ShoppingBag className="h-4 w-4 text-emerald-500" />
                        {purchase.stockName}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="rounded-full border-emerald-200 text-emerald-700 dark:border-emerald-800 dark:text-emerald-300">
                          <Building2 className="h-3 w-3 mr-1" />
                          {purchase.supplier}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">{purchase.quantity}</TableCell>
                      <TableCell className="text-right hidden sm:table-cell text-muted-foreground">
                        {formatCurrency(purchase.unitPrice)}
                      </TableCell>
                      <TableCell className="text-right font-bold text-emerald-600">
                        {formatCurrency(purchase.totalAmount)}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">
                        {format(parseISO(purchase.purchaseDate), 'PP')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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