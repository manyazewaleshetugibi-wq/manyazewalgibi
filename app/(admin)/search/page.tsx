// app/search/page.tsx
"use client"

import { useState, useEffect, useCallback } from "react"
import { 
  Search, 
  Filter, 
  Package, 
  ShoppingCart,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  DollarSign,
  Users,
  Building2,
  Truck,
  Home,
  Loader2,
  Download,
  Eye,
  ChevronDown,
  ChevronUp,
  Star,
  Timer,
  CreditCard,
  User,
  Calendar,
  Boxes,
  BarChart3,
  Zap,
  X,
  Utensils,
  FolderOpen,
  History,
  Ticket,
  Bell,
  Table as TableIcon,
  type LucideIcon
} from "lucide-react"
import { format, startOfMonth, endOfMonth } from "date-fns"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { DateRangePicker } from "@/components/ui/date-range-picker"
import { toast } from "react-hot-toast"
import * as XLSX from "xlsx"

// Types
type Order = {
  _id: string
  orderNumber: string
  tableNumber: string
  waiterId: string
  waiterName?: string
  numberOfGuests: number
  items: Array<{
    itemId: string
    name?: string
    quantity: number
    unitPrice: number
    subtotal: number
    status: string
  }>
  totalAmount: number
  discount: number
  tax: number
  finalAmount: number
  status: string
  paymentMethod: string
  createdAt: string
  delivery?: boolean
  inTable?: boolean
  restaurantId?: string
  restaurantName?: string
  customerName?: string
  specialRequirements?: string
  deliveryInfo?: {
    fullName: string
    phoneNumber: string
  }
}

type User = {
  _id: string
  name: string
  email: string
  phone: string
  role: string
  status: string
  createdAt: string
  lastLogin?: string
  employeeId?: string
}

type Stock = {
  _id: string
  name: string
  categoryId: string
  categoryName?: string
  unit: string
  minimumStock: number
  currentStock: number
  totalPurchased?: number
  totalUsed?: number
  usageCount?: number
  uniqueOrdersCount?: number
  status: string
}

type Waitress = {
  _id: string
  name: string
  phone: string
  shift: string
  totalOrders?: number
  totalSales?: number
  averageOrderValue?: number
}

type MenuItem = {
  _id: string
  name: string
  description: string
  price: number
  categoryId: string
  totalOrdered?: number
  totalRevenue?: number
  orderCount?: number
  averagePrice?: number
  isActive: boolean
}

type Category = {
  _id: string
  name: string
  description: string
  type?: string
  itemCount?: number
}

type StatusLog = {
  _id: string
  orderId: string
  orderNumber: string
  previousStatus: string
  newStatus: string
  accepterName: string
  accepterRole: string
  changeDate: string
}

type StockPurchase = {
  _id: string
  stockId: string
  stockName?: string
  quantity: number
  unitPrice: number
  supplier: string
  purchaseDate: string
}

type StockUsage = {
  _id: string
  orderId: string
  orderNumber: string
  stockId: string
  stockName: string
  totalQuantityUsed: number
  stockUnit: string
  usedAt: string
}

type OrderClassification = {
  total: number
  delivery: number
  inTable: number
  pos: number
  deliveryRevenue: number
  inTableRevenue: number
  posRevenue: number
}

type SearchResult = {
  orders: Order[]
  users: User[]
  waitresses: Waitress[]
  stocks: Stock[]
  menuItems: MenuItem[]
  categories: Category[]
  statusLogs: StatusLog[]
  stockPurchases: StockPurchase[]
  stockUsages: StockUsage[]
  orderClassification: OrderClassification
  analytics: {
    topSellingItems: Array<{ name: string; quantity: number; revenue: number; orderCount: number; averagePrice: number }>
    topWaiters: Array<{ name: string; orders: number; sales: number; averageOrderValue: number }>
    ordersByStatus: Record<string, number>
    ordersByPaymentMethod: Record<string, number>
    popularOrderTypes: Record<string, number>
    hourlyDistribution: Record<number, number>
    dailyDistribution: Record<string, number>
    restaurantDistribution: Record<string, number>
    userStats: {
      total: number
      byRole: Record<string, number>
      active: number
      inactive: number
      recentRegistrations: number
    }
    searchSummary: {
      totalOrders: number
      totalRevenue: number
      totalUsers: number
      totalWaitresses: number
      totalStocks: number
      totalMenuItems: number
      totalCategories: number
      totalStatusLogs: number
      totalStockPurchases: number
      totalStockUsages: number
      totalItemsSold: number
      totalStockUsed: number
      completionRate: number
      pendingOrders: number
      cancelledOrders: number
      criticalStocks: number
      lowStocks: number
      totalStockValue: number
    }
  }
}

