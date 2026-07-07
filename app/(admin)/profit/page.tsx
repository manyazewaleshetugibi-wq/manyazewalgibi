"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Package, 
  Calendar,
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
  ArrowUpDown
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
} from "recharts"
import { format, startOfDay, endOfDay } from "date-fns"
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

interface OrderItem {
  itemId: string
  menuItemId?: string
  quantity: number
  unitPrice: number
  price?: number
  name?: string
  subtotal?: number
  itemName?: string
}

interface Order {
  _id: string
  orderNumber: string
  items?: OrderItem[]
  orderItems?: OrderItem[]
  totalAmount: number
  finalAmount: number
  createdAt: string
  status: string
}

interface IngredientCost {
  stockId: string
  stockName: string
  quantity: number
  unit: string
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
}

// ============================================
// API FUNCTIONS - FIXED
// ============================================

// ✅ FIXED: Get today's completed orders
async function fetchTodayOrders(): Promise<Order[]> {
  const today = new Date()
  const startDate = format(startOfDay(today), "yyyy-MM-dd")
  const endDate = format(endOfDay(today), "yyyy-MM-dd")
  
  // ✅ FIXED: Use the correct endpoint for fetching orders for reports
  try {
    const response = await fetch(`/api/order/waiterreport?startDate=${startDate}&endDate=${endDate}&limit=10000&status=COMPLETED`)
    const data = await response.json()
    
    // Handle different response structures
    let orders = []
    if (data.success && data.data) { // The report endpoint uses 'data'
      orders = data.data
    } else if (data.success && data.orders) { // Fallback for old structure
      orders = data.orders
    } else if (data.data && Array.isArray(data.data)) {
      orders = data.data
    } else if (Array.isArray(data)) {
      orders = data
    }
    // The API now filters by date and status, but we can double-check creation date here if needed.
    // The primary change is relying on the API's date filtering.
    return orders.filter((order: Order) => order.status === 'COMPLETED');

  } catch (error) {
    console.error("Error fetching today's orders:", error)
    return []
  }
}

// ✅ FIXED: Fetch menu items
async function fetchMenuItems(): Promise<MenuItem[]> {
  try {
    const response = await fetch("/api/items")
    if (!response.ok) throw new Error("Failed to fetch menu items")
    const data = await response.json()
    
    // Handle different response structures
    if (data.data) return data.data
    if (data.items) return data.items
    if (Array.isArray(data)) return data
    return []
  } catch (error) {
    console.error("Error fetching menu items:", error)
    return []
  }
}

// ✅ FIXED: Fetch categories
async function fetchCategories(): Promise<Category[]> {
  try {
    const response = await fetch("/api/item-category?limit=100")
    if (!response.ok) throw new Error("Failed to fetch categories")
    const data = await response.json()
    
    if (data.success && data.data) return data.data
    if (Array.isArray(data)) return data
    return []
  } catch (error) {
    console.error("Error fetching categories:", error)
    return []
  }
}

// ✅ FIXED: Fetch stock items
async function fetchStockItems(): Promise<StockItem[]> {
  try {
    const response = await fetch("/api/stock")
    if (!response.ok) throw new Error("Failed to fetch stock items")
    const data = await response.json()
    
    if (data.success && data.data) return data.data
    if (Array.isArray(data)) return data
    return []
  } catch (error) {
    console.error("Error fetching stock items:", error)
    return []
  }
}

// ✅ FIXED: Fetch purchases - handles both "data" and "purchases" fields
async function fetchPurchases(): Promise<Purchase[]> {
  try {
    const response = await fetch("/api/stock-purchase")
    if (!response.ok) throw new Error("Failed to fetch purchases")
    const data = await response.json()
    
    // Handle different response structures
    if (data.success && data.data) return data.data
    if (data.success && data.purchases) return data.purchases
    if (data.data && Array.isArray(data.data)) return data.data
    if (data.purchases && Array.isArray(data.purchases)) return data.purchases
    if (Array.isArray(data)) return data
    return []
  } catch (error) {
    console.error("Error fetching purchases:", error)
    return []
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

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

function getOrderItems(order: Order): OrderItem[] {
  return order.orderItems || order.items || []
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'ETB',
    minimumFractionDigits: 2
  }).format(value)
}

