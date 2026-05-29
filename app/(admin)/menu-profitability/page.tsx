// app/menu-profitability/page.tsx
"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { 
  Coffee, 
  TrendingUp, 
  TrendingDown, 
  DollarSign,
  Search,
  RefreshCcw,
  ArrowUpDown,
  Package,
  AlertCircle,
  Clock,
  Download,
  Filter,
  Percent,
  Calculator,
  Eye,
  AlertTriangle,
  Pizza,
  Utensils,
  Grid3X3,
  List,
  PieChart as PieChartIcon,
  Wine,
  Soup,
  Cake,
  Sandwich,
  Flame
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
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
import { Progress } from "@/components/ui/progress"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
import * as XLSX from "xlsx"
import { format } from "date-fns"
import { useRouter } from "next/navigation"
// Types based on your API structure
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

interface MenuProfitability {
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
}

interface CategoryProfitability {
  categoryId: string
  categoryName: string
  categoryType: string
  totalItems: number
  totalRevenue: number
  totalCost: number
  totalProfit: number
  averageMargin: number
  profitableItems: number
  lowMarginItems: number
  lossItems: number
  items: MenuProfitability[]
}

// Helper function to get category icon
const getCategoryIcon = (type: string, className?: string) => {
  switch (type?.toUpperCase()) {
    case 'FOOD': return <Pizza className={className || "h-4 w-4"} />
    case 'DRINK': return <Coffee className={className || "h-4 w-4"} />
    case 'OTHER': return <Utensils className={className || "h-4 w-4"} />
    default: return <Layers className={className || "h-4 w-4"} />
  }
}

// Category type colors
const categoryTypeColors = {
  FOOD: { bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-800 dark:text-amber-300", border: "border-amber-200 dark:border-amber-800", icon: Pizza },
  DRINK: { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-800 dark:text-blue-300", border: "border-blue-200 dark:border-blue-800", icon: Coffee },
  OTHER: { bg: "bg-purple-100 dark:bg-purple-900/30", text: "text-purple-800 dark:text-purple-300", border: "border-purple-200 dark:border-purple-800", icon: Utensils },
}

// API Functions
async function fetchMenuItems(): Promise<MenuItem[]> {
  const response = await fetch("/api/items")
  if (!response.ok) throw new Error("Failed to fetch menu items")
  const data = await response.json()
  if (data.data) return data.data
  if (data.items) return data.items
  if (Array.isArray(data)) return data
  return []
}

async function fetchCategories(): Promise<Category[]> {
  const response = await fetch("/api/item-category?limit=100")
  if (!response.ok) throw new Error("Failed to fetch categories")
  const data = await response.json()
  if (data.success && data.data) return data.data
  return []
}

async function fetchStockItems(): Promise<StockItem[]> {
  const response = await fetch("/api/stock")
  if (!response.ok) throw new Error("Failed to fetch stock items")
  const data = await response.json()
  if (data.success && data.data) return data.data
  return []
}

async function fetchPurchases(): Promise<Purchase[]> {
  const response = await fetch("/api/stock-purchase")
  if (!response.ok) throw new Error("Failed to fetch purchases")
  const data = await response.json()
  if (data.success && data.purchases) return data.purchases
  return []
}

// Helper function to get latest price for a stock
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

// Format currency
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'ETB',
    minimumFractionDigits: 2
  }).format(value)
}

// Color palette for charts
const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82CA9D", "#FF6B6B", "#4ECDC4"]

