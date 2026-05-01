"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
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
  History,
  Utensils,
  List,
  Grid3x3,
  Clock,
  BarChart3,
  Flame,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  ResponsiveContainer,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts"
import * as XLSX from "xlsx"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { format } from "date-fns"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import axios from "axios"

// Types
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
  items: OrderItem[]
  finalAmount: number
  createdAt: string
  status: string
}

type Stock = {
  _id: string
  name: string
  category: string
  unit: string
  currentStock: number
  minimumStock: number
  costPerUnit: number
}

type UsedStockItem = {
  itemId: string
  itemName: string
  quantityUsed: number
}

type UsedStock = {
  _id: string
  orderId: string
  stockId: string
  stockName: string
  stockCategory: string
  stockUnit: string
  totalQuantityUsed: number
  totalCost: number
  items: UsedStockItem[]
  usedAt: string
}

// Stock Usage View - aggregated by stock
type StockUsageView = {
  stockId: string
  stockName: string
  stockCategory: string
  stockUnit: string
  totalQuantityUsed: number
  totalCost: number
  totalOrders: number
  frequency: number // Number of times used
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

// Menu Item Usage View - aggregated by menu item
type MenuItemUsageView = {
  itemId: string
  itemName: string
  totalOrders: number
  totalQuantity: number // Total servings sold
  totalRevenue: number
  frequency: number // Number of times ordered
  averagePrice: number
  lastOrderDate: string | null
  stocksUsed: Array<{
    stockId: string
    stockName: string
    stockCategory: string
    stockUnit: string
    quantityUsed: number
    totalCost: number
    percentageOfItem: number
  }>
}

// Order Processing Status
type OrderProcessingStatus = {
  totalOrders: number
  processedOrders: number
  unprocessedOrders: number
  processedPercentage: number
  unprocessedPercentage: number
  unprocessedOrdersList: Order[]
}

type DateRange = {
  from: Date | null
  to: Date | null
}

// API client
const api = axios.create({
  baseURL: '/api',
  timeout: 60000, // Increased timeout for large data
})

// Helper functions
const safeNumber = (value: any): number => {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
};

const safeArray = <T,>(data: any): T[] => {
  if (Array.isArray(data)) return data;
  if (data?.data && Array.isArray(data.data)) return data.data;
  if (data?.items && Array.isArray(data.items)) return data.items;
  if (data?.orders && Array.isArray(data.orders)) return data.orders;
  return [];
};

const formatQuantity = (value: any, unit: string = 'kg', decimals: number = 2): string => {
  const num = safeNumber(value);
  return `${num.toFixed(decimals)} ${unit}`;
};

const formatCurrency = (amount: any): string => {
  const num = safeNumber(amount);
  return new Intl.NumberFormat("en-ET", {
    style: "currency",
    currency: "ETB",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num)
}

const formatNumber = (num: any, decimals: number = 0): string => {
  const value = safeNumber(num);
  return new Intl.NumberFormat("en-ET", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

const formatDate = (date: string | Date | null): string => {
  if (!date) return '-';
  const d = new Date(date)
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString("en-ET")
}

const getDateRange = (type: 'today' | 'week' | 'month' | 'year'): DateRange => {
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

const getStockStatus = (currentStock: number, minimumStock: number): 'normal' | 'low' | 'critical' => {
  if (currentStock <= 0) return 'critical';
  if (currentStock <= minimumStock) return 'low';
  return 'normal';
};

const STATUS_COLORS = {
  normal: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  low: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  critical: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
}

const FREQUENCY_COLORS = ['#FF6B6B', '#FF8E53', '#FFB347', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7']

// Loading Skeleton
const ReportSkeleton = () => (
  <div className="space-y-4">
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      {[...Array(5)].map((_, i) => (
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
  color,
}: {
  title: string
  value: string | number
  subValue?: string
  icon: any
  color: string
}) => (
  <Card className="hover:shadow-lg transition-shadow">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">
        {title}
      </CardTitle>
      <div className={`h-8 w-8 rounded-full bg-${color}-100 dark:bg-${color}-900/30 flex items-center justify-center`}>
        <Icon className={`h-4 w-4 text-${color}-600 dark:text-${color}-400`} />
      </div>
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      {subValue && <p className="text-xs text-muted-foreground mt-1">{subValue}</p>}
    </CardContent>
  </Card>
)

export default function StockReportPage() {
  const router = useRouter()
  
  // State
  const [stocks, setStocks] = useState<Stock[]>([])
  const [allOrders, setAllOrders] = useState<Order[]>([])
  const [usedStock, setUsedStock] = useState<UsedStock[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Filter state
  const [filterType, setFilterType] = useState<'stock' | 'menuItem'>('stock')
  const [dateRange, setDateRange] = useState<DateRange>(getDateRange('month'))
  const [searchTerm, setSearchTerm] = useState('')
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [viewLayout, setViewLayout] = useState<'table' | 'cards'>('table')
  const [sortBy, setSortBy] = useState<'frequency' | 'name' | 'usage' | 'revenue'>('frequency')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  
  // View state
  const [selectedStock, setSelectedStock] = useState<StockUsageView | null>(null)
  const [selectedMenuItem, setSelectedMenuItem] = useState<MenuItemUsageView | null>(null)
  const [showStockDialog, setShowStockDialog] = useState(false)
  const [showMenuItemDialog, setShowMenuItemDialog] = useState(false)
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  
  // Summary stats
  const [totalStockValue, setTotalStockValue] = useState(0)
  const [totalStockUsed, setTotalStockUsed] = useState(0)
  const [totalRevenue, setTotalRevenue] = useState(0)
  const [topStock, setTopStock] = useState<{ name: string; usage: number } | null>(null)
  const [topMenuItem, setTopMenuItem] = useState<{ name: string; frequency: number } | null>(null)
  const [orderProcessingStatus, setOrderProcessingStatus] = useState<OrderProcessingStatus>({
    totalOrders: 0,
    processedOrders: 0,
    unprocessedOrders: 0,
    processedPercentage: 0,
    unprocessedPercentage: 0,
    unprocessedOrdersList: [],
  })

  // Fetch all orders with pagination
  const fetchAllOrders = async (): Promise<Order[]> => {
    let allFetchedOrders: Order[] = []
    let page = 1
    const limit = 100
    let hasMore = true
    
    while (hasMore) {
      try {
        const response = await api.get(`/order?page=${page}&limit=${limit}&sort=-createdAt`)
        const data = response.data
        const orders = safeArray<Order>(data)
        allFetchedOrders = [...allFetchedOrders, ...orders]
        
        // Check if we have more pages
        const total = data.total || data.pagination?.total || 0
        if (orders.length < limit || allFetchedOrders.length >= total) {
          hasMore = false
        } else {
          page++
        }
      } catch (err) {
        console.error('Error fetching orders page:', page, err)
        hasMore = false
      }
    }
    
    return allFetchedOrders
  }

  // Fetch all used stock records
  const fetchAllUsedStock = async (dateFilter?: { from?: Date; to?: Date }): Promise<UsedStock[]> => {
    let allFetchedUsedStock: UsedStock[] = []
    let page = 1
    const limit = 200
    let hasMore = true
    
    while (hasMore) {
      try {
        let url = `/used-stock?page=${page}&limit=${limit}`
        if (dateFilter?.from) {
          url += `&startDate=${dateFilter.from.toISOString()}`
        }
        if (dateFilter?.to) {
          url += `&endDate=${dateFilter.to.toISOString()}`
        }
        
        const response = await api.get(url)
        const data = response.data
        const records = safeArray<UsedStock>(data)
        allFetchedUsedStock = [...allFetchedUsedStock, ...records]
        
        const total = data.total || data.pagination?.total || 0
        if (records.length < limit || allFetchedUsedStock.length >= total) {
          hasMore = false
        } else {
          page++
        }
      } catch (err) {
        console.error('Error fetching used stock page:', page, err)
        hasMore = false
      }
    }
    
    return allFetchedUsedStock
  }

  // Fetch all stocks
  const fetchAllStocks = async (): Promise<Stock[]> => {
    let allFetchedStocks: Stock[] = []
    let page = 1
    const limit = 200
    let hasMore = true
    
    while (hasMore) {
      try {
        const response = await api.get(`/stock?page=${page}&limit=${limit}`)
        const data = response.data
        const stocksData = safeArray<Stock>(data)
        allFetchedStocks = [...allFetchedStocks, ...stocksData]
        
        const total = data.total || data.pagination?.total || 0
        if (stocksData.length < limit || allFetchedStocks.length >= total) {
          hasMore = false
        } else {
          page++
        }
      } catch (err) {
        console.error('Error fetching stocks page:', page, err)
        hasMore = false
      }
    }
    
    return allFetchedStocks
  }

  // Fetch all data with complete order set
  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Fetch all stocks
      const [stocksData, allOrdersData, usedStockData] = await Promise.all([
        fetchAllStocks(),
        fetchAllOrders(),
        fetchAllUsedStock({ from: dateRange.from || undefined, to: dateRange.to || undefined })
      ])
      
      setStocks(stocksData)
      setAllOrders(allOrdersData)
      setUsedStock(usedStockData)
      
    } catch (err: any) {
      console.error('Error fetching data:', err)
      setError(err.message || 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [dateRange])

  // Calculate order processing status
  const orderProcessingStatusData = useMemo(() => {
    const processedOrderIds = new Set(usedStock.map(us => us.orderId).filter(Boolean))
    const totalOrders = allOrders.length
    const processedOrders = processedOrderIds.size
    const unprocessedOrders = totalOrders - processedOrders
    const processedPercentage = totalOrders > 0 ? (processedOrders / totalOrders) * 100 : 0
    const unprocessedPercentage = totalOrders > 0 ? (unprocessedOrders / totalOrders) * 100 : 0
    
    const unprocessedOrdersList = allOrders.filter(order => !processedOrderIds.has(order._id))
    
    return {
      totalOrders,
      processedOrders,
      unprocessedOrders,
      processedPercentage,
      unprocessedPercentage,
      unprocessedOrdersList,
    }
  }, [allOrders, usedStock])

  // Process Stock Data - Group by stockId and calculate frequency
  const stockViewData = useMemo(() => {
    const stockMap = new Map<string, StockUsageView>()
    const stockDetails = new Map<string, Stock>()
    stocks.forEach(s => stockDetails.set(s._id, s))
    
    // Group used stock by stockId
    usedStock.forEach(record => {
      const stockId = record.stockId
      const quantity = safeNumber(record.totalQuantityUsed)
      const cost = safeNumber(record.totalCost)
      const order = allOrders.find(o => o._id === record.orderId)
      
      if (!stockMap.has(stockId)) {
        stockMap.set(stockId, {
          stockId: record.stockId,
          stockName: record.stockName,
          stockCategory: record.stockCategory,
          stockUnit: record.stockUnit || 'kg',
          totalQuantityUsed: quantity,
          totalCost: cost,
          totalOrders: 1,
          frequency: 1,
          currentStock: stockDetails.get(stockId)?.currentStock || 0,
          minimumStock: stockDetails.get(stockId)?.minimumStock || 0,
          stockStatus: getStockStatus(
            stockDetails.get(stockId)?.currentStock || 0,
            stockDetails.get(stockId)?.minimumStock || 0
          ),
          lastUsed: record.usedAt,
          menuItems: record.items.map(item => {
            const originalItem = order?.items.find(oi => oi.itemId === item.itemId)
            return {
              itemId: item.itemId,
              itemName: item.itemName,
              quantityUsed: safeNumber(item.quantityUsed),
              servingsCount: originalItem?.quantity || 0,
            }
          }),
        })
      } else {
        const existing = stockMap.get(stockId)!
        existing.totalQuantityUsed += quantity
        existing.totalCost += cost
        existing.totalOrders++
        existing.frequency++
        if (record.usedAt && (!existing.lastUsed || new Date(record.usedAt) > new Date(existing.lastUsed))) {
          existing.lastUsed = record.usedAt
        }
        
        // Merge menu items
        record.items.forEach(item => {
          const originalItem = order?.items.find(oi => oi.itemId === item.itemId)
          const servings = originalItem?.quantity || 0
          const existingItem = existing.menuItems.find(mi => mi.itemId === item.itemId)
          if (existingItem) {
            existingItem.quantityUsed += safeNumber(item.quantityUsed)
            existingItem.servingsCount += servings
          } else {
            existing.menuItems.push({
              itemId: item.itemId,
              itemName: item.itemName,
              quantityUsed: safeNumber(item.quantityUsed),
              servingsCount: servings,
            })
          }
        })
      }
    })
    
    // Sort menu items by usage
    const result = Array.from(stockMap.values())
    result.forEach(stock => {
      stock.menuItems.sort((a, b) => b.quantityUsed - a.quantityUsed)
    })
    
    // Apply sorting
    let sorted = [...result]
    switch (sortBy) {
      case 'name':
        sorted.sort((a, b) => sortOrder === 'asc' 
          ? a.stockName.localeCompare(b.stockName)
          : b.stockName.localeCompare(a.stockName))
        break
      case 'usage':
        sorted.sort((a, b) => sortOrder === 'asc'
          ? a.totalQuantityUsed - b.totalQuantityUsed
          : b.totalQuantityUsed - a.totalQuantityUsed)
        break
      case 'frequency':
        sorted.sort((a, b) => sortOrder === 'asc'
          ? a.frequency - b.frequency
          : b.frequency - a.frequency)
        break
      default:
        sorted.sort((a, b) => b.frequency - a.frequency)
    }
    
    return sorted
  }, [usedStock, stocks, allOrders, sortBy, sortOrder])

  // Process Menu Item Data - Group by itemId and calculate frequency
  const menuItemViewData = useMemo(() => {
    const itemMap = new Map<string, MenuItemUsageView>()
    const stockDetails = new Map<string, Stock>()
    stocks.forEach(s => stockDetails.set(s._id, s))
    
    // Build order item revenue and frequency map from ALL orders
    const orderItemData = new Map<string, { 
      totalQuantity: number
      totalRevenue: number
      orderIds: Set<string>
      averagePrice: number
    }>()
    
    allOrders.forEach(order => {
      order.items.forEach(orderItem => {
        const itemId = orderItem.itemId
        const quantity = safeNumber(orderItem.quantity)
        const unitPrice = safeNumber(orderItem.unitPrice)
        const revenue = quantity * unitPrice
        
        const existing = orderItemData.get(itemId)
        if (existing) {
          existing.totalQuantity += quantity
          existing.totalRevenue += revenue
          existing.orderIds.add(order._id)
          existing.averagePrice = existing.totalRevenue / existing.totalQuantity
        } else {
          orderItemData.set(itemId, {
            totalQuantity: quantity,
            totalRevenue: revenue,
            orderIds: new Set([order._id]),
            averagePrice: unitPrice,
          })
        }
      })
    })
    
    // Process used stock to build menu item ingredients
    usedStock.forEach(record => {
      const order = allOrders.find(o => o._id === record.orderId)
      
      record.items.forEach(item => {
        const itemId = item.itemId
        const itemName = item.itemName
        const quantityUsed = safeNumber(item.quantityUsed)
        
        const orderData = orderItemData.get(itemId)
        const orderItem = order?.items.find(oi => oi.itemId === itemId)
        const servingsInOrder = orderItem?.quantity || 0
        
        if (!itemMap.has(itemId)) {
          itemMap.set(itemId, {
            itemId,
            itemName,
            totalOrders: orderData?.orderIds.size || 1,
            totalQuantity: orderData?.totalQuantity || servingsInOrder,
            totalRevenue: orderData?.totalRevenue || (servingsInOrder * safeNumber(orderItem?.unitPrice || 0)),
            frequency: orderData?.orderIds.size || 1,
            averagePrice: orderData?.averagePrice || safeNumber(orderItem?.unitPrice || 0),
            lastOrderDate: record.usedAt,
            stocksUsed: [{
              stockId: record.stockId,
              stockName: record.stockName,
              stockCategory: record.stockCategory,
              stockUnit: record.stockUnit || 'kg',
              quantityUsed,
              totalCost: safeNumber(record.totalCost) / Math.max(1, record.items.length),
              percentageOfItem: 0,
            }],
          })
        } else {
          const existing = itemMap.get(itemId)!
          if (orderData) {
            existing.totalOrders = orderData.orderIds.size
            existing.totalQuantity = orderData.totalQuantity
            existing.totalRevenue = orderData.totalRevenue
            existing.frequency = orderData.orderIds.size
            existing.averagePrice = orderData.averagePrice
          }
          
          if (record.usedAt && (!existing.lastOrderDate || new Date(record.usedAt) > new Date(existing.lastOrderDate))) {
            existing.lastOrderDate = record.usedAt
          }
          
          const existingStock = existing.stocksUsed.find(s => s.stockId === record.stockId)
          if (existingStock) {
            existingStock.quantityUsed += quantityUsed
            existingStock.totalCost += safeNumber(record.totalCost) / Math.max(1, record.items.length)
          } else {
            existing.stocksUsed.push({
              stockId: record.stockId,
              stockName: record.stockName,
              stockCategory: record.stockCategory,
              stockUnit: record.stockUnit || 'kg',
              quantityUsed,
              totalCost: safeNumber(record.totalCost) / Math.max(1, record.items.length),
              percentageOfItem: 0,
            })
          }
          
          itemMap.set(itemId, existing)
        }
      })
    })
    
    // Also add menu items that appear in orders but have no stock usage recorded
    orderItemData.forEach((data, itemId) => {
      if (!itemMap.has(itemId)) {
        // Find the item name from any order
        let itemName = itemId
        for (const order of allOrders) {
          const found = order.items.find(oi => oi.itemId === itemId)
          if (found) {
            itemName = found.itemName
            break
          }
        }
        
        itemMap.set(itemId, {
          itemId,
          itemName,
          totalOrders: data.orderIds.size,
          totalQuantity: data.totalQuantity,
          totalRevenue: data.totalRevenue,
          frequency: data.orderIds.size,
          averagePrice: data.averagePrice,
          lastOrderDate: null,
          stocksUsed: [], // No stock usage recorded
        })
      }
    })
    
    // Calculate percentages for each stock in menu item
    itemMap.forEach(item => {
      const totalQuantity = item.stocksUsed.reduce((sum, s) => sum + s.quantityUsed, 0)
      item.stocksUsed.forEach(stock => {
        stock.percentageOfItem = totalQuantity > 0 ? (stock.quantityUsed / totalQuantity) * 100 : 0
      })
      item.stocksUsed.sort((a, b) => b.quantityUsed - a.quantityUsed)
    })
    
    // Apply sorting
    let sorted = Array.from(itemMap.values())
    switch (sortBy) {
      case 'name':
        sorted.sort((a, b) => sortOrder === 'asc' 
          ? a.itemName.localeCompare(b.itemName)
          : b.itemName.localeCompare(a.itemName))
        break
      case 'revenue':
        sorted.sort((a, b) => sortOrder === 'asc'
          ? a.totalRevenue - b.totalRevenue
          : b.totalRevenue - a.totalRevenue)
        break
      case 'usage':
        sorted.sort((a, b) => sortOrder === 'asc'
          ? a.totalQuantity - b.totalQuantity
          : b.totalQuantity - a.totalQuantity)
        break
      case 'frequency':
        sorted.sort((a, b) => sortOrder === 'asc'
          ? a.frequency - b.frequency
          : b.frequency - a.frequency)
        break
      default:
        sorted.sort((a, b) => b.frequency - a.frequency)
    }
    
    return sorted
  }, [usedStock, allOrders, stocks, sortBy, sortOrder])

  // Calculate summary stats
  useEffect(() => {
    const totalStockVal = stocks.reduce((sum, s) => sum + (s.currentStock * s.costPerUnit), 0)
    setTotalStockValue(totalStockVal)
    
    const totalStockUsg = stockViewData.reduce((sum, s) => sum + s.totalQuantityUsed, 0)
    setTotalStockUsed(totalStockUsg)
    
    const totalRev = menuItemViewData.reduce((sum, m) => sum + m.totalRevenue, 0)
    setTotalRevenue(totalRev)
    
    // Find top stock by frequency
    if (stockViewData.length > 0) {
      const top = stockViewData.reduce((max, s) => s.frequency > max.frequency ? s : max, stockViewData[0])
      setTopStock({ name: top.stockName, usage: top.frequency })
    }
    
    // Find top menu item by frequency
    if (menuItemViewData.length > 0) {
      const top = menuItemViewData.reduce((max, m) => m.frequency > max.frequency ? m : max, menuItemViewData[0])
      setTopMenuItem({ name: top.itemName, frequency: top.frequency })
    }
    
    setOrderProcessingStatus(orderProcessingStatusData)
  }, [stocks, stockViewData, menuItemViewData, usedStock, orderProcessingStatusData])

  const handleFilterTypeChange = (type: 'stock' | 'menuItem') => {
    setFilterType(type)
    setCurrentPage(1)
    setSearchTerm('')
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchData()
    setRefreshing(false)
  }

  const handleExport = () => {
    try {
      let exportData: any[] = []
      
      if (filterType === 'stock') {
        exportData = stockViewData.map(stock => ({
          'Rank': stockViewData.findIndex(s => s.stockId === stock.stockId) + 1,
          'Stock Item': stock.stockName,
          'Category': stock.stockCategory,
          'Frequency (Times Used)': stock.frequency,
          'Total Quantity Used': formatQuantity(stock.totalQuantityUsed, stock.stockUnit),
          'Current Stock': formatQuantity(stock.currentStock, stock.stockUnit),
          'Status': stock.stockStatus,
          'Total Cost': formatCurrency(stock.totalCost),
          'Orders': stock.totalOrders,
          'Last Used': formatDate(stock.lastUsed),
        }))
      } else {
        exportData = menuItemViewData.map(item => ({
          'Rank': menuItemViewData.findIndex(m => m.itemId === item.itemId) + 1,
          'Menu Item': item.itemName,
          'Frequency (Times Ordered)': item.frequency,
          'Total Orders': item.totalOrders,
          'Total Quantity Sold': item.totalQuantity,
          'Revenue': formatCurrency(item.totalRevenue),
          'Average Price': formatCurrency(item.averagePrice),
          'Stocks Used': item.stocksUsed.length,
          'Has Stock Tracking': item.stocksUsed.length > 0 ? 'Yes' : 'No',
        }))
      }
      
      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.json_to_sheet(exportData)
      XLSX.utils.book_append_sheet(wb, ws, `${filterType === 'stock' ? 'Stock' : 'MenuItem'} Report`)
      XLSX.writeFile(wb, `${filterType === 'stock' ? 'stock-frequency' : 'menu-item-frequency'}-${format(new Date(), 'yyyy-MM-dd')}.xlsx`)
    } catch (err) {
      console.error('Export error:', err)
    }
  }

  const handleExportUnprocessedOrders = () => {
    try {
      const exportData = orderProcessingStatus.unprocessedOrdersList.map(order => ({
        'Order Number': order.orderNumber,
        'Order Date': formatDate(order.createdAt),
        'Final Amount': formatCurrency(order.finalAmount),
        'Status': order.status,
        'Items Count': order.items.length,
        'Items': order.items.map(i => `${i.itemName} (${i.quantity})`).join(', '),
      }))
      
      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.json_to_sheet(exportData)
      XLSX.utils.book_append_sheet(wb, ws, 'Unprocessed Orders')
      XLSX.writeFile(wb, `unprocessed-orders-${format(new Date(), 'yyyy-MM-dd')}.xlsx`)
    } catch (err) {
      console.error('Export error:', err)
    }
  }

  const getCurrentData = () => {
    let data = filterType === 'stock' ? stockViewData : menuItemViewData
    
    let filtered = data.filter(item => {
      if (searchTerm) {
        const term = searchTerm.toLowerCase()
        if (filterType === 'stock') {
          const stock = item as StockUsageView
          return stock.stockName.toLowerCase().includes(term) ||
                 stock.stockCategory.toLowerCase().includes(term)
        } else {
          const menuItem = item as MenuItemUsageView
          return menuItem.itemName.toLowerCase().includes(term)
        }
      }
      return true
    })
    
    const start = (currentPage - 1) * itemsPerPage
    const paginated = filtered.slice(start, start + itemsPerPage)
    return { filtered, paginated, totalPages: Math.ceil(filtered.length / itemsPerPage) }
  }

  const { filtered: allData, paginated: currentData, totalPages } = getCurrentData()

  // Prepare chart data for top 10 by frequency
  const topFrequencyData = useMemo(() => {
    if (filterType === 'stock') {
      return stockViewData.slice(0, 10).map((stock, index) => ({
        name: stock.stockName.length > 15 ? stock.stockName.substring(0, 15) + '...' : stock.stockName,
        frequency: stock.frequency,
        fill: FREQUENCY_COLORS[index % FREQUENCY_COLORS.length],
      }))
    } else {
      return menuItemViewData.slice(0, 10).map((item, index) => ({
        name: item.itemName.length > 15 ? item.itemName.substring(0, 15) + '...' : item.itemName,
        frequency: item.frequency,
        fill: FREQUENCY_COLORS[index % FREQUENCY_COLORS.length],
      }))
    }
  }, [filterType, stockViewData, menuItemViewData])

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
      <div className="flex-1 space-y-4 p-8 pt-6 bg-gradient-to-br from-background to-secondary/5">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
              className="rounded-full hover:bg-secondary"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div>
              <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Usage Frequency Report
              </h2>
              <p className="text-sm text-muted-foreground">
                Track stock and menu item usage frequency - Most used items first
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
            
            <Button size="sm" onClick={handleExport} variant="default">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <Card className="border-red-500 bg-red-50 dark:bg-red-950/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-red-500">
                <AlertCircle className="h-5 w-5" />
                <p>{error}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <SummaryCard
            title="Total Stock Value"
            value={formatCurrency(totalStockValue)}
            subValue={`${stocks.length} total stock items`}
            icon={DollarSign}
            color="green"
          />
          <SummaryCard
            title="Stock Used"
            value={formatNumber(totalStockUsed, 2)}
            subValue={`${stockViewData.length} stocks with usage`}
            icon={Package}
            color="blue"
          />
          <SummaryCard
            title="Total Orders"
            value={orderProcessingStatus.totalOrders}
            subValue={`from all time`}
            icon={History}
            color="orange"
          />
          <SummaryCard
            title="Processed Orders"
            value={`${orderProcessingStatus.processedOrders} (${orderProcessingStatus.processedPercentage.toFixed(1)}%)`}
            subValue={`with stock tracking`}
            icon={CheckCircle2}
            color="green"
          />
          <SummaryCard
            title="Unprocessed Orders"
            value={`${orderProcessingStatus.unprocessedOrders} (${orderProcessingStatus.unprocessedPercentage.toFixed(1)}%)`}
            subValue={`no stock records`}
            icon={XCircle}
            color="red"
          />
        </div>

        {/* Top Frequency Cards */}
        <div className="grid gap-4 md:grid-cols-2">
          {topStock && (
            <Card className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-950/20 dark:to-red-950/20">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">🔥 Most Used Stock</p>
                    <p className="text-2xl font-bold">{topStock.name}</p>
                    <p className="text-sm text-muted-foreground mt-1">Used {topStock.usage} times</p>
                  </div>
                  <Flame className="h-12 w-12 text-orange-500 opacity-50" />
                </div>
              </CardContent>
            </Card>
          )}
          {topMenuItem && (
            <Card className="bg-gradient-to-r from-green-50 to-teal-50 dark:from-green-950/20 dark:to-teal-950/20">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">⭐ Most Popular Menu Item</p>
                    <p className="text-2xl font-bold">{topMenuItem.name}</p>
                    <p className="text-sm text-muted-foreground mt-1">Ordered {topMenuItem.frequency} times</p>
                  </div>
                  <TrendingUp className="h-12 w-12 text-green-500 opacity-50" />
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Unprocessed Orders Alert Card */}
        {orderProcessingStatus.unprocessedOrders > 0 && (
          <Card className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-8 w-8 text-yellow-600" />
                  <div>
                    <p className="font-semibold text-yellow-800 dark:text-yellow-300">
                      {orderProcessingStatus.unprocessedOrders} Orders Without Stock Tracking
                    </p>
                    <p className="text-sm text-yellow-700 dark:text-yellow-400">
                      These orders have been placed but no stock consumption has been recorded. 
                      Stock analysis for menu items from these orders will not be complete.
                    </p>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleExportUnprocessedOrders}
                  className="border-yellow-500 text-yellow-700 hover:bg-yellow-100"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export Unprocessed Orders
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Frequency Chart */}
        {topFrequencyData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Top 10 by Frequency - {filterType === 'stock' ? 'Most Used Stocks' : 'Most Ordered Items'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={topFrequencyData} layout="vertical" margin={{ left: 100, right: 20, top: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" label={{ value: 'Frequency (Times)', position: 'bottom' }} />
                  <YAxis type="category" dataKey="name" width={120} />
                  <Tooltip formatter={(value) => [`${value} times`, 'Frequency']} />
                  <Bar dataKey="frequency" fill="#8884d8" radius={[0, 4, 4, 0]}>
                    {topFrequencyData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Filters Section */}
        <Card className="shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Filter className="h-5 w-5" />
              Filters & Settings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {/* View Type Toggle */}
              <div className="space-y-2">
                <Label>View Type</Label>
                <div className="flex gap-2">
                  <Button
                    variant={filterType === 'stock' ? "default" : "outline"}
                    onClick={() => handleFilterTypeChange('stock')}
                    className="flex-1"
                  >
                    <Package className="h-4 w-4 mr-2" />
                    Stock ({stockViewData.length})
                  </Button>
                  <Button
                    variant={filterType === 'menuItem' ? "default" : "outline"}
                    onClick={() => handleFilterTypeChange('menuItem')}
                    className="flex-1"
                  >
                    <Utensils className="h-4 w-4 mr-2" />
                    Menu Item ({menuItemViewData.length})
                  </Button>
                </div>
              </div>

              {/* Date Range */}
              <div className="space-y-2">
                <Label>Date Range (Stock Usage)</Label>
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
                          {format(dateRange.from, "MMM dd")} - {format(dateRange.to, "MMM dd, yyyy")}
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
                          setDateRange({ from: range.from, to: range.to })
                        }
                        setShowDatePicker(false)
                      }}
                      numberOfMonths={2}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Search */}
              <div className="space-y-2">
                <Label>Search</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={filterType === 'stock' ? "Search stock..." : "Search menu item..."}
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value)
                      setCurrentPage(1)
                    }}
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

              {/* Sort By */}
              <div className="space-y-2">
                <Label>Sort By</Label>
                <div className="flex gap-2">
                  <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                    <SelectTrigger className="flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="frequency">Frequency (Most Used)</SelectItem>
                      <SelectItem value="name">Name</SelectItem>
                      {filterType === 'stock' ? (
                        <SelectItem value="usage">Quantity Used</SelectItem>
                      ) : (
                        <SelectItem value="revenue">Revenue</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  >
                    {sortOrder === 'asc' ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {/* Layout Toggle */}
              <div className="space-y-2">
                <Label>Layout</Label>
                <div className="flex gap-2">
                  <Button
                    variant={viewLayout === 'table' ? "default" : "outline"}
                    size="sm"
                    onClick={() => setViewLayout('table')}
                    className="flex-1"
                  >
                    <List className="h-4 w-4 mr-2" />
                    Table
                  </Button>
                  <Button
                    variant={viewLayout === 'cards' ? "default" : "outline"}
                    size="sm"
                    onClick={() => setViewLayout('cards')}
                    className="flex-1"
                  >
                    <Grid3x3 className="h-4 w-4 mr-2" />
                    Cards
                  </Button>
                </div>
              </div>
            </div>

            {/* Quick Date Presets */}
            <div className="flex gap-2 mt-4 flex-wrap">
              <Button variant="outline" size="sm" onClick={() => setDateRange(getDateRange('today'))}>Today</Button>
              <Button variant="outline" size="sm" onClick={() => setDateRange(getDateRange('week'))}>This Week</Button>
              <Button variant="outline" size="sm" onClick={() => setDateRange(getDateRange('month'))}>This Month</Button>
              <Button variant="outline" size="sm" onClick={() => setDateRange(getDateRange('year'))}>This Year</Button>
              <Button variant="outline" size="sm" onClick={() => setDateRange({ from: null, to: null })}>All Time</Button>
            </div>
          </CardContent>
        </Card>

        {/* Data Display */}
        <Card className="shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              {filterType === 'stock' ? (
                <>
                  <Package className="h-5 w-5 text-primary" />
                  Stock Usage by Frequency ({stockViewData.length} stocks)
                </>
              ) : (
                <>
                  <Utensils className="h-5 w-5 text-primary" />
                  Menu Item Orders by Frequency ({menuItemViewData.length} items)
                  {(() => {
                    const itemsWithoutStock = menuItemViewData.filter(item => item.stocksUsed.length === 0).length
                    if (itemsWithoutStock > 0) {
                      return (
                        <Badge variant="outline" className="ml-2 text-yellow-600">
                          {itemsWithoutStock} without stock tracking
                        </Badge>
                      )
                    }
                    return null
                  })()}
                </>
              )}
            </CardTitle>
            <Badge variant="outline" className="text-sm">
              Sorted by {sortBy === 'frequency' ? 'Frequency' : sortBy} {sortOrder === 'desc' ? '↓' : '↑'}
            </Badge>
          </CardHeader>
          <CardContent>
            {viewLayout === 'table' ? (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      {filterType === 'stock' ? (
                        <>
                          <TableHead>Stock Item</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead className="text-center">Frequency</TableHead>
                          <TableHead className="text-right">Total Used</TableHead>
                          <TableHead className="text-right">Current Stock</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-center">Orders</TableHead>
                          <TableHead>Last Used</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </>
                      ) : (
                        <>
                          <TableHead>Menu Item</TableHead>
                          <TableHead className="text-center">Frequency</TableHead>
                          <TableHead className="text-center">Orders</TableHead>
                          <TableHead className="text-right">Quantity Sold</TableHead>
                          <TableHead className="text-right">Revenue</TableHead>
                          <TableHead className="text-center">Stock Tracking</TableHead>
                          <TableHead className="text-center">Ingredients</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={filterType === 'stock' ? 9 : 8} className="text-center py-8 text-muted-foreground">
                          No data found for the selected filters
                        </TableCell>
                      </TableRow>
                    ) : filterType === 'stock' ? (
                      (currentData as StockUsageView[]).map((stock, idx) => (
                        <TableRow key={stock.stockId} className="hover:bg-secondary/10">
                          <TableCell className="font-bold text-primary">
                            {(currentPage - 1) * itemsPerPage + idx + 1}
                          </TableCell>
                          <TableCell className="font-medium">{stock.stockName}</TableCell>
                          <TableCell>{stock.stockCategory}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary" className="font-mono">
                              {stock.frequency}×
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">{formatQuantity(stock.totalQuantityUsed, stock.stockUnit)}</TableCell>
                          <TableCell className="text-right">{formatQuantity(stock.currentStock, stock.stockUnit)}</TableCell>
                          <TableCell>
                            <Badge className={STATUS_COLORS[stock.stockStatus]}>
                              {stock.stockStatus}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">{stock.totalOrders}</TableCell>
                          <TableCell>{formatDate(stock.lastUsed)}</TableCell>
                          <TableCell className="text-right">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => {
                                setSelectedStock(stock)
                                setShowStockDialog(true)
                              }}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              Details
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      (currentData as MenuItemUsageView[]).map((item, idx) => (
                        <TableRow key={item.itemId} className="hover:bg-secondary/10">
                          <TableCell className="font-bold text-primary">
                            {(currentPage - 1) * itemsPerPage + idx + 1}
                          </TableCell>
                          <TableCell className="font-medium">{item.itemName}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary" className="font-mono">
                              {item.frequency}×
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">{item.totalOrders}</TableCell>
                          <TableCell className="text-right">{item.totalQuantity}</TableCell>
                          <TableCell className="text-right text-green-600 font-medium">{formatCurrency(item.totalRevenue)}</TableCell>
                          <TableCell className="text-center">
                            {item.stocksUsed.length > 0 ? (
                              <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                                Tracked ({item.stocksUsed.length})
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-yellow-600 border-yellow-500">
                                No Stock Data
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline">{item.stocksUsed.length} ingredients</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => {
                                setSelectedMenuItem(item)
                                setShowMenuItemDialog(true)
                              }}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              Details
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            ) : (
              // Card View
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {currentData.length === 0 ? (
                  <div className="col-span-full text-center py-8 text-muted-foreground">
                    No data found for the selected filters
                  </div>
                ) : filterType === 'stock' ? (
                  (currentData as StockUsageView[]).map((stock, idx) => (
                    <Card key={stock.stockId} className="hover:shadow-lg transition-shadow cursor-pointer relative overflow-hidden" onClick={() => {
                      setSelectedStock(stock)
                      setShowStockDialog(true)
                    }}>
                      <div 
                        className="absolute top-0 left-0 w-1 h-full"
                        style={{ 
                          backgroundColor: FREQUENCY_COLORS[Math.min(idx, FREQUENCY_COLORS.length - 1)],
                          width: '4px'
                        }}
                      />
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="font-mono">
                              #{idx + 1}
                            </Badge>
                            <CardTitle className="text-lg">{stock.stockName}</CardTitle>
                          </div>
                          <Badge className={STATUS_COLORS[stock.stockStatus]}>{stock.stockStatus}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{stock.stockCategory}</p>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                          <div className="text-center p-2 bg-primary/5 rounded-lg">
                            <p className="text-muted-foreground text-xs">Frequency</p>
                            <p className="font-bold text-lg">{stock.frequency}×</p>
                          </div>
                          <div className="text-center p-2 bg-primary/5 rounded-lg">
                            <p className="text-muted-foreground text-xs">Total Used</p>
                            <p className="font-semibold">{formatQuantity(stock.totalQuantityUsed, stock.stockUnit)}</p>
                          </div>
                          <div className="text-center p-2 bg-primary/5 rounded-lg">
                            <p className="text-muted-foreground text-xs">Current Stock</p>
                            <p className="font-semibold">{formatQuantity(stock.currentStock, stock.stockUnit)}</p>
                          </div>
                          <div className="text-center p-2 bg-primary/5 rounded-lg">
                            <p className="text-muted-foreground text-xs">Orders</p>
                            <p className="font-semibold">{stock.totalOrders}</p>
                          </div>
                        </div>
                        <Separator className="my-2" />
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Used in menu items:</p>
                          <div className="flex flex-wrap gap-1">
                            {stock.menuItems.slice(0, 3).map((item, idx) => (
                              <span key={idx} className="text-xs bg-secondary px-2 py-0.5 rounded">
                                {item.itemName}
                              </span>
                            ))}
                            {stock.menuItems.length === 0 && (
                              <span className="text-xs text-muted-foreground">No menu items</span>
                            )}
                            {stock.menuItems.length > 3 && (
                              <span className="text-xs text-muted-foreground">+{stock.menuItems.length - 3}</span>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  (currentData as MenuItemUsageView[]).map((item, idx) => (
                    <Card key={item.itemId} className="hover:shadow-lg transition-shadow cursor-pointer relative overflow-hidden" onClick={() => {
                      setSelectedMenuItem(item)
                      setShowMenuItemDialog(true)
                    }}>
                      <div 
                        className="absolute top-0 left-0 h-full"
                        style={{ 
                          backgroundColor: FREQUENCY_COLORS[Math.min(idx, FREQUENCY_COLORS.length - 1)],
                          width: '4px'
                        }}
                      />
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="font-mono">
                              #{idx + 1}
                            </Badge>
                            <CardTitle className="text-lg">{item.itemName}</CardTitle>
                          </div>
                          {item.stocksUsed.length === 0 && (
                            <Badge variant="outline" className="text-yellow-600 border-yellow-500 text-xs">
                              No Stock
                            </Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-2 text-sm mb-2">
                          <div className="text-center p-2 bg-primary/5 rounded-lg">
                            <p className="text-muted-foreground text-xs">Frequency</p>
                            <p className="font-bold text-lg">{item.frequency}×</p>
                          </div>
                          <div className="text-center p-2 bg-primary/5 rounded-lg">
                            <p className="text-muted-foreground text-xs">Revenue</p>
                            <p className="font-semibold text-green-600">{formatCurrency(item.totalRevenue)}</p>
                          </div>
                          <div className="text-center p-2 bg-primary/5 rounded-lg">
                            <p className="text-muted-foreground text-xs">Quantity Sold</p>
                            <p className="font-semibold">{item.totalQuantity}</p>
                          </div>
                          <div className="text-center p-2 bg-primary/5 rounded-lg">
                            <p className="text-muted-foreground text-xs">Ingredients</p>
                            <p className="font-semibold">{item.stocksUsed.length}</p>
                          </div>
                        </div>
                        <Separator className="my-2" />
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Top ingredients:</p>
                          <div className="flex flex-wrap gap-1">
                            {item.stocksUsed.slice(0, 3).map((stock, idx) => (
                              <span key={idx} className="text-xs bg-secondary px-2 py-0.5 rounded">
                                {stock.stockName}
                              </span>
                            ))}
                            {item.stocksUsed.length === 0 && (
                              <span className="text-xs text-muted-foreground">No stock data recorded</span>
                            )}
                            {item.stocksUsed.length > 3 && (
                              <span className="text-xs text-muted-foreground">+{item.stocksUsed.length - 3}</span>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            )}

            {/* Pagination */}
            {allData.length > 0 && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  Showing {Math.min((currentPage - 1) * itemsPerPage + 1, allData.length)} to{' '}
                  {Math.min(currentPage * itemsPerPage, allData.length)} of {allData.length}
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
                  <span className="text-sm">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Stock Detail Dialog */}
      <Dialog open={showStockDialog} onOpenChange={setShowStockDialog}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh]">
          {selectedStock && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl flex items-center gap-2">
                  <Package className="h-6 w-6 text-primary" />
                  {selectedStock.stockName}
                </DialogTitle>
                <DialogDescription>
                  Usage frequency: {selectedStock.frequency} times | Last used: {formatDate(selectedStock.lastUsed)}
                </DialogDescription>
              </DialogHeader>
              <ScrollArea className="max-h-[70vh] pr-4">
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-sm text-muted-foreground">Frequency</p>
                      <p className="text-3xl font-bold">{selectedStock.frequency}×</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-sm text-muted-foreground">Total Used</p>
                      <p className="text-2xl font-bold">{formatQuantity(selectedStock.totalQuantityUsed, selectedStock.stockUnit)}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-sm text-muted-foreground">Current Stock</p>
                      <p className="text-2xl font-bold">{formatQuantity(selectedStock.currentStock, selectedStock.stockUnit)}</p>
                      <Badge className={STATUS_COLORS[selectedStock.stockStatus]}>{selectedStock.stockStatus}</Badge>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-sm text-muted-foreground">Total Cost</p>
                      <p className="text-2xl font-bold">{formatCurrency(selectedStock.totalCost)}</p>
                    </CardContent>
                  </Card>
                </div>

                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Utensils className="h-4 w-4" />
                    Menu Items Using This Stock ({selectedStock.menuItems.length})
                  </h4>
                  <div className="space-y-2">
                    {selectedStock.menuItems.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-secondary/10 rounded-lg">
                        <div>
                          <span className="font-medium">{item.itemName}</span>
                          <p className="text-xs text-muted-foreground mt-1">
                            Used in {item.servingsCount} servings
                          </p>
                        </div>
                        <Badge variant="secondary">
                          {formatQuantity(item.quantityUsed, selectedStock.stockUnit)}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </ScrollArea>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Menu Item Detail Dialog */}
      <Dialog open={showMenuItemDialog} onOpenChange={setShowMenuItemDialog}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh]">
          {selectedMenuItem && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl flex items-center gap-2">
                  <Utensils className="h-6 w-6 text-primary" />
                  {selectedMenuItem.itemName}
                </DialogTitle>
                <DialogDescription>
                  Ordered {selectedMenuItem.frequency} times | Revenue: {formatCurrency(selectedMenuItem.totalRevenue)}
                  {selectedMenuItem.stocksUsed.length === 0 && (
                    <Badge variant="outline" className="ml-2 text-yellow-600">No stock tracking data</Badge>
                  )}
                </DialogDescription>
              </DialogHeader>
              <ScrollArea className="max-h-[70vh] pr-4">
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <Card>
                    <CardContent className="pt-4 text-center">
                      <p className="text-sm text-muted-foreground">Frequency</p>
                      <p className="text-3xl font-bold">{selectedMenuItem.frequency}×</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4 text-center">
                      <p className="text-sm text-muted-foreground">Total Orders</p>
                      <p className="text-2xl font-bold">{selectedMenuItem.totalOrders}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4 text-center">
                      <p className="text-sm text-muted-foreground">Quantity Sold</p>
                      <p className="text-2xl font-bold">{selectedMenuItem.totalQuantity}</p>
                    </CardContent>
                  </Card>
                </div>

                {selectedMenuItem.stocksUsed.length > 0 ? (
                  <>
                    <div>
                      <h4 className="font-semibold mb-3">Ingredients Used ({selectedMenuItem.stocksUsed.length})</h4>
                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Ingredient</TableHead>
                              <TableHead>Category</TableHead>
                              <TableHead>Quantity Used</TableHead>
                              <TableHead>Total Cost</TableHead>
                              <TableHead>% of Item</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {selectedMenuItem.stocksUsed.map((stock, idx) => (
                              <TableRow key={idx}>
                                <TableCell className="font-medium">{stock.stockName}</TableCell>
                                <TableCell>{stock.stockCategory}</TableCell>
                                <TableCell>{formatQuantity(stock.quantityUsed, stock.stockUnit)}</TableCell>
                                <TableCell>{formatCurrency(stock.totalCost)}</TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <Progress value={stock.percentageOfItem} className="w-16 h-2" />
                                    <span className="text-xs">{stock.percentageOfItem.toFixed(1)}%</span>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>

                    {selectedMenuItem.stocksUsed.length > 0 && (
                      <div className="mt-6">
                        <h4 className="font-semibold mb-3">Ingredient Usage Distribution</h4>
                        <ResponsiveContainer width="100%" height={250}>
                          <PieChart>
                            <Pie
                              data={selectedMenuItem.stocksUsed}
                              dataKey="quantityUsed"
                              nameKey="stockName"
                              cx="50%"
                              cy="50%"
                              outerRadius={80}
                              label
                            >
                              {selectedMenuItem.stocksUsed.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={FREQUENCY_COLORS[index % FREQUENCY_COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value) => formatQuantity(value)} />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </>
                ) : (
                  <Card className="bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200">
                    <CardContent className="pt-6 text-center">
                      <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-3" />
                      <p className="text-yellow-800 dark:text-yellow-300 font-medium">
                        No stock consumption data available for this menu item
                      </p>
                      <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-2">
                        This menu item has been ordered {selectedMenuItem.frequency} times, generating{' '}
                        {formatCurrency(selectedMenuItem.totalRevenue)} in revenue, but no inventory usage has been recorded.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </ScrollArea>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}