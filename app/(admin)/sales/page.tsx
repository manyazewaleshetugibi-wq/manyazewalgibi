"use client"

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
  Clock,
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
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, LineChart, Line, Bar, BarChart as ReBarChart } from "recharts"
import * as XLSX from "xlsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Label } from "@/components/ui/label"
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths, subYears, startOfYear, endOfYear, getDay, setDay, previousDay, nextDay } from "date-fns"

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

// Enhanced response type for waiterreport API
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

// Restaurant options
const RESTAURANTS = [
  { id: "all", name: "All Restaurants", shortName: "All", color: "gray", showAllOrders: true },
  { id: "manyazewal1", name: "Manyazewal Eshetu Gibi 1", shortName: "Manyazewal 1", color: "indigo", showAllOrders: false },
  { id: "manyazewal2", name: "Manyazewal Eshetu Gibi 2", shortName: "Manyazewal 2", color: "rose", showAllOrders: false },
  { id: "unassigned", name: "Unassigned Orders", shortName: "Unassigned", color: "gray", showAllOrders: false }
]

// Day of week options
const DAYS_OF_WEEK = [
  { value: "monday", label: "Monday", dayIndex: 1 },
  { value: "tuesday", label: "Tuesday", dayIndex: 2 },
  { value: "wednesday", label: "Wednesday", dayIndex: 3 },
  { value: "thursday", label: "Thursday", dayIndex: 4 },
  { value: "friday", label: "Friday", dayIndex: 5 },
  { value: "saturday", label: "Saturday", dayIndex: 6 },
  { value: "sunday", label: "Sunday", dayIndex: 0 },
]

// Cache for menu items
const menuItemsCache = new Map<string, { data: Map<string, MenuItem>; timestamp: number }>()
const CACHE_DURATION = 5 * 60 * 1000
const BATCH_SIZE_LIMIT = 100

// Helper function to get restaurant ID from order
const getOrderRestaurantId = (order: Order): string => {
  // First priority: use restaurantId if it exists
  if (order.restaurantId) {
    if (order.restaurantId === "manyazewal1" || order.restaurantId === "manyazewal2") {
      return order.restaurantId
    }
  }
  // Second: use restaurantName
  if (order.restaurantName) {
    const name = order.restaurantName.toLowerCase()
    if (name.includes("1") || name === "manyazewal eshetu gibi 1") {
      return "manyazewal1"
    }
    if (name.includes("2") || name === "manyazewal eshetu gibi 2") {
      return "manyazewal2"
    }
  }
  // Delivery orders default to Manyazewal 1
  if (order.delivery === true) {
    return "manyazewal1"
  }
  // If no restaurant info found, return "unassigned"
  return "unassigned"
}

// Helper function to get restaurant display name
const getRestaurantDisplayName = (order: Order): string => {
  const restaurantId = getOrderRestaurantId(order)
  if (restaurantId === "manyazewal1") return "Manyazewal 1"
  if (restaurantId === "manyazewal2") return "Manyazewal 2"
  if (restaurantId === "unassigned") return "Unassigned"
  return order.restaurantName || "Unknown"
}

// Helper function to check if order has restaurant info
const hasRestaurantInfo = (order: Order): boolean => {
  return !!(order.restaurantId || order.restaurantName)
}

// Filter orders by restaurant based on selection logic
const filterOrdersByRestaurant = (orders: Order[], restaurantId: string): Order[] => {
  if (restaurantId === 'all') {
    // Show ALL orders when "All Restaurants" is selected
    return orders
  }
  
  if (restaurantId === 'unassigned') {
    // Show only orders without restaurant info
    return orders.filter(order => !hasRestaurantInfo(order))
  }
  
  // Show only orders belonging to the specific restaurant
  return orders.filter(order => {
    const orderRestaurantId = getOrderRestaurantId(order)
    return orderRestaurantId === restaurantId && hasRestaurantInfo(order)
  })
}

// Batch fetch items with caching
const fetchItemsBatch = async (itemIds: string[]): Promise<Map<string, MenuItem>> => {
  if (itemIds.length === 0) return new Map()
  
  const uniqueIds = [...new Set(itemIds)]
  const limitedIds = uniqueIds.slice(0, BATCH_SIZE_LIMIT)
  const cacheKey = limitedIds.sort().join(',')
  
  const cached = menuItemsCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data
  }
  
  try {
    const response = await fetch(`/api/items?ids=${limitedIds.join(',')}`)
    if (!response.ok) throw new Error("Failed to fetch items")
    const data = await response.json()
    
    const itemsMap = new Map<string, MenuItem>()
    const items = data.items || data || []
    items.forEach((item: MenuItem) => {
      if (item?._id) {
        itemsMap.set(item._id, item)
      }
    })
    
    menuItemsCache.set(cacheKey, { data: itemsMap, timestamp: Date.now() })
    return itemsMap
  } catch (error) {
    console.error("Error fetching items batch:", error)
    return new Map()
  }
}

// Original API function - kept for backward compatibility
async function fetchSalesData(waiterId?: string): Promise<SalesData> {
  const params = new URLSearchParams()
  if (waiterId && waiterId !== 'all') {
    params.append('waiterId', waiterId)
  }
  const url = `/api/order/report${params.toString() ? `?${params.toString()}` : ''}`
  const response = await fetch(url)
  const data = await response.json()
  return data
}

// Enhanced API function using waiterreport endpoint with restaurant filter
async function fetchWaiterReport(waiterId?: string, startDate?: string, endDate?: string, restaurantId?: string): Promise<WaiterReportResponse> {
  const params = new URLSearchParams()

  if (startDate) {
    params.append('startDate', startDate)
  }
  if (endDate) {
    params.append('endDate', endDate)
  }
  if (waiterId && waiterId !== 'all') {
    params.append('waiterId', waiterId)
  }
  // Only send restaurantId to API if it's a specific restaurant (not 'all' or 'unassigned')
  if (restaurantId && restaurantId !== 'all' && restaurantId !== 'unassigned') {
    params.append('restaurantId', restaurantId)
  }

  const url = `/api/order/waiterreport${params.toString() ? `?${params.toString()}` : ''}`
  const response = await fetch(url)
  const data = await response.json()
  return data
}

async function fetchWaitresses(): Promise<Waitress[]> {
  const response = await fetch("/api/waitress")
  const data = await response.json()
  return data
}

async function fetchWaitress(id: string): Promise<Waitress> {
  const response = await fetch(`/api/waitress/${id}`)
  const data = await response.json()
  return data
}

function exportToExcel(data: any[], filename: string) {
  const worksheet = XLSX.utils.json_to_sheet(data)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, "Sales Data")
  XLSX.writeFile(workbook, `${filename}.xlsx`)
}

