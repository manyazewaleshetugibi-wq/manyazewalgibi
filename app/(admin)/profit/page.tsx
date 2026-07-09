"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Package, 
  AlertCircle,
  RefreshCw,
  Download,
  Eye,
  Filter,
  Percent,
  Calculator,
  Coffee,
  Pizza,
  Utensils,
  Grid3X3,
  Search,
  Clock,
  ArrowUpDown,
  Warehouse,
  Scale,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Progress } from "@/components/ui/progress"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ComposedChart,
  Line,
} from "recharts"
import { format, startOfDay, endOfDay, parseISO } from "date-fns"
import * as XLSX from "xlsx"

// ============================================
// TYPES
// ============================================

interface RequiredStock {
  stockId: string
  quantity: number
}

interface MenuItem {
  _id: string
  name: string
  description: string
  categoryId: string
  price: number
  imageUrl?: string
  requiredStock: RequiredStock[]
  isActive: boolean
  isFeatured: boolean
  preparationTime: number
  createdAt: string
  updatedAt: string
}

interface Category {
  _id: string
  name: string
  description: string
  type: "FOOD" | "DRINK" | "OTHER"
  isActive: boolean
}

interface StockItem {
  _id: string
  name: string
  categoryId: string
  unit: string
  minimumStock: number
  currentStock: number
  requiredAmount: number
  reorderFrequency: string
  isActive: boolean
}

interface Purchase {
  _id: string
  stockId: string
  purchaseDate: string
  quantity: number
  unitPrice: number
  supplier: string
}

// Updated OrderItem to match API response
interface OrderItem {
  itemId: string
  menuItemId?: string
  quantity: number
  unitPrice: number
  price?: number
  name?: string
  subtotal?: number
}

// Updated Order to match API response
interface Order {
  _id: string
  orderNumber: string
  items: OrderItem[]  // API uses 'items'
  orderItems?: OrderItem[]
  totalAmount: number
  finalAmount: number
  createdAt: string
  status: string
  waiterName?: string
  restaurantName?: string
  paymentMethod?: string
}

interface IngredientCost {
  stockId: string
  stockName: string
  quantity: number
  unit: string
  averageCost: number
  latestPrice: number
  totalCost: number
  purchaseDate?: string
  supplier?: string
}

interface DailySoldItem {
  itemId: string
  itemName: string
  sellingPrice: number
  totalIngredientCost: number
  profit: number
  profitMargin: number
  status: 'profitable' | 'low' | 'loss'
  ingredients: IngredientCost[]
  preparationTime: number
  categoryId: string
  categoryName: string
  categoryType: string
  quantitySold: number
}

interface DailySummary {
  date: string
  totalRevenue: number
  totalCost: number
  totalProfit: number
  profitMargin: number
  totalItemsSold: number
  totalOrders: number
  profitableItems: number
  lowMarginItems: number
  lossItems: number
  totalIngredients: number
  totalStockValue: number
  totalStockCost: number
  averageStockCost: number
}

interface StockValuation {
  totalStockValue: number
  totalStockCost: number
  averageCost: number
  items: {
    stockId: string
    name: string
    currentStock: number
    unit: string
    averageCost: number
    totalValue: number
    totalCost: number
    purchaseCount: number
    lastPurchaseDate: string
    supplier: string
  }[]
}

// ============================================
// API FUNCTIONS WITH FIXED HANDLING
// ============================================

