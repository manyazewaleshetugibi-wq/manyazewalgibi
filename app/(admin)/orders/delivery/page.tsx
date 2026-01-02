"use client"

import React, { useState, useEffect, useCallback } from "react"
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
  Truck,
  Package,
  Phone,
  User,
  Home,
  Navigation,
  CreditCard,
  Receipt,
  Loader2,
  MessageSquare,
  PhoneCall,
  Map,
  ShoppingBag,
} from "lucide-react"

// Updated Delivery Status based on backend API
type DeliveryStatus = "PENDING" | "CONFIRMED" | "PREPARING" | "PICKUP" | "SERVED" | "OUT_FOR_DELIVERY" | "DELIVERED" | "COMPLETED" | "CANCELLED"

type DeliveryOrder = {
  _id: string
  orderNumber: string
  userId?: string
  waiterId?: string
  deliveryAddress?: string
  deliveryInfo?: {
    fullName?: string
    phoneNumber?: string
    email?: string
    address?: string
    city?: string
    landmark?: string
    deliveryInstructions?: string
  }
  note?: string
  specialRequirements?: string
  items: Array<{
    itemId: string
    itemName?: string
    quantity: number
    unitPrice?: number
    subtotal?: number
    specialInstructions?: string
  }>
  status: DeliveryStatus
  totalAmount: number
  subtotal?: number
  deliveryFee?: number
  discount: number
  tax: number
  finalAmount: number
  paymentMethod: string
  transactionId?: string
  paymentScreenshotUrl?: string
  isActive: boolean
  delivery: boolean
  inTable: boolean
  tableNumber?: string
  createdAt: string
  updatedAt: string
  completedAt?: string
  userDetails?: {
    name?: string
    email?: string
    phone?: string
  }
  itemsDetails?: Array<{
    _id: string
    name: string
    price: number
  }>
}

const statusOptions: DeliveryStatus[] = ["PENDING", "CONFIRMED", "PREPARING", "PICKUP", "SERVED", "OUT_FOR_DELIVERY", "DELIVERED", "COMPLETED", "CANCELLED"]

const statusIcons: Record<DeliveryStatus, React.ReactNode> = {
  PENDING: <Clock className="h-4 w-4" />,
  CONFIRMED: <CheckCircle className="h-4 w-4" />,
  PREPARING: <Package className="h-4 w-4" />,
  PICKUP: <Truck className="h-4 w-4" />,
  SERVED: <CheckCircle className="h-4 w-4" />,
  OUT_FOR_DELIVERY: <Truck className="h-4 w-4" />,
  DELIVERED: <CheckCircle className="h-4 w-4" />,
  COMPLETED: <CheckCircle className="h-4 w-4" />,
  CANCELLED: <XCircle className="h-4 w-4" />,
}

const statusColors: Record<DeliveryStatus, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  CONFIRMED: "bg-blue-100 text-blue-800",
  PREPARING: "bg-purple-100 text-purple-800",
  PICKUP: "bg-indigo-100 text-indigo-800",
  SERVED: "bg-green-100 text-green-800",
  OUT_FOR_DELIVERY: "bg-indigo-100 text-indigo-800",
  DELIVERED: "bg-green-100 text-green-800",
  COMPLETED: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-800",
}

const paymentMethodIcons: Record<string, React.ReactNode> = {
  CASH: <DollarSign className="h-4 w-4" />,
  CARD: <CreditCard className="h-4 w-4" />,
  MOBILE_BANKING: <Phone className="h-4 w-4" />,
  ONLINE: <Navigation className="h-4 w-4" />,
  "MOBILE MONEY": <Phone className="h-4 w-4" />,
}