// ============================================
// ITEM DETAIL DIALOG COMPONENT
// ============================================

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
          {/* Summary Cards */}
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

          {/* Status and Margin */}
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
            {item.preparationTime > 0 && (
              <Badge variant="outline" className="text-sm px-4 py-2">
                Prep Time: {item.preparationTime} min
              </Badge>
            )}
          </div>

          {/* Ingredients Table */}
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
                    <TableHead className="text-right font-semibold">Unit Price</TableHead>
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
                        {ing.latestPrice > 0 ? formatCurrency(ing.latestPrice) : 'No price'}
                      </TableCell>
                      <TableCell className="text-right text-orange-600 font-medium">
                        {formatCurrency(ing.totalCost)}
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">
                        {ing.supplier || 'N/A'}
                      </TableCell>
                    </TableRow>
                  ))}
                  {item.ingredients.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                        No ingredients defined for this item
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Margin Visualization */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Profit Margin Visualization</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-red-600">Loss</span>
                <span className="text-orange-600">0%</span>
                <span className="text-yellow-600">10%</span>
                <span className="text-emerald-600">20%</span>
                <span className="text-green-600">30%+</span>
              </div>
              <Progress 
                value={Math.min(100, Math.max(0, (item.profitMargin / 40) * 100))} 
                className={`h-3 ${item.profitMargin >= 30 ? 'bg-green-500' : item.profitMargin >= 20 ? 'bg-emerald-500' : item.profitMargin >= 10 ? 'bg-yellow-500' : item.profitMargin >= 0 ? 'bg-orange-500' : 'bg-red-500'}`}
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>Target: &gt;30% margin</span>
                <span className="font-bold">Current: {item.profitMargin.toFixed(1)}%</span>
              </div>
            </div>
          </div>

          {/* Recommendations */}
          {item.profitMargin < 20 && (
            <div className={`p-4 rounded-xl ${item.profitMargin < 0 ? 'bg-red-50 border border-red-200' : 'bg-yellow-50 border border-yellow-200'}`}>
              <div className="flex items-start gap-3">
                {item.profitMargin < 0 ? (
                  <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                )}
                <div>
                  <p className="font-semibold mb-1">Recommendation</p>
                  {item.profitMargin < 0 ? (
                    <p className="text-sm">
                      This item is currently making a loss. Consider increasing the selling price, 
                      negotiating better ingredient prices, or reviewing the recipe quantities.
                    </p>
                  ) : item.profitMargin < 10 ? (
                    <p className="text-sm">
                      This item has a very low profit margin. Look for opportunities to reduce ingredient costs 
                      or consider a price adjustment.
                    </p>
                  ) : (
                    <p className="text-sm">
                      This item has a low profit margin. Consider optimizing ingredient costs or 
                      slightly increasing the price to reach target margin.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
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
  
  // Dialog state
  const [selectedItem, setSelectedItem] = useState<DailySoldItem | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  
  // Data states
  const [orders, setOrders] = useState<Order[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [stocks, setStocks] = useState<StockItem[]>([])
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [todayItems, setTodayItems] = useState<DailySoldItem[]>([])
  const [summary, setSummary] = useState<DailySummary | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

  // Load data
  const loadData = async () => {
    setIsLoading(true)
    setError(null)
    try {
      // Fetch all required data in parallel
      const [ordersData, menuData, categoryData, stockData, purchaseData] = await Promise.all([
        fetchTodayOrders(),
        fetchMenuItems(),
        fetchCategories(),
        fetchStockItems(),
        fetchPurchases()
      ])

      console.log("📊 Orders fetched:", ordersData.length)
      console.log("📦 Menu items fetched:", menuData.length)
      console.log("📁 Categories fetched:", categoryData.length)
      console.log("📦 Stock items fetched:", stockData.length)
      console.log("🛒 Purchases fetched:", purchaseData.length)

      setOrders(ordersData)
      setMenuItems(menuData)
      setCategories(categoryData)
      setStocks(stockData)
      setPurchases(purchaseData)

      // Calculate profitability for today's sold items
      calculateTodayProfitability(ordersData, menuData, categoryData, stockData, purchaseData)
      
      setLastUpdated(new Date())
    } catch (error) {
      console.error("Error loading data:", error)
      setError("Failed to load data. Please try again.")
    } finally {
      setIsLoading(false)
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
      
      ordersData.forEach(order => {
        const orderItems = getOrderItems(order)
        if (!orderItems || orderItems.length === 0) {
          console.warn(`Order ${order._id} has no items`)
          return
        }

        orderItems.forEach(item => {
          const itemId = item.menuItemId || item.itemId
          if (!itemId) {
            console.warn(`Order ${order._id} has item without ID`)
            return
          }
          
          const quantity = item.quantity || 0
          
          const existing = salesMap.get(itemId) || { quantity: 0 }
          
          salesMap.set(itemId, {
            quantity: existing.quantity + quantity
          })
        })
      })

      console.log(`Found ${salesMap.size} unique items sold today from completed orders`)

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
          totalIngredients: 0
        })
        return
      }

      // Calculate profitability for each sold item
      const results: DailySoldItem[] = []

      salesMap.forEach((sale, itemId) => {
        // Find menu item
        const menuItem = menuData.find(item => item._id === itemId)
        if (!menuItem || !menuItem.isActive) {
          console.warn(`Menu item ${itemId} not found or inactive`)
          return
        }

        // Find category
        const category = categoryData.find(c => c._id === menuItem.categoryId)
        const categoryName = category?.name || "Uncategorized"
        const categoryType = category?.type || "OTHER"

        let totalCost = 0
        let singleItemCost = 0
        const ingredients: IngredientCost[] = []

        // Calculate cost from required stock
        if (menuItem.requiredStock && menuItem.requiredStock.length > 0) {
          for (const req of menuItem.requiredStock) {
            const { price: latestPrice, date: purchaseDate, supplier } = getLatestPrice(req.stockId, purchaseData)
            // Cost = quantity_needed × latest_price × quantity_sold
            const cost = req.quantity * latestPrice * sale.quantity
            totalCost += cost
            const ingredientCostForOne = req.quantity * latestPrice
            singleItemCost += ingredientCostForOne

            ingredients.push({
              stockId: req.stockId,
              stockName: getStockName(req.stockId, stockData), // Cost per single item
              quantity: req.quantity, // Cost per single item
              unit: getStockUnit(req.stockId, stockData),
              latestPrice: latestPrice,
              totalCost: ingredientCostForOne,
              purchaseDate: purchaseDate || '',
              supplier: supplier
            })
          }
        }

        // Revenue is price × quantity sold
        const singleItemProfit = menuItem.price - singleItemCost
        const profitMargin = menuItem.price > 0 ? (singleItemProfit / menuItem.price) * 100 : 0

        let status: 'profitable' | 'low' | 'loss' = 'profitable'
        if (profitMargin < 0) status = 'loss'
        else if (profitMargin < 20) status = 'low'
        else status = 'profitable'

        // ✅ FIXED: Storing per-item cost and profit
        results.push({
          itemId: menuItem._id,
          itemName: menuItem.name,
          sellingPrice: menuItem.price, // Price for one item
          totalIngredientCost: singleItemCost, // Cost for one item
          profit: singleItemProfit, // Profit for one item
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

      // Sort by profit margin
      results.sort((a, b) => b.profitMargin - a.profitMargin)
      setTodayItems(results)

      // Calculate summary
      const totalRevenue = results.reduce((sum, item) => sum + (item.sellingPrice * item.quantitySold), 0);
      const totalCost = results.reduce((sum, item) => sum + (item.totalIngredientCost * item.quantitySold), 0);
      const totalProfit = totalRevenue - totalCost;
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
        totalIngredients
      })
    } catch (error) {
      console.error("Error calculating profitability:", error)
      setError("Failed to calculate profitability")
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
    const totalCost = filteredItems.reduce((sum, item) => sum + (item.totalIngredientCost * item.quantitySold), 0)
    const totalRevenue = filteredItems.reduce((sum, item) => sum + (item.sellingPrice * item.quantitySold), 0)
    const totalProfit = totalRevenue - totalCost;
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
      'Price (per item)': formatCurrency(item.sellingPrice),
      'Cost (per item)': formatCurrency(item.totalIngredientCost),
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
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200">Profitable</Badge>
      case 'low':
        return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200">Low Margin</Badge>
      case 'loss':
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200">Loss</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  const getProfitColor = (profit: number) => {
    if (profit > 0) return 'text-green-600 dark:text-green-400'
    if (profit < 0) return 'text-red-600 dark:text-red-400'
    return 'text-gray-600'
  }

  const getMarginColor = (margin: number) => {
    if (margin >= 30) return 'text-green-600 dark:text-green-400'
    if (margin >= 20) return 'text-emerald-600 dark:text-emerald-400'
    if (margin >= 10) return 'text-yellow-600 dark:text-yellow-400'
    if (margin >= 0) return 'text-orange-600 dark:text-orange-400'
    return 'text-red-600 dark:text-red-400'
  }

  const getProgressColor = (margin: number) => {
    if (margin >= 30) return 'bg-green-500'
    if (margin >= 20) return 'bg-emerald-500'
    if (margin >= 10) return 'bg-yellow-500'
    if (margin >= 0) return 'bg-orange-500'
    return 'bg-red-500'
  }

  const categoryTypeColors = {
    FOOD: { bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-800 dark:text-amber-300", border: "border-amber-200 dark:border-amber-800", icon: Pizza },
    DRINK: { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-800 dark:text-blue-300", border: "border-blue-200 dark:border-blue-800", icon: Coffee },
    OTHER: { bg: "bg-purple-100 dark:bg-purple-900/30", text: "text-purple-800 dark:text-purple-300", border: "border-purple-200 dark:border-purple-800", icon: Utensils },
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
    { name: 'Loss (&lt;0%)', value: summary?.lossItems || 0, color: '#ef4444' }
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

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-6 flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Error Loading Data</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </CardContent>
        </Card>
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
                Today's Profit
              </h1>
            </div>
            <p className="text-xs md:text-sm text-muted-foreground ml-8 md:ml-9">
              {format(new Date(), 'EEEE, MMMM d, yyyy')}
            </p>
            <p className="text-[10px] md:text-xs text-muted-foreground ml-8 md:ml-9 mt-0.5 md:mt-1">
              {summary?.totalOrders || 0} completed orders • {summary?.totalItemsSold || 0} items sold
            </p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
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

        {/* Summary Stats Cards */}
        {summary && (
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
        )}

        {/* Second Row Stats */}
        {summary && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4 mb-4 md:mb-8">
            <Card className="rounded-xl md:rounded-2xl border-0 shadow-md bg-gradient-to-br from-white to-purple-50/50">
              <CardContent className="p-2 md:p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[8px] md:text-xs text-muted-foreground">Margin</p>
                    <p className={`text-sm md:text-xl font-bold ${getMarginColor(summary.profitMargin)}`}>
                      {summary.profitMargin.toFixed(1)}%
                    </p>
                  </div>
                  <Percent className="h-4 w-4 md:h-5 md:w-5 text-purple-500" />
                </div>
              </CardContent>
            </Card>
            <Card className="rounded-xl md:rounded-2xl border-0 shadow-md bg-gradient-to-br from-white to-green-50/50">
              <CardContent className="p-2 md:p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[8px] md:text-xs text-muted-foreground">Profitable</p>
                    <p className="text-sm md:text-xl font-bold text-green-600">{summary.profitableItems}</p>
                  </div>
                  <TrendingUp className="h-4 w-4 md:h-5 md:w-5 text-green-500" />
                </div>
              </CardContent>
            </Card>
            <Card className="rounded-xl md:rounded-2xl border-0 shadow-md bg-gradient-to-br from-white to-yellow-50/50">
              <CardContent className="p-2 md:p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[8px] md:text-xs text-muted-foreground">Low Margin</p>
                    <p className="text-sm md:text-xl font-bold text-yellow-600">{summary.lowMarginItems}</p>
                  </div>
                  <TrendingDown className="h-4 w-4 md:h-5 md:w-5 text-yellow-500" />
                </div>
              </CardContent>
            </Card>
            <Card className="rounded-xl md:rounded-2xl border-0 shadow-md bg-gradient-to-br from-white to-red-50/50">
              <CardContent className="p-2 md:p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[8px] md:text-xs text-muted-foreground">Loss</p>
                    <p className="text-sm md:text-xl font-bold text-red-600">{summary.lossItems}</p>
                  </div>
                  <TrendingDown className="h-4 w-4 md:h-5 md:w-5 text-red-500" />
                </div>
              </CardContent>
            </Card>
          </div>
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-6 md:mb-8">
          {chartData.length > 0 && (
            <Card className="rounded-xl md:rounded-2xl border-0 shadow-lg">
              <CardHeader className="p-3 md:p-6">
                <CardTitle className="text-sm md:text-lg">Top Items - Revenue vs Cost</CardTitle>
                <CardDescription className="text-xs md:text-sm">Top items sold today</CardDescription>
              </CardHeader>
              <CardContent className="p-3 md:p-6">
                <div className="w-full h-[200px] md:h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" angle={-45} textAnchor="end" height={60} tick={{ fontSize: 10 }} />
                      <YAxis tickFormatter={(value) => formatCurrency(value)} tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(value) => formatCurrency(value as number)} />
                      <Legend wrapperStyle={{ fontSize: '10px' }} />
                      <Bar dataKey="price" name="Price" fill="#22c55e" />
                      <Bar dataKey="cost" name="Stock Cost" fill="#f97316" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

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

        {/* Items Table */}
        <Card className="rounded-xl md:rounded-2xl border-0 shadow-lg overflow-hidden">
          <CardHeader className="bg-purple-50/50 p-3 md:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-sm md:text-lg">
                <Clock className="h-4 w-4 md:h-5 md:w-5 text-purple-600" />
                Items Sold Today
              </CardTitle>
              <Badge variant="secondary" className="text-xs md:text-sm">
                {filteredItems.length} items
              </Badge>
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

                  {filteredItems.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 md:py-10 text-muted-foreground">
                        <div className="flex flex-col items-center gap-2">
                          <AlertCircle className="h-6 w-6 md:h-8 md:w-8 text-muted-foreground" />
                          <p className="text-sm md:text-base">No completed orders found today</p>
                          <Button variant="outline" size="sm" onClick={handleRefresh}>
                            <RefreshCw className="h-3 w-3 md:h-4 md:w-4 mr-2" />
                            Refresh
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

        {/* Item Detail Dialog */}
        <ItemDetailDialog 
          item={selectedItem}
          isOpen={isDetailOpen}
          onClose={() => {
            setIsDetailOpen(false)
            setSelectedItem(null)
          }}
        />
      </div>
    </div>
  )
}