"use client"

// ============================================
// 1. IMPORTS
// ============================================

import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  BarChart,
  DollarSign,
  ShoppingCart,
  Eye,
  Home,
  Truck,
  Building2,
  Package2,
  Utensils,
  TrendingUp,
  Users,
  RefreshCw,
  Loader2,
  Phone,
  MapPin,
  ArrowUpRight,
  ArrowDownRight,
  LayoutDashboard,
  Store,
  ChevronDown,
  X,
  CalendarDays,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, BarChart as ReBarChart, Bar, Cell, CartesianGrid } from "recharts"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Label } from "@/components/ui/label"
import { format, subDays, subMonths, differenceInDays, startOfDay, endOfDay } from "date-fns"

// ============================================
// 2. TYPES
// ============================================

type OrderItem = {
  itemId: string
  menuItemId?: string
  quantity: number
  unitPrice: number
  price?: number
  subtotal: number
  status: string
  name?: string
  itemName?: string
  specialInstructions?: string
}

type Order = {
  _id: string
  orderNumber: string
  tableNumber: string
  waiterId: string
  waiterName?: string
  numberOfGuests: number
  items: OrderItem[]
  orderItems?: OrderItem[]
  totalAmount: number
  discount: number
  tax: number
  finalAmount: number
  status: string
  paymentMethod: string
  specialRequirements: string
  notes?: string
  createdAt: string
  updatedAt: string
  delivery?: boolean
  inTable?: boolean
  restaurantId?: string
  restaurantName?: string
  enrichedRestaurantId?: string
  enrichedRestaurantName?: string
  deliveryInfo?: {
    fullName: string
    phoneNumber: string
    address: string
    city: string
  }
  paymentScreenshotUrl?: string
  customerName?: string
  branch?: string
  location?: string
}

type Waitress = {
  _id: string
  name: string
  phone: string
  shift: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  email?: string
  restaurantId?: string
  restaurantName?: string
  branch?: string
}

type Restaurant = {
  _id: string
  name: string
  shortName: string
  isActive: boolean
  branchCode?: string
  color?: string
}

type MenuItem = {
  _id: string
  name: string
  description: string
  categoryId: string
  price: number
  imageUrl: string
  preparationTime: number
  isActive: boolean
  isFeatured: boolean
}

type WaiterReportResponse = {
  success: boolean
  orders: Order[]
  summary: {
    totalOrders: number
    totalSales: number
    totalTax: number
    totalDiscount: number
    totalItems: number
    totalGuests: number
    averageOrderValue: number
  }
  breakdown: {
    byStatus: Record<string, { count: number; total: number }>
    byPayment: Record<string, { count: number; total: number }>
  }
  topItems: Array<{
    id: string
    name: string
    quantity: number
    revenue: number
  }>
  dailySales: Array<{
    date: string
    total: number
    orders: number
    averageOrderValue: number
  }>
}

type ComparisonData = {
  current: number
  previous: number
  percentage: number
  isPositive: boolean
}

type ChartDataPoint = {
  name: string
  sales: number
  orders: number
  previousSales?: number
  percentage?: number
}

type DateFilterType = 'today' | 'yesterday' | 'last7days' | 'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth' | 'custom'
type AnalyticsView = 'sales' | 'restaurants' | 'waiters' | 'orderTypes'

interface RankingItem {
  id: string
  name: string
  value: number
  previousValue?: number
  percentage?: number
  rank?: number
  icon?: React.ReactNode
  color?: string
  orders?: number
}

// ============================================
// 3. CONSTANTS
// ============================================

const ORDER_TYPES = [
  { id: "dinein", name: "Dine In", icon: Home, color: "#10b981" },
  { id: "delivery", name: "Delivery", icon: Truck, color: "#3b82f6" },
  { id: "POS", name: "POS", icon: Package2, color: "#f59e0b" },
  { id: "online", name: "Online", icon: ShoppingCart, color: "#8b5cf6" },
]

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  CONFIRMED: "bg-blue-100 text-blue-800",
  PREPARING: "bg-purple-100 text-purple-800",
  PICKUP: "bg-indigo-100 text-indigo-800",
  SERVED: "bg-green-100 text-green-800",
  COMPLETED: "bg-teal-100 text-teal-800",
  CANCELLED: "bg-red-100 text-red-800",
}

const CHART_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"]

const menuItemsCache = new Map<string, { data: Map<string, MenuItem>; timestamp: number }>()
const CACHE_DURATION = 5 * 60 * 1000
const BATCH_SIZE_LIMIT = 100

// ============================================
// 4. API FUNCTIONS - FIXED
// ============================================

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-ET', { style: 'currency', currency: 'ETB' }).format(amount || 0)
}

const calculatePercentageChange = (current: number, previous: number): number => {
  if (previous === 0) return current > 0 ? 100 : 0
  return ((current - previous) / previous) * 100
}

const getDateRangeForFilter = (filterType: DateFilterType): { start: Date; end: Date } => {
  const now = new Date()
  const start = new Date()
  const end = new Date()

  switch (filterType) {
    case 'today':
      start.setHours(0, 0, 0, 0)
      end.setHours(23, 59, 59, 999)
      break
    case 'yesterday':
      start.setDate(now.getDate() - 1)
      start.setHours(0, 0, 0, 0)
      end.setDate(now.getDate() - 1)
      end.setHours(23, 59, 59, 999)
      break
    case 'last7days':
      start.setDate(now.getDate() - 7)
      start.setHours(0, 0, 0, 0)
      end.setHours(23, 59, 59, 999)
      break
    case 'thisWeek':
      const day = now.getDay() || 7
      start.setDate(now.getDate() - day + 1)
      start.setHours(0, 0, 0, 0)
      end.setDate(start.getDate() + 6)
      end.setHours(23, 59, 59, 999)
      break
    case 'lastWeek':
      const lastWeekDay = now.getDay() || 7
      start.setDate(now.getDate() - lastWeekDay - 6)
      start.setHours(0, 0, 0, 0)
      end.setDate(start.getDate() + 6)
      end.setHours(23, 59, 59, 999)
      break
    case 'thisMonth':
      start.setDate(1)
      start.setHours(0, 0, 0, 0)
      end.setMonth(now.getMonth() + 1, 0)
      end.setHours(23, 59, 59, 999)
      break
    case 'lastMonth':
      start.setMonth(now.getMonth() - 1, 1)
      start.setHours(0, 0, 0, 0)
      end.setMonth(now.getMonth(), 0)
      end.setHours(23, 59, 59, 999)
      break
    default:
      start.setHours(0, 0, 0, 0)
      end.setHours(23, 59, 59, 999)
  }
  return { start, end }
}

const getPreviousPeriodRange = (filterType: DateFilterType, currentStart: Date, currentEnd: Date): { start: Date; end: Date } => {
  const diff = differenceInDays(currentEnd, currentStart) + 1

  switch (filterType) {
    case 'today':
      return { start: subDays(currentStart, 1), end: subDays(currentEnd, 1) }
    case 'yesterday':
      return { start: subDays(currentStart, 1), end: subDays(currentEnd, 1) }
    case 'last7days':
      return { start: subDays(currentStart, 7), end: subDays(currentEnd, 7) }
    case 'thisWeek':
      return { start: subDays(currentStart, 7), end: subDays(currentEnd, 7) }
    case 'lastWeek':
      return { start: subDays(currentStart, 7), end: subDays(currentEnd, 7) }
    case 'thisMonth':
      return { start: subMonths(currentStart, 1), end: subMonths(currentEnd, 1) }
    case 'lastMonth':
      return { start: subMonths(currentStart, 1), end: subMonths(currentEnd, 1) }
    default:
      return { start: subDays(currentStart, diff), end: subDays(currentEnd, diff) }
  }
}

// ✅ FIXED: Fetch restaurants
const fetchRestaurantsFromAPI = async (): Promise<Restaurant[]> => {
  try {
    const response = await fetch('/api/restaurants')
    if (!response.ok) return []
    const data = await response.json()
    
    let restaurants = []
    if (data.success && data.data) {
      restaurants = data.data
    } else if (data.data && Array.isArray(data.data)) {
      restaurants = data.data
    } else if (Array.isArray(data)) {
      restaurants = data
    }
    
    return restaurants
      .filter((r: any) => r.isActive !== false)
      .map((r: any) => ({
        _id: r._id,
        name: r.name,
        shortName: r.shortName || r.name?.substring(0, 15) || 'Restaurant',
        isActive: r.isActive,
        branchCode: r.branchCode,
        color: r.color || '#8B5CF6'
      }))
  } catch (error) {
    console.error("Error fetching restaurants:", error)
    return []
  }
}

