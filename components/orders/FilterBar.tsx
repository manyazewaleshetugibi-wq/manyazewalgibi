// components/orders/FilterBar.tsx
"use client"

import React, { useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import {
  Search,
  RefreshCcw,
  CalendarIcon,
  Grid,
  List,
  Flag,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react"
import { format } from "date-fns"
import type { OrderStatus, Waitress, Restaurant, StockProcessStatus } from "@/types/order"

const statusOptions: OrderStatus[] = [
  "PENDING",
  "CONFIRMED",
  "PREPARING",
  "PICKUP",
  "SERVED",
  "COMPLETED",
  "CANCELLED",
]

const stockStatusOptions: { value: StockProcessStatus | "ALL"; label: string; icon: React.ReactNode }[] = [
  { value: "ALL", label: "All Orders", icon: null },
  { value: "PROCESSED", label: "Stock Processed", icon: <CheckCircle className="h-3 w-3" /> },
  { value: "PENDING", label: "Pending Stock", icon: <Clock className="h-3 w-3" /> },
  { value: "FAILED", label: "Stock Failed", icon: <XCircle className="h-3 w-3" /> },
]

interface FilterBarProps {
  searchTerm: string
  onSearchChange: (value: string) => void
  statusFilter: OrderStatus | null
  onStatusFilterChange: (value: OrderStatus | null) => void
  stockStatusFilter: StockProcessStatus | "ALL"
  onStockStatusFilterChange: (value: StockProcessStatus | "ALL") => void
  restaurantFilter: string | null
  onRestaurantFilterChange: (value: string | null) => void
  orderTypeFilter: string | null
  onOrderTypeFilterChange: (value: string | null) => void
  waitressFilter: string | null
  onWaitressFilterChange: (value: string | null) => void
  dateFilter: Date | null
  onDateFilterChange: (value: Date | null) => void
  showMarkedOnly: boolean
  onShowMarkedOnlyChange: (value: boolean) => void
  viewMode: "list" | "grid"
  onViewModeChange: (value: "list" | "grid") => void
  onClearFilters: () => void
  onRefresh: () => void
  isLoading: boolean
  waitresses: Waitress[]
  restaurants: Restaurant[]
  loadingRestaurants: boolean
}

export function FilterBar({
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  stockStatusFilter,
  onStockStatusFilterChange,
  restaurantFilter,
  onRestaurantFilterChange,
  orderTypeFilter,
  onOrderTypeFilterChange,
  waitressFilter,
  onWaitressFilterChange,
  dateFilter,
  onDateFilterChange,
  showMarkedOnly,
  onShowMarkedOnlyChange,
  viewMode,
  onViewModeChange,
  onClearFilters,
  onRefresh,
  isLoading,
  waitresses = [], // Default to empty array
  restaurants = [], // Default to empty array
  loadingRestaurants,
}: FilterBarProps) {
  
  const handleSearchDebounced = useMemo(() => {
    let timeoutId: NodeJS.Timeout
    return (value: string) => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => onSearchChange(value), 300)
    }
  }, [onSearchChange])

  // Get the display name for the selected restaurant
  const getSelectedRestaurantName = () => {
    if (!restaurantFilter || restaurantFilter === "All" || restaurantFilter === "all") return "All Restaurants"
    const restaurant = restaurants.find(r => r._id === restaurantFilter)
    return restaurant?.name || restaurantFilter
  }

  // Ensure waitresses is always an array
  const waitressesList = Array.isArray(waitresses) ? waitresses : []
  
  // Ensure restaurants is always an array
  const restaurantsList = Array.isArray(restaurants) ? restaurants : []

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search orders..."
                onChange={(e) => handleSearchDebounced(e.target.value)}
                className="w-full pl-8"
                defaultValue={searchTerm}
              />
            </div>
          </div>

          <Select
            value={statusFilter || "All"}
            onValueChange={(value) =>
              onStatusFilterChange(value === "All" ? null : value as OrderStatus)
            }
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Statuses</SelectItem>
              {statusOptions.map((status) => (
                <SelectItem key={status} value={status}>
                  {status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* New Stock Status Filter */}
          <Select
            value={stockStatusFilter}
            onValueChange={(value) => onStockStatusFilterChange(value as typeof stockStatusFilter)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Stock Status" />
            </SelectTrigger>
            <SelectContent>
              {stockStatusOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <div className="flex items-center gap-2">
                    {option.icon}
                    <span>{option.label}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* UPDATED: Restaurant filter with proper value handling */}
          <Select
            value={restaurantFilter || "All"}
            onValueChange={(value) => {
              onRestaurantFilterChange(value === "All" ? null : value)
            }}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by Restaurant">
                {getSelectedRestaurantName()}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Restaurants</SelectItem>
              {loadingRestaurants ? (
                <SelectItem value="loading" disabled>Loading...</SelectItem>
              ) : (
                restaurantsList.map((restaurant) => (
                  <SelectItem key={restaurant._id} value={restaurant._id}>
                    <div className="flex items-center gap-2">
                      {restaurant.name}
                    </div>
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>

          <Select
            value={orderTypeFilter || "All"}
            onValueChange={(value) => onOrderTypeFilterChange(value === "All" ? null : value)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Types</SelectItem>
              <SelectItem value="intable">In-Table</SelectItem>
              <SelectItem value="delivery">Delivery</SelectItem>
              <SelectItem value="pos">POS</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={waitressFilter || "All"}
            onValueChange={(value) => onWaitressFilterChange(value === "All" ? null : value)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by waitress" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Waitresses</SelectItem>
              {waitressesList.length === 0 ? (
                <SelectItem value="none" disabled>No waitresses found</SelectItem>
              ) : (
                waitressesList.map((waitress) => (
                  <SelectItem key={waitress._id} value={waitress._id}>
                    {waitress.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-[240px] justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateFilter ? format(dateFilter, "PPP") : <span>Filter by date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateFilter || undefined}
                onSelect={(date: Date | undefined) => onDateFilterChange(date || null)}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <Button
            variant={showMarkedOnly ? "destructive" : "outline"}
            onClick={() => onShowMarkedOnlyChange(!showMarkedOnly)}
            className="gap-2"
          >
            <Flag className="h-4 w-4" />
            {showMarkedOnly ? "Showing Marked" : "Show Marked"}
          </Button>

          <Button onClick={onClearFilters} variant="secondary">
            <RefreshCcw className="mr-2 h-4 w-4" />
            Clear
          </Button>

          <div className="ml-auto flex gap-1">
            <Button
              variant="outline"
              size="icon"
              onClick={() => onViewModeChange("list")}
              className={viewMode === "list" ? "bg-primary text-primary-foreground" : ""}
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => onViewModeChange("grid")}
              className={viewMode === "grid" ? "bg-primary text-primary-foreground" : ""}
            >
              <Grid className="h-4 w-4" />
            </Button>
          </div>

          <Button onClick={onRefresh} variant="outline" size="icon" disabled={isLoading}>
            <RefreshCcw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}