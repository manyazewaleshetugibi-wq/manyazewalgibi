// components/orders/OrderManagementMain.tsx
"use client"

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { useSession } from "next-auth/react"
import { toast, Toaster } from "react-hot-toast"
import { AnimatePresence } from "framer-motion"
import { format } from "date-fns"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Shield,
  ShieldAlert,
  Info,
  Clock,
  Package,
  RefreshCcw,
  MoreHorizontal,
  Eye,
  Trash2,
  Flag,
  Volume2,
} from "lucide-react"
import type { Order, Waitress, Restaurant, OrderStatus, StockProcessStatus } from "@/types/order"

import { FilterBar } from "./FilterBar"
import { OrderCard } from "./OrderCard"
import { StockProcess } from "./StockProcess"
import { OrderDetailModal } from "./OrderDetailModal"
import { useNotificationSound } from "@/hooks/useNotificationSound"
import { SoundToggleButton, SoundControlDialog } from "./SoundControls"
import { NotificationToast, notificationStyles } from "./NotificationToast"

// Helper functions
const isAdminUser = (role: string | undefined): boolean => {
  if (!role) return false
  const adminRoles = ["ADMIN", "admin", "Admin", "SUPER_ADMIN"]
  return adminRoles.includes(role)
}

const isOrderEdited = (order: Order): boolean => {
  return !!(order.orderItems && order.orderItems.length > 0)
}

const fetchRestaurants = async (): Promise<Restaurant[]> => {
  try {
    const response = await fetch('/api/restaurants')
    const data = await response.json()
    if (data.success && Array.isArray(data.data)) {
      return data.data.filter((r: Restaurant) => r.isActive !== false)
    }
    return []
  } catch (error) {
    console.error("Error fetching restaurants:", error)
    return []
  }
}

const getOrderRestaurantId = (order: Order): string | null => {
  if (order.restaurantId) return order.restaurantId
  if (order.delivery === true && order.restaurantName) {
    return order.restaurantName
  }
  if (order.restaurantName?.includes("Manyazewal 1") || order.restaurantName === "Manyazewal Eshetu Gibi 1")
    return "manyazewal1"
  if (order.restaurantName?.includes("Manyazewal 2") || order.restaurantName === "Manyazewal Eshetu Gibi 2")
    return "manyazewal2"
  return null
}

const getRestaurantById = (restaurants: Restaurant[], restaurantId?: string): Restaurant | null => {
  if (!restaurantId) return null
  return restaurants.find(r => r._id === restaurantId) || null
}

const prefetchCommonItemCombinations = async (orders: Order[]) => {
  // Implementation for prefetching items if needed
}

