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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Loader2,
  Trash,
  XCircle,
  Package,
  Search,
  ArrowRightLeft,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Check,
  X,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { Stock, Category } from "../../app/(admin)/stock/page"

export type Transfer = {
  _id: string
  stockId: any
  quantity: number
  receiverName: string
  note: string
  date: string
  createdAt: string
}

interface TransferDisplayProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  stocks: Stock[]
  categories: Category[]
  fetchStocks: () => Promise<void>
}

export function TransferDisplay({
  open,
  onOpenChange,
  stocks,
  categories,
  fetchStocks,
}: TransferDisplayProps) {
  const [transfers, setTransfers] = useState<Transfer[]>([])
  const [filtered, setFiltered] = useState<Transfer[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [selectedStockId, setSelectedStockId] = useState("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // Inline edit state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<{ quantity: number; receiverName: string; note: string }>({
    quantity: 0,
    receiverName: "",
    note: "",
  })
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (open) fetchAll()
  }, [open])

  useEffect(() => {
    let result = [...transfers]
    if (selectedStockId !== "all") {
      result = result.filter((t) => {
        const id = typeof t.stockId === "object" ? t.stockId._id : t.stockId
        return id === selectedStockId
      })
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      result = result.filter(
        (t) =>
          getStockName(t.stockId).toLowerCase().includes(term) ||
          t.receiverName.toLowerCase().includes(term) ||
          (t.note || "").toLowerCase().includes(term)
      )
    }
    result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    setFiltered(result)
    setCurrentPage(1)
  }, [transfers, selectedStockId, searchTerm])

  const fetchAll = async () => {
    setIsLoading(true)
    try {
      const res = await fetch("/api/stock-transfer")
      const data = await res.json()
      if (data.success) setTransfers(data.data || [])
      else toast.error("Failed to fetch transfers")
    } catch {
      toast.error("Failed to fetch transfers")
    } finally {
      setIsLoading(false)
    }
  }

  const getStockName = (stockId: any) => {
    if (typeof stockId === "object" && stockId !== null) return stockId.name
    return stocks.find((s) => s._id === stockId)?.name || "Unknown"
  }

  const getStockUnit = (stockId: any) => {
    if (typeof stockId === "object" && stockId !== null) return stockId.unit
    return stocks.find((s) => s._id === stockId)?.unit || ""
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this transfer? Stock will be restored.")) return
    setIsDeleting(id)
    try {
      const res = await fetch(`/api/stock-transfer?id=${id}`, { method: "DELETE" })
      const data = await res.json()
      if (data.success) {
        toast.success("Transfer deleted")
        await fetchAll()
        await fetchStocks()
      } else {
        toast.error(data.message || "Failed to delete")
      }
    } catch {
      toast.error("Failed to delete")
    } finally {
      setIsDeleting(null)
    }
  }

  const startEdit = (t: Transfer) => {
    setEditingId(t._id)
    setEditValues({ quantity: t.quantity, receiverName: t.receiverName, note: t.note || "" })
  }

  const cancelEdit = () => {
    setEditingId(null)
  }

  const saveEdit = async (t: Transfer) => {
    if (!editValues.receiverName.trim()) {
      toast.error("Receiver name is required")
      return
    }
    if (editValues.quantity <= 0) {
      toast.error("Quantity must be greater than 0")
      return
    }
    setIsSaving(true)
    try {
      const res = await fetch(`/api/stock-transfer?id=${t._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editValues),
      })
      const data = await res.json()
      if (data.success) {
        toast.success("Transfer updated")
        setEditingId(null)
        await fetchAll()
        await fetchStocks()
      } else {
        toast.error(data.message || "Failed to update")
      }
    } catch {
      toast.error("Failed to update")
    } finally {
      setIsSaving(false)
    }
  }

  const indexOfLast = currentPage * itemsPerPage
  const indexOfFirst = indexOfLast - itemsPerPage
  const currentItems = filtered.slice(indexOfFirst, indexOfLast)
  const totalPages = Math.ceil(filtered.length / itemsPerPage)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[95vh] p-4 sm:p-6">
        <DialogHeader className="pb-4">
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 text-blue-500" />
            Kitchen Transfer Records
          </DialogTitle>
        </DialogHeader>

        {/* Summary */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <p className="text-xs text-muted-foreground">Total Records</p>
            <p className="text-xl font-bold text-blue-600">{filtered.length}</p>
          </div>
          <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
            <p className="text-xs text-muted-foreground">Total Transferred</p>
            <p className="text-xl font-bold text-green-600">
              {filtered.reduce((s, t) => s + t.quantity, 0).toFixed(2)}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <Select value={selectedStockId} onValueChange={setSelectedStockId}>
            <SelectTrigger className="h-9 flex-1">
              <SelectValue placeholder="All Stocks" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stocks</SelectItem>
              {stocks.map((s) => (
                <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 h-9"
            />
          </div>
          <Button variant="outline" size="sm" onClick={() => { setSelectedStockId("all"); setSearchTerm("") }} className="h-9">
            <XCircle className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={fetchAll} className="h-9">
            <ArrowRightLeft className="h-4 w-4" />
          </Button>
        </div>

        {/* Table */}
        <div className="rounded-md border overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Date</TableHead>
                  <TableHead className="text-xs">Stock</TableHead>
                  <TableHead className="text-xs text-right">Qty</TableHead>
                  <TableHead className="text-xs">Receiver</TableHead>
                  <TableHead className="text-xs hidden md:table-cell">Note</TableHead>
                  <TableHead className="text-xs text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : currentItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <Package className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-muted-foreground">No transfer records found</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  currentItems.map((t) =>
                    editingId === t._id ? (
                      <TableRow key={t._id} className="bg-blue-50/50 dark:bg-blue-950/10">
                        <TableCell className="text-xs">{new Date(t.date).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs bg-blue-50">
                            {getStockName(t.stockId)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            step="0.01"
                            value={editValues.quantity}
                            onChange={(e) => setEditValues((v) => ({ ...v, quantity: parseFloat(e.target.value) || 0 }))}
                            className="h-7 w-20 text-xs text-right"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={editValues.receiverName}
                            onChange={(e) => setEditValues((v) => ({ ...v, receiverName: e.target.value }))}
                            className="h-7 text-xs"
                            placeholder="Receiver"
                          />
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <Input
                            value={editValues.note}
                            onChange={(e) => setEditValues((v) => ({ ...v, note: e.target.value }))}
                            className="h-7 text-xs"
                            placeholder="Note"
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => saveEdit(t)}
                              disabled={isSaving}
                              className="h-7 w-7 p-0 text-green-600 hover:text-green-800"
                            >
                              {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={cancelEdit}
                              className="h-7 w-7 p-0 text-gray-500 hover:text-gray-700"
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      <TableRow key={t._id} className="hover:bg-muted/50">
                        <TableCell className="text-xs whitespace-nowrap">
                          {new Date(t.date).toLocaleDateString("en-ET", { year: "numeric", month: "short", day: "numeric" })}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs bg-blue-50">
                            {getStockName(t.stockId)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge className="text-xs bg-green-100 text-green-800 border-green-200">
                            {t.quantity} {getStockUnit(t.stockId)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs font-medium">{t.receiverName}</TableCell>
                        <TableCell className="text-xs hidden md:table-cell max-w-[120px] truncate text-muted-foreground">
                          {t.note || "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => startEdit(t)}
                              className="h-7 w-7 p-0 text-blue-500 hover:text-blue-700"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(t._id)}
                              disabled={isDeleting === t._id}
                              className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
                            >
                              {isDeleting === t._id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Trash className="h-3.5 w-3.5" />
                              )}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  )
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Pagination */}
        {filtered.length > itemsPerPage && (
          <div className="flex items-center justify-between mt-4">
            <span className="text-xs text-muted-foreground">
              {indexOfFirst + 1}-{Math.min(indexOfLast, filtered.length)} of {filtered.length}
            </span>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className="h-8 px-2">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-xs flex items-center px-2">{currentPage}/{totalPages}</span>
              <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="h-8 px-2">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
