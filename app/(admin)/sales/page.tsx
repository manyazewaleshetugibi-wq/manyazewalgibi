"use client"

// ============================================
// 1. DashboardHeader Component
// ============================================

import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  BarChart,
  DollarSign,
  ShoppingCart,
  ArrowDownIcon,
  Download,
  Eye,
  User,
  CreditCard,
  CalendarDays,
  Utensils,
  Filter,
  TrendingUp,
  Users,
  RefreshCw,
  Loader2,
  MessageSquare,
  Phone,
  MapPin,
  Home,
  Truck,
  Building2,
  Calendar,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  LayoutDashboard,
  Store,
  Briefcase,
  Package2,
  UtensilsCrossed,
  Smartphone,
  ChevronDown,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, LineChart, Line, BarChart as ReBarChart, Bar, Cell, CartesianGrid } from "recharts"
import * as XLSX from "xlsx"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Label } from "@/components/ui/label"
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths, subYears, startOfYear, endOfYear, getDay, setDay, differenceInDays, differenceInWeeks, differenceInMonths, isWithinInterval, parseISO } from "date-fns"

// ============================================
// Types
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

type SalesData = {
  totalSales: number
  orderCount: number
  totalTax: number
  totalDiscounts: number
  dailySales: Record<string, number>
  orders: Order[]
  waitressSales?: Record<string, { name: string; sales: number; orders: number }>
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

// ============================================
// API Functions
// ============================================

// Fetch restaurants from API
const fetchRestaurantsFromAPI = async (): Promise<Restaurant[]> => {
  try {
    const response = await fetch('/api/restaurants')
    const data = await response.json()
    
    if (data.success && Array.isArray(data.data)) {
      return data.data
        .filter((r: any) => r.isActive !== false)
        .map((r: any) => ({
          _id: r._id,
          name: r.name,
          shortName: r.name.includes('1') ? 'Restaurant 1' : (r.name.includes('2') ? 'Restaurant 2' : r.name.substring(0, 15)),
          isActive: r.isActive,
          branchCode: r.branchCode,
          color: r.color
        }))
    }
    return []
  } catch (error) {
    console.error("Error fetching restaurants:", error)
    return []
  }
}

// Fetch waiters with restaurant info
const fetchWaitressesWithRestaurants = async (): Promise<Waitress[]> => {
  try {
    const response = await fetch("/api/waitress")
    const data = await response.json()
    return data || []
  } catch (error) {
    console.error("Error fetching waitresses:", error)
    return []
  }
}

// Helper function to get restaurant ID from order - IMPROVED with dynamic mapping
const getOrderRestaurantId = (
  order: Order, 
  waitersList: Waitress[], 
  restaurantsList: Restaurant[]
): string => {
  // 1. Direct ID match from order data (priority)
  if (order.restaurantId) {
    return order.restaurantId
  }
  
  // 2. Direct name match from order data (fuzzy)
  const rName = (order.restaurantName || "").toLowerCase()
  if (rName) {
    const match = restaurantsList.find(r => 
      r.name.toLowerCase() === rName || 
      r.name.toLowerCase().includes(rName) || 
      rName.includes(r.name.toLowerCase())
    )
    if (match) return match._id
  }
  
  // 3. Fallback check for Manyazewal specific branch naming patterns (1, 2, 3)
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
  
  // 4. Map by waiter's restaurant assignment
  if (order.waiterId) {
    const waiter = waitersList.find(w => w._id === order.waiterId)
    if (waiter?.restaurantId) {
      return waiter.restaurantId
    }
  }
  
  return "unassigned"
}

// Helper function to get restaurant display name
const getRestaurantDisplayName = (
  order: Order, 
  waitersList: Waitress[], 
  restaurantsList: Restaurant[]
): string => {
  const restaurantId = getOrderRestaurantId(order, waitersList, restaurantsList)
  const restaurant = restaurantsList.find(r => r._id === restaurantId)
  if (restaurant) return restaurant.name || restaurant.shortName
  return order.restaurantName || "Unassigned"
}

// Filter orders by restaurant
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
      return orderRestaurantId === 'unassigned' || !orderRestaurantId
    })
  }
  return orders.filter(order => {
    const orderRestaurantId = getOrderRestaurantId(order, waitersList, restaurantsList)
    return orderRestaurantId === restaurantId
  })
}

// Create restaurant options from dynamic list
const getRestaurantOptions = (restaurants: Restaurant[]) => {
  return restaurants.map(r => ({
    id: r._id,
    name: r.name,
    shortName: r.shortName,
    color: r.color || 'indigo'
  }))
}

const ORDER_TYPES = [
  { id: "dinein", name: "Dine In", icon: Home, color: "#10b981" },
  { id: "delivery", name: "Delivery", icon: Truck, color: "#3b82f6" },
  { id: "POS", name: "POS", icon: Package2, color: "#f59e0b" },
  { id: "online", name: "Online", icon: Smartphone, color: "#8b5cf6" },
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

const fetchItemsBatch = async (itemIds: string[]): Promise<Map<string, MenuItem>> => {
  if (itemIds.length === 0) return new Map()
  const uniqueIds = [...new Set(itemIds)]
  const limitedIds = uniqueIds.slice(0, BATCH_SIZE_LIMIT)
  const cacheKey = limitedIds.sort().join(',')
  const cached = menuItemsCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) return cached.data
  try {
    const response = await fetch(`/api/items?ids=${limitedIds.join(',')}`)
    if (!response.ok) throw new Error("Failed to fetch items")
    const data = await response.json()
    const itemsMap = new Map<string, MenuItem>()
    const items = data.items || data || []
    items.forEach((item: MenuItem) => { if (item?._id) itemsMap.set(item._id, item) })
    menuItemsCache.set(cacheKey, { data: itemsMap, timestamp: Date.now() })
    return itemsMap
  } catch (error) {
    console.error("Error fetching items batch:", error)
    return new Map()
  }
}

// Fetch waiter report with optional limit
const fetchWaiterReport = async (waiterId?: string, startDate?: string, endDate?: string, restaurantId?: string, limit?: number): Promise<WaiterReportResponse> => {
  const params = new URLSearchParams()
  if (startDate) params.append('startDate', startDate)
  if (endDate) params.append('endDate', endDate)
  if (waiterId && waiterId !== 'all') params.append('waiterId', waiterId)
  if (restaurantId && restaurantId !== 'all' && restaurantId !== 'unassigned') params.append('restaurantId', restaurantId)
  if (limit && limit > 0) params.append('limit', limit.toString())
  else params.append('limit', '10000')
  
  const url = `/api/order/waiterreport${params.toString() ? `?${params.toString()}` : ''}`
  console.log("Fetching URL:", url)
  const response = await fetch(url)
  const data = await response.json()
  console.log("Fetched orders count:", data.orders?.length || 0)
  return data
}