export default function OrderManagementMain() {
  const { data: session } = useSession()
  
  // State
  const [orders, setOrders] = useState<Order[]>([])
  const [waitresses, setWaitresses] = useState<Waitress[]>([])
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingRestaurants, setLoadingRestaurants] = useState(true)
  const [filterInfo, setFilterInfo] = useState<{
    isAdmin: boolean
    timeFilterHours: number | null
    message: string
  } | null>(null)
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<OrderStatus | null>(null)
  const [stockStatusFilter, setStockStatusFilter] = useState<StockProcessStatus | "ALL">("ALL")
  const [restaurantFilter, setRestaurantFilter] = useState<string | null>(null)
  const [orderTypeFilter, setOrderTypeFilter] = useState<string | null>(null)
  const [waitressFilter, setWaitressFilter] = useState<string | null>(null)
  const [dateFilter, setDateFilter] = useState<Date | null>(null)
  const [showMarkedOnly, setShowMarkedOnly] = useState(false)
  const [sortField] = useState<keyof Order>("createdAt")
  const [sortDirection] = useState<"asc" | "desc">("desc")
  const [currentPage, setCurrentPage] = useState(1)
  const [viewMode, setViewMode] = useState<"list" | "grid">("grid")
  
  // Notification state
  const [showNotification, setShowNotification] = useState(false)
  const [notificationData, setNotificationData] = useState({ title: "", message: "" })
  const [soundInitialized, setSoundInitialized] = useState(false)
  const [showEnableSoundButton, setShowEnableSoundButton] = useState(false)
  
  const itemsPerPage = 12
  const userRole = session?.user?.role
  const isAdmin = isAdminUser(userRole)
  const currentUser = session?.user
    ? { name: session.user.name, email: session.user.email }
    : null

  // Refs for polling
  const lastOrderIdsRef = useRef<string[]>([])
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastFetchTimeRef = useRef<string>(new Date().toISOString())
  const isMountedRef = useRef<boolean>(true)

  // Sound hook
  const {
    play: playNotificationSound,
    stop: stopNotificationSound,
    isEnabled: soundEnabled,
    setIsEnabled: setSoundEnabled,
    isReady: soundReady,
    volume,
    setVolume,
  } = useNotificationSound()

  // Stock process hook
  const {
    pendingStockCount,
    failedStockCount,
    StockStatusBadge,
    StockConfirmDialog,
    setShowConfirmDialog,
    checkPendingStockOrders,
  } = StockProcess({ onStockProcessed: () => fetchOrders(false) })

  // Initialize sound on user click
  const initializeSound = useCallback(async () => {
    if (!soundInitialized) {
      try {
        await playNotificationSound()
        setSoundInitialized(true)
        setShowEnableSoundButton(false)
        toast.success("🔊 Sound enabled! You will now hear notifications.", {
          icon: "🔔",
          duration: 3000,
        })
      } catch (error) {
        setShowEnableSoundButton(true)
      }
    }
  }, [playNotificationSound, soundInitialized])

  // Auto-initialize sound on first user interaction
  useEffect(() => {
    const handleFirstInteraction = () => {
      if (!soundInitialized) {
        initializeSound()
      }
      document.removeEventListener('click', handleFirstInteraction)
      document.removeEventListener('keydown', handleFirstInteraction)
    }
    
    document.addEventListener('click', handleFirstInteraction)
    document.addEventListener('keydown', handleFirstInteraction)
    
    const timer = setTimeout(() => {
      if (!soundInitialized) {
        setShowEnableSoundButton(true)
      }
    }, 3000)
    
    return () => {
      document.removeEventListener('click', handleFirstInteraction)
      document.removeEventListener('keydown', handleFirstInteraction)
      clearTimeout(timer)
    }
  }, [soundInitialized, initializeSound])

  // Fetch waitresses
  const fetchWaitresses = useCallback(async () => {
    try {
      const response = await fetch("/api/waitress")
      if (!response.ok) throw new Error("Failed to fetch waitresses")
      const data = await response.json()
      if (isMountedRef.current) {
        setWaitresses(data || [])
      }
    } catch (error) {
      console.error("Error fetching waitresses:", error)
      toast.error("Failed to fetch waitresses")
    }
  }, [])

  // Fetch orders
  const fetchOrders = useCallback(
    async (showLoading = true) => {
      if (showLoading) setLoading(true)
      try {
        const url = isAdmin ? "/api/order?all=true" : "/api/order"
        const response = await fetch(url)
        if (!response.ok) throw new Error("Failed to fetch orders")
        const data = await response.json()

        if (data.filterInfo) {
          setFilterInfo(data.filterInfo)
        }

        const ordersWithFlags = (data.orders || []).map((order: Order) => ({
          ...order,
          isEdited: isOrderEdited(order),
          markedForDeletion: order.markedForDeletion || false,
        }))

        if (isMountedRef.current) {
          setOrders(ordersWithFlags)
          lastOrderIdsRef.current = ordersWithFlags.map((order: Order) => order._id)
          lastFetchTimeRef.current = new Date().toISOString()
          await prefetchCommonItemCombinations(ordersWithFlags)
        }
      } catch (error) {
        console.error("Error fetching orders:", error)
        if (showLoading) toast.error("Failed to fetch orders")
      } finally {
        if (showLoading && isMountedRef.current) setLoading(false)
      }
    },
    [isAdmin]
  )

  // Load restaurants
  const loadRestaurants = useCallback(async () => {
    try {
      const data = await fetchRestaurants()
      if (isMountedRef.current) {
        setRestaurants(data)
      }
    } catch (error) {
      console.error("Error loading restaurants:", error)
    } finally {
      if (isMountedRef.current) setLoadingRestaurants(false)
    }
  }, [])

  // Poll for new orders
  const pollNewOrders = useCallback(async () => {
    if (!isMountedRef.current) return
    try {
      const url = isAdmin
        ? `/api/order?all=true&after=${lastFetchTimeRef.current}`
        : `/api/order?after=${lastFetchTimeRef.current}`
      const response = await fetch(url)
      if (!response.ok) throw new Error("Failed to fetch new orders")
      const data = await response.json()
      const newOrders = (data.orders || []).map((order: Order) => ({
        ...order,
        isEdited: isOrderEdited(order),
        markedForDeletion: order.markedForDeletion || false,
      }))

      if (newOrders.length > 0 && isMountedRef.current) {
        const trulyNewOrders = newOrders.filter(
          (order: Order) => !lastOrderIdsRef.current.includes(order._id)
        )
        if (trulyNewOrders.length > 0) {
          trulyNewOrders.forEach((order: Order) => {
            if (soundInitialized) {
              playNotificationSound()
            }
            
            const orderType = order.inTable ? "In-Table" : order.delivery ? "Delivery" : "POS"
            const restaurant = restaurants.find(r => r._id === order.restaurantId)
            const restaurantName = restaurant?.name || order.restaurantName || "Unknown"
            
            setNotificationData({
              title: `New ${orderType} Order #${order.orderNumber}`,
              message: `${restaurantName} | Table ${order.tableNumber} | ${order.items?.length || 0} items`,
            })
            setShowNotification(true)
            setTimeout(() => setShowNotification(false), 4000)
            
            toast.success(`New ${orderType} order #${order.orderNumber}!`, {
              duration: 5000,
              icon: "🔔",
            })
          })
        }
        await fetchOrders(false)
      }
    } catch (error) {
      console.error("Error polling new orders:", error)
    }
  }, [playNotificationSound, fetchOrders, isAdmin, restaurants, soundInitialized])

  // Handle status update
  const handleStatusUpdate = async (orderId: string, newStatus: OrderStatus) => {
    const order = orders.find(o => o._id === orderId)
    if (order?.markedForDeletion) {
      toast.error("Cannot update status: Order is marked for deletion")
      return
    }
    if (order?.status === "COMPLETED" || order?.status === "CANCELLED") {
      toast.error(`Cannot update status: Order is already ${order.status.toLowerCase()}`)
      return
    }

    const loadingToast = toast.loading(`Updating order status to ${newStatus}...`)
    
    try {
      const response = await fetch(`/api/order`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, status: newStatus }),
      })
      
      const data = await response.json()
      toast.dismiss(loadingToast)
      
      if (!response.ok) throw new Error(data.error || "Failed to update order status")
      
      toast.success(data.message || `Order status updated to ${newStatus} successfully`)
      
      if (newStatus === "COMPLETED" && data.completedBy) {
        toast.success(`Order completed by ${data.completedBy.name}`, { duration: 3000 })
        if (soundInitialized) playNotificationSound()
      }
      
      await fetchOrders(false)
      await checkPendingStockOrders()
    } catch (error) {
      toast.dismiss(loadingToast)
      console.error("Error updating order status:", error)
      toast.error(error instanceof Error ? error.message : "Failed to update order status")
    }
  }

  // Handle delete order
  const handleDeleteOrder = async (orderId: string) => {
    if (!isAdmin) {
      toast.error("Only administrators can delete orders")
      return
    }
    try {
      const response = await fetch(`/api/order?id=${orderId}&reason=Admin deletion from UI`, { 
        method: "DELETE" 
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Failed to delete order")
      toast.success(data.message || "Order deleted successfully")
      fetchOrders(false)
      checkPendingStockOrders()
    } catch (error) {
      console.error("Error deleting order:", error)
      toast.error("Failed to delete order")
    }
  }

  // Handle mark for deletion
  const handleMarkForDeletion = useCallback(
    async (orderId: string, reason: string) => {
      try {
        const response = await fetch(`/api/order`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId,
            action: "mark-for-deletion",
            reason,
            requestedBy: session?.user?.name || session?.user?.email || "Unknown User",
            requestedAt: new Date().toISOString(),
          }),
        })
        if (!response.ok) throw new Error("Failed to mark order for deletion")
        toast.success("Order has been marked for deletion")
        fetchOrders(false)
      } catch (error) {
        console.error("Error marking order for deletion:", error)
        toast.error("Failed to mark order for deletion")
      }
    },
    [fetchOrders, session]
  )

  // Handle toggle item uneditable
  const handleToggleItemUneditable = useCallback(
    async (orderId: string, itemIndex: number, isUneditable: boolean) => {
      try {
        const response = await fetch(`/api/order`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId,
            action: "toggle-item-uneditable",
            itemIndex,
            isUneditable,
            uneditableBy: session?.user?.name || session?.user?.email || "Unknown",
          }),
        })

        const data = await response.json()
        if (!response.ok) throw new Error("Failed to update item status")

        toast.success(data.message || `Item marked as ${isUneditable ? "uneditable" : "editable"}`)

        setOrders((prevOrders) =>
          prevOrders.map((order) => {
            if (order._id === orderId) {
              const items = order.orderItems || order.items || []
              const updatedItems = [...items]
              if (updatedItems[itemIndex]) {
                updatedItems[itemIndex] = {
                  ...updatedItems[itemIndex],
                  isUneditable,
                  uneditableAt: isUneditable ? new Date().toISOString() : undefined,
                  uneditableBy: isUneditable ? session?.user?.name || session?.user?.email : undefined,
                }
              }
              return { ...order, items: updatedItems, orderItems: updatedItems }
            }
            return order
          })
        )
        setTimeout(() => fetchOrders(false), 500)
      } catch (error) {
        console.error("Error toggling item uneditable status:", error)
        toast.error(error instanceof Error ? error.message : "Failed to update item status")
      }
    },
    [fetchOrders, session]
  )

  // Handle retry stock for specific order
  const handleRetryStockForOrder = useCallback(
    async (orderId: string) => {
      try {
        const response = await fetch('/api/cron/process-stock', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId })
        })
        const result = await response.json()
        if (result.success) {
          toast.success(`Retried stock processing for order`)
          fetchOrders(false)
          checkPendingStockOrders()
        } else {
          throw new Error(result.error || 'Retry failed')
        }
      } catch (error) {
        console.error('Error retrying stock:', error)
        toast.error('Failed to retry stock processing')
      }
    },
    [fetchOrders, checkPendingStockOrders]
  )

  // Filtered and sorted orders
  const filteredAndSortedOrders = useMemo(() => {
    let filtered = orders.filter((order) => {
      if (order.deletedAt) return false

      const matchesSearch =
        order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.tableNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (order.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) || false)

      const matchesStatus = !statusFilter || order.status === statusFilter
      const matchesWaitress = !waitressFilter || order.waiterId === waitressFilter
      const matchesDate = !dateFilter || new Date(order.createdAt).toDateString() === dateFilter.toDateString()
      const matchesType = !orderTypeFilter ||
        (orderTypeFilter === "intable" && order.inTable === true) ||
        (orderTypeFilter === "delivery" && order.delivery === true) ||
        (orderTypeFilter === "pos" && !order.inTable && !order.delivery)
      const matchesMarked = !showMarkedOnly || order.markedForDeletion === true

      let matchesStockStatus = true
      if (stockStatusFilter !== "ALL") {
        if (stockStatusFilter === "PROCESSED") {
          matchesStockStatus = order.stockProcessed === true
        } else if (stockStatusFilter === "PENDING") {
          matchesStockStatus = order.status === "COMPLETED" && !order.stockProcessed && !order.stockProcessingError
        } else if (stockStatusFilter === "FAILED") {
          matchesStockStatus = !order.stockProcessed && !!order.stockProcessingError
        }
      }

      let matchesRestaurant = true
      if (restaurantFilter) {
        const orderRestaurantId = getOrderRestaurantId(order)
        const restaurant = getRestaurantById(restaurants, orderRestaurantId || undefined)
        matchesRestaurant = restaurant?._id === restaurantFilter || 
                           order.restaurantName === restaurantFilter ||
                           orderRestaurantId === restaurantFilter
      }

      return matchesSearch && matchesStatus && matchesWaitress && matchesDate && 
             matchesType && matchesRestaurant && matchesMarked && matchesStockStatus
    })

    filtered.sort((a, b) => {
      const aValue = a[sortField]
      const bValue = b[sortField]
      if (aValue === bValue) return 0
      if (aValue === undefined || aValue === null) return 1
      if (bValue === undefined || bValue === null) return -1
      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1
      return 0
    })

    return filtered
  }, [orders, searchTerm, statusFilter, stockStatusFilter, waitressFilter, restaurantFilter, 
      dateFilter, orderTypeFilter, sortField, sortDirection, showMarkedOnly, restaurants])

  const totalPages = Math.ceil(filteredAndSortedOrders.length / itemsPerPage)

  useEffect(() => {
    setCurrentPage(1)
  }, [filteredAndSortedOrders.length])

  const paginatedOrders = useMemo(() => {
    return filteredAndSortedOrders.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
  }, [filteredAndSortedOrders, currentPage, itemsPerPage])

  const handleClearFilters = useCallback(() => {
    setSearchTerm("")
    setStatusFilter(null)
    setStockStatusFilter("ALL")
    setWaitressFilter(null)
    setRestaurantFilter(null)
    setOrderTypeFilter(null)
    setDateFilter(null)
    setShowMarkedOnly(false)
  }, [])

  // Initialize
  useEffect(() => {
    isMountedRef.current = true
    const initialize = async () => {
      await Promise.all([fetchOrders(true), fetchWaitresses(), loadRestaurants()])
      pollingIntervalRef.current = setInterval(() => {
        pollNewOrders()
      }, 30000)
    }
    initialize()
    return () => {
      isMountedRef.current = false
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
      }
    }
  }, [fetchOrders, fetchWaitresses, loadRestaurants, pollNewOrders])

  if (!session) {
    return (
      <div className="container mx-auto p-4 flex items-center justify-center min-h-screen">
        <div className="max-w-md w-full text-center p-8 border rounded-lg">
          <Shield className="h-16 w-16 mx-auto mb-4 text-purple-900" />
          <h2 className="text-2xl font-bold mb-2">Authentication Required</h2>
          <p className="text-muted-foreground mb-4">Please login to access order management.</p>
          <Button onClick={() => (window.location.href = "/login")}>Go to Login</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <style jsx global>{notificationStyles}</style>
      <Toaster position="top-right" />
      
      <AnimatePresence>
        {showNotification && (
          <NotificationToast
            title={notificationData.title}
            message={notificationData.message}
            onClose={() => setShowNotification(false)}
          />
        )}
      </AnimatePresence>

      {/* Sound initialization alert */}
      {showEnableSoundButton && !soundInitialized && (
        <Alert className="bg-yellow-50 border-yellow-200">
          <Volume2 className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800 flex items-center justify-between">
            <span>Click anywhere or use the button below to enable sound notifications</span>
            <Button onClick={initializeSound} size="sm" className="bg-yellow-600 hover:bg-yellow-700">
              Enable Sound
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Info Alerts */}
      {isAdmin && filterInfo && filterInfo.timeFilterHours === 24 && (
        <Alert className="bg-blue-50 border-blue-200">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            Admin Mode: Showing orders from the last 24 hours. {filterInfo.message}
          </AlertDescription>
        </Alert>
      )}

      {!isAdmin && filterInfo && (
        <Alert className="bg-gray-50 border-gray-200">
          <Clock className="h-4 w-4 text-gray-600" />
          <AlertDescription className="text-gray-800">
            Showing active orders + completed orders from last 2 hours.
          </AlertDescription>
        </Alert>
      )}

      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold">Order Management</h1>
          <div className="flex items-center gap-1">
            <SoundToggleButton isEnabled={soundEnabled} onToggle={() => setSoundEnabled(!soundEnabled)} />
            <SoundControlDialog
              isEnabled={soundEnabled}
              onToggle={() => setSoundEnabled(!soundEnabled)}
              volume={volume}
              onVolumeChange={setVolume}
              onTestSound={playNotificationSound}
            />
          </div>
          <Badge variant="outline" className={isAdmin ? "bg-red-100 text-red-800" : "bg-blue-100 text-blue-800"}>
            {isAdmin ? <><ShieldAlert className="h-3 w-3 mr-1" />Admin</> : <><Shield className="h-3 w-3 mr-1" />{userRole || "Staff"}</>}
          </Badge>
          {soundInitialized && <Badge variant="outline" className="bg-green-100 text-green-800">Sound Ready</Badge>}
        </div>

        <div className="flex items-center gap-2">
          {!soundInitialized && (
            <Button onClick={initializeSound} variant="default" size="sm" className="bg-yellow-600">
              <Volume2 className="h-4 w-4 mr-2" />Enable Sound
            </Button>
          )}
          {pendingStockCount > 0 && (
            <Button onClick={() => setShowConfirmDialog(true)} className="bg-green-600 hover:bg-green-700 text-white gap-2">
              <Package className="h-4 w-4" />Process Stock ({pendingStockCount})
              {failedStockCount > 0 && <Badge className="ml-1 bg-red-500 text-white text-xs">{failedStockCount} failed</Badge>}
            </Button>
          )}
          <Button onClick={() => fetchOrders(true)} variant="outline" size="icon" disabled={loading}>
            <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <FilterBar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        stockStatusFilter={stockStatusFilter}
        onStockStatusFilterChange={setStockStatusFilter}
        restaurantFilter={restaurantFilter}
        onRestaurantFilterChange={setRestaurantFilter}
        orderTypeFilter={orderTypeFilter}
        onOrderTypeFilterChange={setOrderTypeFilter}
        waitressFilter={waitressFilter}
        onWaitressFilterChange={setWaitressFilter}
        dateFilter={dateFilter}
        onDateFilterChange={setDateFilter}
        showMarkedOnly={showMarkedOnly}
        onShowMarkedOnlyChange={setShowMarkedOnly}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onClearFilters={handleClearFilters}
        onRefresh={() => fetchOrders(true)}
        isLoading={loading}
        waitresses={waitresses}
        restaurants={restaurants}
        loadingRestaurants={loadingRestaurants}
      />

      {/* Orders Display */}
      {loading && orders.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="border rounded-lg p-4">
              <Skeleton className="h-6 w-3/4 mb-4" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-3/4 mb-2" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      ) : viewMode === "list" ? (
        <div className="border rounded-lg overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted">
              <tr><th className="p-3 text-left">Order #</th><th className="p-3 text-left">Restaurant</th>
              <th className="p-3 text-left">Type</th><th className="p-3 text-left">Stock Status</th>
              <th className="p-3 text-left">Customer</th><th className="p-3 text-left">Waitress</th>
              <th className="p-3 text-left">Table</th><th className="p-3 text-left">Status</th>
              <th className="p-3 text-left">Total</th><th className="p-3 text-left">Date</th>
              <th className="p-3 text-right">Actions</th></tr></thead>
            <tbody>
              {paginatedOrders.map((order) => (
                <tr key={order._id} className="border-t">
                  <td className="p-3 font-medium">{order.orderNumber}</td>
                  <td className="p-3"><Badge variant="outline">{restaurants.find(r => r._id === order.restaurantId)?.name || order.restaurantName || "Unknown"}</Badge></td>
                  <td className="p-3">{order.inTable ? "In-Table" : order.delivery ? "Delivery" : "POS"}</td>
                  <td className="p-3"><StockStatusBadge order={order} /></td>
                  <td className="p-3">{order.customerName || "Walk-in"}</td>
                  <td className="p-3">{waitresses.find(w => w._id === order.waiterId)?.name || order.waiterName || "Unknown"}</td>
                  <td className="p-3">{order.tableNumber}</td>
                  <td className="p-3"><Badge variant="outline">{order.status}</Badge></td>
                  <td className="p-3">{order.finalAmount.toLocaleString("en-ET", { style: "currency", currency: "ETB" })}</td>
                  <td className="p-3">{new Date(order.createdAt).toLocaleDateString()}</td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <OrderDetailModal
                        order={order}
                        waitresses={waitresses}
                        restaurants={restaurants}
                        isAdmin={isAdmin}
                        onToggleItemUneditable={handleToggleItemUneditable}
                        StockStatusBadge={StockStatusBadge}
                        onStopSound={stopNotificationSound}
                      />
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {isAdmin ? (
                            <div className="text-red-600 px-2 py-1.5 text-sm cursor-pointer" onClick={() => handleDeleteOrder(order._id)}>
                              <Trash2 className="mr-2 h-4 w-4 inline" />Delete Order
                            </div>
                          ) : (
                            <div className="text-yellow-600 px-2 py-1.5 text-sm cursor-pointer" onClick={() => {
                              const reason = prompt("Please provide a reason:")
                              if (reason) handleMarkForDeletion(order._id, reason)
                            }}>
                              <Flag className="mr-2 h-4 w-4 inline" />Mark for Deletion
                            </div>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuLabel>Change Status</DropdownMenuLabel>
                          {["PENDING","CONFIRMED","PREPARING","PICKUP","SERVED","COMPLETED","CANCELLED"].map((status) => (
                            <DropdownMenuItem key={status} onClick={() => handleStatusUpdate(order._id, status as OrderStatus)}>
                              {status}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {paginatedOrders.map((order) => (
            <OrderCard
              key={order._id}
              order={order}
              waitresses={waitresses}
              restaurants={restaurants}
              isAdmin={isAdmin}
              currentUser={currentUser}
              onDelete={handleDeleteOrder}
              onMarkForDeletion={handleMarkForDeletion}
              onStatusUpdate={handleStatusUpdate}
              onToggleItemUneditable={handleToggleItemUneditable}
              onRetryStock={handleRetryStockForOrder}
              StockStatusBadge={StockStatusBadge}
              onStopSound={stopNotificationSound}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem><PaginationPrevious onClick={() => setCurrentPage(p => Math.max(1, p-1))} className={currentPage === 1 ? "opacity-50" : "cursor-pointer"} /></PaginationItem>
            {[...Array(Math.min(totalPages, 5))].map((_, i) => {
              let pageNum = totalPages <= 5 ? i+1 : currentPage <= 3 ? i+1 : currentPage >= totalPages-2 ? totalPages-4+i : currentPage-2+i
              return <PaginationItem key={pageNum}><PaginationLink onClick={() => setCurrentPage(pageNum)} isActive={currentPage === pageNum}>{pageNum}</PaginationLink></PaginationItem>
            })}
            <PaginationItem><PaginationNext onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))} className={currentPage === totalPages ? "opacity-50" : "cursor-pointer"} /></PaginationItem>
          </PaginationContent>
        </Pagination>
      )}

      <StockConfirmDialog />
    </div>
  )
}