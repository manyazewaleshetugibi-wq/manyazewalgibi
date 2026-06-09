// components/orders/OrderDetailModal.tsx
"use client"

import React, { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Eye,
  Clock,
  MapPin,
  Users,
  DollarSign,
  CreditCard,
  User,
  Phone,
  Truck,
  Utensils,
  MessageSquare,
  Receipt,
  Building2,
  AlertTriangle,
  ShieldAlert,
  Lock,
  Unlock,
  Loader2,
  Home,
  ShoppingBag,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react"
import type { Order, Waitress, MenuItem, Restaurant, OrderItem } from "@/types/order"

// Status constants
const statusIcons: Record<string, React.ReactNode> = {
  PENDING: <Clock className="h-4 w-4" />,
  CONFIRMED: <span className="h-4 w-4">✓</span>,
  PREPARING: <span className="h-4 w-4">👨‍🍳</span>,
  PICKUP: <span className="h-4 w-4">🚚</span>,
  SERVED: <span className="h-4 w-4">☕</span>,
  COMPLETED: <CheckCircle className="h-4 w-4" />,
  CANCELLED: <XCircle className="h-4 w-4" />,
}

const statusColors: Record<string, string> = {
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

const BATCH_SIZE_LIMIT = 100
const menuItemsCache = new Map<string, { data: Map<string, MenuItem>; timestamp: number }>()
const CACHE_DURATION = 5 * 60 * 1000

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

interface OrderDetailModalProps {
  order: Order
  waitresses: Waitress[]
  restaurants: Restaurant[]
  isAdmin: boolean
  onToggleItemUneditable?: (orderId: string, itemIndex: number, isUneditable: boolean) => Promise<void>
  StockStatusBadge: React.ComponentType<{ order: Order }>
  onStopSound?: () => void
}

export const OrderDetailModal = React.memo(function OrderDetailModal({
  order,
  waitresses,
  restaurants,
  isAdmin,
  onToggleItemUneditable,
  StockStatusBadge,
  onStopSound,
}: OrderDetailModalProps) {
  const [waitress, setWaitress] = useState<Waitress | null>(null)
  const [menuItems, setMenuItems] = useState<Map<string, MenuItem>>(new Map())
  const [loadingItems, setLoadingItems] = useState(true)

  const displayItems = order.orderItems || order.items
  const orderTypeBadge = order.inTable ? orderTypeBadges.intable : order.delivery ? orderTypeBadges.delivery : orderTypeBadges.pos
  
  // Find restaurant dynamically
  const getRestaurantById = (restaurants: Restaurant[], restaurantId?: string): Restaurant | null => {
    if (!restaurantId) return null
    return restaurants.find(r => r._id === restaurantId) || null
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

  const getRestaurantBadge = (restaurant: Restaurant | null) => {
    if (!restaurant) return null
    const colorIndex = restaurant.name.length % 5
    const colors = [
      "bg-indigo-100 text-indigo-800 border-indigo-200",
      "bg-rose-100 text-rose-800 border-rose-200",
      "bg-emerald-100 text-emerald-800 border-emerald-200",
      "bg-amber-100 text-amber-800 border-amber-200",
      "bg-cyan-100 text-cyan-800 border-cyan-200",
    ]
    return {
      icon: <Building2 className="h-3 w-3" />,
      label: restaurant.name,
      color: colors[colorIndex],
    }
  }

  const orderRestaurantId = getOrderRestaurantId(order)
  const restaurant = getRestaurantById(restaurants, orderRestaurantId || undefined) || 
                    (order.restaurantName ? { _id: order.restaurantName, name: order.restaurantName, isActive: true } as Restaurant : null)
  const restaurantBadge = getRestaurantBadge(restaurant)

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
  const hasStockError = !order.stockProcessed && order.stockProcessingError

  const handleOpen = () => {
    // Stop notification sound when opening details
    if (onStopSound) {
      onStopSound()
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" onClick={handleOpen}>
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
            <StockStatusBadge order={order} />
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
            {/* Stock Error Details */}
            {hasStockError && (
              <Card className="border-red-500 bg-red-50/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-semibold flex items-center text-red-800">
                    <XCircle className="mr-2 h-5 w-5 text-red-600" />
                    Stock Processing Failed
                  </CardTitle>
                  <CardDescription className="text-red-700">
                    The stock deduction for this order failed
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="bg-white/70 rounded-lg p-4 space-y-2">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-red-800">Error message:</p>
                        <p className="text-sm text-red-700 mt-1 whitespace-pre-wrap">
                          {order.stockProcessingError}
                        </p>
                      </div>
                    </div>
                    {order.stockProcessingFailedAt && (
                      <div className="flex items-center gap-2 text-xs text-red-600 pt-2 border-t border-red-200">
                        <Clock className="h-3 w-3" />
                        <span>Failed at: {new Date(order.stockProcessingFailedAt).toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Stock Processed Info */}
            {order.stockProcessed && order.stockProcessedAt && (
              <Card className="border-green-500 bg-green-50/50">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-green-700">
                    <CheckCircle className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      Stock processed on {new Date(order.stockProcessedAt).toLocaleString()}
                    </span>
                    {order.stockProcessingNote && (
                      <span className="text-xs text-green-600 ml-2">
                        ({order.stockProcessingNote})
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Deletion Request Info */}
            {markedForDeletion && order.deletionRequestReason && (
              <Card className="border-yellow-500 bg-yellow-50/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-semibold flex items-center text-yellow-800">
                    <AlertTriangle className="mr-2 h-5 w-5 text-yellow-600" />
                    Deletion Request Information
                  </CardTitle>
                  <CardDescription className="text-yellow-700">
                    This order has been marked for deletion by staff
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="bg-white/70 rounded-lg p-4 space-y-2">
                    <div className="flex items-start gap-2">
                      <MessageSquare className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-yellow-800">Reason for deletion:</p>
                        <p className="text-sm text-yellow-700 mt-1 whitespace-pre-wrap">
                          {order.deletionRequestReason}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-yellow-600 pt-2 border-t border-yellow-200">
                      <User className="h-3 w-3" />
                      <span>Requested by: {order.deletionRequestedBy || "Unknown"}</span>
                      {order.deletionRequestedAt && (
                        <>
                          <Clock className="h-3 w-3 ml-2" />
                          <span>
                            Requested on: {new Date(order.deletionRequestedAt).toLocaleString()}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Main Info Grid */}
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
                    <span className="font-medium">{restaurant?.name || "Unknown Restaurant"}</span>
                  </div>
                  {restaurant?.address && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{restaurant.address}</span>
                    </div>
                  )}
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

            {/* Special Requirements */}
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

            {/* Order Items */}
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
                    <table className="w-full">
                      <thead className="border-b">
                        <tr>
                          <th className="text-left p-2">Item</th>
                          <th className="w-20 text-center p-2">Qty</th>
                          <th className="w-28 text-right p-2">Unit Price</th>
                          <th className="w-28 text-right p-2">Subtotal</th>
                          <th className="w-40 text-center p-2">Lock Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {displayItems.map((item, index) => {
                          const menuItem = menuItems.get(item.itemId)
                          const isUneditable = item.isUneditable || false
                          return (
                            <tr key={index} className={`border-b ${isUneditable ? "bg-green-50/30" : ""}`}>
                              <td className="p-2">
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
                              </td>
                              <td className="text-center p-2">{item.quantity}</td>
                              <td className="text-right p-2">
                                {(item.unitPrice || item.price || 0).toLocaleString("en-ET", {
                                  style: "currency",
                                  currency: "ETB",
                                })}
                              </td>
                              <td className="text-right p-2">
                                {(item.subtotal || 0).toLocaleString("en-ET", {
                                  style: "currency",
                                  currency: "ETB",
                                })}
                              </td>
                              <td className="text-center p-2">
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
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Order Summary */}
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
})

OrderDetailModal.displayName = "OrderDetailModal"