const fetchWaitresses = async (): Promise<Waitress[]> => {
  const response = await fetch("/api/waitress")
  return response.json()
}

const fetchWaitress = async (id: string): Promise<Waitress> => {
  const response = await fetch(`/api/waitress/${id}`)
  return response.json()
}

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
      start.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1))
      start.setHours(0, 0, 0, 0)
      end.setDate(start.getDate() + 6)
      end.setHours(23, 59, 59, 999)
      break
    case 'lastWeek':
      start.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -13 : -6))
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
  const daysDiff = differenceInDays(currentEnd, currentStart) + 1

  switch (filterType) {
    case 'today':
    case 'yesterday':
      return { start: subDays(currentStart, 1), end: subDays(currentEnd, 1) }
    case 'last7days':
      return { start: subDays(currentStart, 7), end: subDays(currentEnd, 7) }
    case 'thisWeek':
    case 'lastWeek':
      return { start: subDays(currentStart, 7), end: subDays(currentEnd, 7) }
    case 'thisMonth':
    case 'lastMonth':
      return { start: subMonths(currentStart, 1), end: subMonths(currentEnd, 1) }
    default:
      return { start: subDays(currentStart, daysDiff), end: subDays(currentEnd, daysDiff) }
  }
}

// ============================================
// 2. MetricsOverview Component
// ============================================

interface MetricsOverviewProps {
  totalSales: number
  totalOrders: number
  averageOrderValue: number
  salesComparison: ComparisonData
  ordersComparison: ComparisonData
  aovComparison: ComparisonData
  isLoading?: boolean
}

function MetricsOverview({ 
  totalSales, 
  totalOrders, 
  averageOrderValue, 
  salesComparison, 
  ordersComparison, 
  aovComparison, 
  isLoading 
}: MetricsOverviewProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="overflow-hidden">
            <CardContent className="p-6">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-8 w-32 mb-2" />
              <Skeleton className="h-3 w-20" />
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
      <div className={`flex items-center gap-1 ${bgClass} px-2 py-1 rounded-full`}>
        <Icon className={`h-3 w-3 ${colorClass}`} />
        <span className={`text-xs font-medium ${colorClass}`}>
          {Math.abs(comparison.percentage).toFixed(1)}%
        </span>
      </div>
    )
  }

  return (
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
      <Card className="overflow-hidden transition-all hover:shadow-lg">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">Total Sales</p>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <h3 className="text-xl sm:text-2xl font-bold">{formatCurrency(totalSales)}</h3>
            {renderComparison(salesComparison)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">vs previous period</p>
        </CardContent>
      </Card>

      <Card className="overflow-hidden transition-all hover:shadow-lg">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">Total Orders</p>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <h3 className="text-xl sm:text-2xl font-bold">{totalOrders}</h3>
            {renderComparison(ordersComparison)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">vs previous period</p>
        </CardContent>
      </Card>

      <Card className="overflow-hidden transition-all hover:shadow-lg">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">Average Order Value</p>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <h3 className="text-xl sm:text-2xl font-bold">{formatCurrency(averageOrderValue)}</h3>
            {renderComparison(aovComparison)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">vs previous period</p>
        </CardContent>
      </Card>

      <Card className="overflow-hidden transition-all hover:shadow-lg">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">Growth Rate</p>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="mt-1">
            <h3 className={`text-xl sm:text-2xl font-bold ${salesComparison.isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {salesComparison.isPositive ? '+' : ''}{salesComparison.percentage.toFixed(1)}%
            </h3>
          </div>
          <p className="text-xs text-muted-foreground mt-1">sales vs previous period</p>
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================
// 3. AnalyticsFilterCards Component
// ============================================

interface AnalyticsFilterCardsProps {
  activeView: AnalyticsView
  onViewChange: (view: AnalyticsView) => void
  counts?: {
    sales: number
    restaurants: number
    waiters: number
    orderTypes: number
  }
}

function AnalyticsFilterCards({ activeView, onViewChange, counts }: AnalyticsFilterCardsProps) {
  const filters = [
    { id: 'sales' as AnalyticsView, label: 'All Sales', icon: LayoutDashboard, color: 'blue', count: counts?.sales },
    { id: 'restaurants' as AnalyticsView, label: 'Restaurants', icon: Store, color: 'green', count: counts?.restaurants },
    { id: 'waiters' as AnalyticsView, label: 'Waiters', icon: Users, color: 'purple', count: counts?.waiters },
    { id: 'orderTypes' as AnalyticsView, label: 'Order Types', icon: UtensilsCrossed, color: 'orange', count: counts?.orderTypes },
  ]

  const colorClasses = {
    blue: { active: "bg-blue-50 border-blue-500 text-blue-700", inactive: "hover:bg-gray-50", icon: "text-blue-500" },
    green: { active: "bg-green-50 border-green-500 text-green-700", inactive: "hover:bg-gray-50", icon: "text-green-500" },
    purple: { active: "bg-purple-50 border-purple-500 text-purple-700", inactive: "hover:bg-gray-50", icon: "text-purple-500" },
    orange: { active: "bg-orange-50 border-orange-500 text-orange-700", inactive: "hover:bg-gray-50", icon: "text-orange-500" },
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {filters.map((filter) => {
        const Icon = filter.icon
        const isActive = activeView === filter.id
        const colors = colorClasses[filter.color as keyof typeof colorClasses]
        
        return (
          <button
            key={filter.id}
            onClick={() => onViewChange(filter.id)}
            className={`
              flex items-center justify-between p-4 rounded-xl border-2 transition-all duration-200
              ${isActive ? colors.active : `bg-white border-gray-200 ${colors.inactive}`}
            `}
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${isActive ? 'bg-white/50' : 'bg-gray-50'}`}>
                <Icon className={`h-5 w-5 ${isActive ? colors.icon : 'text-gray-400'}`} />
              </div>
              <span className={`font-medium ${isActive ? 'text-gray-900' : 'text-gray-600'}`}>
                {filter.label}
              </span>
            </div>
            {filter.count !== undefined && filter.count > 0 && (
              <Badge variant={isActive ? "default" : "secondary"} className="rounded-full">
                {filter.count}
              </Badge>
            )}
          </button>
        )
      })}
    </div>
  )
}

