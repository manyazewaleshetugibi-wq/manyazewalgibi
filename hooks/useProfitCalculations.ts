// hooks/useProfitCalculations.ts
import { useMemo, useState, useEffect, useCallback } from 'react'
import { format, startOfDay, endOfDay, parseISO, isSameDay, eachDayOfInterval } from 'date-fns'

// ============================================================================
// TYPES
// ============================================================================

export interface RequiredStock {
  stockId: string
  quantity: number
}

export interface MenuItem {
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

export interface Category {
  _id: string
  name: string
  description: string
  type: "FOOD" | "DRINK" | "OTHER"
  isActive: boolean
}

export interface StockItem {
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

export interface Purchase {
  _id: string
  stockId: string
  purchaseDate: string
  quantity: number
  unitPrice: number
  supplier: string
}

export interface OrderItem {
  itemId: string
  menuItemId?: string
  quantity: number
  unitPrice: number
  price?: number
  name?: string
  subtotal?: number
}

export interface Order {
  _id: string
  orderNumber: string
  items?: OrderItem[]
  orderItems?: OrderItem[]
  totalAmount: number
  finalAmount: number
  createdAt: string
  status: string
}

export interface IngredientCost {
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

export interface DailySoldItem {
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

export interface DailyProfitSummary {
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
  averageProfitMargin: number
  bestPerformingItem: DailySoldItem | null
  worstPerformingItem: DailySoldItem | null
}

export interface ProfitFilters {
  searchQuery?: string
  categoryId?: string
  categoryType?: string
  statusFilter?: 'all' | 'profitable' | 'low' | 'loss'
  sortBy?: 'profit' | 'margin' | 'price' | 'cost'
  sortOrder?: 'asc' | 'desc'
}

export interface ProfitDataResult {
  items: DailySoldItem[]
  summary: DailyProfitSummary
  categories: { _id: string; name: string; type: string }[]
  chartData: {
    name: string
    profit: number
    margin: number
    cost: number
    quantity: number
    price: number
  }[]
  pieData: {
    name: string
    value: number
    color: string
  }[]
  totals: {
    totalCost: number
    totalRevenue: number
    totalProfit: number
  }
  filteredItems: DailySoldItem[]
  allItems: DailySoldItem[]
}

// ============================================================================
// API FUNCTIONS - SAME AS PROFIT PAGE
// ============================================================================

// Get today's completed orders only (matches profit page)
async function fetchTodayOrders(date?: Date): Promise<Order[]> {
  const targetDate = date || new Date()
  const today = new Date(targetDate)
  const startDate = format(startOfDay(today), "yyyy-MM-dd")
  const endDate = format(endOfDay(today), "yyyy-MM-dd")
  
  
  try {
    const response = await fetch(
      `/api/order/waiterreport?startDate=${startDate}&endDate=${endDate}&limit=10000&status=COMPLETED`
    )
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ API Error (${response.status}):`, errorText)
      throw new Error(`Failed to fetch orders: ${response.status}`)
    }
    
    const data = await response.json()
    
    if (data.success && data.orders) {
      const todayOrders = data.orders.filter((order: Order) => {
        const orderDate = new Date(order.createdAt)
        const isToday = orderDate >= startOfDay(today) && orderDate <= endOfDay(today)
        const isCompleted = order.status === 'COMPLETED'
        return isToday && isCompleted
      })
      
      return todayOrders
    }
    
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
    
    return purchases
  } catch (error) {
    console.error("❌ Error fetching purchases:", error)
    return []
  }
}

// ============================================================================
// HELPER FUNCTIONS - SAME AS PROFIT PAGE
// ============================================================================

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

function getOrderItems(order: Order): OrderItem[] {
  return order.items || order.orderItems || []
}

// ============================================================================
// PROFIT CALCULATION - SAME AS PROFIT PAGE
// ============================================================================

function calculateProfitability(
  orders: Order[],
  menuItems: MenuItem[],
  categories: Category[],
  stocks: StockItem[],
  purchases: Purchase[]
): DailySoldItem[] {
  try {
    // Aggregate sales by item from orders
    const salesMap = new Map<string, { quantity: number }>()
    
    
    orders.forEach((order, index) => {
      const orderItems = getOrderItems(order)
      if (!orderItems || orderItems.length === 0) {
        console.warn(`Order ${order._id} has no items`)
        return
      }


      orderItems.forEach((item: OrderItem) => {
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


    if (salesMap.size === 0) {
      return []
    }

    // Calculate profitability for each sold item
    const results: DailySoldItem[] = []
    let itemsNotFound = 0

    salesMap.forEach((sale, itemId) => {
      // Find menu item
      const menuItem = menuItems.find(item => item._id === itemId)
      if (!menuItem || !menuItem.isActive) {
        console.warn(`Menu item ${itemId} not found or inactive`)
        itemsNotFound++
        return
      }

      // Find category
      const category = categories.find(c => c._id === menuItem.categoryId)
      const categoryName = category?.name || "Uncategorized"
      const categoryType = category?.type || "OTHER"

      let totalCost = 0
      const ingredients: IngredientCost[] = []

      // Calculate cost from required stock using average cost
      if (menuItem.requiredStock && menuItem.requiredStock.length > 0) {
        menuItem.requiredStock.forEach(req => {
          const { averageCost, totalCost: avgTotalCost, purchaseCount, lastPurchaseDate, supplier } = 
            calculateAverageCost(req.stockId, purchases)
          const { price: latestPrice } = getLatestPrice(req.stockId, purchases)
          
          // Cost = quantity_needed × average_cost × quantity_sold
          const cost = req.quantity * averageCost * sale.quantity
          totalCost += cost

          ingredients.push({
            stockId: req.stockId,
            stockName: getStockName(req.stockId, stocks),
            quantity: req.quantity * sale.quantity,
            unit: getStockUnit(req.stockId, stocks),
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
    
    return results
  } catch (error) {
    console.error("Error calculating profitability:", error)
    return []
  }
}

function generateSummary(items: DailySoldItem[], orders: Order[]): DailyProfitSummary {
  const totalRevenue = items.reduce((sum, item) => sum + (item.sellingPrice * item.quantitySold), 0)
  const totalCost = items.reduce((sum, item) => sum + item.totalIngredientCost, 0)
  const totalProfit = totalRevenue - totalCost
  const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0
  const profitableItems = items.filter(i => i.status === 'profitable').length
  const lowMarginItems = items.filter(i => i.status === 'low').length
  const lossItems = items.filter(i => i.status === 'loss').length
  const totalIngredients = items.reduce((sum, item) => sum + item.ingredients.length, 0)

  // Find best and worst performing items
  const sortedByProfit = [...items].sort((a, b) => b.profit - a.profit)
  const bestPerformingItem = sortedByProfit.length > 0 ? sortedByProfit[0] : null
  const worstPerformingItem = sortedByProfit.length > 0 ? sortedByProfit[sortedByProfit.length - 1] : null

  return {
    date: format(new Date(), 'yyyy-MM-dd'),
    totalRevenue,
    totalCost,
    totalProfit,
    profitMargin,
    totalItemsSold: items.reduce((sum, item) => sum + item.quantitySold, 0),
    totalOrders: orders.length,
    profitableItems,
    lowMarginItems,
    lossItems,
    totalIngredients,
    averageProfitMargin: profitMargin,
    bestPerformingItem,
    worstPerformingItem
  }
}

function applyFilters(
  items: DailySoldItem[],
  filters: ProfitFilters = {}
): DailySoldItem[] {
  let filtered = [...items]

  const {
    searchQuery = '',
    categoryId = 'all',
    categoryType = 'all',
    statusFilter = 'all',
    sortBy = 'margin',
    sortOrder = 'desc'
  } = filters

  if (searchQuery) {
    const query = searchQuery.toLowerCase()
    filtered = filtered.filter(item => 
      item.itemName.toLowerCase().includes(query) ||
      item.categoryName.toLowerCase().includes(query)
    )
  }

  if (categoryId !== 'all') {
    filtered = filtered.filter(item => item.categoryId === categoryId)
  }

  if (categoryType !== 'all') {
    filtered = filtered.filter(item => item.categoryType === categoryType)
  }

  if (statusFilter !== 'all') {
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
}

function getCategoryOptions(items: DailySoldItem[]): { _id: string; name: string; type: string }[] {
  const uniqueCategories = new Map<string, { _id: string; name: string; type: string }>()
  items.forEach(item => {
    if (!uniqueCategories.has(item.categoryId)) {
      uniqueCategories.set(item.categoryId, {
        _id: item.categoryId,
        name: item.categoryName,
        type: item.categoryType
      })
    }
  })
  return Array.from(uniqueCategories.values())
}

function prepareChartData(items: DailySoldItem[], limit: number = 10): {
  name: string
  profit: number
  margin: number
  cost: number
  quantity: number
  price: number
}[] {
  return items.slice(0, limit).map(item => ({
    name: item.itemName.length > 15 ? item.itemName.substring(0, 15) + '...' : item.itemName,
    profit: item.profit,
    margin: item.profitMargin,
    cost: item.totalIngredientCost,
    quantity: item.quantitySold,
    price: item.sellingPrice
  }))
}

function preparePieData(summary: DailyProfitSummary): {
  name: string
  value: number
  color: string
}[] {
  const data = [
    { name: 'Profitable (≥20%)', value: summary.profitableItems, color: '#22c55e' },
    { name: 'Low Margin (0-20%)', value: summary.lowMarginItems, color: '#eab308' },
    { name: 'Loss (<0%)', value: summary.lossItems, color: '#ef4444' }
  ]
  return data.filter(d => d.value > 0)
}

function calculateTotals(items: DailySoldItem[]): {
  totalCost: number
  totalRevenue: number
  totalProfit: number
} {
  const totalCost = items.reduce((sum, item) => sum + item.totalIngredientCost, 0)
  const totalRevenue = items.reduce((sum, item) => sum + (item.sellingPrice * item.quantitySold), 0)
  const totalProfit = totalRevenue - totalCost
  return { totalCost, totalRevenue, totalProfit }
}

// ============================================================================
// MAIN FUNCTION - FETCH ALL DATA AND CALCULATE
// ============================================================================

async function getProfitData(
  date?: Date,
  filters: ProfitFilters = {}
): Promise<ProfitDataResult> {
  const targetDate = date || new Date()
  
  // Fetch all data in parallel (same as profit page)
  const [orders, menuItems, categories, stocks, purchases] = await Promise.all([
    fetchTodayOrders(targetDate),
    fetchMenuItems(),
    fetchCategories(),
    fetchStockItems(),
    fetchPurchases()
  ])

  // Calculate profitability (same as profit page)
  const allItems = calculateProfitability(
    orders,
    menuItems,
    categories,
    stocks,
    purchases
  )

  // Generate summary (same as profit page)
  const summary = generateSummary(allItems, orders)

  // Apply filters (same as profit page)
  const filteredItems = applyFilters(allItems, filters)

  // Get category options
  const categoriesOptions = getCategoryOptions(allItems)

  // Prepare chart data
  const chartData = prepareChartData(filteredItems)

  // Prepare pie data
  const pieData = preparePieData(summary)

  // Calculate totals
  const totals = calculateTotals(filteredItems)

  return {
    items: filteredItems,
    summary,
    categories: categoriesOptions,
    chartData,
    pieData,
    totals,
    filteredItems,
    allItems
  }
}

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

export interface UseProfitCalculationsReturn {
  data: ProfitDataResult | null
  isLoading: boolean
  error: string | null
  refresh: () => Promise<void>
  setFilters: (filters: ProfitFilters) => void
  filters: ProfitFilters
  items: DailySoldItem[]
  summary: ProfitDataResult['summary'] | null
  totals: ProfitDataResult['totals'] | null
  chartData: ProfitDataResult['chartData']
  pieData: ProfitDataResult['pieData']
  categories: ProfitDataResult['categories']
}

export function useProfitCalculations(
  initialDate?: Date,
  initialFilters: ProfitFilters = {}
): UseProfitCalculationsReturn {
  const [date] = useState<Date>(initialDate || new Date())
  const [filters, setFilters] = useState<ProfitFilters>(initialFilters)
  const [data, setData] = useState<ProfitDataResult | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await getProfitData(date, filters)
      setData(result)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch profit data'
      setError(errorMessage)
      console.error('Error in useProfitCalculations:', err)
    } finally {
      setIsLoading(false)
    }
  }, [date, filters])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const refresh = useCallback(async () => {
    await fetchData()
  }, [fetchData])

  const handleSetFilters = useCallback((newFilters: ProfitFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }))
  }, [])

  const memoizedData = useMemo(() => data, [data])
  const memoizedItems = useMemo(() => data?.items || [], [data?.items])
  const memoizedSummary = useMemo(() => data?.summary || null, [data?.summary])
  const memoizedTotals = useMemo(() => data?.totals || null, [data?.totals])
  const memoizedChartData = useMemo(() => data?.chartData || [], [data?.chartData])
  const memoizedPieData = useMemo(() => data?.pieData || [], [data?.pieData])
  const memoizedCategories = useMemo(() => data?.categories || [], [data?.categories])

  return {
    data: memoizedData,
    isLoading,
    error,
    refresh,
    setFilters: handleSetFilters,
    filters,
    items: memoizedItems,
    summary: memoizedSummary,
    totals: memoizedTotals,
    chartData: memoizedChartData,
    pieData: memoizedPieData,
    categories: memoizedCategories
  }
}

// ============================================================================
// OPTIMIZED HOOK WITH CACHING
// ============================================================================

interface CachedProfitData {
  data: ProfitDataResult
  timestamp: number
  date: string
}

export function useCachedProfitCalculations(
  date?: Date,
  initialFilters: ProfitFilters = {},
  cacheDuration: number = 60000 // 1 minute cache
): UseProfitCalculationsReturn {
  const [cachedData, setCachedData] = useState<CachedProfitData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<ProfitFilters>(initialFilters)
  const targetDate = date || new Date()
  const dateKey = format(targetDate, 'yyyy-MM-dd')

  const fetchData = useCallback(async () => {
    // Check cache
    if (cachedData && 
        cachedData.date === dateKey && 
        Date.now() - cachedData.timestamp < cacheDuration) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      const result = await getProfitData(targetDate, filters)
      
      const cacheEntry: CachedProfitData = {
        data: result,
        timestamp: Date.now(),
        date: dateKey
      }
      
      setCachedData(cacheEntry)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch profit data'
      setError(errorMessage)
      console.error('Error in useCachedProfitCalculations:', err)
    } finally {
      setIsLoading(false)
    }
  }, [targetDate, filters, cachedData, cacheDuration, dateKey])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const refresh = useCallback(async () => {
    setCachedData(null)
    await fetchData()
  }, [fetchData])

  const handleSetFilters = useCallback((newFilters: ProfitFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }))
  }, [])

  const currentData = cachedData?.data || null

  return {
    data: currentData,
    isLoading,
    error,
    refresh,
    setFilters: handleSetFilters,
    filters,
    items: currentData?.items || [],
    summary: currentData?.summary || null,
    totals: currentData?.totals || null,
    chartData: currentData?.chartData || [],
    pieData: currentData?.pieData || [],
    categories: currentData?.categories || []
  }
}