// components/orders/OrderCard.tsx
"use client"

import React, { useState } from "react"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  MoreHorizontal,
  Eye,
  Trash2,
  Flag,
  Clock,
  MapPin,
  Users,
  DollarSign,
  Lock,
  AlertTriangle,
  ShieldAlert,
  Building2,
  Home,
  Truck,
  ShoppingBag,
  MessageSquare,
  User,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Loader2,
} from "lucide-react"
import type { Order, Waitress, Restaurant, OrderStatus, OrderItem } from "@/types/order"
import { OrderDetailModal } from "./OrderDetailModal"

// Status constants
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

interface OrderCardProps {
  order: Order
  waitresses: Waitress[]
  restaurants: Restaurant[]
  isAdmin: boolean
  currentUser: { name?: string | null; email?: string | null } | null
  onDelete: (id: string) => Promise<void>
  onMarkForDeletion: (id: string, reason: string) => Promise<void>
  onStatusUpdate: (id: string, status: OrderStatus) => Promise<void>
  onToggleItemUneditable?: (orderId: string, itemIndex: number, isUneditable: boolean) => Promise<void>
  onRetryStock?: (orderId: string) => Promise<void>
  StockStatusBadge: React.ComponentType<{ order: Order }>
  onStopSound?: () => void
  checkinStaff?: Array<{ id: string; _id?: string; name: string; email?: string; role?: string }>
  onAssignCheckin?: (orderId: string, checkedInUser: { userId: string; name: string }, scope: "order" | "item" | "all", itemIndex?: number) => Promise<void>
  assigning?: boolean
}