const DeleteDeliveryDialog = ({ orderId, onDelete }: { orderId: string; onDelete: () => Promise<void> }) => {
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
            This action cannot be undone. This will permanently delete the delivery order and remove all associated data from our servers.
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

export default function DeliveryManagement() {
  const [deliveryOrders, setDeliveryOrders] = useState<DeliveryOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<DeliveryStatus | "all" | "notConfirmed">("notConfirmed") // Default to notConfirmed
  const [paymentFilter, setPaymentFilter] = useState<string | null>(null)
  const [dateFilter, setDateFilter] = useState<Date | null>(null)
  const [sortField, setSortField] = useState<keyof DeliveryOrder>("createdAt")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [viewMode, setViewMode] = useState<"list" | "grid">("grid")
  const itemsPerPage = 12

  const fetchDeliveryOrders = useCallback(async () => {
    setLoading(true)
    try {
      // Build query parameters
      const params = new URLSearchParams()
      if (statusFilter && statusFilter !== "all") {
        params.append("status", statusFilter)
      }
      
      const response = await fetch(`/api/delivery?${params.toString()}`)
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to fetch delivery orders")
      }
      
      const data = await response.json()
      
      // Handle the response format from the updated API
      const orders = data.orders || data.data || []
      setDeliveryOrders(orders)
      setTotalPages(Math.ceil(orders.length / itemsPerPage))
    } catch (error) {
      console.error("Error fetching delivery orders:", error)
      toast.error(error instanceof Error ? error.message : "Failed to fetch delivery orders")
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    fetchDeliveryOrders()
  }, [fetchDeliveryOrders])

  const handleDeleteOrder = async (orderId: string) => {
    try {
      const response = await fetch(`/api/delivery/${orderId}`, {
        method: "DELETE",
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to delete delivery order")
      }
      toast.success("Delivery order deleted successfully")
      fetchDeliveryOrders()
    } catch (error) {
      console.error("Error deleting delivery order:", error)
      toast.error(error instanceof Error ? error.message : "Failed to delete delivery order")
    }
  }

  const handleStatusUpdate = async (orderId: string, newStatus: DeliveryStatus) => {
    try {
      console.log(`Updating order ${orderId} to status: ${newStatus}`)
      
      const response = await fetch(`/api/delivery/${orderId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || `Failed to update delivery status: ${response.status}`)
      }
      
      toast.success(data.message || "Delivery status updated successfully")
      
      // Use the flag from the backend to decide whether to remove the order
      if (data.shouldRemove && (statusFilter === "PENDING" || statusFilter === "notConfirmed")) {
        setDeliveryOrders(prev => prev.filter(order => order._id !== orderId))
      } else {
        // For other statuses, update the order in place so it stays visible
        setDeliveryOrders(prev => prev.map(order => 
          order._id === orderId ? (data.order || { ...order, status: newStatus }) : order
        ))
      }
    } catch (error) {
      console.error("Error updating delivery status:", error)
      toast.error(error instanceof Error ? error.message : "Failed to update delivery status")
    }
  }

  const filteredOrders = deliveryOrders.filter((order) => {
    const matchesSearch =
      order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.deliveryInfo?.fullName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.deliveryInfo?.phoneNumber || "").includes(searchTerm)
    const matchesStatus = statusFilter === "all" || 
      (statusFilter === "notConfirmed" && order.status !== "CONFIRMED") || 
      order.status === statusFilter
    const matchesDate = !dateFilter || new Date(order.createdAt).toDateString() === dateFilter.toDateString()

    return matchesSearch && matchesStatus && matchesDate
  })

  const sortedOrders = [...filteredOrders].sort((a, b) => {
    const aValue = a[sortField]
    const bValue = b[sortField]
    if (aValue === bValue) return 0
    if (aValue === undefined || aValue === null) return 1
    if (bValue === undefined || bValue === null) return -1
    if (aValue < bValue) return sortDirection === "asc" ? -1 : 1
    if (aValue > bValue) return sortDirection === "asc" ? 1 : -1
    return 0
  })

  const paginatedOrders = sortedOrders.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  const handleSort = (field: keyof DeliveryOrder) => {
    if (field === sortField) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  const DeliveryDetailModal = ({ order }: { order: DeliveryOrder }) => {
    const handleCallCustomer = () => {
      if (order.deliveryInfo?.phoneNumber) {
        window.open(`tel:${order.deliveryInfo.phoneNumber}`, '_blank')
      }
    }

    const handleMessageCustomer = () => {
      if (order.deliveryInfo?.phoneNumber) {
        window.open(`https://wa.me/${order.deliveryInfo.phoneNumber}?text=Hello ${order.deliveryInfo?.fullName || "Customer"}, regarding your delivery order #${order.orderNumber}`, '_blank')
      }
    }

    const handleOpenMaps = () => {
      if (order.deliveryInfo?.address) {
        const address = encodeURIComponent(`${order.deliveryInfo.address}, ${order.deliveryInfo.city || ""}`)
        window.open(`https://www.google.com/maps/dir/?api=1&destination=${address}`, '_blank')
      }
    }

    return (
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="ghost" size="icon">
            <Eye className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center">
              <Truck className="mr-2 h-6 w-6" />
              Delivery Order Details
            </DialogTitle>
            <DialogDescription>
              Order #{order.orderNumber} - {new Date(order.createdAt).toLocaleString()}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[70vh] pr-4">
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Customer Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold flex items-center">
                      <User className="mr-2 h-5 w-5" />
                      Customer Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-lg">{order.deliveryInfo?.fullName || "Unknown Customer"}</p>
                        <p className="text-sm text-muted-foreground">{order.deliveryInfo?.phoneNumber || "No Phone"}</p>
                        {order.deliveryInfo?.email && (
                          <p className="text-sm text-muted-foreground">{order.deliveryInfo.email}</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          size="icon" 
                          variant="outline" 
                          onClick={handleCallCustomer}
                          disabled={!order.deliveryInfo?.phoneNumber}
                        >
                          <PhoneCall className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="icon" 
                          variant="outline" 
                          onClick={handleMessageCustomer}
                          disabled={!order.deliveryInfo?.phoneNumber}
                        >
                          <MessageSquare className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Delivery Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold flex items-center">
                      <MapPin className="mr-2 h-5 w-5" />
                      Delivery Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <Home className="mr-2 h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">Address</span>
                        </div>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={handleOpenMaps}
                          disabled={!order.deliveryInfo?.address}
                        >
                          <Map className="h-4 w-4 mr-1" /> Open Map
                        </Button>
                      </div>
                      <p className="text-sm pl-6">{order.deliveryInfo?.address || "No address"}</p>
                      <p className="text-sm pl-6 text-muted-foreground">{order.deliveryInfo?.city || ""}</p>
                      {order.deliveryInfo?.landmark && (
                        <p className="text-sm pl-6 text-muted-foreground">
                          <span className="font-medium">Landmark:</span> {order.deliveryInfo.landmark}
                        </p>
                      )}
                    </div>
                    {order.deliveryInfo?.deliveryInstructions && (
                      <div className="pt-2 border-t">
                        <p className="text-sm font-medium">Delivery Instructions:</p>
                        <p className="text-sm text-muted-foreground">{order.deliveryInfo.deliveryInstructions}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Order Items */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-semibold flex items-center">
                    <ShoppingBag className="mr-2 h-5 w-5" />
                    Order Items
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Unit Price</TableHead>
                        <TableHead>Subtotal</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {order.items.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{item.itemName || `Item ${index + 1}`}</TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>
                            {item.unitPrice?.toLocaleString("en-ET", { style: "currency", currency: "ETB" }) || "N/A"}
                          </TableCell>
                          <TableCell>
                            {item.subtotal?.toLocaleString("en-ET", { style: "currency", currency: "ETB" }) || "N/A"}
                          </TableCell>
                          <TableCell>
                            <span className="text-xs text-muted-foreground">{item.specialInstructions || "-"}</span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Order Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-semibold flex items-center">
                    <Receipt className="mr-2 h-5 w-5" />
                    Order Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Subtotal:</span>
                    <span>{order.totalAmount.toLocaleString("en-ET", { style: "currency", currency: "ETB" })}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Delivery Fee:</span>
                    <span>{(order.deliveryFee || 0).toLocaleString("en-ET", { style: "currency", currency: "ETB" })}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Discount:</span>
                    <span className="text-green-600">-{order.discount.toLocaleString("en-ET", { style: "currency", currency: "ETB" })}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Tax:</span>
                    <span>{order.tax.toLocaleString("en-ET", { style: "currency", currency: "ETB" })}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center font-bold text-lg">
                    <span>Total:</span>
                    <span>{order.finalAmount.toLocaleString("en-ET", { style: "currency", currency: "ETB" })}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    <div className="flex items-center">
                      {paymentMethodIcons[order.paymentMethod] || <CreditCard className="h-4 w-4" />}
                      <span className="ml-2">Payment: {order.paymentMethod}</span>
                    </div>
                    {order.transactionId && (
                      <Badge variant="outline">Transaction ID: {order.transactionId}</Badge>
                    )}
                  </div>
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

              {/* Special Requirements & Notes */}
              {(order.note || order.specialRequirements) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold flex items-center">
                      <MessageSquare className="mr-2 h-5 w-5" />
                      Notes & Special Requirements
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {order.note && (
                      <div>
                        <p className="text-sm font-medium mb-1">Order Note:</p>
                        <p className="text-sm text-muted-foreground">{order.note}</p>
                      </div>
                    )}
                    {order.specialRequirements && (
                      <div>
                        <p className="text-sm font-medium mb-1">Special Requirements:</p>
                        <p className="text-sm text-muted-foreground">{order.specialRequirements}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    )
  }

  const DeliveryCard = ({ order }: { order: DeliveryOrder }) => {
    const customerName = order.deliveryInfo?.fullName || order.userDetails?.name || "Unknown Customer"
    const customerPhone = order.deliveryInfo?.phoneNumber || order.userDetails?.phone || "No Phone"
    const address = order.deliveryInfo?.address || order.deliveryAddress || "No address"
    const city = order.deliveryInfo?.city || ""

    return (
      <Card className="hover:shadow-lg transition-shadow duration-300 border-l-4 border-l-primary">
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            <span className="text-lg font-bold">Delivery #{order.orderNumber}</span>
            <Badge variant="outline" className={statusColors[order.status]}>
              {statusIcons[order.status]} {order.status.replace("_", " ")}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Customer Info */}
          <div className="space-y-2">
            <div className="flex items-center space-x-3">
              <Avatar>
                <AvatarFallback>
                  <User className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{customerName}</p>
                <p className="text-sm text-muted-foreground truncate">{customerPhone}</p>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => customerPhone !== "No Phone" && window.open(`tel:${customerPhone}`, '_blank')} 
                disabled={customerPhone === "No Phone"}
              >
                <Phone className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Address */}
          <div className="flex items-start space-x-2">
            <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
            <div className="flex-1 min-w-0">
              <p className="text-sm truncate">{address}</p>
              <p className="text-xs text-muted-foreground">{city}</p>
            </div>
          </div>

          {/* Order Summary */}
          <div className="grid grid-cols-2 gap-2 text-sm pt-2 border-t">
            <div className="flex items-center">
              <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
              <span className="truncate">{new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <div className="flex items-center">
              <DollarSign className="mr-2 h-4 w-4 text-muted-foreground" />
              <span className="font-semibold">{order.finalAmount.toLocaleString("en-ET", { style: "currency", currency: "ETB" })}</span>
            </div>
            <div className="flex items-center col-span-2">
              {paymentMethodIcons[order.paymentMethod] || <CreditCard className="mr-2 h-4 w-4 text-muted-foreground" />}
              <span className="text-sm text-muted-foreground truncate">{order.paymentMethod}</span>
            </div>
          </div>

          {/* Items Preview */}
          <div className="pt-2 border-t">
            <p className="text-xs font-medium mb-1">Items ({order.items.length}):</p>
            <div className="flex flex-wrap gap-1">
              {order.items.slice(0, 3).map((item, index) => (
                <span key={index} className="px-2 py-1 bg-muted rounded text-xs">
                  {item.quantity}x {item.itemName || `Item ${index + 1}`}
                </span>
              ))}
              {order.items.length > 3 && (
                <span className="px-2 py-1 bg-muted rounded text-xs">
                  +{order.items.length - 3} more
                </span>
              )}
            </div>
          </div>
        </CardContent>
        <CardFooter className="justify-between pt-0">
          <DeliveryDetailModal order={order} />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DeleteDeliveryDialog orderId={order._id} onDelete={() => handleDeleteOrder(order._id)} />
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Change Status</DropdownMenuLabel>
              {statusOptions.map((status) => (
                <DropdownMenuItem 
                  key={status} 
                  onClick={() => handleStatusUpdate(order._id, status)}
                  disabled={order.status === status}
                >
                  {statusIcons[status]}
                  <span className="ml-2">{status.replace("_", " ")}</span>
                  {order.status === status && (
                    <span className="ml-auto text-xs text-muted-foreground">Current</span>
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </CardFooter>
      </Card>
    )
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <Toaster />
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Delivery Orders</h1>
          <p className="text-muted-foreground">Manage all delivery orders and track their status</p>
        </div>
        <Button onClick={fetchDeliveryOrders} variant="outline" size="icon">
          <RefreshCcw className="h-4 w-4" />
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Orders</p>
                <p className="text-2xl font-bold">{deliveryOrders.length}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <Package className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold">
                  {deliveryOrders.filter(o => o.status === "PENDING").length}
                </p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-full">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Confirmed</p>
                <p className="text-2xl font-bold">
                  {deliveryOrders.filter(o => o.status === "CONFIRMED").length}
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <CheckCircle className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Delivered</p>
                <p className="text-2xl font-bold">
                  {deliveryOrders.filter(o => o.status === "DELIVERED" || o.status === "COMPLETED").length}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by order #, customer name, or phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8"
                />
              </div>
            </div>
            <Select 
              value={statusFilter} 
              onValueChange={(value) => setStatusFilter(value as DeliveryStatus | "all" | "notConfirmed")}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="notConfirmed">Active Orders</SelectItem>
                <SelectItem value="PENDING">Pending Orders</SelectItem>
                <SelectItem value="CONFIRMED">Confirmed Orders</SelectItem>
                <SelectItem value="PREPARING">Preparing</SelectItem>
                <SelectItem value="OUT_FOR_DELIVERY">Out for Delivery</SelectItem>
                <SelectItem value="DELIVERED">Delivered</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
                <SelectItem value="all">All Statuses</SelectItem>
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
              onClick={() => {
                setSearchTerm("")
                setStatusFilter("notConfirmed")
                setPaymentFilter(null)
                setDateFilter(null)
              }}
              variant="secondary"
            >
              <RefreshCcw className="mr-2 h-4 w-4" />
              Reset Filters
            </Button>
            <div className="ml-auto">
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

      {/* Loading State */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="w-full h-[300px]">
              <CardHeader className="animate-pulse bg-gray-200 h-8 w-3/4 rounded" />
              <CardContent className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-full mt-4" />
                <Skeleton className="h-4 w-3/4" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : viewMode === "list" ? (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">
                  <Button variant="ghost" onClick={() => handleSort("orderNumber")}>
                    Order #
                  </Button>
                </TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>
                  <Button variant="ghost" onClick={() => handleSort("status")}>
                    Status
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" onClick={() => handleSort("finalAmount")}>
                    Total
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" onClick={() => handleSort("createdAt")}>
                    Date
                  </Button>
                </TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedOrders.map((order) => {
                const customerName = order.deliveryInfo?.fullName || order.userDetails?.name || "Unknown Customer"
                const customerPhone = order.deliveryInfo?.phoneNumber || order.userDetails?.phone || "No Phone"
                const address = order.deliveryInfo?.address || order.deliveryAddress || "No address"
                const city = order.deliveryInfo?.city || ""

                return (
                  <TableRow key={order._id}>
                    <TableCell className="font-medium">{order.orderNumber}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-medium">{customerName}</p>
                        <p className="text-sm text-muted-foreground">{customerPhone}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-[200px] truncate" title={`${address}, ${city}`}>
                        {address}, {city}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusColors[order.status]}>
                        {statusIcons[order.status]} {order.status.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {order.finalAmount.toLocaleString("en-ET", { style: "currency", currency: "ETB" })}
                    </TableCell>
                    <TableCell>{new Date(order.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <DeliveryDetailModal order={order} />
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DeleteDeliveryDialog orderId={order._id} onDelete={() => handleDeleteOrder(order._id)} />
                            <DropdownMenuSeparator />
                            <DropdownMenuLabel>Change Status</DropdownMenuLabel>
                            {statusOptions.map((status) => (
                              <DropdownMenuItem 
                                key={status} 
                                onClick={() => handleStatusUpdate(order._id, status)}
                                disabled={order.status === status}
                              >
                                {statusIcons[status]}
                                <span className="ml-2">{status.replace("_", " ")}</span>
                                {order.status === status && (
                                  <span className="ml-auto text-xs text-muted-foreground">Current</span>
                                )}
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
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {paginatedOrders.map((order) => (
            <DeliveryCard key={order._id} order={order} />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && paginatedOrders.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <Truck className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No delivery orders found</h3>
            <p className="text-muted-foreground mb-4">
              {filteredOrders.length === 0 ? "No delivery orders match your filters." : "No delivery orders available."}
            </p>
            <Button onClick={() => {
              setSearchTerm("")
              setStatusFilter("notConfirmed")
              setPaymentFilter(null)
              setDateFilter(null)
            }}>
              Reset filters
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {paginatedOrders.length > 0 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                aria-disabled={currentPage === 1}
              />
            </PaginationItem>
            {[...Array(totalPages)].map((_, i) => (
              <PaginationItem key={i}>
                <PaginationLink onClick={() => setCurrentPage(i + 1)} isActive={currentPage === i + 1}>
                  {i + 1}
                </PaginationLink>
              </PaginationItem>
            ))}
            <PaginationItem>
              <PaginationNext
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                aria-disabled={currentPage === totalPages}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  )
}