"use client"

import { useState, useEffect, useMemo } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useSession } from "next-auth/react"
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
import { Toaster, toast } from "react-hot-toast"
import {
  ChevronDown,
  MoreHorizontal,
  Plus,
  Trash,
  PenSquare,
  Grid,
  List,
  Search,
  Filter,
  RefreshCw,
  Package,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  BarChart2,
  TrendingUp,
  ShoppingCart,
  DollarSign,
  Eye,
  Loader2,
  Table as TableIcon,
  LayoutGrid,
  CheckCircle,
  XCircle,
  AlertCircle,
  Info,
  Calendar,
  Repeat,
  Target,
  Lock,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// Types
type Stock = {
  _id: string
  name: string
  categoryId: string
  unit: string
  minimumStock: number
  currentStock: number
  requiredAmount: number
  reorderFrequency: 'daily' | 'weekly' | '15days' | 'monthly' | '2months' | '3months' | '6months' | '9months' | 'yearly'
  isActive: boolean
  createdAt: string
  updatedAt: string
}

type Category = {
  _id: string
  name: string
  description: string
}

type Purchase = {
  _id: string
  stockId: string
  purchaseDate: string
  quantity: number
  unitPrice: number
  supplier: string
}

type StockStatus = 'critical' | 'low' | 'good' | 'overstock'

// Schemas with validation for stock update
const stockSchema = z.object({
  name: z.string().min(1, "Name is required"),
  categoryId: z.string().min(1, "Category is required"),
  unit: z.enum(["kg", "g", "liter", "ml", "piece", "box", "pack", "tray", "bottle", "can"]),
  minimumStock: z.number().min(0, "Minimum stock must be 0 or greater"),
  currentStock: z.number().min(0, "Current stock must be 0 or greater"),
  requiredAmount: z.number().min(0, "Required amount must be 0 or greater"),
  reorderFrequency: z.enum(["daily", "weekly", "15days", "monthly", "2months", "3months", "6months", "9months", "yearly"]),
})

const purchaseSchema = z.object({
  stockId: z.string().min(1, "Stock is required"),
  purchaseDate: z.string(),
  quantity: z.number().min(1, "Quantity must be 1 or greater"),
  unitPrice: z.number().min(0, "Unit price must be 0 or greater"),
  supplier: z.string().min(1, "Supplier is required"),
})

// Helper function to get readable frequency label
const getFrequencyLabel = (frequency: string) => {
  const labels: Record<string, string> = {
    daily: "Daily",
    weekly: "Weekly",
    "15days": "15 Days",
    monthly: "Monthly",
    "2months": "2 Months",
    "3months": "3 Months",
    "6months": "6 Months",
    "9months": "9 Months",
    yearly: "Yearly"
  }
  return labels[frequency] || frequency
}

// Check if user has edit permissions (ADMIN or STOCK_MANAGER)
const hasEditPermission = (role: string | undefined): boolean => {
  if (!role) return false
  const normalizedRole = role.toUpperCase().trim()
  return normalizedRole === 'ADMIN' || normalizedRole === 'STOCK_MANAGER'
}

export default function StockManagementPage() {
  const { data: session } = useSession()
  const userRole = session?.user?.role
  const canEdit = hasEditPermission(userRole)
  
  // State
  const [stocks, setStocks] = useState<Stock[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = useState({})
  const [isAddStockOpen, setIsAddStockOpen] = useState(false)
  const [isAddPurchaseOpen, setIsAddPurchaseOpen] = useState(false)
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isStockDetailOpen, setIsStockDetailOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<StockStatus | 'all'>('all')
  const [isDeleteWarningOpen, setIsDeleteWarningOpen] = useState(false)
  const [purchaseToDelete, setPurchaseToDelete] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  // Forms
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

  // Fetch data
  useEffect(() => {
    fetchStocks()
    fetchCategories()
    fetchPurchases()
  }, [])

  const fetchStocks = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/stock")
      const data = await response.json()
      if (data.success) {
        setStocks(data.data)
      }
    } catch (error) {
      console.error("Error fetching stocks:", error)
      toast.error("Failed to fetch stocks")
    } finally {
      setIsLoading(false)
    }
  }

  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/stock-category")
      const data = await response.json()
      if (data.success) {
        setCategories(data.data)
      }
    } catch (error) {
      console.error("Error fetching categories:", error)
      toast.error("Failed to fetch categories")
    }
  }

  const fetchPurchases = async () => {
    try {
      const response = await fetch("/api/stock-purchase")
      const data = await response.json()
      if (data.success) {
        setPurchases(data.purchases)
      }
    } catch (error) {
      console.error("Error fetching purchases:", error)
      toast.error("Failed to fetch purchases")
    }
  }

  // Stock status calculation
  const getStockStatus = (stock: Stock): StockStatus => {
    if (stock.minimumStock === 0) return 'good'
    const ratio = stock.currentStock / stock.minimumStock
    if (stock.currentStock === 0) return 'critical'
    if (ratio <= 0.5) return 'critical'
    if (ratio <= 1) return 'low'
    if (ratio <= 2) return 'good'
    return 'overstock'
  }

  // Get status color and icon
  const getStatusConfig = (status: StockStatus) => {
    switch (status) {
      case 'critical':
        return {
          label: 'Critical',
          color: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
          icon: AlertCircle,
          badgeVariant: 'destructive' as const
        }
      case 'low':
        return {
          label: 'Low Stock',
          color: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800',
          icon: AlertTriangle,
          badgeVariant: 'warning' as const
        }
      case 'good':
        return {
          label: 'Good',
          color: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800',
          icon: CheckCircle,
          badgeVariant: 'success' as const
        }
      case 'overstock':
        return {
          label: 'Overstock',
          color: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800',
          icon: Info,
          badgeVariant: 'default' as const
        }
    }
  }

  // Filtered stocks
  const filteredStocks = useMemo(() => {
    let filtered = [...stocks]

    if (selectedCategory) {
      filtered = filtered.filter((stock) => stock.categoryId === selectedCategory)
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((stock) => getStockStatus(stock) === statusFilter)
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter((stock) => 
        stock.name.toLowerCase().includes(query) ||
        stock.unit.toLowerCase().includes(query)
      )
    }

    return filtered
  }, [stocks, selectedCategory, statusFilter, searchQuery])

  // Calculate total cost
  const calculateTotalCost = (stockId: string) => {
    return purchases
      .filter((purchase) => purchase.stockId === stockId)
      .reduce((total, purchase) => total + purchase.quantity * purchase.unitPrice, 0)
  }

  // Calculate stock statistics
  const stockStats = useMemo(() => {
    const stats = {
      total: stocks.length,
      critical: 0,
      low: 0,
      good: 0,
      overstock: 0,
      totalValue: 0
    }

    stocks.forEach(stock => {
      const status = getStockStatus(stock)
      stats[status]++
      stats.totalValue += calculateTotalCost(stock._id)
    })

    return stats
  }, [stocks, purchases])

  // Table columns with role-based action column
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
      header: ({ column }) => {
        return (
          <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
            Name
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
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
      header: ({ column }) => {
        return (
          <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
            Required Amount
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
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
      accessorKey: "reorderFrequency",
      header: "Reorder Frequency",
      cell: ({ row }) => {
        const frequency = row.getValue("reorderFrequency") as string
        return (
          <Badge variant="secondary" className="capitalize">
            <Repeat className="mr-1 h-3 w-3" />
            {getFrequencyLabel(frequency)}
          </Badge>
        )
      },
    },
    {
      accessorKey: "minimumStock",
      header: ({ column }) => {
        return (
          <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
            Min Stock
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => <div>{row.getValue("minimumStock")}</div>,
    },
    {
      accessorKey: "currentStock",
      header: ({ column }) => {
        return (
          <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
            Current Stock
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => {
        const stock = row.original
        const status = getStockStatus(stock)
        const config = getStatusConfig(status)
        const needToOrder = Math.max(0, stock.requiredAmount - stock.currentStock)
        return (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className={config.color.split(' ')[0]}>{row.getValue("currentStock")}</span>
              <Badge variant="outline" className={config.color}>
                {config.label}
              </Badge>
            </div>
            {needToOrder > 0 && (
              <span className="text-xs text-orange-600">
                Need to order: {needToOrder}
              </span>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: "totalCost",
      header: ({ column }) => {
        return (
          <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
            Total Cost (ETB)
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => {
        const stock = row.original
        const totalCost = calculateTotalCost(stock._id)
        return <div>{totalCost.toLocaleString("en-ET", { style: "currency", currency: "ETB" })}</div>
      },
    },
    {
      id: "status",
      header: "Stock Level",
      cell: ({ row }) => {
        const stock = row.original
        const percentage = stock.minimumStock > 0 ? Math.min(100, (stock.currentStock / stock.minimumStock) * 100) : 100
        const status = getStockStatus(stock)
        
        return (
          <div className="min-w-[150px]">
            <Progress 
              value={percentage} 
              className={`h-2 ${
                status === 'critical' ? 'bg-red-200 dark:bg-red-900' :
                status === 'low' ? 'bg-amber-200 dark:bg-amber-900' :
                status === 'good' ? 'bg-green-200 dark:bg-green-900' :
                'bg-blue-200 dark:bg-blue-900'
              }`}
            />
            <div className="flex justify-between mt-1">
              <span className="text-xs text-muted-foreground">{percentage.toFixed(0)}%</span>
              <span className="text-xs text-muted-foreground">of min stock</span>
            </div>
          </div>
        )
      },
    },
    // Role-based actions column - only show edit/delete for authorized users
    {
      id: "actions",
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
              {canEdit && (
                <>
                  <DropdownMenuItem onClick={() => handleEditStock(stock)}>
                    <PenSquare className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDeleteStock(stock._id)}>
                    <Trash className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
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

  // Handlers
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
    if (!canEdit) {
      toast.error("You don't have permission to update stock")
      return
    }
    
    if (!selectedStock) return

    // VALIDATION: Check if current stock equals required amount for manual update
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
    if (!canEdit) {
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
  }

  const handleDeletePurchase = (purchaseId: string) => {
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

  const resetFilters = () => {
    setSelectedCategory(null)
    setStatusFilter('all')
    setSearchQuery("")
    table.resetColumnFilters()
  }

  // Calculate need to order for a stock
  const getNeedToOrder = (stock: Stock) => {
    return Math.max(0, (stock.requiredAmount || 0) - stock.currentStock)
  }

  return (
    <div className="container mx-auto py-10">
      <Toaster position="top-right" />
      
      {/* Role Indicator Banner for non-editable users */}
      {!canEdit && (
        <div className="mb-6 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4 flex items-center gap-3">
          <Lock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          <div>
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">View-Only Mode</p>
            <p className="text-xs text-amber-700 dark:text-amber-400">
              You have view-only access to stock management. To add, edit, or delete stock items, please contact an administrator or stock manager.
            </p>
          </div>
        </div>
      )}
      
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Items</p>
                <p className="text-2xl font-bold">{stockStats.total}</p>
              </div>
              <Package className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/20 dark:to-red-900/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Critical Stock</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stockStats.critical}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/20 dark:to-amber-900/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Low Stock</p>
                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stockStats.low}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/20 dark:to-green-900/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Good Stock</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stockStats.good}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/20 dark:to-purple-900/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Value</p>
                <p className="text-2xl font-bold">
                  {stockStats.totalValue.toLocaleString("en-ET", { style: "currency", currency: "ETB" })}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-2xl font-bold flex items-center">
            <Package className="mr-2 h-6 w-6" />
            Stock Management
          </CardTitle>
          <CardDescription>Manage your inventory, track stock levels, and set required amounts for automatic purchase requests</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters Section */}
          <div className="flex flex-col space-y-4 mb-6">
            <div className="flex flex-col md:flex-row justify-between gap-4">
              <div className="flex flex-1 gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search stocks by name or unit..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                
                <Select value={selectedCategory || "all"} onValueChange={(value) => setSelectedCategory(value === "all" ? null : value)}>
                  <SelectTrigger className="w-[180px]">
                    <Filter className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category._id} value={category._id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Select value={statusFilter} onValueChange={(value: StockStatus | 'all') => setStatusFilter(value)}>
                  <SelectTrigger className="w-[150px]">
                    <AlertTriangle className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="low">Low Stock</SelectItem>
                    <SelectItem value="good">Good</SelectItem>
                    <SelectItem value="overstock">Overstock</SelectItem>
                  </SelectContent>
                </Select>
                
                {(selectedCategory || statusFilter !== 'all' || searchQuery) && (
                  <Button variant="outline" onClick={resetFilters}>
                    Clear Filters
                  </Button>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                <div className="flex border rounded-md overflow-hidden">
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'ghost'}
                    size="sm"
                    className="rounded-none px-3"
                    onClick={() => setViewMode('grid')}
                  >
                    <LayoutGrid className="h-4 w-4 mr-2" />
                    Grid
                  </Button>
                  <Button
                    variant={viewMode === 'table' ? 'default' : 'ghost'}
                    size="sm"
                    className="rounded-none px-3"
                    onClick={() => setViewMode('table')}
                  >
                    <TableIcon className="h-4 w-4 mr-2" />
                    Table
                  </Button>
                </div>
                
                <Button variant="outline" size="icon" onClick={fetchStocks}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
                
                {/* Add Stock Button - Only shown if user has edit permission */}
                {canEdit && (
                  <Dialog open={isAddStockOpen} onOpenChange={setIsAddStockOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="mr-2 h-4 w-4" /> Add Stock
                      </Button>
                    </DialogTrigger>
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
                                  <Input {...field} />
                                </FormControl>
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
                                      // Auto-sync current stock with required amount when editing
                                      if (selectedStock && newValue > 0) {
                                        stockForm.setValue("currentStock", newValue);
                                      }
                                    }}
                                  />
                                </FormControl>
                                <FormDescription>
                                  Set the target stock level. When manually updating, current stock must equal this value.
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
                                      ⚠️ Current stock must equal required amount ({requiredAmount}) when manually updating.
                                    </p>
                                  )}
                                  <FormDescription>
                                    For manual updates, this must equal the required amount. Stock automatically updates to required amount when purchase requests are confirmed.
                                  </FormDescription>
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
                                    <SelectItem value="weekly">Weekly</SelectItem>
                                    <SelectItem value="15days">15 Days</SelectItem>
                                    <SelectItem value="monthly">Monthly</SelectItem>
                                    <SelectItem value="2months">2 Months</SelectItem>
                                    <SelectItem value="3months">3 Months</SelectItem>
                                    <SelectItem value="6months">6 Months</SelectItem>
                                    <SelectItem value="9months">9 Months</SelectItem>
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
                )}
              </div>
            </div>
            
            {/* Active Filters Display */}
            {(selectedCategory || statusFilter !== 'all' || searchQuery) && (
              <div className="flex flex-wrap gap-2">
                <span className="text-sm text-muted-foreground">Active filters:</span>
                {selectedCategory && (
                  <Badge variant="secondary" className="gap-1">
                    Category: {categories.find(c => c._id === selectedCategory)?.name}
                    <XCircle 
                      className="h-3 w-3 ml-1 cursor-pointer" 
                      onClick={() => setSelectedCategory(null)}
                    />
                  </Badge>
                )}
                {statusFilter !== 'all' && (
                  <Badge variant="secondary" className="gap-1">
                    Status: {statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}
                    <XCircle 
                      className="h-3 w-3 ml-1 cursor-pointer" 
                      onClick={() => setStatusFilter('all')}
                    />
                  </Badge>
                )}
                {searchQuery && (
                  <Badge variant="secondary" className="gap-1">
                    Search: {searchQuery}
                    <XCircle 
                      className="h-3 w-3 ml-1 cursor-pointer" 
                      onClick={() => setSearchQuery("")}
                    />
                  </Badge>
                )}
              </div>
            )}
          </div>

          {/* Content */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, index) => (
                <Card key={index}>
                  <CardHeader>
                    <Skeleton className="h-4 w-[250px]" />
                    <Skeleton className="h-4 w-[200px]" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-4 w-[150px] mb-2" />
                    <Skeleton className="h-4 w-[100px] mb-2" />
                    <Skeleton className="h-4 w-[180px]" />
                  </CardContent>
                  <CardFooter>
                    <Skeleton className="h-10 w-[100px]" />
                    <Skeleton className="h-10 w-[100px]" />
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : filteredStocks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Package className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No stocks found</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery || selectedCategory || statusFilter !== 'all' 
                  ? "Try adjusting your filters"
                  : "Get started by adding your first stock item"}
              </p>
              {!searchQuery && !selectedCategory && statusFilter === 'all' && canEdit && (
                <Button onClick={() => setIsAddStockOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Stock
                </Button>
              )}
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredStocks.map((stock) => {
                const status = getStockStatus(stock)
                const config = getStatusConfig(status)
                const Icon = config.icon
                const percentage = stock.minimumStock > 0 ? Math.min(100, (stock.currentStock / stock.minimumStock) * 100) : 100
                const needToOrder = getNeedToOrder(stock)
                
                return (
                  <Card key={stock._id} className="hover:shadow-lg transition-shadow duration-300">
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Package className="h-5 w-5 text-primary" />
                          <span className="truncate">{stock.name}</span>
                        </div>
                        <Badge variant="outline" className={config.color}>
                          <Icon className="h-3 w-3 mr-1" />
                          {config.label}
                        </Badge>
                      </CardTitle>
                      <CardDescription>
                        Category: {categories.find((cat) => cat._id === stock.categoryId)?.name || "Unknown"}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Unit:</span>
                          <span className="font-medium">{stock.unit}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Required Amount:</span>
                          <Badge variant="outline" className="bg-blue-50">
                            <Target className="mr-1 h-3 w-3" />
                            {stock.requiredAmount || 0}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Reorder Frequency:</span>
                          <Badge variant="secondary" className="capitalize">
                            <Repeat className="mr-1 h-3 w-3" />
                            {getFrequencyLabel(stock.reorderFrequency || 'monthly')}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Min Stock:</span>
                          <span className="font-medium">{stock.minimumStock}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Current Stock:</span>
                          <span className={`font-medium ${
                            status === 'critical' ? 'text-red-600 dark:text-red-400' :
                            status === 'low' ? 'text-amber-600 dark:text-amber-400' :
                            'text-green-600 dark:text-green-400'
                          }`}>
                            {stock.currentStock}
                          </span>
                        </div>
                        {needToOrder > 0 && (
                          <div className="flex items-center justify-between text-sm bg-orange-50 dark:bg-orange-950/20 p-2 rounded">
                            <span className="text-muted-foreground">Need to Order:</span>
                            <span className="font-bold text-orange-600">{needToOrder}</span>
                          </div>
                        )}
                        <div className="pt-2">
                          <Progress 
                            value={percentage} 
                            className={`h-2 ${
                              status === 'critical' ? 'bg-red-200 dark:bg-red-900' :
                              status === 'low' ? 'bg-amber-200 dark:bg-amber-900' :
                              'bg-green-200 dark:bg-green-900'
                            }`}
                          />
                          <p className="text-xs text-muted-foreground mt-1 text-right">
                            {percentage.toFixed(0)}% of minimum stock
                          </p>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="flex justify-between gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleViewStockDetail(stock)} className="flex-1">
                        <Eye className="mr-2 h-4 w-4" />
                        View
                      </Button>
                      {canEdit && (
                        <>
                          <Button variant="outline" size="sm" onClick={() => handleEditStock(stock)} className="flex-1">
                            <PenSquare className="mr-2 h-4 w-4" />
                            Edit
                          </Button>
                          <Button 
                            variant="destructive" 
                            size="sm" 
                            onClick={() => handleDeleteStock(stock._id)} 
                            disabled={deletingId === stock._id}
                            className="flex-1"
                          >
                            {deletingId === stock._id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash className="h-4 w-4" />}
                          </Button>
                        </>
                      )}
                      <Button variant="outline" size="sm" onClick={() => handleAddPurchase(stock._id)} className={canEdit ? "flex-1" : "w-full"}>
                        <Plus className="mr-2 h-4 w-4" />
                        Buy
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
                        {headerGroup.headers.map((header) => {
                          return (
                            <TableHead key={header.id}>
                              {header.isPlaceholder
                                ? null
                                : flexRender(header.column.columnDef.header, header.getContext())}
                            </TableHead>
                          )
                        })}
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
        </CardContent>
      </Card>

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
                            {stock.name} (Required: {stock.requiredAmount || 0} {stock.unit})
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
                        {...field}
                        onChange={(e) => field.onChange(Number.parseInt(e.target.value))}
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
            <DialogTitle className="text-2xl font-bold flex items-center">
              <Package className="mr-2 h-6 w-6" />
              Stock Details
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[80vh]">
            {selectedStock && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Package className="h-5 w-5" /> Name
                    </h3>
                    <p>{selectedStock.name}</p>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Filter className="h-5 w-5" /> Category
                    </h3>
                    <p>{categories.find((cat) => cat._id === selectedStock.categoryId)?.name || "Unknown"}</p>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <DollarSign className="h-5 w-5" /> Unit
                    </h3>
                    <p>{selectedStock.unit}</p>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Target className="h-5 w-5" /> Required Amount
                    </h3>
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 text-base">
                      <Target className="mr-1 h-4 w-4" />
                      {selectedStock.requiredAmount || 0} {selectedStock.unit}
                    </Badge>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Repeat className="h-5 w-5" /> Reorder Frequency
                    </h3>
                    <Badge variant="secondary" className="capitalize text-base">
                      <Repeat className="mr-1 h-4 w-4" />
                      {getFrequencyLabel(selectedStock.reorderFrequency || 'monthly')}
                    </Badge>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <BarChart2 className="h-5 w-5" /> Minimum Stock
                    </h3>
                    <p>{selectedStock.minimumStock}</p>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <ShoppingCart className="h-5 w-5" /> Current Stock
                    </h3>
                    <p className={selectedStock.currentStock !== selectedStock.requiredAmount && selectedStock.requiredAmount > 0 ? "text-orange-600 font-bold" : ""}>
                      {selectedStock.currentStock}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5" /> Status
                    </h3>
                    <Badge variant="outline" className={getStatusConfig(getStockStatus(selectedStock)).color}>
                      {getStatusConfig(getStockStatus(selectedStock)).label}
                    </Badge>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" /> Need to Order
                    </h3>
                    <p className="text-xl font-bold text-orange-600">
                      {Math.max(0, selectedStock.requiredAmount - selectedStock.currentStock)} {selectedStock.unit}
                    </p>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-xl font-semibold mb-2 flex items-center gap-2">
                    <TrendingUp className="h-6 w-6" />
                    Purchase History
                  </h3>
                  <div className="rounded-md border">
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
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleDeletePurchase(purchase._id)}
                                >
                                  <Trash className="h-4 w-4" />
                                </Button>
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
                
                <div>
                  <h3 className="text-xl font-semibold mb-2 flex items-center gap-2">
                    <BarChart2 className="h-6 w-6" /> Stock Level Analysis
                  </h3>
                  <div className="space-y-2">
                    <Progress 
                      value={Math.min(100, (selectedStock.currentStock / selectedStock.minimumStock) * 100)} 
                      className={`h-3 ${
                        getStockStatus(selectedStock) === 'critical' ? 'bg-red-200 dark:bg-red-900' :
                        getStockStatus(selectedStock) === 'low' ? 'bg-amber-200 dark:bg-amber-900' :
                        getStockStatus(selectedStock) === 'good' ? 'bg-green-200 dark:bg-green-900' :
                        'bg-blue-200 dark:bg-blue-900'
                      }`}
                    />
                    <div className="flex justify-between text-sm">
                      <span>Current: {selectedStock.currentStock}</span>
                      <span>Minimum: {selectedStock.minimumStock}</span>
                      <span>Required: {selectedStock.requiredAmount}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Current stock level is {((selectedStock.currentStock / selectedStock.minimumStock) * 100).toFixed(2)}% of minimum stock
                    </p>
                    {selectedStock.currentStock < selectedStock.requiredAmount && (
                      <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-md p-3 mt-2">
                        <div className="flex items-center gap-2">
                          <Target className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                          <span className="text-sm text-orange-800 dark:text-orange-300">
                            Need to order {Math.max(0, selectedStock.requiredAmount - selectedStock.currentStock)} {selectedStock.unit} to meet required amount.
                          </span>
                        </div>
                      </div>
                    )}
                    {selectedStock.currentStock < selectedStock.minimumStock && (
                      <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-md p-3 mt-2">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                          <span className="text-sm text-amber-800 dark:text-amber-300">
                            Critical: Current stock is below minimum requirement!
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Reorder Recommendation */}
                <div>
                  <h3 className="text-xl font-semibold mb-2 flex items-center gap-2">
                    <Calendar className="h-6 w-6" /> Reorder Recommendation
                  </h3>
                  <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-md p-4">
                    <div className="flex items-start gap-3">
                      <Repeat className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                      <div>
                        <p className="text-sm text-blue-800 dark:text-blue-300">
                          Based on required amount of <strong>{selectedStock.requiredAmount} {selectedStock.unit}</strong> and reorder frequency of <strong className="capitalize">{getFrequencyLabel(selectedStock.reorderFrequency || 'monthly')}</strong>,
                          you need to order <strong>{Math.max(0, selectedStock.requiredAmount - selectedStock.currentStock)} {selectedStock.unit}</strong> to meet the requirement.
                        </p>
                        {selectedStock.currentStock < selectedStock.requiredAmount && (
                          <p className="text-sm text-orange-800 dark:text-orange-300 mt-2">
                            ⚠️ Current stock is below required amount. Immediate reorder recommended!
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
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
    </div>
  )
}
