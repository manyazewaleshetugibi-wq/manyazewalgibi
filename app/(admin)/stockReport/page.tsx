"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
  Upload,
  Clock,
  BarChart,
  PieChart,
  Boxes,
  AlertTriangle,
  History,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, LineChart, Line, BarChart as ReBarChart, Bar, PieChart as RePieChart, Pie, Cell } from "recharts"
import * as XLSX from "xlsx"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { Label } from "@/components/ui/label"
import { format, subDays, startOfDay, endOfDay, isWithinInterval } from "date-fns"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import axios from "axios"

// Types
type Stock = {
  _id: string
  name: string
  description?: string
  category: string
  unit: string
  currentStock: number
  minimumStock: number
  maximumStock?: number
  reorderPoint: number
  costPerUnit: number
  supplier?: string
  location?: string
  expiryDate?: string
  batchNumber?: string
  barcode?: string
  imageUrl?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

type UsedStockItem = {
  itemId: string
  itemName: string
  quantityUsed: number
}

type UsedStock = {
  _id: string
  orderId: string
  orderNumber: string
  stockId: string
  stockName: string
  stockCategory: string
  stockUnit: string
  unitCost: number
  totalQuantityUsed: number
  totalCost: number
  items: UsedStockItem[]
  usedAt: string
  processedAt: string
  notes: string
  createdAt: string
  updatedAt: string
}

type StockUpload = {
  _id: string
  stockId: string
  stockName: string
  stockUnit: string
  quantity: number
  cost?: number
  supplier?: string
  batchNumber?: string
  expiryDate?: string
  notes?: string
  uploadedBy: string
  previousStock: number
  newStock: number
  uploadedAt: string
  createdAt: string
  updatedAt: string
}

type StockSummary = {
  totalItems: number
  totalValue: number
  lowStockItems: number
  outOfStockItems: number
  totalUploads: number
  totalUsage: number
  uploadValue: number
  usageValue: number
  netChange: number
  netChangeValue: number
  uploadCount: number
  usageCount: number
  averageUploadSize: number
  averageUsageSize: number
  mostUsedItems: Array<{
    stockId: string
    stockName: string
    totalUsed: number
    unit: string
    percentage: number
  }>
  topUploadedItems: Array<{
    stockId: string
    stockName: string
    totalUploaded: number
    unit: string
    percentage: number
  }>
  dailyStats: Array<{
    date: string
    uploads: number
    usage: number
    netChange: number
  }>
}

type DateRange = {
  from: Date | null
  to: Date | null
}

// API client
const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
})

// Helper function to safely convert any value to number
const safeNumber = (value: any): number => {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
};

// Helper function to format quantity with unit
const formatQuantity = (value: any, unit: string = 'kg', decimals: number = 3): string => {
  const num = safeNumber(value);
  return `${num.toFixed(decimals)} ${unit}`;
};