// Delete Order Dialog Component
const DeleteOrderDialog = ({ orderId, onDelete }: { orderId: string; onDelete: () => Promise<void> }) => {
  const [isDeleting, setIsDeleting] = useState(false)
  const [open, setOpen] = useState(false)
  
  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      await onDelete()
      setOpen(false)
    } finally {
      setIsDeleting(false)
    }
  }
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <div className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 text-red-600">
          <Trash2 className="mr-2 h-4 w-4" />
          <span>Delete Order</span>
        </div>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Order?</DialogTitle>
          <DialogDescription>
            This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
            {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Mark for Deletion Dialog Component
const MarkForDeletionDialog = ({ order, onMarkForDeletion, currentUser }: any) => {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const handleSubmit = async () => {
    if (!reason.trim()) return
    setIsSubmitting(true)
    await onMarkForDeletion(order._id, reason)
    setIsSubmitting(false)
    setOpen(false)
    setReason("")
  }
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <div className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 text-yellow-600">
          <Flag className="mr-2 h-4 w-4" />
          <span>Mark for Deletion</span>
        </div>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mark Order #{order.orderNumber} for Deletion</DialogTitle>
          <DialogDescription>Please provide a reason.</DialogDescription>
        </DialogHeader>
        <textarea
          className="w-full p-2 border rounded-md"
          placeholder="Enter reason..."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={4}
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !reason.trim()}>
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function OrderCard({
  order,
  waitresses,
  restaurants,
  isAdmin,
  currentUser,
  onDelete,
  onMarkForDeletion,
  onStatusUpdate,
  onToggleItemUneditable,
  onRetryStock,
  StockStatusBadge,
  onStopSound,
  checkinStaff,
  onAssignCheckin,
  assigning,
}: OrderCardProps) {
  const waitress = waitresses.find((w) => w._id === order.waiterId)
  const hasSpecialRequirements = !!(order.specialRequirements || order.notes)
  const edited = order.isEdited || false
  const markedForDeletion = order.markedForDeletion || false
  const displayItems: OrderItem[] = (order as any)._stationFilteredItems || order.orderItems || order.items
  const uneditableCount = displayItems.filter((item: any) => item.isUneditable).length
  const hasStockError = !order.stockProcessed && order.stockProcessingError
  const assignedItemCount = displayItems.filter((item: any) => item.checkinUserName && order.checkinUserName && item.checkinUserName === order.checkinUserName).length

  // Get order type badge
  const getOrderTypeBadge = () => {
    if (order.inTable === true) {
      return {
        icon: <Home className="h-3 w-3" />,
        label: "In-Table",
        color: "bg-green-100 text-green-800 border-green-200",
      }
    } else if (order.delivery === true) {
      return {
        icon: <Truck className="h-3 w-3" />,
        label: "Delivery",
        color: "bg-blue-100 text-blue-800 border-blue-200",
      }
    } else {
      return {
        icon: <ShoppingBag className="h-3 w-3" />,
        label: "POS",
        color: "bg-purple-100 text-purple-800 border-purple-200",
      }
    }
  }

  const orderTypeBadge = getOrderTypeBadge()

  // Get restaurant badge
  const getRestaurantBadge = () => {
    const restaurant = restaurants.find(r => r._id === order.restaurantId) ||
                      (order.restaurantName ? { _id: order.restaurantName, name: order.restaurantName, isActive: true } as Restaurant : null)
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

  const restaurantBadge = getRestaurantBadge()

  return (
    <Card
      className={`hover:shadow-lg transition-shadow duration-300 relative overflow-hidden ${
        markedForDeletion
          ? "border-yellow-500 bg-yellow-50/50 dark:bg-yellow-900/10"
          : hasStockError
          ? "border-red-300 bg-red-50/30 dark:bg-red-900/5"
          : ""
      }`}
    >
      {/* Top badges row */}
      <div className="absolute top-2 left-2 z-10 flex flex-wrap gap-1">
        {markedForDeletion && (
          <Badge className="bg-yellow-500 text-white">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Pending Deletion
          </Badge>
        )}
        {isAdmin && !markedForDeletion && (
          <Badge className="bg-red-100 text-red-800">
            <ShieldAlert className="h-3 w-3 mr-1" />
            Admin Access
          </Badge>
        )}
        {restaurantBadge && !markedForDeletion && !isAdmin && (
          <Badge className={restaurantBadge.color}>
            {restaurantBadge.icon}
            <span className="ml-1 text-xs">{restaurantBadge.label}</span>
          </Badge>
        )}
        <Badge className={orderTypeBadge.color}>
          {orderTypeBadge.icon}
          <span className="ml-1 text-xs">{orderTypeBadge.label}</span>
        </Badge>
      </div>

      {/* Right side badges */}
      <div className="absolute top-2 right-2 z-10 flex flex-wrap gap-1 justify-end">
        <StockStatusBadge order={order} />
        {uneditableCount > 0 && (
          <Badge variant="outline" className="bg-green-50 text-green-700 text-xs">
            <Lock className="h-3 w-3 mr-1" />
            {uneditableCount} Locked
          </Badge>
        )}
        {edited && !uneditableCount && (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 text-xs">
            <Clock className="h-3 w-3 mr-1" />
            Edited
          </Badge>
        )}
      </div>

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
        {order.checkinUserName && (
          <div className="text-xs mt-1 inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5">
            <User className="h-3 w-3" />
            <span>Kitchen: {order.checkinUserName}</span>
            {assignedItemCount > 0 && (
              <Badge variant="outline" className="ml-1 h-4 px-1 text-[10px] bg-white text-emerald-700">
                {assignedItemCount} item{assignedItemCount !== 1 ? "s" : ""}
              </Badge>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Stock Error Details */}
        {hasStockError && (
          <div className="bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-red-700 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-xs font-semibold text-red-800 mb-1">Stock Processing Failed:</p>
                <p className="text-xs text-red-700">{order.stockProcessingError}</p>
                {order.stockProcessingFailedAt && (
                  <p className="text-xs text-red-600 mt-1">
                    Failed at: {new Date(order.stockProcessingFailedAt).toLocaleString()}
                  </p>
                )}
                {onRetryStock && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onRetryStock(order._id)}
                    className="mt-2 h-7 text-xs gap-1 border-red-300 text-red-700 hover:bg-red-50"
                  >
                    <RefreshCw className="h-3 w-3" />
                    Retry Processing
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

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

        {markedForDeletion && order.deletionRequestReason && (
          <div className="bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-700 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-xs font-semibold text-yellow-800 mb-1">Deletion Request:</p>
                <p className="text-xs text-yellow-700 line-clamp-2">
                  {order.deletionRequestReason}
                </p>
                {order.deletionRequestedBy && (
                  <p className="text-xs text-yellow-600 mt-1">
                    Requested by: {order.deletionRequestedBy}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {hasSpecialRequirements && !markedForDeletion && !hasStockError && (
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

        {order.stockProcessed && order.stockProcessedAt && (
          <div className="text-xs text-green-600 flex items-center gap-1 pt-1 border-t">
            <CheckCircle className="h-3 w-3" />
            Stock deducted: {new Date(order.stockProcessedAt).toLocaleString()}
          </div>
        )}

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
          restaurants={restaurants}
          isAdmin={isAdmin}
          onToggleItemUneditable={onToggleItemUneditable}
          StockStatusBadge={StockStatusBadge}
          onStopSound={onStopSound}
          checkinStaff={checkinStaff}
          onAssignCheckin={onAssignCheckin}
          assigning={assigning}
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
            {Object.keys(statusIcons).map((status) => (
              <DropdownMenuItem key={status} onClick={() => onStatusUpdate(order._id, status as OrderStatus)}>
                {statusIcons[status as OrderStatus]}
                <span className="ml-2">{status}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </CardFooter>
    </Card>
  )
}