// ✅ FIXED: Fetch waitresses
const fetchWaitressesWithRestaurants = async (): Promise<Waitress[]> => {
  try {
    const response = await fetch("/api/waitress")
    if (!response.ok) return []
    const data = await response.json()
    
    if (data.success && data.data) {
      return data.data
    }
    if (Array.isArray(data)) {
      return data
    }
    return []
  } catch (error) {
    console.error("Error fetching waitresses:", error)
    return []
  }
}

// ✅ FIXED: Fetch single waitress
const fetchWaitress = async (id: string): Promise<Waitress | null> => {
  try {
    const response = await fetch(`/api/waitress/${id}`)
    if (!response.ok) return null
    const data = await response.json()
    return data.success && data.data ? data.data : null
  } catch (error) {
    console.error("Error fetching waitress:", error)
    return null
  }
}

// ✅ FIXED: Fetch items batch
const fetchItemsBatch = async (itemIds: string[]): Promise<Map<string, MenuItem>> => {
  if (itemIds.length === 0) return new Map()
  
  const uniqueIds = [...new Set(itemIds)]
  const limitedIds = uniqueIds.slice(0, BATCH_SIZE_LIMIT)
  const cacheKey = limitedIds.sort().join(',')
  const cached = menuItemsCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) return cached.data
  
  try {
    const response = await fetch(`/api/items?ids=${limitedIds.join(',')}`)
    if (!response.ok) return new Map()
    const data = await response.json()
    
    const itemsMap = new Map<string, MenuItem>()
    let items: any[] = []
    
    if (data.success && data.items) {
      items = data.items
    } else if (data.success && data.data) {
      items = data.data
    } else if (data.items && Array.isArray(data.items)) {
      items = data.items
    } else if (data.data && Array.isArray(data.data)) {
      items = data.data
    } else if (Array.isArray(data)) {
      items = data
    }
    
    items.forEach((item: any) => {
      if (item?._id) {
        itemsMap.set(item._id, {
          ...item,
          name: item.name || item.itemName || 'Unknown Item',
          price: item.price || item.unitPrice || 0,
        })
      }
    })
    
    menuItemsCache.set(cacheKey, { data: itemsMap, timestamp: Date.now() })
    return itemsMap
  } catch (error) {
    console.error("Error fetching items batch:", error)
    return new Map()
  }
}

// ✅ FIXED: Fetch waiter report
const fetchWaiterReport = async (
  waiterId?: string, 
  startDate?: string, 
  endDate?: string, 
  restaurantId?: string, 
  limit?: number
): Promise<WaiterReportResponse> => {
  const params = new URLSearchParams()
  if (startDate) params.append('startDate', startDate)
  if (endDate) params.append('endDate', endDate)
  if (waiterId && waiterId !== 'all') params.append('waiterId', waiterId)
  if (restaurantId && restaurantId !== 'all' && restaurantId !== 'unassigned') params.append('restaurantId', restaurantId)
  params.append('limit', limit?.toString() || '10000')
  
  try {
    const response = await fetch(`/api/order/waiterreport?${params.toString()}`)
    if (!response.ok) throw new Error(`API Error: ${response.status}`)
    return await response.json()
  } catch (error) {
    console.error("Error fetching waiter report:", error)
    return { 
      success: false, 
      orders: [],
      summary: { totalOrders: 0, totalSales: 0, totalTax: 0, totalDiscount: 0, totalItems: 0, totalGuests: 0, averageOrderValue: 0 },
      breakdown: { byStatus: {}, byPayment: {} },
      topItems: [],
      dailySales: []
    }
  }
}

// ✅ FIXED: Get order restaurant ID
const getOrderRestaurantId = (
  order: Order, 
  waitersList: Waitress[], 
  restaurantsList: Restaurant[]
): string => {
  if (order.enrichedRestaurantId) {
    const exists = restaurantsList.some(r => r._id === order.enrichedRestaurantId)
    if (exists) return order.enrichedRestaurantId
  }
  
  if (order.restaurantId) {
    const exists = restaurantsList.some(r => r._id === order.restaurantId)
    if (exists) return order.restaurantId
  }
  
  const rName = (order.restaurantName || "").toLowerCase()
  if (rName) {
    const match = restaurantsList.find(r => {
      const rNameLower = r.name.toLowerCase()
      return rNameLower === rName || rNameLower.includes(rName) || rName.includes(rNameLower)
    })
    if (match) return match._id
  }
  
  if (order.waiterId) {
    const waiter = waitersList.find(w => w._id === order.waiterId)
    if (waiter?.restaurantId) {
      const exists = restaurantsList.some(r => r._id === waiter.restaurantId)
      if (exists) return waiter.restaurantId
    }
  }
  
  if (rName) {
    if (rName.includes("1") || rName.includes("gibi 1")) {
      const match = restaurantsList.find(r => r._id === "manyazewal1" || r.name.includes("1"))
      if (match) return match._id
    }
    if (rName.includes("2") || rName.includes("gibi 2")) {
      const match = restaurantsList.find(r => r._id === "manyazewal2" || r.name.includes("2"))
      if (match) return match._id
    }
    if (rName.includes("3") || rName.includes("gibi 3")) {
      const match = restaurantsList.find(r => r._id === "manyazewal3" || r.name.includes("3"))
      if (match) return match._id
    }
  }
  
  return "unassigned"
}

// ✅ FIXED: Get restaurant display name
const getRestaurantDisplayName = (
  order: Order, 
  waitersList: Waitress[], 
  restaurantsList: Restaurant[]
): string => {
  if (order.enrichedRestaurantName) {
    return order.enrichedRestaurantName
  }
  
  const restaurantId = getOrderRestaurantId(order, waitersList, restaurantsList)
  const restaurant = restaurantsList.find(r => r._id === restaurantId)
  if (restaurant) return restaurant.name || restaurant.shortName || 'Restaurant'
  return order.restaurantName || "Unassigned"
}

// ✅ FIXED: Filter orders by restaurant
const filterOrdersByRestaurant = (
  orders: Order[], 
  restaurantId: string, 
  waitersList: Waitress[], 
  restaurantsList: Restaurant[]
): Order[] => {
  if (restaurantId === 'all') return orders
  if (restaurantId === 'unassigned') {
    return orders.filter(order => {
      const orderRestaurantId = getOrderRestaurantId(order, waitersList, restaurantsList)
      return orderRestaurantId === 'unassigned'
    })
  }
  return orders.filter(order => {
    const orderRestaurantId = getOrderRestaurantId(order, waitersList, restaurantsList)
    return orderRestaurantId === restaurantId
  })
}

// ============================================
// 5. COMPONENTS - MOBILE OPTIMIZED
// ============================================

