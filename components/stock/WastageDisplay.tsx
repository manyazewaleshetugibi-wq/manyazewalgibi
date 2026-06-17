"use client"

import { useState, useEffect } from "react"
import { toast } from "react-hot-toast"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  AlertCircle,
  Calendar,
  Loader2,
  Trash,
  XCircle,
  Package,
  Search,
  AlertOctagon,
  ChevronLeft,
  ChevronRight,
  Download,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { Wastage, Stock, Purchase, Category } from "../../app/(admin)/stock/page"

interface WastageDisplayProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  stocks: Stock[]
  categories: Category[]
  purchases: Purchase[]
  fetchStocks: () => Promise<void>
}

export function WastageDisplay({
  open,
  onOpenChange,
  stocks,
  categories,
  purchases,
  fetchStocks,
}: WastageDisplayProps) {
  const [wastages, setWastages] = useState<Wastage[]>([])
  const [filteredWastages, setFilteredWastages] = useState<Wastage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [selectedStockId, setSelectedStockId] = useState<string>("all")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [totalWastage, setTotalWastage] = useState(0)
  const [totalValue, setTotalValue] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)

  useEffect(() => {
    if (open) {
      fetchAllWastages()
    }
  }, [open])

  useEffect(() => {
    filterWastages()
  }, [wastages, selectedStockId, startDate, endDate, searchTerm])

  const fetchAllWastages = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/stock-wastage")
      const data = await response.json()
      
      if (data.success) {
        const wastageData = data.data || []
        setWastages(wastageData)
        calculateTotals(wastageData)
        setFilteredWastages(wastageData)
      } else {
        toast.error("Failed to fetch wastages")
      }
    } catch (error) {
      console.error("Error fetching wastages:", error)
      toast.error("Failed to fetch wastages")
    } finally {
      setIsLoading(false)
    }
  }

  const getLastPurchasePrice = (stockId: any) => {
    const id = typeof stockId === 'object' && stockId !== null ? stockId._id : stockId;
    const stockPurchases = purchases
      .filter(p => p.stockId === id)
      .sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime())
    
    return stockPurchases.length > 0 ? stockPurchases[0].unitPrice : 0
  }

  const calculateTotals = (wastageData: Wastage[]) => {
    const total = wastageData.reduce((sum, w) => sum + w.quantity, 0)
    setTotalWastage(total)
    
    // Calculate total value using stock's last purchase price
    let value = 0
    wastageData.forEach(w => {
      const price = getLastPurchasePrice(w.stockId)
      value += w.quantity * price
    })
    setTotalValue(value)
  }

  const filterWastages = () => {
    let filtered = [...wastages]

    if (selectedStockId !== "all") {
      filtered = filtered.filter((w) => w.stockId === selectedStockId)
    }

    if (startDate) {
      filtered = filtered.filter((w) => w.date >= startDate)
    }
    if (endDate) {
      filtered = filtered.filter((w) => w.date <= endDate)
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter((w) => {
        const stockName = getStockName(w.stockId).toLowerCase()
        return (
          w.reason.toLowerCase().includes(term) ||
          w.quantity.toString().includes(term) ||
          stockName.includes(term) ||
          new Date(w.date).toLocaleDateString().includes(term)
        )
      })
    }

    filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    setFilteredWastages(filtered)
    calculateTotals(filtered)
    setCurrentPage(1)
  }

  const handleDeleteWastage = async (wastageId: string) => {
    if (!confirm("Delete this wastage record? Stock will be restored.")) {
      return
    }

    setIsDeleting(wastageId)
    try {
      const response = await fetch(`/api/stock-wastage?id=${wastageId}`, {
        method: "DELETE",
      })
      const data = await response.json()
      if (data.success) {
        toast.success("Wastage deleted")
        await fetchAllWastages()
        await fetchStocks()
      } else {
        toast.error(data.message || "Failed to delete")
      }
    } catch (error) {
      console.error("Error deleting wastage:", error)
      toast.error("Failed to delete")
    } finally {
      setIsDeleting(null)
    }
  }

  const clearFilters = () => {
    setSelectedStockId("all")
    setStartDate("")
    setEndDate("")
    setSearchTerm("")
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-ET", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const getStockName = (stockId: any) => {
    if (typeof stockId === 'object' && stockId !== null) return stockId.name
    const stock = stocks.find(s => s._id === stockId)
    return stock?.name || "Unknown"
  }

  const getStockUnit = (stockId: any) => {
    if (typeof stockId === 'object' && stockId !== null) return stockId.unit
    const stock = stocks.find(s => s._id === stockId)
    return stock?.unit || ""
  }

  const getStockValue = (stockId: any, quantity: number) => {
    const price = getLastPurchasePrice(stockId)
    return quantity * price
  }

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentItems = filteredWastages.slice(indexOfFirstItem, indexOfLastItem)
  const totalPages = Math.ceil(filteredWastages.length / itemsPerPage)

  const exportToCSV = () => {
    if (filteredWastages.length === 0) {
      toast.error("No data to export")
      return
    }

    const headers = ["Date", "Stock", "Quantity", "Unit", "Value (ETB)", "Reason"]
    const csvData = filteredWastages.map(w => [
      formatDate(w.date),
      getStockName(w.stockId),
      w.quantity,
      getStockUnit(w.stockId),
      getStockValue(w.stockId, w.quantity).toFixed(2),
      w.reason
    ])

    const csvContent = [
      headers.join(","),
      ...csvData.map(row => row.join(","))
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `wastage-report-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
    toast.success("Exported successfully")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[95vh] p-4 sm:p-6">
        <DialogHeader className="pb-4">
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <AlertOctagon className="h-5 w-5 text-amber-500" />
            Wastage Records
          </DialogTitle>
        </DialogHeader>

        {/* Mobile-first Summary Cards */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <Card className="bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800">
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground">Total Wastage</p>
              <p className="text-xl font-bold text-red-600">{totalWastage}</p>
            </CardContent>
          </Card>

          <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground">Records</p>
              <p className="text-xl font-bold text-blue-600">{filteredWastages.length}</p>
            </CardContent>
          </Card>

          <Card className="bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800 col-span-2">
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground">Total Wastage Value</p>
              <p className="text-xl font-bold text-purple-600">
                {totalValue.toLocaleString("en-ET", { style: "currency", currency: "ETB" })}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters - Mobile First */}
        <div className="space-y-2 mb-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1">
              <Select value={selectedStockId} onValueChange={setSelectedStockId}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="All Stocks" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stocks</SelectItem>
                  {stocks.map((stock) => (
                    <SelectItem key={stock._id} value={stock._id}>
                      {stock.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 h-9"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1 flex gap-2">
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-9"
                placeholder="From"
              />
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-9"
                placeholder="To"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={clearFilters} className="h-9">
                <XCircle className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={exportToCSV} className="h-9">
                <Download className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={fetchAllWastages} className="h-9">
                <AlertCircle className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Wastage Table - Mobile Responsive */}
        <div className="rounded-md border overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Date</TableHead>
                  <TableHead className="text-xs">Stock</TableHead>
                  <TableHead className="text-xs text-right">Qty</TableHead>
                  <TableHead className="text-xs text-right hidden sm:table-cell">Value</TableHead>
                  <TableHead className="text-xs hidden md:table-cell">Reason</TableHead>
                  <TableHead className="text-xs text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : filteredWastages.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <Package className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-muted-foreground">No wastage records found</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  currentItems.map((wastage) => (
                    <TableRow key={wastage._id} className="hover:bg-muted/50">
                      <TableCell className="text-xs whitespace-nowrap">
                        {formatDate(wastage.date)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs bg-blue-50">
                          {getStockName(wastage.stockId)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="destructive" className="text-xs">
                          -{wastage.quantity}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right hidden sm:table-cell">
                        <span className="text-xs text-purple-600 font-medium">
                          {getStockValue(wastage.stockId, wastage.quantity).toLocaleString("en-ET", {
                            style: "currency",
                            currency: "ETB"
                          })}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs hidden md:table-cell max-w-[100px] truncate">
                        {wastage.reason}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteWastage(wastage._id)}
                          disabled={isDeleting === wastage._id}
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                        >
                          {isDeleting === wastage._id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Pagination */}
        {filteredWastages.length > itemsPerPage && (
          <div className="flex items-center justify-between mt-4">
            <div className="text-xs text-muted-foreground">
              {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredWastages.length)} of {filteredWastages.length}
            </div>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="h-8 px-2"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-xs flex items-center px-2">
                {currentPage}/{totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="h-8 px-2"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}