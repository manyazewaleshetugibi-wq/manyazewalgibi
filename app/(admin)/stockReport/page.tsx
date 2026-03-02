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
  ChevronRight,
  List,
  Grid,
  Copy,
  Hash,
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

// Types based on the provided order data
type OrderItem = {
  itemId: string
  itemName: string
  quantity: number
  unitPrice: number
  itemPrice: number
  subtotal: number
  notes: string
}

type Order = {
  _id: string
  orderNumber: string
  tableNumber: string
  waiterId: string
  customerId: string
  numberOfGuests: number
  items: OrderItem[]
  totalAmount: number
  tax: number
  discount: number
  finalAmount: number
  paymentMethod: string
  status: string
  specialRequirements: string
  isActive: boolean
  stockProcessed: boolean
  inTable: boolean
  delivery: boolean
  deliveryInfo: any | null
  paymentScreenshotUrl: string | null
  createdAt: string
  updatedAt: string
  completedAt: string | null
  stockProcessedAt: string | null
  stockProcessingNote: string | null
}

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

// Aggregated Stock Usage - Each stock appears once
type AggregatedStockUsage = {
  stockId: string
  stockName: string
  stockCategory: string
  stockUnit: string
  totalQuantityUsed: number
  totalCost: number
  totalOrders: number
  totalUsageEvents: number
  averageQuantityPerOrder: number
  firstUsed: string
  lastUsed: string
  // Items that use this stock (for details only)
  itemsUsing: Array<{
    itemId: string
    itemName: string
    totalQuantityUsed: number
    usageCount: number
    percentage: number
    orders: Array<{
      orderId: string
      orderNumber: string
      quantityUsed: number
      usedAt: string
    }>
  }>
  // Orders that used this stock
  orders: Array<{
    orderId: string
    orderNumber: string
    quantityUsed: number
    usedAt: string
    items: UsedStockItem[]
  }>
  // Duplication stats - how many times items appear in orders
  duplicationStats: {
    totalDuplications: number
    averageDuplicationsPerOrder: number
    mostDuplicatedItem: {
      itemName: string
      count: number
    } | null
    itemsByDuplicationCount: Array<{
      itemName: string
      duplicationCount: number
    }>
  }
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
  // Aggregated stock usage - each stock appears once
  aggregatedStockUsage: AggregatedStockUsage[]
  dailyStats: Array<{
    date: string
    uploads: number
    usage: number
    netChange: number
  }>
  // Global duplication stats
  duplicationStats: {
    totalOrders: number
    totalItems: number
    totalDuplications: number
    averageItemsPerOrder: number
    mostOrderedItems: Array<{
      itemName: string
      orderCount: number
      totalQuantity: number
    }>
  }
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

// Helper function to safely get array from API response
const safeArray = <T,>(data: any): T[] => {
  if (Array.isArray(data)) return data;
  if (data?.data && Array.isArray(data.data)) return data.data;
  if (data?.items && Array.isArray(data.items)) return data.items;
  if (data?.orders && Array.isArray(data.orders)) return data.orders;
  return [];
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

// Stock Usage Detail Dialog Component - Shows all items that use a specific stock
const StockUsageDetailDialog = ({
  stock,
  open,
  onOpenChange,
}: {
  stock: AggregatedStockUsage | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) => {
  const [viewMode, setViewMode] = useState<'items' | 'orders' | 'duplications'>('items')
  
  if (!stock) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Package className="h-6 w-6 text-primary" />
            {stock.stockName} - Usage Details
          </DialogTitle>
          <DialogDescription>
            This stock is used in {stock.itemsUsing.length} different menu items
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between mb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="text-sm">
                Category: {stock.stockCategory}
              </Badge>
              <Badge variant="outline" className="text-sm">
                Unit: {stock.stockUnit}
              </Badge>
            </div>
            <div className="flex items-center gap-4 mt-2">
              <div className="text-sm">
                <span className="text-muted-foreground">Total Used:</span>{' '}
                <span className="font-bold">{formatQuantity(stock.totalQuantityUsed, stock.stockUnit)}</span>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Total Value:</span>{' '}
                <span className="font-bold">{formatCurrency(stock.totalCost)}</span>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Orders:</span>{' '}
                <span className="font-bold">{stock.totalOrders}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'items' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('items')}
              className="gap-2"
            >
              <List className="h-4 w-4" />
              Menu Items
            </Button>
            <Button
              variant={viewMode === 'orders' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('orders')}
              className="gap-2"
            >
              <Grid className="h-4 w-4" />
              Orders
            </Button>
            <Button
              variant={viewMode === 'duplications' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('duplications')}
              className="gap-2"
            >
              <Copy className="h-4 w-4" />
              Duplications
            </Button>
          </div>
        </div>

        <ScrollArea className="max-h-[60vh] pr-4">
          {viewMode === 'items' && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground mb-2">
                All menu items that use {stock.stockName}:
              </p>
              {stock.itemsUsing.map((item, index) => (
                <Card key={index} className="overflow-hidden">
                  <CardHeader className="py-3 bg-secondary/20">
                    <CardTitle className="text-base flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{item.itemName}</span>
                        <Badge variant="outline" className="text-xs">
                          Used {item.usageCount} {item.usageCount === 1 ? 'time' : 'times'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4">
                        <Badge variant="secondary" className="text-sm">
                          {formatQuantity(item.totalQuantityUsed, stock.stockUnit)}
                        </Badge>
                        <Badge variant="outline" className="text-sm">
                          {item.percentage.toFixed(1)}% of total
                        </Badge>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="py-3">
                    <div>
                      <Label className="text-xs text-muted-foreground mb-2 block">Recent Orders with this item:</Label>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {item.orders.slice(0, 5).map((order, idx) => (
                          <div key={idx} className="flex items-center justify-between bg-secondary/10 p-2 rounded-md text-sm">
                            <div className="flex items-center gap-3">
                              <span className="font-mono font-medium">{order.orderNumber}</span>
                              <span className="text-muted-foreground">•</span>
                              <span>{formatDate(order.usedAt, 'short')}</span>
                            </div>
                            <Badge variant="outline">
                              {formatQuantity(order.quantityUsed, stock.stockUnit)}
                            </Badge>
                          </div>
                        ))}
                        {item.orders.length > 5 && (
                          <p className="text-xs text-muted-foreground text-center mt-1">
                            +{item.orders.length - 5} more orders
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {viewMode === 'orders' && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground mb-2">
                All orders that used {stock.stockName}:
              </p>
              {stock.orders.map((order, index) => (
                <Card key={index}>
                  <CardHeader className="py-3">
                    <CardTitle className="text-base flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold">{order.orderNumber}</span>
                        <Badge variant="outline">{formatDate(order.usedAt, 'short')}</Badge>
                      </div>
                      <Badge variant="secondary">
                        Total: {formatQuantity(order.quantityUsed, stock.stockUnit)}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="py-2">
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Items in this order using {stock.stockName}:</Label>
                      <div className="grid gap-2">
                        {order.items.map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between bg-secondary/10 p-2 rounded-md">
                            <span className="font-medium">{item.itemName}</span>
                            <Badge variant="outline">
                              {formatQuantity(item.quantityUsed, stock.stockUnit)}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {viewMode === 'duplications' && (
            <div className="space-y-4">
              <Card className="bg-primary/5">
                <CardContent className="pt-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold text-primary">{stock.duplicationStats.totalDuplications}</p>
                      <p className="text-xs text-muted-foreground">Total Duplications</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-primary">{stock.duplicationStats.averageDuplicationsPerOrder.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">Avg per Order</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-primary">{stock.totalOrders}</p>
                      <p className="text-xs text-muted-foreground">Total Orders</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-primary">{stock.itemsUsing.length}</p>
                      <p className="text-xs text-muted-foreground">Unique Menu Items</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {stock.duplicationStats.mostDuplicatedItem && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Hash className="h-5 w-5 text-primary" />
                      Most Duplicated Item
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-lg">{stock.duplicationStats.mostDuplicatedItem.itemName}</span>
                      <Badge variant="default" className="text-base px-3 py-1">
                        {stock.duplicationStats.mostDuplicatedItem.count} duplications
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Items by Duplication Count</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {stock.duplicationStats.itemsByDuplicationCount.map((item, index) => (
                      <div key={index}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium">{item.itemName}</span>
                          <span className="text-primary font-bold">{item.duplicationCount} duplications</span>
                        </div>
                        <Progress 
                          value={(item.duplicationCount / stock.duplicationStats.totalDuplications) * 100} 
                          className="h-2"
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}

export default function StockReportPage() {
  const router = useRouter()
  
  // State
  const [stocks, setStocks] = useState<Stock[]>([])
  const [orders, setOrders] = useState<Order[]>([])
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
  const [sortBy, setSortBy] = useState<string>('totalQuantityUsed')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  
  // Chart type
  const [chartType, setChartType] = useState<"line" | "bar">("line")
  
  // Selected stock for detailed view
  const [selectedStockDetail, setSelectedStockDetail] = useState<AggregatedStockUsage | null>(null)
  const [showStockDetail, setShowStockDetail] = useState(false)
  
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
    aggregatedStockUsage: [],
    dailyStats: [],
    duplicationStats: {
      totalOrders: 0,
      totalItems: 0,
      totalDuplications: 0,
      averageItemsPerOrder: 0,
      mostOrderedItems: [],
    },
  })

  // Fetch data
  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Fetch stocks
      const stocksRes = await api.get('/stock')
      const stocksData = safeArray<Stock>(stocksRes.data)
      setStocks(stocksData)
      
      // Fetch orders for duplication stats
      const ordersRes = await api.get('/order')
      const ordersData = safeArray<Order>(ordersRes.data)
      setOrders(ordersData)
      
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
      params.append('limit', '1000')
      
      if (params.toString()) {
        usedStockUrl += `?${params.toString()}`
      }
      
      const usedStockRes = await api.get(usedStockUrl)
      const usedStockData = safeArray<UsedStock>(usedStockRes.data)
      setUsedStock(usedStockData)
      
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

  // Process used stock data to aggregate by stock (each stock appears once)
  const aggregatedStockUsage = useMemo(() => {
    const stockMap = new Map<string, AggregatedStockUsage>()
    
    usedStock.forEach(record => {
      const stockId = record.stockId
      const quantity = safeNumber(record.totalQuantityUsed)
      const cost = safeNumber(record.totalCost)
      
      if (!stockMap.has(stockId)) {
        // First time seeing this stock - create entry
        stockMap.set(stockId, {
          stockId: record.stockId,
          stockName: record.stockName,
          stockCategory: record.stockCategory,
          stockUnit: record.stockUnit || 'kg',
          totalQuantityUsed: quantity,
          totalCost: cost,
          totalOrders: 1,
          totalUsageEvents: 1,
          averageQuantityPerOrder: quantity,
          firstUsed: record.usedAt,
          lastUsed: record.usedAt,
          itemsUsing: [],
          orders: [{
            orderId: record.orderId,
            orderNumber: record.orderNumber,
            quantityUsed: quantity,
            usedAt: record.usedAt,
            items: record.items,
          }],
          duplicationStats: {
            totalDuplications: 0,
            averageDuplicationsPerOrder: 0,
            mostDuplicatedItem: null,
            itemsByDuplicationCount: [],
          },
        })
      } else {
        // Stock already exists - update totals
        const existing = stockMap.get(stockId)!
        existing.totalQuantityUsed += quantity
        existing.totalCost += cost
        existing.totalOrders++
        existing.totalUsageEvents++
        existing.averageQuantityPerOrder = existing.totalQuantityUsed / existing.totalOrders
        
        // Update first/last used dates
        if (new Date(record.usedAt) < new Date(existing.firstUsed)) {
          existing.firstUsed = record.usedAt
        }
        if (new Date(record.usedAt) > new Date(existing.lastUsed)) {
          existing.lastUsed = record.usedAt
        }
        
        // Add order
        existing.orders.push({
          orderId: record.orderId,
          orderNumber: record.orderNumber,
          quantityUsed: quantity,
          usedAt: record.usedAt,
          items: record.items,
        })
      }
      
      // Now process items for this stock (for the details view)
      const stockEntry = stockMap.get(stockId)!
      
      record.items.forEach(item => {
        const itemQuantity = safeNumber(item.quantityUsed)
        const existingItemIndex = stockEntry.itemsUsing.findIndex(i => i.itemId === item.itemId)
        
        if (existingItemIndex >= 0) {
          // Item already exists for this stock - update
          const existingItem = stockEntry.itemsUsing[existingItemIndex]
          existingItem.totalQuantityUsed += itemQuantity
          existingItem.usageCount++
          existingItem.percentage = (existingItem.totalQuantityUsed / stockEntry.totalQuantityUsed) * 100
          existingItem.orders.push({
            orderId: record.orderId,
            orderNumber: record.orderNumber,
            quantityUsed: itemQuantity,
            usedAt: record.usedAt,
          })
          stockEntry.itemsUsing[existingItemIndex] = existingItem
        } else {
          // New item for this stock
          stockEntry.itemsUsing.push({
            itemId: item.itemId,
            itemName: item.itemName,
            totalQuantityUsed: itemQuantity,
            usageCount: 1,
            percentage: (itemQuantity / stockEntry.totalQuantityUsed) * 100,
            orders: [{
              orderId: record.orderId,
              orderNumber: record.orderNumber,
              quantityUsed: itemQuantity,
              usedAt: record.usedAt,
            }],
          })
        }
      })
      
      stockMap.set(stockId, stockEntry)
    })
    
    // Calculate duplication stats for each stock
    stockMap.forEach(stock => {
      // Count how many times each menu item appears in orders
      const itemDuplicationCount: Record<string, { count: number; itemName: string }> = {}
      
      stock.orders.forEach(order => {
        // For each order, count each item that uses this stock
        order.items.forEach(item => {
          const key = item.itemId
          if (!itemDuplicationCount[key]) {
            itemDuplicationCount[key] = { count: 0, itemName: item.itemName }
          }
          itemDuplicationCount[key].count++
        })
      })
      
      const itemsByDuplication = Object.values(itemDuplicationCount).sort((a, b) => b.count - a.count)
      
      // Calculate total duplications (sum of all counts)
      const totalDuplications = itemsByDuplication.reduce((sum, item) => sum + item.count, 0)
      
      stock.duplicationStats = {
        totalDuplications,
        averageDuplicationsPerOrder: stock.orders.length > 0 ? totalDuplications / stock.orders.length : 0,
        mostDuplicatedItem: itemsByDuplication.length > 0 ? itemsByDuplication[0] : null,
        itemsByDuplicationCount: itemsByDuplication,
      }
      
      // Sort items within each stock by quantity used
      stock.itemsUsing.sort((a, b) => b.totalQuantityUsed - a.totalQuantityUsed)
      stock.orders.sort((a, b) => new Date(b.usedAt).getTime() - new Date(a.usedAt).getTime())
    })
    
    // Convert map to array and sort by total quantity used
    return Array.from(stockMap.values())
      .sort((a, b) => b.totalQuantityUsed - a.totalQuantityUsed)
  }, [usedStock])

  // Calculate summary
  useEffect(() => {
    if (!stocks.length) return
    
    // Calculate totals from aggregated stock usage
    const totalUsage = aggregatedStockUsage.reduce((sum, stock) => sum + stock.totalQuantityUsed, 0)
    const usageValue = aggregatedStockUsage.reduce((sum, stock) => sum + stock.totalCost, 0)
    const totalUsageEvents = aggregatedStockUsage.reduce((sum, stock) => sum + stock.totalUsageEvents, 0)
    
    // Daily stats
    const dailyStatsMap = new Map<string, { date: string; uploads: number; usage: number; netChange: number }>()
    if (dateRange.from && dateRange.to) {
      const daysBetween = Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24))
      
      for (let i = 0; i <= daysBetween; i++) {
        const date = new Date(dateRange.from)
        date.setDate(date.getDate() + i)
        const dateStr = format(date, 'yyyy-MM-dd')
        dailyStatsMap.set(dateStr, { date: dateStr, uploads: 0, usage: 0, netChange: 0 })
      }
    }
    
    usedStock.forEach(u => {
      const dateStr = format(new Date(u.usedAt), 'yyyy-MM-dd')
      const stat = dailyStatsMap.get(dateStr)
      if (stat) {
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
    
    // Calculate global duplication stats from orders
    const filteredOrders = Array.isArray(orders) 
      ? orders.filter(order => {
          const orderDate = new Date(order.createdAt)
          return dateRange.from && dateRange.to 
            ? orderDate >= dateRange.from && orderDate <= dateRange.to
            : true
        })
      : []
    
    const totalItemsInOrders = filteredOrders.reduce((sum, order) => sum + (order.items?.length || 0), 0)
    const totalDuplications = filteredOrders.reduce((sum, order) => {
      return sum + (order.items?.length || 0)
    }, 0)
    
    // Most ordered items
    const itemOrderCount: Record<string, { count: number; totalQuantity: number; itemName: string }> = {}
    filteredOrders.forEach(order => {
      if (order.items && Array.isArray(order.items)) {
        order.items.forEach(item => {
          const key = item.itemId
          if (!itemOrderCount[key]) {
            itemOrderCount[key] = { count: 0, totalQuantity: 0, itemName: item.itemName }
          }
          itemOrderCount[key].count++
          itemOrderCount[key].totalQuantity += item.quantity || 0
        })
      }
    })
    
    const mostOrderedItems = Object.values(itemOrderCount)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
    
    setSummary({
      totalItems: stocks.length,
      totalValue,
      lowStockItems,
      outOfStockItems,
      totalUploads: 0,
      totalUsage,
      uploadValue: 0,
      usageValue,
      netChange: 0 - totalUsage,
      netChangeValue: 0 - usageValue,
      uploadCount: 0,
      usageCount: totalUsageEvents,
      averageUploadSize: 0,
      averageUsageSize: totalUsageEvents ? totalUsage / totalUsageEvents : 0,
      aggregatedStockUsage,
      dailyStats,
      duplicationStats: {
        totalOrders: filteredOrders.length,
        totalItems: totalItemsInOrders,
        totalDuplications,
        averageItemsPerOrder: filteredOrders.length > 0 ? totalItemsInOrders / filteredOrders.length : 0,
        mostOrderedItems,
      },
    })
    
  }, [stocks, usedStock, orders, aggregatedStockUsage, dateRange])

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
      const exportData = aggregatedStockUsage.map(stock => ({
        'Stock Item': stock.stockName,
        'Category': stock.stockCategory,
        'Total Quantity Used': stock.totalQuantityUsed.toFixed(3),
        'Unit': stock.stockUnit,
        'Total Cost': formatCurrency(stock.totalCost),
        'Number of Orders': stock.totalOrders,
        'Number of Usage Events': stock.totalUsageEvents,
        'Average per Order': stock.averageQuantityPerOrder.toFixed(3),
        'First Used': formatDate(stock.firstUsed, 'long'),
        'Last Used': formatDate(stock.lastUsed, 'long'),
        'Total Duplications': stock.duplicationStats.totalDuplications,
        'Most Duplicated Item': stock.duplicationStats.mostDuplicatedItem?.itemName || 'N/A',
      }))
      
      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.json_to_sheet(exportData)
      XLSX.utils.book_append_sheet(wb, ws, 'Stock Usage Summary')
      
      XLSX.writeFile(wb, `stock-summary-${format(new Date(), 'yyyy-MM-dd')}.xlsx`)
    } catch (err) {
      console.error('Export error:', err)
    }
  }

  // Handle view stock details
  const handleViewStockDetails = (stockId: string) => {
    const stock = aggregatedStockUsage.find(s => s.stockId === stockId)
    if (stock) {
      setSelectedStockDetail(stock)
      setShowStockDetail(true)
    }
  }

  // Filter and sort aggregated stock usage
  const getFilteredAggregatedStock = () => {
    let filtered = [...aggregatedStockUsage]
    
    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(stock =>
        stock.stockName.toLowerCase().includes(term) ||
        stock.stockCategory.toLowerCase().includes(term)
      )
    }
    
    // Sort
    filtered.sort((a, b) => {
      let aValue: any = a[sortBy as keyof AggregatedStockUsage]
      let bValue: any = b[sortBy as keyof AggregatedStockUsage]
      
      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1
      return 0
    })
    
    return filtered
  }

  const filteredAggregatedStock = getFilteredAggregatedStock()
  const totalPages = Math.ceil(filteredAggregatedStock.length / itemsPerPage)
  const paginatedAggregatedStock = filteredAggregatedStock.slice(
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
                Track stock usage with duplication statistics
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
              Export Summary
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
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="stockList">Stock List</TabsTrigger>
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
                      placeholder="Search by stock name..."
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
                  {' • '}{aggregatedStockUsage.length} unique stocks with usage
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
                subValue={`${summary.usageCount} events`}
                icon={TrendingDown}
                color="orange"
              />
              <SummaryCard
                title="Unique Stocks Used"
                value={aggregatedStockUsage.length}
                subValue={`out of ${summary.totalItems} total`}
                icon={Package}
                color="purple"
              />
            </div>

            {/* Duplication Stats Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <SummaryCard
                title="Total Orders"
                value={summary.duplicationStats.totalOrders}
                icon={History}
                color="blue"
              />
              <SummaryCard
                title="Total Items Ordered"
                value={summary.duplicationStats.totalItems}
                icon={List}
                color="green"
              />
              <SummaryCard
                title="Total Duplications"
                value={summary.duplicationStats.totalDuplications}
                subValue={`${summary.duplicationStats.averageItemsPerOrder.toFixed(2)} per order`}
                icon={Copy}
                color="orange"
              />
              <SummaryCard
                title="Avg Items/Order"
                value={summary.duplicationStats.averageItemsPerOrder.toFixed(2)}
                icon={Hash}
                color="purple"
              />
            </div>

            {/* Most Ordered Items */}
            <Card>
              <CardHeader>
                <CardTitle>Most Ordered Menu Items</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {summary.duplicationStats.mostOrderedItems.map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{item.itemName}</p>
                        <p className="text-xs text-muted-foreground">
                          Total quantity: {item.totalQuantity}
                        </p>
                      </div>
                      <Badge variant="secondary">
                        {item.count} orders
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

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
                  <CardTitle>Top 5 Most Used Stocks</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-4">
                      {aggregatedStockUsage.slice(0, 5).map((stock, index) => (
                        <div key={stock.stockId} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium">{stock.stockName}</p>
                              <p className="text-xs text-muted-foreground">
                                {stock.duplicationStats.totalDuplications} duplications
                              </p>
                            </div>
                            <div className="text-right">
                              <Badge variant="secondary">
                                {((stock.totalQuantityUsed / summary.totalUsage) * 100).toFixed(1)}%
                              </Badge>
                              <p className="text-xs text-muted-foreground mt-1">
                                {formatNumber(stock.totalQuantityUsed)} {stock.stockUnit}
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full text-xs justify-start"
                            onClick={() => handleViewStockDetails(stock.stockId)}
                          >
                            <Eye className="h-3 w-3 mr-2" />
                            View Details
                          </Button>
                          {index < Math.min(4, aggregatedStockUsage.length - 1) && <Separator className="my-2" />}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Stock List Tab - Each stock appears once */}
          <TabsContent value="stockList" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Stock Usage Summary</CardTitle>
                <div className="flex items-center gap-2">
                  <Select onValueChange={(value) => handleSort(value)}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="totalQuantityUsed">Quantity Used</SelectItem>
                      <SelectItem value="stockName">Stock Name</SelectItem>
                      <SelectItem value="totalOrders">Order Count</SelectItem>
                      <SelectItem value="totalCost">Total Cost</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="cursor-pointer hover:bg-gray-100" onClick={() => handleSort('stockName')}>
                          Stock Item {sortBy === 'stockName' && (sortOrder === 'asc' ? '↑' : '↓')}
                        </TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead className="cursor-pointer hover:bg-gray-100" onClick={() => handleSort('totalQuantityUsed')}>
                          Total Used {sortBy === 'totalQuantityUsed' && (sortOrder === 'asc' ? '↑' : '↓')}
                        </TableHead>
                        <TableHead className="cursor-pointer hover:bg-gray-100" onClick={() => handleSort('totalOrders')}>
                          Orders {sortBy === 'totalOrders' && (sortOrder === 'asc' ? '↑' : '↓')}
                        </TableHead>
                        <TableHead>Duplications</TableHead>
                        <TableHead>Last Used</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedAggregatedStock.map((stock) => (
                        <TableRow key={stock.stockId}>
                          <TableCell className="font-medium">{stock.stockName}</TableCell>
                          <TableCell>{stock.stockCategory}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="font-mono">
                              {formatNumber(stock.totalQuantityUsed)} {stock.stockUnit}
                            </Badge>
                          </TableCell>
                          <TableCell>{stock.totalOrders}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="flex items-center gap-1">
                              <Copy className="h-3 w-3" />
                              {stock.duplicationStats.totalDuplications}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatDate(stock.lastUsed, 'short')}</TableCell>
                          <TableCell>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleViewStockDetails(stock.stockId)}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {filteredAggregatedStock.length > 0 && (
                  <div className="flex items-center justify-between mt-4">
                    <p className="text-sm text-muted-foreground">
                      Showing {Math.min((currentPage - 1) * itemsPerPage + 1, filteredAggregatedStock.length)} to{' '}
                      {Math.min(currentPage * itemsPerPage, filteredAggregatedStock.length)} of {filteredAggregatedStock.length} unique stocks
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
        </Tabs>
      </div>

      {/* Stock Usage Detail Dialog - Shows all items that use this stock */}
      <StockUsageDetailDialog
        stock={selectedStockDetail}
        open={showStockDetail}
        onOpenChange={setShowStockDetail}
      />
    </div>
  )
}