// 5a. Metrics Overview - Mobile First
function MetricsOverview({ 
  totalSales, 
  totalOrders, 
  averageOrderValue, 
  salesComparison, 
  ordersComparison, 
  aovComparison, 
  isLoading 
}: {
  totalSales: number
  totalOrders: number
  averageOrderValue: number
  salesComparison: ComparisonData
  ordersComparison: ComparisonData
  aovComparison: ComparisonData
  isLoading?: boolean
}) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="overflow-hidden">
            <CardContent className="p-3 md:p-6">
              <Skeleton className="h-3 md:h-4 w-16 md:w-24 mb-1 md:mb-2" />
              <Skeleton className="h-6 md:h-8 w-20 md:w-32 mb-1 md:mb-2" />
              <Skeleton className="h-2 md:h-3 w-12 md:w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const renderComparison = (comparison: ComparisonData) => {
    const Icon = comparison.isPositive ? ArrowUpRight : ArrowDownRight
    const colorClass = comparison.isPositive ? "text-green-600" : "text-red-600"
    const bgClass = comparison.isPositive ? "bg-green-50" : "bg-red-50"
    
    return (
      <div className={`flex items-center gap-0.5 md:gap-1 ${bgClass} px-1.5 md:px-2 py-0.5 md:py-1 rounded-full`}>
        <Icon className={`h-2 w-2 md:h-3 md:w-3 ${colorClass}`} />
        <span className={`text-[10px] md:text-xs font-medium ${colorClass}`}>
          {Math.abs(comparison.percentage).toFixed(1)}%
        </span>
      </div>
    )
  }

  const metrics = [
    {
      title: "Total Sales",
      value: formatCurrency(totalSales),
      comparison: salesComparison,
      icon: DollarSign,
    },
    {
      title: "Total Orders",
      value: totalOrders.toString(),
      comparison: ordersComparison,
      icon: ShoppingCart,
    },
    {
      title: "Avg Order Value",
      value: formatCurrency(averageOrderValue),
      comparison: aovComparison,
      icon: TrendingUp,
    },
    {
      title: "Growth Rate",
      value: `${salesComparison.isPositive ? '+' : ''}${salesComparison.percentage.toFixed(1)}%`,
      comparison: salesComparison,
      icon: TrendingUp,
      valueColor: salesComparison.isPositive ? "text-green-600" : "text-red-600"
    }
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
      {metrics.map((metric, index) => {
        const Icon = metric.icon
        return (
          <Card key={index} className="overflow-hidden transition-all hover:shadow-lg">
            <CardContent className="p-3 md:p-6">
              <div className="flex items-center justify-between">
                <p className="text-[10px] md:text-sm font-medium text-muted-foreground truncate">{metric.title}</p>
                <Icon className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground flex-shrink-0" />
              </div>
              <div className="mt-1 md:mt-2 flex items-baseline gap-1 md:gap-2 flex-wrap">
                <h3 className={`text-sm md:text-2xl font-bold ${metric.valueColor || ''} truncate`}>
                  {metric.value}
                </h3>
                {metric.comparison && renderComparison(metric.comparison)}
              </div>
              <p className="text-[8px] md:text-xs text-muted-foreground mt-0.5 md:mt-2">vs previous period</p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

// 5b. Analytics Filter Cards - Mobile First
function AnalyticsFilterCards({ activeView, onViewChange, counts }: {
  activeView: AnalyticsView
  onViewChange: (view: AnalyticsView) => void
  counts?: {
    sales: number
    restaurants: number
    waiters: number
    orderTypes: number
  }
}) {
  const filters = [
    { id: 'sales' as AnalyticsView, label: 'Sales', icon: LayoutDashboard, color: 'blue', count: counts?.sales },
    { id: 'restaurants' as AnalyticsView, label: 'Restaurants', icon: Store, color: 'green', count: counts?.restaurants },
    { id: 'waiters' as AnalyticsView, label: 'Waiters', icon: Users, color: 'purple', count: counts?.waiters },
    { id: 'orderTypes' as AnalyticsView, label: 'Types', icon: ShoppingCart, color: 'orange', count: counts?.orderTypes },
  ]

  const colorClasses = {
    blue: { active: "bg-blue-50 border-blue-500 text-blue-700", inactive: "hover:bg-gray-50", icon: "text-blue-500" },
    green: { active: "bg-green-50 border-green-500 text-green-700", inactive: "hover:bg-gray-50", icon: "text-green-500" },
    purple: { active: "bg-purple-50 border-purple-500 text-purple-700", inactive: "hover:bg-gray-50", icon: "text-purple-500" },
    orange: { active: "bg-orange-50 border-orange-500 text-orange-700", inactive: "hover:bg-gray-50", icon: "text-orange-500" },
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
      {filters.map((filter) => {
        const Icon = filter.icon
        const isActive = activeView === filter.id
        const colors = colorClasses[filter.color as keyof typeof colorClasses]
        
        return (
          <button
            key={filter.id}
            onClick={() => onViewChange(filter.id)}
            className={`
              flex items-center justify-between p-2 md:p-4 rounded-xl border-2 transition-all duration-200
              ${isActive ? colors.active : `bg-white border-gray-200 ${colors.inactive}`}
            `}
          >
            <div className="flex items-center gap-1.5 md:gap-3">
              <div className={`p-1.5 md:p-2 rounded-lg ${isActive ? 'bg-white/50' : 'bg-gray-50'}`}>
                <Icon className={`h-4 w-4 md:h-5 md:w-5 ${isActive ? colors.icon : 'text-gray-400'}`} />
              </div>
              <span className={`text-xs md:text-sm font-medium ${isActive ? 'text-gray-900' : 'text-gray-600'}`}>
                {filter.label}
              </span>
            </div>
            {filter.count !== undefined && filter.count > 0 && (
              <Badge variant={isActive ? "default" : "secondary"} className="rounded-full text-[10px] md:text-xs">
                {filter.count}
              </Badge>
            )}
          </button>
        )
      })}
    </div>
  )
}

// 5c. SalesBarChart - Mobile First
function SalesBarChart({ 
  data, 
  title, 
  description, 
  showComparison = false, 
  height = 300,
  isLoading 
}: {
  data: ChartDataPoint[]
  title: string
  description?: string
  showComparison?: boolean
  height?: number
  isLoading?: boolean
}) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="p-3 md:p-6">
          <Skeleton className="h-5 md:h-6 w-32 md:w-48 mb-1 md:mb-2" />
          <Skeleton className="h-3 md:h-4 w-40 md:w-64" />
        </CardHeader>
        <CardContent className="p-3 md:p-6">
          <Skeleton className="h-[200px] md:h-[350px] w-full" />
        </CardContent>
      </Card>
    )
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader className="p-3 md:p-6">
          <CardTitle className="text-base md:text-xl">{title}</CardTitle>
          {description && <p className="text-xs md:text-sm text-muted-foreground">{description}</p>}
        </CardHeader>
        <CardContent className="h-[200px] md:h-[350px] flex items-center justify-center">
          <div className="text-center">
            <BarChart className="h-8 w-8 md:h-12 md:w-12 text-muted-foreground mx-auto mb-2 md:mb-3" />
            <p className="text-xs md:text-sm text-muted-foreground">No data available for this period</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-2 md:p-3 rounded-lg shadow-lg border border-gray-200 text-xs md:text-sm">
          <p className="font-semibold text-xs md:text-sm mb-1 md:mb-2">{label}</p>
          {payload.map((p: any, idx: number) => (
            <p key={idx} className="text-xs md:text-sm" style={{ color: p.color }}>
              {p.name}: {formatCurrency(p.value)}
            </p>
          ))}
          {showComparison && payload[0]?.payload?.percentage && (
            <p className="text-[10px] md:text-xs text-muted-foreground mt-1 pt-1 border-t">
              Change: {payload[0].payload.percentage > 0 ? '+' : ''}{payload[0].payload.percentage.toFixed(1)}%
            </p>
          )}
        </div>
      )
    }
    return null
  }

  // Mobile responsive height
  const chartHeight = typeof window !== 'undefined' && window.innerWidth < 768 ? Math.min(height, 250) : height

  return (
    <Card className="overflow-hidden">
      <CardHeader className="p-3 md:p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base md:text-xl font-semibold">{title}</CardTitle>
            {description && <p className="text-xs md:text-sm text-muted-foreground mt-0.5 md:mt-1">{description}</p>}
          </div>
          {showComparison && data[0]?.percentage !== undefined && (
            <div className={`flex items-center gap-1 px-2 py-1 rounded-full self-start md:self-auto ${data[0].percentage >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
              {data[0].percentage >= 0 ? (
                <ArrowUpRight className="h-3 w-3 text-green-600" />
              ) : (
                <ArrowDownRight className="h-3 w-3 text-red-600" />
              )}
              <span className={`text-[10px] md:text-xs font-medium ${data[0].percentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {Math.abs(data[0].percentage).toFixed(1)}% vs previous
              </span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-2 md:p-6">
        <ResponsiveContainer width="100%" height={chartHeight}>
          <ReBarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis 
              dataKey="name" 
              stroke="#888888" 
              fontSize={10} 
              tickLine={false} 
              axisLine={false}
              angle={-45}
              textAnchor="end"
              height={50}
              interval={0}
              tick={{ fontSize: 8 }}
            />
            <YAxis
              stroke="#888888"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => formatCurrency(value)}
              width={50}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: '10px' }} />
            <Bar 
              dataKey="sales" 
              name="Sales" 
              fill="#3b82f6" 
              radius={[4, 4, 0, 0]}
              animationDuration={500}
              animationBegin={0}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
              ))}
            </Bar>
            {showComparison && (
              <Bar 
                dataKey="previousSales" 
                name="Previous" 
                fill="#94a3b8" 
                radius={[4, 4, 0, 0]}
                animationDuration={500}
                animationBegin={300}
              />
            )}
          </ReBarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

