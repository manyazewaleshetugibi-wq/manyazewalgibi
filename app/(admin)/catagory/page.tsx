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
  BarChart3,
  List,
  PieChart as PieChartIcon
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
  LineChart,
  Line
} from "recharts"
import * as XLSX from "xlsx"
import { format } from "date-fns"
import { useRouter } from "next/navigation"

// Types
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

interface ItemCategory {
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

async function fetchCategories(): Promise<ItemCategory[]> {
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

// Category type colors
const categoryTypeColors = {
  FOOD: { bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-800 dark:text-amber-300", border: "border-amber-200 dark:border-amber-800", icon: Pizza },
  DRINK: { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-800 dark:text-blue-300", border: "border-blue-200 dark:border-blue-800", icon: Coffee },
  OTHER: { bg: "bg-purple-100 dark:bg-purple-900/30", text: "text-purple-800 dark:text-purple-300", border: "border-purple-200 dark:border-purple-800", icon: Utensils },
}

export default function MenuProfitabilityPage() {
  const router = useRouter()
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [categories, setCategories] = useState<ItemCategory[]>([])
  const [stocks, setStocks] = useState<StockItem[]>([])
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
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

  // Calculate profitability for each menu item
  const profitabilityData = useMemo(() => {
    const results: MenuProfitability[] = []

    menuItems.forEach(item => {
      if (!item.isActive) return

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

      // Find category info
      const category = categories.find(c => c._id === item.categoryId)
      
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
        categoryName: category?.name || "Uncategorized",
        categoryType: category?.type || "OTHER"
      })
    })

    return results
  }, [menuItems, stocks, purchases, categories])

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

    if (categoryFilter !== "all") {
      filtered = filtered.filter(item => item.categoryId === categoryFilter)
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
  }, [profitabilityData, searchQuery, categoryFilter, typeFilter, statusFilter, sortBy, sortOrder])

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

  // Get unique filters
  const uniqueCategories = useMemo(() => {
    const cats = new Map()
    profitabilityData.forEach(item => {
      if (!cats.has(item.categoryId)) {
        cats.set(item.categoryId, { id: item.categoryId, name: item.categoryName, type: item.categoryType })
      }
    })
    return Array.from(cats.values())
  }, [profitabilityData])

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
    exportToExcel(exportData, `menu_profitability_${format(new Date(), 'yyyy-MM-dd')}`)
  }

