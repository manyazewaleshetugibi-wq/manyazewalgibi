"use client"

import { useState, useMemo, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import {
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { toast } from "react-hot-toast"
import {
  MoreHorizontal,
  Plus,
  Trash,
  PenSquare,
  Eye,
  Loader2,
  Package,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Target,
  Repeat,
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Info,
  TrendingUp,
  ShoppingCart,
  DollarSign,
  Filter,
  Search,
  XCircle,
  RefreshCw,
  AlertOctagon,
  ArrowRightLeft,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import type { Stock, Category, Purchase, StockStatus } from "../../app/(admin)/stock/page"
import { RegisterWastageModal } from "./RegisterWastageModal"
import { RegisterTransferModal } from "./RegisterTransferModal"
import { StockUsageDetailView } from "./StockUsageDetailView"

// Schemas
const stockSchema = z.object({
  name: z.string().min(1, "Name is required"),
  categoryId: z.string().min(1, "Category is required"),
  unit: z.enum(["kg", "g", "liter", "ml", "piece", "box", "pack", "tray", "bottle", "can"]),
  minimumStock: z.number().min(0, "Minimum stock must be 0 or greater"),
  currentStock: z.number().min(0, "Current stock must be 0 or greater"),
  requiredAmount: z.number().min(0, "Required amount must be 0 or greater"),
  reorderFrequency: z.enum(["daily", "3days", "5days", "weekly", "9days", "11days", "2weeks", "monthly", "2months", "3months", "6months", "yearly"]),
})

const purchaseSchema = z.object({
  stockId: z.string().min(1, "Stock is required"),
  purchaseDate: z.string(),
  quantity: z.number().min(1, "Quantity must be 1 or greater"),
  unitPrice: z.number().min(0, "Unit price must be 0 or greater"),
  supplier: z.string().min(1, "Supplier is required"),
})

// Helper functions
const getFrequencyLabel = (frequency: string) => {
  const labels: Record<string, string> = {
    daily: "Daily",
    "3days": "3 Days",
    "5days": "5 Days",
    weekly: "Weekly",
    "9days": "9 Days",
    "11days": "11 Days",
    "2weeks": "2 Weeks",
    monthly: "Monthly",
    "2months": "2 Months",
    "3months": "3 Months",
    "6months": "6 Months",
    yearly: "Yearly"
  }
  return labels[frequency] || frequency
}

const getStatusConfig = (status: StockStatus) => {
  switch (status) {
    case 'critical':
      return {
        label: 'Critical',
        color: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
        icon: AlertCircle,
      }
    case 'low':
      return {
        label: 'Low Stock',
        color: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800',
        icon: AlertTriangle,
      }
    case 'good':
      return {
        label: 'Good',
        color: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800',
        icon: CheckCircle,
      }
    case 'overstock':
      return {
        label: 'Overstock',
        color: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800',
        icon: Info,
      }
    default:
      return {
        label: 'Unknown',
        color: 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/30 dark:text-gray-400 dark:border-gray-800',
        icon: Info,
      }
  }
}

interface StockManagementUIProps {
  stocks: Stock[]
  categories: Category[]
  purchases: Purchase[]
  viewMode: 'grid' | 'table'
  isLoading: boolean
  canEdit: boolean
  selectedCategory: string | null
  statusFilter: StockStatus | 'all'
  searchQuery: string
  isAddStockOpen: boolean
  setIsAddStockOpen: (open: boolean) => void
  fetchStocks: () => Promise<void>
  fetchPurchases: () => Promise<void>
  getStockStatus: (stock: Stock) => StockStatus
  calculateTotalCost: (stockId: string) => number
  getNeedToOrder: (stock: Stock) => number
  onCategoryChange: (category: string | null) => void
  onStatusChange: (status: StockStatus | 'all') => void
  onSearchChange: (query: string) => void
  userRole?: string // Add user role prop
}

export function StockManagementUI({
  stocks,
  categories,
  purchases,
  viewMode,
  isLoading,
  canEdit,
  selectedCategory,
  statusFilter,
  searchQuery,
  isAddStockOpen,
  setIsAddStockOpen,
  fetchStocks,
  fetchPurchases,
  getStockStatus,
  calculateTotalCost,
  getNeedToOrder,
  onCategoryChange,
  onStatusChange,
  onSearchChange,
  userRole = 'user', // Default to 'user' if not provided
}: StockManagementUIProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = useState({})
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null)
  const [isStockDetailOpen, setIsStockDetailOpen] = useState(false)
  const [isAddPurchaseOpen, setIsAddPurchaseOpen] = useState(false)
  const [isDeleteWarningOpen, setIsDeleteWarningOpen] = useState(false)
  const [purchaseToDelete, setPurchaseToDelete] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery)
  const [stockTransfers, setStockTransfers] = useState<any[]>([])
  const [isLoadingTransfers, setIsLoadingTransfers] = useState(false)

  // Stock usage detail state
  const [stockUsageDetailStockId, setStockUsageDetailStockId] = useState<string | null>(null)
  const [isStockUsageDetailOpen, setIsStockUsageDetailOpen] = useState(false)
  
  // Wastage state
  const [isRegisterWastageOpen, setIsRegisterWastageOpen] = useState(false)
  const [selectedStockForWastage, setSelectedStockForWastage] = useState<Stock | null>(null)

  // Transfer state
  const [isRegisterTransferOpen, setIsRegisterTransferOpen] = useState(false)
  const [selectedStockForTransfer, setSelectedStockForTransfer] = useState<Stock | null>(null)

  // Check if user is admin
  const isAdmin = userRole === 'admin'

  useEffect(() => {
    setLocalSearchQuery(searchQuery)
  }, [searchQuery])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearchQuery !== searchQuery) {
        onSearchChange(localSearchQuery)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [localSearchQuery, searchQuery, onSearchChange])

  const filteredStocks = useMemo(() => {
    let filtered = [...stocks]
    
    if (localSearchQuery) {
      const query = localSearchQuery.toLowerCase()
      filtered = filtered.filter((stock) => 
        stock.name.toLowerCase().includes(query) ||
        stock.unit.toLowerCase().includes(query)
      )
    }
    
    return filtered
  }, [stocks, localSearchQuery])

  const stockForm = useForm<z.infer<typeof stockSchema>>({
    resolver: zodResolver(stockSchema),
    defaultValues: {
      name: "",
      categoryId: "",
      unit: "kg",
      minimumStock: 0,
      currentStock: 0,
      requiredAmount: 0,
      reorderFrequency: "monthly",
    },
  })

  const purchaseForm = useForm<z.infer<typeof purchaseSchema>>({
    resolver: zodResolver(purchaseSchema),
    defaultValues: {
      stockId: "",
      purchaseDate: new Date().toISOString().split("T")[0],
      quantity: 1,
      unitPrice: 0,
      supplier: "",
    },
  })

  const handleAddStock = async (values: z.infer<typeof stockSchema>) => {
    if (!canEdit) {
      toast.error("You don't have permission to add stock")
      return
    }
    
    if (stocks.some((stock) => stock.name.toLowerCase() === values.name.toLowerCase())) {
      toast.error("Stock name already registered")
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch("/api/stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      })
      const data = await response.json()
      if (data.success) {
        toast.success("Stock added successfully")
        fetchStocks()
        setIsAddStockOpen(false)
        stockForm.reset()
      } else {
        toast.error("Error adding stock")
      }
    } catch (error) {
      console.error("Error adding stock:", error)
      toast.error("Error adding stock")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditStock = (stock: Stock) => {
    if (!canEdit) {
      toast.error("You don't have permission to edit stock")
      return
    }
    setSelectedStock(stock)
    stockForm.reset({
      name: stock.name,
      categoryId: stock.categoryId,
      unit: stock.unit as any,
      minimumStock: stock.minimumStock,
      currentStock: stock.currentStock,
      requiredAmount: stock.requiredAmount || 0,
      reorderFrequency: stock.reorderFrequency || "monthly",
    })
    setIsAddStockOpen(true)
  }

  const handleUpdateStock = async (values: z.infer<typeof stockSchema>) => {
    if (!canEdit || !selectedStock) return

    if (values.requiredAmount > 0 && values.currentStock !== values.requiredAmount) {
      toast.error(`Cannot update: Current stock (${values.currentStock}) must equal required amount (${values.requiredAmount})`)
      return
    }

    if (stocks.some((stock) => stock.name.toLowerCase() === values.name.toLowerCase() && stock._id !== selectedStock._id)) {
      toast.error("Stock name already registered")
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/stock/${selectedStock._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      })
      const data = await response.json()
      if (data.success) {
        toast.success("Stock updated successfully")
        fetchStocks()
        setIsAddStockOpen(false)
        setSelectedStock(null)
        stockForm.reset()
      } else {
        toast.error(data.message || "Error updating stock")
      }
    } catch (error) {
      console.error("Error updating stock:", error)
      toast.error("Error updating stock")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteStock = async (id: string) => {
    if (!canEdit || !isAdmin) {
      toast.error("You don't have permission to delete stock")
      return
    }
    
    setDeletingId(id)
    try {
      const response = await fetch(`/api/stock/${id}`, {
        method: "DELETE",
      })
      const data = await response.json()
      if (data.success) {
        toast.success("Stock deleted successfully")
        fetchStocks()
      } else {
        toast.error("Error deleting stock")
      }
    } catch (error) {
      console.error("Error deleting stock:", error)
      toast.error("Error deleting stock")
    } finally {
      setDeletingId(null)
    }
  }

  const handleAddPurchase = (stockId: string) => {
    purchaseForm.reset({
      stockId,
      purchaseDate: new Date().toISOString().split("T")[0],
      quantity: 1,
      unitPrice: 0,
      supplier: "",
    })
    setIsAddPurchaseOpen(true)
  }

  const handleSubmitPurchase = async (values: z.infer<typeof purchaseSchema>) => {
    setIsSubmitting(true)
    try {
      const response = await fetch("/api/stock-purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      })
      const data = await response.json()
      if (data.success) {
        toast.success("Purchase added successfully")
        fetchPurchases()
        fetchStocks()
        setIsAddPurchaseOpen(false)
        purchaseForm.reset()
      } else {
        toast.error("Error adding purchase")
      }
    } catch (error) {
      console.error("Error adding purchase:", error)
      toast.error("Error adding purchase")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleViewStockDetail = (stock: Stock) => {
    setSelectedStock(stock)
    setIsStockDetailOpen(true)
    fetchStockTransfers(stock._id)
  }

  const fetchStockTransfers = async (stockId: string) => {
    setIsLoadingTransfers(true)
    try {
      const res = await fetch(`/api/stock-transfer?stockId=${stockId}`)
      const data = await res.json()
      if (data.success) setStockTransfers(data.data || [])
    } catch {
      // silent
    } finally {
      setIsLoadingTransfers(false)
    }
  }

  const handleDeletePurchase = (purchaseId: string) => {
    if (!isAdmin) {
      toast.error("Only admins can delete purchase records")
      return
    }
    setPurchaseToDelete(purchaseId)
    setIsDeleteWarningOpen(true)
  }

  const confirmDeletePurchase = async () => {
    if (!purchaseToDelete) return
    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/stock-purchase/${purchaseToDelete}`, {
        method: "DELETE",
      })
      const data = await response.json()
      if (data.success) {
        toast.success("Purchase deleted successfully")
        fetchPurchases()
        fetchStocks()
        setIsDeleteWarningOpen(false)
        setPurchaseToDelete(null)
      } else {
        toast.error("Error deleting purchase")
      }
    } catch (error) {
      console.error("Error deleting purchase:", error)
      toast.error("Error deleting purchase")
    } finally {
      setIsSubmitting(false)
    }
  }

  const clearSearch = () => {
    setLocalSearchQuery("")
    onSearchChange("")
  }

  const handleOpenRegisterWastage = (stock: Stock) => {
    setSelectedStockForWastage(stock)
    setIsRegisterWastageOpen(true)
  }

  const handleWastageSuccess = () => fetchStocks()

  const handleOpenRegisterTransfer = (stock: Stock) => {
    setSelectedStockForTransfer(stock)
    setIsRegisterTransferOpen(true)
  }

  const handleTransferSuccess = () => fetchStocks()

  const columns: ColumnDef<Stock>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "name",
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => <div className="font-medium">{row.getValue("name")}</div>,
    },
    {
      accessorKey: "categoryId",
      header: "Category",
      cell: ({ row }) => {
        const category = categories.find((cat) => cat._id === row.getValue("categoryId"))
        return <Badge variant="outline">{category?.name || "Unknown"}</Badge>
      },
    },
    {
      accessorKey: "unit",
      header: "Unit",
      cell: ({ row }) => <div className="lowercase">{row.getValue("unit")}</div>,
    },
    {
      accessorKey: "requiredAmount",
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Required Amount
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const amount = row.getValue("requiredAmount") as number
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700">
            <Target className="mr-1 h-3 w-3" />
            {amount}
          </Badge>
        )
      },
    },
    {
      accessorKey: "currentStock",
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Current Stock
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const stock = row.original
        const status = getStockStatus(stock)
        const config = getStatusConfig(status)
        return (
          <div className="flex items-center gap-2">
            <span className={config.color.split(' ')[0]}>{row.getValue("currentStock")}</span>
            <Badge variant="outline" className={config.color}>
              {config.label}
            </Badge>
          </div>
        )
      },
    },
    {
      accessorKey: "actions",
      enableHiding: false,
      cell: ({ row }) => {
        const stock = row.original
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => handleViewStockDetail(stock)}>
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                setStockUsageDetailStockId(stock._id)
                setIsStockUsageDetailOpen(true)
              }}>
                <ShoppingCart className="mr-2 h-4 w-4" />
                Stock Usage Details
              </DropdownMenuItem>
              {canEdit && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleEditStock(stock)}>
                    <PenSquare className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                  {/* Only show Delete option for admin users */}
                  {isAdmin && (
                    <DropdownMenuItem onClick={() => handleDeleteStock(stock._id)}>
                      <Trash className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleOpenRegisterWastage(stock)}>
                    <AlertOctagon className="mr-2 h-4 w-4" />
                    Register Wastage
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleOpenRegisterTransfer(stock)}>
                    <ArrowRightLeft className="mr-2 h-4 w-4" />
                    Register Transfer
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuItem onClick={() => handleAddPurchase(stock._id)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Purchase
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  const table = useReactTable({
    data: filteredStocks,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  })

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {[...Array(8)].map((_, index) => (
            <Card key={index} className="overflow-hidden">
              <CardHeader className="p-4">
                <Skeleton className="h-5 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent className="p-4 pt-0 space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
              <CardFooter className="p-4 pt-0 gap-2">
                <Skeleton className="h-9 flex-1" />
                <Skeleton className="h-9 flex-1" />
                <Skeleton className="h-9 flex-1" />
                <Skeleton className="h-9 flex-1" />
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (stocks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="bg-muted/50 rounded-full p-4 mb-4">
          <Package className="h-12 w-12 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">No stocks found</h3>
        <p className="text-muted-foreground mb-6 max-w-sm">
          Get started by adding your first stock item to inventory
        </p>
        {canEdit && (
          <Button onClick={() => setIsAddStockOpen(true)} size="lg">
            <Plus className="mr-2 h-4 w-4" />
            Add Stock
          </Button>
        )}
      </div>
    )
  }

  return (
    <>
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search stocks..."
            value={localSearchQuery}
            onChange={(e) => setLocalSearchQuery(e.target.value)}
            className="pl-9 pr-20 h-11 text-base bg-background"
          />
          {localSearchQuery && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 px-2"
              onClick={clearSearch}
            >
              <XCircle className="h-4 w-4 mr-1" />
              <span className="text-xs">Clear</span>
            </Button>
          )}
        </div>
      </div>

      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredStocks.map((stock) => {
            const status = getStockStatus(stock)
            const config = getStatusConfig(status)
            const Icon = config.icon
            const percentage = stock.minimumStock > 0 ? Math.min(100, (stock.currentStock / stock.minimumStock) * 100) : 100
            const needToOrder = getNeedToOrder(stock)
            
            return (
              <Card key={stock._id} className="group hover:shadow-lg transition-all duration-200 overflow-hidden">
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base font-semibold truncate">
                        {stock.name}
                      </CardTitle>
                      <CardDescription className="text-xs mt-1 truncate">
                        {categories.find((cat) => cat._id === stock.categoryId)?.name || "Unknown"}
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className={`${config.color} shrink-0 text-xs`}>
                      <Icon className="h-3 w-3 mr-1" />
                      {config.label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-2 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Unit:</span>
                    <span className="font-medium">{stock.unit}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Required:</span>
                    <Badge variant="outline" className="bg-blue-50 text-xs">
                      <Target className="mr-1 h-3 w-3" />
                      {stock.requiredAmount || 0}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Current:</span>
                    <span className={`font-semibold ${
                      status === 'critical' ? 'text-red-600' :
                      status === 'low' ? 'text-amber-600' :
                      'text-green-600'
                    }`}>
                      {stock.currentStock}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Value:</span>
                    <span className="font-semibold text-purple-600">
                      {calculateTotalCost(stock._id).toLocaleString("en-ET", { style: "currency", currency: "ETB" })}
                    </span>
                  </div>
                  {needToOrder > 0 && (
                    <div className="bg-orange-50 dark:bg-orange-950/20 rounded-md p-2 mt-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Need to Order:</span>
                        <span className="font-bold text-orange-600">{needToOrder}</span>
                      </div>
                    </div>
                  )}
                  <div className="pt-2">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Stock Level</span>
                      <span className="text-muted-foreground">{percentage.toFixed(0)}%</span>
                    </div>
                    <Progress 
                      value={percentage} 
                      className={`h-2 ${
                        status === 'critical' ? 'bg-red-200' :
                        status === 'low' ? 'bg-amber-200' :
                        'bg-green-200'
                      }`}
                    />
                  </div>
                </CardContent>
                <CardFooter className="p-4 pt-0 grid grid-cols-2 gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleViewStockDetail(stock)} 
                    className="w-full"
                  >
                    <Eye className="h-3.5 w-3.5 mr-1" />
                    View
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleEditStock(stock)} 
                    className="w-full"
                    disabled={!canEdit}
                  >
                    <PenSquare className="h-3.5 w-3.5 mr-1" />
                    Edit
                  </Button>
                  {/* Only show Delete button for admin users */}
                  {isAdmin && (
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      onClick={() => handleDeleteStock(stock._id)} 
                      disabled={deletingId === stock._id || !canEdit}
                      className="w-full"
                    >
                      {deletingId === stock._id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash className="h-3.5 w-3.5 mr-1" />}
                      Delete
                    </Button>
                  )}
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleAddPurchase(stock._id)} 
                    className="w-full"
                  >
                    <ShoppingCart className="h-3.5 w-3.5 mr-1" />
                    Buy
                  </Button>
                  <Button 
                    variant="default" 
                    size="sm" 
                    onClick={() => handleOpenRegisterWastage(stock)} 
                    className="w-full bg-amber-500 hover:bg-amber-600 text-white"
                    disabled={!canEdit}
                  >
                    <AlertOctagon className="h-3.5 w-3.5 mr-1" />
                    Wastage
                  </Button>
                  <Button 
                    variant="default" 
                    size="sm" 
                    onClick={() => handleOpenRegisterTransfer(stock)} 
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white col-span-2"
                    disabled={!canEdit}
                  >
                    <ArrowRightLeft className="h-3.5 w-3.5 mr-1" />
                    Transfer to Kitchen
                  </Button>
                </CardFooter>
              </Card>
            )
          })}
        </div>
      ) : (
        <>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="h-24 text-center">
                      No results.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-between space-x-2 py-4">
            <div className="flex-1 text-sm text-muted-foreground">
              {table.getFilteredSelectedRowModel().rows.length} of {table.getFilteredRowModel().rows.length} row(s) selected.
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <span className="text-sm">
                Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Add/Edit Stock Dialog */}
      <Dialog open={isAddStockOpen} onOpenChange={setIsAddStockOpen}>
        <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedStock ? "Edit Stock" : "Add New Stock"}</DialogTitle>
            <DialogDescription>
              {selectedStock ? "Edit the details of the selected stock." : "Add a new stock to your inventory."}
            </DialogDescription>
          </DialogHeader>
          <Form {...stockForm}>
            <form
              onSubmit={stockForm.handleSubmit(selectedStock ? handleUpdateStock : handleAddStock)}
              className="space-y-6"
            >
              <FormField
                control={stockForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        // Disable name field for non-admin users when editing
                        disabled={!isAdmin && !!selectedStock}
                      />
                    </FormControl>
                    {!isAdmin && selectedStock && (
                      <FormDescription className="text-amber-500">
                        ⚠️ Only admins can edit stock names
                      </FormDescription>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={stockForm.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category._id} value={category._id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={stockForm.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a unit" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {["kg", "g", "liter", "ml", "piece", "box", "pack", "tray", "bottle", "can"].map(
                          (unit) => (
                            <SelectItem key={unit} value={unit}>
                              {unit}
                            </SelectItem>
                          ),
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={stockForm.control}
                name="requiredAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Required Amount</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="1"
                        placeholder="e.g., 100"
                        {...field}
                        onChange={(e) => {
                          const newValue = Number.parseFloat(e.target.value);
                          field.onChange(newValue);
                          if (selectedStock && newValue > 0) {
                            stockForm.setValue("currentStock", newValue);
                          }
                        }}
                      />
                    </FormControl>
                    <FormDescription>
                      Set the target stock level.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={stockForm.control}
                name="minimumStock"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Minimum Stock (Alert Level)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        {...field}
                        onChange={(e) => field.onChange(Number.parseFloat(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={stockForm.control}
                name="currentStock"
                render={({ field }) => {
                  const requiredAmount = stockForm.watch("requiredAmount");
                  const isInvalid = selectedStock && requiredAmount > 0 && field.value !== requiredAmount;
                  return (
                    <FormItem>
                      <FormLabel>Current Stock</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          {...field}
                          onChange={(e) => field.onChange(Number.parseFloat(e.target.value))}
                          className={isInvalid ? "border-red-500" : ""}
                        />
                      </FormControl>
                      {isInvalid && (
                        <p className="text-sm text-red-500 font-medium">
                          ⚠️ Current stock must equal required amount ({requiredAmount}).
                        </p>
                      )}
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
              <FormField
                control={stockForm.control}
                name="reorderFrequency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reorder Frequency</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select reorder frequency" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="3days">3 Days</SelectItem>
                        <SelectItem value="5days">5 Days</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="9days">9 Days</SelectItem>
                        <SelectItem value="11days">11 Days</SelectItem>
                        <SelectItem value="2weeks">2 Weeks</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="2months">2 Months</SelectItem>
                        <SelectItem value="3months">3 Months</SelectItem>
                        <SelectItem value="6months">6 Months</SelectItem>
                        <SelectItem value="yearly">Yearly</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {selectedStock ? "Update Stock" : "Add Stock"}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Purchase Dialog */}
      <Dialog open={isAddPurchaseOpen} onOpenChange={setIsAddPurchaseOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add Purchase</DialogTitle>
            <DialogDescription>Add a new purchase for the selected stock.</DialogDescription>
          </DialogHeader>
          <Form {...purchaseForm}>
            <form onSubmit={purchaseForm.handleSubmit(handleSubmitPurchase)} className="space-y-6">
              <FormField
                control={purchaseForm.control}
                name="stockId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stock</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a stock" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {stocks.map((stock) => (
                          <SelectItem key={stock._id} value={stock._id}>
                            {stock.name} (Current: {stock.currentStock} {stock.unit})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={purchaseForm.control}
                name="purchaseDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Purchase Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={purchaseForm.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        {...field}
                        onChange={(e) => field.onChange(Number.parseFloat(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={purchaseForm.control}
                name="unitPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit Price (ETB)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        {...field}
                        onChange={(e) => field.onChange(Number.parseFloat(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={purchaseForm.control}
                name="supplier"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Supplier</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add Purchase
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Stock Detail Dialog */}
      <Dialog open={isStockDetailOpen} onOpenChange={setIsStockDetailOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center">
              <Package className="mr-2 h-5 w-5" />
              Stock Details
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[80vh]">
            {selectedStock && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground mb-1">Name</h3>
                    <p className="text-base">{selectedStock.name}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground mb-1">Category</h3>
                    <p className="text-base">{categories.find((cat) => cat._id === selectedStock.categoryId)?.name || "Unknown"}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground mb-1">Unit</h3>
                    <p className="text-base">{selectedStock.unit}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground mb-1">Required Amount</h3>
                    <Badge variant="outline" className="bg-blue-50">
                      <Target className="mr-1 h-3 w-3" />
                      {selectedStock.requiredAmount || 0} {selectedStock.unit}
                    </Badge>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground mb-1">Reorder Frequency</h3>
                    <Badge variant="secondary" className="capitalize">
                      <Repeat className="mr-1 h-3 w-3" />
                      {getFrequencyLabel(selectedStock.reorderFrequency || 'monthly')}
                    </Badge>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground mb-1">Minimum Stock</h3>
                    <p className="text-base">{selectedStock.minimumStock}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground mb-1">Current Stock</h3>
                    <p className="text-base font-semibold">{selectedStock.currentStock}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground mb-1">Stock Value</h3>
                    <p className="text-base font-semibold text-purple-600">
                      {calculateTotalCost(selectedStock._id).toLocaleString("en-ET", { style: "currency", currency: "ETB" })}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground mb-1">Status</h3>
                    <Badge variant="outline" className={getStatusConfig(getStockStatus(selectedStock)).color}>
                      {getStatusConfig(getStockStatus(selectedStock)).label}
                    </Badge>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Purchase History
                  </h3>
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Quantity</TableHead>
                          <TableHead>Unit Price (ETB)</TableHead>
                          <TableHead>Supplier</TableHead>
                          <TableHead>Total (ETB)</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {purchases
                          .filter((purchase) => purchase.stockId === selectedStock._id)
                          .map((purchase) => (
                            <TableRow key={purchase._id}>
                              <TableCell>{new Date(purchase.purchaseDate).toLocaleDateString()}</TableCell>
                              <TableCell>{purchase.quantity}</TableCell>
                              <TableCell>
                                {purchase.unitPrice.toLocaleString("en-ET", { style: "currency", currency: "ETB" })}
                              </TableCell>
                              <TableCell>{purchase.supplier}</TableCell>
                              <TableCell>
                                {(purchase.quantity * purchase.unitPrice).toLocaleString("en-ET", {
                                  style: "currency",
                                  currency: "ETB",
                                })}
                              </TableCell>
                              <TableCell>
                                {/* Only show delete button for admin users */}
                                {isAdmin ? (
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => handleDeletePurchase(purchase._id)}
                                  >
                                    <Trash className="h-4 w-4" />
                                  </Button>
                                ) : (
                                  <Badge variant="secondary" className="text-xs">
                                    View only
                                  </Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        {purchases.filter(p => p.stockId === selectedStock._id).length === 0 && (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-8">
                              <Package className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                              <p className="text-muted-foreground">No purchase records found</p>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Kitchen Transfers */}
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <ArrowRightLeft className="h-5 w-5 text-blue-500" />
                    Kitchen Transfer History
                  </h3>
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Quantity</TableHead>
                          <TableHead>Receiver</TableHead>
                          <TableHead>Note</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {isLoadingTransfers ? (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center py-4">
                              <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                            </TableCell>
                          </TableRow>
                        ) : stockTransfers.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center py-6">
                              <p className="text-muted-foreground text-sm">No transfer records found</p>
                            </TableCell>
                          </TableRow>
                        ) : (
                          stockTransfers.map((t) => (
                            <TableRow key={t._id}>
                              <TableCell className="text-sm">{new Date(t.date).toLocaleDateString()}</TableCell>
                              <TableCell>
                                <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-xs">
                                  {t.quantity} {selectedStock.unit}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm font-medium">{t.receiverName}</TableCell>
                              <TableCell className="text-sm text-muted-foreground">{t.note || "-"}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteWarningOpen} onOpenChange={setIsDeleteWarningOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this purchase? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setIsDeleteWarningOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDeletePurchase} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <RegisterWastageModal
        open={isRegisterWastageOpen}
        onOpenChange={setIsRegisterWastageOpen}
        stock={selectedStockForWastage}
        onSuccess={handleWastageSuccess}
      />

      <RegisterTransferModal
        open={isRegisterTransferOpen}
        onOpenChange={setIsRegisterTransferOpen}
        stock={selectedStockForTransfer}
        onSuccess={handleTransferSuccess}
      />
    </>
  )
}