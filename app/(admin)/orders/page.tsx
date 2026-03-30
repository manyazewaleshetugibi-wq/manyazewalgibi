"use client"

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { toast, Toaster } from "react-hot-toast"
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { Skeleton } from "@/components/ui/skeleton"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Slider } from "@/components/ui/slider"
import {
  CalendarIcon,
  MoreHorizontal,
  Grid,
  List,
  Search,
  RefreshCcw,
  Eye,
  Trash2,
  Clock,
  DollarSign,
  Users,
  Utensils,
  MapPin,
  CheckCircle,
  XCircle,
  AlertCircle,
  Coffee,
  Truck,
  ThumbsUp,
  CreditCard,
  Receipt,
  ChefHat,
  Loader2,
  Phone,
  User,
  MessageSquare,
  Volume2,
  VolumeX,
  BellRing,
  Settings,
  Home,
  ShoppingBag,
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { debounce } from 'lodash'

type OrderStatus = "PENDING" | "CONFIRMED" | "PREPARING" | "PICKUP" | "SERVED" | "COMPLETED" | "CANCELLED"

type Order = {
  _id: string
  orderNumber: string
  tableNumber: string
  waiterId: string
  numberOfGuests: number
  items: Array<{
    itemId: string
    quantity: number
    unitPrice: number
    price?: number
    subtotal: number
    status: string
  }>
  orderItems?: Array<{
    itemId: string
    quantity: number
    unitPrice: number
    price?: number
    subtotal: number
    status: string
  }>
  status: OrderStatus
  totalAmount: number
  discount: number
  tax: number
  finalAmount: number
  paymentMethod: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  inTable?: boolean
  delivery?: boolean
  deliveryInfo?: {
    fullName: string
    phoneNumber: string
    address: string
    city: string
  }
  paymentScreenshotUrl?: string
  specialRequirements?: string
  notes?: string
  customerName?: string
  isEdited?: boolean
  waiterName?: string
}

type Waitress = {
  _id: string
  name: string
  phone: string
  shift: string
  isActive: boolean
}

type MenuItem = {
  _id: string
  name: string
  description: string
  price: number
  imageUrl: string
  preparationTime: number
}

const statusOptions: OrderStatus[] = ["PENDING", "CONFIRMED", "PREPARING", "PICKUP", "SERVED", "COMPLETED", "CANCELLED"]

const statusIcons: Record<OrderStatus, React.ReactNode> = {
  PENDING: <Clock className="h-4 w-4" />,
  CONFIRMED: <ThumbsUp className="h-4 w-4" />,
  PREPARING: <ChefHat className="h-4 w-4" />,
  PICKUP: <Truck className="h-4 w-4" />,
  SERVED: <Coffee className="h-4 w-4" />,
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

// Order type badges configuration
const orderTypeBadges = {
  intable: {
    icon: <Home className="h-3 w-3" />,
    label: "In-Table",
    color: "bg-green-100 text-green-800 border-green-200",
  },
  delivery: {
    icon: <Truck className="h-3 w-3" />,
    label: "Delivery",
    color: "bg-blue-100 text-blue-800 border-blue-200",
  },
  pos: {
    icon: <ShoppingBag className="h-3 w-3" />,
    label: "POS",
    color: "bg-purple-100 text-purple-800 border-purple-200",
  },
}

const BATCH_SIZE_LIMIT = 100

// Optimized: Cache for menu items
const menuItemsCache = new Map<string, { data: Map<string, MenuItem>; timestamp: number }>()
const CACHE_DURATION = 5 * 60 * 1000

// Optimized: Batch fetch items with caching
const fetchItemsBatch = async (itemIds: string[]): Promise<Map<string, MenuItem>> => {
  if (itemIds.length === 0) return new Map()
  
  const uniqueIds = [...new Set(itemIds)]
  const limitedIds = uniqueIds.slice(0, BATCH_SIZE_LIMIT)
  const cacheKey = limitedIds.sort().join(',')
  
  const cached = menuItemsCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data
  }
  
  try {
    const response = await fetch(`/api/items/?ids=${limitedIds.join(',')}`)
    if (!response.ok) throw new Error("Failed to fetch items")
    const data = await response.json()
    
    const itemsMap = new Map<string, MenuItem>()
    data.items?.forEach((item: MenuItem) => {
      if (item?._id) {
        itemsMap.set(item._id, item)
      }
    })
    
    menuItemsCache.set(cacheKey, { data: itemsMap, timestamp: Date.now() })
    return itemsMap
  } catch (error) {
    console.error("Error fetching items batch:", error)
    return new Map()
  }
}

// Get order type badge
const getOrderTypeBadge = (order: Order) => {
  if (order.inTable === true) {
    return orderTypeBadges.intable
  } else if (order.delivery === true) {
    return orderTypeBadges.delivery
  } else {
    return orderTypeBadges.pos
  }
}

// Optimized: Prefetch common item combinations
const prefetchCommonItemCombinations = async (orders: Order[]) => {
  const allItemIds = new Set<string>()
  orders.forEach(order => {
    const items = order.orderItems || order.items || []
    items.forEach(item => allItemIds.add(item.itemId))
  })
  
  if (allItemIds.size > 0) {
    await fetchItemsBatch(Array.from(allItemIds))
  }
}

// Helper function to check if order was edited
const isOrderEdited = (order: Order): boolean => {
  return !!(order.orderItems && order.orderItems.length > 0)
}

// Optimized: Memoized OrderCard component
const OrderCard = React.memo(({ 
  order, 
  waitresses, 
  onDelete, 
  onStatusUpdate 
}: { 
  order: Order; 
  waitresses: Waitress[];
  onDelete: (id: string) => Promise<void>;
  onStatusUpdate: (id: string, status: OrderStatus) => Promise<void>;
}) => {
  const waitress = waitresses.find((w) => w._id === order.waiterId)
  const hasSpecialRequirements = !!(order.specialRequirements || order.notes)
  const edited = order.isEdited || false
  const orderTypeBadge = getOrderTypeBadge(order)

  return (
    <Card className="hover:shadow-lg transition-shadow duration-300 relative overflow-hidden">
      {/* Order Type Badge - Top Left */}
      <div className="absolute top-2 left-2 z-10">
        <Badge className={orderTypeBadge.color}>
          {orderTypeBadge.icon}
          <span className="ml-1 text-xs">{orderTypeBadge.label}</span>
        </Badge>
      </div>

      {/* Edited Badge - Top Right */}
      {edited && (
        <div className="absolute top-2 right-2 z-10">
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
            <Clock className="h-3 w-3 mr-1" />
            Edited
          </Badge>
        </div>
      )}

      <CardHeader className="pt-12">
        <CardTitle className="flex justify-between items-center">
          <span className="text-lg font-bold">Order #{order.orderNumber}</span>
          <Badge variant="outline" className={statusColors[order.status]}>
            {statusIcons[order.status]} {order.status}
          </Badge>
        </CardTitle>
        {order.customerName && (
          <p className="text-sm text-muted-foreground mt-1">Customer: {order.customerName}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {order.delivery ? (
          <div className="flex items-center space-x-4">
            <Avatar>
              <AvatarFallback><Truck className="h-4 w-4" /></AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{order.deliveryInfo?.fullName || "Delivery"}</p>
              <p className="text-sm text-muted-foreground">{order.deliveryInfo?.phoneNumber || "No Phone"}</p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center space-x-4">
              <Avatar>
                <AvatarImage src="/placeholder-avatar.jpg" />
                <AvatarFallback>{waitress?.name?.charAt(0) || "W"}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{waitress?.name || order.waiterName || "Unknown Waitress"}</p>
                <p className="text-sm text-muted-foreground">{waitress?.shift || "Unknown"} Shift</p>
              </div>
            </div>
            {waitress?.phone && (
              <div className="flex items-center text-sm">
                <Phone className="mr-2 h-4 w-4 text-muted-foreground" />
                <span>{waitress.phone}</span>
              </div>
            )}
          </div>
        )}

        {hasSpecialRequirements && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <MessageSquare className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-xs font-medium text-yellow-800 dark:text-yellow-400 mb-1">Special Requirements</p>
                <p className="text-xs text-yellow-700 dark:text-yellow-500 line-clamp-2">
                  {order.specialRequirements || order.notes}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex items-center">
            <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
            <span>{new Date(order.createdAt).toLocaleString()}</span>
          </div>
          <div className="flex items-center">
            <MapPin className="mr-2 h-4 w-4 text-muted-foreground" />
            <span>Table {order.tableNumber}</span>
          </div>
          <div className="flex items-center">
            <Users className="mr-2 h-4 w-4 text-muted-foreground" />
            <span>{order.numberOfGuests} guests</span>
          </div>
          <div className="flex items-center">
            <DollarSign className="mr-2 h-4 w-4 text-muted-foreground" />
            <span>{order.finalAmount.toLocaleString("en-ET", { style: "currency", currency: "ETB" })}</span>
          </div>
        </div>
        
        {edited && (
          <div className="text-xs text-blue-600 flex items-center gap-1 pt-1 border-t">
            <Clock className="h-3 w-3" />
            Updated: {new Date(order.updatedAt).toLocaleTimeString()}
          </div>
        )}
      </CardContent>
      <CardFooter className="justify-between">
        <OrderDetailModal order={order} waitresses={waitresses} />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DeleteOrderDialog orderId={order._id} onDelete={() => onDelete(order._id)} />
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Change Status</DropdownMenuLabel>
            {statusOptions.map((status) => (
              <DropdownMenuItem key={status} onClick={() => onStatusUpdate(order._id, status)}>
                {statusIcons[status]}
                <span className="ml-2">{status}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </CardFooter>
    </Card>
  )
})

OrderCard.displayName = 'OrderCard'

const DeleteOrderDialog = ({ orderId, onDelete }: { orderId: string; onDelete: () => Promise<void> }) => {
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    setIsDeleting(true)
    await onDelete()
    setIsDeleting(false)
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10">
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the order and remove all associated data from our
            servers.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              "Delete Order"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

// Optimized: OrderDetailModal with caching and order type display
const OrderDetailModal = React.memo(({ order, waitresses }: { order: Order; waitresses: Waitress[] }) => {
  const [waitress, setWaitress] = useState<Waitress | null>(null)
  const [menuItems, setMenuItems] = useState<Map<string, MenuItem>>(new Map())
  const [loadingItems, setLoadingItems] = useState(true)

  const displayItems = order.orderItems || order.items
  const orderTypeBadge = getOrderTypeBadge(order)

  useEffect(() => {
    const fetchWaitress = async () => {
      if (!order.waiterId) return
      const cachedWaitress = waitresses.find(w => w._id === order.waiterId)
      if (cachedWaitress) {
        setWaitress(cachedWaitress)
      } else {
        try {
          const response = await fetch(`/api/waitress/${order.waiterId}`)
          if (!response.ok) throw new Error("Failed to fetch waitress")
          const data = await response.json()
          setWaitress(data)
        } catch (error) {
          console.error("Error fetching waitress:", error)
        }
      }
    }

    const fetchMenuItems = async () => {
      setLoadingItems(true)
      const itemIds = displayItems.map((item) => item.itemId)
      const itemsMap = await fetchItemsBatch(itemIds)
      setMenuItems(itemsMap)
      setLoadingItems(false)
    }

    fetchWaitress()
    fetchMenuItems()
  }, [order, displayItems, waitresses])

  const edited = order.isEdited || false

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Eye className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <Receipt className="h-6 w-6" />
              Order Details
            </DialogTitle>
            {/* Order Type Badge */}
            <Badge className={orderTypeBadge.color}>
              {orderTypeBadge.icon}
              <span className="ml-1">{orderTypeBadge.label}</span>
            </Badge>
            {edited && (
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                <Clock className="h-3 w-3 mr-1" />
                Edited
              </Badge>
            )}
          </div>
          <DialogDescription>
            Order #{order.orderNumber} - {new Date(order.createdAt).toLocaleString()}
            {edited && (
              <span className="block text-xs text-blue-600 mt-1">
                Last updated: {new Date(order.updatedAt).toLocaleString()}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1 pr-4 overflow-y-auto">
          <div className="space-y-6 pb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-semibold flex items-center">
                    <MapPin className="mr-2 h-5 w-5" />
                    Order Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>Table: {order.tableNumber}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>Guests: {order.numberOfGuests}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-muted-foreground" />
                    <span>Status: </span>
                    <Badge variant="outline" className={`ml-2 ${statusColors[order.status]}`}>
                      {statusIcons[order.status]} {order.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                    <span>Payment Method: {order.paymentMethod}</span>
                  </div>
                  {order.customerName && (
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span>Customer: {order.customerName}</span>
                    </div>
                  )}
                  {order.inTable === true && (
                    <div className="flex items-center gap-2">
                      <Home className="h-4 w-4 text-green-600" />
                      <span className="text-green-700">In-Table Order</span>
                    </div>
                  )}
                  {order.delivery === true && (
                    <div className="flex items-center gap-2">
                      <Truck className="h-4 w-4 text-blue-600" />
                      <span className="text-blue-700">Delivery Order</span>
                    </div>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-semibold flex items-center">
                    {order.delivery ? <Truck className="mr-2 h-5 w-5" /> : <User className="mr-2 h-5 w-5" />}
                    {order.delivery ? "Delivery Information" : "Waitress Information"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {order.delivery ? (
                    order.deliveryInfo ? (
                      <>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{order.deliveryInfo.fullName}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span>{order.deliveryInfo.phoneNumber}</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                          <span>{order.deliveryInfo.address}, {order.deliveryInfo.city}</span>
                        </div>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">No delivery information available</p>
                    )
                  ) : waitress ? (
                    <>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback>{waitress.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{waitress.name}</p>
                          <p className="text-sm text-muted-foreground">{waitress.shift} Shift</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{waitress.phone}</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Loading waitress information...</span>
                    </div>
                  )}

                  {order.paymentScreenshotUrl && (
                    <div className="pt-4 mt-2 border-t">
                      <p className="text-sm font-medium mb-2">Payment Proof</p>
                      <div className="relative w-full h-48 rounded-md overflow-hidden border bg-muted/30">
                        <img 
                          src={order.paymentScreenshotUrl} 
                          alt="Payment Proof" 
                          className="w-full h-full object-contain"
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {(order.specialRequirements || order.notes) && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-semibold flex items-center">
                    <MessageSquare className="mr-2 h-5 w-5" />
                    Special Requirements
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-muted/30 p-4 rounded-lg">
                    <p className="text-sm whitespace-pre-wrap">{order.specialRequirements || order.notes}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-semibold flex items-center">
                  <Utensils className="mr-2 h-5 w-5" />
                  Order Items
                  {edited && (
                    <Badge variant="outline" className="ml-2 bg-blue-50 text-blue-700 text-xs">
                      Updated Version
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingItems ? (
                  <div className="space-y-2">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item</TableHead>
                          <TableHead className="w-20">Qty</TableHead>
                          <TableHead className="w-28">Unit Price</TableHead>
                          <TableHead className="w-28">Subtotal</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {displayItems.map((item, index) => {
                          const menuItem = menuItems.get(item.itemId)
                          return (
                            <TableRow key={index}>
                              <TableCell>
                                {menuItem ? (
                                  <div className="flex items-center gap-3">
                                    {menuItem.imageUrl && (
                                      <img
                                        src={menuItem.imageUrl}
                                        alt={menuItem.name}
                                        className="w-10 h-10 rounded-md object-cover"
                                      />
                                    )}
                                    <span className="font-medium">{menuItem.name}</span>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    <span>Loading...</span>
                                  </div>
                                )}
                              </TableCell>
                              <TableCell>{item.quantity}</TableCell>
                              <TableCell>
                                {(item.unitPrice || item.price || 0).toLocaleString("en-ET", { 
                                  style: "currency", 
                                  currency: "ETB" 
                                })}
                              </TableCell>
                              <TableCell>
                                {(item.subtotal || 0).toLocaleString("en-ET", { 
                                  style: "currency", 
                                  currency: "ETB" 
                                })}
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-semibold flex items-center">
                  <DollarSign className="mr-2 h-5 w-5" />
                  Order Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span>{order.totalAmount.toLocaleString("en-ET", { style: "currency", currency: "ETB" })}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Discount:</span>
                  <span>{order.discount.toLocaleString("en-ET", { style: "currency", currency: "ETB" })}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax:</span>
                  <span>{order.tax.toLocaleString("en-ET", { style: "currency", currency: "ETB" })}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold">
                  <span>Total:</span>
                  <span>{order.finalAmount.toLocaleString("en-ET", { style: "currency", currency: "ETB" })}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
})

OrderDetailModal.displayName = 'OrderDetailModal'

// Sound notification hook with volume control
const useNotificationSound = () => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isEnabled, setIsEnabled] = useState(true);
  const [volume, setVolume] = useState(0.5);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const audio = new Audio();
    audio.preload = 'auto';
    audio.src = 'https://www.soundjay.com/misc/sounds/bell-ringing-05.mp3';
    audio.volume = volume;

    audio.addEventListener('canplaythrough', () => {
      setIsLoaded(true);
    });

    audio.addEventListener('error', () => {
      setIsLoaded(false);
    });

    audio.load();
    audioRef.current = audio;

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const playFallbackBeep = useCallback(() => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      
      const audioCtx = new AudioContext();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      oscillator.frequency.value = 800;
      gainNode.gain.value = volume;
      
      oscillator.start();
      gainNode.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.3);
      oscillator.stop(audioCtx.currentTime + 0.3);
      
      setTimeout(() => audioCtx.close(), 500);
    } catch (error) {
      console.error('Failed to play fallback beep:', error);
    }
  }, [volume]);

  const play = useCallback(() => {
    if (!isEnabled) return;
    
    if (audioRef.current && isLoaded) {
      audioRef.current.currentTime = 0;
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => playFallbackBeep());
      }
    } else {
      playFallbackBeep();
    }
  }, [isEnabled, isLoaded, playFallbackBeep]);

  return { play, isEnabled, setIsEnabled, volume, setVolume };
};

// Sound control dialog
const SoundControlDialog = ({ 
  isEnabled, 
  onToggle, 
  volume, 
  onVolumeChange 
}: { 
  isEnabled: boolean; 
  onToggle: () => void; 
  volume: number; 
  onVolumeChange: (value: number) => void;
}) => {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 relative">
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Sound Settings</DialogTitle>
          <DialogDescription>
            Configure notification sound preferences
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              <span className="text-sm font-medium">Sound Notifications</span>
            </div>
            <Button
              variant={isEnabled ? "default" : "outline"}
              size="sm"
              onClick={onToggle}
              className="h-8"
            >
              {isEnabled ? "Enabled" : "Disabled"}
            </Button>
          </div>
          
          {isEnabled && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Volume</span>
                <span className="text-sm font-medium">{Math.round(volume * 100)}%</span>
              </div>
              <Slider
                value={[volume]}
                onValueChange={(values) => onVolumeChange(values[0])}
                min={0}
                max={1}
                step={0.01}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const audio = new Audio('https://www.soundjay.com/misc/sounds/bell-ringing-05.mp3');
                  audio.volume = volume;
                  audio.play().catch(() => {});
                }}
                className="w-full mt-2"
              >
                <Volume2 className="h-3 w-3 mr-2" />
                Test Sound
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Sound toggle button component
const SoundToggleButton = ({ isEnabled, onToggle }: { isEnabled: boolean; onToggle: () => void }) => (
  <Button
    variant="ghost"
    size="icon"
    onClick={onToggle}
    className="h-8 w-8 relative"
    title={isEnabled ? "Sound notifications on" : "Sound notifications off"}
  >
    {isEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
  </Button>
)

// Notification toast component
const NotificationToast = ({ title, message, onClose }: { title: string; message: string; onClose: () => void }) => (
  <motion.div
    initial={{ opacity: 0, y: -50, x: '-50%' }}
    animate={{ opacity: 1, y: 0, x: '-50%' }}
    exit={{ opacity: 0, y: -50, x: '-50%' }}
    className="fixed top-4 left-1/2 z-50 w-[90%] max-w-md"
  >
    <div className="bg-green-50 border-l-4 border-green-500 rounded-lg shadow-lg overflow-hidden">
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <BellRing className="h-5 w-5 text-green-600 animate-pulse" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-green-800">{title}</p>
            <p className="text-xs text-green-700 mt-1">{message}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 flex-shrink-0 text-green-600 hover:text-green-800 hover:bg-green-100"
            onClick={onClose}
          >
            <XCircle className="h-3 w-3" />
          </Button>
        </div>
      </div>
      <div className="h-1 bg-green-500 animate-progress" style={{ animationDuration: '4000ms' }} />
    </div>
  </motion.div>
)

export default function OrderManagement() {
  const [orders, setOrders] = useState<Order[]>([])
  const [waitresses, setWaitresses] = useState<Waitress[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<OrderStatus | null>(null)
  const [waitressFilter, setWaitressFilter] = useState<string | null>(null)
  const [orderTypeFilter, setOrderTypeFilter] = useState<string | null>(null)
  const [dateFilter, setDateFilter] = useState<Date | null>(null)
  const [sortField, setSortField] = useState<keyof Order>("createdAt")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [viewMode, setViewMode] = useState<"list" | "grid">("grid")
  const itemsPerPage = 12
  
  // Sound and notification states
  const { play: playNotificationSound, isEnabled: soundEnabled, setIsEnabled: setSoundEnabled, volume, setVolume } = useNotificationSound()
  const [showNotification, setShowNotification] = useState(false)
  const [notificationData, setNotificationData] = useState({ title: '', message: '' })
  
  // Refs for polling and tracking
  const lastOrderIdsRef = useRef<string[]>([])
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastFetchTimeRef = useRef<string>(new Date().toISOString())
  const isMountedRef = useRef<boolean>(true)

  // Set mounted flag
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
      }
    }
  }, [])

  // Optimized: Fetch orders
  const fetchOrders = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true)
    try {
      const response = await fetch("/api/order")
      if (!response.ok) throw new Error("Failed to fetch orders")
      const data = await response.json()
      
      const ordersWithEditFlag = (data.orders || []).map((order: Order) => ({
        ...order,
        isEdited: isOrderEdited(order)
      }))
      
      if (isMountedRef.current) {
        setOrders(ordersWithEditFlag)
        setTotalPages(Math.ceil(ordersWithEditFlag.length / itemsPerPage))
        lastOrderIdsRef.current = ordersWithEditFlag.map((order: Order) => order._id)
        lastFetchTimeRef.current = new Date().toISOString()
        
        // Prefetch menu items for all orders
        await prefetchCommonItemCombinations(ordersWithEditFlag)
      }
    } catch (error) {
      console.error("Error fetching orders:", error)
      if (showLoading) toast.error("Failed to fetch orders")
    } finally {
      if (showLoading && isMountedRef.current) setLoading(false)
    }
  }, [itemsPerPage])

  // Optimized: Debounced polling for new orders
  const pollNewOrders = useCallback(async () => {
    if (!isMountedRef.current) return
    
    try {
      const response = await fetch(`/api/order?after=${lastFetchTimeRef.current}`)
      if (!response.ok) throw new Error("Failed to fetch new orders")
      const data = await response.json()
      const newOrders = (data.orders || []).map((order: Order) => ({
        ...order,
        isEdited: isOrderEdited(order)
      }))
      
      if (newOrders.length > 0 && isMountedRef.current) {
        // Detect truly new orders (not previously in the list)
        const trulyNewOrders = newOrders.filter(
          (order: Order) => !lastOrderIdsRef.current.includes(order._id)
        )
        
        // Show notifications for new orders
        if (trulyNewOrders.length > 0) {
          trulyNewOrders.forEach((order: Order) => {
            playNotificationSound()
            
            const orderType = order.inTable ? "In-Table" : (order.delivery ? "Delivery" : "POS")
            
            setNotificationData({
              title: `New ${orderType} Order #${order.orderNumber}`,
              message: `Table ${order.tableNumber} | ${order.items?.length || 0} items | ${order.finalAmount.toLocaleString("en-ET", { style: "currency", currency: "ETB" })}`,
            })
            setShowNotification(true)
            setTimeout(() => setShowNotification(false), 4000)
            
            toast.success(`New ${orderType} order #${order.orderNumber} received!`, {
              duration: 5000,
              icon: '🔔',
            })
          })
        }
        
        // Refresh the entire order list
        await fetchOrders(false)
      }
    } catch (error) {
      console.error("Error polling new orders:", error)
    }
  }, [playNotificationSound, fetchOrders])

  // Optimized: Fetch waitresses with caching
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

  // Initialize and start polling with longer interval
  useEffect(() => {
    const initialize = async () => {
      await Promise.all([
        fetchOrders(true),
        fetchWaitresses()
      ])
      
      // Start polling every 30 seconds
      pollingIntervalRef.current = setInterval(() => {
        pollNewOrders()
      }, 30000)
    }
    
    initialize()
    
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
      }
    }
  }, [fetchOrders, fetchWaitresses, pollNewOrders])

  const handleDeleteOrder = async (orderId: string) => {
    try {
      const response = await fetch(`/api/order/${orderId}`, {
        method: "DELETE",
      })
      if (!response.ok) throw new Error("Failed to delete order")
      toast.success("Order deleted successfully")
      fetchOrders()
    } catch (error) {
      console.error("Error deleting order:", error)
      toast.error("Failed to delete order")
    }
  }

  const handleStatusUpdate = async (orderId: string, newStatus: OrderStatus) => {
    try {
      const response = await fetch(`/api/order/${orderId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!response.ok) throw new Error("Failed to update order status")
      toast.success("Order status updated successfully")
      fetchOrders()
    } catch (error) {
      console.error("Error updating order status:", error)
      toast.error("Failed to update order status")
    }
  }

  // Optimized: Memoized filtered and sorted orders
  const filteredAndSortedOrders = useMemo(() => {
    let filtered = orders.filter((order) => {
      const matchesSearch =
        order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.tableNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (order.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
        (order.specialRequirements?.toLowerCase().includes(searchTerm.toLowerCase()) || false)
      const matchesStatus = !statusFilter || order.status === statusFilter
      const matchesWaitress = !waitressFilter || order.waiterId === waitressFilter
      const matchesDate = !dateFilter || new Date(order.createdAt).toDateString() === dateFilter.toDateString()
      const matchesType = !orderTypeFilter || 
        (orderTypeFilter === 'intable' && order.inTable === true) ||
        (orderTypeFilter === 'delivery' && order.delivery === true) ||
        (orderTypeFilter === 'pos' && !order.inTable && !order.delivery)

      return matchesSearch && matchesStatus && matchesWaitress && matchesDate && matchesType
    })

    // Sort
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
  }, [orders, searchTerm, statusFilter, waitressFilter, dateFilter, orderTypeFilter, sortField, sortDirection])

  // Update total pages when filtered orders change
  useEffect(() => {
    setTotalPages(Math.ceil(filteredAndSortedOrders.length / itemsPerPage))
    setCurrentPage(1)
  }, [filteredAndSortedOrders.length, itemsPerPage])

  const paginatedOrders = useMemo(() => {
    return filteredAndSortedOrders.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
  }, [filteredAndSortedOrders, currentPage, itemsPerPage])

  const handleSort = useCallback((field: keyof Order) => {
    if (field === sortField) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }, [sortField])

  const handleClearFilters = useCallback(() => {
    setSearchTerm("")
    setStatusFilter(null)
    setWaitressFilter(null)
    setOrderTypeFilter(null)
    setDateFilter(null)
  }, [])

  const handleSearchDebounced = useMemo(
    () => debounce((value: string) => setSearchTerm(value), 300),
    []
  )

  // Get order type display for list view
  const getOrderTypeDisplay = (order: Order) => {
    if (order.inTable === true) {
      return (
        <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
          <Home className="h-3 w-3 mr-1" />
          In-Table
        </Badge>
      )
    } else if (order.delivery === true) {
      return (
        <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">
          <Truck className="h-3 w-3 mr-1" />
          Delivery
        </Badge>
      )
    } else {
      return (
        <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-200">
          <ShoppingBag className="h-3 w-3 mr-1" />
          POS
        </Badge>
      )
    }
  }

  // Filter Bar Component
  const filterBar = (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search orders, customer, or special requirements..."
                onChange={(e) => handleSearchDebounced(e.target.value)}
                className="w-full pl-8"
                defaultValue={searchTerm}
              />
            </div>
          </div>
          <Select value={statusFilter || "All"} onValueChange={(value) => setStatusFilter(value === "All" ? null : value as OrderStatus)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Statuses</SelectItem>
              {statusOptions.map((status) => (
                <SelectItem key={status} value={status}>
                  <div className="flex items-center">
                    {statusIcons[status]}
                    <span className="ml-2">{status}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={orderTypeFilter || "All"} onValueChange={(value) => setOrderTypeFilter(value === "All" ? null : value)}>
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
          <Select value={waitressFilter || "All"} onValueChange={(value) => setWaitressFilter(value === "All" ? null : value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by waitress" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Waitresses</SelectItem>
              {waitresses.map((waitress) => (
                <SelectItem key={waitress._id} value={waitress._id}>
                  {waitress.name}
                </SelectItem>
              ))}
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
                onSelect={(date: Date | undefined) => setDateFilter(date || null)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          <Button onClick={handleClearFilters} variant="secondary">
            <RefreshCcw className="mr-2 h-4 w-4" />
            Clear Filters
          </Button>
          <div className="ml-auto flex gap-1">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setViewMode("list")}
              className={viewMode === "list" ? "bg-primary text-primary-foreground" : ""}
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setViewMode("grid")}
              className={viewMode === "grid" ? "bg-primary text-primary-foreground" : ""}
            >
              <Grid className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )

  // Optimized: Memoized order list view
  const orderListView = useMemo(() => {
    if (viewMode === "list") {
      return (
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">
                    <Button variant="ghost" onClick={() => handleSort("orderNumber")} className="p-0">
                      Order #
                    </Button>
                  </TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Waitress</TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => handleSort("tableNumber")} className="p-0">
                      Table
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => handleSort("status")} className="p-0">
                      Status
                    </Button>
                  </TableHead>
                  <TableHead>Edited</TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => handleSort("finalAmount")} className="p-0">
                      Total
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => handleSort("createdAt")} className="p-0">
                      Date
                    </Button>
                  </TableHead>
                  <TableHead>Special</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedOrders.map((order) => {
                  const waitress = waitresses.find((w) => w._id === order.waiterId)
                  const hasSpecialRequirements = !!(order.specialRequirements || order.notes)
                  const edited = order.isEdited || false
                  return (
                    <TableRow key={order._id}>
                      <TableCell className="font-medium">{order.orderNumber}</TableCell>
                      <TableCell>{getOrderTypeDisplay(order)}</TableCell>
                      <TableCell>{order.customerName || "Walk-in"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>{waitress?.name?.charAt(0) || "W"}</AvatarFallback>
                          </Avatar>
                          <span>{waitress?.name || order.waiterName || "Unknown"}</span>
                        </div>
                      </TableCell>
                      <TableCell>{order.tableNumber}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusColors[order.status]}>
                          {statusIcons[order.status]} {order.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {edited ? (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                            <Clock className="h-3 w-3 mr-1" />
                            Yes
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-gray-50 text-gray-400">
                            No
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {order.finalAmount.toLocaleString("en-ET", { style: "currency", currency: "ETB" })}
                      </TableCell>
                      <TableCell>{new Date(order.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        {hasSpecialRequirements ? (
                          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                            <MessageSquare className="h-3 w-3 mr-1" />
                            Yes
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-gray-50 text-gray-400">
                            No
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <OrderDetailModal order={order} waitresses={waitresses} />
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DeleteOrderDialog orderId={order._id} onDelete={() => handleDeleteOrder(order._id)} />
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
              </TableBody>
            </Table>
          </div>
        </Card>
      )
    } else {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {paginatedOrders.map((order) => (
            <OrderCard 
              key={order._id} 
              order={order} 
              waitresses={waitresses}
              onDelete={handleDeleteOrder}
              onStatusUpdate={handleStatusUpdate}
            />
          ))}
        </div>
      )
    }
  }, [viewMode, paginatedOrders, waitresses, handleSort, handleDeleteOrder, handleStatusUpdate, getOrderTypeDisplay])

  return (
    <div className="container mx-auto p-4 space-y-6">
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
      
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold">Order Management</h1>
          <div className="flex items-center gap-1">
            <SoundToggleButton isEnabled={soundEnabled} onToggle={() => setSoundEnabled(!soundEnabled)} />
            <SoundControlDialog 
              isEnabled={soundEnabled} 
              onToggle={() => setSoundEnabled(!soundEnabled)} 
              volume={volume} 
              onVolumeChange={setVolume} 
            />
          </div>
        </div>
        <Button onClick={() => fetchOrders(true)} variant="outline" size="icon" disabled={loading}>
          <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {filterBar}

      {loading && orders.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="w-full h-[250px]">
              <CardHeader className="animate-pulse bg-gray-200 h-8 w-3/4 rounded" />
              <CardContent className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        orderListView
      )}

      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
              aria-disabled={currentPage === 1}
            />
          </PaginationItem>
          {[...Array(Math.min(totalPages, 5))].map((_, i) => {
            let pageNum
            if (totalPages <= 5) {
              pageNum = i + 1
            } else if (currentPage <= 3) {
              pageNum = i + 1
            } else if (currentPage >= totalPages - 2) {
              pageNum = totalPages - 4 + i
            } else {
              pageNum = currentPage - 2 + i
            }
            return (
              <PaginationItem key={pageNum}>
                <PaginationLink
                  onClick={() => setCurrentPage(pageNum)}
                  isActive={currentPage === pageNum}
                >
                  {pageNum}
                </PaginationLink>
              </PaginationItem>
            )
          })}
          <PaginationItem>
            <PaginationNext
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
              aria-disabled={currentPage === totalPages}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>

      <style jsx global>{`
        @keyframes progress {
          from { width: 100%; }
          to { width: 0%; }
        }
        .animate-progress {
          animation: progress linear forwards;
        }
      `}</style>
    </div>
  )
}