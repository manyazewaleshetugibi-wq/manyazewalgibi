"use client"

import { useState, useEffect } from "react"
import { toast } from "react-hot-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
  Filter,
  Loader2,
  Trash,
  XCircle,
  Package,
  Search,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardContent } from "@/components/ui/card"
import type { Wastage, Stock } from "../../app/(admin)/stock/page"

interface WastageListProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  stock: Stock | null
  categories: any[]
  fetchStocks: () => Promise<void>
}

export function WastageList({
  open,
  onOpenChange,
  stock,
  categories,
  fetchStocks,
}: WastageListProps) {
  const [wastages, setWastages] = useState<Wastage[]>([])
  const [filteredWastages, setFilteredWastages] = useState<Wastage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [totalWastage, setTotalWastage] = useState(0)

  useEffect(() => {
    if (open && stock) {
      console.log("WastageList opened for stock:", stock.name)
      fetchWastages()
    }
  }, [open, stock])

  useEffect(() => {
    filterWastages()
  }, [wastages, startDate, endDate, searchTerm])

  const fetchWastages = async () => {
    if (!stock) {
      console.log("No stock selected for wastage list")
      return
    }
    
    console.log("Fetching wastages for stock ID:", stock._id)
    setIsLoading(true)
    try {
      const response = await fetch(`/api/stock-wastage?stockId=${stock._id}`)
      const data = await response.json()
      console.log("Wastages response:", data)
      
      if (data.success) {
        setWastages(data.data || [])
        const total = (data.data || []).reduce((sum: number, w: Wastage) => sum + w.quantity, 0)
        setTotalWastage(total)
        setFilteredWastages(data.data || [])
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

  const filterWastages = () => {
    let filtered = [...wastages]

    if (startDate) {
      filtered = filtered.filter((w) => w.date >= startDate)
    }
    if (endDate) {
      filtered = filtered.filter((w) => w.date <= endDate)
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (w) =>
          w.reason.toLowerCase().includes(term) ||
          w.quantity.toString().includes(term) ||
          new Date(w.date).toLocaleDateString().includes(term)
      )
    }

    setFilteredWastages(filtered)
  }

  const handleDeleteWastage = async (wastageId: string) => {
    if (!confirm("Are you sure you want to delete this wastage record? This will restore the stock.")) {
      return
    }

    setIsDeleting(wastageId)
    try {
      const response = await fetch(`/api/stock-wastage?id=${wastageId}`, {
        method: "DELETE",
      })
      const data = await response.json()
      if (data.success) {
        toast.success("Wastage deleted and stock restored")
        await fetchWastages()
        await fetchStocks()
      } else {
        toast.error(data.message || "Failed to delete wastage")
      }
    } catch (error) {
      console.error("Error deleting wastage:", error)
      toast.error("Failed to delete wastage")
    } finally {
      setIsDeleting(null)
    }
  }

  const clearFilters = () => {
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

  console.log("WastageList render - open:", open, "stock:", stock?.name)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Package className="h-5 w-5" />
            Wastage History - {stock?.name || "Unknown"}
          </DialogTitle>
          <DialogDescription>
            Total Wastage: <span className="font-bold text-red-600">{totalWastage}</span> {stock?.unit || ""}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap gap-4 items-end mb-4">
          <div className="flex-1 min-w-[150px]">
            <Label htmlFor="search" className="text-sm font-medium">
              <Search className="inline h-3 w-3 mr-1" />
              Search
            </Label>
            <Input
              id="search"
              placeholder="Search by reason, quantity..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-9"
            />
          </div>
          <div className="flex-1 min-w-[150px]">
            <Label htmlFor="startDate" className="text-sm font-medium">
              <Calendar className="inline h-3 w-3 mr-1" />
              From
            </Label>
            <Input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-9"
            />
          </div>
          <div className="flex-1 min-w-[150px]">
            <Label htmlFor="endDate" className="text-sm font-medium">
              <Calendar className="inline h-3 w-3 mr-1" />
              To
            </Label>
            <Input
              id="endDate"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-9"
            />
          </div>
          <Button variant="outline" size="sm" onClick={clearFilters} className="h-9">
            <XCircle className="h-4 w-4 mr-1" />
            Clear
          </Button>
          <Button variant="outline" size="sm" onClick={fetchWastages} className="h-9">
            <Filter className="h-4 w-4 mr-1" />
            Refresh
          </Button>
        </div>

        <ScrollArea className="max-h-[60vh]">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredWastages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="bg-muted/50 rounded-full p-4 mb-4">
                <AlertCircle className="h-12 w-12 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No wastage records found</h3>
              <p className="text-muted-foreground">
                {wastages.length === 0
                  ? "No wastage has been registered for this stock yet."
                  : "No records match your filters."}
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredWastages.map((wastage) => (
                    <TableRow key={wastage._id}>
                      <TableCell>{formatDate(wastage.date)}</TableCell>
                      <TableCell>
                        <Badge variant="destructive" className="font-bold">
                          -{wastage.quantity}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {wastage.reason}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteWastage(wastage._id)}
                          disabled={isDeleting === wastage._id}
                          className="text-red-500 hover:text-red-700 hover:bg-red-100"
                        >
                          {isDeleting === wastage._id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </ScrollArea>

        {filteredWastages.length > 0 && (
          <Card className="mt-4">
            <CardContent className="py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Showing {filteredWastages.length} of {wastages.length} records
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-sm">
                    <span className="text-muted-foreground">Total Wastage: </span>
                    <span className="font-bold text-red-600">
                      {filteredWastages.reduce((sum, w) => sum + w.quantity, 0)}
                    </span>
                    <span className="text-muted-foreground ml-1">{stock?.unit}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </DialogContent>
    </Dialog>
  )
}