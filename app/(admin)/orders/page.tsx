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
  Coffee,
  Truck,
  ThumbsUp,
  CreditCard,
  Receipt,
  ChefHat,
  Loader2,
  Phone,
  User,
  FileText,
  MessageSquare,
} from "lucide-react"

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

  const fetchOrders = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true)
    try {
      const response = await fetch("/api/order")
      if (!response.ok) throw new Error("Failed to fetch orders")
      const data = await response.json()
      setOrders(data.orders)
      setTotalPages(Math.ceil(data.orders.length / itemsPerPage))
    } catch (error) {
      console.error("Error fetching orders:", error)
      toast.error("Failed to fetch orders")
    } finally {
      if (showLoading) setLoading(false)
    }
  }, [])

  const fetchWaitresses = useCallback(async () => {
    try {
      const response = await fetch("/api/waitress")
      if (!response.ok) throw new Error("Failed to fetch waitresses")
      const data = await response.json()
      setWaitresses(data || [])
    } catch (error) {
      console.error("Error fetching waitresses:", error)
      toast.error("Failed to fetch waitresses")
    }
  }, [])

  useEffect(() => {
    fetchOrders(true)
    fetchWaitresses()

    const intervalId = setInterval(() => {
      fetchOrders(false) // Background refresh
    }, 10000) // Poll every 10 seconds

    return () => clearInterval(intervalId)
  }, [fetchOrders, fetchWaitresses])

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

  const filteredOrders = orders.filter((order) => {
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

  const handleSort = (field: keyof Order) => {
    if (field === sortField) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  const OrderDetailModal = ({ order }: { order: Order }) => {
    const [waitress, setWaitress] = useState<Waitress | null>(null)
    const [menuItems, setMenuItems] = useState<Record<string, MenuItem>>({})

    useEffect(() => {
      const fetchWaitress = async () => {
        if (!order.waiterId) return

        try {
          const response = await fetch(`/api/waitress/${order.waiterId}`)
          if (!response.ok) throw new Error("Failed to fetch waitress")
          const data = await response.json()
          setWaitress(data)
        } catch (error) {
          console.error("Error fetching waitress:", error)
        }
      }

      const fetchMenuItems = async () => {
        const itemIds = order.items.map((item) => item.itemId)
        const itemsData: Record<string, MenuItem> = {}
        for (const id of itemIds) {
          try {
            const response = await fetch(`/api/items/${id}`)
            if (!response.ok) throw new Error(`Failed to fetch item ${id}`)
            const { data } = await response.json()
            itemsData[id] = data
          } catch (error) {
            console.error(`Error fetching item ${id}:`, error)
          }
        }
        setMenuItems(itemsData)
      }

      fetchWaitress()
      fetchMenuItems()
    }, [order])

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
              <Receipt className="mr-2 h-6 w-6" />
              Order Details
            </DialogTitle>
            <DialogDescription>
              Order #{order.orderNumber} - {new Date(order.createdAt).toLocaleString()}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[70vh] pr-4">
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold flex items-center">
                      <MapPin className="mr-2 h-5 w-5" />
                      Order Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center">
                      <MapPin className="mr-2 h-4 w-4 text-muted-foreground" />
                      <span>Table: {order.tableNumber}</span>
                    </div>
                    <div className="flex items-center">
                      <Users className="mr-2 h-4 w-4 text-muted-foreground" />
                      <span>Guests: {order.numberOfGuests}</span>
                    </div>
                    <div className="flex items-center">
                      <AlertCircle className="mr-2 h-4 w-4 text-muted-foreground" />
                      <span>Status: </span>
                      <Badge variant="outline" className={`ml-2 ${statusColors[order.status]}`}>
                        {statusIcons[order.status]} {order.status}
                      </Badge>
                    </div>
                    <div className="flex items-center">
                      <CreditCard className="mr-2 h-4 w-4 text-muted-foreground" />
                      <span>Payment Method: {order.paymentMethod}</span>
                    </div>
                    {order.customerName && (
                      <div className="flex items-center">
                        <User className="mr-2 h-4 w-4 text-muted-foreground" />
                        <span>Customer: {order.customerName}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold flex items-center">
                      {order.delivery ? <Truck className="mr-2 h-5 w-5" /> : <User className="mr-2 h-5 w-5" />}
                      {order.delivery ? "Delivery Information" : "Waitress Information"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {order.delivery ? (
                      <div className="space-y-3">
                        {order.deliveryInfo ? (
                          <>
                            <div className="flex items-center">
                              <User className="mr-2 h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">{order.deliveryInfo.fullName}</span>
                            </div>
                            <div className="flex items-center">
                              <Phone className="mr-2 h-4 w-4 text-muted-foreground" />
                              <span>{order.deliveryInfo.phoneNumber}</span>
                            </div>
                            <div className="flex items-start">
                              <MapPin className="mr-2 h-4 w-4 text-muted-foreground mt-1" />
                              <span>{order.deliveryInfo.address}, {order.deliveryInfo.city}</span>
                            </div>
                          </>
                        ) : (
                          <p className="text-sm text-muted-foreground">No delivery information available</p>
                        )}
                      </div>
                    ) : waitress ? (
                      <>
                        <div className="flex items-center space-x-4">
                          <Avatar>
                            <AvatarImage src="/placeholder-avatar.jpg" />
                            <AvatarFallback>{waitress.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{waitress.name}</p>
                            <p className="text-sm text-muted-foreground">{waitress.shift} Shift</p>
                          </div>
                        </div>
                        <div className="flex items-center">
                          <Phone className="mr-2 h-4 w-4 text-muted-foreground" />
                          <span>{waitress.phone}</span>
                        </div>
                      </>
                    ) : (
                      <div className="flex items-center space-x-2">
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

              {/* Special Requirements Section */}
              {(order.specialRequirements || order.notes) && (
                <Card>
                  <CardHeader>
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
                <CardHeader>
                  <CardTitle className="text-lg font-semibold flex items-center">
                    <Utensils className="mr-2 h-5 w-5" />
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
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {order.items.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            {menuItems[item.itemId] ? (
                              <div className="flex items-center space-x-3">
                                <img
                                  src={menuItems[item.itemId].imageUrl || "/placeholder.svg"}
                                  alt={menuItems[item.itemId].name}
                                  className="w-12 h-12 rounded-md object-cover"
                                />
                                <div>
                                  <p className="font-medium">{menuItems[item.itemId].name}</p>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center space-x-2">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span>Loading...</span>
                              </div>
                            )}
                          </TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>
                            {(item.unitPrice || item.price || 0).toLocaleString("en-ET", { style: "currency", currency: "ETB" })}
                          </TableCell>
                          <TableCell>
                            {(item.subtotal || 0).toLocaleString("en-ET", { style: "currency", currency: "ETB" })}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-semibold flex items-center">
                    <DollarSign className="mr-2 h-5 w-5" />
                    Order Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Subtotal:</span>
                    <span>{order.totalAmount.toLocaleString("en-ET", { style: "currency", currency: "ETB" })}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Discount:</span>
                    <span>{order.discount.toLocaleString("en-ET", { style: "currency", currency: "ETB" })}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Tax:</span>
                    <span>{order.tax.toLocaleString("en-ET", { style: "currency", currency: "ETB" })}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center font-bold">
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
  }

  const OrderCard = ({ order }: { order: Order }) => {
    const waitress = waitresses.find((w) => w._id === order.waiterId)
    const hasSpecialRequirements = !!(order.specialRequirements || order.notes)

    return (
      <Card className="hover:shadow-lg transition-shadow duration-300">
        <CardHeader>
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
                  <AvatarFallback>{waitress?.name.charAt(0) || "W"}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{waitress?.name || "Unknown Waitress"}</p>
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

          {/* Special Requirements Badge */}
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
        </CardContent>
        <CardFooter className="justify-between">
          <OrderDetailModal order={order} />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
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
        </CardFooter>
      </Card>
    )
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <Toaster />
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Order Management</h1>
        <Button onClick={fetchOrders} variant="outline" size="icon">
          <RefreshCcw className="h-4 w-4" />
        </Button>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search orders, customer, or special requirements..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8"
                />
              </div>
            </div>
            <Select onValueChange={(value) => setStatusFilter((value as OrderStatus) || null)}>
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
            <Select onValueChange={(value) => setOrderTypeFilter(value === "All" ? null : value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Types</SelectItem>
                <SelectItem value="intable">In Table</SelectItem>
                <SelectItem value="delivery">Delivery</SelectItem>
                <SelectItem value="pos">POS</SelectItem>
              </SelectContent>
            </Select>
            <Select onValueChange={(value) => setWaitressFilter(value || null)}>
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
              onClick={() => {
                setSearchTerm("")
                setStatusFilter(null)
                setWaitressFilter(null)
                setOrderTypeFilter(null)
                setDateFilter(null)
              }}
              variant="secondary"
            >
              <RefreshCcw className="mr-2 h-4 w-4" />
              Clear Filters
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

      {loading ? (
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
                <TableHead>Waitress</TableHead>
                <TableHead>
                  <Button variant="ghost" onClick={() => handleSort("tableNumber")}>
                    Table
                  </Button>
                </TableHead>
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
                <TableHead>Special Req.</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedOrders.map((order) => {
                const waitress = waitresses.find((w) => w._id === order.waiterId)
                const hasSpecialRequirements = !!(order.specialRequirements || order.notes)
                return (
                  <TableRow key={order._id}>
                    <TableCell className="font-medium">{order.orderNumber}</TableCell>
                    <TableCell>{order.customerName || "Walk-in"}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src="/placeholder-avatar.jpg" />
                          <AvatarFallback>{waitress?.name.charAt(0) || "W"}</AvatarFallback>
                        </Avatar>
                        <span>{waitress?.name || "Unknown"}</span>
                      </div>
                    </TableCell>
                    <TableCell>{order.tableNumber}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusColors[order.status]}>
                        {statusIcons[order.status]} {order.status}
                      </Badge>
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
                      <OrderDetailModal order={order} />
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
            <OrderCard key={order._id} order={order} />
          ))}
        </div>
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
    </div>
  )
}