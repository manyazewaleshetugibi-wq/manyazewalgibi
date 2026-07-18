"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Package,
  TrendingUp,
  TrendingDown,
  Download,
  Eye,
  Search,
  X,
  Calendar,
  RefreshCw,
  AlertCircle,
  ChevronLeft,
  Utensils,
  List,
  BarChart3,
  ChevronRight,
  Loader2,
  Beef,
  Coffee,
  Milk,
  Apple,
  Egg,
  Wheat,
  Flame,
  Crown,
  Star,
  Sparkles,
  Layers,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Cell,
} from "recharts"
import * as XLSX from "xlsx"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subDays } from "date-fns"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import axios from "axios"

// Types
interface StockUsage {
  stockId: string
  stockName: string
  stockCategory: string
  stockUnit: string
  quantityUsed: number
  totalCost: number
  percentageOfItem: number
}

interface MenuItemData {
  itemId: string
  itemName: string
  totalQuantity: number
  frequency: number
  totalOrders: number
  totalRevenue: number
  averagePrice: number
  lastOrderDate: string | null
  stocksUsed: StockUsage[]
  dailyUsage: Array<{
    date: string
    quantity: number
    revenue: number
    ordersCount: number
  }>
}

interface StockData {
  stockId: string
  stockName: string
  stockCategory: string
  stockUnit: string
  totalQuantityUsed: number
  totalCost: number
  frequency: number
  totalOrders: number
  currentStock: number
  minimumStock: number
  stockStatus: 'normal' | 'low' | 'critical'
  lastUsed: string | null
  lastRestockedAt: string | null
  menuItems: Array<{
    itemId: string
    itemName: string
    quantityUsed: number
    servingsCount: number
    ordersCount: number
  }>
  dailyUsage: Array<{
    date: string
    quantity: number
    cost: number
    ordersCount: number
  }>
  usageRecords: Array<{
    orderId: string
    orderNumber: string
    quantityUsed: number
    cost: number
    usedAt: string
    items: Array<{ itemName: string; quantityUsed: number }>
  }>
}

interface DateRange {
  from: Date | null
  to: Date | null
}

interface PaginatedResponse<T> {
  success: boolean
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  summary: {
    totalItems?: number
    totalRevenue?: number
    totalOrders?: number
    totalStocks?: number
    totalQuantityUsed?: number
    totalCost?: number
    totalFrequency?: number
    totalProcessedMenuItems?: number
    totalUniqueOrders?: number
  }
}

const api = axios.create({
  baseURL: '/api',
  timeout: 60000,
})

const formatCurrency = (amount: any): string => {
  const num = typeof amount === 'number' ? amount : 0
  return new Intl.NumberFormat("en-ET", {
    style: "currency",
    currency: "ETB",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num)
}

const formatQuantity = (value: any, unit: string = 'kg', decimals: number = 2): string => {
  const num = typeof value === 'number' ? value : 0
  return `${num.toFixed(decimals)} ${unit}`
}

const formatDate = (date: string | Date | null): string => {
  if (!date) return '-'
  const d = new Date(date)
  if (isNaN(d.getTime())) return '-'
  return d.toLocaleDateString("en-ET")
}

type DatePreset = 'today' | 'yesterday' | 'week' | 'month' | 'year' | 'all'

const DAY_NAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']

const getDateRange = (type: DatePreset): DateRange => {
  const now = new Date()
  switch (type) {
    case 'today':
      return { from: startOfDay(now), to: endOfDay(now) }
    case 'yesterday': {
      const y = subDays(now, 1)
      return { from: startOfDay(y), to: endOfDay(y) }
    }
    case 'week':
      return { from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfWeek(now, { weekStartsOn: 1 }) }
    case 'month':
      return { from: startOfMonth(now), to: endOfMonth(now) }
    case 'year':
      return { from: startOfYear(now), to: endOfYear(now) }
    case 'all':
      return { from: null, to: null }
    default:
      return { from: null, to: null }
  }
}

// Get date range for a specific weekday (0=Sun..6=Sat) in the current week
const getWeekdayRange = (dayIndex: number): DateRange => {
  const now = new Date()
  const weekStart = startOfWeek(now, { weekStartsOn: 1 }) // Monday
  // dayIndex from our dropdown: 0=Mon,1=Tue,...,6=Sun
  const target = new Date(weekStart)
  target.setDate(weekStart.getDate() + dayIndex)
  return { from: startOfDay(target), to: endOfDay(target) }
}

const STATUS_COLORS = {
  normal: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  low: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  critical: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400',
}

const FREQUENCY_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#6366f1', '#14b8a6']

const getIngredientIcon = (category: string) => {
  const lowerCategory = category?.toLowerCase() || ''
  if (lowerCategory.includes('meat') || lowerCategory.includes('beef')) return Beef
  if (lowerCategory.includes('coffee')) return Coffee
  if (lowerCategory.includes('milk') || lowerCategory.includes('yogurt')) return Milk
  if (lowerCategory.includes('fruit') || lowerCategory.includes('avocado')) return Apple
  if (lowerCategory.includes('egg')) return Egg
  if (lowerCategory.includes('grain') || lowerCategory.includes('wheat')) return Wheat
  return Package
}

const getRankIcon = (rank: number) => {
  switch(rank) {
    case 1: return <Crown className="h-4 w-4 text-yellow-500" />
    case 2: return <Star className="h-4 w-4 text-gray-400" />
    case 3: return <Sparkles className="h-4 w-4 text-amber-600" />
    default: return <Flame className="h-4 w-4 text-orange-500" />
  }
}

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(handler)
  }, [value, delay])
  return debouncedValue
}