// Get today's completed orders only
async function fetchTodayOrders(): Promise<Order[]> {
  const today = new Date()
  // Use Ethiopia timezone (UTC+3)
  const startDate = format(startOfDay(today), "yyyy-MM-dd")
  const endDate = format(endOfDay(today), "yyyy-MM-dd")
  
  console.log(`📅 Fetching orders from ${startDate} to ${endDate}`)
  
  try {
    const response = await fetch(
      `/api/order/waiterreport?startDate=${startDate}&endDate=${endDate}&limit=10000&status=COMPLETED`
    )
    
    console.log(`📡 API Response Status: ${response.status}`)
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ API Error (${response.status}):`, errorText)
      throw new Error(`Failed to fetch orders: ${response.status}`)
    }
    
    const data = await response.json()
    console.log(`📊 API Response Data:`, {
      success: data.success,
      ordersCount: data.orders?.length || 0,
      summary: data.summary
    })
    
    if (data.success && data.orders) {
      // Filter for today's completed orders
      const todayOrders = data.orders.filter((order: Order) => {
        const orderDate = new Date(order.createdAt)
        const isToday = orderDate >= startOfDay(today) && orderDate <= endOfDay(today)
        const isCompleted = order.status === 'COMPLETED'
        return isToday && isCompleted
      })
      
      console.log(`✅ Found ${todayOrders.length} completed orders for today`)
      
      // Log first order for debugging
      if (todayOrders.length > 0) {
        console.log(`📝 Sample order:`, {
          id: todayOrders[0]._id,
          orderNumber: todayOrders[0].orderNumber,
          itemsCount: todayOrders[0].items?.length || 0,
          totalAmount: todayOrders[0].totalAmount,
          status: todayOrders[0].status
        })
      }
      
      return todayOrders
    }
    
    console.warn(`⚠️ No orders found or API returned unexpected structure`)
    return []
  } catch (error) {
    console.error("❌ Error fetching today's orders:", error)
    return []
  }
}

async function fetchMenuItems(): Promise<MenuItem[]> {
  try {
    const response = await fetch("/api/items")
    if (!response.ok) throw new Error(`Failed to fetch menu items: ${response.status}`)
    const data = await response.json()
    
    let items = []
    if (data.data) items = data.data
    else if (data.items) items = data.items
    else if (Array.isArray(data)) items = data
    
    console.log(`✅ Loaded ${items.length} menu items`)
    return items
  } catch (error) {
    console.error("❌ Error fetching menu items:", error)
    return []
  }
}

async function fetchCategories(): Promise<Category[]> {
  try {
    const response = await fetch("/api/item-category?limit=100")
    if (!response.ok) throw new Error(`Failed to fetch categories: ${response.status}`)
    const data = await response.json()
    
    let categories = []
    if (data.success && data.data) categories = data.data
    else if (data.categories) categories = data.categories
    else if (Array.isArray(data)) categories = data
    
    console.log(`✅ Loaded ${categories.length} categories`)
    return categories
  } catch (error) {
    console.error("❌ Error fetching categories:", error)
    return []
  }
}

async function fetchStockItems(): Promise<StockItem[]> {
  try {
    const response = await fetch("/api/stock")
    if (!response.ok) throw new Error(`Failed to fetch stock items: ${response.status}`)
    const data = await response.json()
    
    let stocks = []
    if (data.success && data.data) stocks = data.data
    else if (data.stock) stocks = data.stock
    else if (Array.isArray(data)) stocks = data
    
    console.log(`✅ Loaded ${stocks.length} stock items`)
    return stocks
  } catch (error) {
    console.error("❌ Error fetching stock items:", error)
    return []
  }
}

async function fetchPurchases(): Promise<Purchase[]> {
  try {
    const response = await fetch("/api/stock-purchase")
    if (!response.ok) throw new Error(`Failed to fetch purchases: ${response.status}`)
    const data = await response.json()
    
    let purchases = []
    if (data.success && data.purchases) purchases = data.purchases
    else if (data.data) purchases = data.data
    else if (Array.isArray(data)) purchases = data
    
    console.log(`✅ Loaded ${purchases.length} purchases`)
    return purchases
  } catch (error) {
    console.error("❌ Error fetching purchases:", error)
    return []
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function calculateAverageCost(stockId: string, purchases: Purchase[]): { 
  averageCost: number, 
  totalCost: number,
  purchaseCount: number,
  lastPurchaseDate: string,
  supplier: string 
} {
  const stockPurchases = purchases
    .filter(p => p.stockId === stockId)
    .sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime())
  
  if (stockPurchases.length === 0) {
    return {
      averageCost: 0,
      totalCost: 0,
      purchaseCount: 0,
      lastPurchaseDate: '',
      supplier: ''
    }
  }

  let totalQuantity = 0
  let totalCost = 0
  
  stockPurchases.forEach(p => {
    totalQuantity += p.quantity
    totalCost += p.quantity * p.unitPrice
  })

  const averageCost = totalQuantity > 0 ? totalCost / totalQuantity : 0

  return {
    averageCost,
    totalCost,
    purchaseCount: stockPurchases.length,
    lastPurchaseDate: stockPurchases[0].purchaseDate,
    supplier: stockPurchases[0].supplier
  }
}

function getLatestPrice(stockId: string, purchases: Purchase[]): { price: number, date: string, supplier: string } {
  const stockPurchases = purchases
    .filter(p => p.stockId === stockId)
    .sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime())
  
  if (stockPurchases.length > 0) {
    return {
      price: stockPurchases[0].unitPrice,
      date: stockPurchases[0].purchaseDate,
      supplier: stockPurchases[0].supplier
    }
  }
  return { price: 0, date: '', supplier: '' }
}

function getStockName(stockId: string, stocks: StockItem[]): string {
  const stock = stocks.find(s => s._id === stockId)
  return stock ? stock.name : "Unknown Stock"
}

function getStockUnit(stockId: string, stocks: StockItem[]): string {
  const stock = stocks.find(s => s._id === stockId)
  return stock ? stock.unit : "unit"
}

// FIXED: Get order items - API uses 'items'
function getOrderItems(order: Order): OrderItem[] {
  return order.items || order.orderItems || []
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'ETB',
    minimumFractionDigits: 2
  }).format(value)
}

// ============================================
// DIALOG COMPONENTS
// ============================================

interface StockValuationDialogProps {
  isOpen: boolean
  onClose: () => void
  stockValuation: StockValuation | null
}

function StockValuationDialog({ isOpen, onClose, stockValuation }: StockValuationDialogProps) {
  if (!stockValuation) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[80vh] overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <Warehouse className="h-6 w-6 text-purple-600" />
            Stock Valuation Report
          </DialogTitle>
          <DialogDescription>
            Current value of all stock items based on average purchase costs
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="bg-purple-50 rounded-xl p-3 text-center">
              <p className="text-xs text-muted-foreground">Total Stock Value</p>
              <p className="text-xl font-bold text-purple-600">{formatCurrency(stockValuation.totalStockValue)}</p>
            </div>
            <div className="bg-blue-50 rounded-xl p-3 text-center">
              <p className="text-xs text-muted-foreground">Total Cost</p>
              <p className="text-xl font-bold text-blue-600">{formatCurrency(stockValuation.totalStockCost)}</p>
            </div>
            <div className="bg-green-50 rounded-xl p-3 text-center">
              <p className="text-xs text-muted-foreground">Average Cost</p>
              <p className="text-xl font-bold text-green-600">{formatCurrency(stockValuation.averageCost)}</p>
            </div>
            <div className="bg-orange-50 rounded-xl p-3 text-center">
              <p className="text-xs text-muted-foreground">Total Items</p>
              <p className="text-xl font-bold text-orange-600">{stockValuation.items.length}</p>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Package className="h-5 w-5 text-purple-600" />
              Stock Items Detail
            </h3>
            <div className="rounded-xl border overflow-hidden">
              <Table>
                <TableHeader className="bg-purple-50">
                  <TableRow>
                    <TableHead className="font-semibold">Item</TableHead>
                    <TableHead className="text-right font-semibold">Current Stock</TableHead>
                    <TableHead className="text-right font-semibold">Unit</TableHead>
                    <TableHead className="text-right font-semibold">Avg Cost</TableHead>
                    <TableHead className="text-right font-semibold">Total Value</TableHead>
                    <TableHead className="text-right font-semibold">Purchases</TableHead>
                    <TableHead className="text-right font-semibold">Last Purchase</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stockValuation.items.map((item) => (
                    <TableRow key={item.stockId}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="text-right font-bold">{item.currentStock}</TableCell>
                      <TableCell className="text-right">{item.unit}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.averageCost)}</TableCell>
                      <TableCell className="text-right text-purple-600 font-medium">
                        {formatCurrency(item.totalValue)}
                      </TableCell>
                      <TableCell className="text-right">{item.purchaseCount}</TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">
                        {item.lastPurchaseDate ? format(new Date(item.lastPurchaseDate), 'PP') : 'N/A'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>

        <div className="flex justify-end mt-4">
          <Button onClick={onClose} variant="outline" className="rounded-full">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

interface ItemDetailDialogProps {
  item: DailySoldItem | null
  isOpen: boolean
  onClose: () => void
}

function ItemDetailDialog({ item, isOpen, onClose }: ItemDetailDialogProps) {
  if (!item) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            {item.itemName}
            <Badge className="ml-2">{item.categoryName}</Badge>
          </DialogTitle>
          <DialogDescription>
            Detailed ingredient cost breakdown for this item
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-green-50 rounded-xl p-3 text-center">
              <p className="text-xs text-muted-foreground">Quantity Sold</p>
              <p className="text-xl font-bold text-green-600">{item.quantitySold}x</p>
            </div>
            <div className="bg-blue-50 rounded-xl p-3 text-center">
              <p className="text-xs text-muted-foreground">Price</p>
              <p className="text-xl font-bold text-blue-600">{formatCurrency(item.sellingPrice)}</p>
            </div>
            <div className="bg-orange-50 rounded-xl p-3 text-center">
              <p className="text-xs text-muted-foreground">Stock Cost</p>
              <p className="text-xl font-bold text-orange-600">{formatCurrency(item.totalIngredientCost)}</p>
            </div>
            <div className={`rounded-xl p-3 text-center ${item.profit >= 0 ? 'bg-emerald-50' : 'bg-red-50'}`}>
              <p className="text-xs text-muted-foreground">Profit</p>
              <p className={`text-xl font-bold ${item.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {formatCurrency(item.profit)}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Badge className="text-sm px-4 py-2">
              Profit Margin: {item.profitMargin.toFixed(1)}%
            </Badge>
            {item.status === 'profitable' && (
              <Badge className="bg-green-100 text-green-800 text-sm px-4 py-2">Profitable</Badge>
            )}
            {item.status === 'low' && (
              <Badge className="bg-yellow-100 text-yellow-800 text-sm px-4 py-2">Low Margin</Badge>
            )}
            {item.status === 'loss' && (
              <Badge className="bg-red-100 text-red-800 text-sm px-4 py-2">Loss</Badge>
            )}
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Package className="h-5 w-5 text-purple-600" />
              Ingredient Breakdown
            </h3>
            <div className="rounded-xl border overflow-hidden">
              <Table>
                <TableHeader className="bg-purple-50">
                  <TableRow>
                    <TableHead className="font-semibold">Stock Item</TableHead>
                    <TableHead className="text-right font-semibold">Quantity Used</TableHead>
                    <TableHead className="text-right font-semibold">Unit</TableHead>
                    <TableHead className="text-right font-semibold">Avg Cost</TableHead>
                    <TableHead className="text-right font-semibold">Total Cost</TableHead>
                    <TableHead className="text-right font-semibold">Supplier</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {item.ingredients.map((ing, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{ing.stockName}</TableCell>
                      <TableCell className="text-right">{ing.quantity}</TableCell>
                      <TableCell className="text-right">{ing.unit}</TableCell>
                      <TableCell className="text-right">
                        {ing.averageCost > 0 ? formatCurrency(ing.averageCost) : 'N/A'}
                      </TableCell>
                      <TableCell className="text-right text-orange-600 font-medium">
                        {formatCurrency(ing.totalCost)}
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">
                        {ing.supplier || 'N/A'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>

        <div className="flex justify-end mt-4">
          <Button onClick={onClose} variant="outline" className="rounded-full">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function DailyProfitPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("all")
  const [selectedCategoryType, setSelectedCategoryType] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [sortBy, setSortBy] = useState<'profit' | 'margin' | 'price' | 'cost'>('margin')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  
  const [selectedItem, setSelectedItem] = useState<DailySoldItem | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isStockValuationOpen, setIsStockValuationOpen] = useState(false)
  
  const [orders, setOrders] = useState<Order[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [stocks, setStocks] = useState<StockItem[]>([])
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [todayItems, setTodayItems] = useState<DailySoldItem[]>([])
  const [summary, setSummary] = useState<DailySummary | null>(null)
  const [stockValuation, setStockValuation] = useState<StockValuation | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [debugInfo, setDebugInfo] = useState<string>("")

  // Load data
  const loadData = async () => {
    setIsLoading(true)
    setError(null)
    setDebugInfo("Loading data...")
    
    try {
      // Fetch all required data in parallel
      const [ordersData, menuData, categoryData, stockData, purchaseData] = await Promise.all([
        fetchTodayOrders(),
        fetchMenuItems(),
        fetchCategories(),
        fetchStockItems(),
        fetchPurchases()
      ])

      setDebugInfo(`Loaded ${ordersData.length} orders, ${menuData.length} items, ${categoryData.length} categories`)
      
      setOrders(ordersData)
      setMenuItems(menuData)
      setCategories(categoryData)
      setStocks(stockData)
      setPurchases(purchaseData)

      // Calculate stock valuation
      if (stockData.length > 0) {
        calculateStockValuation(stockData, purchaseData)
      }

      // Calculate profitability if we have orders and menu items
      if (ordersData.length > 0 && menuData.length > 0) {
        calculateTodayProfitability(ordersData, menuData, categoryData, stockData, purchaseData)
      } else {
        // Set empty state with debug info
        setTodayItems([])
        setSummary({
          date: format(new Date(), 'PPP'),
          totalRevenue: 0,
          totalCost: 0,
          totalProfit: 0,
          profitMargin: 0,
          totalItemsSold: 0,
          totalOrders: ordersData.length || 0,
          profitableItems: 0,
          lowMarginItems: 0,
          lossItems: 0,
          totalIngredients: 0,
          totalStockValue: 0,
          totalStockCost: 0,
          averageStockCost: 0
        })
        
        if (ordersData.length === 0) {
          setError("No completed orders found for today. Check if there are any orders in the system.")
        }
      }
      
      setLastUpdated(new Date())
      setDebugInfo(`✅ Complete! Updated at ${format(new Date(), 'HH:mm:ss')}`)
    } catch (error) {
      console.error("Error loading data:", error)
      setError(`Failed to load data: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsLoading(false)
    }
  }

  // Calculate stock valuation
  const calculateStockValuation = (stockData: StockItem[], purchaseData: Purchase[]) => {
    try {
      const valuationItems = stockData
        .filter(s => s.isActive !== false)
        .map(stock => {
          const { averageCost, totalCost, purchaseCount, lastPurchaseDate, supplier } = 
            calculateAverageCost(stock._id, purchaseData)
          
          return {
            stockId: stock._id,
            name: stock.name,
            currentStock: stock.currentStock || 0,
            unit: stock.unit || 'unit',
            averageCost,
            totalValue: averageCost * (stock.currentStock || 0),
            totalCost,
            purchaseCount,
            lastPurchaseDate,
            supplier
          }
        })
        .filter(item => item.currentStock > 0 || item.purchaseCount > 0)

      const totalStockValue = valuationItems.reduce((sum, item) => sum + item.totalValue, 0)
      const totalStockCost = valuationItems.reduce((sum, item) => sum + item.totalCost, 0)
      const totalQuantity = valuationItems.reduce((sum, item) => sum + item.currentStock, 0)
      const averageCost = totalQuantity > 0 ? totalStockValue / totalQuantity : 0

      setStockValuation({
        totalStockValue,
        totalStockCost,
        averageCost,
        items: valuationItems
      })
    } catch (error) {
      console.error("Error calculating stock valuation:", error)
    }
  }

  // Calculate profitability for today's sold items
  const calculateTodayProfitability = (
    ordersData: Order[],
    menuData: MenuItem[],
    categoryData: Category[],
    stockData: StockItem[],
    purchaseData: Purchase[]
  ) => {
    try {
      // Aggregate sales by item from today's orders
      const salesMap = new Map<string, { quantity: number }>()
      
      console.log(`Processing ${ordersData.length} completed orders from today`)
      
      ordersData.forEach((order, index) => {
        const orderItems = getOrderItems(order)
        if (!orderItems || orderItems.length === 0) {
          console.warn(`Order ${order._id} has no items`)
          return
        }

        console.log(`Order ${index + 1}: ${orderItems.length} items`)

        orderItems.forEach((item: OrderItem) => {
          // Try multiple ways to get the item ID
          const itemId = item.menuItemId || item.itemId
          if (!itemId) {
            console.warn(`Order ${order._id} has item without ID:`, item)
            return
          }
          
          const quantity = item.quantity || 0
          if (quantity === 0) return
          
          const existing = salesMap.get(itemId) || { quantity: 0 }
          salesMap.set(itemId, {
            quantity: existing.quantity + quantity
          })
        })
      })

      console.log(`Found ${salesMap.size} unique items sold today`)

      if (salesMap.size === 0) {
        setTodayItems([])
        setSummary({
          date: format(new Date(), 'PPP'),
          totalRevenue: 0,
          totalCost: 0,
          totalProfit: 0,
          profitMargin: 0,
          totalItemsSold: 0,
          totalOrders: ordersData.length,
          profitableItems: 0,
          lowMarginItems: 0,
          lossItems: 0,
          totalIngredients: 0,
          totalStockValue: stockValuation?.totalStockValue || 0,
          totalStockCost: stockValuation?.totalStockCost || 0,
          averageStockCost: stockValuation?.averageCost || 0
        })
        return
      }

      // Calculate profitability for each sold item
      const results: DailySoldItem[] = []
      let itemsNotFound = 0

      salesMap.forEach((sale, itemId) => {
        // Find menu item
        const menuItem = menuData.find(item => item._id === itemId)
        if (!menuItem || !menuItem.isActive) {
          console.warn(`Menu item ${itemId} not found or inactive`)
          itemsNotFound++
          return
        }

        // Find category
        const category = categoryData.find(c => c._id === menuItem.categoryId)
        const categoryName = category?.name || "Uncategorized"
        const categoryType = category?.type || "OTHER"

        let totalCost = 0
        const ingredients: IngredientCost[] = []

        // Calculate cost from required stock using average cost
        if (menuItem.requiredStock && menuItem.requiredStock.length > 0) {
          menuItem.requiredStock.forEach(req => {
            const { averageCost, totalCost: avgTotalCost, purchaseCount, lastPurchaseDate, supplier } = 
              calculateAverageCost(req.stockId, purchaseData)
            const { price: latestPrice } = getLatestPrice(req.stockId, purchaseData)
            
            // Cost = quantity_needed × average_cost × quantity_sold
            const cost = req.quantity * averageCost * sale.quantity
            totalCost += cost

            ingredients.push({
              stockId: req.stockId,
              stockName: getStockName(req.stockId, stockData),
              quantity: req.quantity * sale.quantity,
              unit: getStockUnit(req.stockId, stockData),
              averageCost: averageCost,
              latestPrice: latestPrice,
              totalCost: cost,
              purchaseDate: lastPurchaseDate,
              supplier: supplier
            })
          })
        }

        // Revenue is price × quantity sold
        const totalRevenue = menuItem.price * sale.quantity
        const profit = totalRevenue - totalCost
        const profitMargin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0

        let status: 'profitable' | 'low' | 'loss' = 'profitable'
        if (profitMargin < 0) status = 'loss'
        else if (profitMargin < 20) status = 'low'
        else status = 'profitable'

        results.push({
          itemId: menuItem._id,
          itemName: menuItem.name,
          sellingPrice: menuItem.price,
          totalIngredientCost: totalCost,
          profit: profit,
          profitMargin: profitMargin,
          status: status,
          ingredients: ingredients,
          preparationTime: menuItem.preparationTime || 0,
          categoryId: menuItem.categoryId,
          categoryName: categoryName,
          categoryType: categoryType,
          quantitySold: sale.quantity
        })
      })

      if (itemsNotFound > 0) {
        console.warn(`${itemsNotFound} items were not found in the menu`)
      }

      // Sort by profit margin
      results.sort((a, b) => b.profitMargin - a.profitMargin)
      setTodayItems(results)

      // Calculate summary
      const totalRevenue = results.reduce((sum, item) => sum + (item.sellingPrice * item.quantitySold), 0)
      const totalCost = results.reduce((sum, item) => sum + item.totalIngredientCost, 0)
      const totalProfit = totalRevenue - totalCost
      const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0
      const profitableItems = results.filter(i => i.status === 'profitable').length
      const lowMarginItems = results.filter(i => i.status === 'low').length
      const lossItems = results.filter(i => i.status === 'loss').length
      const totalIngredients = results.reduce((sum, item) => sum + item.ingredients.length, 0)

      setSummary({
        date: format(new Date(), 'PPP'),
        totalRevenue,
        totalCost,
        totalProfit,
        profitMargin,
        totalItemsSold: results.reduce((sum, item) => sum + item.quantitySold, 0),
        totalOrders: ordersData.length,
        profitableItems,
        lowMarginItems,
        lossItems,
        totalIngredients,
        totalStockValue: stockValuation?.totalStockValue || 0,
        totalStockCost: stockValuation?.totalStockCost || 0,
        averageStockCost: stockValuation?.averageCost || 0
      })
    } catch (error) {
      console.error("Error calculating profitability:", error)
      setError(`Failed to calculate profitability: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Load data on mount
  useEffect(() => {
    loadData()
  }, [])

  // Handle refresh
  const handleRefresh = () => {
    loadData()
  }

  // Handle view details
  const handleViewDetails = (item: DailySoldItem) => {
    setSelectedItem(item)
    setIsDetailOpen(true)
  }

  // Handle view stock valuation
  const handleViewStockValuation = () => {
    setIsStockValuationOpen(true)
  }

  // Filter and sort items
  const filteredItems = useMemo(() => {
    let filtered = [...todayItems]

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(item => 
        item.itemName.toLowerCase().includes(query) ||
        item.categoryName.toLowerCase().includes(query)
      )
    }

    if (selectedCategoryId !== "all") {
      filtered = filtered.filter(item => item.categoryId === selectedCategoryId)
    }

    if (selectedCategoryType !== "all") {
      filtered = filtered.filter(item => item.categoryType === selectedCategoryType)
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter(item => item.status === statusFilter)
    }

    filtered.sort((a, b) => {
      let aVal: number, bVal: number
      switch (sortBy) {
        case 'profit': aVal = a.profit; bVal = b.profit; break
        case 'margin': aVal = a.profitMargin; bVal = b.profitMargin; break
        case 'price': aVal = a.sellingPrice; bVal = b.sellingPrice; break
        case 'cost': aVal = a.totalIngredientCost; bVal = b.totalIngredientCost; break
        default: aVal = a.profitMargin; bVal = b.profitMargin
      }
      return sortOrder === 'desc' ? bVal - aVal : aVal - bVal
    })

    return filtered
  }, [todayItems, searchQuery, selectedCategoryId, selectedCategoryType, statusFilter, sortBy, sortOrder])

  // Get category options
  const categoryOptions = useMemo(() => {
    const uniqueCategories = new Map<string, { _id: string; name: string; type: string }>()
    todayItems.forEach(item => {
      if (!uniqueCategories.has(item.categoryId)) {
        uniqueCategories.set(item.categoryId, {
          _id: item.categoryId,
          name: item.categoryName,
          type: item.categoryType
        })
      }
    })
    return Array.from(uniqueCategories.values())
  }, [todayItems])

  // Calculate totals for footer
  const totals = useMemo(() => {
    const totalCost = filteredItems.reduce((sum, item) => sum + item.totalIngredientCost, 0)
    const totalRevenue = filteredItems.reduce((sum, item) => sum + (item.sellingPrice * item.quantitySold), 0)
    const totalProfit = totalRevenue - totalCost
    return { totalCost, totalRevenue, totalProfit }
  }, [filteredItems])

  // Export to Excel
  const handleExport = () => {
    if (filteredItems.length === 0) {
      alert("No data to export")
      return
    }

    const exportData = filteredItems.map(item => ({
      'Item Name': item.itemName,
      'Category': item.categoryName,
      'Type': item.categoryType,
      'Quantity Sold': item.quantitySold,
      'Price': formatCurrency(item.sellingPrice),
      'Total Cost': formatCurrency(item.totalIngredientCost),
      'Profit': formatCurrency(item.profit),
      'Profit Margin %': item.profitMargin.toFixed(2),
      'Status': item.status === 'profitable' ? 'Profitable' : item.status === 'low' ? 'Low Margin' : 'Loss',
      'Ingredients': item.ingredients.map(i => `${i.stockName} (${i.quantity} ${i.unit})`).join(', ')
    }))

    const worksheet = XLSX.utils.json_to_sheet(exportData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "Today's Profit")
    XLSX.writeFile(workbook, `todays_profit_${format(new Date(), 'yyyy-MM-dd')}.xlsx`)
  }

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'profitable':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Profitable</Badge>
      case 'low':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Low Margin</Badge>
      case 'loss':
        return <Badge className="bg-red-100 text-red-800 border-red-200">Loss</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  const getProfitColor = (profit: number) => {
    if (profit > 0) return 'text-green-600'
    if (profit < 0) return 'text-red-600'
    return 'text-gray-600'
  }

  const getMarginColor = (margin: number) => {
    if (margin >= 30) return 'text-green-600'
    if (margin >= 20) return 'text-emerald-600'
    if (margin >= 10) return 'text-yellow-600'
    if (margin >= 0) return 'text-orange-600'
    return 'text-red-600'
  }

  const getProgressColor = (margin: number) => {
    if (margin >= 30) return 'bg-green-500'
    if (margin >= 20) return 'bg-emerald-500'
    if (margin >= 10) return 'bg-yellow-500'
    if (margin >= 0) return 'bg-orange-500'
    return 'bg-red-500'
  }

  const categoryTypeColors = {
    FOOD: { bg: "bg-amber-100", text: "text-amber-800", border: "border-amber-200", icon: Pizza },
    DRINK: { bg: "bg-blue-100", text: "text-blue-800", border: "border-blue-200", icon: Coffee },
    OTHER: { bg: "bg-purple-100", text: "text-purple-800", border: "border-purple-200", icon: Utensils },
  }

  // Chart data
  const chartData = filteredItems.slice(0, 10).map(item => ({
    name: item.itemName.length > 15 ? item.itemName.substring(0, 15) + '...' : item.itemName,
    profit: item.profit,
    margin: item.profitMargin,
    cost: item.totalIngredientCost,
    quantity: item.quantitySold,
    price: item.sellingPrice
  }))

  // Pie chart data
  const pieData = [
    { name: 'Profitable (≥20%)', value: summary?.profitableItems || 0, color: '#22c55e' },
    { name: 'Low Margin (0-20%)', value: summary?.lowMarginItems || 0, color: '#eab308' },
    { name: 'Loss (<0%)', value: summary?.lossItems || 0, color: '#ef4444' }
  ].filter(d => d.value > 0)

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50/50 via-white to-purple-50/30 p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 md:mb-8 gap-4">
            <div>
              <Skeleton className="h-8 sm:h-10 w-48 sm:w-80 mb-2" />
              <Skeleton className="h-4 w-40 sm:w-64" />
            </div>
            <Skeleton className="h-10 w-28 sm:w-32" />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-28 sm:h-32 w-full rounded-2xl" />
            ))}
          </div>
          <Skeleton className="h-[400px] sm:h-[500px] w-full rounded-2xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50/50 via-white to-purple-50/30 p-3 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 md:gap-4 mb-6 md:mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1 md:mb-2">
              <Calculator className="h-6 w-6 md:h-8 md:w-8 text-purple-600" />
              <h1 className="text-xl md:text-3xl font-bold bg-gradient-to-r from-purple-800 to-purple-600 bg-clip-text text-transparent">
                Today's Profit & Stock Value
              </h1>
            </div>
            <p className="text-xs md:text-sm text-muted-foreground ml-8 md:ml-9">
              {format(new Date(), 'EEEE, MMMM d, yyyy')}
            </p>
            <p className="text-[10px] md:text-xs text-muted-foreground ml-8 md:ml-9 mt-0.5 md:mt-1">
              {summary?.totalOrders || 0} completed orders • {summary?.totalItemsSold || 0} items sold
            </p>
            {debugInfo && (
              <p className="text-[10px] text-gray-400 ml-8 md:ml-9 mt-1">{debugInfo}</p>
            )}
          </div>
          <div className="flex gap-2 w-full sm:w-auto flex-wrap">
            <Button 
              onClick={handleViewStockValuation} 
              variant="outline" 
              size="sm" 
              className="rounded-full flex-1 sm:flex-none text-xs md:text-sm border-purple-200 hover:bg-purple-50"
            >
              <Warehouse className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
              Stock Value
            </Button>
            <Button onClick={handleRefresh} variant="outline" size="sm" className="rounded-full flex-1 sm:flex-none text-xs md:text-sm">
              <RefreshCw className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
              Refresh
            </Button>
            <Button onClick={handleExport} variant="outline" size="sm" className="rounded-full flex-1 sm:flex-none text-xs md:text-sm" disabled={filteredItems.length === 0}>
              <Download className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <Card className="mb-4 border-red-200 bg-red-50">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-red-800">Error</p>
                  <p className="text-sm text-red-700">{error}</p>
                  <Button onClick={handleRefresh} variant="outline" size="sm" className="mt-2">
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Retry
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Summary Stats Cards */}
        {summary && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4 mb-4 md:mb-8">
              <Card className="rounded-xl md:rounded-2xl border-0 shadow-lg bg-gradient-to-br from-white to-purple-50/50">
                <CardContent className="p-3 md:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] md:text-sm font-medium text-muted-foreground">Items Sold</p>
                      <p className="text-base md:text-2xl font-bold text-purple-900">{summary.totalItemsSold}</p>
                      <p className="text-[8px] md:text-xs text-muted-foreground">{todayItems.length} unique</p>
                    </div>
                    <div className="p-2 md:p-3 bg-purple-100 rounded-xl md:rounded-2xl">
                      <Utensils className="h-4 w-4 md:h-6 md:w-6 text-purple-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-xl md:rounded-2xl border-0 shadow-lg bg-gradient-to-br from-white to-green-50/50">
                <CardContent className="p-3 md:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] md:text-sm font-medium text-muted-foreground">Revenue</p>
                      <p className="text-base md:text-2xl font-bold text-green-600">{formatCurrency(summary.totalRevenue)}</p>
                      <p className="text-[8px] md:text-xs text-muted-foreground">{summary.totalOrders} orders</p>
                    </div>
                    <div className="p-2 md:p-3 bg-green-100 rounded-xl md:rounded-2xl">
                      <DollarSign className="h-4 w-4 md:h-6 md:w-6 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-xl md:rounded-2xl border-0 shadow-lg bg-gradient-to-br from-white to-orange-50/50">
                <CardContent className="p-3 md:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] md:text-sm font-medium text-muted-foreground">Stock Cost</p>
                      <p className="text-base md:text-2xl font-bold text-orange-600">{formatCurrency(summary.totalCost)}</p>
                      <p className="text-[8px] md:text-xs text-muted-foreground">{summary.totalIngredients} ingredients</p>
                    </div>
                    <div className="p-2 md:p-3 bg-orange-100 rounded-xl md:rounded-2xl">
                      <Package className="h-4 w-4 md:h-6 md:w-6 text-orange-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-xl md:rounded-2xl border-0 shadow-lg bg-gradient-to-br from-white to-blue-50/50">
                <CardContent className="p-3 md:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] md:text-sm font-medium text-muted-foreground">Profit</p>
                      <p className={`text-base md:text-2xl font-bold ${getProfitColor(summary.totalProfit)}`}>
                        {formatCurrency(summary.totalProfit)}
                      </p>
                      <p className="text-[8px] md:text-xs text-muted-foreground">
                        {summary.profitableItems} profitable
                      </p>
                    </div>
                    <div className={`p-2 md:p-3 ${summary.totalProfit >= 0 ? 'bg-blue-100' : 'bg-red-100'} rounded-xl md:rounded-2xl`}>
                      <TrendingUp className={`h-4 w-4 md:h-6 md:w-6 ${summary.totalProfit >= 0 ? 'text-blue-600' : 'text-red-600'}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Second Row Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4 mb-4 md:mb-8">
              <Card className="rounded-xl md:rounded-2xl border-0 shadow-md bg-gradient-to-br from-white to-purple-50/50">
                <CardContent className="p-2 md:p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[8px] md:text-xs text-muted-foreground">Stock Value</p>
                      <p className="text-sm md:text-xl font-bold text-purple-600">
                        {formatCurrency(summary.totalStockValue)}
                      </p>
                    </div>
                    <Warehouse className="h-4 w-4 md:h-5 md:w-5 text-purple-500" />
                  </div>
                </CardContent>
              </Card>
              <Card className="rounded-xl md:rounded-2xl border-0 shadow-md bg-gradient-to-br from-white to-blue-50/50">
                <CardContent className="p-2 md:p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[8px] md:text-xs text-muted-foreground">Avg Stock Cost</p>
                      <p className="text-sm md:text-xl font-bold text-blue-600">
                        {formatCurrency(summary.averageStockCost)}
                      </p>
                    </div>
                    <Scale className="h-4 w-4 md:h-5 md:w-5 text-blue-500" />
                  </div>
                </CardContent>
              </Card>
              <Card className="rounded-xl md:rounded-2xl border-0 shadow-md bg-gradient-to-br from-white to-green-50/50">
                <CardContent className="p-2 md:p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[8px] md:text-xs text-muted-foreground">Margin</p>
                      <p className={`text-sm md:text-xl font-bold ${getMarginColor(summary.profitMargin)}`}>
                        {summary.profitMargin.toFixed(1)}%
                      </p>
                    </div>
                    <Percent className="h-4 w-4 md:h-5 md:w-5 text-green-500" />
                  </div>
                </CardContent>
              </Card>
              <Card className="rounded-xl md:rounded-2xl border-0 shadow-md bg-gradient-to-br from-white to-yellow-50/50">
                <CardContent className="p-2 md:p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[8px] md:text-xs text-muted-foreground">Low/Loss Items</p>
                      <p className="text-sm md:text-xl font-bold text-yellow-600">
                        {summary.lowMarginItems + summary.lossItems}
                      </p>
                    </div>
                    <TrendingDown className="h-4 w-4 md:h-5 md:w-5 text-yellow-500" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {/* Filters */}
        <Card className="mb-4 md:mb-6 rounded-xl md:rounded-2xl border-0 shadow-lg">
          <CardContent className="p-3 md:p-6">
            <div className="flex flex-col gap-2 md:gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3 w-3 md:h-4 md:w-4 text-purple-500" />
                <Input
                  placeholder="Search items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 md:pl-9 rounded-xl border-purple-200 focus:border-purple-500 text-sm md:text-base"
                />
              </div>
              
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-3">
                <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
                  <SelectTrigger className="rounded-xl border-purple-200 text-xs md:text-sm h-9 md:h-10">
                    <Filter className="mr-1 md:mr-2 h-3 w-3 md:h-4 md:w-4 text-purple-500" />
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="all">All Categories</SelectItem>
                    {categoryOptions.map(cat => (
                      <SelectItem key={cat._id} value={cat._id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={selectedCategoryType} onValueChange={setSelectedCategoryType}>
                  <SelectTrigger className="rounded-xl border-purple-200 text-xs md:text-sm h-9 md:h-10">
                    <Grid3X3 className="mr-1 md:mr-2 h-3 w-3 md:h-4 md:w-4 text-purple-500" />
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="FOOD">Food</SelectItem>
                    <SelectItem value="DRINK">Drink</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="rounded-xl border-purple-200 text-xs md:text-sm h-9 md:h-10">
                    <AlertCircle className="mr-1 md:mr-2 h-3 w-3 md:h-4 md:w-4 text-purple-500" />
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="profitable">Profitable</SelectItem>
                    <SelectItem value="low">Low Margin</SelectItem>
                    <SelectItem value="loss">Loss</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex gap-2">
                  <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                    <SelectTrigger className="rounded-xl border-purple-200 text-xs md:text-sm h-9 md:h-10 flex-1">
                      <ArrowUpDown className="mr-1 md:mr-2 h-3 w-3 md:h-4 md:w-4 text-purple-500" />
                      <SelectValue placeholder="Sort" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="margin">Margin</SelectItem>
                      <SelectItem value="profit">Profit</SelectItem>
                      <SelectItem value="price">Price</SelectItem>
                      <SelectItem value="cost">Cost</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                    className="rounded-xl border-purple-200 h-9 md:h-10 w-9 md:w-10"
                  >
                    <ArrowUpDown className="h-3 w-3 md:h-4 md:w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Charts */}
        {chartData.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-6 md:mb-8">
            <Card className="rounded-xl md:rounded-2xl border-0 shadow-lg">
              <CardHeader className="p-3 md:p-6">
                <CardTitle className="text-sm md:text-lg">Top Items - Revenue vs Cost</CardTitle>
                <CardDescription className="text-xs md:text-sm">Top items sold today</CardDescription>
              </CardHeader>
              <CardContent className="p-3 md:p-6">
                <div className="w-full h-[200px] md:h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" angle={-45} textAnchor="end" height={60} tick={{ fontSize: 10 }} />
                      <YAxis yAxisId="left" tickFormatter={(value) => formatCurrency(value)} tick={{ fontSize: 10 }} />
                      <YAxis yAxisId="right" orientation="right" tickFormatter={(value) => `${value}%`} tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(value, name) => {
                        if (name === 'margin') return `${Number(value).toFixed(1)}%`
                        return formatCurrency(value as number)
                      }} />
                      <Legend wrapperStyle={{ fontSize: '10px' }} />
                      <Bar yAxisId="left" dataKey="price" name="Price" fill="#22c55e" />
                      <Bar yAxisId="left" dataKey="cost" name="Stock Cost" fill="#f97316" />
                      <Line yAxisId="right" type="monotone" dataKey="margin" name="Margin %" stroke="#8b5cf6" strokeWidth={2} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {pieData.length > 0 && (
              <Card className="rounded-xl md:rounded-2xl border-0 shadow-lg">
                <CardHeader className="p-3 md:p-6">
                  <CardTitle className="text-sm md:text-lg">Profitability Distribution</CardTitle>
                  <CardDescription className="text-xs md:text-sm">Status of all items sold</CardDescription>
                </CardHeader>
                <CardContent className="p-3 md:p-6">
                  <div className="w-full h-[200px] md:h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => [`${value} items`, 'Count']} />
                        <Legend wrapperStyle={{ fontSize: '10px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Items Table */}
        <Card className="rounded-xl md:rounded-2xl border-0 shadow-lg overflow-hidden">
          <CardHeader className="bg-purple-50/50 p-3 md:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-sm md:text-lg">
                <Clock className="h-4 w-4 md:h-5 md:w-5 text-purple-600" />
                Items Sold Today
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs md:text-sm">
                  {filteredItems.length} items
                </Badge>
                <Badge variant="outline" className="text-xs md:text-sm">
                  {formatCurrency(totals.totalRevenue)} revenue
                </Badge>
              </div>
            </div>
            <CardDescription className="text-xs md:text-sm">
              {format(new Date(), 'EEEE, MMMM d, yyyy')} • {summary?.totalOrders || 0} completed orders
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-purple-50">
                  <TableRow>
                    <TableHead className="font-semibold text-xs md:text-sm">Item</TableHead>
                    <TableHead className="font-semibold text-xs md:text-sm hidden sm:table-cell">Category</TableHead>
                    <TableHead className="text-center font-semibold text-xs md:text-sm">Qty</TableHead>
                    <TableHead className="text-right font-semibold text-xs md:text-sm">Price</TableHead>
                    <TableHead className="text-right font-semibold text-xs md:text-sm hidden md:table-cell">Cost</TableHead>
                    <TableHead className="text-right font-semibold text-xs md:text-sm">Profit</TableHead>
                    <TableHead className="text-right font-semibold text-xs md:text-sm hidden lg:table-cell">Margin</TableHead>
                    <TableHead className="text-center font-semibold text-xs md:text-sm hidden lg:table-cell">Status</TableHead>
                    <TableHead className="text-center font-semibold text-xs md:text-sm">View</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item) => {
                    const typeStyle = categoryTypeColors[item.categoryType as keyof typeof categoryTypeColors] || categoryTypeColors.OTHER
                    const TypeIcon = typeStyle.icon
                    return (
                      <TableRow key={item.itemId} className="hover:bg-purple-50/50 transition-colors">
                        <TableCell className="font-medium text-xs md:text-sm py-2 md:py-3">
                          <div>
                            <span>{item.itemName}</span>
                            <div className="sm:hidden flex items-center gap-1 mt-0.5">
                              <Badge className={`${typeStyle.bg} ${typeStyle.text} border-0 rounded-full text-[8px] px-1.5 py-0`}>
                                <TypeIcon className="h-2 w-2 mr-0.5" />
                                {item.categoryName}
                              </Badge>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Badge className={`${typeStyle.bg} ${typeStyle.text} border-0 rounded-full text-[10px] md:text-xs`}>
                            <TypeIcon className="h-2 w-2 md:h-3 md:w-3 mr-0.5 md:mr-1" />
                            {item.categoryName}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary" className="font-bold text-[10px] md:text-xs">{item.quantitySold}x</Badge>
                        </TableCell>
                        <TableCell className="text-right text-green-600 font-medium text-xs md:text-sm">
                          {formatCurrency(item.sellingPrice)}
                        </TableCell>
                        <TableCell className="text-right text-orange-600 font-medium text-xs md:text-sm hidden md:table-cell">
                          {formatCurrency(item.totalIngredientCost)}
                        </TableCell>
                        <TableCell className={`text-right font-bold text-xs md:text-sm ${getProfitColor(item.profit)}`}>
                          {formatCurrency(item.profit)}
                        </TableCell>
                        <TableCell className="text-right hidden lg:table-cell">
                          <div className="flex flex-col items-end gap-1">
                            <span className={`font-bold text-xs ${getMarginColor(item.profitMargin)}`}>
                              {item.profitMargin.toFixed(1)}%
                            </span>
                            <Progress 
                              value={Math.min(100, Math.max(0, item.profitMargin + 20))} 
                              className={`h-1 w-16 ${getProgressColor(item.profitMargin)}`}
                            />
                          </div>
                        </TableCell>
                        <TableCell className="text-center hidden lg:table-cell">
                          {getStatusBadge(item.status)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDetails(item)}
                            className="rounded-full hover:bg-purple-100 h-7 w-7 md:h-8 md:w-8 p-0"
                          >
                            <Eye className="h-3 w-3 md:h-4 md:w-4 text-purple-600" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}

                  {filteredItems.length === 0 && !error && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 md:py-10 text-muted-foreground">
                        <div className="flex flex-col items-center gap-2">
                          <AlertCircle className="h-6 w-6 md:h-8 md:w-8 text-muted-foreground" />
                          <p className="text-sm md:text-base">No items found matching your filters</p>
                          <Button variant="outline" size="sm" onClick={() => {
                            setSearchQuery("")
                            setSelectedCategoryId("all")
                            setSelectedCategoryType("all")
                            setStatusFilter("all")
                          }}>
                            Clear Filters
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}

                  {/* Total Row */}
                  {filteredItems.length > 0 && (
                    <TableRow className="bg-purple-50/70 font-bold border-t-2 border-purple-200">
                      <TableCell colSpan={4} className="text-right text-sm md:text-base">
                        TOTAL
                      </TableCell>
                      <TableCell className="text-right text-orange-600 text-sm md:text-base hidden md:table-cell">
                        {formatCurrency(totals.totalCost)}
                      </TableCell>
                      <TableCell className={`text-right text-sm md:text-base ${getProfitColor(totals.totalProfit)}`}>
                        {formatCurrency(totals.totalProfit)}
                      </TableCell>
                      <TableCell className="text-right hidden lg:table-cell">
                        <span className={getMarginColor(summary?.profitMargin || 0)}>
                          {summary?.profitMargin.toFixed(1)}%
                        </span>
                      </TableCell>
                      <TableCell className="text-center hidden lg:table-cell">
                        <Badge variant="outline" className="text-xs">
                          {filteredItems.length} items
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center"></TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Dialogs */}
        <ItemDetailDialog 
          item={selectedItem}
          isOpen={isDetailOpen}
          onClose={() => {
            setIsDetailOpen(false)
            setSelectedItem(null)
          }}
        />

        <StockValuationDialog
          isOpen={isStockValuationOpen}
          onClose={() => setIsStockValuationOpen(false)}
          stockValuation={stockValuation}
        />
      </div>
    </div>
  )
}