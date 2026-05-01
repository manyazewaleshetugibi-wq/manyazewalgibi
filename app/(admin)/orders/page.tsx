"use client"

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { useSession } from "next-auth/react"
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
  AlertDialogTrigger,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
  DialogFooter,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
  CardDescription,
} from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Slider } from "@/components/ui/slider"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
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
  Building2,
  Flag,
  AlertTriangle,
  Shield,
  ShieldAlert,
  Lock,
  Unlock,
  Info,
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { debounce } from "lodash"

type OrderStatus = "PENDING" | "CONFIRMED" | "PREPARING" | "PICKUP" | "SERVED" | "COMPLETED" | "CANCELLED"

type OrderItem = {
  itemId: string
  quantity: number
  unitPrice: number
  price?: number
  subtotal: number
  status: string
  isUneditable?: boolean
  uneditableAt?: string
  uneditableBy?: string
}

type Order = {
  _id: string
  orderNumber: string
  tableNumber: string
  waiterId: string
  numberOfGuests: number
  items: Array<OrderItem>
  orderItems?: Array<OrderItem>
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
  restaurantName?: string
  restaurantId?: string
  markedForDeletion?: boolean
  deletionRequestReason?: string
  deletionRequestedBy?: string
  deletionRequestedAt?: string
  deletedAt?: string
  deletedBy?: string
  deletionReason?: string
  floor?: string
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
  floor?: string
}

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

const restaurantBadges = {
  manyazewal1: {
    icon: <Building2 className="h-3 w-3" />,
    label: "Manyazewal 1",
    color: "bg-indigo-100 text-indigo-800 border-indigo-200",
  },
  manyazewal2: {
    icon: <Building2 className="h-3 w-3" />,
    label: "Manyazewal 2",
    color: "bg-rose-100 text-rose-800 border-rose-200",
  },
}

const BATCH_SIZE_LIMIT = 100
const menuItemsCache = new Map<string, { data: Map<string, MenuItem>; timestamp: number }>()
const CACHE_DURATION = 5 * 60 * 1000

const getOrderRestaurantId = (order: Order): string | null => {
  if (order.delivery === true) return "manyazewal1"
  if (order.restaurantId) return order.restaurantId
  if (order.restaurantName?.includes("1") || order.restaurantName === "Manyazewal Eshetu Gibi 1")
    return "manyazewal1"
  if (order.restaurantName?.includes("2") || order.restaurantName === "Manyazewal Eshetu Gibi 2")
    return "manyazewal2"
  return null
}

const getRestaurantDisplayName = (order: Order): string => {
  const restaurantId = getOrderRestaurantId(order)
  if (restaurantId === "manyazewal1") return "Manyazewal 1"
  if (restaurantId === "manyazewal2") return "Manyazewal 2"
  return order.restaurantName || "Unknown"
}

const getRestaurantBadge = (order: Order) => {
  const restaurantId = getOrderRestaurantId(order)
  if (restaurantId === "manyazewal1") return restaurantBadges.manyazewal1
  if (restaurantId === "manyazewal2") return restaurantBadges.manyazewal2
  return null
}

const fetchItemsBatch = async (itemIds: string[]): Promise<Map<string, MenuItem>> => {
  if (itemIds.length === 0) return new Map()
  const uniqueIds = [...new Set(itemIds)]
  const limitedIds = uniqueIds.slice(0, BATCH_SIZE_LIMIT)
  const cacheKey = limitedIds.sort().join(",")
  const cached = menuItemsCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) return cached.data
  try {
    const response = await fetch(`/api/items/?ids=${limitedIds.join(",")}`)
    if (!response.ok) throw new Error("Failed to fetch items")
    const data = await response.json()
    const itemsMap = new Map<string, MenuItem>()
    data.items?.forEach((item: MenuItem) => {
      if (item?._id) itemsMap.set(item._id, item)
    })
    menuItemsCache.set(cacheKey, { data: itemsMap, timestamp: Date.now() })
    return itemsMap
  } catch (error) {
    console.error("Error fetching items batch:", error)
    return new Map()
  }
}