function SalesChart({ data, type = "line" }: { data: Array<{ date: string; total: number; orders: number }>, type?: "line" | "bar" }) {
  const chartData = data.map(item => ({
    name: item.date,
    total: item.total,
    orders: item.orders,
    date: item.date,
  }))

  return (
    <ResponsiveContainer width="100%" height={350}>
      {type === "line" ? (
        <LineChart data={chartData}>
          <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis
            yAxisId="left"
            stroke="#888888"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `${value} ETB`}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            stroke="#888888"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={{ background: "#333", border: "none", borderRadius: "8px" }}
            labelStyle={{ color: "#fff" }}
            formatter={(value, name) => [`${name === 'total' ? formatCurrency(value as number) : value}`, name === 'total' ? 'Sales' : 'Orders']}
          />
          <Legend />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="total"
            stroke="#adfa1d"
            strokeWidth={2}
            dot={{ fill: "#adfa1d", strokeWidth: 2 }}
            name="Sales (ETB)"
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="orders"
            stroke="#8884d8"
            strokeWidth={2}
            dot={{ fill: "#8884d8", strokeWidth: 2 }}
            name="Orders"
          />
        </LineChart>
      ) : (
        <ReBarChart data={chartData}>
          <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis
            yAxisId="left"
            stroke="#888888"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `${value} ETB`}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            stroke="#888888"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={{ background: "#333", border: "none", borderRadius: "8px" }}
            labelStyle={{ color: "#fff" }}
            formatter={(value, name) => [`${name === 'total' ? formatCurrency(value as number) : value}`, name === 'total' ? 'Sales' : 'Orders']}
          />
          <Legend />
          <Bar yAxisId="left" dataKey="total" fill="#adfa1d" radius={[4, 4, 0, 0]} name="Sales (ETB)" />
          <Bar yAxisId="right" dataKey="orders" fill="#8884d8" radius={[4, 4, 0, 0]} name="Orders" />
        </ReBarChart>
      )}
    </ResponsiveContainer>
  )
}

function getDateRange(type: 'today' | 'yesterday' | 'week' | 'month' | 'year' | 'custom' | 'dayOfWeek', selectedDayOfWeek?: number, referenceDate?: Date) {
  const now = new Date();
  const start = new Date();
  const end = new Date();

  switch (type) {
    case 'today':
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'yesterday':
      start.setDate(now.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      end.setDate(now.getDate() - 1);
      end.setHours(23, 59, 59, 999);
      break;
    case 'week':
      start.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1));
      start.setHours(0, 0, 0, 0);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      break;
    case 'month':
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(now.getMonth() + 1, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'year':
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(11, 31);
      end.setHours(23, 59, 59, 999);
      break;
    case 'dayOfWeek':
      if (selectedDayOfWeek !== undefined && referenceDate) {
        // Get the most recent occurrence of the selected day of week
        const targetDate = setDay(referenceDate, selectedDayOfWeek);
        // If the target date is in the future, go back 7 days
        if (targetDate > referenceDate) {
          targetDate.setDate(targetDate.getDate() - 7);
        }
        start.setTime(targetDate.getTime());
        start.setHours(0, 0, 0, 0);
        end.setTime(targetDate.getTime());
        end.setHours(23, 59, 59, 999);
      }
      break;
  }

  return { start, end };
}

const getOrderTypeBadge = (order: Order) => {
  if (order.inTable === true) {
    return { icon: <Home className="h-3 w-3" />, label: "In-Table", color: "bg-green-100 text-green-800 border-green-200" }
  } else if (order.delivery === true) {
    return { icon: <Truck className="h-3 w-3" />, label: "Delivery", color: "bg-blue-100 text-blue-800 border-blue-200" }
  } else {
    return { icon: <ShoppingCart className="h-3 w-3" />, label: "POS", color: "bg-purple-100 text-purple-800 border-purple-200" }
  }
}

const statusColors: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  CONFIRMED: "bg-blue-100 text-blue-800",
  PREPARING: "bg-purple-100 text-purple-800",
  PICKUP: "bg-indigo-100 text-indigo-800",
  SERVED: "bg-green-100 text-green-800",
  COMPLETED: "bg-teal-100 text-teal-800",
  CANCELLED: "bg-red-100 text-red-800",
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-ET', { style: 'currency', currency: 'ETB' }).format(amount || 0)
}

