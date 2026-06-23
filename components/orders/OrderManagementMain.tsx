"use client"

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { useSession } from "next-auth/react"
import { toast, Toaster } from "react-hot-toast"
import axios from "axios"
import { format } from "date-fns"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
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
  CheckCircle,
  XCircle,
  Home,
  ShoppingBag,
  Building2,
  Loader2,
  AlertCircle,
  Truck,
  Lock,
  Filter,
} from "lucide-react"
import type { Order, Waitress, Restaurant, OrderStatus } from "@/types/order"

import { FilterBar } from "./FilterBar"
import { OrderCard } from "./OrderCard"
import { OrderDetailModal } from "./OrderDetailModal"
import { useNotificationSound } from "@/hooks/useNotificationSound"
import { SoundToggleButton, SoundControlDialog } from "./SoundControls"
import { NotificationToast, notificationStyles } from "./NotificationToast"
import { TableCell, TableRow } from "../ui/table"
import { AnimatePresence } from "framer-motion"

// Configure axios instance - NO TIMEOUT LIMITS
const api = axios.create({
  baseURL: '/api',
  timeout: 0,
  headers: { 'Content-Type': 'application/json' }
})

// Add retry interceptor for 5xx server errors and network errors
api.interceptors.response.use(undefined, async (err) => {
  const config = err.config
  const isServerError = err.response && err.response.status >= 500 && err.response.status <= 504
  const isNetworkError = !err.response
  
  if (!config || config.retry === false || (!isServerError && !isNetworkError)) {
    return Promise.reject(err)
  }
  
  config.retryCount = config.retryCount || 0
  
  if (config.retryCount >= 3) {
    console.error(`Max retries reached for ${config.url}`)
    return Promise.reject(err)
  }
  
  config.retryCount += 1
  
  const delayTime = 1000 * Math.pow(2, config.retryCount - 1)
  console.log(`Retrying ${config.url} (attempt ${config.retryCount}) in ${delayTime}ms...`)
  
  await new Promise(resolve => setTimeout(resolve, delayTime))
  return api(config)
})

// Helper functions
const isAdminUser = (role: string | undefined): boolean => {
  if (!role) return false
  const adminRoles = ["ADMIN", "admin", "Admin", "SUPER_ADMIN"]
  return adminRoles.includes(role)
}

const isOrderEdited = (order: Order): boolean => {
  return !!(order.orderItems && order.orderItems.length > 0)
}