// 5d. RankingAndComparisonPanel - Mobile First
function RankingAndComparisonPanel({ 
  title, 
  items, 
  maxItems = 5, 
  showRanking = true,
  isLoading 
}: {
  title: string
  items: RankingItem[]
  maxItems?: number
  showRanking?: boolean
  isLoading?: boolean
}) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="p-3 md:p-6">
          <Skeleton className="h-5 md:h-6 w-28 md:w-40 mb-1 md:mb-2" />
          <Skeleton className="h-3 md:h-4 w-36 md:w-56" />
        </CardHeader>
        <CardContent className="p-3 md:p-6 space-y-3 md:space-y-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-12 md:h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    )
  }

  const displayItems = items.slice(0, maxItems)
  const maxValue = Math.max(...displayItems.map(i => i.value), 1)

  return (
    <Card>
      <CardHeader className="p-3 md:p-6">
        <CardTitle className="text-base md:text-xl font-semibold">{title}</CardTitle>
        <p className="text-xs md:text-sm text-muted-foreground">
          {showRanking ? "Ranked by sales performance" : "Performance comparison"}
        </p>
      </CardHeader>
      <CardContent className="p-3 md:p-6">
        <div className="space-y-3 md:space-y-4">
          {displayItems.map((item, index) => {
            const percentageOfMax = (item.value / maxValue) * 100
            const barColor = item.color || CHART_COLORS[index % CHART_COLORS.length]
            
            return (
              <div key={item.id} className="group">
                <div className="flex items-center justify-between mb-0.5 md:mb-1">
                  <div className="flex items-center gap-1.5 md:gap-3 min-w-0 flex-1">
                    {showRanking && (
                      <div className={`
                        w-5 h-5 md:w-7 md:h-7 rounded-full flex items-center justify-center text-[8px] md:text-xs font-bold flex-shrink-0
                        ${index === 0 ? 'bg-yellow-100 text-yellow-700' : 
                          index === 1 ? 'bg-gray-100 text-gray-600' : 
                          index === 2 ? 'bg-orange-100 text-orange-700' : 
                          'bg-gray-50 text-gray-500'}
                      `}>
                        #{item.rank || index + 1}
                      </div>
                    )}
                    {item.icon && <span className="text-gray-500 flex-shrink-0">{item.icon}</span>}
                    <div className="min-w-0 flex-1">
                      <span className="font-medium text-xs md:text-sm truncate block">{item.name}</span>
                      {item.orders !== undefined && (
                        <p className="text-[8px] md:text-xs text-muted-foreground">{item.orders} orders</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-2">
                    <span className="font-semibold text-xs md:text-sm">
                      {formatCurrency(item.value)}
                    </span>
                  </div>
                </div>
                <div className="relative h-5 md:h-8 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="absolute left-0 top-0 h-full rounded-full transition-all duration-700 ease-out"
                    style={{ 
                      width: `${Math.max(percentageOfMax, 2)}%`, 
                      backgroundColor: barColor,
                      opacity: 0.85
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

// 5e. DashboardHeader - Mobile First with Fixed Date Filter
function DashboardHeader({
  currentRestaurantName,
  currentWaiterName,
  orderCount,
  selectedRestaurant,
  selectedWaiter,
  onRestaurantChange,
  onWaiterChange,
  waitresses,
  restaurants,
  onRefresh,
  isRefreshing,
  dateRangeLabel,
  dateFilterType,
  onDateFilterChange,
}: {
  currentRestaurantName: string
  currentWaiterName: string
  orderCount: number
  selectedRestaurant: string
  selectedWaiter: string
  onRestaurantChange: (value: string) => void
  onWaiterChange: (value: string) => void
  waitresses: Waitress[]
  restaurants: Restaurant[]
  onRefresh: () => void
  isRefreshing: boolean
  dateRangeLabel: string
  dateFilterType: DateFilterType
  onDateFilterChange: (filter: DateFilterType, customStart?: Date, customEnd?: Date) => void
}) {
  const [showCustomPicker, setShowCustomPicker] = useState(false)
  const [localStartDate, setLocalStartDate] = useState('')
  const [localEndDate, setLocalEndDate] = useState('')

  const dateFilters: { label: string; value: DateFilterType }[] = [
    { label: "Today", value: "today" },
    { label: "Yesterday", value: "yesterday" },
    { label: "7 Days", value: "last7days" },
    { label: "This Week", value: "thisWeek" },
    { label: "Last Week", value: "lastWeek" },
    { label: "This Month", value: "thisMonth" },
    { label: "Last Month", value: "lastMonth" },
    { label: "Custom", value: "custom" },
  ]

  const handleFilterClick = (filter: DateFilterType) => {
    if (filter === 'custom') {
      setShowCustomPicker(!showCustomPicker)
    } else {
      onDateFilterChange(filter)
      setShowCustomPicker(false)
    }
  }

  const handleApplyCustom = () => {
    if (localStartDate && localEndDate) {
      onDateFilterChange('custom', new Date(localStartDate), new Date(localEndDate))
      setShowCustomPicker(false)
    }
  }

  return (
    <div className="space-y-3 md:space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 md:gap-4">
        <div>
          <h1 className="text-xl md:text-3xl font-bold tracking-tight bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
            Sales Analytics
          </h1>
          <p className="text-[10px] md:text-sm text-muted-foreground mt-0.5 md:mt-1 truncate max-w-[280px] md:max-w-none">
            {currentRestaurantName} • {currentWaiterName} • {orderCount} orders • {dateRangeLabel}
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <Select value={selectedRestaurant} onValueChange={onRestaurantChange}>
            <SelectTrigger className="w-[140px] md:w-[200px] h-8 md:h-10 text-xs md:text-sm">
              <Store className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
              <SelectValue placeholder="Restaurant" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Restaurants</SelectItem>
              {restaurants.map((restaurant) => (
                <SelectItem key={restaurant._id} value={restaurant._id}>
                  {restaurant.name}
                </SelectItem>
              ))}
              <SelectItem value="unassigned">Unassigned Orders</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={selectedWaiter} onValueChange={onWaiterChange}>
            <SelectTrigger className="w-[130px] md:w-[180px] h-8 md:h-10 text-xs md:text-sm">
              <Users className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
              <SelectValue placeholder="Waiter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Waiters</SelectItem>
              {waitresses.map((waiter) => (
                <SelectItem key={waiter._id} value={waiter._id}>
                  {waiter.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button variant="outline" size="icon" onClick={onRefresh} disabled={isRefreshing} className="h-8 w-8 md:h-10 md:w-10">
            <RefreshCw className={`h-3 w-3 md:h-4 md:w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Date Filter Chips - Scrollable on mobile */}
      <div className="flex flex-wrap gap-1.5 md:gap-2">
        {dateFilters.map((filter) => (
          <button
            key={filter.value}
            onClick={() => handleFilterClick(filter.value)}
            className={`
              px-2.5 py-1 md:px-4 md:py-2 rounded-full text-[10px] md:text-sm font-medium transition-all duration-200 whitespace-nowrap
              ${dateFilterType === filter.value && filter.value !== 'custom'
                ? 'bg-blue-600 text-white shadow-md'
                : filter.value === 'custom' && showCustomPicker
                ? 'bg-gray-200 text-gray-900'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }
            `}
          >
            {filter.label}
            {filter.value === 'custom' && showCustomPicker && <ChevronDown className="inline ml-0.5 md:ml-1 h-2 w-2 md:h-3 md:w-3" />}
          </button>
        ))}
      </div>

      {/* Custom Date Picker */}
      {showCustomPicker && (
        <Card className="mt-1 md:mt-2 p-3 md:p-4">
          <div className="grid grid-cols-2 gap-2 md:gap-4">
            <div>
              <Label className="text-xs md:text-sm">Start Date</Label>
              <Input
                type="date"
                value={localStartDate}
                onChange={(e) => setLocalStartDate(e.target.value)}
                className="h-8 md:h-10 text-xs md:text-sm"
              />
            </div>
            <div>
              <Label className="text-xs md:text-sm">End Date</Label>
              <Input
                type="date"
                value={localEndDate}
                onChange={(e) => setLocalEndDate(e.target.value)}
                className="h-8 md:h-10 text-xs md:text-sm"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-2 md:mt-4">
            <Button variant="outline" size="sm" onClick={() => setShowCustomPicker(false)} className="text-xs md:text-sm">
              Cancel
            </Button>
            <Button size="sm" onClick={handleApplyCustom} className="text-xs md:text-sm">
              Apply
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
}

// ============================================
// 6. MAIN DASHBOARD COMPONENT
// ============================================

export default function DashboardPage() {
  // State
  const [waiterReportData, setWaiterReportData] = useState<WaiterReportResponse | null>(null)
  const [waitresses, setWaitresses] = useState<Waitress[]>([])
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [selectedWaiter, setSelectedWaiter] = useState<string>('all')
  const [selectedRestaurant, setSelectedRestaurant] = useState<string>('all')
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([])
  const [filteredOverviewOrders, setFilteredOverviewOrders] = useState<Order[]>([])
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date }>(() => {
    const range = getDateRangeForFilter('today')
    return range
  })
  const [filterType, setFilterType] = useState<DateFilterType>('today')
  const [activeAnalyticsView, setActiveAnalyticsView] = useState<AnalyticsView>('sales')
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [selectedWaitress, setSelectedWaitress] = useState<Waitress | null>(null)
  const [selectedItemsMap, setSelectedItemsMap] = useState<Map<string, MenuItem>>(new Map())
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [loadingOrderDetails, setLoadingOrderDetails] = useState(false)
  const [globalItemsMap, setGlobalItemsMap] = useState<Map<string, MenuItem>>(new Map())
  const [dailySalesData, setDailySalesData] = useState<ChartDataPoint[]>([])
  const [previousPeriodSalesData, setPreviousPeriodSalesData] = useState<ChartDataPoint[]>([])
  const [comparisons, setComparisons] = useState({
    sales: { current: 0, previous: 0, percentage: 0, isPositive: true },
    orders: { current: 0, previous: 0, percentage: 0, isPositive: true },
    aov: { current: 0, previous: 0, percentage: 0, isPositive: true },
  })

  const initialFetchDone = useRef(false)
  const abortControllerRef = useRef<AbortController | null>(null)
  const isMounted = useRef(true)

  // Cleanup
  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  // ============================================
  // 6a. DATA LOADING - FIXED
  // ============================================

  const loadData = useCallback(async (options: { showLoading?: boolean; customDateRange?: { start: Date; end: Date }; waiterId?: string; restaurantId?: string; } = {}) => {
    if (!isMounted.current) return
    
    if (options.showLoading !== false) setIsLoading(true)
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    abortControllerRef.current = new AbortController()

    try {
      const range = options.customDateRange || dateRange
      const startDateStr = format(range.start, "yyyy-MM-dd'T'HH:mm:ss")
      const endDateStr = format(range.end, "yyyy-MM-dd'T'HH:mm:ss")
      const currentWaiterId = options.waiterId ?? selectedWaiter;
      const currentRestaurantId = options.restaurantId ?? selectedRestaurant;
      const apiRestaurantId = currentRestaurantId === 'unassigned' ? 'all' : currentRestaurantId

      // Fetch data in parallel
      const [reportData, restaurantsData, waitressesData] = await Promise.all([
        fetchWaiterReport(currentWaiterId, startDateStr, endDateStr, apiRestaurantId),
        fetchRestaurantsFromAPI(),
        fetchWaitressesWithRestaurants(),
      ])

      if (!isMounted.current) return

      setRestaurants(restaurantsData);
      setWaitresses(waitressesData);

      // Fetch previous period data for comparison
      const previousRange = getPreviousPeriodRange(filterType, range.start, range.end)
      const previousStartStr = format(previousRange.start, "yyyy-MM-dd'T'HH:mm:ss")
      const previousEndStr = format(previousRange.end, "yyyy-MM-dd'T'HH:mm:ss")
      
      const previousReportData = await fetchWaiterReport(
        currentWaiterId, 
        previousStartStr, 
        previousEndStr, 
        apiRestaurantId
      )

      if (!isMounted.current) return

      if (reportData.success) {
        let ordersData = reportData.orders || []
        let previousOrdersData = previousReportData.success ? previousReportData.orders || [] : []

        // Apply restaurant filter
        ordersData = filterOrdersByRestaurant(ordersData, currentRestaurantId, waitressesData, restaurantsData)
        previousOrdersData = filterOrdersByRestaurant(previousOrdersData, currentRestaurantId, waitressesData, restaurantsData)

        // Collect all item IDs
        const allItemIds = new Set<string>()
        ordersData.forEach(order => {
          (order.items || []).forEach((item: OrderItem) => {
            const itemId = item.itemId || item.menuItemId
            if (itemId) allItemIds.add(itemId)
          })
        });

        const itemsMapData = await fetchItemsBatch(Array.from(allItemIds).filter(id => id))
        setGlobalItemsMap(itemsMapData)

        // Enhance orders
        const enhancedOrders = ordersData.map(order => {
          const enhancedItems = (order.items || []).map((item: OrderItem) => {
            const itemId = item.itemId || item.menuItemId
            const menuItem = itemId ? itemsMapData.get(itemId) : undefined
            return {
              ...item,
              name: item.itemName || item.name || menuItem?.name || 'Unknown Item',
              price: item.price || item.unitPrice || menuItem?.price || 0,
            }
          })

          const waiter = waitressesData.find(w => w._id === order.waiterId)
          return {
            ...order,
            items: enhancedItems,
            waiterName: order.waiterName || waiter?.name || 'Unknown',
            restaurantName: order.enrichedRestaurantName || order.restaurantName || 'Unknown',
            restaurantId: order.enrichedRestaurantId || order.restaurantId || 'unassigned',
          }
        })

        // Enhance previous orders
        const enhancedPreviousOrders = previousOrdersData.map(order => {
          const enhancedItems = (order.items || []).map((item: OrderItem) => {
            const itemId = item.itemId || item.menuItemId
            const menuItem = itemId ? itemsMapData.get(itemId) : undefined
            return {
              ...item,
              name: item.itemName || item.name || menuItem?.name || 'Unknown Item',
              price: item.price || item.unitPrice || menuItem?.price || 0,
            }
          })

          const waiter = waitressesData.find(w => w._id === order.waiterId)
          return {
            ...order,
            items: enhancedItems,
            waiterName: order.waiterName || waiter?.name || 'Unknown',
            restaurantName: order.enrichedRestaurantName || order.restaurantName || 'Unknown',
            restaurantId: order.enrichedRestaurantId || order.restaurantId || 'unassigned',
          }
        })

        setFilteredOrders(enhancedOrders)
        setFilteredOverviewOrders(enhancedOrders)

        // Generate daily sales data
        const dailySalesMap = new Map<string, { total: number; orders: number }>()
        enhancedOrders.forEach(order => {
          const date = new Date(order.createdAt).toLocaleDateString()
          const existing = dailySalesMap.get(date) || { total: 0, orders: 0 }
          dailySalesMap.set(date, {
            total: existing.total + (order.finalAmount || 0),
            orders: existing.orders + 1
          })
        })

        const dailySalesArray = Array.from(dailySalesMap.entries())
          .map(([date, data]) => ({ name: date, sales: data.total, orders: data.orders }))
          .sort((a, b) => new Date(a.name).getTime() - new Date(b.name).getTime())

        setDailySalesData(dailySalesArray)

        // Generate previous period daily sales
        const previousDailyMap = new Map<string, { total: number; orders: number }>()
        enhancedPreviousOrders.forEach(order => {
          const date = new Date(order.createdAt).toLocaleDateString()
          const existing = previousDailyMap.get(date) || { total: 0, orders: 0 }
          previousDailyMap.set(date, {
            total: existing.total + (order.finalAmount || 0),
            orders: existing.orders + 1
          })
        })

        const previousDailyArray = Array.from(previousDailyMap.entries())
          .map(([date, data]) => ({ name: date, sales: data.total, orders: data.orders }))
          .sort((a, b) => new Date(a.name).getTime() - new Date(b.name).getTime())

        setPreviousPeriodSalesData(previousDailyArray)

        // Calculate comparisons
        const currentSales = enhancedOrders.reduce((sum, o) => sum + (o.finalAmount || 0), 0)
        const previousSales = enhancedPreviousOrders.reduce((sum, o) => sum + (o.finalAmount || 0), 0)
        const currentOrderCount = enhancedOrders.length
        const previousOrderCount = enhancedPreviousOrders.length
        const currentAOV = currentOrderCount > 0 ? currentSales / currentOrderCount : 0
        const previousAOV = previousOrderCount > 0 ? previousSales / previousOrderCount : 0

        setComparisons({
          sales: {
            current: currentSales,
            previous: previousSales,
            percentage: calculatePercentageChange(currentSales, previousSales),
            isPositive: currentSales >= previousSales,
          },
          orders: {
            current: currentOrderCount,
            previous: previousOrderCount,
            percentage: calculatePercentageChange(currentOrderCount, previousOrderCount),
            isPositive: currentOrderCount >= previousOrderCount,
          },
          aov: {
            current: currentAOV,
            previous: previousAOV,
            percentage: calculatePercentageChange(currentAOV, previousAOV),
            isPositive: currentAOV >= previousAOV,
          },
        })
      }
    } catch (error: any) {
      if (error.name !== 'AbortError' && isMounted.current) {
        console.error('Error loading data:', error)
      }
    } finally {
      if (isMounted.current) {
        if (options.showLoading !== false) setIsLoading(false)
        abortControllerRef.current = null
      }
    }
  }, [dateRange, selectedRestaurant, selectedWaiter, filterType]);

  // Initial load
  useEffect(() => {
    if (!initialFetchDone.current) {
      initialFetchDone.current = true
      loadData()
    }
  }, [])

  // Fetch restaurants on mount
  useEffect(() => {
    const loadRestaurants = async () => {
      const restaurantData = await fetchRestaurantsFromAPI()
      if (isMounted.current) setRestaurants(restaurantData)
    }
    loadRestaurants()
  }, [])

  // Fetch waitresses
  useEffect(() => {
    const loadWaitresses = async () => {
      const data = await fetchWaitressesWithRestaurants()
      if (isMounted.current) setWaitresses(data)
    }
    loadWaitresses()
  }, [])

  // ============================================
  // 6b. MEMOIZED COMPUTATIONS
  // ============================================

  const overviewMetrics = useMemo(() => {
    const totalSales = filteredOverviewOrders.reduce((sum: number, order: Order) => sum + (order.finalAmount || 0), 0)
    const orderCount = filteredOverviewOrders.length
    const averageOrderValue = orderCount > 0 ? totalSales / orderCount : 0
    return { totalSales, orderCount, averageOrderValue }
  }, [filteredOverviewOrders])

  const restaurantRankingData = useMemo((): RankingItem[] => {
    const restaurantSales = new Map<string, { name: string; sales: number; orders: number }>()
    
    filteredOverviewOrders.forEach(order => {
      const restaurantId = getOrderRestaurantId(order, waitresses, restaurants);
      const restaurant = restaurants.find((r: Restaurant) => r._id === restaurantId);
      const restaurantName = restaurant?.name || order.restaurantName || 'Unassigned'
      const existing = restaurantSales.get(restaurantId) || { name: restaurantName, sales: 0, orders: 0 };
      restaurantSales.set(restaurantId, {
        name: restaurantName,
        sales: existing.sales + (order.finalAmount || 0),
        orders: existing.orders + 1
      })
    })
    
    return Array.from(restaurantSales.entries())
      .map(([id, data], index) => ({
        id,
        name: data.name,
        value: data.sales,
        rank: index + 1,
        orders: data.orders,
      }))
      .sort((a, b) => b.value - a.value)
  }, [filteredOverviewOrders, waitresses, restaurants])

  const waiterRankingData = useMemo((): RankingItem[] => {
    const waiterSales = new Map<string, { name: string; sales: number; orders: number }>()
    
    filteredOverviewOrders.forEach(order => {
      const waiterId = order.waiterId || 'unknown'
      const waiterName = order.waiterName || 'Unknown'
      const existing = waiterSales.get(waiterId) || { name: waiterName, sales: 0, orders: 0 }
      waiterSales.set(waiterId, {
        name: waiterName,
        sales: existing.sales + (order.finalAmount || 0),
        orders: existing.orders + 1
      })
    })
    
    return Array.from(waiterSales.entries())
      .map(([id, data], index) => ({
        id,
        name: data.name,
        value: data.sales,
        rank: index + 1,
        orders: data.orders,
      }))
      .sort((a, b) => b.value - a.value)
  }, [filteredOverviewOrders])

  const orderTypeRankingData = useMemo((): RankingItem[] => {
    const typeSales = new Map<string, { name: string; sales: number; orders: number; icon?: React.ReactNode }>()
    
    filteredOverviewOrders.forEach(order => {
      const orderType = order.inTable === true ? 'dinein' : (order.delivery === true ? 'delivery' : 'POS')
      const typeName = order.inTable === true ? 'Dine In' : (order.delivery === true ? 'Delivery' : 'POS')
      const typeConfig = ORDER_TYPES.find(t => t.id === orderType)
      
      const existing = typeSales.get(orderType) || { 
        name: typeName, 
        sales: 0, 
        orders: 0,
        icon: typeConfig ? <typeConfig.icon className="h-4 w-4" /> : null
      }
      typeSales.set(orderType, {
        name: typeName,
        sales: existing.sales + (order.finalAmount || 0),
        orders: existing.orders + 1,
        icon: existing.icon || (typeConfig ? <typeConfig.icon className="h-4 w-4" /> : null)
      })
    })
    
    return Array.from(typeSales.entries())
      .map(([id, data], index) => ({
        id,
        name: data.name,
        value: data.sales,
        rank: index + 1,
        orders: data.orders,
        icon: data.icon,
        color: ORDER_TYPES.find(t => t.id === id)?.color,
      }))
      .sort((a, b) => b.value - a.value)
  }, [filteredOverviewOrders])

  const chartDataWithComparison = useMemo((): ChartDataPoint[] => {
    if (!dailySalesData.length) return []
    
    return dailySalesData.map(day => {
      const previousDay = previousPeriodSalesData.find(p => p.name === day.name)
      return {
        ...day,
        previousSales: previousDay?.sales || 0,
        percentage: previousDay?.sales ? calculatePercentageChange(day.sales, previousDay.sales) : undefined,
      }
    })
  }, [dailySalesData, previousPeriodSalesData])

  // ============================================
  // 6c. HANDLERS - FIXED for instant response
  // ============================================

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadData({ showLoading: false });
    setIsRefreshing(false);
  }, [loadData])

  const handleDateFilterChange = useCallback(async (type: DateFilterType, customStart?: Date, customEnd?: Date) => {
    setFilterType(type);
    const range = type === 'custom' && customStart && customEnd 
      ? { start: customStart, end: customEnd } 
      : getDateRangeForFilter(type);
    setDateRange(range);
    await loadData({ customDateRange: range });
  }, [loadData])

  const handleRestaurantChange = useCallback(async (restaurantId: string) => {
    setSelectedRestaurant(restaurantId);
    setIsRefreshing(true);
    await loadData({ showLoading: false, restaurantId });
    setIsRefreshing(false);
  }, [loadData])

  const handleWaiterChange = useCallback(async (waiterId: string) => {
    setSelectedWaiter(waiterId);
    setIsRefreshing(true);
    await loadData({ showLoading: false, waiterId });
    setIsRefreshing(false);
  }, [loadData])

  const handleViewDetails = useCallback(async (order: Order) => {
    setSelectedOrder(order)
    setLoadingOrderDetails(true);
    try {
      const waitress = await fetchWaitress(order.waiterId)
      setSelectedWaitress(waitress)

      const items = order.items || []
      const itemIds = items.map((item) => item.itemId || item.menuItemId).filter(id => id)
      
      if (itemIds.length > 0) {
        const itemsMap = await fetchItemsBatch(itemIds as string[]);
        setSelectedItemsMap(itemsMap)
      }
    } catch (error) {
      console.error('Error fetching order details:', error)
    } finally {
      setLoadingOrderDetails(false);
    }
  }, [])

  // ============================================
  // 6d. RENDER HELPERS
  // ============================================

  const getCurrentViewChartData = useCallback((): ChartDataPoint[] => {
    switch (activeAnalyticsView) {
      case 'sales':
        return chartDataWithComparison
      case 'restaurants':
        return restaurantRankingData.map(r => ({ name: r.name, sales: r.value, orders: r.orders || 0 }))
      case 'waiters':
        return waiterRankingData.map(w => ({ name: w.name, sales: w.value, orders: w.orders || 0 }))
      case 'orderTypes':
        return orderTypeRankingData.map(o => ({ name: o.name, sales: o.value, orders: o.orders || 0 }))
      default:
        return chartDataWithComparison
    }
  }, [activeAnalyticsView, chartDataWithComparison, restaurantRankingData, waiterRankingData, orderTypeRankingData])

  const getCurrentViewTitle = useCallback((): string => {
    switch (activeAnalyticsView) {
      case 'sales': return 'Sales Performance Over Time'
      case 'restaurants': return 'Restaurant Sales Ranking'
      case 'waiters': return 'Waiter Performance Ranking'
      case 'orderTypes': return 'Order Type Distribution'
      default: return 'Sales Analytics'
    }
  }, [activeAnalyticsView])

  const getCurrentViewDescription = useCallback((): string => {
    switch (activeAnalyticsView) {
      case 'sales': return `Daily sales performance for ${currentRestaurantName}`
      case 'restaurants': return 'Sales breakdown by restaurant location'
      case 'waiters': return 'Individual waiter performance metrics'
      case 'orderTypes': return 'Sales distribution by order type'
      default: return ''
    }
  }, [activeAnalyticsView])

  const currentRestaurantName = useMemo(() => {
    if (selectedRestaurant === 'all') return 'All Restaurants'
    if (selectedRestaurant === 'unassigned') return 'Unassigned Orders'
    return restaurants.find(r => r._id === selectedRestaurant)?.name || 'Selected Restaurant'
  }, [selectedRestaurant, restaurants])

  const currentWaiterName = useMemo(() => {
    if (selectedWaiter === 'all') return 'All Waiters'
    return waitresses.find(w => w._id === selectedWaiter)?.name || 'Selected Waiter'
  }, [selectedWaiter, waitresses])

  const dateRangeLabel = useMemo(() => {
    return `${format(dateRange.start, 'MMM d, yyyy')} - ${format(dateRange.end, 'MMM d, yyyy')}`
  }, [dateRange])

  // ============================================
  // 6e. LOADING STATE
  // ============================================

  if (isLoading && !waiterReportData) {
    return (
      <div className="flex-col md:flex">
        <div className="flex-1 space-y-3 md:space-y-4 p-3 md:p-8 pt-4 md:pt-6">
          <Skeleton className="h-6 md:h-[36px] w-40 md:w-[250px]" />
          <Skeleton className="h-8 md:h-[40px] w-full" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-[80px] md:h-[125px] w-full" />
            ))}
          </div>
          <Skeleton className="h-[250px] md:h-[400px] w-full" />
        </div>
      </div>
    )
  }

  // ============================================
  // 6f. MAIN RENDER - Mobile First
  // ============================================

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex-1 space-y-3 md:space-y-6 p-3 md:p-6 lg:p-8">
        {/* Dashboard Header */}
        <DashboardHeader
          currentRestaurantName={currentRestaurantName}
          currentWaiterName={currentWaiterName}
          orderCount={overviewMetrics.orderCount}
          selectedRestaurant={selectedRestaurant}
          selectedWaiter={selectedWaiter}
          onRestaurantChange={handleRestaurantChange}
          onWaiterChange={handleWaiterChange}
          waitresses={waitresses}
          restaurants={restaurants}
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
          dateRangeLabel={dateRangeLabel}
          dateFilterType={filterType}
          onDateFilterChange={handleDateFilterChange}
        />

        {/* Metrics Overview Cards */}
        <MetricsOverview
          totalSales={overviewMetrics.totalSales}
          totalOrders={overviewMetrics.orderCount}
          averageOrderValue={overviewMetrics.averageOrderValue}
          salesComparison={comparisons.sales}
          ordersComparison={comparisons.orders}
          aovComparison={comparisons.aov}
          isLoading={isLoading}
        />

        {/* Analytics Filter Cards */}
        <AnalyticsFilterCards
          activeView={activeAnalyticsView}
          onViewChange={setActiveAnalyticsView}
          counts={{
            sales: dailySalesData.length,
            restaurants: restaurantRankingData.length,
            waiters: waiterRankingData.length,
            orderTypes: ORDER_TYPES.length,
          }}
        />

        {/* Main Chart */}
        <SalesBarChart
          data={getCurrentViewChartData()}
          title={getCurrentViewTitle()}
          description={getCurrentViewDescription()}
          showComparison={activeAnalyticsView === 'sales'}
          height={300}
          isLoading={isLoading}
        />

        {/* Ranking Panels */}
        <div className="grid gap-3 md:gap-6 lg:grid-cols-2">
          {activeAnalyticsView !== 'restaurants' && restaurantRankingData.length > 0 && (
            <RankingAndComparisonPanel
              title="Top Restaurants"
              items={restaurantRankingData.slice(0, 5)}
              maxItems={5}
              showRanking={true}
              isLoading={isLoading}
            />
          )}

          {activeAnalyticsView !== 'waiters' && waiterRankingData.length > 0 && (
            <RankingAndComparisonPanel
              title="Top Performing Waiters"
              items={waiterRankingData.slice(0, 5)}
              maxItems={5}
              showRanking={true}
              isLoading={isLoading}
            />
          )}

          {activeAnalyticsView !== 'orderTypes' && orderTypeRankingData.length > 0 && (
            <RankingAndComparisonPanel
              title="Order Type Distribution"
              items={orderTypeRankingData}
              maxItems={4}
              showRanking={true}
              isLoading={isLoading}
            />
          )}
        </div>

        {/* Recent Orders Table - Mobile Optimized */}
        <Card>
          <CardHeader className="p-3 md:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <CardTitle className="text-base md:text-xl font-semibold">Recent Orders</CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-[10px] md:text-sm">
                  Total: {filteredOverviewOrders.length} orders
                </Badge>
                <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing} className="h-7 md:h-9 text-xs md:text-sm">
                  <RefreshCw className={`mr-1 md:mr-2 h-3 w-3 md:h-4 md:w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0 md:p-6">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[10px] md:text-sm">Order #</TableHead>
                    <TableHead className="text-[10px] md:text-sm hidden sm:table-cell">Restaurant</TableHead>
                    <TableHead className="text-[10px] md:text-sm">Type</TableHead>
                    <TableHead className="text-[10px] md:text-sm hidden xs:table-cell">Waiter</TableHead>
                    <TableHead className="text-[10px] md:text-sm hidden lg:table-cell">Items</TableHead>
                    <TableHead className="text-right text-[10px] md:text-sm">Amount</TableHead>
                    <TableHead className="text-[10px] md:text-sm hidden xl:table-cell">Status</TableHead>
                    <TableHead className="text-[10px] md:text-sm hidden md:table-cell">Date</TableHead>
                    <TableHead className="text-center text-[10px] md:text-sm"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOverviewOrders.map((order) => {
                    const restaurantName = getRestaurantDisplayName(order, waitresses, restaurants)
                    const orderType = order.inTable === true 
                      ? { icon: <Home className="h-2 w-2 md:h-3 md:w-3" />, label: "Dine In", color: "bg-green-100 text-green-800" }
                      : order.delivery === true
                      ? { icon: <Truck className="h-2 w-2 md:h-3 md:w-3" />, label: "Delivery", color: "bg-blue-100 text-blue-800" }
                      : { icon: <Package2 className="h-2 w-2 md:h-3 md:w-3" />, label: "POS", color: "bg-purple-100 text-purple-800" }
                    
                    return (
                      <TableRow key={order._id} className="cursor-pointer hover:bg-gray-50">
                        <TableCell className="font-medium text-[10px] md:text-sm">{order.orderNumber}</TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Badge variant="outline" className="bg-indigo-50 text-[8px] md:text-xs">
                            <Building2 className="h-2 w-2 md:h-3 md:w-3 mr-0.5 md:mr-1" />
                            <span className="hidden sm:inline">{restaurantName}</span>
                            <span className="sm:hidden truncate max-w-[40px]">{restaurantName.substring(0, 8)}</span>
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={`${orderType.color} text-[8px] md:text-xs`}>
                            {orderType.icon}
                            <span className="ml-0.5 md:ml-1 hidden xs:inline">{orderType.label}</span>
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden xs:table-cell text-[10px] md:text-sm">{order.waiterName || 'Unknown'}</TableCell>
                        <TableCell className="hidden lg:table-cell max-w-[120px] md:max-w-[200px] truncate text-[10px] md:text-sm">
                          {order.items?.slice(0, 2).map(item => `${item.name} (${item.quantity})`).join(', ')}
                          {order.items?.length > 2 && ` +${order.items.length - 2} more`}
                          {!order.items?.length && '-'}
                        </TableCell>
                        <TableCell className="text-right font-medium text-[10px] md:text-sm">{formatCurrency(order.finalAmount)}</TableCell>
                        <TableCell className="hidden xl:table-cell">
                          <Badge className={STATUS_COLORS[order.status] || "bg-gray-100 text-[8px] md:text-xs"}>{order.status}</Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-[10px] md:text-sm">{new Date(order.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell className="text-center">
                          <Button variant="ghost" size="sm" onClick={() => handleViewDetails(order)} className="h-6 w-6 md:h-8 md:w-8 p-0">
                            <Eye className="h-3 w-3 md:h-4 md:w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                  {filteredOverviewOrders.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-6 md:py-8 text-muted-foreground text-xs md:text-sm">
                        No orders found for the selected criteria
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Order Details Dialog - Mobile Optimized */}
      <Dialog open={!!selectedOrder} onOpenChange={() => {
        setSelectedOrder(null)
        setSelectedItemsMap(new Map())
      }}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto p-3 md:p-6">
          <DialogHeader className="space-y-1 md:space-y-2">
            <DialogTitle className="text-lg md:text-2xl font-bold">Order Details</DialogTitle>
            <DialogDescription className="text-xs md:text-sm">
              Full details for order #{selectedOrder?.orderNumber}
            </DialogDescription>
          </DialogHeader>
          
          {loadingOrderDetails ? (
            <div className="flex items-center justify-center py-8 md:py-12">
              <Loader2 className="h-6 w-6 md:h-8 md:w-8 animate-spin text-primary" />
              <span className="ml-2 text-sm md:text-base">Loading order details...</span>
            </div>
          ) : (
            <ScrollArea className="mt-2 md:mt-4 max-h-[70vh]">
              {selectedOrder && selectedWaitress && (
                <div className="space-y-4 md:space-y-6">
                  <div className="flex items-center space-x-3 md:space-x-4 p-3 md:p-4 bg-muted/30 rounded-lg">
                    {selectedOrder.delivery ? (
                      <>
                        <Avatar className="h-12 w-12 md:h-16 md:w-16">
                          <AvatarFallback><Truck className="h-6 w-6 md:h-8 md:w-8" /></AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base md:text-lg font-semibold">Delivery Order</h3>
                          {selectedOrder.deliveryInfo ? (
                            <>
                              <p className="text-xs md:text-sm font-medium truncate">{selectedOrder.deliveryInfo.fullName}</p>
                              <p className="text-[10px] md:text-sm text-muted-foreground flex items-center gap-1">
                                <Phone className="h-2 w-2 md:h-3 md:w-3" />
                                {selectedOrder.deliveryInfo.phoneNumber}
                              </p>
                              <p className="text-[10px] md:text-sm text-muted-foreground flex items-center gap-1 truncate">
                                <MapPin className="h-2 w-2 md:h-3 md:w-3 flex-shrink-0" />
                                <span className="truncate">{selectedOrder.deliveryInfo.address}, {selectedOrder.deliveryInfo.city}</span>
                              </p>
                            </>
                          ) : (
                            <p className="text-xs md:text-sm text-muted-foreground">No delivery information available</p>
                          )}
                        </div>
                      </>
                    ) : (
                      <>
                        <Avatar className="h-12 w-12 md:h-16 md:w-16">
                          <AvatarFallback className="text-xs md:text-base">
                            {selectedWaitress?.name?.split(" ").map((n) => n[0]).join("") || "W"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base md:text-lg font-semibold truncate">{selectedWaitress?.name || "Unknown Waitress"}</h3>
                          <p className="text-[10px] md:text-sm text-muted-foreground flex items-center gap-1">
                            <Phone className="h-2 w-2 md:h-3 md:w-3" />
                            {selectedWaitress?.phone || "No phone number"}
                          </p>
                          <Badge variant="outline" className="mt-0.5 md:mt-1 text-[8px] md:text-xs">
                            {selectedWaitress?.shift || "Unknown"} Shift
                          </Badge>
                        </div>
                      </>
                    )}
                  </div>

                  <Separator />

                  <div className="grid grid-cols-2 gap-2 md:gap-4 text-xs md:text-sm">
                    <div>
                      <h4 className="font-medium text-[10px] md:text-sm text-muted-foreground">Order Number</h4>
                      <p className="font-medium text-xs md:text-sm break-all">{selectedOrder.orderNumber}</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-[10px] md:text-sm text-muted-foreground">Restaurant</h4>
                      <p className="text-xs md:text-sm truncate">{getRestaurantDisplayName(selectedOrder, waitresses, restaurants)}</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-[10px] md:text-sm text-muted-foreground">Table Number</h4>
                      <p className="text-xs md:text-sm">{selectedOrder.tableNumber}</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-[10px] md:text-sm text-muted-foreground">Number of Guests</h4>
                      <p className="text-xs md:text-sm">{selectedOrder.numberOfGuests}</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-[10px] md:text-sm text-muted-foreground">Payment Method</h4>
                      <Badge variant="secondary" className="text-[8px] md:text-xs">{selectedOrder.paymentMethod || "CASH"}</Badge>
                    </div>
                    <div>
                      <h4 className="font-medium text-[10px] md:text-sm text-muted-foreground">Status</h4>
                      <Badge className={`${STATUS_COLORS[selectedOrder.status] || "bg-gray-100"} text-[8px] md:text-xs`}>{selectedOrder.status}</Badge>
                    </div>
                    <div className="col-span-2">
                      <h4 className="font-medium text-[10px] md:text-sm text-muted-foreground">Created At</h4>
                      <p className="text-xs md:text-sm">{new Date(selectedOrder.createdAt).toLocaleString()}</p>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h4 className="font-medium flex items-center mb-2 md:mb-3 text-sm md:text-base">
                      <Utensils className="mr-1 md:mr-2 h-4 w-4 md:h-5 md:w-5" /> Order Items
                    </h4>
                    <div className="rounded-md border overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-[10px] md:text-sm">Item Name</TableHead>
                            <TableHead className="text-center text-[10px] md:text-sm">Qty</TableHead>
                            <TableHead className="text-right text-[10px] md:text-sm">Unit Price</TableHead>
                            <TableHead className="text-right text-[10px] md:text-sm">Subtotal</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(selectedOrder.items || selectedOrder.orderItems || []).map((item, index) => {
                            const itemId = item.menuItemId || item.itemId
                            const menuItem = selectedItemsMap.get(itemId || '')
                            return ( 
                              <TableRow key={item.itemId || index}>
                                <TableCell className="text-[10px] md:text-sm">
                                  <div>
                                    <span className="font-medium text-xs md:text-sm">{menuItem?.name || item.name || 'Unknown Item'}</span>
                                    {item.specialInstructions && (
                                      <p className="text-[8px] md:text-xs text-muted-foreground mt-0.5">
                                        Note: {item.specialInstructions}
                                      </p>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className="text-center">
                                  <Badge variant="secondary" className="text-[8px] md:text-xs">{item.quantity}x</Badge>
                                </TableCell>
                                <TableCell className="text-right text-[10px] md:text-sm">
                                  {formatCurrency(menuItem?.price || item.price || item.unitPrice || 0)}
                                </TableCell>
                                <TableCell className="text-right font-medium text-[10px] md:text-sm">
                                  {formatCurrency((menuItem?.price || item.price || item.unitPrice || 0) * (item.quantity || 0))}
                                </TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-1 md:space-y-2 p-3 md:p-4 bg-muted/20 rounded-lg">
                    <div className="flex justify-between text-xs md:text-sm">
                      <span className="text-muted-foreground">Subtotal:</span>
                      <span>{formatCurrency(selectedOrder.totalAmount)}</span>
                    </div>
                    {selectedOrder.discount > 0 && (
                      <div className="flex justify-between text-xs md:text-sm text-red-600">
                        <span>Discount:</span>
                        <span>-{formatCurrency(selectedOrder.discount)}</span>
                      </div>
                    )}
                    {selectedOrder.tax > 0 && (
                      <div className="flex justify-between text-xs md:text-sm">
                        <span>Tax:</span>
                        <span>{formatCurrency(selectedOrder.tax)}</span>
                      </div>
                    )}
                    <Separator className="my-1 md:my-2" />
                    <div className="flex justify-between font-bold text-sm md:text-lg">
                      <span>Total Amount:</span>
                      <span className="text-primary">{formatCurrency(selectedOrder.finalAmount)}</span>
                    </div>
                  </div>
                </div>
              )}
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}