export default function DashboardPage() {
  const [salesData, setSalesData] = useState<SalesData | null>(null)
  const [waiterReportData, setWaiterReportData] = useState<WaiterReportResponse | null>(null)
  const [waitresses, setWaitresses] = useState<Waitress[]>([])
  const [selectedWaiter, setSelectedWaiter] = useState<string>('all')
  const [selectedRestaurant, setSelectedRestaurant] = useState<string>('all')
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([])
  const [filteredOverviewOrders, setFilteredOverviewOrders] = useState<Order[]>([])
  const [dateRange, setDateRange] = useState<{ start: Date | null; end: Date | null }>({ start: null, end: null })
  const [filterType, setFilterType] = useState<'today' | 'yesterday' | 'week' | 'month' | 'year' | 'custom' | 'dayOfWeek'>('today')
  const [selectedDayOfWeek, setSelectedDayOfWeek] = useState<string>('')
  const [sortBy, setSortBy] = useState<keyof Order>("createdAt")
  const [sortOrder, setSortOrder] = useState("desc")
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [selectedWaitress, setSelectedWaitress] = useState<Waitress | null>(null)
  const [selectedItemsMap, setSelectedItemsMap] = useState<Map<string, MenuItem>>(new Map())
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [chartType, setChartType] = useState<"line" | "bar">("line")
  const [useEnhancedAPI, setUseEnhancedAPI] = useState<boolean>(true)
  const [loadingOrderDetails, setLoadingOrderDetails] = useState(false)
  const [globalItemsMap, setGlobalItemsMap] = useState<Map<string, MenuItem>>(new Map())
  const [dailySalesData, setDailySalesData] = useState<Array<{ date: string; total: number; orders: number }>>([])

  const initialFetchDone = useRef(false)
  const waitressesFetched = useRef(false)

  // Fetch waitresses first - only once
  useEffect(() => {
    if (!waitressesFetched.current) {
      waitressesFetched.current = true
      loadWaitresses()
    }
  }, [])

  // Fetch initial data after waitresses are loaded
  useEffect(() => {
    if (waitresses.length > 0 && !initialFetchDone.current) {
      initialFetchDone.current = true
      loadData('all')
    }
  }, [waitresses])

  const loadWaitresses = async () => {
    try {
      const data = await fetchWaitresses()
      setWaitresses(data)
    } catch (error) {
      console.error('Error loading waitresses:', error)
    }
  }

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
      
      return {
        ...order,
        items: enhancedItems,
        orderItems: enhancedItems,
      }
    })
  }, [])

  // Fetch menu items for all orders
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

  const loadData = async (waiterId: string) => {
    setIsLoading(true)
    try {
      let start: Date, end: Date;
      
      if (filterType === 'dayOfWeek' && selectedDayOfWeek) {
        const dayConfig = DAYS_OF_WEEK.find(d => d.value === selectedDayOfWeek);
        if (dayConfig) {
          const range = getDateRange('dayOfWeek', dayConfig.dayIndex, new Date());
          start = range.start;
          end = range.end;
        } else {
          const range = getDateRange('today');
          start = range.start;
          end = range.end;
        }
      } else if (filterType === 'custom') {
        start = dateRange.start || new Date();
        end = dateRange.end || new Date();
      } else {
        const range = getDateRange(filterType as any);
        start = range.start;
        end = range.end;
      }
      
      const startDateStr = format(start, 'yyyy-MM-dd')
      const endDateStr = format(end, 'yyyy-MM-dd')

      if (useEnhancedAPI) {
        const reportData = await fetchWaiterReport(waiterId, startDateStr, endDateStr, selectedRestaurant)
        setWaiterReportData(reportData)

        if (reportData.success) {
          let orders = reportData.orders || []
          
          // Apply restaurant filter based on selection
          orders = filterOrdersByRestaurant(orders, selectedRestaurant)
          
          // Fetch menu items for all orders
          const itemsMap = await fetchMenuItemsForOrders(orders)
          
          // Enhance orders with menu item data
          const enhancedOrders = enhanceOrdersWithMenuItems(orders, itemsMap)
          
          // Enrich with waiter names
          const enrichedOrders = enhancedOrders.map(order => ({
            ...order,
            waiterName: waitresses.find(w => w._id === order.waiterId)?.name || 'Unknown'
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
            .map(([date, data]) => ({ date, total: data.total, orders: data.orders }))
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
          
          setDailySalesData(dailySalesArray)
        }
      } else {
        const data = await fetchSalesData(waiterId)
        setSalesData(data)
        
        let orders = data.orders || []
        orders = filterOrdersByRestaurant(orders, selectedRestaurant)
        
        const dateFiltered = orders.filter(order => {
          const orderDate = new Date(order.createdAt)
          return orderDate >= start && orderDate <= end
        })
        
        const itemsMap = await fetchMenuItemsForOrders(dateFiltered)
        const enhancedOrders = enhanceOrdersWithMenuItems(dateFiltered, itemsMap)
        const enrichedOrders = enhancedOrders.map(order => ({
          ...order,
          waiterName: waitresses.find(w => w._id === order.waiterId)?.name || 'Unknown'
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
          .map(([date, data]) => ({ date, total: data.total, orders: data.orders }))
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        
        setDailySalesData(dailySalesArray)
      }

      setDateRange({ start, end })
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleWaiterChange = async (waiterId: string) => {
    setSelectedWaiter(waiterId)
    setIsRefreshing(true)
    try {
      const { start, end } = dateRange
      if (start && end) {
        const startDateStr = format(start, 'yyyy-MM-dd')
        const endDateStr = format(end, 'yyyy-MM-dd')

        if (useEnhancedAPI) {
          const reportData = await fetchWaiterReport(waiterId, startDateStr, endDateStr, selectedRestaurant)
          setWaiterReportData(reportData)

          if (reportData.success) {
            let orders = reportData.orders || []
            
            // Apply restaurant filter
            orders = filterOrdersByRestaurant(orders, selectedRestaurant)
            
            // Use existing items map or fetch new ones
            let itemsMap = globalItemsMap
            if (itemsMap.size === 0) {
              itemsMap = await fetchMenuItemsForOrders(orders)
            }
            
            const enhancedOrders = enhanceOrdersWithMenuItems(orders, itemsMap)
            const enrichedOrders = enhancedOrders.map(order => ({
              ...order,
              waiterName: waitresses.find(w => w._id === order.waiterId)?.name || 'Unknown'
            }))
            
            setFilteredOrders(enrichedOrders)
            setFilteredOverviewOrders(enrichedOrders)
            
            // Update daily sales
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
              .map(([date, data]) => ({ date, total: data.total, orders: data.orders }))
              .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            
            setDailySalesData(dailySalesArray)
          }
        } else {
          const data = await fetchSalesData(waiterId)
          setSalesData(data)
          
          let orders = data.orders || []
          orders = filterOrdersByRestaurant(orders, selectedRestaurant)
          
          const filtered = orders.filter(order => {
            const orderDate = new Date(order.createdAt)
            return orderDate >= start && orderDate <= end
          })
          
          let itemsMap = globalItemsMap
          if (itemsMap.size === 0) {
            itemsMap = await fetchMenuItemsForOrders(filtered)
          }
          
          const enhancedOrders = enhanceOrdersWithMenuItems(filtered, itemsMap)
          const enrichedOrders = enhancedOrders.map(order => ({
            ...order,
            waiterName: waitresses.find(w => w._id === order.waiterId)?.name || 'Unknown'
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
            .map(([date, data]) => ({ date, total: data.total, orders: data.orders }))
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
          
          setDailySalesData(dailySalesArray)
        }
      }
    } catch (error) {
      console.error('Error loading waiter data:', error)
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleRestaurantChange = async (restaurantId: string) => {
    setSelectedRestaurant(restaurantId)
    setIsRefreshing(true)
    try {
      const { start, end } = dateRange
      if (start && end) {
        const startDateStr = format(start, 'yyyy-MM-dd')
        const endDateStr = format(end, 'yyyy-MM-dd')

        // For unassigned, we don't send restaurantId to API
        const apiRestaurantId = restaurantId === 'unassigned' ? 'all' : restaurantId

        if (useEnhancedAPI) {
          const reportData = await fetchWaiterReport(selectedWaiter, startDateStr, endDateStr, apiRestaurantId)
          setWaiterReportData(reportData)

          if (reportData.success) {
            let orders = reportData.orders || []
            
            // Apply restaurant filter locally
            orders = filterOrdersByRestaurant(orders, restaurantId)
            
            const itemsMap = await fetchMenuItemsForOrders(orders)
            const enhancedOrders = enhanceOrdersWithMenuItems(orders, itemsMap)
            const enrichedOrders = enhancedOrders.map(order => ({
              ...order,
              waiterName: waitresses.find(w => w._id === order.waiterId)?.name || 'Unknown'
            }))
            
            setFilteredOrders(enrichedOrders)
            setFilteredOverviewOrders(enrichedOrders)
            
            // Update daily sales
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
              .map(([date, data]) => ({ date, total: data.total, orders: data.orders }))
              .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            
            setDailySalesData(dailySalesArray)
          }
        } else {
          const data = await fetchSalesData(selectedWaiter)
          setSalesData(data)
          
          let orders = data.orders || []
          orders = filterOrdersByRestaurant(orders, restaurantId)
          
          const filtered = orders.filter(order => {
            const orderDate = new Date(order.createdAt)
            return orderDate >= start && orderDate <= end
          })
          
          const itemsMap = await fetchMenuItemsForOrders(filtered)
          const enhancedOrders = enhanceOrdersWithMenuItems(filtered, itemsMap)
          const enrichedOrders = enhancedOrders.map(order => ({
            ...order,
            waiterName: waitresses.find(w => w._id === order.waiterId)?.name || 'Unknown'
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
            .map(([date, data]) => ({ date, total: data.total, orders: data.orders }))
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
          
          setDailySalesData(dailySalesArray)
        }
      }
    } catch (error) {
      console.error('Error loading restaurant data:', error)
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      const { start, end } = dateRange
      if (start && end) {
        const startDateStr = format(start, 'yyyy-MM-dd')
        const endDateStr = format(end, 'yyyy-MM-dd')

        const apiRestaurantId = selectedRestaurant === 'unassigned' ? 'all' : selectedRestaurant

        if (useEnhancedAPI) {
          const reportData = await fetchWaiterReport(selectedWaiter, startDateStr, endDateStr, apiRestaurantId)
          setWaiterReportData(reportData)

          if (reportData.success) {
            let orders = reportData.orders || []
            
            // Apply restaurant filter
            orders = filterOrdersByRestaurant(orders, selectedRestaurant)
            
            const itemsMap = await fetchMenuItemsForOrders(orders)
            const enhancedOrders = enhanceOrdersWithMenuItems(orders, itemsMap)
            const enrichedOrders = enhancedOrders.map(order => ({
              ...order,
              waiterName: waitresses.find(w => w._id === order.waiterId)?.name || 'Unknown'
            }))
            
            setFilteredOrders(enrichedOrders)
            setFilteredOverviewOrders(enrichedOrders)
            
            // Update daily sales
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
              .map(([date, data]) => ({ date, total: data.total, orders: data.orders }))
              .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            
            setDailySalesData(dailySalesArray)
          }
        } else {
          const data = await fetchSalesData(selectedWaiter)
          setSalesData(data)
          
          let orders = data.orders || []
          orders = filterOrdersByRestaurant(orders, selectedRestaurant)
          
          const filtered = orders.filter(order => {
            const orderDate = new Date(order.createdAt)
            return orderDate >= start && orderDate <= end
          })
          
          const itemsMap = await fetchMenuItemsForOrders(filtered)
          const enhancedOrders = enhanceOrdersWithMenuItems(filtered, itemsMap)
          const enrichedOrders = enhancedOrders.map(order => ({
            ...order,
            waiterName: waitresses.find(w => w._id === order.waiterId)?.name || 'Unknown'
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
            .map(([date, data]) => ({ date, total: data.total, orders: data.orders }))
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
          
          setDailySalesData(dailySalesArray)
        }
      }
    } catch (error) {
      console.error('Error refreshing data:', error)
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleDayOfWeekChange = async (dayOfWeek: string) => {
    setSelectedDayOfWeek(dayOfWeek)
    setFilterType('dayOfWeek')
    
    const dayConfig = DAYS_OF_WEEK.find(d => d.value === dayOfWeek)
    if (dayConfig) {
      const { start, end } = getDateRange('dayOfWeek', dayConfig.dayIndex, new Date())
      setDateRange({ start, end })
      
      const startDateStr = format(start, 'yyyy-MM-dd')
      const endDateStr = format(end, 'yyyy-MM-dd')
      const apiRestaurantId = selectedRestaurant === 'unassigned' ? 'all' : selectedRestaurant
      
      if (useEnhancedAPI) {
        try {
          const reportData = await fetchWaiterReport(selectedWaiter, startDateStr, endDateStr, apiRestaurantId)
          setWaiterReportData(reportData)
          
          if (reportData.success) {
            let orders = reportData.orders || []
            orders = filterOrdersByRestaurant(orders, selectedRestaurant)
            
            const itemsMap = await fetchMenuItemsForOrders(orders)
            const enhancedOrders = enhanceOrdersWithMenuItems(orders, itemsMap)
            const enrichedOrders = enhancedOrders.map(order => ({
              ...order,
              waiterName: waitresses.find(w => w._id === order.waiterId)?.name || 'Unknown'
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
              .map(([date, data]) => ({ date, total: data.total, orders: data.orders }))
              .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            
            setDailySalesData(dailySalesArray)
          }
        } catch (error) {
          console.error('Error fetching day of week data:', error)
        }
      } else {
        try {
          const data = await fetchSalesData(selectedWaiter)
          setSalesData(data)
          
          let orders = data.orders || []
          orders = filterOrdersByRestaurant(orders, selectedRestaurant)
          
          const filtered = orders.filter(order => {
            const orderDate = new Date(order.createdAt)
            return orderDate >= start && orderDate <= end
          })
          
          const itemsMap = await fetchMenuItemsForOrders(filtered)
          const enhancedOrders = enhanceOrdersWithMenuItems(filtered, itemsMap)
          const enrichedOrders = enhancedOrders.map(order => ({
            ...order,
            waiterName: waitresses.find(w => w._id === order.waiterId)?.name || 'Unknown'
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
            .map(([date, data]) => ({ date, total: data.total, orders: data.orders }))
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
          
          setDailySalesData(dailySalesArray)
        } catch (error) {
          console.error('Error fetching day of week data:', error)
        }
      }
    }
  }

  const handleFilterChange = (type: 'today' | 'yesterday' | 'week' | 'month' | 'year' | 'custom', customStart?: Date | null, customEnd?: Date | null) => {
    setFilterType(type)
    setSelectedDayOfWeek('') // Reset day of week selection
    let start: Date | null = null
    let end: Date | null = null

    if (type === 'custom' && customStart && customEnd) {
      start = customStart
      end = customEnd
    } else if (type !== 'custom') {
      const range = getDateRange(type)
      start = range.start
      end = range.end
    }

    if (start && end) {
      setDateRange({ start, end })
      
      const fetchWithNewDateRange = async () => {
        const startDateStr = format(start, 'yyyy-MM-dd')
        const endDateStr = format(end, 'yyyy-MM-dd')

        const apiRestaurantId = selectedRestaurant === 'unassigned' ? 'all' : selectedRestaurant

        if (useEnhancedAPI) {
          try {
            const reportData = await fetchWaiterReport(selectedWaiter, startDateStr, endDateStr, apiRestaurantId)
            setWaiterReportData(reportData)

            if (reportData.success) {
              let orders = reportData.orders || []
              
              // Apply restaurant filter
              orders = filterOrdersByRestaurant(orders, selectedRestaurant)
              
              const itemsMap = await fetchMenuItemsForOrders(orders)
              const enhancedOrders = enhanceOrdersWithMenuItems(orders, itemsMap)
              const enrichedOrders = enhancedOrders.map(order => ({
                ...order,
                waiterName: waitresses.find(w => w._id === order.waiterId)?.name || 'Unknown'
              }))
              
              setFilteredOrders(enrichedOrders)
              setFilteredOverviewOrders(enrichedOrders)
              
              // Update daily sales
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
                .map(([date, data]) => ({ date, total: data.total, orders: data.orders }))
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
              
              setDailySalesData(dailySalesArray)
            }
          } catch (error) {
            console.error('Error fetching with new date range:', error)
          }
        } else {
          try {
            const data = await fetchSalesData(selectedWaiter)
            setSalesData(data)
            
            let orders = data.orders || []
            orders = filterOrdersByRestaurant(orders, selectedRestaurant)
            
            const filtered = orders.filter(order => {
              const orderDate = new Date(order.createdAt)
              return orderDate >= start && orderDate <= end
            })
            
            const itemsMap = await fetchMenuItemsForOrders(filtered)
            const enhancedOrders = enhanceOrdersWithMenuItems(filtered, itemsMap)
            const enrichedOrders = enhancedOrders.map(order => ({
              ...order,
              waiterName: waitresses.find(w => w._id === order.waiterId)?.name || 'Unknown'
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
              .map(([date, data]) => ({ date, total: data.total, orders: data.orders }))
              .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            
            setDailySalesData(dailySalesArray)
          } catch (error) {
            console.error('Error fetching with new date range:', error)
          }
        }
      }

      fetchWithNewDateRange()
    }
  }

  const calculateMetrics = (orders: Order[]) => {
    const totalSales = orders.reduce((sum, order) => sum + order.finalAmount, 0)
    const totalTax = orders.reduce((sum, order) => sum + order.tax, 0)
    const totalDiscounts = orders.reduce((sum, order) => sum + order.discount, 0)

    return {
      totalSales,
      orderCount: orders.length,
      totalTax,
      totalDiscounts,
      averageOrderValue: orders.length > 0 ? totalSales / orders.length : 0
    }
  }

  const getSalesByWaiter = (orders: Order[]) => {
    const waiterSales: Record<string, { name: string; sales: number; orders: number }> = {}

    orders.forEach(order => {
      const waiterId = order.waiterId
      const waiterName = order.waiterName || 'Unknown'

      if (!waiterSales[waiterId]) {
        waiterSales[waiterId] = { name: waiterName, sales: 0, orders: 0 }
      }

      waiterSales[waiterId].sales += order.finalAmount
      waiterSales[waiterId].orders += 1
    })

    return Object.values(waiterSales).sort((a, b) => b.sales - a.sales)
  }

  const getSalesByRestaurant = (orders: Order[]) => {
    const restaurantSales: Record<string, { name: string; sales: number; orders: number }> = {}

    orders.forEach(order => {
      const restaurantId = getOrderRestaurantId(order)
      let restaurantName = getRestaurantDisplayName(order)

      if (!restaurantSales[restaurantId]) {
        restaurantSales[restaurantId] = { name: restaurantName, sales: 0, orders: 0 }
      }

      restaurantSales[restaurantId].sales += order.finalAmount
      restaurantSales[restaurantId].orders += 1
    })

    return Object.values(restaurantSales).sort((a, b) => b.sales - a.sales)
  }

  const handleSort = (field: keyof Order) => {
    const order = field === sortBy && sortOrder === "asc" ? "desc" : "asc"
    setSortBy(field)
    setSortOrder(order)
    const sorted = [...filteredOrders].sort((a, b) => {
      const aValue = a[field]
      const bValue = b[field]

      if (aValue === bValue) return 0
      if (aValue === undefined || aValue === null) return 1
      if (bValue === undefined || bValue === null) return -1
      if (aValue < bValue) return order === "asc" ? -1 : 1
      if (aValue > bValue) return order === "asc" ? 1 : -1
      return 0
    })
    setFilteredOrders(sorted)
  }

  const handleExport = (section: 'overview' | 'analytics') => {
    const data = section === 'overview' ? filteredOverviewOrders : filteredOrders
    const waiterName = selectedWaiter === 'all'
      ? 'all_waiters'
      : waitresses.find(w => w._id === selectedWaiter)?.name || 'selected_waiter'
    const restaurantName = selectedRestaurant === 'all'
      ? 'all_restaurants'
      : selectedRestaurant === 'unassigned'
      ? 'unassigned_orders'
      : RESTAURANTS.find(r => r.id === selectedRestaurant)?.shortName || 'selected_restaurant'
    const filename = section === 'overview'
      ? `overview_sales_report_${restaurantName}_${waiterName}_${new Date().toISOString().split('T')[0]}`
      : `analytics_sales_report_${restaurantName}_waiter_${waiterName}_${new Date().toISOString().split('T')[0]}`

    const exportData = data.map(order => ({
      'Order Number': order.orderNumber,
      'Table Number': order.tableNumber,
      'Restaurant': getRestaurantDisplayName(order),
      'Waiter': order.waiterName || 'Unknown',
      'Total Amount': order.totalAmount,
      'Discount': order.discount,
      'Tax': order.tax,
      'Final Amount': order.finalAmount,
      'Status': order.status,
      'Payment Method': order.paymentMethod,
      'Number of Guests': order.numberOfGuests,
      'Items': order.items?.map(item => `${item.name} (${item.quantity}x @ ${formatCurrency(item.price)})`).join('; ') || '',
      'Created Date': new Date(order.createdAt).toLocaleDateString(),
      'Created Time': new Date(order.createdAt).toLocaleTimeString(),
    }))

    exportToExcel(exportData, filename)
  }

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

  const getOrderDisplayItems = (order: Order): OrderItem[] => {
    return order.items || order.orderItems || []
  }

  const getItemWithDetails = (item: OrderItem): OrderItem & { itemDetails?: MenuItem } => {
    const itemId = item.menuItemId || item.itemId
    const itemDetails = selectedItemsMap.get(itemId || '')
    return {
      ...item,
      name: itemDetails?.name || item.name || 'Unknown Item',
      price: itemDetails?.price || item.price || item.unitPrice || 0,
      subtotal: item.subtotal || ((itemDetails?.price || item.price || item.unitPrice || 0) * (item.quantity || 0)),
      itemDetails,
    }
  }

  const overviewMetrics = useMemo(() => calculateMetrics(filteredOverviewOrders), [filteredOverviewOrders])
  const waiterSales = useMemo(() => getSalesByWaiter(filteredOverviewOrders), [filteredOverviewOrders])
  const restaurantSales = useMemo(() => getSalesByRestaurant(filteredOverviewOrders), [filteredOverviewOrders])

  const currentWaiterName = selectedWaiter === 'all'
    ? 'All Waiters'
    : waitresses.find(w => w._id === selectedWaiter)?.name || 'Selected Waiter'
  
  const currentRestaurantName = selectedRestaurant === 'all'
    ? 'All Restaurants'
    : selectedRestaurant === 'unassigned'
    ? 'Unassigned Orders'
    : RESTAURANTS.find(r => r.id === selectedRestaurant)?.name || 'Selected Restaurant'

  const enhancedSummary = waiterReportData?.summary

  if (isLoading && !salesData && !waiterReportData) {
    return (
      <div className="flex-col md:flex">
        <div className="flex-1 space-y-4 p-8 pt-6">
          <div className="flex items-center justify-between">
            <Skeleton className="w-[250px] h-[36px]" />
            <Skeleton className="w-[200px] h-[40px]" />
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-[125px] w-full" />
            ))}
          </div>
          <Skeleton className="h-[350px] w-full" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex-col md:flex">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Sales Dashboard</h2>
            <p className="text-muted-foreground">
              {currentRestaurantName} • {currentWaiterName} • {filteredOverviewOrders.length} orders in selected period
              {selectedRestaurant === 'all' && " (All orders including unassigned)"}
              {selectedRestaurant === 'unassigned' && " (Orders without restaurant assignment)"}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            {/* Enhanced API Toggle Button */}
            <Button
              variant={useEnhancedAPI ? "default" : "outline"}
              size="sm"
              onClick={() => setUseEnhancedAPI(!useEnhancedAPI)}
              className="mr-2"
            >
              {useEnhancedAPI ? "Enhanced API" : "Standard API"}
            </Button>
            
            <Select value={selectedRestaurant} onValueChange={handleRestaurantChange}>
              <SelectTrigger className="w-[200px]">
                <Building2 className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by Restaurant" />
              </SelectTrigger>
              <SelectContent>
                {RESTAURANTS.map((restaurant) => (
                  <SelectItem key={restaurant.id} value={restaurant.id}>
                    {restaurant.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedWaiter} onValueChange={handleWaiterChange}>
              <SelectTrigger className="w-[250px]">
                <Users className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by Waiter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Waiters</SelectItem>
                {waitresses.map((waiter) => (
                  <SelectItem key={waiter._id} value={waiter._id}>
                    {waiter.name} - {waiter.shift} Shift
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={handleRefresh} disabled={isRefreshing}>
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Enhanced Summary Section */}
        {useEnhancedAPI && enhancedSummary && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-4">
            <Card className="bg-primary/5 border-primary/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{enhancedSummary.totalOrders}</div>
                <p className="text-xs text-muted-foreground">{formatCurrency(enhancedSummary.totalSales)} revenue</p>
              </CardContent>
            </Card>
            <Card className="bg-primary/5 border-primary/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Items Sold</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{enhancedSummary.totalItems}</div>
                <p className="text-xs text-muted-foreground">{enhancedSummary.totalGuests} guests served</p>
              </CardContent>
            </Card>
            <Card className="bg-primary/5 border-primary/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Average Order Value</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(enhancedSummary.averageOrderValue)}</div>
                <p className="text-xs text-muted-foreground">per order</p>
              </CardContent>
            </Card>
            <Card className="bg-primary/5 border-primary/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Tax & Discounts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm">
                  <p>Tax: {formatCurrency(enhancedSummary.totalTax)}</p>
                  <p>Discount: {formatCurrency(enhancedSummary.totalDiscount)}</p>
                </div>
              </CardContent>
            </Card>

            {waiterReportData?.breakdown?.byStatus && (
              <Card className="col-span-4">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Status Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {Object.entries(waiterReportData.breakdown.byStatus).map(([status, data]) => (
                      <div key={status} className="text-xs">
                        <Badge variant="outline" className="mb-1">{status}</Badge>
                        <p>{data.count} orders • {formatCurrency(data.total)}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Restaurant Performance Summary - Shows breakdown when "All Restaurants" is selected */}
        {selectedRestaurant === 'all' && restaurantSales.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Restaurant Performance Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {restaurantSales.map((restaurant) => (
                  <div key={restaurant.name} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        {restaurant.name}
                      </p>
                      <p className="text-xs text-muted-foreground">{restaurant.orders} orders</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-lg">{formatCurrency(restaurant.sales)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {selectedWaiter === 'all' && waiterSales.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Top Performing Waiters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {waiterSales.slice(0, 3).map((waiter, index) => (
                  <div key={`waiter-${waiter.name}-${index}`} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center ${index === 0 ? 'bg-yellow-100' : index === 1 ? 'bg-gray-100' : 'bg-orange-100'}`}>
                        <span className={`text-sm font-bold ${index === 0 ? 'text-yellow-600' : index === 1 ? 'text-gray-600' : 'text-orange-600'}`}>
                          #{index + 1}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium">{waiter.name}</p>
                        <p className="text-xs text-muted-foreground">{waiter.orders} orders</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(waiter.sales)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {selectedWaiter !== 'all' && filteredOverviewOrders.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                {currentWaiterName} - Performance Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-3 border rounded-lg">
                  <p className="text-sm text-muted-foreground">Total Sales</p>
                  <p className="text-2xl font-bold">{formatCurrency(overviewMetrics.totalSales)}</p>
                </div>
                <div className="p-3 border rounded-lg">
                  <p className="text-sm text-muted-foreground">Orders Taken</p>
                  <p className="text-2xl font-bold">{overviewMetrics.orderCount}</p>
                </div>
                <div className="p-3 border rounded-lg">
                  <p className="text-sm text-muted-foreground">Average Order Value</p>
                  <p className="text-2xl font-bold">{formatCurrency(overviewMetrics.averageOrderValue)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Filter by Date Range
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col md:flex-row md:items-center gap-4 mb-4">
                  <div className="flex flex-wrap gap-2">
                    <Button variant={filterType === 'today' ? "default" : "outline"} onClick={() => handleFilterChange('today')}>Today</Button>
                    <Button variant={filterType === 'yesterday' ? "default" : "outline"} onClick={() => handleFilterChange('yesterday')}>Yesterday</Button>
                    <Button variant={filterType === 'week' ? "default" : "outline"} onClick={() => handleFilterChange('week')}>This Week</Button>
                    <Button variant={filterType === 'month' ? "default" : "outline"} onClick={() => handleFilterChange('month')}>This Month</Button>
                    <Button variant={filterType === 'year' ? "default" : "outline"} onClick={() => handleFilterChange('year')}>This Year</Button>
                    
                    {/* Day of Week Dropdown */}
                    <Select value={selectedDayOfWeek} onValueChange={handleDayOfWeekChange}>
                      <SelectTrigger className="w-[140px]">
                        <Calendar className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Select Day" />
                      </SelectTrigger>
                      <SelectContent>
                        {DAYS_OF_WEEK.map((day) => (
                          <SelectItem key={day.value} value={day.value}>
                            {day.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    <Button variant={filterType === 'custom' ? "default" : "outline"} onClick={() => setFilterType('custom')}>Custom Range</Button>
                  </div>

                  <div className="flex-1 flex items-center gap-2">
                    <span className="text-sm font-medium">Date Range:</span>
                    <span className="text-sm text-muted-foreground">
                      {filterType === 'dayOfWeek' && selectedDayOfWeek && dateRange.start
                        ? `${DAYS_OF_WEEK.find(d => d.value === selectedDayOfWeek)?.label} - ${dateRange.start.toLocaleDateString()}`
                        : dateRange.start && dateRange.end
                          ? `${dateRange.start.toLocaleDateString()} - ${dateRange.end.toLocaleDateString()}`
                          : 'Select a date range'}
                    </span>
                  </div>

                  <Button onClick={() => handleExport('overview')} variant="outline" size="sm" disabled={filteredOverviewOrders.length === 0}>
                    <Download className="mr-2 h-4 w-4" />
                    Export Overview
                  </Button>
                </div>

                {filterType === 'custom' && (
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <Label>Start Date</Label>
                      <Input
                        type="date"
                        value={dateRange.start?.toISOString().split('T')[0] || ''}
                        onChange={(e) => {
                          const start = e.target.value ? new Date(e.target.value) : null
                          handleFilterChange('custom', start, dateRange.end)
                        }}
                      />
                    </div>
                    <div>
                      <Label>End Date</Label>
                      <Input
                        type="date"
                        value={dateRange.end?.toISOString().split('T')[0] || ''}
                        onChange={(e) => {
                          const end = e.target.value ? new Date(e.target.value) : null
                          handleFilterChange('custom', dateRange.start, end)
                        }}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(overviewMetrics.totalSales)}</div>
                  <p className="text-xs text-muted-foreground">
                    {currentRestaurantName} • {currentWaiterName} • {filteredOverviewOrders.length} orders
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                  <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{overviewMetrics.orderCount}</div>
                  <p className="text-xs text-muted-foreground">Avg: {formatCurrency(overviewMetrics.averageOrderValue)} per order</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Tax</CardTitle>
                  <BarChart className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(overviewMetrics.totalTax)}</div>
                  <p className="text-xs text-muted-foreground">
                    {overviewMetrics.totalSales > 0 ? ((overviewMetrics.totalTax / overviewMetrics.totalSales) * 100).toFixed(1) : 0}% of revenue
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Discounts</CardTitle>
                  <ArrowDownIcon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(overviewMetrics.totalDiscounts)}</div>
                  <p className="text-xs text-muted-foreground">
                    {overviewMetrics.totalSales > 0 ? ((overviewMetrics.totalDiscounts / overviewMetrics.totalSales) * 100).toFixed(1) : 0}% of revenue
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
              <Card className="col-span-4">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Daily Sales Overview - {currentRestaurantName}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Button variant={chartType === "line" ? "default" : "outline"} size="sm" onClick={() => setChartType("line")}>Line</Button>
                    <Button variant={chartType === "bar" ? "default" : "outline"} size="sm" onClick={() => setChartType("bar")}>Bar</Button>
                  </div>
                </CardHeader>
                <CardContent className="pl-2">
                  {dailySalesData.length > 0 ? (
                    <SalesChart data={dailySalesData} type={chartType} />
                  ) : (
                    <div className="h-[350px] flex items-center justify-center">
                      <p className="text-muted-foreground">No sales data available for {currentRestaurantName}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
              <Card className="col-span-3">
                <CardHeader>
                  <CardTitle>Recent Sales - {currentRestaurantName}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-4">
                      {filteredOverviewOrders.slice(0, 10).map((order) => (
                        <div className="flex items-center justify-between" key={order._id}>
                          <div>
                            <p className="text-sm font-medium leading-none">{order.orderNumber}</p>
                            <p className="text-sm text-muted-foreground">
                              Table {order.tableNumber} • {order.waiterName || 'Unknown'} • {new Date(order.createdAt).toLocaleTimeString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="font-medium">{formatCurrency(order.finalAmount)}</div>
                            <Badge variant="secondary" className="text-xs">{order.status}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Recent Orders - {currentRestaurantName}</CardTitle>
                <Button variant="outline" size="sm" onClick={() => handleExport('overview')}>
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order Number</TableHead>
                        <TableHead>Restaurant</TableHead>
                        <TableHead>Table</TableHead>
                        <TableHead>Waiter</TableHead>
                        <TableHead>Items</TableHead>
                        <TableHead>Total Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredOverviewOrders.slice(0, 10).map((order) => {
                        const restaurantName = getRestaurantDisplayName(order)
                        return (
                          <TableRow key={order._id}>
                            <TableCell className="font-medium">{order.orderNumber}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={restaurantName === 'Unassigned' ? "bg-gray-100" : "bg-indigo-50"}>
                                <Building2 className="h-3 w-3 mr-1" />
                                {restaurantName}
                              </Badge>
                            </TableCell>
                            <TableCell>{order.tableNumber}</TableCell>
                            <TableCell>{order.waiterName || 'Unknown'}</TableCell>
                            <TableCell className="max-w-[200px] truncate">
                              {order.items?.map(item => `${item.name} (${item.quantity})`).join(', ') || '-'}
                            </TableCell>
                            <TableCell>{formatCurrency(order.finalAmount)}</TableCell>
                            <TableCell>
                              <Badge className={statusColors[order.status] || "bg-gray-100"}>{order.status}</Badge>
                            </TableCell>
                            <TableCell>{new Date(order.createdAt).toLocaleString()}</TableCell>
                            <TableCell>
                              <Button variant="ghost" size="sm" onClick={() => handleViewDetails(order)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Filter by Date Range
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col md:flex-row md:items-center gap-4 mb-4">
                  <div className="flex flex-wrap gap-2">
                    <Button variant={filterType === 'today' ? "default" : "outline"} onClick={() => handleFilterChange('today')}>Today</Button>
                    <Button variant={filterType === 'yesterday' ? "default" : "outline"} onClick={() => handleFilterChange('yesterday')}>Yesterday</Button>
                    <Button variant={filterType === 'week' ? "default" : "outline"} onClick={() => handleFilterChange('week')}>This Week</Button>
                    <Button variant={filterType === 'month' ? "default" : "outline"} onClick={() => handleFilterChange('month')}>This Month</Button>
                    <Button variant={filterType === 'year' ? "default" : "outline"} onClick={() => handleFilterChange('year')}>This Year</Button>
                    
                    {/* Day of Week Dropdown */}
                    <Select value={selectedDayOfWeek} onValueChange={handleDayOfWeekChange}>
                      <SelectTrigger className="w-[140px]">
                        <Calendar className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Select Day" />
                      </SelectTrigger>
                      <SelectContent>
                        {DAYS_OF_WEEK.map((day) => (
                          <SelectItem key={day.value} value={day.value}>
                            {day.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    <Button variant={filterType === 'custom' ? "default" : "outline"} onClick={() => setFilterType('custom')}>Custom Range</Button>
                  </div>

                  <div className="flex-1 flex items-center gap-2">
                    <span className="text-sm font-medium">Date Range:</span>
                    <span className="text-sm text-muted-foreground">
                      {filterType === 'dayOfWeek' && selectedDayOfWeek && dateRange.start
                        ? `${DAYS_OF_WEEK.find(d => d.value === selectedDayOfWeek)?.label} - ${dateRange.start.toLocaleDateString()}`
                        : dateRange.start && dateRange.end
                          ? `${dateRange.start.toLocaleDateString()} - ${dateRange.end.toLocaleDateString()}`
                          : 'Select a date range'}
                    </span>
                    <span className="text-sm text-muted-foreground ml-2">• Showing {filteredOrders.length} orders for {currentRestaurantName} - {currentWaiterName}</span>
                  </div>

                  <Button onClick={() => handleExport('analytics')} variant="outline" size="sm" disabled={filteredOrders.length === 0}>
                    <Download className="mr-2 h-4 w-4" />
                    Export Analytics
                  </Button>
                </div>

                {filterType === 'custom' && (
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <Label>Start Date</Label>
                      <Input
                        type="date"
                        value={dateRange.start?.toISOString().split('T')[0] || ''}
                        onChange={(e) => {
                          const start = e.target.value ? new Date(e.target.value) : null
                          handleFilterChange('custom', start, dateRange.end)
                        }}
                      />
                    </div>
                    <div>
                      <Label>End Date</Label>
                      <Input
                        type="date"
                        value={dateRange.end?.toISOString().split('T')[0] || ''}
                        onChange={(e) => {
                          const end = e.target.value ? new Date(e.target.value) : null
                          handleFilterChange('custom', dateRange.start, end)
                        }}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Detailed Orders - {currentRestaurantName} - {currentWaiterName}</CardTitle>
                <div className="flex items-center gap-2">
                  <Select onValueChange={(value) => handleSort(value as keyof Order)}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="createdAt">Date</SelectItem>
                      <SelectItem value="finalAmount">Amount</SelectItem>
                      <SelectItem value="orderNumber">Order Number</SelectItem>
                      <SelectItem value="tableNumber">Table Number</SelectItem>
                      <SelectItem value="waiterName">Waiter Name</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={() => handleExport('analytics')} variant="outline">
                    <Download className="mr-2 h-4 w-4" />
                    Export
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="cursor-pointer" onClick={() => handleSort("orderNumber")}>Order #</TableHead>
                        <TableHead>Restaurant</TableHead>
                        <TableHead className="cursor-pointer" onClick={() => handleSort("tableNumber")}>Table</TableHead>
                        <TableHead className="cursor-pointer" onClick={() => handleSort("waiterName")}>Waiter</TableHead>
                        <TableHead>Items</TableHead>
                        <TableHead className="cursor-pointer" onClick={() => handleSort("totalAmount")}>Total</TableHead>
                        <TableHead className="cursor-pointer" onClick={() => handleSort("discount")}>Discount</TableHead>
                        <TableHead className="cursor-pointer" onClick={() => handleSort("tax")}>Tax</TableHead>
                        <TableHead className="cursor-pointer" onClick={() => handleSort("finalAmount")}>Final</TableHead>
                        <TableHead className="cursor-pointer" onClick={() => handleSort("status")}>Status</TableHead>
                        <TableHead className="cursor-pointer" onClick={() => handleSort("createdAt")}>Date</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredOrders.length > 0 ? (
                        filteredOrders.map((order) => {
                          const restaurantName = getRestaurantDisplayName(order)
                          return (
                            <TableRow key={order._id}>
                              <TableCell className="font-medium">{order.orderNumber}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className={restaurantName === 'Unassigned' ? "bg-gray-100" : "bg-indigo-50"}>
                                  <Building2 className="h-3 w-3 mr-1" />
                                  {restaurantName}
                                </Badge>
                              </TableCell>
                              <TableCell>{order.tableNumber}</TableCell>
                              <TableCell>{order.waiterName || 'Unknown'}</TableCell>
                              <TableCell className="max-w-[200px] truncate">
                                {order.items?.map(item => `${item.name} (${item.quantity})`).join(', ') || '-'}
                              </TableCell>
                              <TableCell>{formatCurrency(order.totalAmount)}</TableCell>
                              <TableCell>{formatCurrency(order.discount)}</TableCell>
                              <TableCell>{formatCurrency(order.tax)}</TableCell>
                              <TableCell className="font-semibold">{formatCurrency(order.finalAmount)}</TableCell>
                              <TableCell>
                                <Badge className={statusColors[order.status] || "bg-gray-100"}>{order.status}</Badge>
                              </TableCell>
                              <TableCell>{new Date(order.createdAt).toLocaleString()}</TableCell>
                              <TableCell>
                                <Button variant="ghost" size="sm" onClick={() => handleViewDetails(order)}>
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          )
                        })
                      ) : (
                        <TableRow>
                          <TableCell colSpan={12} className="text-center py-8">
                            <p className="text-muted-foreground">No orders found for {currentRestaurantName} - {currentWaiterName} in the selected date range</p>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Enhanced Order Details Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={() => {
        setSelectedOrder(null)
        setSelectedItemsMap(new Map())
      }}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2 flex-wrap">
              <DialogTitle className="text-2xl font-bold">Order Details</DialogTitle>
              {selectedOrder && (() => {
                const orderType = getOrderTypeBadge(selectedOrder)
                const restaurantName = getRestaurantDisplayName(selectedOrder)
                return (
                  <>
                    <Badge variant="outline" className={restaurantName === 'Unassigned' ? "bg-gray-100" : "bg-indigo-50"}>
                      <Building2 className="h-3 w-3 mr-1" />
                      {restaurantName}
                    </Badge>
                    <Badge className={orderType.color}>
                      {orderType.icon}
                      <span className="ml-1">{orderType.label}</span>
                    </Badge>
                  </>
                )
              })()}
            </div>
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
                      <p>{getRestaurantDisplayName(selectedOrder)}</p>
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
                      <Badge className={statusColors[selectedOrder.status] || "bg-gray-100"}>{selectedOrder.status}</Badge>
                    </div>
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground">Created At</h4>
                      <p>{new Date(selectedOrder.createdAt).toLocaleString()}</p>
                    </div>
                    {selectedOrder.customerName && (
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground">Customer Name</h4>
                        <p>{selectedOrder.customerName}</p>
                      </div>
                    )}
                  </div>

                  <Separator />

                  <div>
                    <h4 className="font-medium flex items-center mb-3">
                      <Utensils className="mr-2 h-4 w-4" /> Order Items
                    </h4>
                    <div className="rounded-md border overflow-hidden">
                      <Table>
                        <TableHeader className="bg-muted/50">
                          <TableRow>
                            <TableHead>Item Name</TableHead>
                            <TableHead className="w-20 text-center">Qty</TableHead>
                            <TableHead className="w-28 text-right">Unit Price</TableHead>
                            <TableHead className="w-28 text-right">Subtotal</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {getOrderDisplayItems(selectedOrder).length > 0 ? (
                            getOrderDisplayItems(selectedOrder).map((item, index) => {
                              const enhancedItem = getItemWithDetails(item)
                              return (
                                <TableRow key={item.itemId || index}>
                                  <TableCell>
                                    <div>
                                      <span className="font-medium">{enhancedItem.name}</span>
                                      {enhancedItem.specialInstructions && (
                                        <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                                          <MessageSquare className="h-3 w-3" />
                                          Note: {enhancedItem.specialInstructions}
                                        </p>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <Badge variant="secondary" className="text-xs">{enhancedItem.quantity}x</Badge>
                                  </TableCell>
                                  <TableCell className="text-right">{formatCurrency(enhancedItem.price)}</TableCell>
                                  <TableCell className="text-right font-medium">{formatCurrency(enhancedItem.subtotal)}</TableCell>
                                </TableRow>
                              )
                            })
                          ) : (
                            <TableRow>
                              <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                No items found for this order
                              </TableCell>
                            </TableRow>
                          )}
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

                  {(selectedOrder.specialRequirements || selectedOrder.notes) && (
                    <>
                      <Separator />
                      <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                        <h4 className="font-medium flex items-center text-yellow-800 mb-2">
                          <MessageSquare className="mr-2 h-4 w-4" />
                          Special Requirements / Notes
                        </h4>
                        <p className="text-sm text-yellow-700 whitespace-pre-wrap">
                          {selectedOrder.specialRequirements || selectedOrder.notes}
                        </p>
                      </div>
                    </>
                  )}

                  {selectedOrder.paymentScreenshotUrl && (
                    <>
                      <Separator />
                      <div>
                        <h4 className="font-medium flex items-center mb-2">
                          <CreditCard className="mr-2 h-4 w-4" /> Payment Proof
                        </h4>
                        <div className="relative w-full h-48 rounded-md overflow-hidden border bg-muted/30">
                          <img src={selectedOrder.paymentScreenshotUrl} alt="Payment Proof" className="w-full h-full object-contain" />
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
