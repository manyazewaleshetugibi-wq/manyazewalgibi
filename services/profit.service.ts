// services/profit.service.ts
import { format, startOfDay, endOfDay } from 'date-fns'

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
// PROFIT SERVICE
// ============================================================================

export class ProfitService {
  // Fetch all required data in parallel
  static async fetchAllData(date?: Date): Promise<{
    orders: Order[]
    menuItems: MenuItem[]
    categories: Category[]
    stocks: StockItem[]
    purchases: Purchase[]
  }> {
    try {
      const targetDate = date || new Date()
      const startDate = format(startOfDay(targetDate), "yyyy-MM-dd")
      const endDate = format(endOfDay(targetDate), "yyyy-MM-dd")

      const [orders, menuItems, categories, stocks, purchases] = await Promise.all([
        this.fetchOrders(startDate, endDate),
        this.fetchMenuItems(),
        this.fetchCategories(),
        this.fetchStockItems(),
        this.fetchPurchases()
      ])

      return { orders, menuItems, categories, stocks, purchases }
    } catch (error) {
      console.error("Error fetching profit data:", error)
      throw error
    }
  }

  // Fetch orders for a specific date range
  static async fetchOrders(startDate: string, endDate: string): Promise<Order[]> {
    try {
      const response = await fetch(
        `/api/order/waiterreport?startDate=${startDate}&endDate=${endDate}&limit=10000`
      )
      const data = await response.json()
      
      if (data.success && data.orders) {
        // Filter ONLY COMPLETED orders
        return data.orders.filter((order: Order) => 
          order.status === 'COMPLETED' || order.status === 'completed'
        )
      }
      return []
    } catch (error) {
      console.error("Error fetching orders:", error)
      return []
    }
  }

  // Fetch menu items
  static async fetchMenuItems(): Promise<MenuItem[]> {
    try {
      const response = await fetch("/api/items")
      if (!response.ok) throw new Error("Failed to fetch menu items")
      const data = await response.json()
      if (data.data) return data.data
      if (data.items) return data.items
      if (Array.isArray(data)) return data
      return []
    } catch (error) {
      console.error("Error fetching menu items:", error)
      return []
    }
  }

  // Fetch categories
  static async fetchCategories(): Promise<Category[]> {
    try {
      const response = await fetch("/api/item-category?limit=100")
      if (!response.ok) throw new Error("Failed to fetch categories")
      const data = await response.json()
      if (data.success && data.data) return data.data
      return []
    } catch (error) {
      console.error("Error fetching categories:", error)
      return []
    }
  }

  // Fetch stock items
  static async fetchStockItems(): Promise<StockItem[]> {
    try {
      const response = await fetch("/api/stock")
      if (!response.ok) throw new Error("Failed to fetch stock items")
      const data = await response.json()
      if (data.success && data.data) return data.data
      return []
    } catch (error) {
      console.error("Error fetching stock items:", error)
      return []
    }
  }

  // Fetch purchases
  static async fetchPurchases(): Promise<Purchase[]> {
    try {
      const response = await fetch("/api/stock-purchase")
      if (!response.ok) throw new Error("Failed to fetch purchases")
      const data = await response.json()
      if (data.success && data.purchases) return data.purchases
      return []
    } catch (error) {
      console.error("Error fetching purchases:", error)
      return []
    }
  }

  // Get latest price for a stock item
  static getLatestPrice(stockId: string, purchases: Purchase[]): { 
    price: number
    purchaseDate: string
    supplier: string 
  } {
    const stockPurchases = purchases
      .filter(p => p.stockId === stockId)
      .sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime())
    