type SearchType = "all" | "orders" | "users" | "waitresses" | "stocks" | "items"

const searchTypes: { value: SearchType; label: string; icon: LucideIcon; description: string }[] = [
  { value: "all", label: "All", icon: Search, description: "Search everything" },
  { value: "orders", label: "Orders", icon: ShoppingCart, description: "Search orders by number, customer, waiter" },
  { value: "users", label: "Users", icon: Users, description: "Search users by name, email, role" },
  { value: "waitresses", label: "Staff", icon: User, description: "Search staff by name, shift" },
  { value: "stocks", label: "Stocks", icon: Package, description: "Search stock items by name" },
  { value: "items", label: "Menu Items", icon: Utensils, description: "Search menu items by name" },
]

export default function AdvancedSearchPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [searchType, setSearchType] = useState<SearchType>("all")
  const [searchResults, setSearchResults] = useState<SearchResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("overview")
  const [searchHistory, setSearchHistory] = useState<string[]>([])
  
  // Filters
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: startOfMonth(new Date()),
    to: new Date()
  })
  const [selectedWaiter, setSelectedWaiter] = useState<string>("all")
  const [selectedRestaurant, setSelectedRestaurant] = useState<string>("all")
  const [selectedStatus, setSelectedStatus] = useState<string>("all")
  const [selectedOrderType, setSelectedOrderType] = useState<string>("all")
  const [selectedStockStatus, setSelectedStockStatus] = useState<string>("all")
  const [selectedUserRole, setSelectedUserRole] = useState<string>("all")
  const [sortBy, setSortBy] = useState<string>("relevance")
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  
  const [waitresses, setWaitresses] = useState<Waitress[]>([])
  const [restaurants] = useState([
    { id: "all", name: "All Restaurants" },
    { id: "manyazewal1", name: "Manyazewal 1" },
    { id: "manyazewal2", name: "Manyazewal 2" }
  ])
  
  const orderStatuses = ["PENDING", "CONFIRMED", "PREPARING", "PICKUP", "SERVED", "COMPLETED", "CANCELLED"]
  const userRoles = ["all", "admin", "pos", "kitchen", "customer", "manager"]
  const stockStatuses = ["all", "critical", "low", "good", "overstock"]

  useEffect(() => {
    fetchWaitresses()
    loadSearchHistory()
    // Initial search to load all data
    performSearch()
  }, [])
  
  const fetchWaitresses = async () => {
    try {
      const response = await fetch("/api/waitress")
      const data = await response.json()
      setWaitresses(data || [])
    } catch (error) {
      console.error("Error fetching waitresses:", error)
    }
  }
  
  const loadSearchHistory = () => {
    const history = localStorage.getItem("searchHistory")
    if (history) {
      setSearchHistory(JSON.parse(history).slice(0, 10))
    }
  }
  
  const saveToHistory = (query: string) => {
    const newHistory = [query, ...searchHistory.filter(h => h !== query)].slice(0, 10)
    setSearchHistory(newHistory)
    localStorage.setItem("searchHistory", JSON.stringify(newHistory))
  }
  
  const formatCurrency = (amount: number | undefined | null) => {
    if (!amount && amount !== 0) return "ETB 0.00"
    return amount.toLocaleString("en-ET", { style: "currency", currency: "ETB" })
  }
  
  const formatNumber = (num: number | undefined | null) => {
    if (!num && num !== 0) return "0"
    return num.toLocaleString("en-ET")
  }
  
  const formatPercentage = (value: number | undefined | null) => {
    if (!value && value !== 0) return "0%"
    return `${value.toFixed(1)}%`
  }
  
  const performSearch = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (searchQuery) {
        params.append("q", searchQuery)
        saveToHistory(searchQuery)
      }
      if (searchType !== "all") {
        params.append("type", searchType)
      }
      if (dateRange.from) params.append("startDate", format(dateRange.from, "yyyy-MM-dd"))
      if (dateRange.to) params.append("endDate", format(dateRange.to, "yyyy-MM-dd"))
      if (selectedWaiter !== "all") params.append("waiterId", selectedWaiter)
      if (selectedRestaurant !== "all") params.append("restaurantId", selectedRestaurant)
      if (selectedStatus !== "all") params.append("status", selectedStatus)
      if (selectedOrderType !== "all") params.append("orderType", selectedOrderType)
      if (selectedStockStatus !== "all") params.append("stockStatus", selectedStockStatus)
      if (selectedUserRole !== "all") params.append("userRole", selectedUserRole)
      if (sortBy !== "relevance") params.append("sortBy", sortBy)
      params.append("limit", "2000")
      
      const response = await fetch(`/api/search?${params.toString()}`)
      const data = await response.json()
      
      if (data.success) {
        // Calculate order classification
        const orders = data.data.orders || []
        const orderClassification = {
          total: orders.length,
          delivery: orders.filter((o: Order) => o.delivery === true).length,
          inTable: orders.filter((o: Order) => o.inTable === true).length,
          pos: orders.filter((o: Order) => !o.delivery && !o.inTable).length,
          deliveryRevenue: orders.filter((o: Order) => o.delivery === true).reduce((sum: number, o: Order) => sum + (o.finalAmount || 0), 0),
          inTableRevenue: orders.filter((o: Order) => o.inTable === true).reduce((sum: number, o: Order) => sum + (o.finalAmount || 0), 0),
          posRevenue: orders.filter((o: Order) => !o.delivery && !o.inTable).reduce((sum: number, o: Order) => sum + (o.finalAmount || 0), 0),
        }
        
        setSearchResults({
          ...data.data,
          orderClassification
        })
        
        const summary = data.data.analytics?.searchSummary
        toast.success(`Found ${summary?.totalOrders || 0} orders, ${summary?.totalUsers || 0} users, ${summary?.totalMenuItems || 0} items`)
      } else {
        toast.error(data.error || "Search failed")
      }
    } catch (error) {
      console.error("Search error:", error)
      toast.error("Failed to perform search")
    } finally {
      setIsLoading(false)
    }
  }, [searchQuery, searchType, dateRange, selectedWaiter, selectedRestaurant, selectedStatus, selectedOrderType, selectedStockStatus, selectedUserRole, sortBy])
  
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      performSearch()
    }, 500)
    return () => clearTimeout(timeoutId)
  }, [searchQuery, searchType, dateRange, selectedWaiter, selectedRestaurant, selectedStatus, selectedOrderType, selectedStockStatus, selectedUserRole, sortBy, performSearch])
  
  const exportResults = () => {
    if (!searchResults) return
    
    const exportData = {
      orders: searchResults.orders.map(order => ({
        'Order Number': order.orderNumber || 'N/A',
        'Type': order.inTable ? 'In-Table' : order.delivery ? 'Delivery' : 'POS',
        'Waiter': order.waiterName || 'Unknown',
        'Table': order.tableNumber || 'N/A',
        'Customer': order.customerName || 'Walk-in',
        'Final Amount': order.finalAmount || 0,
        'Status': order.status || 'Unknown',
        'Date': order.createdAt ? new Date(order.createdAt).toLocaleString() : 'N/A'
      })),
      users: searchResults.users.map(user => ({
        'Name': user.name || 'N/A',
        'Email': user.email || 'N/A',
        'Role': user.role || 'N/A',
        'Status': user.status || 'N/A'
      })),
      stocks: searchResults.stocks.map(stock => ({
        'Name': stock.name || 'N/A',
        'Current Stock': stock.currentStock || 0,
        'Total Used': stock.totalUsed || 0,
        'Status': stock.status || 'Unknown'
      })),
      menuItems: searchResults.menuItems.map(item => ({
        'Name': item.name || 'N/A',
        'Price': item.price || 0,
        'Times Ordered': item.totalOrdered || 0
      }))
    }
    
    const wsOrders = XLSX.utils.json_to_sheet(exportData.orders)
    const wsUsers = XLSX.utils.json_to_sheet(exportData.users)
    const wsStocks = XLSX.utils.json_to_sheet(exportData.stocks)
    const wsItems = XLSX.utils.json_to_sheet(exportData.menuItems)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, wsOrders, "Orders")
    XLSX.utils.book_append_sheet(workbook, wsUsers, "Users")
    XLSX.utils.book_append_sheet(workbook, wsStocks, "Stocks")
    XLSX.utils.book_append_sheet(workbook, wsItems, "MenuItems")
    XLSX.writeFile(workbook, `search_results_${format(new Date(), "yyyy-MM-dd")}.xlsx`)
    toast.success("Results exported successfully")
  }
  
  const clearFilters = () => {
    setSearchQuery("")
    setSearchType("all")
    setSelectedWaiter("all")
    setSelectedRestaurant("all")
    setSelectedStatus("all")
    setSelectedOrderType("all")
    setSelectedStockStatus("all")
    setSelectedUserRole("all")
    setSortBy("relevance")
    setDateRange({
      from: startOfMonth(new Date()),
      to: new Date()
    })
    performSearch()
    toast.success("Filters cleared")
  }
  
  const getStockStatusConfig = (stock: Stock) => {
    const minStock = stock.minimumStock || 1
    const currentStock = stock.currentStock || 0
    const ratio = currentStock / minStock
    if (currentStock === 0) return { label: "Critical", color: "bg-red-100 text-red-800", icon: AlertCircle }
    if (ratio <= 0.5) return { label: "Critical", color: "bg-red-100 text-red-800", icon: AlertCircle }
    if (ratio <= 1) return { label: "Low", color: "bg-amber-100 text-amber-800", icon: AlertCircle }
    if (ratio <= 2) return { label: "Good", color: "bg-green-100 text-green-800", icon: CheckCircle }
    return { label: "Overstock", color: "bg-blue-100 text-blue-800", icon: CheckCircle }
  }
  
  if (!searchResults) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Search className="h-8 w-8" />
              Universal Search
            </h1>
            <p className="text-muted-foreground mt-1">
              Search across orders, users, staff, stocks, and menu items
            </p>
          </div>
        </div>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-4 flex-wrap">
              {/* Search Type Dropdown */}
              <Select value={searchType} onValueChange={(value) => setSearchType(value as SearchType)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Search type" />
                </SelectTrigger>
                <SelectContent>
                  {searchTypes.map((type) => {
                    const IconComponent = type.icon
                    return (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <IconComponent className="h-4 w-4" />
                          <span>{type.label}</span>
                        </div>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
              
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={
                    searchType === "orders" ? "Search by order number, customer, waiter, table..." :
                    searchType === "users" ? "Search by name, email, phone, role..." :
                    searchType === "waitresses" ? "Search by name, phone, shift..." :
                    searchType === "stocks" ? "Search by stock name, category..." :
                    searchType === "items" ? "Search by menu item name..." :
                    "Search anything: order #, customer name, item name, waiter name, email, phone, stock name..."
                  }
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-12 text-lg"
                  onKeyPress={(e) => e.key === 'Enter' && performSearch()}
                />
              </div>
              <Button onClick={performSearch} disabled={isLoading} size="lg">
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
                Search
              </Button>
            </div>
            
            {/* Search Type Hint */}
            {searchType !== "all" && (
              <p className="text-xs text-muted-foreground mt-2">
                Searching only in <span className="font-semibold">{searchTypes.find(t => t.value === searchType)?.label}</span>
              </p>
            )}
          </CardContent>
        </Card>
        
        <Card className="bg-muted/50">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Search className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Start Searching</h3>
            <p className="text-muted-foreground text-center max-w-md">
              Enter a search term to find orders, users, staff, stocks, and menu items
            </p>
            <div className="flex gap-2 mt-4 flex-wrap justify-center">
              <Badge variant="outline" className="cursor-pointer" onClick={() => setSearchType("orders")}>Search Orders</Badge>
              <Badge variant="outline" className="cursor-pointer" onClick={() => setSearchType("waitresses")}>Search Staff</Badge>
              <Badge variant="outline" className="cursor-pointer" onClick={() => setSearchType("stocks")}>Search Stocks</Badge>
              <Badge variant="outline" className="cursor-pointer" onClick={() => setSearchType("items")}>Search Menu Items</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }
  
  const summary = searchResults.analytics?.searchSummary || {
    totalOrders: 0, totalRevenue: 0, totalUsers: 0, totalWaitresses: 0,
    totalStocks: 0, totalMenuItems: 0, totalCategories: 0, totalStatusLogs: 0,
    totalStockPurchases: 0, totalStockUsages: 0, totalItemsSold: 0,
    totalStockUsed: 0, completionRate: 0, pendingOrders: 0, cancelledOrders: 0,
    criticalStocks: 0, lowStocks: 0, totalStockValue: 0
  }
  
  const orderClassification = searchResults.orderClassification || {
    total: 0, delivery: 0, inTable: 0, pos: 0,
    deliveryRevenue: 0, inTableRevenue: 0, posRevenue: 0
  }
  
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Search className="h-8 w-8" />
            Search Results
          </h1>
          <p className="text-muted-foreground mt-1">
            Found {summary.totalOrders} orders, {summary.totalUsers} users, {summary.totalMenuItems} menu items, {summary.totalStocks} stocks
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={clearFilters} variant="outline">
            <X className="mr-2 h-4 w-4" />
            Clear Filters
          </Button>
          <Button onClick={exportResults} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export Results
          </Button>
        </div>
      </div>
      
      {/* Search Bar - Fixed */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 flex-wrap">
            <Select value={searchType} onValueChange={(value) => setSearchType(value as SearchType)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Search type" />
              </SelectTrigger>
              <SelectContent>
                {searchTypes.map((type) => {
                  const IconComponent = type.icon
                  return (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <IconComponent className="h-4 w-4" />
                        <span>{type.label}</span>
                      </div>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
            
            <div className="flex-1 relative min-w-[200px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={
                  searchType === "orders" ? "Search by order number, customer, waiter, table..." :
                  searchType === "users" ? "Search by name, email, phone, role..." :
                  searchType === "waitresses" ? "Search by name, phone, shift..." :
                  searchType === "stocks" ? "Search by stock name, category..." :
                  searchType === "items" ? "Search by menu item name..." :
                  "Search anything: order #, customer, waiter, item, email, phone, stock..."
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-12 text-lg"
                onKeyPress={(e) => e.key === 'Enter' && performSearch()}
              />
            </div>
            <Button onClick={performSearch} disabled={isLoading} size="lg">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
              Search
            </Button>
            <Button 
              variant="outline" 
              size="lg"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
              {showAdvancedFilters ? <ChevronUp className="ml-2 h-4 w-4" /> : <ChevronDown className="ml-2 h-4 w-4" />}
            </Button>
          </div>
          
          {/* Search Type Badge */}
          {searchType !== "all" && (
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Searching in:</span>
              <Badge className="bg-primary/10">
                {searchTypes.find(t => t.value === searchType)?.label}
              </Badge>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 text-xs"
                onClick={() => setSearchType("all")}
              >
                <X className="h-3 w-3 mr-1" />
                Clear type
              </Button>
            </div>
          )}
          
          {/* Advanced Filters */}
          {showAdvancedFilters && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-6 border-t">
              <div>
                <label className="text-sm font-medium mb-2 block">Date Range</label>
                <DateRangePicker
                  dateRange={dateRange}
                  onDateRangeChange={setDateRange}
                />
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Waiter Name</label>
                <Select value={selectedWaiter} onValueChange={setSelectedWaiter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Waiters" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Waiters</SelectItem>
                    {waitresses.map(waiter => (
                      <SelectItem key={waiter._id} value={waiter._id}>
                        {waiter.name} ({waiter.shift})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Filter orders by specific waiter
                </p>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Restaurant</label>
                <Select value={selectedRestaurant} onValueChange={setSelectedRestaurant}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Restaurants" />
                  </SelectTrigger>
                  <SelectContent>
                    {restaurants.map(r => (
                      <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Order Status</label>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {orderStatuses.map(status => (
                      <SelectItem key={status} value={status}>{status}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Order Type</label>
                <Select value={selectedOrderType} onValueChange={setSelectedOrderType}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="intable">In-Table</SelectItem>
                    <SelectItem value="delivery">Delivery</SelectItem>
                    <SelectItem value="pos">POS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Stock Status</label>
                <Select value={selectedStockStatus} onValueChange={setSelectedStockStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Stock Status" />
                  </SelectTrigger>
                  <SelectContent>
                    {stockStatuses.map(status => (
                      <SelectItem key={status} value={status}>
                        {status === "all" ? "All" : status.charAt(0).toUpperCase() + status.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">User Role</label>
                <Select value={selectedUserRole} onValueChange={setSelectedUserRole}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Roles" />
                  </SelectTrigger>
                  <SelectContent>
                    {userRoles.map(role => (
                      <SelectItem key={role} value={role}>
                        {role === "all" ? "All Roles" : role.toUpperCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Sort By</label>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sort By" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="relevance">Relevance</SelectItem>
                    <SelectItem value="date_desc">Newest First</SelectItem>
                    <SelectItem value="date_asc">Oldest First</SelectItem>
                    <SelectItem value="amount_desc">Highest Amount</SelectItem>
                    <SelectItem value="amount_asc">Lowest Amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Order Classification Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-green-50 to-green-100">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-muted-foreground">🏠 In-Table Orders</p>
                <p className="text-2xl font-bold">{orderClassification.inTable}</p>
                <p className="text-xs mt-1">Revenue: {formatCurrency(orderClassification.inTableRevenue)}</p>
              </div>
              <Home className="h-8 w-8 text-green-500" />
            </div>
            <Progress value={(orderClassification.inTable / (orderClassification.total || 1)) * 100} className="mt-3 h-2" />
            <p className="text-xs text-muted-foreground mt-1">{((orderClassification.inTable / (orderClassification.total || 1)) * 100).toFixed(1)}% of total orders</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-muted-foreground">🚚 Delivery Orders</p>
                <p className="text-2xl font-bold">{orderClassification.delivery}</p>
                <p className="text-xs mt-1">Revenue: {formatCurrency(orderClassification.deliveryRevenue)}</p>
              </div>
              <Truck className="h-8 w-8 text-blue-500" />
            </div>
            <Progress value={(orderClassification.delivery / (orderClassification.total || 1)) * 100} className="mt-3 h-2" />
            <p className="text-xs text-muted-foreground mt-1">{((orderClassification.delivery / (orderClassification.total || 1)) * 100).toFixed(1)}% of total orders</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-muted-foreground">🛒 POS Orders</p>
                <p className="text-2xl font-bold">{orderClassification.pos}</p>
                <p className="text-xs mt-1">Revenue: {formatCurrency(orderClassification.posRevenue)}</p>
              </div>
              <ShoppingCart className="h-8 w-8 text-purple-500" />
            </div>
            <Progress value={(orderClassification.pos / (orderClassification.total || 1)) * 100} className="mt-3 h-2" />
            <p className="text-xs text-muted-foreground mt-1">{((orderClassification.pos / (orderClassification.total || 1)) * 100).toFixed(1)}% of total orders</p>
          </CardContent>
        </Card>
      </div>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold">{formatCurrency(summary.totalRevenue)}</p>
                <p className="text-xs mt-1">{formatNumber(summary.totalOrders)} total orders</p>
              </div>
              <DollarSign className="h-8 w-8 text-indigo-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-teal-50 to-teal-100">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-muted-foreground">Completion Rate</p>
                <p className="text-2xl font-bold">{formatPercentage(summary.completionRate)}</p>
                <p className="text-xs">{formatNumber(summary.pendingOrders)} pending • {formatNumber(summary.cancelledOrders)} cancelled</p>
              </div>
              <CheckCircle className="h-8 w-8 text-teal-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-amber-50 to-amber-100">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-muted-foreground">Items Performance</p>
                <p className="text-2xl font-bold">{formatNumber(summary.totalItemsSold)}</p>
                <p className="text-xs">items sold • {formatNumber(summary.totalStockUsed)} stock used</p>
              </div>
              <Package className="h-8 w-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-rose-50 to-rose-100">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-muted-foreground">Stock Health</p>
                <p className="text-2xl font-bold text-red-600">{summary.criticalStocks}</p>
                <p className="text-xs">{summary.lowStocks} low stock items</p>
              </div>
              <AlertCircle className="h-8 w-8 text-rose-500" />
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Tabs - Only show tabs with data */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          {searchResults.orders && searchResults.orders.length > 0 && (
            <>
              <TabsTrigger value="orders">All Orders ({searchResults.orders.length})</TabsTrigger>
              {orderClassification.delivery > 0 && (
                <TabsTrigger value="delivery">🚚 Delivery ({orderClassification.delivery})</TabsTrigger>
              )}
              {orderClassification.inTable > 0 && (
                <TabsTrigger value="intable">🏠 In-Table ({orderClassification.inTable})</TabsTrigger>
              )}
              {orderClassification.pos > 0 && (
                <TabsTrigger value="pos">🛒 POS ({orderClassification.pos})</TabsTrigger>
              )}
            </>
          )}
          {searchResults.users && searchResults.users.length > 0 && (
            <TabsTrigger value="users">Users ({searchResults.users.length})</TabsTrigger>
          )}
          {searchResults.waitresses && searchResults.waitresses.length > 0 && (
            <TabsTrigger value="staff">Staff ({searchResults.waitresses.length})</TabsTrigger>
          )}
          {searchResults.menuItems && searchResults.menuItems.length > 0 && (
            <TabsTrigger value="menuItems">Menu Items ({searchResults.menuItems.length})</TabsTrigger>
          )}
          {searchResults.stocks && searchResults.stocks.length > 0 && (
            <TabsTrigger value="stocks">Stocks ({searchResults.stocks.length})</TabsTrigger>
          )}
        </TabsList>
        
        {/* Overview Tab */}
        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Top Selling Items
                </CardTitle>
                <CardDescription>Most frequently ordered items</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-h-[500px] overflow-y-auto">
                  {searchResults.analytics?.topSellingItems?.slice(0, 20).map((item, index) => (
                    <div key={item.name} className="flex items-center justify-between p-2 hover:bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-sm">
                          #{index + 1}
                        </div>
                        <div>
                          <p className="font-medium">{item.name}</p>
                          <p className="text-xs text-muted-foreground">{item.quantity} units • {item.orderCount} orders</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatCurrency(item.revenue)}</p>
                        <p className="text-xs text-muted-foreground">Avg: {formatCurrency(item.averagePrice)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Star className="h-5 w-5" />
                  Top Performing Staff
                </CardTitle>
                <CardDescription>Based on sales and orders</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-h-[500px] overflow-y-auto">
                  {searchResults.analytics?.topWaiters?.slice(0, 20).map((waiter, index) => (
                    <div key={waiter.name} className="flex items-center justify-between p-2 hover:bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback>{waiter.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{waiter.name}</p>
                          <p className="text-xs text-muted-foreground">{waiter.orders} orders</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatCurrency(waiter.sales)}</p>
                        <p className="text-xs text-muted-foreground">Avg: {formatCurrency(waiter.averageOrderValue)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        {/* All Orders Tab */}
        <TabsContent value="orders">
          <Card>
            <CardContent className="p-0">
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order #</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Waiter</TableHead>
                      <TableHead>Table</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {searchResults.orders?.map((order) => (
                      <TableRow key={order._id}>
                        <TableCell className="font-medium">{order.orderNumber}</TableCell>
                        <TableCell>
                          {order.inTable ? (
                            <Badge className="bg-green-100 text-green-800">🏠 In-Table</Badge>
                          ) : order.delivery ? (
                            <Badge className="bg-blue-100 text-blue-800">🚚 Delivery</Badge>
                          ) : (
                            <Badge className="bg-purple-100 text-purple-800">🛒 POS</Badge>
                          )}
                        </TableCell>
                        <TableCell>{order.waiterName || "Unknown"}</TableCell>
                        <TableCell>{order.tableNumber}</TableCell>
                        <TableCell>{order.customerName || "Walk-in"}</TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {order.items?.map(i => i.name).slice(0, 2).join(", ")}{order.items?.length > 2 ? "..." : ""}
                        </TableCell>
                        <TableCell>{formatCurrency(order.finalAmount)}</TableCell>
                        <TableCell><Badge variant="outline">{order.status}</Badge></TableCell>
                        <TableCell>{new Date(order.createdAt).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Delivery Orders Tab */}
        <TabsContent value="delivery">
          <Card>
            <CardContent className="p-0">
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order #</TableHead>
                      <TableHead>Waiter</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Delivery Info</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {searchResults.orders?.filter(o => o.delivery === true).map((order) => (
                      <TableRow key={order._id}>
                        <TableCell className="font-medium">{order.orderNumber}</TableCell>
                        <TableCell>{order.waiterName || "Unknown"}</TableCell>
                        <TableCell>{order.customerName || "Unknown"}</TableCell>
                        <TableCell className="max-w-[200px] truncate text-xs">
                          {order.deliveryInfo ? `${order.deliveryInfo.fullName} - ${order.deliveryInfo.phoneNumber}` : '-'}
                        </TableCell>
                        <TableCell className="max-w-[150px] truncate">
                          {order.items?.map(i => i.name).slice(0, 2).join(", ")}
                        </TableCell>
                        <TableCell>{formatCurrency(order.finalAmount)}</TableCell>
                        <TableCell><Badge variant="outline">{order.status}</Badge></TableCell>
                        <TableCell>{new Date(order.createdAt).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* In-Table Orders Tab */}
        <TabsContent value="intable">
          <Card>
            <CardContent className="p-0">
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order #</TableHead>
                      <TableHead>Waiter</TableHead>
                      <TableHead>Table</TableHead>
                      <TableHead>Guests</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {searchResults.orders?.filter(o => o.inTable === true).map((order) => (
                      <TableRow key={order._id}>
                        <TableCell className="font-medium">{order.orderNumber}</TableCell>
                        <TableCell>{order.waiterName || "Unknown"}</TableCell>
                        <TableCell>{order.tableNumber}</TableCell>
                        <TableCell>{order.numberOfGuests}</TableCell>
                        <TableCell className="max-w-[150px] truncate">
                          {order.items?.map(i => i.name).slice(0, 2).join(", ")}
                        </TableCell>
                        <TableCell>{formatCurrency(order.finalAmount)}</TableCell>
                        <TableCell><Badge variant="outline">{order.status}</Badge></TableCell>
                        <TableCell>{new Date(order.createdAt).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* POS Orders Tab */}
        <TabsContent value="pos">
          <Card>
            <CardContent className="p-0">
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order #</TableHead>
                      <TableHead>Waiter</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {searchResults.orders?.filter(o => !o.delivery && !o.inTable).map((order) => (
                      <TableRow key={order._id}>
                        <TableCell className="font-medium">{order.orderNumber}</TableCell>
                        <TableCell>{order.waiterName || "Unknown"}</TableCell>
                        <TableCell>{order.customerName || "Walk-in"}</TableCell>
                        <TableCell className="max-w-[150px] truncate">
                          {order.items?.map(i => i.name).slice(0, 2).join(", ")}
                        </TableCell>
                        <TableCell>{formatCurrency(order.finalAmount)}</TableCell>
                        <TableCell><Badge variant="outline">{order.status}</Badge></TableCell>
                        <TableCell>{new Date(order.createdAt).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Users Tab */}
        <TabsContent value="users">
          <Card>
            <CardContent className="p-0">
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Employee ID</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {searchResults.users?.map((user) => (
                      <TableRow key={user._id}>
                        <TableCell className="font-medium">{user.name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell><Badge variant="outline" className="capitalize">{user.role}</Badge></TableCell>
                        <TableCell><Badge className={user.status === "active" ? "bg-green-100" : "bg-red-100"}>{user.status}</Badge></TableCell>
                        <TableCell>{user.employeeId || "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Staff Tab */}
        <TabsContent value="staff">
          <Card>
            <CardContent className="p-0">
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Shift</TableHead>
                      <TableHead>Total Orders</TableHead>
                      <TableHead>Total Sales</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {searchResults.waitresses?.map((w) => (
                      <TableRow key={w._id}>
                        <TableCell className="font-medium flex items-center gap-2">
                          <Avatar className="h-8 w-8"><AvatarFallback>{w.name.charAt(0)}</AvatarFallback></Avatar>
                          {w.name}
                        </TableCell>
                        <TableCell>{w.phone}</TableCell>
                        <TableCell><Badge variant="outline">{w.shift}</Badge></TableCell>
                        <TableCell>{w.totalOrders || 0}</TableCell>
                        <TableCell>{formatCurrency(w.totalSales || 0)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Menu Items Tab */}
        <TabsContent value="menuItems">
          <Card>
            <CardContent className="p-0">
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item Name</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Times Ordered</TableHead>
                      <TableHead>Total Revenue</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {searchResults.menuItems?.map((item) => (
                      <TableRow key={item._id}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>{formatCurrency(item.price)}</TableCell>
                        <TableCell><Badge variant="outline" className="bg-blue-50">{item.totalOrdered || 0} times</Badge></TableCell>
                        <TableCell>{formatCurrency(item.totalRevenue || 0)}</TableCell>
                        <TableCell><Badge className={item.isActive ? "bg-green-100" : "bg-red-100"}>{item.isActive ? "Active" : "Inactive"}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Stocks Tab */}
        <TabsContent value="stocks">
          <Card>
            <CardContent className="p-0">
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Stock Name</TableHead>
                      <TableHead>Current Stock</TableHead>
                      <TableHead>Min Stock</TableHead>
                      <TableHead>Total Used</TableHead>
                      <TableHead>Used In Orders</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Stock Level</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {searchResults.stocks?.map((stock) => {
                      const statusConfig = getStockStatusConfig(stock)
                      const StatusIcon = statusConfig.icon
                      const percentage = Math.min(100, ((stock.currentStock || 0) / (stock.minimumStock || 1)) * 100)
                      return (
                        <TableRow key={stock._id}>
                          <TableCell className="font-medium">{stock.name}</TableCell>
                          <TableCell className={stock.currentStock === 0 ? "text-red-600 font-bold" : ""}>
                            {stock.currentStock} {stock.unit}
                          </TableCell>
                          <TableCell>{stock.minimumStock} {stock.unit}</TableCell>
                          <TableCell>{stock.totalUsed?.toFixed(2) || 0} {stock.unit}</TableCell>
                          <TableCell>{stock.uniqueOrdersCount || 0} orders</TableCell>
                          <TableCell><Badge className={statusConfig.color}><StatusIcon className="h-3 w-3 mr-1" />{statusConfig.label}</Badge></TableCell>
                          <TableCell className="min-w-[150px]"><Progress value={percentage} className="h-2" /><p className="text-xs text-muted-foreground mt-1">{percentage.toFixed(0)}% of min</p></TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}