// ============================================
// 4. SalesBarChart Component
// ============================================

interface SalesBarChartProps {
  data: ChartDataPoint[]
  title: string
  description?: string
  valuePrefix?: string
  showComparison?: boolean
  height?: number
  isLoading?: boolean
}

function SalesBarChart({ 
  data, 
  title, 
  description, 
  valuePrefix = "ETB", 
  showComparison = false, 
  height = 400,
  isLoading 
}: SalesBarChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[350px] w-full" />
        </CardContent>
      </Card>
    )
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </CardHeader>
        <CardContent className="h-[350px] flex items-center justify-center">
          <div className="text-center">
            <BarChart className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No data available for this period</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
          <p className="font-semibold text-sm mb-2">{label}</p>
          {payload.map((p: any, idx: number) => (
            <p key={idx} className="text-sm" style={{ color: p.color }}>
              {p.name}: {valuePrefix === "ETB" ? formatCurrency(p.value) : p.value.toLocaleString()}
            </p>
          ))}
          {showComparison && payload[0]?.payload?.percentage && (
            <p className="text-xs text-muted-foreground mt-1 pt-1 border-t">
              Change: {payload[0].payload.percentage > 0 ? '+' : ''}{payload[0].payload.percentage.toFixed(1)}%
            </p>
          )}
        </div>
      )
    }
    return null
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl font-semibold">{title}</CardTitle>
            {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
          </div>
          {showComparison && data[0]?.percentage !== undefined && (
            <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${data[0].percentage >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
              {data[0].percentage >= 0 ? (
                <ArrowUpRight className="h-3 w-3 text-green-600" />
              ) : (
                <ArrowDownRight className="h-3 w-3 text-red-600" />
              )}
              <span className={`text-xs font-medium ${data[0].percentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {Math.abs(data[0].percentage).toFixed(1)}% vs previous period
              </span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <ReBarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis 
              dataKey="name" 
              stroke="#888888" 
              fontSize={12} 
              tickLine={false} 
              axisLine={false}
              angle={-45}
              textAnchor="end"
              height={60}
              interval={0}
            />
            <YAxis
              stroke="#888888"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => valuePrefix === "ETB" ? `${formatCurrency(value)}` : `${value}`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
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
                name="Previous Period" 
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

// ============================================
// 5. RankingAndComparisonPanel Component
// ============================================

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

interface RankingAndComparisonPanelProps {
  title: string
  items: RankingItem[]
  valuePrefix?: string
  maxItems?: number
  showRanking?: boolean
  showComparison?: boolean
  isLoading?: boolean
}

function RankingAndComparisonPanel({ 
  title, 
  items, 
  valuePrefix = "ETB", 
  maxItems = 10, 
  showRanking = true, 
  showComparison = true,
  isLoading 
}: RankingAndComparisonPanelProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40 mb-2" />
          <Skeleton className="h-4 w-56" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    )
  }

  const displayItems = items.slice(0, maxItems)
  const maxValue = Math.max(...displayItems.map(i => i.value), 1)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl font-semibold">{title}</CardTitle>
        <p className="text-sm text-muted-foreground">
          {showRanking ? "Ranked by sales performance" : "Performance comparison"}
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {displayItems.map((item, index) => {
            const percentageOfMax = (item.value / maxValue) * 100
            const barColor = item.color || CHART_COLORS[index % CHART_COLORS.length]
            
            return (
              <div key={item.id} className="group">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-3">
                    {showRanking && (
                      <div className={`
                        w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold
                        ${index === 0 ? 'bg-yellow-100 text-yellow-700' : 
                          index === 1 ? 'bg-gray-100 text-gray-600' : 
                          index === 2 ? 'bg-orange-100 text-orange-700' : 
                          'bg-gray-50 text-gray-500'}
                      `}>
                        #{item.rank || index + 1}
                      </div>
                    )}
                    {item.icon && <span className="text-gray-500">{item.icon}</span>}
                    <div>
                      <span className="font-medium text-sm">{item.name}</span>
                      {item.orders !== undefined && (
                        <p className="text-xs text-muted-foreground">{item.orders} orders</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-semibold text-sm">
                      {valuePrefix === "ETB" ? formatCurrency(item.value) : `${item.value.toLocaleString()}`}
                    </span>
                    {showComparison && item.percentage !== undefined && (
                      <span className={`text-xs ml-2 ${item.percentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {item.percentage >= 0 ? '+' : ''}{item.percentage.toFixed(1)}%
                      </span>
                    )}
                  </div>
                </div>
                <div className="relative h-8 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="absolute left-0 top-0 h-full rounded-full transition-all duration-700 ease-out"
                    style={{ 
                      width: `${percentageOfMax}%`, 
                      backgroundColor: barColor,
                      opacity: 0.85
                    }}
                  />
                  {showComparison && item.previousValue !== undefined && (
                    <div 
                      className="absolute left-0 top-0 h-full rounded-full border-2 border-gray-400"
                      style={{ 
                        width: `${(item.previousValue / maxValue) * 100}%`,
                        backgroundColor: 'transparent'
                      }}
                    />
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================
// 6. DashboardHeader Component
// ============================================

interface DashboardHeaderProps {
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
  customStartDate?: Date | null
  customEndDate?: Date | null
  onCustomDateChange?: (start: Date | null, end: Date | null) => void
}

function DashboardHeader({ // Mobile-first adjustments
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
  customStartDate,
  customEndDate,
}: DashboardHeaderProps) {
  const [showCustomPicker, setShowCustomPicker] = useState(false)
  const [localStartDate, setLocalStartDate] = useState<string>(customStartDate?.toISOString().split('T')[0] || '')
  const [localEndDate, setLocalEndDate] = useState<string>(customEndDate?.toISOString().split('T')[0] || '')

  const dateFilters: { label: string; value: DateFilterType }[] = [
    { label: "Today", value: "today" },
    { label: "Yesterday", value: "yesterday" },
    { label: "Last 7 Days", value: "last7days" },
    { label: "This Week", value: "thisWeek" },
    { label: "Last Week", value: "lastWeek" },
    { label: "This Month", value: "thisMonth" },
    { label: "Last Month", value: "lastMonth" },
    { label: "Custom", value: "custom" },
  ]

  const handleApplyCustom = () => {
    if (localStartDate && localEndDate) {
      onDateFilterChange('custom', new Date(localStartDate), new Date(localEndDate))
      setShowCustomPicker(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
            Sales Analytics
          </h1>
          <p className="text-muted-foreground mt-1">
            {currentRestaurantName} • {currentWaiterName} • {orderCount} orders • {dateRangeLabel}
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <Select value={selectedRestaurant} onValueChange={onRestaurantChange}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <Store className="h-4 w-4 mr-2 text-gray-500" />
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
            <SelectTrigger className="w-full sm:w-[180px]">
              <Users className="h-4 w-4 mr-2 text-gray-500" />
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
          
          <Button variant="outline" size="icon" onClick={onRefresh} disabled={isRefreshing} className="hidden sm:inline-flex">
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Date Filter Chips - now wrapping */}
      <div className="pb-2">
        <div className="grid grid-cols-4 gap-2">
          {dateFilters.map((filter) => (
            <button
              key={filter.value}
              onClick={() => {
                if (filter.value === 'custom') {
                  setShowCustomPicker(!showCustomPicker);
                } else {
                  onDateFilterChange(filter.value);
                  setShowCustomPicker(false);
                }
              }}
              className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-all duration-200 ${dateFilterType === filter.value && filter.value !== 'custom' ? 'bg-blue-600 text-white shadow-md' : filter.value === 'custom' && showCustomPicker ? 'bg-gray-200 text-gray-900' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {filter.label}
              {filter.value === 'custom' && showCustomPicker && <ChevronDown className="inline ml-1 h-3 w-3" />}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Date Picker */}
      {showCustomPicker && (
        <Card className="mt-2 p-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Start Date</Label>
              <Input
                type="date"
                value={localStartDate}
                onChange={(e) => setLocalStartDate(e.target.value)}
              />
            </div>
            <div>
              <Label>End Date</Label>
              <Input
                type="date"
                value={localEndDate}
                onChange={(e) => setLocalEndDate(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowCustomPicker(false)}>Cancel</Button>
            <Button onClick={handleApplyCustom}>Apply</Button>
          </div>
        </Card>
      )}
    </div>
  )
}

// ============================================
// 7. Main Dashboard Component (Refactored)
// ============================================

export default function DashboardPage() {
  // State
  const [salesData, setSalesData] = useState<SalesData | null>(null)
  const [waiterReportData, setWaiterReportData] = useState<WaiterReportResponse | null>(null)
  const [waitresses, setWaitresses] = useState<Waitress[]>([])
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [selectedWaiter, setSelectedWaiter] = useState<string>('all')
  const [selectedRestaurant, setSelectedRestaurant] = useState<string>('all')
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([])
  const [filteredOverviewOrders, setFilteredOverviewOrders] = useState<Order[]>([])
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date }>(() => getDateRangeForFilter('today'))
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

  // Fetch restaurants on mount
  useEffect(() => {
    const loadRestaurants = async () => {
      const restaurantData = await fetchRestaurantsFromAPI()
      setRestaurants(restaurantData)
    }
    loadRestaurants()
  }, [])

  // Fetch waitresses
  useEffect(() => {
    const loadWaitresses = async () => {
      const data = await fetchWaitressesWithRestaurants()
      setWaitresses(data)
    }
    loadWaitresses()
  }, [])

  // Fetch initial data when restaurants and waitresses are loaded
  useEffect(() => {
    if (restaurants.length > 0 && waitresses.length > 0 && !initialFetchDone.current) {
      initialFetchDone.current = true
      loadData()
    }
  }, [restaurants, waitresses])

  // Enhance orders with menu item data
  const enhanceOrdersWithMenuItems = useCallback((orders: Order[], itemsMap: Map<string, MenuItem>): Order[] => {
    return orders.map(order => {
      const items = order.orderItems || order.items || []
      const enhancedItems = items.map(item => {
        const itemId = item.menuItemId || item.itemId
        const menuItem = itemsMap.get(itemId || '')
        return {
          ...item,
          name: menuItem?.name || item.name || 'Unknown Item',
          price: menuItem?.price || item.price || item.unitPrice || 0,
          unitPrice: menuItem?.price || item.price || item.unitPrice || 0,
          subtotal: (menuItem?.price || item.price || item.unitPrice || 0) * (item.quantity || 0),
        }
      })
      return { ...order, items: enhancedItems, orderItems: enhancedItems }
    })
  }, [])

  // Fetch menu items for orders
  const fetchMenuItemsForOrders = useCallback(async (orders: Order[]) => {
    const allItemIds = new Set<string>()
    orders.forEach(order => {
      const items = order.orderItems || order.items || []
      items.forEach(item => {
        const itemId = item.menuItemId || item.itemId
        if (itemId) allItemIds.add(itemId)
      })
    })
    if (allItemIds.size > 0) {
      const itemsMap = await fetchItemsBatch(Array.from(allItemIds))
      setGlobalItemsMap(itemsMap)
      return itemsMap
    }
    return new Map<string, MenuItem>()
  }, [])

  // Calculate comparisons
  const calculateComparisons = useCallback((currentOrders: Order[], previousOrders: Order[]) => {
    const currentSales = currentOrders.reduce((sum, o) => sum + o.finalAmount, 0)
    const previousSales = previousOrders.reduce((sum, o) => sum + o.finalAmount, 0)
    const currentOrderCount = currentOrders.length
    const previousOrderCount = previousOrders.length
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
  }, [])

  // Load main data
  const loadData = async () => {
    setIsLoading(true)
    try {
      const startDateStr = format(dateRange.start, 'yyyy-MM-dd')
      const endDateStr = format(dateRange.end, 'yyyy-MM-dd')
      const apiRestaurantId = selectedRestaurant === 'unassigned' ? 'all' : selectedRestaurant

      const reportData = await fetchWaiterReport(selectedWaiter, startDateStr, endDateStr, apiRestaurantId, 10000)
      setWaiterReportData(reportData)

      if (reportData.success) {
        let orders = reportData.orders || []
        console.log(`Loaded ${orders.length} orders from API`)
        
        // Apply restaurant filter using dynamic restaurant detection
        orders = filterOrdersByRestaurant(orders, selectedRestaurant, waitresses, restaurants)
        console.log(`After restaurant filter: ${orders.length} orders`)

        const itemsMap = await fetchMenuItemsForOrders(orders)
        const enhancedOrders = enhanceOrdersWithMenuItems(orders, itemsMap)
        const enrichedOrders = enhancedOrders.map(order => ({
          ...order,
          waiterName: order.waiterName || waitresses.find(w => w._id === order.waiterId)?.name || 'Unknown'
        }))

        setFilteredOrders(enrichedOrders)
        setFilteredOverviewOrders(enrichedOrders)

        // Generate daily sales data
        const dailySalesMap = new Map<string, { total: number; orders: number }>()
        enrichedOrders.forEach(order => {
          const date = new Date(order.createdAt).toLocaleDateString()
          const existing = dailySalesMap.get(date) || { total: 0, orders: 0 }
          dailySalesMap.set(date, {
            total: existing.total + order.finalAmount,
            orders: existing.orders + 1
          })
        })

        const dailySalesArray = Array.from(dailySalesMap.entries())
          .map(([date, data]) => ({ name: date, sales: data.total, orders: data.orders }))
          .sort((a, b) => new Date(a.name).getTime() - new Date(b.name).getTime())

        setDailySalesData(dailySalesArray)

        // Fetch previous period data for comparisons
        const previousRange = getPreviousPeriodRange(filterType, dateRange.start, dateRange.end)
        const previousStartStr = format(previousRange.start, 'yyyy-MM-dd')
        const previousEndStr = format(previousRange.end, 'yyyy-MM-dd')
        
        const previousReportData = await fetchWaiterReport(selectedWaiter, previousStartStr, previousEndStr, apiRestaurantId, 10000)
        if (previousReportData.success) {
          let previousOrders = previousReportData.orders || []
          previousOrders = filterOrdersByRestaurant(previousOrders, selectedRestaurant, waitresses, restaurants)
          
          const previousItemsMap = await fetchMenuItemsForOrders(previousOrders)
          const enhancedPreviousOrders = enhanceOrdersWithMenuItems(previousOrders, previousItemsMap)
          const enrichedPreviousOrders = enhancedPreviousOrders.map(order => ({
            ...order,
            waiterName: order.waiterName || waitresses.find(w => w._id === order.waiterId)?.name || 'Unknown'
          }))
          
          calculateComparisons(enrichedOrders, enrichedPreviousOrders)
          
          // Generate previous period daily sales
          const previousDailyMap = new Map<string, { total: number }>()
          enrichedPreviousOrders.forEach(order => {
            const date = new Date(order.createdAt).toLocaleDateString()
            const existing = previousDailyMap.get(date) || { total: 0 }
            previousDailyMap.set(date, { total: existing.total + order.finalAmount })
          })
          
          const previousDailyArray = Array.from(previousDailyMap.entries())
            .map(([date, data]) => ({ name: date, sales: data.total, orders: 0 }))
            .sort((a, b) => new Date(a.name).getTime() - new Date(b.name).getTime())
          
          setPreviousPeriodSalesData(previousDailyArray)
        }
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Handle date filter change
  const handleDateFilterChange = async (type: DateFilterType, customStart?: Date, customEnd?: Date) => {
    setFilterType(type)
    let newStart: Date, newEnd: Date
    
    if (type === 'custom' && customStart && customEnd) {
      newStart = customStart
      newEnd = customEnd
    } else {
      const range = getDateRangeForFilter(type)
      newStart = range.start
      newEnd = range.end
    }
    
    setDateRange({ start: newStart, end: newEnd })
    setIsLoading(true)
    
    try {
      const startDateStr = format(newStart, 'yyyy-MM-dd')
      const endDateStr = format(newEnd, 'yyyy-MM-dd')
      const apiRestaurantId = selectedRestaurant === 'unassigned' ? 'all' : selectedRestaurant

      const reportData = await fetchWaiterReport(selectedWaiter, startDateStr, endDateStr, apiRestaurantId, 10000)
      setWaiterReportData(reportData)

      if (reportData.success) {
        let orders = reportData.orders || []
        orders = filterOrdersByRestaurant(orders, selectedRestaurant, waitresses, restaurants)

        const itemsMap = await fetchMenuItemsForOrders(orders)
        const enhancedOrders = enhanceOrdersWithMenuItems(orders, itemsMap)
        const enrichedOrders = enhancedOrders.map(order => ({
          ...order,
          waiterName: order.waiterName || waitresses.find(w => w._id === order.waiterId)?.name || 'Unknown'
        }))

        setFilteredOrders(enrichedOrders)
        setFilteredOverviewOrders(enrichedOrders)

        const dailySalesMap = new Map<string, { total: number; orders: number }>()
        enrichedOrders.forEach(order => {
          const date = new Date(order.createdAt).toLocaleDateString()
          const existing = dailySalesMap.get(date) || { total: 0, orders: 0 }
          dailySalesMap.set(date, {
            total: existing.total + order.finalAmount,
            orders: existing.orders + 1
          })
        })

        const dailySalesArray = Array.from(dailySalesMap.entries())
          .map(([date, data]) => ({ name: date, sales: data.total, orders: data.orders }))
          .sort((a, b) => new Date(a.name).getTime() - new Date(b.name).getTime())

        setDailySalesData(dailySalesArray)

        // Fetch previous period data
        const previousRange = getPreviousPeriodRange(type, newStart, newEnd)
        const previousStartStr = format(previousRange.start, 'yyyy-MM-dd')
        const previousEndStr = format(previousRange.end, 'yyyy-MM-dd')
        
        const previousReportData = await fetchWaiterReport(selectedWaiter, previousStartStr, previousEndStr, apiRestaurantId, 10000)
        if (previousReportData.success) {
          let previousOrders = previousReportData.orders || []
          previousOrders = filterOrdersByRestaurant(previousOrders, selectedRestaurant, waitresses, restaurants)
          
          const previousItemsMap = await fetchMenuItemsForOrders(previousOrders)
          const enhancedPreviousOrders = enhanceOrdersWithMenuItems(previousOrders, previousItemsMap)
          const enrichedPreviousOrders = enhancedPreviousOrders.map(order => ({
            ...order,
            waiterName: order.waiterName || waitresses.find(w => w._id === order.waiterId)?.name || 'Unknown'
          }))
          
          calculateComparisons(enrichedOrders, enrichedPreviousOrders)
          
          const previousDailyMap = new Map<string, { total: number }>()
          enrichedPreviousOrders.forEach(order => {
            const date = new Date(order.createdAt).toLocaleDateString()
            const existing = previousDailyMap.get(date) || { total: 0 }
            previousDailyMap.set(date, { total: existing.total + order.finalAmount })
          })
          
          const previousDailyArray = Array.from(previousDailyMap.entries())
            .map(([date, data]) => ({ name: date, sales: data.total, orders: 0 }))
            .sort((a, b) => new Date(a.name).getTime() - new Date(b.name).getTime())
          
          setPreviousPeriodSalesData(previousDailyArray)
        }
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Handle restaurant change
  const handleRestaurantChange = async (restaurantId: string) => {
    setSelectedRestaurant(restaurantId)
    setIsRefreshing(true)
    try {
      const startDateStr = format(dateRange.start, 'yyyy-MM-dd')
      const endDateStr = format(dateRange.end, 'yyyy-MM-dd')
      const apiRestaurantId = restaurantId === 'unassigned' ? 'all' : restaurantId

      const reportData = await fetchWaiterReport(selectedWaiter, startDateStr, endDateStr, apiRestaurantId, 10000)
      setWaiterReportData(reportData)

      if (reportData.success) {
        let orders = reportData.orders || []
        orders = filterOrdersByRestaurant(orders, restaurantId, waitresses, restaurants)

        const itemsMap = await fetchMenuItemsForOrders(orders)
        const enhancedOrders = enhanceOrdersWithMenuItems(orders, itemsMap)
        const enrichedOrders = enhancedOrders.map(order => ({
          ...order,
          waiterName: order.waiterName || waitresses.find(w => w._id === order.waiterId)?.name || 'Unknown'
        }))

        setFilteredOrders(enrichedOrders)
        setFilteredOverviewOrders(enrichedOrders)

        const dailySalesMap = new Map<string, { total: number; orders: number }>()
        enrichedOrders.forEach(order => {
          const date = new Date(order.createdAt).toLocaleDateString()
          const existing = dailySalesMap.get(date) || { total: 0, orders: 0 }
          dailySalesMap.set(date, {
            total: existing.total + order.finalAmount,
            orders: existing.orders + 1
          })
        })

        const dailySalesArray = Array.from(dailySalesMap.entries())
          .map(([date, data]) => ({ name: date, sales: data.total, orders: data.orders }))
          .sort((a, b) => new Date(a.name).getTime() - new Date(b.name).getTime())

        setDailySalesData(dailySalesArray)
      }
    } catch (error) {
      console.error('Error loading restaurant data:', error)
    } finally {
      setIsRefreshing(false)
    }
  }

  // Handle waiter change
  const handleWaiterChange = async (waiterId: string) => {
    setSelectedWaiter(waiterId)
    setIsRefreshing(true)
    try {
      const startDateStr = format(dateRange.start, 'yyyy-MM-dd')
      const endDateStr = format(dateRange.end, 'yyyy-MM-dd')
      const apiRestaurantId = selectedRestaurant === 'unassigned' ? 'all' : selectedRestaurant

      const reportData = await fetchWaiterReport(waiterId, startDateStr, endDateStr, apiRestaurantId, 10000)
      setWaiterReportData(reportData)

      if (reportData.success) {
        let orders = reportData.orders || []
        orders = filterOrdersByRestaurant(orders, selectedRestaurant, waitresses, restaurants)

        const itemsMap = await fetchMenuItemsForOrders(orders)
        const enhancedOrders = enhanceOrdersWithMenuItems(orders, itemsMap)
        const enrichedOrders = enhancedOrders.map(order => ({
          ...order,
          waiterName: order.waiterName || waitresses.find(w => w._id === order.waiterId)?.name || 'Unknown'
        }))

        setFilteredOrders(enrichedOrders)
        setFilteredOverviewOrders(enrichedOrders)

        const dailySalesMap = new Map<string, { total: number; orders: number }>()
        enrichedOrders.forEach(order => {
          const date = new Date(order.createdAt).toLocaleDateString()
          const existing = dailySalesMap.get(date) || { total: 0, orders: 0 }
          dailySalesMap.set(date, {
            total: existing.total + order.finalAmount,
            orders: existing.orders + 1
          })
        })

        const dailySalesArray = Array.from(dailySalesMap.entries())
          .map(([date, data]) => ({ name: date, sales: data.total, orders: data.orders }))
          .sort((a, b) => new Date(a.name).getTime() - new Date(b.name).getTime())

        setDailySalesData(dailySalesArray)
      }
    } catch (error) {
      console.error('Error loading waiter data:', error)
    } finally {
      setIsRefreshing(false)
    }
  }

  // Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true)
    await loadData()
    setIsRefreshing(false)
  }

  // Handle view order details
  const handleViewDetails = async (order: Order) => {
    setSelectedOrder(order)
    setLoadingOrderDetails(true)
    try {
      const waitress = await fetchWaitress(order.waiterId)
      setSelectedWaitress(waitress)

      const items = order.items || order.orderItems || []
      const itemIds = items.map((item) => item.menuItemId || item.itemId).filter(id => id)
      
      if (itemIds.length > 0) {
        const itemsMap = await fetchItemsBatch(itemIds)
        setSelectedItemsMap(itemsMap)
      }
    } catch (error) {
      console.error('Error fetching order details:', error)
    } finally {
      setLoadingOrderDetails(false)
    }
  }

  // Calculate metrics
  const overviewMetrics = useMemo(() => {
    const totalSales = filteredOverviewOrders.reduce((sum, order) => sum + order.finalAmount, 0)
    const orderCount = filteredOverviewOrders.length
    const averageOrderValue = orderCount > 0 ? totalSales / orderCount : 0
    return { totalSales, orderCount, averageOrderValue, totalTax: 0, totalDiscounts: 0 }
  }, [filteredOverviewOrders])

  // Prepare restaurant ranking data using dynamic detection
  const restaurantRankingData = useMemo((): RankingItem[] => {
    const restaurantSales = new Map<string, { name: string; sales: number; orders: number }>()
    
    filteredOverviewOrders.forEach(order => {
      const restaurantId = getOrderRestaurantId(order, waitresses, restaurants)
      const restaurant = restaurants.find(r => r._id === restaurantId)
      const restaurantName = restaurant?.name || order.restaurantName || 'Unassigned'
      const existing = restaurantSales.get(restaurantId) || { name: restaurantName, sales: 0, orders: 0 }
      restaurantSales.set(restaurantId, {
        name: restaurantName,
        sales: existing.sales + order.finalAmount,
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

  // Prepare waiter ranking data
  const waiterRankingData = useMemo((): RankingItem[] => {
    const waiterSales = new Map<string, { name: string; sales: number; orders: number }>()
    
    filteredOverviewOrders.forEach(order => {
      const waiterId = order.waiterId
      const waiterName = order.waiterName || 'Unknown'
      const existing = waiterSales.get(waiterId) || { name: waiterName, sales: 0, orders: 0 }
      waiterSales.set(waiterId, {
        name: waiterName,
        sales: existing.sales + order.finalAmount,
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

  // Prepare order type ranking data
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
        sales: existing.sales + order.finalAmount,
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

  // Prepare chart data with comparison
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

  // Get current view chart data
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

  const getCurrentViewTitle = (): string => {
    switch (activeAnalyticsView) {
      case 'sales': return 'Sales Performance Over Time'
      case 'restaurants': return 'Restaurant Sales Ranking'
      case 'waiters': return 'Waiter Performance Ranking'
      case 'orderTypes': return 'Order Type Distribution'
      default: return 'Sales Analytics'
    }
  }

  const getCurrentViewDescription = (): string => {
    switch (activeAnalyticsView) {
      case 'sales': return `Daily sales performance for ${currentRestaurantName}`
      case 'restaurants': return 'Sales breakdown by restaurant location'
      case 'waiters': return 'Individual waiter performance metrics'
      case 'orderTypes': return 'Sales distribution by order type'
      default: return ''
    }
  }

  const currentRestaurantName = selectedRestaurant === 'all'
    ? 'All Restaurants'
    : selectedRestaurant === 'unassigned'
    ? 'Unassigned Orders'
    : restaurants.find(r => r._id === selectedRestaurant)?.name || 'Selected Restaurant'
  
  const currentWaiterName = selectedWaiter === 'all'
    ? 'All Waiters'
    : waitresses.find(w => w._id === selectedWaiter)?.name || 'Selected Waiter'

  const dateRangeLabel = `${format(dateRange.start, 'MMM d, yyyy')} - ${format(dateRange.end, 'MMM d, yyyy')}`

  if (isLoading && !salesData && !waiterReportData) {
    return (
      <div className="flex-col md:flex">
        <div className="flex-1 space-y-4 p-8 pt-6">
          <Skeleton className="w-[250px] h-[36px]" />
          <Skeleton className="w-[200px] h-[40px]" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-[125px] w-full" />
            ))}
          </div>
          <Skeleton className="h-[400px] w-full" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex-1 space-y-6 p-6 lg:p-8">
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

        {/* Main Chart - Bar Chart for all views */}
        <SalesBarChart
          data={getCurrentViewChartData()}
          title={getCurrentViewTitle()}
          description={getCurrentViewDescription()}
          valuePrefix="ETB"
          showComparison={activeAnalyticsView === 'sales'}
          height={400}
          isLoading={isLoading}
        />

        {/* Ranking Panel - Shows additional insights */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Top Restaurants (if not already shown) */}
          {activeAnalyticsView !== 'restaurants' && restaurantRankingData.length > 0 && (
            <RankingAndComparisonPanel
              title="Top Restaurants"
              items={restaurantRankingData.slice(0, 5)}
              valuePrefix="ETB"
              maxItems={5}
              showRanking={true}
              showComparison={false}
              isLoading={isLoading}
            />
          )}

          {/* Top Waiters (if not already shown) */}
          {activeAnalyticsView !== 'waiters' && waiterRankingData.length > 0 && (
            <RankingAndComparisonPanel
              title="Top Performing Waiters"
              items={waiterRankingData.slice(0, 5)}
              valuePrefix="ETB"
              maxItems={5}
              showRanking={true}
              showComparison={false}
              isLoading={isLoading}
            />
          )}

          {/* Order Type Distribution (if not already shown) */}
          {activeAnalyticsView !== 'orderTypes' && orderTypeRankingData.length > 0 && (
            <RankingAndComparisonPanel
              title="Order Type Distribution"
              items={orderTypeRankingData}
              valuePrefix="ETB"
              maxItems={4}
              showRanking={true}
              showComparison={false}
              isLoading={isLoading}
            />
          )}
        </div>

        {/* Recent Orders Table - Show ALL orders now */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-semibold">Recent Orders</CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-sm">
                  Total: {filteredOverviewOrders.length} orders
                </Badge>
                <Button variant="outline" size="sm" onClick={() => handleRefresh()} disabled={isRefreshing}>
                  <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-hidden">
              <Table className="hidden md:table">
                <TableHeader>
                  <TableRow>
                    <TableHead>Order #</TableHead>
                    <TableHead>Restaurant</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Waiter</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOverviewOrders.map((order) => {
                    const restaurantName = getRestaurantDisplayName(order, waitresses, restaurants)
                    const orderType = order.inTable === true 
                      ? { icon: <Home className="h-3 w-3" />, label: "Dine In", color: "bg-green-100 text-green-800" }
                      : order.delivery === true
                      ? { icon: <Truck className="h-3 w-3" />, label: "Delivery", color: "bg-blue-100 text-blue-800" }
                      : { icon: <Package2 className="h-3 w-3" />, label: "POS", color: "bg-purple-100 text-purple-800" }
                    
                    return (
                      <TableRow key={order._id} className="cursor-pointer hover:bg-gray-50">
                        <TableCell className="font-medium">{order.orderNumber}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-indigo-50">
                            <Building2 className="h-3 w-3 mr-1" />
                            {restaurantName}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={orderType.color}>
                            {orderType.icon}
                            <span className="ml-1">{orderType.label}</span>
                          </Badge>
                        </TableCell>
                        <TableCell>{order.waiterName || 'Unknown'}</TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {order.items?.map(item => `${item.name} (${item.quantity})`).join(', ') || '-'}
                        </TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(order.finalAmount)}</TableCell>
                        <TableCell>
                          <Badge className={STATUS_COLORS[order.status] || "bg-gray-100"}>{order.status}</Badge>
                        </TableCell>
                        <TableCell>{new Date(order.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => handleViewDetails(order)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                  {filteredOverviewOrders.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        No orders found for the selected criteria
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>

              {/* Mobile Card View */}
              <div className="md:hidden space-y-3 p-2 bg-gray-50">
                {filteredOverviewOrders.map((order) => {
                  const restaurantName = getRestaurantDisplayName(order, waitresses, restaurants)
                  const orderType = order.inTable === true 
                    ? { icon: <Home className="h-3 w-3" />, label: "Dine In", color: "bg-green-100 text-green-800" }
                    : order.delivery === true
                    ? { icon: <Truck className="h-3 w-3" />, label: "Delivery", color: "bg-blue-100 text-blue-800" }
                    : { icon: <Package2 className="h-3 w-3" />, label: "POS", color: "bg-purple-100 text-purple-800" }
                  
                  return (
                    <div key={order._id} className="bg-white rounded-lg shadow-sm p-4" onClick={() => handleViewDetails(order)}>
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-bold text-sm text-gray-800">#{order.orderNumber}</p>
                          <p className="text-xs text-gray-500">{new Date(order.createdAt).toLocaleString()}</p>
                        </div>
                        <Badge className={STATUS_COLORS[order.status] || "bg-gray-100"}>{order.status}</Badge>
                      </div>

                      <div className="mt-3 space-y-2 text-sm text-gray-700">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Amount</span>
                          <span className="font-semibold">{formatCurrency(order.finalAmount)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Waiter</span>
                          <span>{order.waiterName || 'Unknown'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Restaurant</span>
                          <span>{restaurantName}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Type</span>
                          <Badge className={`${orderType.color} font-normal`}>{orderType.label}</Badge>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {filteredOverviewOrders.length === 0 && (
                <div className="md:hidden text-center py-12">
                  <ShoppingCart className="mx-auto h-12 w-12 text-gray-300" />
                  <p className="mt-4 text-sm text-gray-500">No orders found</p>
                </div>
              )}

              {filteredOverviewOrders.length === 0 && (
                <Table className="hidden md:table">
                  <TableBody><TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No orders found for the selected criteria</TableCell></TableRow></TableBody>
                </Table>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Order Details Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={() => {
        setSelectedOrder(null)
        setSelectedItemsMap(new Map())
      }}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Order Details</DialogTitle>
            <DialogDescription>
              Full details for order #{selectedOrder?.orderNumber}
            </DialogDescription>
          </DialogHeader>
          
          {loadingOrderDetails ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2">Loading order details...</span>
            </div>
          ) : (
            <ScrollArea className="mt-4 max-h-[70vh]">
              {selectedOrder && selectedWaitress && (
                <div className="space-y-6">
                  <div className="flex items-center space-x-4 p-4 bg-muted/30 rounded-lg">
                    {selectedOrder.delivery ? (
                      <>
                        <Avatar className="h-16 w-16">
                          <AvatarFallback><Truck className="h-8 w-8" /></AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold">Delivery Order</h3>
                          {selectedOrder.deliveryInfo ? (
                            <>
                              <p className="text-sm font-medium">{selectedOrder.deliveryInfo.fullName}</p>
                              <p className="text-sm text-muted-foreground flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {selectedOrder.deliveryInfo.phoneNumber}
                              </p>
                              <p className="text-sm text-muted-foreground flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {selectedOrder.deliveryInfo.address}, {selectedOrder.deliveryInfo.city}
                              </p>
                            </>
                          ) : (
                            <p className="text-sm text-muted-foreground">No delivery information available</p>
                          )}
                        </div>
                      </>
                    ) : (
                      <>
                        <Avatar className="h-16 w-16">
                          <AvatarFallback>
                            {selectedWaitress?.name?.split(" ").map((n) => n[0]).join("") || "W"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold">{selectedWaitress?.name || "Unknown Waitress"}</h3>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {selectedWaitress?.phone || "No phone number"}
                          </p>
                          <Badge variant="outline" className="mt-1">
                            {selectedWaitress?.shift || "Unknown"} Shift
                          </Badge>
                        </div>
                      </>
                    )}
                  </div>

                  <Separator />

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground">Order Number</h4>
                      <p className="font-medium">{selectedOrder.orderNumber}</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground">Restaurant</h4>
                      <p>{getRestaurantDisplayName(selectedOrder, waitresses, restaurants)}</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground">Table Number</h4>
                      <p>{selectedOrder.tableNumber}</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground">Number of Guests</h4>
                      <p>{selectedOrder.numberOfGuests}</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground">Payment Method</h4>
                      <Badge variant="secondary">{selectedOrder.paymentMethod || "CASH"}</Badge>
                    </div>
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground">Status</h4>
                      <Badge className={STATUS_COLORS[selectedOrder.status] || "bg-gray-100"}>{selectedOrder.status}</Badge>
                    </div>
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground">Created At</h4>
                      <p>{new Date(selectedOrder.createdAt).toLocaleString()}</p>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h4 className="font-medium flex items-center mb-3">
                      <Utensils className="mr-2 h-4 w-4" /> Order Items
                    </h4>
                    <div className="rounded-md border overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Item Name</TableHead>
                            <TableHead className="text-center">Qty</TableHead>
                            <TableHead className="text-right">Unit Price</TableHead>
                            <TableHead className="text-right">Subtotal</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(selectedOrder.items || selectedOrder.orderItems || []).map((item, index) => {
                            const itemId = item.menuItemId || item.itemId
                            const menuItem = selectedItemsMap.get(itemId || '')
                            return (
                              <TableRow key={item.itemId || index}>
                                <TableCell>
                                  <div>
                                    <span className="font-medium">{menuItem?.name || item.name || 'Unknown Item'}</span>
                                    {item.specialInstructions && (
                                      <p className="text-xs text-muted-foreground mt-0.5">
                                        Note: {item.specialInstructions}
                                      </p>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className="text-center">
                                  <Badge variant="secondary" className="text-xs">{item.quantity}x</Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  {formatCurrency(menuItem?.price || item.price || item.unitPrice || 0)}
                                </TableCell>
                                <TableCell className="text-right font-medium">
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

                  <div className="space-y-2 p-4 bg-muted/20 rounded-lg">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal:</span>
                      <span>{formatCurrency(selectedOrder.totalAmount)}</span>
                    </div>
                    {selectedOrder.discount > 0 && (
                      <div className="flex justify-between text-sm text-red-600">
                        <span>Discount:</span>
                        <span>-{formatCurrency(selectedOrder.discount)}</span>
                      </div>
                    )}
                    {selectedOrder.tax > 0 && (
                      <div className="flex justify-between text-sm">
                        <span>Tax:</span>
                        <span>{formatCurrency(selectedOrder.tax)}</span>
                      </div>
                    )}
                    <Separator className="my-2" />
                    <div className="flex justify-between font-bold text-lg">
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