    if (stockPurchases.length > 0) {
      return {
        price: stockPurchases[0].unitPrice,
        purchaseDate: stockPurchases[0].purchaseDate,
        supplier: stockPurchases[0].supplier
      }
    }
    return { price: 0, purchaseDate: '', supplier: '' }
  }

  // Get stock name by ID
  static getStockName(stockId: string, stocks: StockItem[]): string {
    const stock = stocks.find(s => s._id === stockId)
    return stock ? stock.name : "Unknown Stock"
  }

  // Get stock unit by ID
  static getStockUnit(stockId: string, stocks: StockItem[]): string {
    const stock = stocks.find(s => s._id === stockId)
    return stock ? stock.unit : "unit"
  }

  // Get order items (handle different data structures)
  static getOrderItems(order: Order): OrderItem[] {
    return order.orderItems || order.items || []
  }

  // Calculate profitability for sold items
  static calculateProfitability(
    orders: Order[],
    menuItems: MenuItem[],
    categories: Category[],
    stocks: StockItem[],
    purchases: Purchase[]
  ): DailySoldItem[] {
    try {
      // Aggregate sales by item from orders
      const salesMap = new Map<string, { quantity: number }>()
      
      orders.forEach(order => {
        const orderItems = this.getOrderItems(order)
        if (!orderItems || orderItems.length === 0) return

        orderItems.forEach(item => {
          const itemId = item.menuItemId || item.itemId
          if (!itemId) return
          
          const quantity = item.quantity || 0
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

      salesMap.forEach((sale, itemId) => {
        // Find menu item
        const menuItem = menuItems.find(item => item._id === itemId)
        if (!menuItem || !menuItem.isActive) {
          return
        }

        // Find category
        const category = categories.find(c => c._id === menuItem.categoryId)
        const categoryName = category?.name || "Uncategorized"
        const categoryType = category?.type || "OTHER"

        let totalCost = 0
        const ingredients: IngredientCost[] = []

        // Calculate cost from required stock
        if (menuItem.requiredStock && menuItem.requiredStock.length > 0) {
          menuItem.requiredStock.forEach(req => {
            const { price: latestPrice, purchaseDate, supplier } = this.getLatestPrice(
              req.stockId, 
              purchases
            )
            // Cost = quantity_needed × latest_price × quantity_sold
            const cost = req.quantity * latestPrice * sale.quantity
            totalCost += cost

            ingredients.push({
              stockId: req.stockId,
              stockName: this.getStockName(req.stockId, stocks),
              quantity: req.quantity * sale.quantity,
              unit: this.getStockUnit(req.stockId, stocks),
              latestPrice: latestPrice,
              totalCost: cost,
              purchaseDate: purchaseDate,
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

      // Sort by profit margin
      results.sort((a, b) => b.profitMargin - a.profitMargin)
      
      return results
    } catch (error) {
      console.error("Error calculating profitability:", error)
      return []
    }
  }

  // Generate summary from items
  static generateSummary(items: DailySoldItem[], orders: Order[]): DailyProfitSummary {
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

  // Apply filters and sorting to items
  static applyFilters(
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

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(item => 
        item.itemName.toLowerCase().includes(query) ||
        item.categoryName.toLowerCase().includes(query)
      )
    }

    // Apply category filter
    if (categoryId !== 'all') {
      filtered = filtered.filter(item => item.categoryId === categoryId)
    }

    // Apply category type filter
    if (categoryType !== 'all') {
      filtered = filtered.filter(item => item.categoryType === categoryType)
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(item => item.status === statusFilter)
    }

    // Apply sorting
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

  // Get category options from items
  static getCategoryOptions(items: DailySoldItem[]): { _id: string; name: string; type: string }[] {
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

  // Prepare chart data
  static prepareChartData(items: DailySoldItem[], limit: number = 10): {
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

  // Prepare pie chart data
  static preparePieData(summary: DailyProfitSummary): {
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

  // Calculate totals for filtered items
  static calculateTotals(items: DailySoldItem[]): {
    totalCost: number
    totalRevenue: number
    totalProfit: number
  } {
    const totalCost = items.reduce((sum, item) => sum + item.totalIngredientCost, 0)
    const totalRevenue = items.reduce((sum, item) => sum + (item.sellingPrice * item.quantitySold), 0)
    const totalProfit = totalRevenue - totalCost
    return { totalCost, totalRevenue, totalProfit }
  }

  // Main method to get all profit data
  static async getProfitData(
    date?: Date,
    filters: ProfitFilters = {}
  ): Promise<ProfitDataResult> {
    // Fetch all data
    const { orders, menuItems, categories, stocks, purchases } = 
      await this.fetchAllData(date)

    // Calculate profitability
    const allItems = this.calculateProfitability(
      orders,
      menuItems,
      categories,
      stocks,
      purchases
    )

    // Generate summary
    const summary = this.generateSummary(allItems, orders)

    // Apply filters
    const filteredItems = this.applyFilters(allItems, filters)

    // Get category options
    const categoriesOptions = this.getCategoryOptions(allItems)

    // Prepare chart data
    const chartData = this.prepareChartData(filteredItems)

    // Prepare pie data
    const pieData = this.preparePieData(summary)

    // Calculate totals
    const totals = this.calculateTotals(filteredItems)

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
}