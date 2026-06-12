// components/StockPurchases.tsx

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
import { CalendarIcon, LayoutGrid, Package, Search, TrendingUp } from "lucide-react"
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, AreaChart, Area, LineChart, Line } from "recharts"
import { stockApi } from "@/services/expense.service"
import { StockPurchase, DateFilterType } from "@/types/expense.types"
import { formatCurrency, formatShortCurrency, getDateRange } from "@/lib/utils/expense.utils"

export function StockPurchases() {
  const [purchases, setPurchases] = useState<StockPurchase[]>([])
  const [isLoading, setIsLoading] = useState(true)
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
            <Bar dataKey="Amount" fill="#10b981" radius={[4, 4, 0, 0]} />
          </BarChart>
        )
      case 'area':
        return (
          <AreaChart {...commonProps}>
            <defs>
              <linearGradient id="stockGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="date" />
            <YAxis tickFormatter={(v) => formatShortCurrency(v)} />
            <RechartsTooltip formatter={(value: number) => formatCurrency(value)} />
            <Area type="monotone" dataKey="Amount" stroke="#10b981" fill="url(#stockGradient)" />
          </AreaChart>
        )
      case 'line':
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="date" />
            <YAxis tickFormatter={(v) => formatShortCurrency(v)} />
            <RechartsTooltip formatter={(value: number) => formatCurrency(value)} />
            <Line type="monotone" dataKey="Amount" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
          </LineChart>
        )
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Stock Purchases</h2>
          <p className="text-muted-foreground">Track inventory and raw material purchases</p>
        </div>
        <Button variant="outline" onClick={fetchStockPurchases}>
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
        </CardContent>
      </Card>

      {/* Chart Section */}
      <Card className="rounded-2xl border-0 shadow-lg overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Purchase Trends</CardTitle>
            <CardDescription>Daily stock purchase amounts over time</CardDescription>
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

      {/* Search */}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by item or supplier..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Purchases</p>
            <p className="text-2xl font-bold text-emerald-600">{filteredPurchases.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Amount</p>
            <p className="text-2xl font-bold text-blue-600">{formatCurrency(totalAmount)}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Unique Suppliers</p>
            <p className="text-2xl font-bold text-purple-600">
              {new Set(filteredPurchases.map(p => p.supplier)).size}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Purchases Table */}
      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredPurchases.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No stock purchases found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item Name</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Total Amount</TableHead>
                    <TableHead>Purchase Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPurchases.map((purchase) => (
                    <TableRow key={purchase._id}>
                      <TableCell className="font-medium">{purchase.stockName}</TableCell>
                      <TableCell>{purchase.supplier}</TableCell>
                      <TableCell className="text-right">{purchase.quantity}</TableCell>
                      <TableCell className="text-right">{formatCurrency(purchase.unitPrice)}</TableCell>
                      <TableCell className="text-right font-semibold text-emerald-600">
                        {formatCurrency(purchase.totalAmount)}
                      </TableCell>
                      <TableCell>{format(parseISO(purchase.purchaseDate), 'PP')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      <Toaster position="top-right" />
    </div>
  )
}