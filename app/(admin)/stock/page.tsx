"use client"

import { useState, useEffect, useMemo } from "react"
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"

// Types
type Stock = {
  _id: string
  name: string
  categoryId: string
  unit: string
  minimumStock: number
  currentStock: number
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

// Schemas
const stockSchema = z.object({
  name: z.string().min(1, "Name is required"),
  categoryId: z.string().min(1, "Category is required"),
  unit: z.enum(["kg", "g", "liter", "ml", "piece", "box", "pack", "tray", "bottle", "can"]),
  minimumStock: z.number().min(0, "Minimum stock must be 0 or greater"),
  currentStock: z.number().min(0, "Current stock must be 0 or greater"),
})

const purchaseSchema = z.object({
  stockId: z.string().min(1, "Stock is required"),
  purchaseDate: z.string(),
  quantity: z.number().min(1, "Quantity must be 1 or greater"),
  unitPrice: z.number().min(0, "Unit price must be 0 or greater"),
  supplier: z.string().min(1, "Supplier is required"),
})

export default function StockManagementPage() {
  // State
  const [stocks, setStocks] = useState<Stock[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [isGridView, setIsGridView] = useState(true)
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
  const [isDeleteWarningOpen, setIsDeleteWarningOpen] = useState(false)
  const [purchaseToDelete, setPurchaseToDelete] = useState<string | null>(null)

  // Forms
  const stockForm = useForm<z.infer<typeof stockSchema>>({
    resolver: zodResolver(stockSchema),
    defaultValues: {
      name: "",
      categoryId: "",
      unit: "kg",
      minimumStock: 0,
      currentStock: 0,
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

  // Filtered stocks based on selected category
  const filteredStocks = useMemo(() => {
    if (!selectedCategory) return stocks
    return stocks.filter((stock) => stock.categoryId === selectedCategory)
  }, [stocks, selectedCategory])

  // Calculate total cost
  const calculateTotalCost = (stockId: string) => {
    return purchases
      .filter((purchase) => purchase.stockId === stockId)
      .reduce((total, purchase) => total + purchase.quantity * purchase.unitPrice, 0)
  }

  // Table columns
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
      cell: ({ row }) => <div className="capitalize">{row.getValue("name")}</div>,
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
      cell: ({ row }) => <div>{row.getValue("currentStock")}</div>,
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
              <DropdownMenuItem onClick={() => handleEditStock(stock)}>
                <PenSquare className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleDeleteStock(stock._id)}>
                <Trash className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
              <DropdownMenuSeparator />
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
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  })

  // Handlers
  const handleAddStock = async (values: z.infer<typeof stockSchema>) => {
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
    }
  }

  const handleEditStock = (stock: Stock) => {
    setSelectedStock(stock)
    stockForm.reset({
      name: stock.name,
      categoryId: stock.categoryId,
      unit: stock.unit as any,
      minimumStock: stock.minimumStock,
      currentStock: stock.currentStock,
    })
    setIsAddStockOpen(true)
  }

  const handleUpdateStock = async (values: z.infer<typeof stockSchema>) => {
    if (!selectedStock) return
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
        toast.error("Error updating stock")
      }
    } catch (error) {
      console.error("Error updating stock:", error)
      toast.error("Error updating stock")
    }
  }

  const handleDeleteStock = async (id: string) => {
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
        setIsAddPurchaseOpen(false)
        purchaseForm.reset()
      } else {
        toast.error("Error adding purchase")
      }
    } catch (error) {
      console.error("Error adding purchase:", error)
      toast.error("Error adding purchase")
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
    try {
      const response = await fetch(`/api/stock-purchase/${purchaseToDelete}`, {
        method: "DELETE",
      })
      const data = await response.json()
      if (data.success) {
        toast.success("Purchase deleted successfully")
        fetchPurchases()
        setIsDeleteWarningOpen(false)
        setPurchaseToDelete(null)
      } else {
        toast.error("Error deleting purchase")
      }
    } catch (error) {
      console.error("Error deleting purchase:", error)
      toast.error("Error deleting purchase")
    }
  }

  // Render
  return (
    <div className="container mx-auto py-10">
      <Toaster position="top-right" />
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-2xl font-bold flex items-center">
            <Package className="mr-2 h-6 w-6" />
            Stock Management
          </CardTitle>
          <CardDescription>Manage your inventory and purchases with ease</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row justify-between mb-4 space-y-4 md:space-y-0 md:space-x-4">
            <div className="flex items-center space-x-2">
              <Input
                placeholder="Search stocks..."
                value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
                onChange={(event) => table.getColumn("name")?.setFilterValue(event.target.value)}
                className="max-w-sm"
                icon={<Search className="h-4 w-4 text-muted-foreground" />}
              />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="ml-auto">
                    <Filter className="mr-2 h-4 w-4" /> Filter
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Filter by Category</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setSelectedCategory(null)}>All Categories</DropdownMenuItem>
                  {categories.map((category) => (
                    <DropdownMenuItem key={category._id} onClick={() => setSelectedCategory(category._id)}>
                      {category.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="ml-auto">
                    <ChevronDown className="ml-2 h-4 w-4" /> Columns
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {table
                    .getAllColumns()
                    .filter((column) => column.getCanHide())
                    .map((column) => {
                      return (
                        <DropdownMenuCheckboxItem
                          key={column.id}
                          className="capitalize"
                          checked={column.getIsVisible()}
                          onCheckedChange={(value) => column.toggleVisibility(!!value)}
                        >
                          {column.id}
                        </DropdownMenuCheckboxItem>
                      )
                    })}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="icon" onClick={() => setIsGridView(!isGridView)}>
                {isGridView ? <List className="h-4 w-4" /> : <Grid className="h-4 w-4" />}
              </Button>
              <Button variant="outline" size="icon" onClick={fetchStocks}>
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Dialog open={isAddStockOpen} onOpenChange={setIsAddStockOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" /> Add Stock
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>{selectedStock ? "Edit Stock" : "Add New Stock"}</DialogTitle>
                    <DialogDescription>
                      {selectedStock ? "Edit the details of the selected stock." : "Add a new stock to your inventory."}
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...stockForm}>
                    <form
                      onSubmit={stockForm.handleSubmit(selectedStock ? handleUpdateStock : handleAddStock)}
                      className="space-y-8"
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
                        name="minimumStock"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Minimum Stock</FormLabel>
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
                        control={stockForm.control}
                        name="currentStock"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Current Stock</FormLabel>
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
                      <Button type="submit">{selectedStock ? "Update Stock" : "Add Stock"}</Button>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, index) => (
                <Card key={index}>
                  <CardHeader>
                    <Skeleton className="h-4 w-[250px]" />
                    <Skeleton className="h-4 w-[200px]" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-4 w-[150px]" />
                    <Skeleton className="h-4 w-[100px]" />
                    <Skeleton className="h-4 w-[180px]" />
                  </CardContent>
                  <CardFooter>
                    <Skeleton className="h-10 w-[100px]" />
                    <Skeleton className="h-10 w-[100px]" />
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : isGridView ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {table.getRowModel().rows.map((row) => (
                <Card key={row.id} className="hover:shadow-lg transition-shadow duration-300">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Package className="mr-2 h-5 w-5" />
                        {row.getValue("name")}
                      </div>
                      <Badge
                        variant={row.original.currentStock > row.original.minimumStock ? "success" : "destructive"}
                      >
                        {row.original.currentStock > row.original.minimumStock ? "In Stock" : "Low Stock"}
                      </Badge>
                    </CardTitle>
                    <CardDescription>
                      Category: {categories.find((cat) => cat._id === row.getValue("categoryId"))?.name || "Unknown"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <DollarSign className="mr-2 h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">Unit:</span> {row.getValue("unit")}
                        </div>
                        <div className="flex items-center">
                          <BarChart2 className="mr-2 h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">Min Stock:</span> {row.getValue("minimumStock")}
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <ShoppingCart className="mr-2 h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">Current Stock:</span> {row.getValue("currentStock")}
                        </div>
                        <div className="flex items-center">
                          <TrendingUp className="mr-2 h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">Total Cost:</span>{" "}
                          {calculateTotalCost(row.original._id).toLocaleString("en-ET", {
                            style: "currency",
                            currency: "ETB",
                          })}
                        </div>
                      </div>
                      <Progress
                        value={(row.original.currentStock / row.original.minimumStock) * 100}
                        className="w-full"
                      />
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <Button variant="outline" size="sm" onClick={() => handleViewStockDetail(row.original)}>
                      <Eye className="mr-2 h-4 w-4" />
                      View
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleEditStock(row.original)}>
                      <PenSquare className="mr-2 h-4 w-4" />
                      Edit
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleAddPurchase(row.original._id)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Purchase
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDeleteStock(row.original._id)}>
                      <Trash className="mr-2 h-4 w-4" />
                      Delete
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
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
          )}
          <div className="flex items-center justify-end space-x-2 py-4">
            <div className="flex-1 text-sm text-muted-foreground">
              {table.getFilteredSelectedRowModel().rows.length} of {table.getFilteredRowModel().rows.length} row(s)
              selected.
            </div>
            <div className="space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      <Dialog open={isAddPurchaseOpen} onOpenChange={setIsAddPurchaseOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add Purchase</DialogTitle>
            <DialogDescription>Add a new purchase for the selected stock.</DialogDescription>
          </DialogHeader>
          <Form {...purchaseForm}>
            <form onSubmit={purchaseForm.handleSubmit(handleSubmitPurchase)} className="space-y-8">
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
                            {stock.name}
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
              <Button type="submit">Add Purchase</Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      <Dialog open={isStockDetailOpen} onOpenChange={setIsStockDetailOpen}>
        <DialogContent className="max-w-4xl">
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
                    <h3 className="text-lg font-semibold flex items-center">
                      <Package className="mr-2 h-5 w-5" /> Name
                    </h3>
                    <p>{selectedStock.name}</p>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold flex items-center">
                      <Filter className="mr-2 h-5 w-5" /> Category
                    </h3>
                    <p>{categories.find((cat) => cat._id === selectedStock.categoryId)?.name || "Unknown"}</p>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold flex items-center">
                      <DollarSign className="mr-2 h-5 w-5" /> Unit
                    </h3>
                    <p>{selectedStock.unit}</p>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold flex items-center">
                      <BarChart2 className="mr-2 h-5 w-5" /> Minimum Stock
                    </h3>
                    <p>{selectedStock.minimumStock}</p>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold flex items-center">
                      <ShoppingCart className="mr-2 h-5 w-5" /> Current Stock
                    </h3>
                    <p>{selectedStock.currentStock}</p>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold flex items-center">
                      <AlertTriangle className="mr-2 h-5 w-5" /> Status
                    </h3>
                    <Badge
                      variant={selectedStock.currentStock > selectedStock.minimumStock ? "success" : "destructive"}
                    >
                      {selectedStock.currentStock > selectedStock.minimumStock ? "In Stock" : "Low Stock"}
                    </Badge>
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2 flex items-center">
                    <TrendingUp className="mr-2 h-6 w-6" /> Purchase History
                  </h3>
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
                    </TableBody>
                  </Table>
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2 flex items-center">
                    <BarChart2 className="mr-2 h-6 w-6" /> Stock Level
                  </h3>
                  <Progress
                    value={(selectedStock.currentStock / selectedStock.minimumStock) * 100}
                    className="w-full"
                  />
                  <p className="text-sm text-muted-foreground mt-2">
                    Current stock level: {((selectedStock.currentStock / selectedStock.minimumStock) * 100).toFixed(2)}%
                    of minimum stock
                  </p>
                </div>
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
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
            <Button variant="destructive" onClick={confirmDeletePurchase}>
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

