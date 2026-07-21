"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useSession } from "next-auth/react"
import { Toaster, toast } from "react-hot-toast"
import {
  Plus,
  RefreshCw,
  Package,
  LayoutGrid,
  Table as TableIcon,
  Lock,
  AlertOctagon,
  ArrowRightLeft,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { StockCalculations } from "../../../components/stock/stock-calculations"
import { StockManagementUI } from "../../../components/stock/stock-management-ui"
import { WastageDisplay } from "../../../components/stock/WastageDisplay"
import { TransferDisplay } from "../../../components/stock/TransferDisplay"

// Types
export type Stock = {
  _id: string
  name: string
  categoryId: string
  unit: string
  minimumStock: number
  currentStock: number
  requiredAmount: number
  reorderFrequency: 'daily' | '3days' | '5days' | 'weekly' | '9days' | '11days' | '2weeks' | 'monthly' | '2months' | '3months' | '6months' | 'yearly'
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type Category = {
  _id: string
  name: string
  description: string
}

export type Purchase = {
  _id: string
  stockId: string
  purchaseDate: string
  quantity: number
  unitPrice: number
  supplier: string
}

export type StockStatus = 'critical' | 'low' | 'good' | 'overstock'

export type Wastage = {
  _id: string
  stockId: string
  quantity: number
  reason: string
  date: string
  createdAt: string
  updatedAt: string
}

// Helper function to check if user has edit permission
export const hasEditPermission = (role: string | undefined): boolean => {
  if (!role) return false
  const normalizedRole = role.toUpperCase().trim()
  return normalizedRole === 'ADMIN' || normalizedRole === 'STOCK_MANAGER'
}

// Helper function to check if user is admin
export const isAdmin = (role: string | undefined): boolean => {
  if (!role) return false
  const normalizedRole = role.toUpperCase().trim()
  return normalizedRole === 'ADMIN'
}

// Helper function to get normalized role
export const getNormalizedRole = (role: string | undefined): string => {
  if (!role) return 'user'
  return role.toLowerCase().trim()
}

export default function StockManagementPage() {
  const { data: session } = useSession()
  const userRole = session?.user?.role
  
  // Get normalized role and permissions
  const normalizedRole = getNormalizedRole(userRole)
  const canEdit = hasEditPermission(userRole)
  const isAdminUser = isAdmin(userRole)
  
  const [stocks, setStocks] = useState<Stock[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<StockStatus | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isAddStockOpen, setIsAddStockOpen] = useState(false)
  
  // New state for wastage display
  const [isWastageDisplayOpen, setIsWastageDisplayOpen] = useState(false)
  const [isTransferDisplayOpen, setIsTransferDisplayOpen] = useState(false)

  useEffect(() => {
    fetchStocks()
    fetchCategories()
    fetchPurchases()
  }, [])

  const fetchStocks = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/stock")
      const data = await response.json()
      if (data.success) {
        setStocks(data.data)
      }
    } catch (error) {
      console.error("Error fetching stocks:", error)
      toast.error("Failed to fetch stocks")
    } finally {
      setIsLoading(false)
    }
  }

  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/stock-category")
      const data = await response.json()
      if (data.success) {
        setCategories(data.data)
      }
    } catch (error) {
      console.error("Error fetching categories:", error)
      toast.error("Failed to fetch categories")
    }
  }

  const fetchPurchases = async () => {
    try {
      const response = await fetch("/api/stock-purchase")
      const data = await response.json()
      if (data.success) {
        setPurchases(data.purchases || data.data || [])
      }
    } catch (error) {
      console.error("Error fetching purchases:", error)
      toast.error("Failed to fetch purchases")
    }
  }

  // Calculate total cost based on current stock × last purchase price
  const calculateTotalCost = useCallback((stockId: string) => {
    const stock = stocks.find(s => s._id === stockId)
    if (!stock) return 0
    
    // Get last purchase price (by insertion order, not date)
    const stockPurchases = purchases
      .filter(p => p.stockId === stockId)
      .sort((a, b) => b._id.localeCompare(a._id))
    
    const lastPurchasePrice = stockPurchases.length > 0 ? stockPurchases[0].unitPrice : 0
    
    // Calculate value = current stock × last purchase price
    return stock.currentStock * lastPurchasePrice
  }, [stocks, purchases])

  // Get stock status based on current stock vs minimum stock
  const getStockStatus = useCallback((stock: Stock): StockStatus => {
    if (stock.minimumStock === 0) return 'good'
    const ratio = stock.currentStock / stock.minimumStock
    if (stock.currentStock === 0) return 'critical'
    if (ratio <= 0.5) return 'critical'
    if (ratio <= 1) return 'low'
    if (ratio <= 2) return 'good'
    return 'overstock'
  }, [])

  // Calculate need to order
  const getNeedToOrder = useCallback((stock: Stock): number => {
    return Math.max(0, (stock.requiredAmount || 0) - stock.currentStock)
  }, [])

  // Filtered stocks
  const filteredStocks = useMemo(() => {
    let filtered = [...stocks]

    if (selectedCategory) {
      filtered = filtered.filter((stock) => stock.categoryId === selectedCategory)
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((stock) => getStockStatus(stock) === statusFilter)
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter((stock) => 
        stock.name.toLowerCase().includes(query) ||
        stock.unit.toLowerCase().includes(query)
      )
    }

    return filtered
  }, [stocks, selectedCategory, statusFilter, searchQuery, getStockStatus])

  const resetFilters = () => {
    setSelectedCategory(null)
    setStatusFilter('all')
    setSearchQuery("")
  }

  // Get role display name
  const getRoleDisplayName = (role: string | undefined): string => {
    if (!role) return 'User'
    const normalized = role.toLowerCase().trim()
    switch(normalized) {
      case 'admin': return 'Administrator'
      case 'stockmanager':
      case 'stock_manager': return 'Stock Manager'
      default: return 'User'
    }
  }

  return (
    <div className="container mx-auto py-10">
      <Toaster position="top-right" />
      
      {/* Role-based notification banner */}
      {!canEdit ? (
        <div className="mb-6 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4 flex items-center gap-3">
          <Lock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          <div>
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">View-Only Mode</p>
            <p className="text-xs text-amber-700 dark:text-amber-400">
              You are logged in as {getRoleDisplayName(userRole)}. You have view-only access to stock management.
            </p>
          </div>
        </div>
      ) : isAdminUser ? (
        <div className="mb-6 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-4 flex items-center gap-3">
          <div className="h-5 w-5 text-green-600 dark:text-green-400">✅</div>
          <div>
            <p className="text-sm font-medium text-green-800 dark:text-green-300">Administrator Access</p>
            <p className="text-xs text-green-700 dark:text-green-400">
              You are logged in as Administrator. You have full access including delete and name editing permissions.
            </p>
          </div>
        </div>
      ) : (
        <div className="mb-6 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 flex items-center gap-3">
          <div className="h-5 w-5 text-blue-600 dark:text-blue-400">👤</div>
          <div>
            <p className="text-sm font-medium text-blue-800 dark:text-blue-300">Stock Manager Access</p>
            <p className="text-xs text-blue-700 dark:text-blue-400">
              You are logged in as Stock Manager. You can manage stock but cannot delete items or edit names.
            </p>
          </div>
        </div>
      )}
      
      <StockCalculations 
        stocks={stocks}
        purchases={purchases}
        getStockStatus={getStockStatus}
        calculateTotalCost={calculateTotalCost}
        statusFilter={statusFilter}
        selectedCategory={selectedCategory}
        searchQuery={searchQuery}
        onStatusFilterChange={setStatusFilter}
        onCategoryFilterChange={setSelectedCategory}
        onSearchQueryChange={setSearchQuery}
        onResetFilters={resetFilters}
      />

      <Card className="mb-8">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <CardTitle className="text-2xl font-bold flex items-center">
                <Package className="mr-2 h-6 w-6" />
                Stock Management
              </CardTitle>
              <CardDescription>
                Stock value calculated using current stock quantity × last purchase price
                {userRole && (
                  <span className="ml-2 inline-flex items-center gap-1">
                    <span className="text-xs bg-muted px-2 py-0.5 rounded-full">
                      Role: {getRoleDisplayName(userRole)}
                    </span>
                  </span>
                )}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Show Wastages Button - Visible to everyone */}
              <Button 
                variant="outline" 
                onClick={() => setIsWastageDisplayOpen(true)}
                className="bg-amber-50 border-amber-200 hover:bg-amber-100 hover:border-amber-300 text-amber-700"
              >
                <AlertOctagon className="mr-2 h-4 w-4" />
                Show Wastages
              </Button>

              {/* Show Transfers Button - Visible to everyone */}
              <Button 
                variant="outline" 
                onClick={() => setIsTransferDisplayOpen(true)}
                className="bg-blue-50 border-blue-200 hover:bg-blue-100 hover:border-blue-300 text-blue-700"
              >
                <ArrowRightLeft className="mr-2 h-4 w-4" />
                Show Transfers
              </Button>
              
              {/* Add Stock Button - Only for Admin and Stock Manager */}
              {canEdit && (
                <Button onClick={() => setIsAddStockOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" /> Add Stock
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex justify-end mb-4">
            <div className="flex items-center gap-2">
              <div className="flex border rounded-md overflow-hidden">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  className="rounded-none px-3"
                  onClick={() => setViewMode('grid')}
                >
                  <LayoutGrid className="h-4 w-4 mr-2" />
                  Grid
                </Button>
                <Button
                  variant={viewMode === 'table' ? 'default' : 'ghost'}
                  size="sm"
                  className="rounded-none px-3"
                  onClick={() => setViewMode('table')}
                >
                  <TableIcon className="h-4 w-4 mr-2" />
                  Table
                </Button>
              </div>
              
              <Button variant="outline" size="icon" onClick={() => {
                fetchStocks()
                fetchPurchases()
              }}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <StockManagementUI
            stocks={filteredStocks}
            categories={categories}
            purchases={purchases}
            viewMode={viewMode}
            isLoading={isLoading}
            canEdit={canEdit}
            selectedCategory={selectedCategory}
            statusFilter={statusFilter}
            searchQuery={searchQuery}
            isAddStockOpen={isAddStockOpen}
            setIsAddStockOpen={setIsAddStockOpen}
            fetchStocks={fetchStocks}
            fetchPurchases={fetchPurchases}
            getStockStatus={getStockStatus}
            calculateTotalCost={calculateTotalCost}
            getNeedToOrder={getNeedToOrder}
            onCategoryChange={setSelectedCategory}
            onStatusChange={setStatusFilter}
            onSearchChange={setSearchQuery}
            userRole={normalizedRole} // Pass the normalized role to the UI component
          />
        </CardContent>
      </Card>

      {/* Wastage Display Dialog - Visible to everyone */}
      <WastageDisplay
        open={isWastageDisplayOpen}
        onOpenChange={setIsWastageDisplayOpen}
        stocks={stocks}
        categories={categories}
        purchases={purchases}
        fetchStocks={fetchStocks}
      />

      {/* Transfer Display Dialog - Visible to everyone */}
      <TransferDisplay
        open={isTransferDisplayOpen}
        onOpenChange={setIsTransferDisplayOpen}
        stocks={stocks}
        categories={categories}
        fetchStocks={fetchStocks}
      />
    </div>
  )
}