const getOrderTypeBadge = (order: Order) => {
  if (order.inTable === true) return orderTypeBadges.intable
  else if (order.delivery === true) return orderTypeBadges.delivery
  else return orderTypeBadges.pos
}

const prefetchCommonItemCombinations = async (orders: Order[]) => {
  const allItemIds = new Set<string>()
  orders.forEach((order) => {
    const items = order.orderItems || order.items || []
    items.forEach((item) => allItemIds.add(item.itemId))
  })
  if (allItemIds.size > 0) await fetchItemsBatch(Array.from(allItemIds))
}

const isOrderEdited = (order: Order): boolean => {
  return !!(order.orderItems && order.orderItems.length > 0)
}

const isAdminUser = (role: string | undefined): boolean => {
  if (!role) return false
  const adminRoles = ["ADMIN", "admin", "Admin", "SUPER_ADMIN"]
  return adminRoles.includes(role)
}

const DeleteOrderDialog = ({
  orderId,
  onDelete,
}: {
  orderId: string
  onDelete: () => Promise<void>
}) => {
  const [isDeleting, setIsDeleting] = useState(false)
  const handleDelete = async () => {
    setIsDeleting(true)
    await onDelete()
    setIsDeleting(false)
  }
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the
            order and remove all associated data.
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

const MarkForDeletionDialog = ({
  order,
  onMarkForDeletion,
  currentUser,
}: {
  order: Order
  onMarkForDeletion: (orderId: string, reason: string) => Promise<void>
  currentUser: { name?: string | null; email?: string | null } | null
}) => {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const handleSubmit = async () => {
    if (!reason.trim()) {
      toast.error("Please provide a reason")
      return
    }
    setIsSubmitting(true)
    await onMarkForDeletion(order._id, reason)
    setIsSubmitting(false)
    setOpen(false)
    setReason("")
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50"
        >
          <Flag className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            Mark Order #{order.orderNumber} for Deletion
          </DialogTitle>
          <DialogDescription>
            Please provide a reason why this order should be deleted.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Deletion Reason *</label>
            <Textarea
              placeholder="Enter detailed reason for deletion request..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              className="resize-none"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !reason.trim()}
            variant="default"
            className="bg-yellow-600 hover:bg-yellow-700"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Flag className="mr-2 h-4 w-4" />
                Mark for Deletion
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

const ItemUneditableToggle = ({
  item,
  orderId,
  itemIndex,
  onToggle,
}: {
  item: OrderItem
  orderId: string
  itemIndex: number
  onToggle: (orderId: string, itemIndex: number, isUneditable: boolean) => Promise<void>
}) => {
  const [isToggling, setIsToggling] = useState(false)
  const isUneditable = item.isUneditable || false

  const handleToggle = async () => {
    if (isToggling) return
    setIsToggling(true)
    try {
      await onToggle(orderId, itemIndex, !isUneditable)
    } finally {
      setIsToggling(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-2">
        {isUneditable ? (
          <Lock className="h-3 w-3 text-green-600" />
        ) : (
          <Unlock className="h-3 w-3 text-yellow-600" />
        )}
        <Switch
          checked={isUneditable}
          onCheckedChange={handleToggle}
          disabled={isToggling}
          className={isUneditable ? "data-[state=checked]:bg-green-600" : ""}
        />
        <span className={`text-xs ${isUneditable ? "text-green-600" : "text-yellow-600"}`}>
          {isUneditable ? "Uneditable" : "Editable"}
        </span>
      </div>
      {item.uneditableAt && (
        <span className="text-xs text-muted-foreground">
          {new Date(item.uneditableAt).toLocaleTimeString()}
        </span>
      )}
    </div>
  )
}

const OrderDetailModal = React.memo(
  ({
    order,
    waitresses,
    isAdmin,
    onToggleItemUneditable,
  }: {
    order: Order
    waitresses: Waitress[]
    isAdmin: boolean
    onToggleItemUneditable?: (orderId: string, itemIndex: number, isUneditable: boolean) => Promise<void>
  }) => {
    const [waitress, setWaitress] = useState<Waitress | null>(null)
    const [menuItems, setMenuItems] = useState<Map<string, MenuItem>>(new Map())
    const [loadingItems, setLoadingItems] = useState(true)

    const displayItems = order.orderItems || order.items
    const orderTypeBadge = getOrderTypeBadge(order)
    const restaurantBadge = getRestaurantBadge(order)

    useEffect(() => {
      const fetchWaitress = async () => {
        if (!order.waiterId) return
        const cachedWaitress = waitresses.find((w) => w._id === order.waiterId)
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
    const markedForDeletion = order.markedForDeletion || false
    const uneditableCount = displayItems.filter((item) => item.isUneditable).length

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
              {markedForDeletion && (
                <Badge className="bg-yellow-500 text-white">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Pending Deletion
                </Badge>
              )}
              {isAdmin && (
                <Badge className="bg-red-100 text-red-800">
                  <ShieldAlert className="h-3 w-3 mr-1" />
                  Admin View
                </Badge>
              )}
              {restaurantBadge && (
                <Badge className={restaurantBadge.color}>
                  {restaurantBadge.icon}
                  <span className="ml-1">{restaurantBadge.label}</span>
                </Badge>
              )}
              <Badge className={orderTypeBadge.color}>
                {orderTypeBadge.icon}
                <span className="ml-1">{orderTypeBadge.label}</span>
              </Badge>
              {edited && (
                <Badge variant="outline" className="bg-blue-50 text-blue-700">
                  <Clock className="h-3 w-3 mr-1" />
                  Edited
                </Badge>
              )}
              {uneditableCount > 0 && (
                <Badge variant="outline" className="bg-green-50 text-green-700">
                  <Lock className="h-3 w-3 mr-1" />
                  {uneditableCount} Locked
                </Badge>
              )}
            </div>
            <DialogDescription>
              Order #{order.orderNumber} - {new Date(order.createdAt).toLocaleString()}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="flex-1 pr-4 overflow-y-auto">
            <div className="space-y-6 pb-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-semibold flex items-center">
                      <Building2 className="mr-2 h-5 w-5" />
                      Restaurant Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{getRestaurantDisplayName(order)}</span>
                    </div>
                    {order.floor && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>Floor: {order.floor}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
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
                      <span>Payment: {order.paymentMethod}</span>
                    </div>
                    {order.customerName && (
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span>Customer: {order.customerName}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-semibold flex items-center">
                      {order.delivery ? (
                        <Truck className="mr-2 h-5 w-5" />
                      ) : (
                        <User className="mr-2 h-5 w-5" />
                      )}
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
                            <span>
                              {order.deliveryInfo.address}, {order.deliveryInfo.city}
                            </span>
                          </div>
                        </>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          No delivery information available
                        </p>
                      )
                    ) : waitress ? (
                      <>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback>{waitress.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{waitress.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {waitress.shift} Shift
                            </p>
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
                        <span>Loading...</span>
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
                      <p className="text-sm whitespace-pre-wrap">
                        {order.specialRequirements || order.notes}
                      </p>
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
                  <CardDescription>
                    Toggle items as "Uneditable" to lock them and prevent modifications
                  </CardDescription>
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
                            <TableHead className="w-20 text-center">Qty</TableHead>
                            <TableHead className="w-28 text-right">Unit Price</TableHead>
                            <TableHead className="w-28 text-right">Subtotal</TableHead>
                            <TableHead className="w-40 text-center">Lock Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {displayItems.map((item, index) => {
                            const menuItem = menuItems.get(item.itemId)
                            const isUneditable = item.isUneditable || false
                            return (
                              <TableRow key={index} className={isUneditable ? "bg-green-50/30" : ""}>
                                <TableCell>
                                  <div className="flex items-center gap-3">
                                    {menuItem?.imageUrl && (
                                      <img
                                        src={menuItem.imageUrl}
                                        alt={menuItem.name}
                                        className="w-10 h-10 rounded-md object-cover"
                                      />
                                    )}
                                    <div>
                                      <span className={`font-medium ${isUneditable ? "text-green-700" : ""}`}>
                                        {menuItem?.name || "Loading..."}
                                      </span>
                                      {isUneditable && (
                                        <div className="flex items-center gap-1 mt-1">
                                          <Lock className="h-3 w-3 text-green-600" />
                                          <span className="text-xs text-green-600">Locked</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell className="text-center">{item.quantity}</TableCell>
                                <TableCell className="text-right">
                                  {(item.unitPrice || item.price || 0).toLocaleString("en-ET", {
                                    style: "currency",
                                    currency: "ETB",
                                  })}
                                </TableCell>
                                <TableCell className="text-right">
                                  {(item.subtotal || 0).toLocaleString("en-ET", {
                                    style: "currency",
                                    currency: "ETB",
                                  })}
                                </TableCell>
                                <TableCell className="text-center">
                                  {onToggleItemUneditable && (
                                    <ItemUneditableToggle
                                      item={item}
                                      orderId={order._id}
                                      itemIndex={index}
                                      onToggle={onToggleItemUneditable}
                                    />
                                  )}
                                  {!onToggleItemUneditable && isUneditable && (
                                    <Badge variant="outline" className="bg-green-100 text-green-700">
                                      <Lock className="h-3 w-3 mr-1" />
                                      Locked
                                    </Badge>
                                  )}
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
                    <span>
                      {order.totalAmount.toLocaleString("en-ET", {
                        style: "currency",
                        currency: "ETB",
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Discount:</span>
                    <span>
                      {order.discount.toLocaleString("en-ET", {
                        style: "currency",
                        currency: "ETB",
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tax:</span>
                    <span>
                      {order.tax.toLocaleString("en-ET", {
                        style: "currency",
                        currency: "ETB",
                      })}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-bold">
                    <span>Total:</span>
                    <span>
                      {order.finalAmount.toLocaleString("en-ET", {
                        style: "currency",
                        currency: "ETB",
                      })}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    )
  }
)

OrderDetailModal.displayName = "OrderDetailModal"

const OrderCard = React.memo(
  ({
    order,
    waitresses,
    isAdmin,
    currentUser,
    onDelete,
    onMarkForDeletion,
    onStatusUpdate,
    onToggleItemUneditable,
  }: {
    order: Order
    waitresses: Waitress[]
    isAdmin: boolean
    currentUser: { name?: string | null; email?: string | null } | null
    onDelete: (id: string) => Promise<void>
    onMarkForDeletion: (id: string, reason: string) => Promise<void>
    onStatusUpdate: (id: string, status: OrderStatus) => Promise<void>
    onToggleItemUneditable?: (orderId: string, itemIndex: number, isUneditable: boolean) => Promise<void>
  }) => {
    const waitress = waitresses.find((w) => w._id === order.waiterId)
    const hasSpecialRequirements = !!(order.specialRequirements || order.notes)
    const edited = order.isEdited || false
    const markedForDeletion = order.markedForDeletion || false
    const orderTypeBadge = getOrderTypeBadge(order)
    const restaurantBadge = getRestaurantBadge(order)
    const displayItems = order.orderItems || order.items
    const uneditableCount = displayItems.filter((item) => item.isUneditable).length

    return (
      <Card
        className={`hover:shadow-lg transition-shadow duration-300 relative overflow-hidden ${
          markedForDeletion
            ? "border-yellow-500 bg-yellow-50/50 dark:bg-yellow-900/10"
            : ""
        }`}
      >
        {markedForDeletion && (
          <div className="absolute top-2 left-2 z-10">
            <Badge className="bg-yellow-500 text-white">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Pending Deletion
            </Badge>
          </div>
        )}
        {isAdmin && !markedForDeletion && (
          <div className="absolute top-2 left-2 z-10">
            <Badge className="bg-red-100 text-red-800">
              <ShieldAlert className="h-3 w-3 mr-1" />
              Admin Access
            </Badge>
          </div>
        )}
        {restaurantBadge && !markedForDeletion && !isAdmin && (
          <div className="absolute top-2 left-2 z-10">
            <Badge className={restaurantBadge.color}>
              {restaurantBadge.icon}
              <span className="ml-1 text-xs">{restaurantBadge.label}</span>
            </Badge>
          </div>
        )}
        <div
          className={`absolute top-2 z-10 ${
            markedForDeletion ? "left-36" : isAdmin ? "left-28" : "left-24"
          }`}
        >
          <Badge className={orderTypeBadge.color}>
            {orderTypeBadge.icon}
            <span className="ml-1 text-xs">{orderTypeBadge.label}</span>
          </Badge>
        </div>
        {uneditableCount > 0 && (
          <div className="absolute top-2 right-2 z-10">
            <Badge variant="outline" className="bg-green-50 text-green-700 text-xs">
              <Lock className="h-3 w-3 mr-1" />
              {uneditableCount} Locked
            </Badge>
          </div>
        )}
        {edited && !uneditableCount && (
          <div className="absolute top-2 right-2 z-10">
            <Badge variant="outline" className="bg-blue-50 text-blue-700 text-xs">
              <Clock className="h-3 w-3 mr-1" />
              Edited
            </Badge>
          </div>
        )}

        <CardHeader className="pt-12">
          <CardTitle className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold">Order #{order.orderNumber}</span>
            </div>
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
                <AvatarFallback>
                  <Truck className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{order.deliveryInfo?.fullName || "Delivery"}</p>
                <p className="text-sm text-muted-foreground">
                  {order.deliveryInfo?.phoneNumber || "No Phone"}
                </p>
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
                  <p className="font-medium">
                    {waitress?.name || order.waiterName || "Unknown Waitress"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {waitress?.shift || "Unknown"} Shift
                  </p>
                </div>
              </div>
            </div>
          )}

          {hasSpecialRequirements && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <MessageSquare className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-xs text-yellow-700 line-clamp-2">
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
              <span>
                {order.finalAmount.toLocaleString("en-ET", {
                  style: "currency",
                  currency: "ETB",
                })}
              </span>
            </div>
          </div>

          {uneditableCount > 0 && (
            <div className="text-xs text-green-600 flex items-center gap-1 pt-1 border-t">
              <Lock className="h-3 w-3" />
              {uneditableCount} item{uneditableCount !== 1 ? "s" : ""} locked (cannot be edited)
            </div>
          )}
        </CardContent>
        <CardFooter className="justify-between">
          <OrderDetailModal
            order={order}
            waitresses={waitresses}
            isAdmin={isAdmin}
            onToggleItemUneditable={onToggleItemUneditable}
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {isAdmin ? (
                <DeleteOrderDialog orderId={order._id} onDelete={() => onDelete(order._id)} />
              ) : (
                <MarkForDeletionDialog
                  order={order}
                  onMarkForDeletion={onMarkForDeletion}
                  currentUser={currentUser}
                />
              )}
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
  }
)

OrderCard.displayName = "OrderCard"

const useNotificationSound = () => {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [isEnabled, setIsEnabled] = useState(true)
  const [volume, setVolume] = useState(0.5)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return
    const audio = new Audio()
    audio.preload = "auto"
    audio.src = "https://www.soundjay.com/misc/sounds/bell-ringing-05.mp3"
    audio.volume = volume
    audio.addEventListener("canplaythrough", () => setIsLoaded(true))
    audio.load()
    audioRef.current = audio
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.src = ""
        audioRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume
  }, [volume])

  const playFallbackBeep = useCallback(() => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext
      if (!AudioContext) return
      const audioCtx = new AudioContext()
      const oscillator = audioCtx.createOscillator()
      const gainNode = audioCtx.createGain()
      oscillator.connect(gainNode)
      gainNode.connect(audioCtx.destination)
      oscillator.frequency.value = 800
      gainNode.gain.value = volume
      oscillator.start()
      gainNode.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.3)
      oscillator.stop(audioCtx.currentTime + 0.3)
      setTimeout(() => audioCtx.close(), 500)
    } catch (error) {
      console.error("Failed to play fallback beep:", error)
    }
  }, [volume])

  const play = useCallback(() => {
    if (!isEnabled) return
    if (audioRef.current && isLoaded) {
      audioRef.current.currentTime = 0
      audioRef.current.play().catch(() => playFallbackBeep())
    } else {
      playFallbackBeep()
    }
  }, [isEnabled, isLoaded, playFallbackBeep])

  return { play, isEnabled, setIsEnabled, volume, setVolume }
}

const SoundControlDialog = ({
  isEnabled,
  onToggle,
  volume,
  onVolumeChange,
}: {
  isEnabled: boolean
  onToggle: () => void
  volume: number
  onVolumeChange: (value: number) => void
}) => {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Sound Settings</DialogTitle>
          <DialogDescription>Configure notification sound preferences</DialogDescription>
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
                  const audio = new Audio(
                    "https://www.soundjay.com/misc/sounds/bell-ringing-05.mp3"
                  )
                  audio.volume = volume
                  audio.play().catch(() => {})
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
  )
}

const SoundToggleButton = ({
  isEnabled,
  onToggle,
}: {
  isEnabled: boolean
  onToggle: () => void
}) => (
  <Button
    variant="ghost"
    size="icon"
    onClick={onToggle}
    className="h-8 w-8"
    title={isEnabled ? "Sound notifications on" : "Sound notifications off"}
  >
    {isEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
  </Button>
)

const NotificationToast = ({
  title,
  message,
  onClose,
}: {
  title: string
  message: string
  onClose: () => void
}) => (
  <motion.div
    initial={{ opacity: 0, y: -50, x: "-50%" }}
    animate={{ opacity: 1, y: 0, x: "-50%" }}
    exit={{ opacity: 0, y: -50, x: "-50%" }}
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
      <div className="h-1 bg-green-500 animate-progress" style={{ animationDuration: "4000ms" }} />
    </div>
  </motion.div>
)

export default function OrderManagement() {
  const { data: session } = useSession()
  const [orders, setOrders] = useState<Order[]>([])
  const [waitresses, setWaitresses] = useState<Waitress[]>([])
  const [loading, setLoading] = useState(true)
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
  } | null>(null)
  const itemsPerPage = 12

  const userRole = session?.user?.role
  const isAdmin = isAdminUser(userRole)
  const currentUser = session?.user
    ? { name: session.user.name, email: session.user.email }
    : null

  const {
    play: playNotificationSound,
    isEnabled: soundEnabled,
    setIsEnabled: setSoundEnabled,
    volume,
    setVolume,
  } = useNotificationSound()
  const [showNotification, setShowNotification] = useState(false)
  const [notificationData, setNotificationData] = useState({ title: "", message: "" })

  const lastOrderIdsRef = useRef<string[]>([])
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastFetchTimeRef = useRef<string>(new Date().toISOString())
  const isMountedRef = useRef<boolean>(true)

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
      }
    }
  }, [])

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
          setTotalPages(Math.ceil(ordersWithFlags.length / itemsPerPage))
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
    [itemsPerPage, isAdmin]
  )

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

        if (!response.ok) throw new Error("Failed to update item status")

        const data = await response.json()
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

        fetchOrders(false)
      } catch (error) {
        console.error("Error toggling item uneditable status:", error)
        toast.error(error instanceof Error ? error.message : "Failed to update item status")
      }
    },
    [fetchOrders, session]
  )

  const handleDeleteOrder = async (orderId: string) => {
    if (!isAdmin) {
      toast.error("Only administrators can delete orders")
      return
    }
    try {
      const response = await fetch(`/api/order/${orderId}`, { method: "DELETE" })
      if (!response.ok) throw new Error("Failed to delete order")
      toast.success("Order deleted successfully")
      fetchOrders()
    } catch (error) {
      console.error("Error deleting order:", error)
      toast.error("Failed to delete order")
    }
  }

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
            playNotificationSound()
            const orderType = order.inTable ? "In-Table" : order.delivery ? "Delivery" : "POS"
            const restaurantName = getRestaurantDisplayName(order)
            setNotificationData({
              title: `New ${orderType} Order #${order.orderNumber}`,
              message: `${restaurantName} | Table ${order.tableNumber} | ${
                order.items?.length || 0
              } items`,
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
  }, [playNotificationSound, fetchOrders, isAdmin])

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

  useEffect(() => {
    const initialize = async () => {
      await Promise.all([fetchOrders(true), fetchWaitresses()])
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

  const handleStatusUpdate = async (orderId: string, newStatus: OrderStatus) => {
    try {
      const response = await fetch(`/api/order/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
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

  const filteredAndSortedOrders = useMemo(() => {
    let filtered = orders.filter((order) => {
      if (order.deletedAt) return false

      const matchesSearch =
        order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.tableNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (order.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) || false)

      const matchesStatus = !statusFilter || order.status === statusFilter
      const matchesWaitress = !waitressFilter || order.waiterId === waitressFilter
      const matchesDate =
        !dateFilter || new Date(order.createdAt).toDateString() === dateFilter.toDateString()
      const matchesType =
        !orderTypeFilter ||
        (orderTypeFilter === "intable" && order.inTable === true) ||
        (orderTypeFilter === "delivery" && order.delivery === true) ||
        (orderTypeFilter === "pos" && !order.inTable && !order.delivery)
      const matchesMarked = !showMarkedOnly || order.markedForDeletion === true

      let orderRestaurantId = getOrderRestaurantId(order)
      const matchesRestaurant = !restaurantFilter || orderRestaurantId === restaurantFilter

      return (
        matchesSearch &&
        matchesStatus &&
        matchesWaitress &&
        matchesDate &&
        matchesType &&
        matchesRestaurant &&
        matchesMarked
      )
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
  }, [
    orders,
    searchTerm,
    statusFilter,
    waitressFilter,
    restaurantFilter,
    dateFilter,
    orderTypeFilter,
    sortField,
    sortDirection,
    showMarkedOnly,
  ])

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

  const handleSort = useCallback(
    (field: keyof Order) => {
      if (field === sortField) {
        setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"))
      } else {
        setSortField(field)
        setSortDirection("asc")
      }
    },
    [sortField]
  )

  const handleClearFilters = useCallback(() => {
    setSearchTerm("")
    setStatusFilter(null)
    setWaitressFilter(null)
    setRestaurantFilter(null)
    setOrderTypeFilter(null)
    setDateFilter(null)
    setShowMarkedOnly(false)
  }, [])

  const handleSearchDebounced = useMemo(() => debounce((value: string) => setSearchTerm(value), 300), [])

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
    const restaurantId = getOrderRestaurantId(order)
    if (restaurantId === "manyazewal1") {
      return (
        <Badge variant="outline" className="bg-indigo-100 text-indigo-800">
          <Building2 className="h-3 w-3 mr-1" />
          Manyazewal 1
        </Badge>
      )
    } else if (restaurantId === "manyazewal2") {
      return (
        <Badge variant="outline" className="bg-rose-100 text-rose-800">
          <Building2 className="h-3 w-3 mr-1" />
          Manyazewal 2
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

  const filterBar = (
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
              setStatusFilter(value === "All" ? null : (value as OrderStatus))
            }
          >
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
          <Select
            value={restaurantFilter || "All"}
            onValueChange={(value) => setRestaurantFilter(value === "All" ? null : value)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by Restaurant" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Restaurants</SelectItem>
              <SelectItem value="manyazewal1">Manyazewal 1 (Delivery)</SelectItem>
              <SelectItem value="manyazewal2">Manyazewal 2</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={orderTypeFilter || "All"}
            onValueChange={(value) => setOrderTypeFilter(value === "All" ? null : value)}
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
            onValueChange={(value) => setWaitressFilter(value === "All" ? null : value)}
          >
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
          <Button
            variant={showMarkedOnly ? "destructive" : "outline"}
            onClick={() => setShowMarkedOnly(!showMarkedOnly)}
            className="gap-2"
          >
            <Flag className="h-4 w-4" />
            {showMarkedOnly ? "Showing Marked" : "Show Marked"}
          </Button>
          <Button onClick={handleClearFilters} variant="secondary">
            <RefreshCcw className="mr-2 h-4 w-4" />
            Clear
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

  const orderListView = useMemo(() => {
    if (viewMode === "list") {
      return (
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order #</TableHead>
                  <TableHead>Restaurant</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Waitress</TableHead>
                  <TableHead>Table</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Locked</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedOrders.map((order) => {
                  const waitress = waitresses.find((w) => w._id === order.waiterId)
                  const displayItems = order.orderItems || order.items
                  const lockedCount = displayItems.filter((item) => item.isUneditable).length

                  return (
                    <TableRow key={order._id} className={order.markedForDeletion ? "bg-yellow-50/50" : ""}>
                      <TableCell className="font-medium">{order.orderNumber}</TableCell>
                      <TableCell>{getRestaurantDisplay(order)}</TableCell>
                      <TableCell>{getOrderTypeDisplay(order)}</TableCell>
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
                          <Badge variant="outline" className="bg-gray-50 text-gray-400">
                            0
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {order.finalAmount.toLocaleString("en-ET", {
                          style: "currency",
                          currency: "ETB",
                        })}
                      </TableCell>
                      <TableCell>{new Date(order.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <OrderDetailModal
                            order={order}
                            waitresses={waitresses}
                            isAdmin={isAdmin}
                            onToggleItemUneditable={handleToggleItemUneditable}
                          />
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              {isAdmin ? (
                                <DeleteOrderDialog
                                  orderId={order._id}
                                  onDelete={() => handleDeleteOrder(order._id)}
                                />
                              ) : (
                                <MarkForDeletionDialog
                                  order={order}
                                  onMarkForDeletion={handleMarkForDeletion}
                                  currentUser={currentUser}
                                />
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuLabel>Change Status</DropdownMenuLabel>
                              {statusOptions.map((status) => (
                                <DropdownMenuItem
                                  key={status}
                                  onClick={() => handleStatusUpdate(order._id, status)}
                                >
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
              isAdmin={isAdmin}
              currentUser={currentUser}
              onDelete={handleDeleteOrder}
              onMarkForDeletion={handleMarkForDeletion}
              onStatusUpdate={handleStatusUpdate}
              onToggleItemUneditable={handleToggleItemUneditable}
            />
          ))}
        </div>
      )
    }
  }, [
    viewMode,
    paginatedOrders,
    waitresses,
    isAdmin,
    currentUser,
    handleToggleItemUneditable,
  ])

  if (!session) {
    return (
      <div className="container mx-auto p-4 flex items-center justify-center min-h-screen">
        <Card className="max-w-md w-full text-center p-8">
          <Shield className="h-16 w-16 mx-auto mb-4 text-purple-900" />
          <CardTitle className="text-2xl mb-2">Authentication Required</CardTitle>
          <CardDescription>Please login to access order management.</CardDescription>
          <Button
            className="mt-4 bg-gradient-to-r from-purple-800 to-purple-900"
            onClick={() => (window.location.href = "/login")}
          >
            Go to Login
          </Button>
        </Card>
      </div>
    )
  }

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
            Showing active orders + completed orders from last 2 hours. Older completed orders are
            automatically hidden.
          </AlertDescription>
        </Alert>
      )}

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
          <Badge
            variant="outline"
            className={isAdmin ? "bg-red-100 text-red-800" : "bg-blue-100 text-blue-800"}
          >
            {isAdmin ? (
              <>
                <ShieldAlert className="h-3 w-3 mr-1" />
                Admin
              </>
            ) : (
              <>
                <Shield className="h-3 w-3 mr-1" />
                {userRole || "Staff"}
              </>
            )}
          </Badge>
        </div>
        <Button onClick={() => fetchOrders(true)} variant="outline" size="icon" disabled={loading}>
          <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
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
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>

      <style jsx global>{`
        @keyframes progress {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }
        .animate-progress {
          animation: progress linear forwards;
        }
      `}</style>
    </div>
  )
}