export default function MenuProfitabilityPage() {
  const router = useRouter()
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [stocks, setStocks] = useState<StockItem[]>([])
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("all")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [sortBy, setSortBy] = useState<'profit' | 'margin' | 'price' | 'cost'>('margin')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [selectedMenuItem, setSelectedMenuItem] = useState<MenuProfitability | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<string>("items")
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table')

  // Fetch data on mount
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [items, categoryData, stockItems, purchaseData] = await Promise.all([
        fetchMenuItems(),
        fetchCategories(),
        fetchStockItems(),
        fetchPurchases()
      ])
      
      setMenuItems(items)
      setCategories(categoryData)
      setStocks(stockItems)
      setPurchases(purchaseData)
      setLastUpdated(new Date())
    } catch (error) {
      console.error("Error loading data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  // Calculate profitability for each menu item - same logic as your menu page for category matching
  const profitabilityData = useMemo(() => {
    const results: MenuProfitability[] = []

    menuItems.forEach(item => {
      if (!item.isActive) return

      // Find category - EXACT same logic as your Menu page
      const category = categories.find(c => c._id === item.categoryId)
      const categoryName = category?.name || "Uncategorized"
      const categoryType = category?.type || "OTHER"

      let totalCost = 0
      const ingredients: IngredientCost[] = []

      if (item.requiredStock && item.requiredStock.length > 0) {
        item.requiredStock.forEach(req => {
          const { price: latestPrice, purchaseDate, supplier } = getLatestPrice(req.stockId, purchases)
          const cost = req.quantity * latestPrice
          totalCost += cost

          ingredients.push({
            stockId: req.stockId,
            stockName: getStockName(req.stockId, stocks),
            quantity: req.quantity,
            unit: getStockUnit(req.stockId, stocks),
            latestPrice: latestPrice,
            totalCost: cost,
            purchaseDate: purchaseDate,
            supplier: supplier
          })
        })
      }

      const profit = item.price - totalCost
      const profitMargin = item.price > 0 ? (profit / item.price) * 100 : 0

      let status: 'profitable' | 'low' | 'loss' = 'profitable'
      if (profitMargin < 0) status = 'loss'
      else if (profitMargin < 20) status = 'low'
      else status = 'profitable'

      results.push({
        itemId: item._id,
        itemName: item.name,
        sellingPrice: item.price,
        totalIngredientCost: totalCost,
        profit: profit,
        profitMargin: profitMargin,
        status: status,
        ingredients: ingredients,
        preparationTime: item.preparationTime || 0,
        categoryId: item.categoryId,
        categoryName: categoryName,
        categoryType: categoryType
      })
    })

    return results
  }, [menuItems, categories, stocks, purchases])

  // Calculate category profitability
  const categoryProfitability = useMemo(() => {
    const categoryMap = new Map<string, CategoryProfitability>()

    profitabilityData.forEach(item => {
      const existing = categoryMap.get(item.categoryId)
      
      if (existing) {
        existing.totalRevenue += item.sellingPrice
        existing.totalCost += item.totalIngredientCost
        existing.totalProfit += item.profit
        existing.totalItems++
        existing.items.push(item)
        
        if (item.status === 'profitable') existing.profitableItems++
        else if (item.status === 'low') existing.lowMarginItems++
        else existing.lossItems++
      } else {
        categoryMap.set(item.categoryId, {
          categoryId: item.categoryId,
          categoryName: item.categoryName,
          categoryType: item.categoryType,
          totalItems: 1,
          totalRevenue: item.sellingPrice,
          totalCost: item.totalIngredientCost,
          totalProfit: item.profit,
          averageMargin: 0,
          profitableItems: item.status === 'profitable' ? 1 : 0,
          lowMarginItems: item.status === 'low' ? 1 : 0,
          lossItems: item.status === 'loss' ? 1 : 0,
          items: [item]
        })
      }
    })

    // Calculate average margin for each category
    categoryMap.forEach(category => {
      category.averageMargin = category.totalRevenue > 0 
        ? (category.totalProfit / category.totalRevenue) * 100 
        : 0
    })

    return Array.from(categoryMap.values())
  }, [profitabilityData])

  // Filter and sort items
  const filteredItems = useMemo(() => {
    let filtered = [...profitabilityData]

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

    if (typeFilter !== "all") {
      filtered = filtered.filter(item => item.categoryType === typeFilter)
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
  }, [profitabilityData, searchQuery, selectedCategoryId, typeFilter, statusFilter, sortBy, sortOrder])

  // Filter categories
  const filteredCategories = useMemo(() => {
    let filtered = [...categoryProfitability]

    if (typeFilter !== "all") {
      filtered = filtered.filter(cat => cat.categoryType === typeFilter)
    }

    return filtered
  }, [categoryProfitability, typeFilter])

  // Statistics
  const stats = useMemo(() => {
    const totalItems = filteredItems.length
    const profitableItems = filteredItems.filter(i => i.status === 'profitable').length
    const lowMarginItems = filteredItems.filter(i => i.status === 'low').length
    const lossItems = filteredItems.filter(i => i.status === 'loss').length
    const avgProfitMargin = totalItems > 0 
      ? filteredItems.reduce((sum, i) => sum + i.profitMargin, 0) / totalItems 
      : 0
    const totalProfit = filteredItems.reduce((sum, i) => sum + i.profit, 0)
    const totalRevenue = filteredItems.reduce((sum, i) => sum + i.sellingPrice, 0)
    const totalCost = filteredItems.reduce((sum, i) => sum + i.totalIngredientCost, 0)
    
    return {
      totalItems,
      profitableItems,
      lowMarginItems,
      lossItems,
      avgProfitMargin,
      totalProfit,
      totalRevenue,
      totalCost
    }
  }, [filteredItems])

  // Get unique categories for filter - EXACT same as your Menu page
  const categoryOptions = useMemo(() => {
    return categories.filter(cat => cat.isActive).map(cat => ({
      _id: cat._id,
      name: cat.name,
      type: cat.type
    }))
  }, [categories])

  const handleRefresh = async () => {
    await loadData()
  }

  const handleExport = () => {
    const exportData = filteredItems.map(item => ({
      'Item Name': item.itemName,
      'Category': item.categoryName,
      'Type': item.categoryType,
      'Selling Price (ETB)': item.sellingPrice.toFixed(2),
      'Total Cost (ETB)': item.totalIngredientCost.toFixed(2),
      'Profit (ETB)': item.profit.toFixed(2),
      'Profit Margin (%)': item.profitMargin.toFixed(2),
      'Status': item.status === 'profitable' ? 'Profitable' : item.status === 'low' ? 'Low Margin' : 'Loss',
      'Preparation Time (min)': item.preparationTime
    }))
    
    const worksheet = XLSX.utils.json_to_sheet(exportData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "Menu Profitability")
    XLSX.writeFile(workbook, `menu_profitability_${format(new Date(), 'yyyy-MM-dd')}.xlsx`)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'profitable':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200">Profitable (≥20%)</Badge>
      case 'low':
        return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200">Low Margin (0-20%)</Badge>
      case 'loss':
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200">Loss (&lt;0%)</Badge>
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

  // Chart data for categories
  const categoryChartData = filteredCategories.map(cat => ({
    name: cat.categoryName,
    margin: cat.averageMargin.toFixed(1),
    profit: cat.totalProfit,
    revenue: cat.totalRevenue,
    cost: cat.totalCost,
    itemCount: cat.totalItems
  }))

  // Prepare data for pie chart
  const pieChartData = [
    { name: 'Profitable (≥20%)', value: stats.profitableItems, color: '#22c55e' },
    { name: 'Low Margin (0-20%)', value: stats.lowMarginItems, color: '#eab308' },
    { name: 'Loss (<0%)', value: stats.lossItems, color: '#ef4444' }
  ].filter(d => d.value > 0)

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50/50 via-white to-purple-50/30">
        
        <div className="container mx-auto py-10 px-4">
          <div className="flex items-center justify-between mb-8">
            <div>
              <Skeleton className="h-10 w-80 mb-2" />
              <Skeleton className="h-4 w-96" />
            </div>
            <Skeleton className="h-10 w-32" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32 w-full rounded-2xl" />
            ))}
          </div>
          <Skeleton className="h-[500px] w-full rounded-2xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50/50 via-white to-purple-50/30">
      <div className="container mx-auto py-8 px-4">
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => router.back()}
                className="p-0 h-8 w-8 rounded-full"
              >
                ←
              </Button>
              <h1 className="text-3xl font-bold flex items-center gap-2 bg-gradient-to-r from-purple-800 to-purple-600 bg-clip-text text-transparent">
                <Calculator className="h-8 w-8 text-purple-600" />
                Menu Profitability Analysis
              </h1>
            </div>
            <p className="text-muted-foreground ml-9">
              Calculate profit margins per item and per category based on latest ingredient purchase prices
            </p>
            <p className="text-xs text-muted-foreground ml-9 mt-1">
              Last updated: {format(lastUpdated, 'PPP pp')}
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleRefresh} variant="outline" size="sm" className="rounded-full">
              <RefreshCcw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={handleExport} variant="outline" size="sm" className="rounded-full">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="rounded-2xl border-0 shadow-lg bg-gradient-to-br from-white to-purple-50/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Menu Items</p>
                  <p className="text-2xl font-bold text-purple-900">{stats.totalItems}</p>
                </div>
                <div className="p-3 bg-purple-100 rounded-2xl">
                  <Utensils className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-0 shadow-lg bg-gradient-to-br from-white to-green-50/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Profitable (≥20%)</p>
                  <p className="text-2xl font-bold text-green-600">{stats.profitableItems}</p>
                </div>
                <div className="p-3 bg-green-100 rounded-2xl">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-0 shadow-lg bg-gradient-to-br from-white to-yellow-50/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Low Margin (0-20%)</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.lowMarginItems}</p>
                </div>
                <div className="p-3 bg-yellow-100 rounded-2xl">
                  <Percent className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-0 shadow-lg bg-gradient-to-br from-white to-red-50/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Loss (&lt;0%)</p>
                  <p className="text-2xl font-bold text-red-600">{stats.lossItems}</p>
                </div>
                <div className="p-3 bg-red-100 rounded-2xl">
                  <TrendingDown className="h-6 w-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Second Row Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <Card className="rounded-2xl border-0 shadow-md">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Total Revenue</p>
                  <p className="text-xl font-bold text-green-600">{formatCurrency(stats.totalRevenue)}</p>
                </div>
                <DollarSign className="h-5 w-5 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-0 shadow-md">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Total Cost</p>
                  <p className="text-xl font-bold text-orange-600">{formatCurrency(stats.totalCost)}</p>
                </div>
                <Package className="h-5 w-5 text-orange-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-0 shadow-md">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Total Profit</p>
                  <p className={`text-xl font-bold ${getProfitColor(stats.totalProfit)}`}>
                    {formatCurrency(stats.totalProfit)}
                  </p>
                </div>
                <TrendingUp className={`h-5 w-5 ${stats.totalProfit >= 0 ? 'text-green-500' : 'text-red-500'}`} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
          <TabsList className="grid w-full max-w-md grid-cols-2 rounded-2xl bg-purple-100 p-1">
            <TabsTrigger value="items" className="rounded-xl data-[state=active]:bg-purple-800 data-[state=active]:text-white">
              <List className="h-4 w-4 mr-2" />
              Items View
            </TabsTrigger>
            <TabsTrigger value="categories" className="rounded-xl data-[state=active]:bg-purple-800 data-[state=active]:text-white">
              <PieChartIcon className="h-4 w-4 mr-2" />
              Categories View
            </TabsTrigger>
          </TabsList>

          {/* Items Tab */}
          <TabsContent value="items" className="mt-6">
            {/* Filters */}
            <Card className="mb-6 rounded-2xl border-0 shadow-lg">
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-purple-500" />
                      <Input
                        placeholder="Search menu items by name..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 rounded-xl border-purple-200 focus:border-purple-500"
                      />
                    </div>
                  </div>
                  
                  <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
                    <SelectTrigger className="w-[200px] rounded-xl border-purple-200">
                      <Filter className="mr-2 h-4 w-4 text-purple-500" />
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="all">All Categories</SelectItem>
                      {categoryOptions.map(cat => (
                        <SelectItem key={cat._id} value={cat._id}>
                          <div className="flex items-center gap-2">
                            {getCategoryIcon(cat.type, "h-4 w-4")}
                            {cat.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-[150px] rounded-xl border-purple-200">
                      <Grid3X3 className="mr-2 h-4 w-4 text-purple-500" />
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="FOOD">Food</SelectItem>
                      <SelectItem value="DRINK">Drink</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[160px] rounded-xl border-purple-200">
                      <AlertCircle className="mr-2 h-4 w-4 text-purple-500" />
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="profitable">Profitable (≥20%)</SelectItem>
                      <SelectItem value="low">Low Margin (0-20%)</SelectItem>
                      <SelectItem value="loss">Loss (&lt;0%)</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                    <SelectTrigger className="w-[150px] rounded-xl border-purple-200">
                      <ArrowUpDown className="mr-2 h-4 w-4 text-purple-500" />
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="margin">Sort by Margin</SelectItem>
                      <SelectItem value="profit">Sort by Profit</SelectItem>
                      <SelectItem value="price">Sort by Price</SelectItem>
                      <SelectItem value="cost">Sort by Cost</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                    className="rounded-xl border-purple-200"
                  >
                    <ArrowUpDown className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Items Table */}
            <Card className="rounded-2xl border-0 shadow-lg overflow-hidden">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-purple-50">
                      <TableRow>
                        <TableHead className="font-semibold">Item Name</TableHead>
                        <TableHead className="font-semibold">Category</TableHead>
                        <TableHead className="font-semibold">Type</TableHead>
                        <TableHead className="text-right font-semibold">Price</TableHead>
                        <TableHead className="text-right font-semibold">Cost</TableHead>
                        <TableHead className="text-right font-semibold">Profit</TableHead>
                        <TableHead className="text-right font-semibold">Margin</TableHead>
                        <TableHead className="text-center font-semibold">Status</TableHead>
                        <TableHead className="text-center font-semibold">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredItems.map((item) => {
                        const typeStyle = categoryTypeColors[item.categoryType as keyof typeof categoryTypeColors] || categoryTypeColors.OTHER
                        const TypeIcon = typeStyle.icon
                        return (
                          <TableRow key={item.itemId} className="cursor-pointer hover:bg-purple-50/50 transition-colors">
                            <TableCell className="font-medium">{item.itemName}</TableCell>
                            <TableCell>{item.categoryName}</TableCell>
                            <TableCell>
                              <Badge className={`${typeStyle.bg} ${typeStyle.text} border-0 rounded-full`}>
                                <TypeIcon className="h-3 w-3 mr-1" />
                                {item.categoryType}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right text-green-600 font-medium">
                              {formatCurrency(item.sellingPrice)}
                            </TableCell>
                            <TableCell className="text-right text-orange-600">
                              {formatCurrency(item.totalIngredientCost)}
                            </TableCell>
                            <TableCell className={`text-right font-bold ${getProfitColor(item.profit)}`}>
                              {formatCurrency(item.profit)}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex flex-col items-end gap-1">
                                <span className={`font-bold ${getMarginColor(item.profitMargin)}`}>
                                  {item.profitMargin.toFixed(1)}%
                                </span>
                                <Progress 
                                  value={Math.min(100, Math.max(0, item.profitMargin + 20))} 
                                  className={`h-1.5 w-20 ${getProgressColor(item.profitMargin)}`}
                                />
                              </div>
                            </TableCell>
                            <TableCell className="text-center">{getStatusBadge(item.status)}</TableCell>
                            <TableCell className="text-center">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedMenuItem(item)
                                  setIsDetailOpen(true)
                                }}
                                className="rounded-full hover:bg-purple-100"
                              >
                                <Eye className="h-4 w-4 text-purple-600" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        )
                      })}

                      {filteredItems.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center py-10 text-muted-foreground">
                            No menu items found matching the filters
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Categories Tab */}
          <TabsContent value="categories" className="mt-6">
            {/* Category Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCategories.map((category) => {
                const typeStyle = categoryTypeColors[category.categoryType as keyof typeof categoryTypeColors] || categoryTypeColors.OTHER
                const TypeIcon = typeStyle.icon
                return (
                  <Card key={category.categoryId} className={`rounded-2xl border-0 shadow-lg overflow-hidden hover:shadow-xl transition-all`}>
                    <div className={`h-2 bg-gradient-to-r ${category.categoryType === 'FOOD' ? 'from-amber-500 to-orange-500' : category.categoryType === 'DRINK' ? 'from-blue-500 to-cyan-500' : 'from-purple-500 to-pink-500'}`} />
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`p-2.5 rounded-xl ${typeStyle.bg}`}>
                            <TypeIcon className={`h-5 w-5 ${typeStyle.text}`} />
                          </div>
                          <CardTitle className="text-xl">{category.categoryName}</CardTitle>
                        </div>
                        <Badge className={`${typeStyle.bg} ${typeStyle.text} border-0 rounded-full px-3 py-1`}>
                          {category.categoryType}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-gray-50 rounded-xl p-3 text-center">
                            <p className="text-xs text-muted-foreground">Items</p>
                            <p className="text-2xl font-bold text-purple-900">{category.totalItems}</p>
                          </div>
                          <div className="bg-gray-50 rounded-xl p-3 text-center">
                            <p className="text-xs text-muted-foreground">Avg Margin</p>
                            <p className={`text-2xl font-bold ${getMarginColor(category.averageMargin)}`}>
                              {category.averageMargin.toFixed(1)}%
                            </p>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Revenue</span>
                            <span className="font-semibold text-green-600">{formatCurrency(category.totalRevenue)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Cost</span>
                            <span className="font-semibold text-orange-600">{formatCurrency(category.totalCost)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Profit</span>
                            <span className={`font-semibold ${getProfitColor(category.totalProfit)}`}>
                              {formatCurrency(category.totalProfit)}
                            </span>
                          </div>
                        </div>

                        <Progress 
                          value={Math.min(100, Math.max(0, category.averageMargin + 20))} 
                          className={`h-2 ${getProgressColor(category.averageMargin)}`}
                        />

                        <div className="flex gap-2 pt-2">
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 rounded-full">
                            Profitable: {category.profitableItems}
                          </Badge>
                          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 rounded-full">
                            Low: {category.lowMarginItems}
                          </Badge>
                          {category.lossItems > 0 && (
                            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 rounded-full">
                              Loss: {category.lossItems}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}

              {filteredCategories.length === 0 && (
                <div className="col-span-full text-center py-10 text-muted-foreground">
                  No categories found matching the filters
                </div>
              )}
            </div>

            {/* Category Charts */}
            {filteredCategories.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
                <Card className="rounded-2xl border-0 shadow-lg">
                  <CardHeader>
                    <CardTitle>Category Profit Margin Comparison</CardTitle>
                    <CardDescription>Average profit margin by category</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={categoryChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis tickFormatter={(v) => `${v}%`} />
                        <Tooltip formatter={(value) => `${value}%`} />
                        <Legend />
                        <Bar dataKey="margin" name="Profit Margin %" fill="#8884d8">
                          {categoryChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card className="rounded-2xl border-0 shadow-lg">
                  <CardHeader>
                    <CardTitle>Category Revenue vs Cost</CardTitle>
                    <CardDescription>Revenue and cost breakdown by category</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={categoryChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis tickFormatter={(v) => formatCurrency(v)} />
                        <Tooltip formatter={(value) => formatCurrency(value as number)} />
                        <Legend />
                        <Bar dataKey="revenue" name="Revenue" fill="#22c55e" />
                        <Bar dataKey="cost" name="Cost" fill="#f97316" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Pie Chart for Overall Distribution */}
            {pieChartData.length > 0 && (
              <Card className="rounded-2xl border-0 shadow-lg mt-8">
                <CardHeader>
                  <CardTitle>Overall Profitability Distribution</CardTitle>
                  <CardDescription>Breakdown of menu items by profit status</CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center">
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={pieChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {pieChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`${value} items`, 'Count']} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Item Detail Dialog */}
        <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold">{selectedMenuItem?.itemName}</DialogTitle>
              <DialogDescription>
                Detailed breakdown of ingredient costs and profitability
              </DialogDescription>
            </DialogHeader>

            {selectedMenuItem && (
              <div className="space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card className="rounded-xl">
                    <CardContent className="pt-4">
                      <p className="text-xs text-muted-foreground">Selling Price</p>
                      <p className="text-xl font-bold text-green-600">
                        {formatCurrency(selectedMenuItem.sellingPrice)}
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="rounded-xl">
                    <CardContent className="pt-4">
                      <p className="text-xs text-muted-foreground">Total Cost</p>
                      <p className="text-xl font-bold text-orange-600">
                        {formatCurrency(selectedMenuItem.totalIngredientCost)}
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="rounded-xl">
                    <CardContent className="pt-4">
                      <p className="text-xs text-muted-foreground">Profit</p>
                      <p className={`text-xl font-bold ${getProfitColor(selectedMenuItem.profit)}`}>
                        {formatCurrency(selectedMenuItem.profit)}
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="rounded-xl">
                    <CardContent className="pt-4">
                      <p className="text-xs text-muted-foreground">Margin</p>
                      <p className={`text-xl font-bold ${getMarginColor(selectedMenuItem.profitMargin)}`}>
                        {selectedMenuItem.profitMargin.toFixed(1)}%
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Category and Prep Time */}
                <div className="flex flex-wrap gap-4">
                  <Badge className={categoryTypeColors[selectedMenuItem.categoryType as keyof typeof categoryTypeColors]?.bg + " " + categoryTypeColors[selectedMenuItem.categoryType as keyof typeof categoryTypeColors]?.text + " border-0 rounded-full px-4 py-2 text-base"}>
                    Category: {selectedMenuItem.categoryName}
                  </Badge>
                  {selectedMenuItem.preparationTime > 0 && (
                    <Badge variant="outline" className="rounded-full px-4 py-2 text-base">
                      <Clock className="h-4 w-4 mr-1" />
                      Prep Time: {selectedMenuItem.preparationTime} min
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
                          <TableHead>Ingredient</TableHead>
                          <TableHead className="text-right">Quantity</TableHead>
                          <TableHead className="text-right">Unit Price</TableHead>
                          <TableHead className="text-right">Total Cost</TableHead>
                          <TableHead className="text-right">Last Purchase</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedMenuItem.ingredients.map((ing, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">{ing.stockName}</TableCell>
                            <TableCell className="text-right">
                              {ing.quantity} {ing.unit}
                            </TableCell>
                            <TableCell className="text-right">
                              {ing.latestPrice > 0 ? formatCurrency(ing.latestPrice) : 'No price'}
                            </TableCell>
                            <TableCell className="text-right text-orange-600">
                              {formatCurrency(ing.totalCost)}
                            </TableCell>
                            <TableCell className="text-right text-xs text-muted-foreground">
                              {ing.purchaseDate ? format(new Date(ing.purchaseDate), 'PP') : 'No purchase'}
                            </TableCell>
                          </TableRow>
                        ))}
                        {selectedMenuItem.ingredients.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                              No ingredients defined for this menu item
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
                      value={Math.min(100, Math.max(0, (selectedMenuItem.profitMargin / 40) * 100))} 
                      className={`h-3 ${getProgressColor(selectedMenuItem.profitMargin)}`}
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>Target: &gt;30% margin</span>
                      <span>Current: {selectedMenuItem.profitMargin.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>

                {/* Recommendations */}
                {selectedMenuItem.profitMargin < 20 && (
                  <div className={`p-4 rounded-xl ${selectedMenuItem.profitMargin < 0 ? 'bg-red-50 border border-red-200' : 'bg-yellow-50 border border-yellow-200'}`}>
                    <div className="flex items-start gap-3">
                      {selectedMenuItem.profitMargin < 0 ? (
                        <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                      )}
                      <div>
                        <p className="font-semibold mb-1">Recommendation</p>
                        {selectedMenuItem.profitMargin < 0 ? (
                          <p className="text-sm">
                            This item is currently making a loss. Consider increasing the selling price, 
                            negotiating better ingredient prices, or reviewing the recipe quantities.
                          </p>
                        ) : selectedMenuItem.profitMargin < 10 ? (
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
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