  const exportToExcel = (data: any[], filename: string) => {
    const worksheet = XLSX.utils.json_to_sheet(data)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "Menu Profitability")
    XLSX.writeFile(workbook, `${filename}.xlsx`)
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
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
        <Skeleton className="h-[500px] w-full" />
      </div>
    )
  }

  return (
    <div className="container mx-auto py-10 px-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => router.back()}
              className="p-0 h-8 w-8"
            >
              ←
            </Button>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Calculator className="h-8 w-8 text-purple-500" />
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
          <Button onClick={handleRefresh} variant="outline" size="sm">
            <RefreshCcw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={handleExport} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Menu Items</p>
                <p className="text-2xl font-bold">{stats.totalItems}</p>
              </div>
              <Utensils className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200 dark:border-green-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Profitable (≥20%)</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.profitableItems}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-yellow-200 dark:border-yellow-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Low Margin (0-20%)</p>
                <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.lowMarginItems}</p>
              </div>
              <Percent className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-200 dark:border-red-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Loss (&lt;0%)</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.lossItems}</p>
              </div>
              <TrendingDown className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Second Row Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Revenue</p>
                <p className="text-xl font-bold text-green-600">{formatCurrency(stats.totalRevenue)}</p>
              </div>
              <DollarSign className="h-6 w-6 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Cost</p>
                <p className="text-xl font-bold text-orange-600">{formatCurrency(stats.totalCost)}</p>
              </div>
              <Package className="h-6 w-6 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Profit</p>
                <p className={`text-xl font-bold ${getProfitColor(stats.totalProfit)}`}>
                  {formatCurrency(stats.totalProfit)}
                </p>
              </div>
              <TrendingUp className={`h-6 w-6 ${stats.totalProfit >= 0 ? 'text-green-500' : 'text-red-500'}`} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Items vs Categories */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="items" className="flex items-center gap-2">
            <List className="h-4 w-4" />
            Items View
          </TabsTrigger>
          <TabsTrigger value="categories" className="flex items-center gap-2">
            <PieChartIcon className="h-4 w-4" />
            Categories View
          </TabsTrigger>
        </TabsList>

        <TabsContent value="items" className="mt-6">
          {/* Filters for Items View */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search menu items by name..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
                
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-[180px]">
                    <Filter className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {uniqueCategories.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-[150px]">
                    <Grid3X3 className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="FOOD">Food</SelectItem>
                    <SelectItem value="DRINK">Drink</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[160px]">
                    <AlertCircle className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="profitable">Profitable (≥20%)</SelectItem>
                    <SelectItem value="low">Low Margin (0-20%)</SelectItem>
                    <SelectItem value="loss">Loss (&lt;0%)</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                  <SelectTrigger className="w-[150px]">
                    <ArrowUpDown className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
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
                  title={sortOrder === 'desc' ? 'Descending' : 'Ascending'}
                >
                  <ArrowUpDown className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Items Table */}
          <Card>
            <CardContent className="p-0">
              <div className="rounded-md border-0 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="whitespace-nowrap">Item Name</TableHead>
                      <TableHead className="whitespace-nowrap">Category</TableHead>
                      <TableHead className="whitespace-nowrap">Type</TableHead>
                      <TableHead className="text-right whitespace-nowrap">Price</TableHead>
                      <TableHead className="text-right whitespace-nowrap">Cost</TableHead>
                      <TableHead className="text-right whitespace-nowrap">Profit</TableHead>
                      <TableHead className="text-right whitespace-nowrap">Margin</TableHead>
                      <TableHead className="text-center whitespace-nowrap">Status</TableHead>
                      <TableHead className="text-center whitespace-nowrap">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredItems.map((item) => {
                      const typeStyle = categoryTypeColors[item.categoryType as keyof typeof categoryTypeColors] || categoryTypeColors.OTHER
                      const TypeIcon = typeStyle.icon
                      return (
                        <TableRow key={item.itemId} className="cursor-pointer hover:bg-muted/50">
                          <TableCell className="font-medium whitespace-nowrap">{item.itemName}</TableCell>
                          <TableCell className="whitespace-nowrap">{item.categoryName}</TableCell>
                          <TableCell className="whitespace-nowrap">
                            <Badge className={`${typeStyle.bg} ${typeStyle.text} border-0`}>
                              <TypeIcon className="h-3 w-3 mr-1" />
                              {item.categoryType}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right whitespace-nowrap text-green-600">
                            {formatCurrency(item.sellingPrice)}
                          </TableCell>
                          <TableCell className="text-right whitespace-nowrap text-orange-600">
                            {formatCurrency(item.totalIngredientCost)}
                          </TableCell>
                          <TableCell className={`text-right whitespace-nowrap font-bold ${getProfitColor(item.profit)}`}>
                            {formatCurrency(item.profit)}
                          </TableCell>
                          <TableCell className="text-right whitespace-nowrap">
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
                          <TableCell className="text-center whitespace-nowrap">{getStatusBadge(item.status)}</TableCell>
                          <TableCell className="text-center whitespace-nowrap">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedMenuItem(item)
                                setIsDetailOpen(true)
                              }}
                            >
                              <Eye className="h-4 w-4" />
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

        <TabsContent value="categories" className="mt-6">
          {/* Filters for Categories View */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4">
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-[180px]">
                    <Grid3X3 className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="FOOD">Food</SelectItem>
                    <SelectItem value="DRINK">Drink</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Category Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <Card>
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

            <Card>
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

          {/* Category Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCategories.map((category) => {
              const typeStyle = categoryTypeColors[category.categoryType as keyof typeof categoryTypeColors] || categoryTypeColors.OTHER
              const TypeIcon = typeStyle.icon
              return (
                <Card key={category.categoryId} className={`border-l-4 ${typeStyle.border}`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`p-2 rounded-lg ${typeStyle.bg}`}>
                          <TypeIcon className={`h-5 w-5 ${typeStyle.text}`} />
                        </div>
                        <CardTitle className="text-lg">{category.categoryName}</CardTitle>
                      </div>
                      <Badge className={typeStyle.bg + " " + typeStyle.text + " border-0"}>
                        {category.categoryType}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground">Items</p>
                          <p className="text-2xl font-bold">{category.totalItems}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Avg Margin</p>
                          <p className={`text-2xl font-bold ${getMarginColor(category.averageMargin)}`}>
                            {category.averageMargin.toFixed(1)}%
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Revenue</span>
                          <span className="font-semibold text-green-600">{formatCurrency(category.totalRevenue)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Cost</span>
                          <span className="font-semibold text-orange-600">{formatCurrency(category.totalCost)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Profit</span>
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
                        <Badge variant="outline" className="bg-green-50 dark:bg-green-950/20">
                          Profitable: {category.profitableItems}
                        </Badge>
                        <Badge variant="outline" className="bg-yellow-50 dark:bg-yellow-950/20">
                          Low: {category.lowMarginItems}
                        </Badge>
                        {category.lossItems > 0 && (
                          <Badge variant="outline" className="bg-red-50 dark:bg-red-950/20">
                            Loss: {category.lossItems}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Pie Chart for Status Distribution */}
          {pieChartData.length > 0 && (
            <Card className="mt-8">
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

      {/* Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
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
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-xs text-muted-foreground">Selling Price</p>
                    <p className="text-xl font-bold text-green-600">
                      {formatCurrency(selectedMenuItem.sellingPrice)}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-xs text-muted-foreground">Total Cost</p>
                    <p className="text-xl font-bold text-orange-600">
                      {formatCurrency(selectedMenuItem.totalIngredientCost)}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-xs text-muted-foreground">Profit</p>
                    <p className={`text-xl font-bold ${getProfitColor(selectedMenuItem.profit)}`}>
                      {formatCurrency(selectedMenuItem.profit)}
                    </p>
                  </CardContent>
                </Card>
                <Card>
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
                <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                  <Badge className={categoryTypeColors[selectedMenuItem.categoryType as keyof typeof categoryTypeColors]?.bg + " " + categoryTypeColors[selectedMenuItem.categoryType as keyof typeof categoryTypeColors]?.text}>
                    Category: {selectedMenuItem.categoryName}
                  </Badge>
                </div>
                {selectedMenuItem.preparationTime > 0 && (
                  <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm">Prep Time: {selectedMenuItem.preparationTime} min</span>
                  </div>
                )}
              </div>

              {/* Ingredients Table */}
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Ingredient Breakdown
                </h3>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
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
                <div className={`p-4 rounded-lg ${selectedMenuItem.profitMargin < 0 ? 'bg-red-50 dark:bg-red-950/20 border border-red-200' : 'bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200'}`}>
                  <div className="flex items-start gap-3">
                    {selectedMenuItem.profitMargin < 0 ? (
                      <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
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
  )
}
