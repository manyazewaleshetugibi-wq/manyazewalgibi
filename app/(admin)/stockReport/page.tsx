"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"
import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Package,
  TrendingUp,
  TrendingDown,
  Download,
  Eye,
  Filter,
  Search,
  X,
  Calendar,
  RefreshCw,
  AlertCircle,
  ChevronLeft,
  DollarSign,
  Utensils,
  List,
  Grid3x3,
  Clock,
  BarChart3,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Loader2,
  Beef,
  Coffee,
  Milk,
  Apple,
  Egg,
  Wheat,
  Zap,
  Flame,
  Crown,
  Star,
  Sparkles,
  Activity,
  PieChart,
  Layers,
  TrendingUp as TrendingUpIcon
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
  PieChart as RePieChart,
  Pie,
  Legend
} from "recharts"
import * as XLSX from "xlsx"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subDays, subMonths } from "date-fns"
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
  menuItems: Array<{
    itemId: string
    itemName: string
    quantityUsed: number
    servingsCount: number
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

const getDateRange = (type: 'today' | 'week' | 'month' | 'year' | 'all'): DateRange => {
  const now = new Date()
  
  switch (type) {
    case 'today':
      return { from: startOfDay(now), to: endOfDay(now) }
    case 'week':
      const weekStart = startOfWeek(now, { weekStartsOn: 0 })
      const weekEnd = endOfWeek(now, { weekStartsOn: 0 })
      return { from: weekStart, to: weekEnd }
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
  sortBy: string
  sortOrder: 'asc' | 'desc'
  page: number
  limit: number
}) => {
  const debouncedSearch = useDebounce(params.search, 500)
  
  return useQuery({
    queryKey: ['stock-usage-report', params.groupBy, params.dateRange, debouncedSearch, params.sortBy, params.sortOrder, params.page, params.limit],
    queryFn: async () => {
      const queryParams = new URLSearchParams({
        groupBy: params.groupBy,
        sortBy: params.sortBy,
        sortOrder: params.sortOrder,
        search: debouncedSearch,
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
function StockDetailDialog({ stock, open, onOpenChange }: { stock: StockData | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  if (!stock) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[650px]">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
              <Package className="h-5 w-5 text-white" />
            </div>
            {stock.stockName}
          </DialogTitle>
          <DialogDescription>
            Used {stock.frequency} times | Total Cost: {formatCurrency(stock.totalCost)}
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/30">
            <CardContent className="pt-4 text-center">
              <p className="text-sm text-muted-foreground">Total Used</p>
              <p className="text-2xl font-bold text-blue-600">{formatQuantity(stock.totalQuantityUsed, stock.stockUnit)}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/30 dark:to-emerald-900/30">
            <CardContent className="pt-4 text-center">
              <p className="text-sm text-muted-foreground">Current Stock</p>
              <p className="text-2xl font-bold text-emerald-600">{formatQuantity(stock.currentStock, stock.stockUnit)}</p>
              <Badge className={STATUS_COLORS[stock.stockStatus]}>{stock.stockStatus}</Badge>
            </CardContent>
          </Card>
        </div>
        {stock.menuItems && stock.menuItems.length > 0 && (
          <div className="mt-4">
            <h4 className="font-semibold mb-2">Used in Menu Items:</h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {stock.menuItems.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
                  <span className="text-sm">{item.itemName}</span>
                  <Badge variant="outline">{formatQuantity(item.quantityUsed, stock.stockUnit)}</Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

// Menu Item Detail Dialog
function MenuItemDetailDialog({ item, open, onOpenChange }: { item: MenuItemData | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  if (!item) return null

  const totalStockCost = item.stocksUsed.reduce((sum, s) => sum + s.totalCost, 0)
  const profitMargin = totalStockCost > 0 ? ((item.totalRevenue - totalStockCost) / item.totalRevenue) * 100 : 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Utensils className="h-6 w-6 text-primary" />
            {item.itemName}
          </DialogTitle>
          <DialogDescription>
            Ordered {item.frequency} times | Revenue: {formatCurrency(item.totalRevenue)}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh] pr-4">
          <div className="grid grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="pt-4 text-center">
                <p className="text-sm text-muted-foreground">Frequency</p>
                <p className="text-3xl font-bold">{item.frequency}×</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <p className="text-sm text-muted-foreground">Revenue</p>
                <p className="text-xl font-bold text-green-600">{formatCurrency(item.totalRevenue)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <p className="text-sm text-muted-foreground">Ingredients</p>
                <p className="text-2xl font-bold">{item.stocksUsed.length}</p>
              </CardContent>
            </Card>
          </div>

          {item.stocksUsed.length > 0 && (
            <div className="mb-4">
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Package className="h-4 w-4" />
                Ingredients Used
              </h4>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ingredient</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead className="text-right">Cost</TableHead>
                      <TableHead className="text-right">% of Item</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {item.stocksUsed.map((stock, idx) => {
                      const Icon = getIngredientIcon(stock.stockCategory)
                      return (
                        <TableRow key={idx}>
                          <TableCell className="font-medium flex items-center gap-2">
                            <Icon className="h-4 w-4 text-muted-foreground" />
                            {stock.stockName}
                          </TableCell>
                          <TableCell>{stock.stockCategory}</TableCell>
                          <TableCell className="text-right">{formatQuantity(stock.quantityUsed, stock.stockUnit)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(stock.totalCost)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Progress value={stock.percentageOfItem} className="w-16 h-2" />
                              <span className="text-xs">{stock.percentageOfItem.toFixed(1)}%</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
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
  
  const [groupBy, setGroupBy] = useState<'stock' | 'menuItem'>('stock') // Default to stock
  const [dateRange, setDateRange] = useState<DateRange>(getDateRange('month'))
  const [searchTerm, setSearchTerm] = useState('')
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [viewLayout] = useState<'table'>('table') // Only table view
  const [sortBy, setSortBy] = useState<'frequency' | 'name' | 'usage'>('frequency')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [page, setPage] = useState(1)
  const [limit] = useState(20)
  
  const [selectedMenuItem, setSelectedMenuItem] = useState<MenuItemData | null>(null)
  const [selectedStock, setSelectedStock] = useState<StockData | null>(null)
  const [showMenuItemDialog, setShowMenuItemDialog] = useState(false)
  const [showStockDialog, setShowStockDialog] = useState(false)
  
  const { data, isLoading, isFetching, error, refetch } = useReportData({
    groupBy,
    dateRange,
    search: searchTerm,
    sortBy,
    sortOrder,
    page,
    limit
  })
  
  const reportData = data?.data || []
  const pagination = data?.pagination
  const summary = data?.summary
  
  useEffect(() => {
    setPage(1)
  }, [groupBy, dateRange, searchTerm, sortBy, sortOrder])
  
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
          'Total Used': formatQuantity(stock.totalQuantityUsed, stock.stockUnit),
          'Current Stock': formatQuantity(stock.currentStock, stock.stockUnit),
          'Status': stock.stockStatus,
          'Total Cost': formatCurrency(stock.totalCost),
          'Last Used': formatDate(stock.lastUsed),
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

  const handleDatePreset = (type: 'today' | 'week' | 'month' | 'year' | 'all') => {
    setDateRange(getDateRange(type))
  }
  
  const totalItems = pagination?.total || reportData.length
  const totalCost = summary?.totalCost || reportData.reduce((sum, item) => sum + (groupBy === 'stock' ? (item as StockData).totalCost : 0), 0)
  const totalFrequency = reportData.reduce((sum, item) => sum + (groupBy === 'stock' ? (item as StockData).frequency : (item as MenuItemData).frequency), 0)
  
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
                Usage Analytics
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Track stock and menu item usage frequency
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
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="shadow-lg border-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total {groupBy === 'stock' ? 'Stocks' : 'Menu Items'}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalItems}</div>
              <p className="text-xs text-muted-foreground mt-1">active items</p>
            </CardContent>
          </Card>
          <Card className="shadow-lg border-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Frequency</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalFrequency}</div>
              <p className="text-xs text-muted-foreground mt-1">total {groupBy === 'stock' ? 'uses' : 'orders'}</p>
            </CardContent>
          </Card>
          <Card className="shadow-lg border-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total {groupBy === 'stock' ? 'Cost' : 'Revenue'}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{groupBy === 'stock' ? formatCurrency(totalCost) : formatCurrency(summary?.totalRevenue || 0)}</div>
              <p className="text-xs text-muted-foreground mt-1">from {groupBy === 'stock' ? 'usage' : 'sales'}</p>
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
            <div className="flex flex-wrap gap-2">
              <Button 
                variant={!dateRange.from && !dateRange.to ? "default" : "outline"} 
                size="sm" 
                onClick={() => handleDatePreset('all')}
                className="rounded-full"
              >
                All Time
              </Button>
              <Button 
                variant={dateRange.from === getDateRange('today').from ? "default" : "outline"} 
                size="sm" 
                onClick={() => handleDatePreset('today')}
                className="rounded-full"
              >
                Today
              </Button>
              <Button 
                variant={dateRange.from === getDateRange('week').from ? "default" : "outline"} 
                size="sm" 
                onClick={() => handleDatePreset('week')}
                className="rounded-full"
              >
                This Week
              </Button>
              <Button 
                variant={dateRange.from === getDateRange('month').from ? "default" : "outline"} 
                size="sm" 
                onClick={() => handleDatePreset('month')}
                className="rounded-full"
              >
                This Month
              </Button>
              <Button 
                variant={dateRange.from === getDateRange('year').from ? "default" : "outline"} 
                size="sm" 
                onClick={() => handleDatePreset('year')}
                className="rounded-full"
              >
                This Year
              </Button>
              
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
                    selected={{
                      from: dateRange.from || undefined,
                      to: dateRange.to || undefined,
                    }}
                    onSelect={(range: any) => {
                      if (range?.from && range?.to) {
                        setDateRange({ from: startOfDay(range.from), to: endOfDay(range.to) })
                      } else if (range?.from && !range?.to) {
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
              <div className="mt-3 text-sm text-muted-foreground">
                Selected: {format(dateRange.from, 'MMM d, yyyy')} - {format(dateRange.to, 'MMM d, yyyy')}
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Bar Chart - Top 10 by Frequency */}
        {chartData.length > 0 && (
          <Card className="shadow-lg border-0">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <BarChart3 className="h-4 w-4 text-white" />
                </div>
                <CardTitle className="text-lg">Top 10 {groupBy === 'stock' ? 'Stock Items' : 'Menu Items'} by Frequency</CardTitle>
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
        <Card className="shadow-lg border-0">
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4 items-center justify-between">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={groupBy === 'stock' ? "Search stock items..." : "Search menu items..."}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 rounded-xl"
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
          </CardContent>
        </Card>
        
        {/* Data Table */}
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
                            <TableHead className="text-center">Frequency</TableHead>
                            <TableHead className="text-right">Total Used</TableHead>
                            <TableHead className="text-right">Current Stock</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Last Used</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </>
                        ) : (
                          <>
                            <TableHead>Menu Item</TableHead>
                            <TableHead className="text-center">Frequency</TableHead>
                            <TableHead className="text-center">Orders</TableHead>
                            <TableHead className="text-right">Revenue</TableHead>
                            <TableHead className="text-center">Ingredients</TableHead>
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
                                <TableCell className="text-right">{formatQuantity((item as StockData).totalQuantityUsed, (item as StockData).stockUnit)}</TableCell>
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
                                <TableCell className="text-center">{(item as MenuItemData).totalOrders}</TableCell>
                                <TableCell className="text-right text-green-600 font-medium">{formatCurrency((item as MenuItemData).totalRevenue)}</TableCell>
                                <TableCell className="text-center">
                                  {(item as MenuItemData).stocksUsed?.length > 0 ? (
                                    <Badge variant="default" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300 rounded-full">
                                      {(item as MenuItemData).stocksUsed.length} ing
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
      </div>
      
      {/* Dialogs */}
      <MenuItemDetailDialog 
        item={selectedMenuItem} 
        open={showMenuItemDialog} 
        onOpenChange={setShowMenuItemDialog} 
      />
      
      <StockDetailDialog 
        stock={selectedStock} 
        open={showStockDialog} 
        onOpenChange={setShowStockDialog} 
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