// Fetch restaurants - NO TIMEOUT
const fetchRestaurants = async (): Promise<Restaurant[]> => {
  try {
    const response = await api.get('/restaurants')
    if (response.data.success && Array.isArray(response.data.data)) {
      return response.data.data.filter((r: Restaurant) => r.isActive !== false)
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

export default function OrderManagementMain() {
  const { data: session } = useSession()
  
  // State
  const [orders, setOrders] = useState<Order[]>([])
  const [waitresses, setWaitresses] = useState<Waitress[]>([])
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingRestaurants, setLoadingRestaurants] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<OrderStatus | null>(null)
  const [waitressFilter, setWaitressFilter] = useState<string | null>(null)
  const [restaurantFilter, setRestaurantFilter] = useState<string | null>(null)
  const [orderTypeFilter, setOrderTypeFilter] = useState<string | null>(null)
  const [dateFilter, setDateFilter] = useState<Date | null>(null)
  const [sortField, setSortField] = useState<keyof Order>("createdAt")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [viewMode, setViewMode] = useState<"list" | "grid">("grid")
  const [showMarkedOnly, setShowMarkedOnly] = useState(false)
  const [filterInfo, setFilterInfo] = useState<{
    isAdmin: boolean
    timeFilterHours: number | null
    message: string
    showCompletedLimit?: number
  } | null>(null)
  
  // Stock processing states
  const [pendingStockCount, setPendingStockCount] = useState<number>(0)
  const [failedStockCount, setFailedStockCount] = useState<number>(0)
  const [failedOrdersList, setFailedOrdersList] = useState<Order[]>([])
  const [pendingOrdersList, setPendingOrdersList] = useState<Order[]>([])
  const [processingStock, setProcessingStock] = useState<boolean>(false)
  const [stockError, setStockError] = useState<string | null>(null)
  const [showConfirmDialog, setShowConfirmDialog] = useState<boolean>(false)
  const [showFailedDetails, setShowFailedDetails] = useState<boolean>(false)
  const [stockStatusFilter, setStockStatusFilter] = useState<string>("ALL") // ALL, PENDING, FAILED, PROCESSED
  
  // Sound states
  const [showNotification, setShowNotification] = useState(false)
  const [notificationData, setNotificationData] = useState({ title: "", message: "" })
  const [soundInitialized, setSoundInitialized] = useState(false)
  const [showEnableSoundButton, setShowEnableSoundButton] = useState(false)
  const [lastSoundPlayTime, setLastSoundPlayTime] = useState<number>(0)
  
  const itemsPerPage = 12
  const userRole = session?.user?.role
  const isAdmin = isAdminUser(userRole)
  const currentUser = session?.user
    ? { name: session.user.name, email: session.user.email }
    : null

  // Refs for polling
  const lastOrderIdsRef = useRef<Set<string>>(new Set())
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastFetchTimeRef = useRef<string>(new Date().toISOString())
  const isMountedRef = useRef<boolean>(true)
  const soundQueueRef = useRef<number[]>([])

  // Sound hook
  const {
    play: playNotificationSound,
    isEnabled: soundEnabled,
    setIsEnabled: setSoundEnabled,
  } = useNotificationSound()

  // Enhanced sound play function with debouncing and queue handling
  const safePlaySound = useCallback(async () => {
    if (!soundEnabled || !soundInitialized) {
      return false
    }
    
    // Debounce: Don't play more than once every 2 seconds
    const now = Date.now()
    if (now - lastSoundPlayTime < 2000) {
      soundQueueRef.current.push(now)
      setTimeout(() => {
        if (soundQueueRef.current.length > 0 && isMountedRef.current) {
          soundQueueRef.current = []
          safePlaySound()
        }
      }, 2000 - (now - lastSoundPlayTime))
      return false
    }
    
    try {
      await playNotificationSound()
      setLastSoundPlayTime(now)
      return true
    } catch (error) {
      console.error("Sound play error:", error)
      return false
    }
  }, [playNotificationSound, soundEnabled, soundInitialized, lastSoundPlayTime])

  // ========== FETCH ORDERS ==========
  const fetchOrders = useCallback(
    async (showLoading = true) => {
      if (showLoading) setLoading(true)
      
      try {
        const url = isAdmin ? "/order?all=true" : "/order"
        const response = await api.get(url)
        
        const data = response.data

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
          setTotalPages(Math.ceil(ordersWithFlags.length / itemsPerPage))
          
          const newOrderIds = new Set<string>(ordersWithFlags.map((order: Order) => order._id))
          lastOrderIdsRef.current = newOrderIds
          lastFetchTimeRef.current = new Date().toISOString()
        }
      } catch (error: any) {
        console.error("Error fetching orders:", error)
        if (showLoading && isMountedRef.current) {
          if (error.response?.status === 500) {
            toast.error("Server error. Please try again in a moment.")
          } else {
            toast.error("Failed to fetch orders")
          }
        }
      } finally {
        if (showLoading && isMountedRef.current) setLoading(false)
      }
    },
    [isAdmin, itemsPerPage]
  )

  // ========== CHECK PENDING STOCK ORDERS ==========
  const checkPendingStockOrders = useCallback(async () => {
    try {
      const response = await api.get('/order?all=true&status=COMPLETED')
      
      const completedOrders = response.data.orders || []
      
      // Filter completed orders that need stock processing
      const pending = completedOrders.filter(
        (order: Order) => 
          order.status === "COMPLETED" && 
          !order.stockProcessed && 
          !order.stockProcessingError
      )
      
      const failed = completedOrders.filter(
        (order: Order) => 
          order.status === "COMPLETED" && 
          !order.stockProcessed && 
          order.stockProcessingError
      )
      
      const processed = completedOrders.filter(
        (order: Order) => 
          order.status === "COMPLETED" && 
          order.stockProcessed === true
      )
      
      if (isMountedRef.current) {
        setPendingStockCount(pending.length)
        setFailedStockCount(failed.length)
        setPendingOrdersList(pending)
        setFailedOrdersList(failed)
        
        // Log stock status for debugging
        console.log('📊 Stock Status Summary:', {
          totalCompleted: completedOrders.length,
          pending: pending.length,
          failed: failed.length,
          processed: processed.length
        })
        
        if (pending.length === 0 && failed.length === 0) {
          setStockError(null)
        }
      }
    } catch (error: any) {
      console.error('Error checking pending stock:', error)
      if (isMountedRef.current) {
        setStockError('Failed to check')
      }
    }
  }, [])

  // ========== HANDLE PROCESS STOCK - FIXED ==========
  const handleProcessStock = useCallback(async () => {
    setProcessingStock(true)
    setStockError(null)
    
    const loadingToast = toast.loading('Processing stock...')
    
    try {
      const response = await api.get('/cron/process-stock')
      const result = response.data
      
      toast.dismiss(loadingToast)
      
      if (result.success) {
        const processed = result.processedOrders || 0
        const failed = result.failedOrders || 0
        const lowStockItems = result.lowStockItems || []
        const errors = result.errors || []
        
        // Show success message
        if (processed > 0) {
          toast.success(`✅ Successfully processed ${processed} orders!`)
          await safePlaySound()
        }
        
        // Show failed orders - SAFELY HANDLED
        if (failed > 0) {
          toast.error(`⚠️ ${failed} orders failed to process`, { duration: 8000 })
          
          if (errors && errors.length > 0) {
            // Safely log errors without breaking
            try {
              const errorDetails = errors.map((err: any) => ({
                orderNumber: err.orderNumber || 'Unknown',
                error: err.error || 'Unknown error'
              }))
              console.warn('Failed orders details:', errorDetails)
            } catch (logError) {
              console.warn('Failed orders details (raw):', errors)
            }
            
            // Show detailed error in a separate toast - limit to 3 to avoid spam
            const errorLimit = Math.min(errors.length, 3)
            for (let i = 0; i < errorLimit; i++) {
              try {
                const err = errors[i]
                const orderNumber = err.orderNumber || 'Unknown'
                const errorMsg = err.error || 'Unknown error'
                toast.error(`Order ${orderNumber}: ${errorMsg}`, { duration: 5000 })
              } catch (toastError) {
                // If individual toast fails, continue
                console.warn('Failed to show toast for error:', toastError)
              }
            }
            
            // If there are more than 3 errors, show a summary
            if (errors.length > 3) {
              toast.error(`Plus ${errors.length - 3} more orders failed`, { 
                duration: 5000,
                icon: '⚠️'
              })
            }
          }
          
          // Update failed orders list
          if (result.failedOrdersList) {
            setFailedOrdersList(result.failedOrdersList)
            setFailedStockCount(result.failedOrdersList.length)
          }
        }
        
        // Show low stock warnings
        if (lowStockItems && lowStockItems.length > 0) {
          toast.error(`⚠️ Low stock detected for ${lowStockItems.length} items`, { 
            duration: 8000,
            icon: '⚠️'
          })
          console.warn('Low stock items:', lowStockItems)
        }
        
        if (processed === 0 && failed === 0) {
          toast.success('No pending orders to process', { icon: 'ℹ️' })
        }
        
        // Refresh data after processing
        setTimeout(() => {
          checkPendingStockOrders()
          fetchOrders(false)
        }, 2000)
      } else {
        throw new Error(result.error || 'Processing failed')
      }
    } catch (error: any) {
      toast.dismiss(loadingToast)
      console.error('Error processing stock:', error)
      
      // Safe error message display
      let errorMessage = 'Failed to process stock. Please try again.'
      if (error.response?.status === 500) {
        errorMessage = 'Server connection issue. Please try again in a moment.'
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error
      } else if (error.message) {
        errorMessage = error.message
      }
      
      toast.error(errorMessage)
      setStockError(errorMessage)
    } finally {
      setProcessingStock(false)
      setShowConfirmDialog(false)
    }
  }, [checkPendingStockOrders, fetchOrders, safePlaySound])

  // ========== INITIALIZE SOUND ==========
  const initializeSound = useCallback(async () => {
    if (!soundInitialized && soundEnabled) {
      try {
        await playNotificationSound()
        setSoundInitialized(true)
        setShowEnableSoundButton(false)
        toast.success("🔊 Sound enabled! You will now hear notifications for new orders.", {
          icon: "🔔",
          duration: 3000,
        })
      } catch (error) {
        console.error("Failed to initialize sound:", error)
        setShowEnableSoundButton(true)
        setSoundInitialized(false)
      }
    }
  }, [playNotificationSound, soundInitialized, soundEnabled])

  // Auto-initialize sound on first user interaction
  useEffect(() => {
    const handleFirstInteraction = () => {
      if (!soundInitialized && soundEnabled) {
        initializeSound()
      }
      document.removeEventListener('click', handleFirstInteraction)
      document.removeEventListener('keydown', handleFirstInteraction)
      document.removeEventListener('touchstart', handleFirstInteraction)
    }
    
    document.addEventListener('click', handleFirstInteraction)
    document.addEventListener('keydown', handleFirstInteraction)
    document.addEventListener('touchstart', handleFirstInteraction)
    
    const timer = setTimeout(() => {
      if (!soundInitialized && isMountedRef.current && soundEnabled) {
        setShowEnableSoundButton(true)
      }
    }, 3000)
    
    return () => {
      document.removeEventListener('click', handleFirstInteraction)
      document.removeEventListener('keydown', handleFirstInteraction)
      document.removeEventListener('touchstart', handleFirstInteraction)
      clearTimeout(timer)
    }
  }, [soundInitialized, initializeSound, soundEnabled])

  // Auto-refresh pending stock count every 30 seconds
  useEffect(() => {
    checkPendingStockOrders()
    const interval = setInterval(() => {
      checkPendingStockOrders()
    }, 30000)
    return () => clearInterval(interval)
  }, [checkPendingStockOrders])

  // ========== FETCH WAITRESSES ==========
  const fetchWaitresses = useCallback(async () => {
    try {
      const response = await api.get('/waitress')
      
      if (isMountedRef.current) {
        setWaitresses(response.data || [])
      }
    } catch (error: any) {
      console.error("Error fetching waitresses:", error)
      if (isMountedRef.current) {
        setWaitresses([])
      }
    }
  }, [])

  // ========== LOAD RESTAURANTS ==========
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

  // ========== POLL NEW ORDERS ==========
  const pollNewOrders = useCallback(async () => {
    if (!isMountedRef.current) return
    
    try {
      const url = isAdmin
        ? `/order?all=true&after=${lastFetchTimeRef.current}`
        : `/order?after=${lastFetchTimeRef.current}`
      const response = await api.get(url)
      
      const newOrders = (response.data.orders || []).map((order: Order) => ({
        ...order,
        isEdited: isOrderEdited(order),
        markedForDeletion: order.markedForDeletion || false,
      }))

      if (newOrders.length > 0 && isMountedRef.current) {
        const trulyNewOrders = newOrders.filter(
          (order: Order) => !lastOrderIdsRef.current.has(order._id)
        )
        
        if (trulyNewOrders.length > 0) {
          // Play sound for new orders
          const playSoundWithRetry = async (retries = 2) => {
            if (soundEnabled) {
              try {
                if (!soundInitialized) {
                  await initializeSound()
                }
                await safePlaySound()
              } catch (error) {
                console.error("Failed to play notification sound:", error)
                if (retries > 0) {
                  setTimeout(() => playSoundWithRetry(retries - 1), 500)
                }
              }
            }
          }
          
          playSoundWithRetry()
          
          // Show notifications for new orders
          trulyNewOrders.slice(0, 3).forEach((order: Order, index: number) => {
            const orderType = order.inTable ? "In-Table" : order.delivery ? "Delivery" : "POS"
            const message = `New ${orderType} order #${order.orderNumber} from ${order.customerName || "Walk-in"}`
            
            toast.success(message, {
              duration: 5000,
              icon: "🔔",
            })
            
            if (index === 0) {
              setNotificationData({
                title: "New Order Arrived! 🎉",
                message: `${orderType} order #${order.orderNumber}\nTotal: ${order.finalAmount.toLocaleString("en-ET", { style: "currency", currency: "ETB" })}`
              })
              setShowNotification(true)
              setTimeout(() => setShowNotification(false), 5000)
            }
          })
          
          setOrders(prev => {
            const updatedOrders = [...trulyNewOrders, ...prev]
            trulyNewOrders.forEach((order: Order) => {
              lastOrderIdsRef.current.add(order._id)
            })
            return updatedOrders
          })
          
          lastFetchTimeRef.current = new Date().toISOString()
          await checkPendingStockOrders()
        }
      }
    } catch (error: any) {
      console.error("Error polling new orders:", error)
    }
  }, [isAdmin, soundEnabled, soundInitialized, safePlaySound, checkPendingStockOrders, initializeSound])

  // ========== HANDLE STATUS UPDATE ==========
  const handleStatusUpdate = async (orderId: string, newStatus: OrderStatus) => {
    const loadingToast = toast.loading(`Updating order status to ${newStatus}...`)
    
    try {
      const response = await api.patch('/order', { orderId, status: newStatus })
      const data = response.data
      
      toast.dismiss(loadingToast)
      toast.success(data.message || "Order status updated successfully")
      
      if (newStatus === "COMPLETED" && data.completedBy) {
        toast.success(`Order completed by ${data.completedBy.name}`, { duration: 3000 })
        await safePlaySound()
      }
      
      setOrders(prev => prev.map((o: Order) => o._id === orderId ? { ...o, status: newStatus } : o))
      
      await fetchOrders(false)
      await checkPendingStockOrders()
    } catch (error: any) {
      toast.dismiss(loadingToast)
      console.error("Error updating order status:", error)
      if (error.response?.status === 500) {
        toast.error("Server error. Please try again.")
      } else {
        toast.error("Failed to update order status")
      }
    }
  }

  // ========== HANDLE DELETE ORDER ==========
  const handleDeleteOrder = async (orderId: string) => {
    if (!isAdmin) {
      toast.error("Only administrators can delete orders")
      return
    }
    
    const loadingToast = toast.loading("Deleting order...")
    
    try {
      await api.delete(`/order?id=${orderId}&reason=Admin deletion from UI`)
      toast.dismiss(loadingToast)
      toast.success("Order deleted successfully")
      
      setOrders(prev => prev.filter(o => o._id !== orderId))
      lastOrderIdsRef.current.delete(orderId)
      
      await fetchOrders(false)
      await checkPendingStockOrders()
    } catch (error: any) {
      toast.dismiss(loadingToast)
      console.error("Error deleting order:", error)
      if (error.response?.status === 500) {
        toast.error("Server error. Please try again.")
      } else {
        toast.error("Failed to delete order")
      }
    }
  }

  // ========== HANDLE MARK FOR DELETION ==========
  const handleMarkForDeletion = useCallback(
    async (orderId: string, reason: string) => {
      const loadingToast = toast.loading("Marking order for deletion...")
      
      try {
        await api.patch('/order', {
          orderId,
          action: "mark-for-deletion",
          reason,
          requestedBy: session?.user?.name || session?.user?.email || "Unknown User",
          requestedAt: new Date().toISOString(),
        })
        
        toast.dismiss(loadingToast)
        toast.success("Order has been marked for deletion")
        
        setOrders(prev => prev.map(o => o._id === orderId ? { ...o, markedForDeletion: true, deletionRequestReason: reason } : o))
        
        await fetchOrders(false)
      } catch (error: any) {
        toast.dismiss(loadingToast)
        console.error("Error marking order for deletion:", error)
        toast.error("Failed to mark order for deletion")
      }
    },
    [fetchOrders, session]
  )

  // ========== HANDLE TOGGLE ITEM UNEDITABLE ==========
  const handleToggleItemUneditable = useCallback(
    async (orderId: string, itemIndex: number, isUneditable: boolean) => {
      try {
        const response = await api.patch('/order', {
          orderId,
          action: "toggle-item-uneditable",
          itemIndex,
          isUneditable,
          uneditableBy: session?.user?.name || session?.user?.email || "Unknown",
        })

        const data = response.data
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
                  uneditableBy: isUneditable
                    ? session?.user?.name || session?.user?.email
                    : undefined,
                }
              }
              return { ...order, items: updatedItems, orderItems: updatedItems }
            }
            return order
          })
        )

        setTimeout(() => fetchOrders(false), 500)
      } catch (error: any) {
        console.error("Error toggling item uneditable status:", error)
        toast.error(error instanceof Error ? error.message : "Failed to update item status")
      }
    },
    [fetchOrders, session]
  )

  // ========== HANDLE RETRY STOCK FOR ORDER ==========
  const handleRetryStockForOrder = useCallback(
    async (orderId: string) => {
      const loadingToast = toast.loading("Retrying stock processing...")
      
      try {
        const response = await api.post('/cron/process-stock', { orderId })
        const result = response.data
        
        toast.dismiss(loadingToast)
        
        if (result.success && result.processedOrders > 0) {
          toast.success(`✅ Stock processed successfully for order!`)
          await fetchOrders(false)
          await checkPendingStockOrders()
          await safePlaySound()
        } else if (result.success && result.processedOrders === 0) {
          toast.success(`No pending stock to process for this order`, { icon: 'ℹ️' })
        } else {
          throw new Error(result.error || 'Retry failed')
        }
      } catch (error: any) {
        toast.dismiss(loadingToast)
        console.error('Error retrying stock:', error)
        if (error.response?.status === 500) {
          toast.error("Server connection issue. Please try again.")
        } else {
          toast.error('Failed to retry stock processing')
        }
      }
    },
    [fetchOrders, checkPendingStockOrders, safePlaySound]
  )

  // ========== STOCK STATUS BADGE ==========
  const StockStatusBadge = ({ order }: { order: Order }) => {
    // Only show stock status for COMPLETED orders
    if (order.status !== "COMPLETED") {
      return null
    }
    
    if (order.stockProcessed === true) {
      return (
        <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
          <CheckCircle className="h-3 w-3 mr-1" />
          Stock Processed
        </Badge>
      )
    } else if (order.stockProcessingError) {
      return (
        <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200 cursor-help" title={order.stockProcessingError}>
          <XCircle className="h-3 w-3 mr-1" />
          Stock Failed
        </Badge>
      )
    } else {
      // Pending stock (completed but not processed and no error)
      return (
        <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">
          <Clock className="h-3 w-3 mr-1" />
          Pending Stock
        </Badge>
      )
    }
  }

  // ========== STOCK CONFIRM DIALOG ==========
  const StockConfirmDialogComponent = () => (
    <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
      <AlertDialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle>Process Stock for {pendingStockCount} Orders?</AlertDialogTitle>
          <AlertDialogDescription>
            This will deduct stock quantities for {pendingStockCount} completed order(s).
            This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        {failedStockCount > 0 && (
          <div className="mt-4 p-4 bg-red-50 rounded-lg border border-red-200">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-red-800 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                {failedStockCount} Order(s) Previously Failed
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFailedDetails(!showFailedDetails)}
                className="text-red-600 border-red-300 hover:bg-red-100"
              >
                {showFailedDetails ? "Hide Details" : "Show Details"}
              </Button>
            </div>
            
            {showFailedDetails && (
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {failedOrdersList.map((order) => (
                  <div key={order._id} className="bg-white rounded-lg p-3 border border-red-200">
                    <div className="flex justify-between items-start mb-2">
                      <p className="font-semibold text-red-800">Order #{order.orderNumber}</p>
                      <Badge variant="outline" className="bg-red-100 text-red-800">
                        Failed
                      </Badge>
                    </div>
                    <p className="text-sm text-red-700 mb-2">
                      <span className="font-medium">Error:</span> {order.stockProcessingError || 'Unknown error'}
                    </p>
                    {order.stockProcessingFailedAt && (
                      <p className="text-xs text-red-500">
                        Failed at: {new Date(order.stockProcessingFailedAt).toLocaleString()}
                      </p>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setShowConfirmDialog(false)
                        handleRetryStockForOrder(order._id)
                      }}
                      className="mt-2 text-red-600 border-red-300 hover:bg-red-50"
                    >
                      <RefreshCcw className="h-3 w-3 mr-1" />
                      Retry This Order
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        
        <AlertDialogFooter className="flex gap-2">
          <AlertDialogCancel onClick={() => setShowConfirmDialog(false)}>
            Cancel
          </AlertDialogCancel>
          {failedStockCount > 0 && (
            <Button
              onClick={() => {
                setShowConfirmDialog(false)
                failedOrdersList.forEach(order => handleRetryStockForOrder(order._id))
              }}
              disabled={processingStock}
              variant="outline"
              className="gap-2"
            >
              <RefreshCcw className={`h-4 w-4 ${processingStock ? "animate-spin" : ""}`} />
              Retry All Failed ({failedStockCount})
            </Button>
          )}
          <AlertDialogAction
            onClick={handleProcessStock}
            className="bg-green-600 hover:bg-green-700"
            disabled={processingStock || pendingStockCount === 0}
          >
            {processingStock ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              "Yes, Process Stock"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )

  // ========== FILTERED ORDERS ==========
  const filteredAndSortedOrders = useMemo(() => {
    let filtered = orders.filter((order) => {
      // Skip deleted orders
      if (order.deletedAt) return false

      // For non-admin users: Hide CANCELLED orders and limit completed orders to last 5
      if (!isAdmin) {
        // Hide cancelled orders
        if (order.status === "CANCELLED") {
          return false
        }

        // Limit completed orders to last 5
        if (order.status === "COMPLETED") {
          // Get all completed orders sorted by createdAt desc
          const completedOrders = orders
            .filter(o => o.status === "COMPLETED" && !o.deletedAt)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          
          // Only keep the 5 most recent completed orders
          const completedOrderIds = completedOrders.slice(0, 5).map(o => o._id)
          if (!completedOrderIds.includes(order._id)) {
            return false
          }
        }
      }

      // Stock status filter
      if (stockStatusFilter !== "ALL") {
        if (order.status !== "COMPLETED") {
          // If not completed, only show if filter is ALL
          if (stockStatusFilter !== "ALL") return false
        } else {
          // For completed orders, apply stock status filter
          const isProcessed = order.stockProcessed === true
          const isFailed = !!order.stockProcessingError
          const isPending = !isProcessed && !isFailed
          
          if (stockStatusFilter === "PROCESSED" && !isProcessed) return false
          if (stockStatusFilter === "FAILED" && !isFailed) return false
          if (stockStatusFilter === "PENDING" && !isPending) return false
        }
      }

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

      // Restaurant filtering logic
      let matchesRestaurant = true
      if (restaurantFilter && restaurantFilter !== "all" && restaurantFilter !== "All") {
        let orderRestaurantId = null
        
        if (order.restaurantId) {
          orderRestaurantId = order.restaurantId
        } 
        else if (order.restaurantName && restaurants.length > 0) {
          const matchingRestaurant = restaurants.find(r => 
            r.name === order.restaurantName || 
            order.restaurantName?.includes(r.name) ||
            r.name?.includes(order.restaurantName || "")
          )
          if (matchingRestaurant) {
            orderRestaurantId = matchingRestaurant._id
          }
        }
        else if (order.restaurantName?.includes("Manyazewal 1") || order.restaurantName === "Manyazewal Eshetu Gibi 1") {
          orderRestaurantId = "manyazewal1"
        }
        else if (order.restaurantName?.includes("Manyazewal 2") || order.restaurantName === "Manyazewal Eshetu Gibi 2") {
          orderRestaurantId = "manyazewal2"
        }
        
        matchesRestaurant = orderRestaurantId === restaurantFilter
        
        if (!matchesRestaurant && order.restaurantName) {
          const restaurant = restaurants.find(r => r._id === restaurantFilter)
          if (restaurant && order.restaurantName === restaurant.name) {
            matchesRestaurant = true
          }
        }
      }

      return matchesSearch && matchesStatus && matchesWaitress && matchesDate && 
             matchesType && matchesRestaurant && matchesMarked
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
  }, [orders, searchTerm, statusFilter, waitressFilter, restaurantFilter, dateFilter, 
      orderTypeFilter, sortField, sortDirection, showMarkedOnly, restaurants, isAdmin, stockStatusFilter])

  useEffect(() => {
    setTotalPages(Math.ceil(filteredAndSortedOrders.length / itemsPerPage))
    setCurrentPage(1)
  }, [filteredAndSortedOrders.length, itemsPerPage])

  const paginatedOrders = useMemo(() => {
    return filteredAndSortedOrders.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
    )
  }, [filteredAndSortedOrders, currentPage, itemsPerPage])

  const handleClearFilters = useCallback(() => {
    setSearchTerm("")
    setStatusFilter(null)
    setWaitressFilter(null)
    setRestaurantFilter(null)
    setOrderTypeFilter(null)
    setDateFilter(null)
    setShowMarkedOnly(false)
    setStockStatusFilter("ALL")
  }, [])

  // ========== INITIALIZE ==========
  useEffect(() => {
    isMountedRef.current = true
    
    const initialize = async () => {
      await Promise.allSettled([
        fetchOrders(true),
        loadRestaurants(),
        fetchWaitresses()
      ])
      
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

  // ========== STATUS OPTIONS ==========
  const statusOptions: OrderStatus[] = [
    "PENDING",
    "CONFIRMED",
    "PREPARING",
    "PICKUP",
    "SERVED",
    "COMPLETED",
    "CANCELLED",
  ]

  const statusIcons: Record<OrderStatus, React.ReactNode> = {
    PENDING: <Clock className="h-4 w-4" />,
    CONFIRMED: <span className="h-4 w-4">✓</span>,
    PREPARING: <span className="h-4 w-4">👨‍🍳</span>,
    PICKUP: <span className="h-4 w-4">🚚</span>,
    SERVED: <span className="h-4 w-4">☕</span>,
    COMPLETED: <CheckCircle className="h-4 w-4" />,
    CANCELLED: <XCircle className="h-4 w-4" />,
  }

  const statusColors: Record<OrderStatus, string> = {
    PENDING: "bg-yellow-100 text-yellow-800",
    CONFIRMED: "bg-blue-100 text-blue-800",
    PREPARING: "bg-purple-100 text-purple-800",
    PICKUP: "bg-indigo-100 text-indigo-800",
    SERVED: "bg-green-100 text-green-800",
    COMPLETED: "bg-teal-100 text-teal-800",
    CANCELLED: "bg-red-100 text-red-800",
  }

  const getOrderTypeDisplay = (order: Order) => {
    if (order.inTable === true) {
      return (
        <Badge variant="outline" className="bg-green-100 text-green-800">
          <Home className="h-3 w-3 mr-1" />
          In-Table
        </Badge>
      )
    } else if (order.delivery === true) {
      return (
        <Badge variant="outline" className="bg-blue-100 text-blue-800">
          <Truck className="h-3 w-3 mr-1" />
          Delivery
        </Badge>
      )
    } else {
      return (
        <Badge variant="outline" className="bg-purple-100 text-purple-800">
          <ShoppingBag className="h-3 w-3 mr-1" />
          POS
        </Badge>
      )
    }
  }

  const getRestaurantDisplay = (order: Order) => {
    const orderRestaurantId = getOrderRestaurantId(order)
    const restaurant = getRestaurantById(restaurants, orderRestaurantId || undefined)
    
    if (restaurant) {
      return (
        <Badge variant="outline" className="bg-indigo-100 text-indigo-800">
          <Building2 className="h-3 w-3 mr-1" />
          {restaurant.name}
        </Badge>
      )
    }
    
    if (order.restaurantName) {
      return (
        <Badge variant="outline" className="bg-gray-100 text-gray-800">
          <Building2 className="h-3 w-3 mr-1" />
          {order.restaurantName}
        </Badge>
      )
    }
    
    return (
      <Badge variant="outline" className="bg-gray-100 text-gray-800">
        <Building2 className="h-3 w-3 mr-1" />
        Unknown
      </Badge>
    )
  }

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

      {showEnableSoundButton && !soundInitialized && soundEnabled && (
        <Alert className="bg-yellow-50 border-yellow-200">
          <Volume2 className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800 flex items-center justify-between">
            <span>Click anywhere or use the button below to enable sound notifications for new orders</span>
            <Button onClick={initializeSound} size="sm" className="bg-yellow-600 hover:bg-yellow-700">
              Enable Sound
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {isAdmin && filterInfo && filterInfo.timeFilterHours === 24 && (
        <Alert className="bg-blue-50 border-blue-200">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            Admin Mode: Showing all orders from the last 24 hours including canceled and flagged orders.
            {filterInfo.message}
          </AlertDescription>
        </Alert>
      )}

      {!isAdmin && filterInfo && (
        <Alert className="bg-gray-50 border-gray-200">
          <Clock className="h-4 w-4 text-gray-600" />
          <AlertDescription className="text-gray-800">
            Showing active orders + last 5 completed orders. Cancelled orders are hidden.
          </AlertDescription>
        </Alert>
      )}

      {/* Stock Status Summary */}
      {(pendingStockCount > 0 || failedStockCount > 0) && (
        <Alert className="bg-yellow-50 border-yellow-200">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <Package className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800">
                <span className="font-semibold">Stock Status:</span>
                {pendingStockCount > 0 && (
                  <span className="ml-2">🟡 {pendingStockCount} pending</span>
                )}
                {failedStockCount > 0 && (
                  <span className="ml-2 text-red-600">🔴 {failedStockCount} failed</span>
                )}
              </AlertDescription>
            </div>
            <div className="flex gap-2">
              {pendingStockCount > 0 && (
                <Button
                  size="sm"
                  onClick={() => setShowConfirmDialog(true)}
                  className="bg-yellow-600 hover:bg-yellow-700 text-white"
                >
                  Process Pending
                </Button>
              )}
              {failedStockCount > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setStockStatusFilter(failedStockCount > 0 ? "FAILED" : "ALL")}
                  className="border-red-300 text-red-600 hover:bg-red-50"
                >
                  View Failed
                </Button>
              )}
            </div>
          </div>
        </Alert>
      )}

      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold">Order Management</h1>
          <div className="flex items-center gap-1">
            <SoundToggleButton isEnabled={soundEnabled} onToggle={() => setSoundEnabled(!soundEnabled)} />
          </div>
          <Badge variant="outline" className={isAdmin ? "bg-red-100 text-red-800" : "bg-blue-100 text-blue-800"}>
            {isAdmin ? <><ShieldAlert className="h-3 w-3 mr-1" />Admin</> : <><Shield className="h-3 w-3 mr-1" />{userRole || "Staff"}</>}
          </Badge>
          {soundInitialized && soundEnabled && <Badge variant="outline" className="bg-green-100 text-green-800">Sound Ready</Badge>}
        </div>

        <div className="flex items-center gap-2">
          {!soundInitialized && soundEnabled && (
            <Button onClick={initializeSound} variant="default" size="sm" className="bg-yellow-600">
              <Volume2 className="h-4 w-4 mr-2" />Enable Sound
            </Button>
          )}
          {(pendingStockCount > 0 || failedStockCount > 0) && (
            <Button
              onClick={() => setShowConfirmDialog(true)}
              disabled={processingStock}
              className="bg-green-600 hover:bg-green-700 text-white gap-2"
            >
              {processingStock ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Package className="h-4 w-4" />
                  Process Stock ({pendingStockCount})
                  {failedStockCount > 0 && (
                    <Badge className="ml-1 bg-red-500 text-white text-xs cursor-help" title={`${failedStockCount} orders failed to process`}>
                      {failedStockCount} failed
                    </Badge>
                  )}
                </>
              )}
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
        stockStatusFilter={stockStatusFilter as "ALL" | "PENDING" | "FAILED" | "PROCESSED"}
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
              <tr>
                <th className="p-3 text-left">Order #</th>
                <th className="p-3 text-left">Restaurant</th>
                <th className="p-3 text-left">Type</th>
                <th className="p-3 text-left">Stock Status</th>
                <th className="p-3 text-left">Customer</th>
                <th className="p-3 text-left">Waitress</th>
                <th className="p-3 text-left">Table</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3 text-left">Locked</th>
                <th className="p-3 text-left">Deletion Req</th>
                <th className="p-3 text-left">Total</th>
                <th className="p-3 text-left">Date</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedOrders.map((order) => {
                const waitress = waitresses.find((w) => w._id === order.waiterId)
                const displayItems = order.orderItems || order.items
                const lockedCount = displayItems.filter((item) => item.isUneditable).length

                return (
                  <TableRow key={order._id} className={order.markedForDeletion ? "bg-yellow-50/50" : ""}>
                    <TableCell className="font-medium">{order.orderNumber}</TableCell>
                    <TableCell>{getRestaurantDisplay(order)}</TableCell>
                    <TableCell>{getOrderTypeDisplay(order)}</TableCell>
                    <TableCell><StockStatusBadge order={order} /></TableCell>
                    <TableCell>{order.customerName || "Walk-in"}</TableCell>
                    <TableCell>{waitress?.name || order.waiterName || "Unknown"}</TableCell>
                    <TableCell>{order.tableNumber}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusColors[order.status]}>
                        {statusIcons[order.status]} {order.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {lockedCount > 0 ? (
                        <Badge variant="outline" className="bg-green-100 text-green-700">
                          <Lock className="h-3 w-3 mr-1" />
                          {lockedCount}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-gray-50 text-gray-400">0</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {order.markedForDeletion && order.deletionRequestReason ? (
                        <Badge variant="outline" className="bg-yellow-100 text-yellow-800 cursor-help" title={order.deletionRequestReason}>
                          <Flag className="h-3 w-3 mr-1" />Yes
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-gray-50 text-gray-400">No</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {order.finalAmount.toLocaleString("en-ET", { style: "currency", currency: "ETB" })}
                    </TableCell>
                    <TableCell>{new Date(order.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <OrderDetailModal
                          order={order}
                          waitresses={waitresses}
                          restaurants={restaurants}
                          isAdmin={isAdmin}
                          onToggleItemUneditable={handleToggleItemUneditable}
                          StockStatusBadge={StockStatusBadge}
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
                            {statusOptions.map((status) => (
                              <DropdownMenuItem key={status} onClick={() => handleStatusUpdate(order._id, status)}>
                                {statusIcons[status]}
                                <span className="ml-2">{status}</span>
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
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

      <StockConfirmDialogComponent />
    </div>
  )
}