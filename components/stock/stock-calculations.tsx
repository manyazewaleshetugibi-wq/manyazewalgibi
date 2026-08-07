"use client"

import { useMemo } from "react"
import {
  Package,
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  DollarSign,
  XCircle,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { Stock, Purchase, StockStatus } from "../../app/(admin)/stock/page"

interface StockCalculationsProps {
  stocks: Stock[]
  purchases: Purchase[]
  getStockStatus: (stock: Stock) => StockStatus
  calculateTotalCost: (stockId: string) => number
  statusFilter: StockStatus | 'all'
  selectedCategory: string | null
  searchQuery: string
  onStatusFilterChange: (filter: StockStatus | 'all') => void
  onCategoryFilterChange: (category: string | null) => void
  onSearchQueryChange: (query: string) => void
  onResetFilters: () => void
}

export function StockCalculations({
  stocks,
  purchases,
  getStockStatus,
  calculateTotalCost,
  statusFilter,
  selectedCategory,
  searchQuery,
  onStatusFilterChange,
  onCategoryFilterChange,
  onSearchQueryChange,
  onResetFilters,
}: StockCalculationsProps) {
  
  const stockStats = useMemo(() => {
    const stats = {
      total: stocks.length,
      critical: 0,
      low: 0,
      good: 0,
      overstock: 0,
      totalValue: 0,
      totalCurrentStock: 0,
    }

    stocks.forEach(stock => {
      const status = getStockStatus(stock)
      stats[status]++
      stats.totalCurrentStock += stock.currentStock
      // Calculate total value using calculateTotalCost function
      if (calculateTotalCost && typeof calculateTotalCost === 'function') {
        stats.totalValue += calculateTotalCost(stock._id)
      }
    })

    return stats
  }, [stocks, getStockStatus, calculateTotalCost])

  const isFilterActive = (filterType: 'status', value: StockStatus | 'all') => {
    if (filterType === 'status') {
      return statusFilter === value
    }
    return false
  }

  const handleCardClick = (filterType: 'status', value: StockStatus | 'all') => {
    onStatusFilterChange(value)
    onCategoryFilterChange(null)
  }

  const handleTotalItemsClick = () => {
    onStatusFilterChange('all')
    onCategoryFilterChange(null)
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
        {/* Total Items Card */}
        <Card 
          className={`bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20 transition-all duration-200 cursor-pointer hover:scale-105 hover:shadow-lg ${
            statusFilter === 'all' && !selectedCategory && !searchQuery 
              ? 'ring-2 ring-blue-500 shadow-lg' 
              : ''
          }`}
          onClick={handleTotalItemsClick}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Items</p>
                <p className="text-2xl font-bold">{stockStats.total}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Total Stock: {stockStats.totalCurrentStock} units
                </p>
              </div>
              <Package className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        {/* Critical Stock Card */}
        <Card 
          className={`bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/20 dark:to-red-900/20 transition-all duration-200 cursor-pointer hover:scale-105 hover:shadow-lg ${
            isFilterActive('status', 'critical') 
              ? 'ring-2 ring-red-500 shadow-lg' 
              : ''
          }`}
          onClick={() => handleCardClick('status', 'critical')}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Critical Stock</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stockStats.critical}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        
        {/* Low Stock Card */}
        <Card 
          className={`bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/20 dark:to-amber-900/20 transition-all duration-200 cursor-pointer hover:scale-105 hover:shadow-lg ${
            isFilterActive('status', 'low') 
              ? 'ring-2 ring-amber-500 shadow-lg' 
              : ''
          }`}
          onClick={() => handleCardClick('status', 'low')}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Low Stock</p>
                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stockStats.low}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>
        
        {/* Good Stock Card */}
        <Card 
          className={`bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/20 dark:to-green-900/20 transition-all duration-200 cursor-pointer hover:scale-105 hover:shadow-lg ${
            isFilterActive('status', 'good') 
              ? 'ring-2 ring-green-500 shadow-lg' 
              : ''
          }`}
          onClick={() => handleCardClick('status', 'good')}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Good Stock</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stockStats.good}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        {/* Total Value Card */}
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/20 dark:to-purple-900/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Stock Value</p>
                <p className="text-2xl font-bold text-purple-600">
                  {stockStats.totalValue.toLocaleString("en-ET", { style: "currency", currency: "ETB" })}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Current Stock × Last Purchase Price
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {(selectedCategory || statusFilter !== 'all' || searchQuery) && (
        <div className="flex flex-wrap gap-2 mb-4">
          <span className="text-sm text-muted-foreground">Active filters:</span>
          {selectedCategory && (
            <Badge variant="secondary" className="gap-1">
              Category ID: {selectedCategory}
              <XCircle 
                className="h-3 w-3 ml-1 cursor-pointer" 
                onClick={() => onCategoryFilterChange(null)}
              />
            </Badge>
          )}
          {statusFilter !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              Status: {statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}
              <XCircle 
                className="h-3 w-3 ml-1 cursor-pointer" 
                onClick={() => onStatusFilterChange('all')}
              />
            </Badge>
          )}
          {searchQuery && (
            <Badge variant="secondary" className="gap-1">
              Search: {searchQuery}
              <XCircle 
                className="h-3 w-3 ml-1 cursor-pointer" 
                onClick={() => onSearchQueryChange("")}
              />
            </Badge>
          )}
          <Button variant="ghost" size="sm" onClick={onResetFilters} className="h-6 px-2">
            Clear all
          </Button>
        </div>
      )}
    </>
  )
}