const useReportData = (params: {
  groupBy: 'stock' | 'menuItem'
  dateRange: DateRange
  search: string
  searchType: 'all' | 'stock' | 'menu'
  sortBy: string
  sortOrder: 'asc' | 'desc'
  page: number
  limit: number
}) => {
  const debouncedSearch = useDebounce(params.search, 500)
  
  return useQuery({
    queryKey: ['stock-usage-report', params.groupBy, params.dateRange, debouncedSearch, params.searchType, params.sortBy, params.sortOrder, params.page, params.limit],
    queryFn: async () => {
      const queryParams = new URLSearchParams({
        groupBy: params.groupBy,
        sortBy: params.sortBy,
        sortOrder: params.sortOrder,
        search: debouncedSearch,
        searchType: params.searchType,
        page: params.page.toString(),
        limit: params.limit.toString()
      })
      
      if (params.dateRange.from) {
        queryParams.append('from', params.dateRange.from.toISOString())
      }
      if (params.dateRange.to) {
        queryParams.append('to', params.dateRange.to.toISOString())
      }
      
      const response = await api.get(`/reports/stock-usage?${queryParams}`)
      return response.data as PaginatedResponse<any>
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 2,
  })
}

// Report Type Card Component
const ReportTypeCard = ({ 
  title, 
  icon: Icon, 
  count, 
  isActive, 
  onClick,
  color 
}: { 
  title: string
  icon: any
  count: number
  isActive: boolean
  onClick: () => void
  color: string
}) => (
  <Card 
    className={`cursor-pointer transition-all duration-300 hover:shadow-lg ${
      isActive ? `ring-2 ring-${color}-500 shadow-lg` : 'hover:scale-105'
    }`}
    onClick={onClick}
  >
    <CardContent className="p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`h-10 w-10 rounded-xl bg-${color}-100 dark:bg-${color}-900/30 flex items-center justify-center`}>
            <Icon className={`h-5 w-5 text-${color}-600 dark:text-${color}-400`} />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{count}</p>
          </div>
        </div>
        {isActive && (
          <Badge className={`bg-${color}-500 text-white`}>Active</Badge>
        )}
      </div>
    </CardContent>
  </Card>
)

// Stock Detail Dialog
function StockDetailDialog({ 
  stock, 
  open, 
  onOpenChange,
  dateLabel
}: { 
  stock: StockData | null
  open: boolean
  onOpenChange: (open: boolean) => void
  dateLabel: string
}) {
  const [activeTab, setActiveTab] = useState<'overview' | 'daily' | 'items' | 'records'>('overview')
  if (!stock) return null

  const totalUsed = stock.totalQuantityUsed
  const activeMenuItems = stock.menuItems.filter(item => item.quantityUsed > 0)
  const menuItemsTotal = activeMenuItems.reduce((s, m) => s + m.quantityUsed, 0)
  const stockRemaining = stock.currentStock
  const stockUsedPercent = (stock.currentStock + totalUsed) > 0
    ? (totalUsed / (stock.currentStock + totalUsed)) * 100
    : 0
  const totalDailyDays = stock.dailyUsage.length
  const avgDaily = totalDailyDays > 0 ? totalUsed / totalDailyDays : 0
  const maxDaily = stock.dailyUsage.length > 0 ? Math.max(...stock.dailyUsage.map(d => d.quantity)) : 0

  const tabs = [
    { key: 'overview' as const, label: 'Overview', icon: Package },
    { key: 'daily' as const, label: 'Usage Per Day', icon: Calendar },
    { key: 'items' as const, label: `Menu Items (${activeMenuItems.length})`, icon: Utensils },
    { key: 'records' as const, label: `Order Records (${stock.usageRecords.filter(r => r.quantityUsed > 0).length})`, icon: List },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            {stock.stockName}
            <Badge className={`text-xs ${STATUS_COLORS[stock.stockStatus]}`}>{stock.stockStatus} stock</Badge>
          </DialogTitle>
          <DialogDescription asChild>
            <div className="flex items-center gap-2 flex-wrap">
              <span>Category: {stock.stockCategory} · Unit: {stock.stockUnit}</span>
              <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                <Calendar className="h-3 w-3 mr-1" />
                {dateLabel}
              </Badge>
              {stock.lastRestockedAt && (
                <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Since last restock: {new Date(stock.lastRestockedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                </Badge>
              )}
            </div>
          </DialogDescription>
        </DialogHeader>
        
        {/* Tab Navigation */}
        <div className="flex gap-1 bg-muted p-1 rounded-xl overflow-x-auto">
          {tabs.map(({ key, label, icon: Icon }) => (
            <Button
              key={key}
              variant={activeTab === key ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab(key)}
              className="rounded-lg h-8 px-3 gap-1.5 text-xs whitespace-nowrap"
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </Button>
          ))}
        </div>

        <ScrollArea className="max-h-[65vh] pr-2">
          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-100">
                  <CardContent className="pt-3 pb-3 text-center">
                    <p className="text-xs text-muted-foreground">Total Consumed</p>
                    <p className="text-xl font-bold text-blue-700">{formatQuantity(totalUsed, stock.stockUnit)}</p>
                    <p className="text-xs text-muted-foreground">across {stock.frequency} uses</p>
                  </CardContent>
                </Card>
                <Card className="bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100">
                  <CardContent className="pt-3 pb-3 text-center">
                    <p className="text-xs text-muted-foreground">Remaining Stock</p>
                    <p className="text-xl font-bold text-emerald-700">{formatQuantity(stockRemaining, stock.stockUnit)}</p>
                    <p className="text-xs text-muted-foreground">in {stock.totalOrders} orders</p>
                  </CardContent>
                </Card>
                <Card className="bg-purple-50 dark:bg-purple-950/20 border-purple-100">
                  <CardContent className="pt-3 pb-3 text-center">
                    <p className="text-xs text-muted-foreground">Total Cost</p>
                    <p className="text-xl font-bold text-purple-700">{formatCurrency(stock.totalCost)}</p>
                    <p className="text-xs text-muted-foreground">{formatCurrency(avgDaily)}/day average</p>
                  </CardContent>
                </Card>
                <Card className="bg-amber-50 dark:bg-amber-950/20 border-amber-100">
                  <CardContent className="pt-3 pb-3 text-center">
                    <p className="text-xs text-muted-foreground">Consumption Rate</p>
                    <p className="text-xl font-bold text-amber-700">{stockUsedPercent.toFixed(1)}%</p>
                    <Progress value={stockUsedPercent} className="w-full h-1.5 mt-1" />
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium">Stock Flow Summary</p>
                    {stock.lastRestockedAt && (
                      <span className="text-xs text-muted-foreground">
                        Since restock: {new Date(stock.lastRestockedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-xs text-muted-foreground">Starting Stock</p>
                      <p className="text-sm font-bold">{formatQuantity(stockRemaining + totalUsed, stock.stockUnit)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Consumed</p>
                      <p className="text-sm font-bold text-red-600">-{formatQuantity(totalUsed, stock.stockUnit)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Remaining</p>
                      <p className="text-sm font-bold text-green-600">{formatQuantity(stockRemaining, stock.stockUnit)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* DAILY USAGE TAB */}
          {activeTab === 'daily' && (
            <div className="space-y-3">
              {stock.dailyUsage.length > 0 ? (
                <>
                  <div className="grid grid-cols-3 gap-3 mb-3">
                    <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-100">
                      <CardContent className="pt-2 pb-2 text-center">
                        <p className="text-xs text-muted-foreground">Days Active</p>
                        <p className="text-lg font-bold text-blue-700">{totalDailyDays}</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-violet-50 dark:bg-violet-950/20 border-violet-100">
                      <CardContent className="pt-2 pb-2 text-center">
                        <p className="text-xs text-muted-foreground">Avg/Day</p>
                        <p className="text-lg font-bold text-violet-700">{formatQuantity(avgDaily, stock.stockUnit, 3)}</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-rose-50 dark:bg-rose-950/20 border-rose-100">
                      <CardContent className="pt-2 pb-2 text-center">
                        <p className="text-xs text-muted-foreground">Peak Day</p>
                        <p className="text-lg font-bold text-rose-700">{formatQuantity(maxDaily, stock.stockUnit)}</p>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="rounded-md border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/40">
                          <TableHead className="text-xs">#</TableHead>
                          <TableHead className="text-xs">Date</TableHead>
                          <TableHead className="text-xs text-right">Quantity Used</TableHead>
                          <TableHead className="text-xs text-right">Cost</TableHead>
                          <TableHead className="text-xs text-right">Orders</TableHead>
                          <TableHead className="text-xs text-right">Usage Bar</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {[...stock.dailyUsage].reverse().map((day, idx) => {
                          const barWidth = maxDaily > 0 ? (day.quantity / maxDaily) * 100 : 0
                          return (
                            <TableRow key={idx} className="hover:bg-muted/30">
                              <TableCell className="text-xs text-muted-foreground w-8">{idx + 1}</TableCell>
                              <TableCell className="text-sm font-medium">
                                <div>{format(new Date(day.date), 'EEE, MMM d')}</div>
                                <div className="text-xs text-muted-foreground">{day.date}</div>
                              </TableCell>
                              <TableCell className="text-right font-mono text-sm font-bold">
                                {formatQuantity(day.quantity, stock.stockUnit)}
                              </TableCell>
                              <TableCell className="text-right text-sm text-purple-600">
                                {formatCurrency(day.cost)}
                              </TableCell>
                              <TableCell className="text-right">
                                <Badge variant="secondary" className="text-xs">{day.ordersCount}×</Badge>
                              </TableCell>
                              <TableCell className="text-right w-32">
                                <div className="flex items-center justify-end gap-1">
                                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                                    <div className="bg-blue-500 h-full rounded-full" style={{ width: `${barWidth}%` }} />
                                  </div>
                                  <span className="text-xs text-muted-foreground w-8 text-right">
                                    {((day.quantity / totalUsed) * 100).toFixed(0)}%
                                  </span>
                                </div>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="p-3 bg-muted/30 rounded-lg flex items-center justify-between">
                    <span className="text-sm font-medium">Total across {totalDailyDays} days</span>
                    <span className="font-bold text-blue-700">{formatQuantity(totalUsed, stock.stockUnit)}</span>
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-10 w-10 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No daily usage data for this period</p>
                </div>
              )}
            </div>
          )}

          {/* MENU ITEMS TAB */}
          {activeTab === 'items' && (
            <div className="space-y-3">
              {stock.menuItems && stock.menuItems.filter(item => item.quantityUsed > 0).length > 0 ? (
                <>
                  <div className="rounded-md border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/40">
                          <TableHead className="text-xs">#</TableHead>
                          <TableHead className="text-xs">Menu Item</TableHead>
                          <TableHead className="text-xs text-right">Total Qty Used</TableHead>
                          <TableHead className="text-xs text-right">Orders Count</TableHead>
                          <TableHead className="text-xs text-right">Avg/Order</TableHead>
                          <TableHead className="text-xs text-right">% of Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {stock.menuItems
                          .filter(item => item.quantityUsed > 0)
                          .sort((a, b) => b.quantityUsed - a.quantityUsed)
                          .map((item, idx) => {
                            const pct = menuItemsTotal > 0 ? (item.quantityUsed / menuItemsTotal) * 100 : 0
                            const avgPerOrder = item.ordersCount > 0 ? item.quantityUsed / item.ordersCount : item.quantityUsed
                            return (
                              <TableRow key={idx} className="hover:bg-muted/30">
                                <TableCell className="text-xs text-muted-foreground w-8">{idx + 1}</TableCell>
                                <TableCell>
                                  <div className="font-medium text-sm">{item.itemName}</div>
                                  <div className="text-xs text-muted-foreground">ID: {item.itemId?.substring(0, 8)}...</div>
                                </TableCell>
                                <TableCell className="text-right font-mono text-sm font-bold">
                                  {formatQuantity(item.quantityUsed, stock.stockUnit)}
                                </TableCell>
                                <TableCell className="text-right">
                                  <Badge variant="secondary" className="text-xs">{item.ordersCount || item.servingsCount || 1}</Badge>
                                </TableCell>
                                <TableCell className="text-right font-mono text-xs text-muted-foreground">
                                  {formatQuantity(avgPerOrder, stock.stockUnit, 3)}
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <Progress value={pct} className="w-14 h-1.5" />
                                    <span className="text-xs text-muted-foreground w-10 text-right">{pct.toFixed(1)}%</span>
                                  </div>
                                </TableCell>
                              </TableRow>
                            )
                          })}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="p-3 bg-muted/30 rounded-lg flex items-center justify-between">
                    <span className="text-sm font-medium">Total consumed across {activeMenuItems.length} menu items</span>
                    <span className="font-bold text-blue-700">{formatQuantity(menuItemsTotal, stock.stockUnit)}</span>
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Utensils className="h-10 w-10 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No menu items consumed this stock in this period</p>
                </div>
              )}
            </div>
          )}

          {/* ORDER RECORDS TAB */}
          {activeTab === 'records' && (
            <div className="space-y-3">
              {stock.usageRecords && stock.usageRecords.filter(r => r.quantityUsed > 0).length > 0 ? (
                <>
                  <div className="rounded-md border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/40">
                          <TableHead className="text-xs">#</TableHead>
                          <TableHead className="text-xs">Order</TableHead>
                          <TableHead className="text-xs">Date & Time</TableHead>
                          <TableHead className="text-xs text-right">Qty Used</TableHead>
                          <TableHead className="text-xs text-right">Cost</TableHead>
                          <TableHead className="text-xs">Items in Order</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {stock.usageRecords.filter(r => r.quantityUsed > 0).map((record, idx) => (
                          <TableRow key={idx} className="hover:bg-muted/30">
                            <TableCell className="text-xs text-muted-foreground w-8">{idx + 1}</TableCell>
                            <TableCell>
                              <div className="font-medium text-sm">{record.orderNumber}</div>
                              <div className="text-xs text-muted-foreground">ID: {record.orderId?.substring(0, 8)}...</div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">{format(new Date(record.usedAt), 'MMM d, yyyy')}</div>
                              <div className="text-xs text-muted-foreground">{format(new Date(record.usedAt), 'HH:mm')}</div>
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm font-bold">
                              {formatQuantity(record.quantityUsed, stock.stockUnit)}
                            </TableCell>
                            <TableCell className="text-right text-sm text-purple-600">
                              {formatCurrency(record.cost)}
                            </TableCell>
                            <TableCell>
                              <div className="space-y-0.5">
                                {record.items.map((ri, i) => (
                                  <div key={i} className="text-xs">
                                    <span className="font-medium">{ri.itemName}</span>
                                    <span className="text-muted-foreground ml-1">
                                      ({formatQuantity(ri.quantityUsed, stock.stockUnit)})
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="p-3 bg-muted/30 rounded-lg flex items-center justify-between">
                    <span className="text-sm font-medium">Total: {stock.usageRecords.filter(r => r.quantityUsed > 0).length} order records</span>
                    <span className="font-bold text-blue-700">{formatQuantity(totalUsed, stock.stockUnit)} consumed</span>
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <List className="h-10 w-10 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No order records with actual usage found</p>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}

// Menu Item Detail Dialog
function MenuItemDetailDialog({ 
  item, 
  open, 
  onOpenChange,
  dateLabel
}: { 
  item: MenuItemData | null
  open: boolean
  onOpenChange: (open: boolean) => void
  dateLabel: string
}) {
  const [activeTab, setActiveTab] = useState<'overview' | 'daily' | 'ingredients'>('overview')
  if (!item) return null

  const totalStockCost = item.stocksUsed.reduce((sum, s) => sum + s.totalCost, 0)
  const profit = item.totalRevenue - totalStockCost
  const profitMargin = item.totalRevenue > 0 ? (profit / item.totalRevenue) * 100 : 0
  const totalDailyDays = item.dailyUsage?.length || 0
  const avgDailyRevenue = totalDailyDays > 0 ? item.totalRevenue / totalDailyDays : 0
  const avgDailyQty = totalDailyDays > 0 ? item.totalQuantity / totalDailyDays : 0
  const maxDailyQty = item.dailyUsage?.length > 0 ? Math.max(...item.dailyUsage.map(d => d.quantity)) : 0
  const maxDailyRev = item.dailyUsage?.length > 0 ? Math.max(...item.dailyUsage.map(d => d.revenue)) : 0

  const tabs = [
    { key: 'overview' as const, label: 'Overview', icon: Utensils },
    { key: 'daily' as const, label: 'Usage Per Day', icon: Calendar },
    { key: 'ingredients' as const, label: `Ingredients (${item.stocksUsed.length})`, icon: Package },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <Utensils className="h-5 w-5 text-primary" />
            {item.itemName}
          </DialogTitle>
          <DialogDescription asChild>
            <div className="flex items-center gap-2 flex-wrap">
              <span>Ordered {item.frequency}× · Revenue: {formatCurrency(item.totalRevenue)}</span>
              <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                <Calendar className="h-3 w-3 mr-1" />
                {dateLabel}
              </Badge>
            </div>
          </DialogDescription>
        </DialogHeader>

        {/* Tab Navigation */}
        <div className="flex gap-1 bg-muted p-1 rounded-xl overflow-x-auto">
          {tabs.map(({ key, label, icon: Icon }) => (
            <Button
              key={key}
              variant={activeTab === key ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab(key)}
              className="rounded-lg h-8 px-3 gap-1.5 text-xs whitespace-nowrap"
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </Button>
          ))}
        </div>

        <ScrollArea className="max-h-[65vh] pr-2">
          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-100">
                  <CardContent className="pt-3 pb-3 text-center">
                    <p className="text-xs text-muted-foreground">Times Ordered</p>
                    <p className="text-xl font-bold text-blue-700">{item.frequency}×</p>
                    <p className="text-xs text-muted-foreground">{item.totalOrders} unique orders</p>
                  </CardContent>
                </Card>
                <Card className="bg-green-50 dark:bg-green-950/20 border-green-100">
                  <CardContent className="pt-3 pb-3 text-center">
                    <p className="text-xs text-muted-foreground">Total Revenue</p>
                    <p className="text-xl font-bold text-green-700">{formatCurrency(item.totalRevenue)}</p>
                    <p className="text-xs text-muted-foreground">avg {formatCurrency(item.averagePrice)}/unit</p>
                  </CardContent>
                </Card>
                <Card className="bg-purple-50 dark:bg-purple-950/20 border-purple-100">
                  <CardContent className="pt-3 pb-3 text-center">
                    <p className="text-xs text-muted-foreground">Ingredient Cost</p>
                    <p className="text-xl font-bold text-purple-700">{formatCurrency(totalStockCost)}</p>
                    <p className="text-xs text-muted-foreground">{item.stocksUsed.length} ingredients</p>
                  </CardContent>
                </Card>
                <Card className="bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100">
                  <CardContent className="pt-3 pb-3 text-center">
                    <p className="text-xs text-muted-foreground">Profit</p>
                    <p className={`text-xl font-bold ${profit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                      {formatCurrency(profit)}
                    </p>
                    <p className="text-xs text-muted-foreground">{profitMargin.toFixed(1)}% margin</p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <Card>
                  <CardContent className="pt-3 pb-3 text-center">
                    <p className="text-xs text-muted-foreground">Total Quantity Sold</p>
                    <p className="text-lg font-bold">{item.totalQuantity}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-3 pb-3 text-center">
                    <p className="text-xs text-muted-foreground">Total Quantity Stock Used</p>
                    <p className="text-lg font-bold">{formatQuantity(item.stocksUsed.reduce((s, x) => s + x.quantityUsed, 0), item.stocksUsed[0]?.stockUnit || '')}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-3 pb-3 text-center">
                    <p className="text-xs text-muted-foreground">Avg Price</p>
                    <p className="text-lg font-bold">{formatCurrency(item.averagePrice)}</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* DAILY USAGE TAB */}
          {activeTab === 'daily' && (
            <div className="space-y-3">
              {item.dailyUsage && item.dailyUsage.length > 0 ? (
                <>
                  <div className="grid grid-cols-3 gap-3 mb-3">
                    <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-100">
                      <CardContent className="pt-2 pb-2 text-center">
                        <p className="text-xs text-muted-foreground">Days Active</p>
                        <p className="text-lg font-bold text-blue-700">{totalDailyDays}</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-violet-50 dark:bg-violet-950/20 border-violet-100">
                      <CardContent className="pt-2 pb-2 text-center">
                        <p className="text-xs text-muted-foreground">Avg Revenue/Day</p>
                        <p className="text-lg font-bold text-violet-700">{formatCurrency(avgDailyRevenue)}</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-rose-50 dark:bg-rose-950/20 border-rose-100">
                      <CardContent className="pt-2 pb-2 text-center">
                        <p className="text-xs text-muted-foreground">Peak Day Revenue</p>
                        <p className="text-lg font-bold text-rose-700">{formatCurrency(maxDailyRev)}</p>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="rounded-md border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/40">
                          <TableHead className="text-xs">#</TableHead>
                          <TableHead className="text-xs">Date</TableHead>
                          <TableHead className="text-xs text-right">Quantity Sold</TableHead>
                          <TableHead className="text-xs text-right">Revenue</TableHead>
                          <TableHead className="text-xs text-right">Orders</TableHead>
                          <TableHead className="text-xs text-right">Usage Bar</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {[...item.dailyUsage].reverse().map((day, idx) => {
                          const barWidth = maxDailyRev > 0 ? (day.revenue / maxDailyRev) * 100 : 0
                          return (
                            <TableRow key={idx} className="hover:bg-muted/30">
                              <TableCell className="text-xs text-muted-foreground w-8">{idx + 1}</TableCell>
                              <TableCell className="text-sm font-medium">
                                <div>{format(new Date(day.date), 'EEE, MMM d')}</div>
                                <div className="text-xs text-muted-foreground">{day.date}</div>
                              </TableCell>
                              <TableCell className="text-right font-mono text-sm font-bold">
                                {day.quantity}
                              </TableCell>
                              <TableCell className="text-right text-sm text-green-600 font-bold">
                                {formatCurrency(day.revenue)}
                              </TableCell>
                              <TableCell className="text-right">
                                <Badge variant="secondary" className="text-xs">{day.ordersCount}×</Badge>
                              </TableCell>
                              <TableCell className="text-right w-32">
                                <div className="flex items-center justify-end gap-1">
                                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                                    <div className="bg-green-500 h-full rounded-full" style={{ width: `${barWidth}%` }} />
                                  </div>
                                  <span className="text-xs text-muted-foreground w-8 text-right">
                                    {((day.revenue / item.totalRevenue) * 100).toFixed(0)}%
                                  </span>
                                </div>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="p-3 bg-muted/30 rounded-lg flex items-center justify-between">
                    <span className="text-sm font-medium">Total across {totalDailyDays} days</span>
                    <span className="font-bold text-green-600">{formatCurrency(item.totalRevenue)}</span>
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-10 w-10 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No daily usage data for this period</p>
                </div>
              )}
            </div>
          )}

          {/* INGREDIENTS TAB */}
          {activeTab === 'ingredients' && (
            <div className="space-y-3">
              {item.stocksUsed.length > 0 ? (
                <>
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/40">
                          <TableHead className="text-xs">#</TableHead>
                          <TableHead className="text-xs">Ingredient</TableHead>
                          <TableHead className="text-xs text-right">Qty Used</TableHead>
                          <TableHead className="text-xs text-right">Cost</TableHead>
                          <TableHead className="text-xs text-right">Cost/Unit</TableHead>
                          <TableHead className="text-xs text-right">% Share</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {item.stocksUsed
                          .sort((a, b) => b.quantityUsed - a.quantityUsed)
                          .map((stock, idx) => {
                            const Icon = getIngredientIcon(stock.stockCategory)
                            const costPerUnit = stock.quantityUsed > 0 ? stock.totalCost / stock.quantityUsed : 0
                            return (
                              <TableRow key={idx} className="hover:bg-muted/30">
                                <TableCell className="text-xs text-muted-foreground w-8">{idx + 1}</TableCell>
                                <TableCell className="font-medium">
                                  <div className="flex items-center gap-2">
                                    <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                    <div>
                                      <p className="text-sm">{stock.stockName}</p>
                                      <p className="text-xs text-muted-foreground">{stock.stockCategory}</p>
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell className="text-right text-sm font-mono font-bold">
                                  {formatQuantity(stock.quantityUsed, stock.stockUnit)}
                                </TableCell>
                                <TableCell className="text-right text-sm text-purple-600 font-medium">
                                  {formatCurrency(stock.totalCost)}
                                </TableCell>
                                <TableCell className="text-right text-xs text-muted-foreground">
                                  {formatCurrency(costPerUnit)}
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <Progress value={stock.percentageOfItem} className="w-14 h-1.5" />
                                    <span className="text-xs text-muted-foreground w-10 text-right">{stock.percentageOfItem.toFixed(1)}%</span>
                                  </div>
                                </TableCell>
                              </TableRow>
                            )
                          })}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="p-3 bg-muted/30 rounded-lg flex items-center justify-between">
                    <span className="text-sm font-medium">Total ingredient cost ({item.stocksUsed.length} ingredients)</span>
                    <span className="font-bold text-purple-600">{formatCurrency(totalStockCost)}</span>
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-10 w-10 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No stock usage tracked for this item</p>
                  <p className="text-xs mt-1">in the selected period: {dateLabel}</p>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}

// Loading Skeleton
const LoadingSkeleton = () => (
  <div className="space-y-4 p-8">
    <div className="grid gap-4 md:grid-cols-2">
      <Skeleton className="h-24 rounded-xl" />
      <Skeleton className="h-24 rounded-xl" />
    </div>
    <Skeleton className="h-12 rounded-xl" />
    <div className="grid gap-4 md:grid-cols-2">
      <Skeleton className="h-[400px] rounded-xl" />
      <Skeleton className="h-[400px] rounded-xl" />
    </div>
    <Skeleton className="h-96 rounded-xl" />
  </div>
)

// Main Component Content
function StockReportContent() {
  const router = useRouter()
  const queryClient = useQueryClient()
  
  const [groupBy, setGroupBy] = useState<'stock' | 'menuItem'>('stock')
  const [dateRange, setDateRange] = useState<DateRange>(getDateRange('today'))
  const [activePreset, setActivePreset] = useState<DatePreset | 'weekday'>('today')
  const [selectedWeekday, setSelectedWeekday] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState('')
  const [searchType, setSearchType] = useState<'all' | 'stock' | 'menu'>('all')
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [sortBy, setSortBy] = useState<'frequency' | 'name' | 'usage'>('frequency')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [page, setPage] = useState(1)
  const [limit] = useState(20)

  // Separate queries for today/week/month stats
  const todayRange = getDateRange('today')
  const weekRange = getDateRange('week')
  const monthRange = getDateRange('month')

  const { data: todayData } = useQuery({
    queryKey: ['stock-stats-today'],
    queryFn: async () => {
      const p = new URLSearchParams({ groupBy: 'stock', sortBy: 'frequency', sortOrder: 'desc', page: '1', limit: '1000',
        from: todayRange.from!.toISOString(), to: todayRange.to!.toISOString() })
      const r = await api.get(`/reports/stock-usage?${p}`)
      return r.data as PaginatedResponse<StockData>
    },
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  })

  const { data: weekData } = useQuery({
    queryKey: ['stock-stats-week'],
    queryFn: async () => {
      const p = new URLSearchParams({ groupBy: 'stock', sortBy: 'frequency', sortOrder: 'desc', page: '1', limit: '1000',
        from: weekRange.from!.toISOString(), to: weekRange.to!.toISOString() })
      const r = await api.get(`/reports/stock-usage?${p}`)
      return r.data as PaginatedResponse<StockData>
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  })

  const { data: monthData } = useQuery({
    queryKey: ['stock-stats-month'],
    queryFn: async () => {
      const p = new URLSearchParams({ groupBy: 'stock', sortBy: 'frequency', sortOrder: 'desc', page: '1', limit: '1000',
        from: monthRange.from!.toISOString(), to: monthRange.to!.toISOString() })
      const r = await api.get(`/reports/stock-usage?${p}`)
      return r.data as PaginatedResponse<StockData>
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  })

  // Items sold today (menuItem groupBy)
  const { data: itemsTodayData } = useQuery({
    queryKey: ['items-sold-today'],
    queryFn: async () => {
      const p = new URLSearchParams({ groupBy: 'menuItem', sortBy: 'frequency', sortOrder: 'desc', page: '1', limit: '1000',
        from: todayRange.from!.toISOString(), to: todayRange.to!.toISOString() })
      const r = await api.get(`/reports/stock-usage?${p}`)
      return r.data as PaginatedResponse<MenuItemData>
    },
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  })

  // Computed stats
  const todayStockStats = useMemo(() => ({
    processed: todayData?.pagination?.total || 0,
    totalCost: todayData?.summary?.totalCost || 0,
    totalQty: todayData?.data?.reduce((s, i) => s + i.totalQuantityUsed, 0) || 0,
    processedMenuItems: todayData?.summary?.totalProcessedMenuItems || 0,
    uniqueOrders: todayData?.summary?.totalUniqueOrders || 0,
  }), [todayData])

  const monthStockStats = useMemo(() => ({
    processed: monthData?.pagination?.total || 0,
    totalCost: monthData?.summary?.totalCost || 0,
    processedMenuItems: monthData?.summary?.totalProcessedMenuItems || 0,
    uniqueOrders: monthData?.summary?.totalUniqueOrders || 0,
  }), [monthData])

  const itemsTodayStats = useMemo(() => {
    const items = itemsTodayData?.data || []
    return {
      uniqueItems: items.length,
      totalSold: items.reduce((s, i) => s + i.totalQuantity, 0),
      totalRevenue: itemsTodayData?.summary?.totalRevenue || 0,
      topItem: items[0] || null,
    }
  }, [itemsTodayData])
  
  const [selectedMenuItem, setSelectedMenuItem] = useState<MenuItemData | null>(null)
  const [selectedStock, setSelectedStock] = useState<StockData | null>(null)
  const [showMenuItemDialog, setShowMenuItemDialog] = useState(false)
  const [showStockDialog, setShowStockDialog] = useState(false)

  // Human-readable label for the active date range — shown inside detail dialogs
  const dateLabel = useMemo(() => {
    if (activePreset === 'today') return 'Today'
    if (activePreset === 'yesterday') return 'Yesterday'
    if (activePreset === 'week') return 'This Week'
    if (activePreset === 'month') return 'This Month'
    if (activePreset === 'year') return 'This Year'
    if (activePreset === 'all') return 'All Time'
    if (activePreset === 'weekday' && selectedWeekday !== '') {
      return ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'][parseInt(selectedWeekday)]
    }
    if (dateRange.from && dateRange.to) {
      return `${format(dateRange.from, 'MMM d')} – ${format(dateRange.to, 'MMM d, yyyy')}`
    }
    return 'Selected Period'
  }, [activePreset, selectedWeekday, dateRange])

  const { data, isLoading, isFetching, error, refetch } = useReportData({
    groupBy, dateRange, search: searchTerm, searchType, sortBy, sortOrder, page, limit
  })

  const reportData = data?.data || []
  const pagination = data?.pagination
  const summary = data?.summary

  useEffect(() => { setPage(1) }, [groupBy, dateRange, searchTerm, searchType, sortBy, sortOrder])
  
  // Chart data based on groupBy
  const chartData = useMemo(() => {
    const top10 = [...reportData].sort((a, b) => {
      if (groupBy === 'stock') {
        return (b as StockData).frequency - (a as StockData).frequency
      } else {
        return (b as MenuItemData).frequency - (a as MenuItemData).frequency
      }
    }).slice(0, 10)
    
    return top10.map((item, index) => ({
      name: groupBy === 'stock' 
        ? (item as StockData).stockName?.length > 20 ? (item as StockData).stockName.substring(0, 20) + '...' : (item as StockData).stockName
        : (item as MenuItemData).itemName?.length > 20 ? (item as MenuItemData).itemName.substring(0, 20) + '...' : (item as MenuItemData).itemName,
      frequency: groupBy === 'stock' ? (item as StockData).frequency : (item as MenuItemData).frequency,
      fill: FREQUENCY_COLORS[index % FREQUENCY_COLORS.length]
    }))
  }, [reportData, groupBy])
  
  const handleExport = () => {
    if (!reportData.length) return
    
    try {
      let exportData: any[] = []
      
      if (groupBy === 'stock') {
        exportData = reportData.map((stock: StockData, idx: number) => ({
          'Rank': idx + 1,
          'Stock Item': stock.stockName,
          'Category': stock.stockCategory,
          'Frequency': stock.frequency,
          'Orders': stock.totalOrders,
          'Total Used': formatQuantity(stock.totalQuantityUsed, stock.stockUnit),
          'Current Stock': formatQuantity(stock.currentStock, stock.stockUnit),
          'Status': stock.stockStatus,
          'Total Cost': formatCurrency(stock.totalCost),
          'Last Used': formatDate(stock.lastUsed),
          'Menu Items Using': stock.menuItems.length,
        }))
      } else {
        exportData = reportData.map((item: MenuItemData, idx: number) => ({
          'Rank': idx + 1,
          'Menu Item': item.itemName,
          'Frequency': item.frequency,
          'Orders': item.totalOrders,
          'Revenue': formatCurrency(item.totalRevenue),
          'Ingredients': item.stocksUsed.length,
          'Ingredient Cost': formatCurrency(item.stocksUsed.reduce((sum, s) => sum + s.totalCost, 0))
        }))
      }
      
      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.json_to_sheet(exportData)
      XLSX.utils.book_append_sheet(wb, ws, `${groupBy === 'stock' ? 'Stock' : 'MenuItem'}-Report-${format(new Date(), 'yyyy-MM-dd')}`)
      XLSX.writeFile(wb, `${groupBy === 'stock' ? 'stock' : 'menu-item'}-report-${format(new Date(), 'yyyy-MM-dd')}.xlsx`)
    } catch (err) {
      console.error('Export error:', err)
    }
  }
  
  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['stock-usage-report'] })
    refetch()
  }

  const handleDatePreset = (type: DatePreset) => {
    setActivePreset(type)
    setSelectedWeekday('')
    setDateRange(getDateRange(type))
  }

  const handleWeekdaySelect = (val: string) => {
    setSelectedWeekday(val)
    setActivePreset('weekday')
    setDateRange(getWeekdayRange(parseInt(val)))
  }
  
  const totalItems = pagination?.total || reportData.length
  const totalCost = summary?.totalCost || reportData.reduce((sum, item) => sum + (groupBy === 'stock' ? ((item as StockData).totalCost) : 0), 0)
  const totalFrequency = summary?.totalFrequency || summary?.totalItems || reportData.reduce((sum, item) => sum + (groupBy === 'stock' ? (item as StockData).frequency : (item as MenuItemData).frequency), 0)
  const totalProcessedMenuItems = summary?.totalProcessedMenuItems || 0
  const totalUniqueOrders = summary?.totalUniqueOrders || 0
  const hasProcessedData = reportData.length > 0 && !isLoading
  
  if (isLoading && !reportData.length) {
    return <LoadingSkeleton />
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <div className="flex-1 space-y-6 p-6 lg:p-8">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
              className="rounded-full hover:bg-primary/10 hover:text-primary transition-all duration-300"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-primary to-gray-900 dark:from-white dark:via-primary dark:to-white bg-clip-text text-transparent">
                Stock & Menu Usage Report
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Monitor ingredient consumption, menu item sales, and cost breakdowns
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isFetching}
              className="rounded-xl"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            
            <Button size="sm" onClick={handleExport} variant="default" disabled={!reportData.length} className="rounded-xl bg-gradient-to-r from-primary to-primary/80">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
        
        {/* Error Alert */}
        {error && (
          <Card className="border-rose-500 bg-rose-50 dark:bg-rose-950/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 text-rose-500">
                <AlertCircle className="h-5 w-5" />
                <p>Failed to load report data. Please try again.</p>
                <Button variant="outline" size="sm" onClick={handleRefresh} className="ml-auto">
                  Retry
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Report Type Selection Cards */}
        <div className="grid gap-4 md:grid-cols-2">
          <ReportTypeCard
            title="Stock Report"
            icon={Package}
            count={totalItems}
            isActive={groupBy === 'stock'}
            onClick={() => setGroupBy('stock')}
            color="blue"
          />
          <ReportTypeCard
            title="Menu Item Report"
            icon={Utensils}
            count={totalItems}
            isActive={groupBy === 'menuItem'}
            onClick={() => setGroupBy('menuItem')}
            color="green"
          />
        </div>
        
        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="shadow-lg border-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {groupBy === 'stock' ? 'Stock Items Tracked' : 'Menu Items Tracked'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalItems}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {groupBy === 'stock' ? 'ingredients used in this period' : 'products sold in this period'}
              </p>
            </CardContent>
          </Card>
          <Card className="shadow-lg border-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {groupBy === 'stock' ? 'Total Usage Count' : 'Total Order Count'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalFrequency}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {groupBy === 'stock' ? 'times ingredients were consumed' : 'total orders containing these items'}
              </p>
            </CardContent>
          </Card>
          <Card className="shadow-lg border-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {groupBy === 'stock' ? 'Total Ingredient Cost' : 'Total Revenue'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {groupBy === 'stock' ? formatCurrency(totalCost) : formatCurrency(summary?.totalRevenue || 0)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {groupBy === 'stock' ? 'cost of all consumed ingredients' : 'income from all sales'}
              </p>
            </CardContent>
          </Card>
          {groupBy === 'stock' && totalProcessedMenuItems > 0 && (
            <Card className="shadow-lg border-0">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Menu Items Processed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">{totalProcessedMenuItems}</div>
                <p className="text-xs text-muted-foreground mt-1">{totalUniqueOrders} unique orders fulfilled</p>
              </CardContent>
            </Card>
          )}
          {groupBy === 'menuItem' && (
            <Card className="shadow-lg border-0">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Unique Orders</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">{summary?.totalOrders || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">distinct orders for these items</p>
              </CardContent>
            </Card>
          )}
        </div>
        
        {/* Stock Processed Stats Row */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="shadow-lg border-0 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/30">
            <CardContent className="pt-4">
              <p className="text-xs font-medium text-blue-600 mb-1">Today's Stock Usage</p>
              <p className="text-3xl font-bold text-blue-700">{todayStockStats.processed}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {todayStockStats.uniqueOrders} orders fulfilled · {formatCurrency(todayStockStats.totalCost)} total cost
              </p>
            </CardContent>
          </Card>
          <Card className="shadow-lg border-0 bg-gradient-to-br from-violet-50 to-violet-100 dark:from-violet-950/30 dark:to-violet-900/30">
            <CardContent className="pt-4">
              <p className="text-xs font-medium text-violet-600 mb-1">Today's Menu Activity</p>
              <p className="text-3xl font-bold text-violet-700">{todayStockStats.processedMenuItems}</p>
              <p className="text-xs text-muted-foreground mt-1">different menu items consumed stock</p>
            </CardContent>
          </Card>
          <Card className="shadow-lg border-0 bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/30 dark:to-emerald-900/30">
            <CardContent className="pt-4">
              <p className="text-xs font-medium text-emerald-600 mb-1">This Month's Stock Usage</p>
              <p className="text-3xl font-bold text-emerald-700">{monthStockStats.processed}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {monthStockStats.processedMenuItems} menu items · {formatCurrency(monthStockStats.totalCost)} total cost
              </p>
            </CardContent>
          </Card>
          <Card className="shadow-lg border-0 bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/30 dark:to-amber-900/30">
            <CardContent className="pt-4">
              <p className="text-xs font-medium text-amber-600 mb-1">Today's Sales Summary</p>
              <p className="text-3xl font-bold text-amber-700">{itemsTodayStats.totalSold}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {itemsTodayStats.uniqueItems} unique items · {itemsTodayStats.topItem ? `Top: ${itemsTodayStats.topItem.itemName}` : 'No sales yet'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Date Filter Bar */}
        <Card className="shadow-lg border-0">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calendar className="h-5 w-5 text-primary" />
              Date Filter
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2 items-center">
              {([
                { label: 'All Time', value: 'all' },
                { label: 'Today', value: 'today' },
                { label: 'Yesterday', value: 'yesterday' },
                { label: 'This Week', value: 'week' },
                { label: 'This Month', value: 'month' },
                { label: 'This Year', value: 'year' },
              ] as { label: string; value: DatePreset }[]).map(({ label, value }) => (
                <Button
                  key={value}
                  variant={activePreset === value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleDatePreset(value)}
                  className="rounded-full"
                >
                  {label}
                </Button>
              ))}

              {/* Day of week dropdown */}
              <Select value={selectedWeekday} onValueChange={handleWeekdaySelect}>
                <SelectTrigger className={`w-[150px] rounded-full h-9 text-sm ${
                  activePreset === 'weekday' ? 'bg-primary text-primary-foreground border-primary' : ''
                }`}>
                  <SelectValue placeholder="📅 Day of week" />
                </SelectTrigger>
                <SelectContent>
                  {['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map((day, i) => (
                    <SelectItem key={i} value={String(i)}>{day}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Popover open={showDatePicker} onOpenChange={setShowDatePicker}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="rounded-full ml-auto">
                    <Calendar className="mr-2 h-4 w-4" />
                    Custom Range
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <CalendarComponent
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange.from || new Date()}
                    selected={{ from: dateRange.from || undefined, to: dateRange.to || undefined }}
                    onSelect={(range: any) => {
                      if (range?.from && range?.to) {
                        setActivePreset('all') // clear preset
                        setSelectedWeekday('')
                        setDateRange({ from: startOfDay(range.from), to: endOfDay(range.to) })
                      } else if (range?.from) {
                        setDateRange({ from: startOfDay(range.from), to: null })
                      } else {
                        setDateRange({ from: null, to: null })
                      }
                      setShowDatePicker(false)
                    }}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {dateRange.from && dateRange.to && (
              <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                {format(dateRange.from, 'EEE, MMM d yyyy')} → {format(dateRange.to, 'EEE, MMM d yyyy')}
                {activePreset === 'weekday' && selectedWeekday !== '' && (
                  <Badge variant="secondary" className="ml-2">
                    {['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'][parseInt(selectedWeekday)]}
                  </Badge>
                )}
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Bar Chart - Top 10 by Frequency */}
        {hasProcessedData && chartData.length > 0 && (
          <Card className="shadow-lg border-0">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <BarChart3 className="h-4 w-4 text-white" />
                </div>
                <CardTitle className="text-lg">Top 10 {groupBy === 'stock' ? 'Stock Items' : 'Menu Items'} by Usage Frequency</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={chartData} layout="vertical" margin={{ left: 120, right: 20, top: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" label={{ value: 'Frequency (Times)', position: 'bottom' }} />
                  <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value) => [`${value} times`, 'Frequency']} />
                  <Bar dataKey="frequency" radius={[0, 8, 8, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
        
        {/* Search and Sort Bar */}
        {hasProcessedData && (
        <Card className="shadow-lg border-0">
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4 items-center justify-between">
              <div className="flex-1 min-w-[280px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={
                      searchType === 'stock' ? "Search by stock name or category..." :
                      searchType === 'menu' ? "Search by menu item name..." :
                      "Search stocks, menu items, or categories..."
                    }
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 pr-9 rounded-xl h-11"
                  />
                  {searchTerm && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full"
                      onClick={() => setSearchTerm('')}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
              
              {/* Search Type Toggle */}
              <div className="flex items-center gap-1 bg-muted p-1 rounded-xl">
                {([
                  { label: 'All', value: 'all' as const, icon: Layers },
                  { label: 'Stock', value: 'stock' as const, icon: Package },
                  { label: 'Menu', value: 'menu' as const, icon: Utensils },
                ]).map(({ label, value, icon: Icon }) => (
                  <Button
                    key={value}
                    variant={searchType === value ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setSearchType(value)}
                    className={`rounded-lg h-9 px-3 gap-1.5 ${searchType === value ? 'shadow-sm' : ''}`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                  </Button>
                ))}
              </div>
              
              <div className="flex gap-2">
                <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                  <SelectTrigger className="w-[160px] rounded-xl">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="frequency">📊 Most Used</SelectItem>
                    <SelectItem value="name">📝 Name</SelectItem>
                    {groupBy === 'stock' && (
                      <SelectItem value="usage">📦 Quantity Used</SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="rounded-xl"
                >
                  {sortOrder === 'asc' ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            
            {/* Active search indicator */}
            {searchTerm && (
              <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                <Search className="h-3.5 w-3.5" />
                Searching "{searchTerm}" in 
                <Badge variant="secondary" className="text-xs">
                  {searchType === 'all' ? 'Stocks & Menu Items' : searchType === 'stock' ? 'Stock Items' : 'Menu Items'}
                </Badge>
                {isFetching && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              </div>
            )}
          </CardContent>
        </Card>
        )}
        
        {/* Data Table */}
        {hasProcessedData ? (
        <Card className="shadow-xl border-0">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              {groupBy === 'stock' ? (
                <>
                  <Package className="h-5 w-5 text-primary" />
                  Stock Details
                </>
              ) : (
                <>
                  <Utensils className="h-5 w-5 text-primary" />
                  Menu Item Details
                </>
              )}
              <Badge variant="outline" className="text-sm rounded-full">
                Page {pagination?.page || 1} of {pagination?.totalPages || 1}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {reportData.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <AlertCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No data found for the selected filters</p>
                <Button variant="outline" size="sm" onClick={handleRefresh} className="mt-4">
                  Refresh
                </Button>
              </div>
            ) : (
              <>
                <div className="rounded-xl border overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead className="w-12">#</TableHead>
                        {groupBy === 'stock' ? (
                          <>
                            <TableHead>Stock Item</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead className="text-center">Usage Count</TableHead>
                            <TableHead className="text-center">Orders</TableHead>
                            <TableHead className="text-right">Total Consumed</TableHead>
                            <TableHead className="text-right">Remaining Stock</TableHead>
                            <TableHead>Stock Level</TableHead>
                            <TableHead>Last Used</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </>
                        ) : (
                          <>
                            <TableHead>Menu Item</TableHead>
                            <TableHead className="text-center">Times Ordered</TableHead>
                            <TableHead className="text-center">Unique Orders</TableHead>
                            <TableHead className="text-right">Total Revenue</TableHead>
                            <TableHead className="text-center">Ingredients Used</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(reportData as any[]).map((item, idx) => {
                        const rank = ((pagination?.page || 1) - 1) * limit + idx + 1
                        
                        return (
                          <TableRow key={groupBy === 'stock' ? (item as StockData).stockId : (item as MenuItemData).itemId} className="hover:bg-muted/30 transition-colors">
                            <TableCell className="font-bold text-primary">
                              <div className="flex items-center gap-1">
                                {getRankIcon(rank)}
                                <span>{rank}</span>
                              </div>
                            </TableCell>
                            {groupBy === 'stock' ? (
                              <>
                                <TableCell className="font-medium flex items-center gap-2">
                                  {(() => {
                                    const Icon = getIngredientIcon((item as StockData).stockCategory)
                                    return <Icon className="h-4 w-4 text-muted-foreground" />
                                  })()}
                                  {(item as StockData).stockName}
                                </TableCell>
                                <TableCell>{(item as StockData).stockCategory}</TableCell>
                                <TableCell className="text-center">
                                  <Badge variant="secondary" className="font-mono rounded-full">
                                    {(item as StockData).frequency}×
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-center">
                                  <Badge variant="outline" className="font-mono rounded-full text-xs">
                                    {(item as StockData).totalOrders} orders
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right font-medium">{formatQuantity((item as StockData).totalQuantityUsed, (item as StockData).stockUnit)}</TableCell>
                                <TableCell className="text-right">{formatQuantity((item as StockData).currentStock, (item as StockData).stockUnit)}</TableCell>
                                <TableCell>
                                  <Badge className={STATUS_COLORS[(item as StockData).stockStatus]}>
                                    {(item as StockData).stockStatus}
                                  </Badge>
                                </TableCell>
                                <TableCell>{formatDate((item as StockData).lastUsed)}</TableCell>
                                <TableCell className="text-right">
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => {
                                      setSelectedStock(item as StockData)
                                      setShowStockDialog(true)
                                    }}
                                    className="rounded-lg"
                                  >
                                    <Eye className="h-4 w-4 mr-2" />
                                    Details
                                  </Button>
                                </TableCell>
                              </>
                            ) : (
                              <>
                                <TableCell className="font-medium">{(item as MenuItemData).itemName}</TableCell>
                                <TableCell className="text-center">
                                  <Badge variant="secondary" className="font-mono rounded-full">
                                    {(item as MenuItemData).frequency}×
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-center">{(item as MenuItemData).totalOrders} orders</TableCell>
                                <TableCell className="text-right text-green-600 font-medium">{formatCurrency((item as MenuItemData).totalRevenue)}</TableCell>
                                <TableCell className="text-center">
                                  {(item as MenuItemData).stocksUsed?.length > 0 ? (
                                    <Badge variant="default" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300 rounded-full">
                                      {(item as MenuItemData).stocksUsed.length} ingredients
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-amber-600 rounded-full">
                                      No tracking
                                    </Badge>
                                  )}
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => {
                                      setSelectedMenuItem(item as MenuItemData)
                                      setShowMenuItemDialog(true)
                                    }}
                                    className="rounded-lg"
                                  >
                                    <Eye className="h-4 w-4 mr-2" />
                                    Details
                                  </Button>
                                </TableCell>
                              </>
                            )}
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
                
                {/* Pagination */}
                {pagination && pagination.totalPages > 1 && (
                  <div className="flex items-center justify-between mt-6 pt-4 border-t">
                    <p className="text-sm text-muted-foreground">
                      Showing {((pagination.page - 1) * limit) + 1} to {Math.min(pagination.page * limit, pagination.total)} of {pagination.total}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={pagination.page === 1 || isFetching}
                        className="rounded-lg"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </Button>
                      <span className="text-sm font-medium">
                        Page {pagination.page} of {pagination.totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                        disabled={pagination.page === pagination.totalPages || isFetching}
                        className="rounded-lg"
                      >
                        Next
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
        ) : (
        /* No Processed Stock Empty State */
        <Card className="shadow-lg border-0">
          <CardContent className="pt-12 pb-12">
            <div className="text-center">
              <div className="h-20 w-20 mx-auto mb-4 rounded-full bg-muted/50 flex items-center justify-center">
                <Package className="h-10 w-10 text-muted-foreground/50" />
              </div>
              <h3 className="text-lg font-semibold text-muted-foreground mb-2">No Data for This Period</h3>
              <p className="text-sm text-muted-foreground/70 max-w-md mx-auto">
                {groupBy === 'stock' 
                  ? 'No stock usage has been recorded for the selected date range.' 
                  : 'No menu item sales have been recorded for the selected date range.'}
                {dateLabel !== 'All Time' && (
                  <span className="block mt-1">
                    Try selecting "All Time" to see all historical data, or choose a different date range.
                  </span>
                )}
              </p>
              <div className="flex items-center justify-center gap-2 mt-4">
                <Button variant="outline" size="sm" onClick={() => handleDatePreset('all')} className="rounded-xl">
                  View All Time
                </Button>
                <Button variant="outline" size="sm" onClick={handleRefresh} className="rounded-xl">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        )}
      </div>
      
      {/* Dialogs */}
      <MenuItemDetailDialog 
        item={selectedMenuItem} 
        open={showMenuItemDialog} 
        onOpenChange={setShowMenuItemDialog}
        dateLabel={dateLabel}
      />
      
      <StockDetailDialog 
        stock={selectedStock} 
        open={showStockDialog} 
        onOpenChange={setShowStockDialog}
        dateLabel={dateLabel}
      />
    </div>
  )
}

// Main export with QueryClientProvider
export default function OptimizedStockReportPage() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            gcTime: 5 * 60 * 1000,
            refetchOnWindowFocus: false,
            retry: 2,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      <StockReportContent />
    </QueryClientProvider>
  )
}