// Helper functions
const formatCurrency = (amount: any): string => {
  const num = safeNumber(amount);
  return new Intl.NumberFormat("en-ET", {
    style: "currency",
    currency: "ETB",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num)
}

const formatNumber = (num: any, decimals: number = 2): string => {
  const value = safeNumber(num);
  return new Intl.NumberFormat("en-ET", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

const formatDate = (date: string | Date, formatType: 'short' | 'long' | 'time' = 'short'): string => {
  if (!date) return '-';
  const d = new Date(date)
  if (isNaN(d.getTime())) return '-';
  
  if (formatType === 'short') {
    return d.toLocaleDateString("en-ET")
  } else if (formatType === 'long') {
    return d.toLocaleDateString("en-ET", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  } else {
    return d.toLocaleTimeString("en-ET", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }
}

const getDateRange = (type: 'today' | 'week' | 'month' | 'year' | 'custom'): DateRange => {
  const now = new Date()
  const start = new Date()
  const end = new Date()

  switch (type) {
    case 'today':
      start.setHours(0, 0, 0, 0)
      end.setHours(23, 59, 59, 999)
      break
    case 'week':
      start.setDate(now.getDate() - now.getDay())
      start.setHours(0, 0, 0, 0)
      end.setDate(start.getDate() + 6)
      end.setHours(23, 59, 59, 999)
      break
    case 'month':
      start.setDate(1)
      start.setHours(0, 0, 0, 0)
      end.setMonth(now.getMonth() + 1, 0)
      end.setHours(23, 59, 59, 999)
      break
    case 'year':
      start.setMonth(0, 1)
      start.setHours(0, 0, 0, 0)
      end.setMonth(11, 31)
      end.setHours(23, 59, 59, 999)
      break
    default:
      return { from: null, to: null }
  }

  return { from: start, to: end }
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8']

// Loading Skeleton
const ReportSkeleton = () => (
  <div className="space-y-4">
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {[...Array(4)].map((_, i) => (
        <Card key={i}>
          <CardHeader className="pb-2">
            <Skeleton className="h-4 w-24" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-32 mb-2" />
            <Skeleton className="h-4 w-20" />
          </CardContent>
        </Card>
      ))}
    </div>
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-48" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-64 w-full" />
      </CardContent>
    </Card>
  </div>
)

// Summary Card Component
const SummaryCard = ({
  title,
  value,
  subValue,
  icon: Icon,
  trend,
  color,
}: {
  title: string
  value: string | number
  subValue?: string
  icon: any
  trend?: { value: number; positive: boolean }
  color: string
}) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">
        {title}
      </CardTitle>
      <div className={`h-8 w-8 rounded-full bg-${color}-100 flex items-center justify-center`}>
        <Icon className={`h-4 w-4 text-${color}-600`} />
      </div>
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      {subValue && <p className="text-xs text-muted-foreground mt-1">{subValue}</p>}
      {trend && (
        <p className={`text-xs ${trend.positive ? 'text-green-600' : 'text-red-600'} flex items-center gap-1 mt-1`}>
          {trend.positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {trend.value}% from last period
        </p>
      )}
    </CardContent>
  </Card>
)

// Stock Chart Component
function StockChart({ data, type = "line" }: { data: StockSummary['dailyStats'], type?: "line" | "bar" }) {
  const chartData = data.map(stat => ({
    name: stat.date ? format(new Date(stat.date), 'MM/dd') : '',
    uploads: safeNumber(stat.uploads),
    usage: safeNumber(stat.usage),
    netChange: safeNumber(stat.netChange),
    date: stat.date,
  }))

  return (
    <ResponsiveContainer width="100%" height={350}>
      {type === "line" ? (
        <LineChart data={chartData}>
          <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis
            stroke="#888888"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `${value}`}
          />
          <Tooltip
            contentStyle={{ background: "#333", border: "none", borderRadius: "8px" }}
            labelStyle={{ color: "#fff" }}
            itemStyle={{ color: "#fff" }}
            formatter={(value: number) => [formatNumber(value), "Units"]}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="uploads"
            stroke="#10b981"
            strokeWidth={2}
            dot={{ fill: "#10b981", strokeWidth: 2 }}
            name="Uploads"
          />
          <Line
            type="monotone"
            dataKey="usage"
            stroke="#f59e0b"
            strokeWidth={2}
            dot={{ fill: "#f59e0b", strokeWidth: 2 }}
            name="Usage"
          />
          <Line
            type="monotone"
            dataKey="netChange"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ fill: "#3b82f6", strokeWidth: 2 }}
            name="Net Change"
          />
        </LineChart>
      ) : (
        <ReBarChart data={chartData}>
          <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis
            stroke="#888888"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `${value}`}
          />
          <Tooltip
            contentStyle={{ background: "#333", border: "none", borderRadius: "8px" }}
            labelStyle={{ color: "#fff" }}
            itemStyle={{ color: "#fff" }}
            formatter={(value: number) => [formatNumber(value), "Units"]}
          />
          <Legend />
          <Bar dataKey="uploads" fill="#10b981" radius={[4, 4, 0, 0]} name="Uploads" />
          <Bar dataKey="usage" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Usage" />
        </ReBarChart>
      )}
    </ResponsiveContainer>
  )
}

export default function StockReportPage() {
  const router = useRouter()
  
  // State
  const [stocks, setStocks] = useState<Stock[]>([])
  const [usedStock, setUsedStock] = useState<UsedStock[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Filter state
  const [dateRange, setDateRange] = useState<DateRange>(getDateRange('month'))
  const [filterType, setFilterType] = useState<'today' | 'week' | 'month' | 'year' | 'custom'>('month')
  const [selectedStock, setSelectedStock] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState('overview')
  const [showDatePicker, setShowDatePicker] = useState(false)
  
  // Sorting
  const [sortBy, setSortBy] = useState<string>('usedAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  
  // Chart type
  const [chartType, setChartType] = useState<"line" | "bar">("line")
  
  // Selected item for details
  const [selectedTransaction, setSelectedTransaction] = useState<UsedStock | null>(null)
  
  // Summary data
  const [summary, setSummary] = useState<StockSummary>({
    totalItems: 0,
    totalValue: 0,
    lowStockItems: 0,
    outOfStockItems: 0,
    totalUploads: 0,
    totalUsage: 0,
    uploadValue: 0,
    usageValue: 0,
    netChange: 0,
    netChangeValue: 0,
    uploadCount: 0,
    usageCount: 0,
    averageUploadSize: 0,
    averageUsageSize: 0,
    mostUsedItems: [],
    topUploadedItems: [],
    dailyStats: [],
  })

  // Process used stock data to ensure quantities are numbers
  const processedUsedStock = useMemo(() => {
    return usedStock.map(item => ({
      ...item,
      // Ensure all numeric fields are properly converted
      totalQuantityUsed: safeNumber(item.totalQuantityUsed),
      unitCost: safeNumber(item.unitCost),
      totalCost: safeNumber(item.totalCost),
      // Process items array
      items: item.items?.map(subItem => ({
        ...subItem,
        quantityUsed: safeNumber(subItem.quantityUsed),
        itemId: subItem.itemId?.toString() || '',
      })) || [],
      // Add display fields
      displayQuantity: formatQuantity(item.totalQuantityUsed, item.stockUnit || 'kg'),
      displayDate: formatDate(item.usedAt, 'long'),
      displayTime: formatDate(item.usedAt, 'time'),
    }));
  }, [usedStock]);

  // Fetch data
  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Fetch stocks
      const stocksRes = await api.get('/stock')
      const stocksData = stocksRes.data?.data || []
      setStocks(stocksData)
      
      // Build URL for used stock with filters
      let usedStockUrl = '/used-stock'
      const params = new URLSearchParams()
      
      if (dateRange.from) {
        params.append('startDate', dateRange.from.toISOString())
      }
      if (dateRange.to) {
        params.append('endDate', dateRange.to.toISOString())
      }
      if (selectedStock !== 'all') {
        params.append('stockId', selectedStock)
      }
      params.append('limit', '1000') // Get more records for analysis
      
      if (params.toString()) {
        usedStockUrl += `?${params.toString()}`
      }
      
      const usedStockRes = await api.get(usedStockUrl)
      setUsedStock(usedStockRes.data?.data || [])
      
    } catch (err: any) {
      console.error('Error fetching data:', err)
      setError(err.message || 'Failed to load stock data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [dateRange, selectedStock])

  // Calculate summary
  useEffect(() => {
    if (!stocks.length) return
    
    // Use processed used stock for calculations
    const usage = processedUsedStock
    
    // Calculate totals
    const totalUsage = usage.reduce((sum, u) => sum + u.totalQuantityUsed, 0)
    const usageValue = usage.reduce((sum, u) => sum + u.totalCost, 0)
    
    // Most used items
    const usageByStock: Record<string, any> = {}
    usage.forEach(u => {
      if (!usageByStock[u.stockId]) {
        usageByStock[u.stockId] = {
          stockId: u.stockId,
          stockName: u.stockName,
          totalUsed: 0,
          unit: u.stockUnit || 'kg',
        }
      }
      usageByStock[u.stockId].totalUsed += u.totalQuantityUsed
    })
    
    const mostUsedItems = Object.values(usageByStock)
      .sort((a: any, b: any) => b.totalUsed - a.totalUsed)
      .slice(0, 5)
      .map((item: any) => ({
        ...item,
        percentage: totalUsage > 0 ? (item.totalUsed / totalUsage) * 100 : 0,
      }))
    
    // Daily stats
    const dailyStatsMap = new Map()
    if (dateRange.from && dateRange.to) {
      const daysBetween = Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24))
      
      for (let i = 0; i <= daysBetween; i++) {
        const date = new Date(dateRange.from)
        date.setDate(date.getDate() + i)
        const dateStr = format(date, 'yyyy-MM-dd')
        dailyStatsMap.set(dateStr, { date: dateStr, uploads: 0, usage: 0, netChange: 0 })
      }
    }
    
    usage.forEach(u => {
      const dateStr = format(new Date(u.usedAt), 'yyyy-MM-dd')
      if (dailyStatsMap.has(dateStr)) {
        const stat = dailyStatsMap.get(dateStr)
        stat.usage += u.totalQuantityUsed
        stat.netChange = stat.uploads - stat.usage
        dailyStatsMap.set(dateStr, stat)
      }
    })
    
    const dailyStats = Array.from(dailyStatsMap.values())
    
    // Calculate inventory stats
    const totalValue = stocks.reduce((sum, s) => sum + (s.currentStock * s.costPerUnit), 0)
    const lowStockItems = stocks.filter(s => s.currentStock <= s.minimumStock && s.currentStock > 0).length
    const outOfStockItems = stocks.filter(s => s.currentStock <= 0).length
    
    setSummary({
      totalItems: stocks.length,
      totalValue,
      lowStockItems,
      outOfStockItems,
      totalUploads: 0, // We don't have uploads data yet
      totalUsage,
      uploadValue: 0,
      usageValue,
      netChange: 0 - totalUsage, // Negative since we only track usage
      netChangeValue: 0 - usageValue,
      uploadCount: 0,
      usageCount: usage.length,
      averageUploadSize: 0,
      averageUsageSize: usage.length ? totalUsage / usage.length : 0,
      mostUsedItems,
      topUploadedItems: [],
      dailyStats,
    })
    
  }, [stocks, processedUsedStock, dateRange])

  // Handle filter change
  const handleFilterChange = (type: 'today' | 'week' | 'month' | 'year' | 'custom', customStart?: Date, customEnd?: Date) => {
    setFilterType(type)
    setCurrentPage(1)
    
    if (type === 'custom' && customStart && customEnd) {
      setDateRange({ from: customStart, to: customEnd })
    } else if (type !== 'custom') {
      const range = getDateRange(type)
      setDateRange(range)
    }
  }

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchData()
    setRefreshing(false)
  }

  // Handle sort
  const handleSort = (field: string) => {
    const order = field === sortBy && sortOrder === "asc" ? "desc" : "asc"
    setSortBy(field)
    setSortOrder(order)
  }

  // Handle export
  const handleExport = () => {
    try {
      const exportData = processedUsedStock.map(u => ({
        'Date': u.displayDate,
        'Time': u.displayTime,
        'Order Number': u.orderNumber,
        'Stock Item': u.stockName,
        'Category': u.stockCategory,
        'Quantity': u.totalQuantityUsed.toFixed(3),
        'Unit': u.stockUnit || 'kg',
        'Unit Cost': u.unitCost ? formatCurrency(u.unitCost) : '-',
        'Total Cost': u.totalCost ? formatCurrency(u.totalCost) : '-',
        'Items Used': u.items.map(i => `${i.itemName} (${i.quantityUsed})`).join(', '),
        'Notes': u.notes || '-',
      }))
      
      const wb = XLSX.utils.bookNew()
      const ws = XLSX.utils.json_to_sheet(exportData)
      XLSX.utils.book_append_sheet(wb, ws, 'Stock Usage')
      
      XLSX.writeFile(wb, `stock-usage-${format(new Date(), 'yyyy-MM-dd')}.xlsx`)
    } catch (err) {
      console.error('Export error:', err)
    }
  }

  // Filter and sort used stock for table view
  const getFilteredUsedStock = () => {
    let filtered = [...processedUsedStock]
    
    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(u =>
        u.stockName.toLowerCase().includes(term) ||
        u.orderNumber.toLowerCase().includes(term) ||
        u.notes.toLowerCase().includes(term) ||
        u.items.some(i => i.itemName.toLowerCase().includes(term))
      )
    }
    
    // Sort
    filtered.sort((a, b) => {
      let aValue: any = a[sortBy as keyof UsedStock]
      let bValue: any = b[sortBy as keyof UsedStock]
      
      // Handle dates
      if (sortBy === 'usedAt') {
        aValue = new Date(aValue).getTime()
        bValue = new Date(bValue).getTime()
      }
      
      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1
      return 0
    })
    
    return filtered
  }

  const filteredUsedStock = getFilteredUsedStock()
  const totalPages = Math.ceil(filteredUsedStock.length / itemsPerPage)
  const paginatedUsedStock = filteredUsedStock.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  if (loading) {
    return (
      <div className="flex-col md:flex">
        <div className="flex-1 space-y-4 p-8 pt-6">
          <ReportSkeleton />
        </div>
      </div>
    )
  }

  return (
    <div className="flex-col md:flex">
      <div className="flex-1 space-y-4 p-8 pt-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
              className="rounded-full"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div>
              <h2 className="text-3xl font-bold tracking-tight">Stock Report</h2>
              <p className="text-sm text-muted-foreground">
                Track stock usage and movements
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/stock')}
            >
              <Package className="h-4 w-4 mr-2" />
              Manage Stock
            </Button>
            
            <Button size="sm" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <Card className="border-red-500">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-red-500">
                <AlertCircle className="h-5 w-5" />
                <p>{error}</p>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="overview" className="space-y-4" onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="usage">Usage History</TabsTrigger>
            <TabsTrigger value="analysis">Analysis</TabsTrigger>
          </TabsList>

          {/* Filters Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Filter className="h-5 w-5" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {/* Date Range Presets */}
                <div className="space-y-2">
                  <Label>Date Range</Label>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant={filterType === 'today' ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleFilterChange('today')}
                    >
                      Today
                    </Button>
                    <Button
                      variant={filterType === 'week' ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleFilterChange('week')}
                    >
                      Week
                    </Button>
                    <Button
                      variant={filterType === 'month' ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleFilterChange('month')}
                    >
                      Month
                    </Button>
                    <Button
                      variant={filterType === 'year' ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleFilterChange('year')}
                    >
                      Year
                    </Button>
                  </div>
                </div>

                {/* Custom Date Range */}
                <div className="space-y-2">
                  <Label>Custom Range</Label>
                  <Popover open={showDatePicker} onOpenChange={setShowDatePicker}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !dateRange.from && !dateRange.to && "text-muted-foreground"
                        )}
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {dateRange.from && dateRange.to ? (
                          <>
                            {format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}
                          </>
                        ) : (
                          <span>Pick a date range</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
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
                            handleFilterChange('custom', range.from, range.to)
                          }
                          setShowDatePicker(false)
                        }}
                        numberOfMonths={2}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Stock Filter */}
                <div className="space-y-2">
                  <Label>Stock Item</Label>
                  <Select value={selectedStock} onValueChange={setSelectedStock}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Items" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Items</SelectItem>
                      {stocks.map(stock => (
                        <SelectItem key={stock._id} value={stock._id}>
                          {stock.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Search */}
                <div className="space-y-2">
                  <Label>Search</Label>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by item, order, notes..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8"
                    />
                    {searchTerm && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1 h-7 w-7"
                        onClick={() => setSearchTerm('')}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Date Range Display */}
              {dateRange.from && dateRange.to && (
                <div className="mt-4 text-sm text-muted-foreground">
                  Showing data from {format(dateRange.from, 'PPP')} to {format(dateRange.to, 'PPP')}
                  {' • '}{processedUsedStock.length} usage records found
                </div>
              )}
            </CardContent>
          </Card>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <SummaryCard
                title="Total Stock Items"
                value={summary.totalItems}
                subValue={`${summary.lowStockItems} low, ${summary.outOfStockItems} out`}
                icon={Boxes}
                color="blue"
              />
              <SummaryCard
                title="Total Stock Value"
                value={formatCurrency(summary.totalValue)}
                icon={DollarSign}
                color="green"
              />
              <SummaryCard
                title="Total Usage (Period)"
                value={formatNumber(summary.totalUsage)}
                subValue={`${summary.usageCount} transactions`}
                icon={TrendingDown}
                color="orange"
              />
              <SummaryCard
                title="Net Change"
                value={formatNumber(summary.netChange)}
                subValue={formatCurrency(summary.netChangeValue)}
                icon={summary.netChange >= 0 ? TrendingUp : TrendingDown}
                color={summary.netChange >= 0 ? "green" : "red"}
              />
            </div>

            {/* Charts */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
              <Card className="col-span-4">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Daily Usage</CardTitle>
                  <div className="flex items-center gap-2">
                    <Button
                      variant={chartType === "line" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setChartType("line")}
                    >
                      Line
                    </Button>
                    <Button
                      variant={chartType === "bar" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setChartType("bar")}
                    >
                      Bar
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pl-2">
                  <StockChart data={summary.dailyStats} type={chartType} />
                </CardContent>
              </Card>

              <Card className="col-span-3">
                <CardHeader>
                  <CardTitle>Most Used Items</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-4">
                      {summary.mostUsedItems.map((item, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">{item.stockName}</p>
                            <p className="text-xs text-muted-foreground">
                              Used: {formatNumber(item.totalUsed)} {item.unit}
                            </p>
                          </div>
                          <Badge variant="secondary">{item.percentage.toFixed(1)}%</Badge>
                        </div>
                      ))}
                      {summary.mostUsedItems.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No usage data for this period
                        </p>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>

            {/* Recent Usage */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Stock Usage</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  <div className="space-y-4">
                    {processedUsedStock.slice(0, 10).map((usage) => (
                      <div key={usage._id} className="flex items-center justify-between border-b pb-2">
                        <div className="flex-1">
                          <p className="text-sm font-medium">{usage.stockName}</p>
                          <p className="text-xs text-muted-foreground">
                            {usage.displayDate} • Order #{usage.orderNumber}
                          </p>
                          {usage.items.length > 0 && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Used in: {usage.items.map(i => i.itemName).join(', ')}
                            </p>
                          )}
                        </div>
                        <div className="text-right ml-4">
                          <Badge variant="secondary" className="font-mono">
                            {usage.displayQuantity}
                          </Badge>
                        </div>
                      </div>
                    ))}
                    
                    {processedUsedStock.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        No usage records found for this period
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Usage History Tab */}
          <TabsContent value="usage" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Stock Usage History</CardTitle>
                <div className="flex items-center gap-2">
                  <Select onValueChange={(value) => handleSort(value)}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="usedAt">Date</SelectItem>
                      <SelectItem value="totalQuantityUsed">Quantity</SelectItem>
                      <SelectItem value="stockName">Stock Name</SelectItem>
                      <SelectItem value="orderNumber">Order Number</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="cursor-pointer hover:bg-gray-100" onClick={() => handleSort('usedAt')}>
                          Date {sortBy === 'usedAt' && (sortOrder === 'asc' ? '↑' : '↓')}
                        </TableHead>
                        <TableHead className="cursor-pointer hover:bg-gray-100" onClick={() => handleSort('orderNumber')}>
                          Order {sortBy === 'orderNumber' && (sortOrder === 'asc' ? '↑' : '↓')}
                        </TableHead>
                        <TableHead className="cursor-pointer hover:bg-gray-100" onClick={() => handleSort('stockName')}>
                          Stock Item {sortBy === 'stockName' && (sortOrder === 'asc' ? '↑' : '↓')}
                        </TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead className="cursor-pointer hover:bg-gray-100" onClick={() => handleSort('totalQuantityUsed')}>
                          Quantity {sortBy === 'totalQuantityUsed' && (sortOrder === 'asc' ? '↑' : '↓')}
                        </TableHead>
                        <TableHead>Items Used</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedUsedStock.map((usage) => (
                        <TableRow key={usage._id}>
                          <TableCell>{usage.displayDate}</TableCell>
                          <TableCell className="font-mono">{usage.orderNumber}</TableCell>
                          <TableCell className="font-medium">{usage.stockName}</TableCell>
                          <TableCell>{usage.stockCategory}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="font-mono">
                              {usage.displayQuantity}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {usage.items.slice(0, 2).map((item, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  {item.itemName} ({safeNumber(item.quantityUsed).toFixed(3)})
                                </Badge>
                              ))}
                              {usage.items.length > 2 && (
                                <Badge variant="outline" className="text-xs">
                                  +{usage.items.length - 2} more
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => setSelectedTransaction(usage)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {filteredUsedStock.length > 0 && (
                  <div className="flex items-center justify-between mt-4">
                    <p className="text-sm text-muted-foreground">
                      Showing {Math.min((currentPage - 1) * itemsPerPage + 1, filteredUsedStock.length)} to{' '}
                      {Math.min(currentPage * itemsPerPage, filteredUsedStock.length)} of {filteredUsedStock.length} records
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => p + 1)}
                        disabled={currentPage >= totalPages}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analysis Tab */}
          <TabsContent value="analysis" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Usage by Category</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RePieChart>
                        <Pie
                          data={Object.values(
                            processedUsedStock.reduce((acc, curr) => {
                              const category = curr.stockCategory || 'Uncategorized';
                              if (!acc[category]) {
                                acc[category] = {
                                  name: category,
                                  value: 0,
                                }
                              }
                              acc[category].value += curr.totalQuantityUsed
                              return acc
                            }, {} as Record<string, any>)
                          )}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {processedUsedStock.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ background: "#333", border: "none", borderRadius: "8px" }}
                          labelStyle={{ color: "#fff" }}
                          formatter={(value: number) => [formatNumber(value), "Units"]}
                        />
                      </RePieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Usage by Item (Top 5)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RePieChart>
                        <Pie
                          data={summary.mostUsedItems.map(item => ({
                            name: item.stockName,
                            value: item.totalUsed
                          }))}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {summary.mostUsedItems.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ background: "#333", border: "none", borderRadius: "8px" }}
                          labelStyle={{ color: "#fff" }}
                          formatter={(value: number) => [formatNumber(value), "Units"]}
                        />
                      </RePieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Usage Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Average Daily Usage</Label>
                    <p className="text-2xl font-bold">
                      {formatNumber(summary.totalUsage / Math.max(1, summary.dailyStats.length))} units
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Most Used Item</Label>
                    <p className="text-2xl font-bold">
                      {summary.mostUsedItems[0]?.stockName || 'N/A'}
                    </p>
                    {summary.mostUsedItems[0] && (
                      <p className="text-sm text-muted-foreground">
                        {formatNumber(summary.mostUsedItems[0].totalUsed)} {summary.mostUsedItems[0].unit}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Peak Usage Day</Label>
                    <p className="text-2xl font-bold">
                      {summary.dailyStats.reduce((max, day) => day.usage > max.usage ? day : max, { usage: 0 }).usage > 0
                        ? formatNumber(summary.dailyStats.reduce((max, day) => day.usage > max.usage ? day : max).usage)
                        : '0'} units
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Total Orders with Usage</Label>
                    <p className="text-2xl font-bold">
                      {new Set(processedUsedStock.map(u => u.orderNumber)).size}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Transaction Details Dialog */}
      <Dialog open={!!selectedTransaction} onOpenChange={() => setSelectedTransaction(null)}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Stock Usage Details</DialogTitle>
            <DialogDescription>
              Detailed information about this stock usage
            </DialogDescription>
          </DialogHeader>
          
          {selectedTransaction && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-muted-foreground">Order Number</Label>
                  <p className="font-medium font-mono">{selectedTransaction.orderNumber}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Date</Label>
                  <p>{formatDate(selectedTransaction.usedAt, 'long')}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Stock Item</Label>
                  <p className="font-medium">{selectedTransaction.stockName}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Category</Label>
                  <p>{selectedTransaction.stockCategory}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Quantity Used</Label>
                  <p className="font-medium text-lg">
                    {formatQuantity(selectedTransaction.totalQuantityUsed, selectedTransaction.stockUnit || 'kg')}
                  </p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Unit Cost</Label>
                  <p>{selectedTransaction.unitCost ? formatCurrency(selectedTransaction.unitCost) : '-'}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Total Cost</Label>
                  <p className="font-medium">{selectedTransaction.totalCost ? formatCurrency(selectedTransaction.totalCost) : '-'}</p>
                </div>
              </div>

              <Separator />

              <div>
                <Label className="text-sm text-muted-foreground mb-2 block">Items Used In</Label>
                <div className="space-y-2">
                  {selectedTransaction.items.map((item, index) => (
                    <div key={index} className="flex items-center justify-between bg-secondary/50 p-2 rounded-md">
                      <span className="font-medium">{item.itemName}</span>
                      <Badge variant="outline">
                        {formatQuantity(item.quantityUsed, 'units')}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>

              {selectedTransaction.notes && (
                <>
                  <Separator />
                  <div>
                    <Label className="text-sm text-muted-foreground">Notes</Label>
                    <p className="text-sm bg-secondary/50 p-2 rounded-md">{selectedTransaction.notes}</p>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}