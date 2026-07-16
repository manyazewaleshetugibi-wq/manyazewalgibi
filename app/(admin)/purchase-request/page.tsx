"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Toaster, toast } from "react-hot-toast"
import {
  Package,
  RefreshCw,
  Search,
  Filter,
  CheckCircle,
  ShoppingCart,
  UserCheck,
  Clock,
  Loader2,
  Eye,
  TrendingUp,
  Calendar,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Lock,
  Shield,
  Target,
  Calculator,
  Zap,
  X,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"

type PurchaseRequest = {
  _id: string
  stockId: string
  stockName: string
  categoryId: string
  unit: string
  reorderFrequency: string
  requiredAmount: number
  requestDate: string
  requestedQuantity: number
  currentStock: number
  minimumStock: number
  estimatedUnitPrice: number
  estimatedTotalCost: number
  actualUnitPrice?: number
  actualTotalCost?: number
  isPurchased: boolean
  isConfirmed: boolean
  purchasedAt?: string
  purchasedBy?: string
  confirmedAt?: string
  confirmedBy?: string
  reason: string
  status: 'pending' | 'purchased' | 'completed'
  notes?: string
  createdAt: string
  currentStockLevel?: number
  stockUnit?: string
}

type DateSummary = {
  date: string
  totalRequests: number
  totalEstimatedCost: number
  pending: number
  purchased: number
  completed: number
}

const normalizeRole = (role: string | undefined): string => {
  if (!role) return 'DEFAULT';
  return role.toUpperCase().trim();
};

const getReasonInfo = (reason: string) => {
  switch (reason) {
    case 'minimum_stock_reached':
      return {
        label: 'Low Stock',
        description: 'Current stock fell below minimum required level',
        color: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
        icon: AlertTriangle,
      }
    case 'reorder_frequency_due':
      return {
        label: 'Reorder Schedule',
        description: 'Time to reorder based on schedule',
        color: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800',
        icon: Calendar,
      }
    default:
      return {
        label: 'Manual Request',
        description: 'Manually requested',
        color: 'bg-gray-100 text-gray-700 border-gray-200',
        icon: Package,
      }
  }
}

export default function PurchaseRequestPage() {
  const { data: session } = useSession()
  const userRole = normalizeRole(session?.user?.role)

  const [requests, setRequests] = useState<PurchaseRequest[]>([])
  const [summary, setSummary] = useState<DateSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [selectedRequest, setSelectedRequest] = useState<PurchaseRequest | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isToggling, setIsToggling] = useState(false)
  const [isPriceModalOpen, setIsPriceModalOpen] = useState(false)
  const [priceInputRequestId, setPriceInputRequestId] = useState<string | null>(null)
  const [unitPriceInput, setUnitPriceInput] = useState<string>("")
  const [calculatedTotal, setCalculatedTotal] = useState<number>(0)

  const isAdmin = userRole === 'ADMIN'
  const isFinance = userRole === 'FINANCE'
  const isStockManager = userRole === 'STOCK_MANAGER'
  const canGenerate = isAdmin || isStockManager
  const canPurchase = isAdmin || isFinance
  const canConfirm = isAdmin || isStockManager

  const fetchRequests = async () => {
    setIsLoading(true)
    try {
      let roleParam = ''
      if (isFinance) roleParam = 'finance'
      if (isStockManager) roleParam = 'stock_manager'

      const response = await fetch(`/api/purchase-request?role=${roleParam}&status=${statusFilter}&date=${selectedDate}`)
      const data = await response.json()
      if (data.success) {
        setRequests(data.data.requests || [])
        setSummary(data.data.summary || [])
      } else {
        toast.error("Failed to fetch requests")
      }
    } catch (error) {
      console.error("Error fetching requests:", error)
      toast.error("Failed to fetch requests")
    } finally {
      setIsLoading(false)
    }
  }

  const handleGenerateRequests = async () => {
    if (!canGenerate) {
      toast.error("You don't have permission to generate purchase requests")
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch("/api/purchase-request/generate", { method: "POST" })
      const data = await response.json()
      if (data.success) {
        toast.success(`${data.data.count} new requests generated for ${data.data.date}`)
        fetchRequests()
      } else {
        if (response.status === 429) {
          toast.error(data.message)
        } else {
          toast.error("Failed to generate requests")
        }
      }
    } catch (error) {
      console.error("Error generating requests:", error)
      toast.error("Failed to generate requests")
    } finally {
      setIsLoading(false)
    }
  }

  const openPriceModal = (requestId: string) => {
    const request = requests.find(r => r._id === requestId)
    if (request) {
      setPriceInputRequestId(requestId)
      const defaultPrice = request.estimatedUnitPrice || 0
      setUnitPriceInput(defaultPrice.toString())
      setCalculatedTotal(defaultPrice * request.requestedQuantity)
      setIsPriceModalOpen(true)
    }
  }

  const handlePriceSubmit = async () => {
    if (!priceInputRequestId) return

    const unitPrice = parseFloat(unitPriceInput)
    if (isNaN(unitPrice) || unitPrice <= 0) {
      toast.error("Please enter a valid unit price")
      return
    }

    const request = requests.find(r => r._id === priceInputRequestId)
    if (!request) return

    const totalCost = unitPrice * request.requestedQuantity

    setIsToggling(true)
    try {
      const response = await fetch(`/api/purchase-request/${priceInputRequestId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: 'purchased',
          userId: session?.user?.id || "system",
          actualUnitPrice: unitPrice,
          actualTotalCost: totalCost,
        }),
      })
      const data = await response.json()
      if (data.success) {
        toast.success(`Purchase completed! Total: ${totalCost.toLocaleString()} ETB`)
        fetchRequests()
        setIsPriceModalOpen(false)
        setPriceInputRequestId(null)
        setUnitPriceInput("")
        setCalculatedTotal(0)
      } else {
        toast.error(data.message || "Failed to mark as purchased")
      }
    } catch (error) {
      console.error("Error marking as purchased:", error)
      toast.error("Failed to mark as purchased")
    } finally {
      setIsToggling(false)
    }
  }

  const handleToggle = async (requestId: string, action: 'purchased' | 'confirm') => {
    if (action === 'purchased') {
      openPriceModal(requestId)
      return
    }

    if (action === 'confirm' && !canConfirm) {
      toast.error("You don't have permission to confirm stock")
      return
    }

    setIsToggling(true)
    try {
      const response = await fetch(`/api/purchase-request/${requestId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          userId: session?.user?.id || "system",
        }),
      })
      const data = await response.json()
      if (data.success) {
        toast.success(action === 'confirm' ? 'Stock confirmed and updated!' : 'Marked as purchased')
        fetchRequests()
      } else {
        toast.error(data.message || `Failed to ${action}`)
      }
    } catch (error) {
      console.error(`Error toggling ${action}:`, error)
      toast.error(`Failed to ${action}`)
    } finally {
      setIsToggling(false)
    }
  }

  useEffect(() => {
    fetchRequests()
  }, [selectedDate, statusFilter])

  const todaySummary = summary.find(s => s.date === selectedDate)

  const getProgress = (req: PurchaseRequest) => {
    if (req.isConfirmed) return 100
    if (req.isPurchased) return 66
    return 0
  }

  const getRequiredAmountDisplay = (request: PurchaseRequest) => {
    if (request.requiredAmount && request.requiredAmount > 0) {
      return request.requiredAmount
    }
    if (request.requestedQuantity && request.currentStockLevel !== undefined) {
      return request.requestedQuantity + request.currentStockLevel
    }
    return 0
  }

  const changeDate = (days: number) => {
    const currentDate = new Date(selectedDate)
    currentDate.setDate(currentDate.getDate() + days)
    setSelectedDate(currentDate.toISOString().split('T')[0])
  }

  const handleUnitPriceChange = (value: string) => {
    setUnitPriceInput(value)
    const price = parseFloat(value)
    const request = requests.find(r => r._id === priceInputRequestId)
    if (request && !isNaN(price)) {
      setCalculatedTotal(price * request.requestedQuantity)
    } else {
      setCalculatedTotal(0)
    }
  }

  const filteredRequests = requests.filter(req =>
    req.stockName.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-gray-950/50">
      <Toaster position="top-right" />

      {/* Price Input Modal */}
      <Dialog open={isPriceModalOpen} onOpenChange={setIsPriceModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Enter Purchase Details
            </DialogTitle>
            <DialogDescription>
              Enter the actual unit price to calculate the total cost.
            </DialogDescription>
          </DialogHeader>

          {priceInputRequestId && (() => {
            const request = requests.find(r => r._id === priceInputRequestId)
            if (!request) return null
            return (
              <div className="space-y-4">
                <div className="bg-muted/50 p-3 rounded-lg space-y-1">
                  <p className="font-medium">{request.stockName}</p>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-muted-foreground">Qty: <span className="font-semibold text-foreground">{request.requestedQuantity} {request.unit}</span></span>
                    <span className="text-muted-foreground">Target: <span className="font-semibold text-foreground">{getRequiredAmountDisplay(request)} {request.unit}</span></span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unitPrice">Unit Price (ETB)</Label>
                  <Input
                    id="unitPrice"
                    type="number"
                    step="0.01"
                    placeholder="Enter unit price"
                    value={unitPriceInput}
                    onChange={(e) => handleUnitPriceChange(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg text-center">
                  <p className="text-xs text-muted-foreground mb-1">Total Cost</p>
                  <p className="text-2xl font-bold text-blue-600">{calculatedTotal.toLocaleString()} ETB</p>
                  <p className="text-xs text-muted-foreground mt-1">{request.requestedQuantity} x {parseFloat(unitPriceInput) || 0} ETB</p>
                </div>
                <DialogFooter className="gap-2">
                  <Button variant="outline" onClick={() => setIsPriceModalOpen(false)}>Cancel</Button>
                  <Button onClick={handlePriceSubmit} disabled={!unitPriceInput || parseFloat(unitPriceInput) <= 0}>Confirm Purchase</Button>
                </DialogFooter>
              </div>
            )
          })()}
        </DialogContent>
      </Dialog>

      <div className="max-w-7xl mx-auto px-4 py-4 md:py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
              <TrendingUp className="h-5 w-5 md:h-6 md:w-6" />
              Purchase Requests
            </h1>
            <p className="text-xs md:text-sm text-muted-foreground mt-1">
              Purchased → Confirmed sets stock to Required Amount
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              <Shield className="h-3 w-3 mr-1" />
              {userRole}
            </Badge>
            {canGenerate && (
              <Button onClick={handleGenerateRequests} disabled={isLoading} size="sm" className="bg-green-600 hover:bg-green-700">
                <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Generate</span>
              </Button>
            )}
            <Button onClick={fetchRequests} variant="outline" size="sm">
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {!canGenerate && (
          <Alert className="mb-4 bg-blue-50 dark:bg-blue-950/20 border-blue-200">
            <Lock className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-xs md:text-sm text-blue-800 dark:text-blue-300">
              Viewing as {userRole}. You can mark items as purchased and confirm stock.
            </AlertDescription>
          </Alert>
        )}

        {/* Date Navigation + Summary */}
        <Card className="mb-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-0">
          <CardContent className="p-4 md:p-6">
            {/* Date nav */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => changeDate(-1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="text-center min-w-0">
                  <h2 className="text-sm md:text-base font-bold flex items-center gap-1.5 justify-center">
                    <Calendar className="h-4 w-4 shrink-0" />
                    <span className="truncate">
                      {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </h2>
                </div>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => changeDate(1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <Badge variant={selectedDate === today ? "default" : "secondary"} className="text-xs shrink-0">
                {selectedDate === today ? "Today" : "Past"}
              </Badge>
            </div>

            {/* Stats */}
            {todaySummary ? (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-white/60 dark:bg-white/5 rounded-lg p-3 text-center">
                    <p className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-wide">Total</p>
                    <p className="text-xl md:text-2xl font-bold">{todaySummary.totalRequests}</p>
                  </div>
                  <div className="bg-white/60 dark:bg-white/5 rounded-lg p-3 text-center">
                    <p className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-wide">Est. Cost</p>
                    <p className="text-xl md:text-2xl font-bold text-blue-600">{todaySummary.totalEstimatedCost.toLocaleString()}</p>
                    <p className="text-[10px] text-muted-foreground">ETB</p>
                  </div>
                  <div className="bg-white/60 dark:bg-white/5 rounded-lg p-3 text-center">
                    <p className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-wide">Pending</p>
                    <p className="text-xl md:text-2xl font-bold text-yellow-600">{todaySummary.pending}</p>
                  </div>
                  <div className="bg-white/60 dark:bg-white/5 rounded-lg p-3 text-center">
                    <p className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-wide">Done</p>
                    <p className="text-xl md:text-2xl font-bold text-green-600">{todaySummary.purchased + todaySummary.completed}</p>
                  </div>
                </div>
                <div className="mt-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium">{todaySummary.totalRequests > 0 ? Math.round(((todaySummary.purchased + todaySummary.completed) / todaySummary.totalRequests) * 100) : 0}%</span>
                  </div>
                  <Progress value={todaySummary.totalRequests > 0 ? ((todaySummary.purchased + todaySummary.completed) / todaySummary.totalRequests) * 100 : 0} className="h-1.5" />
                </div>
              </>
            ) : (
              <div className="text-center py-6">
                <Package className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No requests for this date</p>
                {selectedDate === today && canGenerate && (
                  <Button onClick={handleGenerateRequests} variant="outline" size="sm" className="mt-3">Generate Requests</Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Search + Filter */}
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search stock..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[130px] h-9 text-sm">
              <Filter className="mr-1.5 h-3.5 w-3.5" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="purchased">Purchased</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Requests List */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No requests found</p>
            {selectedDate === today && canGenerate && (
              <Button onClick={handleGenerateRequests} variant="outline" size="sm" className="mt-3">Generate Requests</Button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block">
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/30">
                          <th className="text-left py-3 px-4 font-medium text-muted-foreground">Stock</th>
                          <th className="text-left py-3 px-4 font-medium text-muted-foreground">Reason</th>
                          <th className="text-right py-3 px-4 font-medium text-muted-foreground">Current</th>
                          <th className="text-right py-3 px-4 font-medium text-muted-foreground">Required</th>
                          <th className="text-right py-3 px-4 font-medium text-muted-foreground">To Buy</th>
                          <th className="text-right py-3 px-4 font-medium text-muted-foreground">Est. Cost</th>
                          <th className="text-right py-3 px-4 font-medium text-muted-foreground">Actual</th>
                          <th className="text-center py-3 px-4 font-medium text-muted-foreground">Status</th>
                          <th className="text-center py-3 px-4 font-medium text-muted-foreground">Progress</th>
                          {(canPurchase || isAdmin) && <th className="text-center py-3 px-4 font-medium text-muted-foreground">Finance</th>}
                          {(canConfirm || isAdmin) && <th className="text-center py-3 px-4 font-medium text-muted-foreground">Confirm</th>}
                          <th className="py-3 px-4"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredRequests.map((request) => {
                          const progress = getProgress(request)
                          const requiredAmountDisplay = getRequiredAmountDisplay(request)
                          const currentStock = request.currentStockLevel || request.currentStock || 0
                          const shortage = Math.max(0, requiredAmountDisplay - currentStock)
                          const actualCost = request.actualTotalCost || (request.actualUnitPrice ? request.actualUnitPrice * request.requestedQuantity : null)
                          const reasonInfo = getReasonInfo(request.reason)
                          const ReasonIcon = reasonInfo.icon

                          return (
                            <tr key={request._id} className={`border-b last:border-b-0 hover:bg-muted/20 transition-colors ${request.status === 'pending' && shortage > 0 ? 'bg-orange-50/50 dark:bg-orange-950/10' : ''}`}>
                              <td className="py-3 px-4">
                                <span className="font-medium">{request.stockName}</span>
                                <span className="text-xs text-muted-foreground block">{request.reorderFrequency}</span>
                              </td>
                              <td className="py-3 px-4">
                                <Badge variant="outline" className={`text-[10px] ${reasonInfo.color}`}>
                                  <ReasonIcon className="h-3 w-3 mr-1" />
                                  {reasonInfo.label}
                                </Badge>
                              </td>
                              <td className="py-3 px-4 text-right">
                                <span className={currentStock <= request.minimumStock ? 'text-red-600 font-bold' : ''}>
                                  {currentStock}
                                </span>
                                <span className="text-muted-foreground text-xs ml-0.5">{request.unit}</span>
                              </td>
                              <td className="py-3 px-4 text-right font-medium">{requiredAmountDisplay} <span className="text-muted-foreground text-xs">{request.unit}</span></td>
                              <td className="py-3 px-4 text-right">
                                <span className="font-semibold">{request.requestedQuantity}</span>
                                <span className="text-muted-foreground text-xs ml-0.5">{request.unit}</span>
                                {shortage > 0 && <span className="text-orange-600 text-[10px] block">-{shortage} shortage</span>}
                              </td>
                              <td className="py-3 px-4 text-right text-muted-foreground">{request.estimatedTotalCost.toLocaleString()} <span className="text-xs">ETB</span></td>
                              <td className="py-3 px-4 text-right">
                                {actualCost ? (
                                  <span className="font-medium text-green-600">{actualCost.toLocaleString()} <span className="text-xs">ETB</span></span>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </td>
                              <td className="py-3 px-4 text-center">
                                {request.status === 'completed' ? (
                                  <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs"><CheckCircle className="h-3 w-3 mr-1" />Done</Badge>
                                ) : request.status === 'purchased' ? (
                                  <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 text-xs"><ShoppingCart className="h-3 w-3 mr-1" />Purchased</Badge>
                                ) : (
                                  <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 text-xs"><Clock className="h-3 w-3 mr-1" />Pending</Badge>
                                )}
                              </td>
                              <td className="py-3 px-4 min-w-[100px]">
                                <div className="flex items-center gap-2">
                                  <Progress value={progress} className="h-1.5 flex-1" />
                                  <span className="text-[10px] text-muted-foreground w-7 text-right">{progress}%</span>
                                </div>
                              </td>
                              {(canPurchase || isAdmin) && (
                                <td className="py-3 px-4 text-center">
                                  <Switch
                                    checked={request.isPurchased}
                                    onCheckedChange={() => handleToggle(request._id, 'purchased')}
                                    disabled={request.isConfirmed || isToggling}
                                  />
                                </td>
                              )}
                              {(canConfirm || isAdmin) && (
                                <td className="py-3 px-4 text-center">
                                  <div className="flex flex-col items-center gap-1">
                                    <Switch
                                      checked={request.isConfirmed}
                                      onCheckedChange={() => handleToggle(request._id, 'confirm')}
                                      disabled={!request.isPurchased || isToggling}
                                    />
                                    {!request.isConfirmed && request.isPurchased && (
                                      <span className="text-[9px] text-green-600">Set stock to {requiredAmountDisplay}</span>
                                    )}
                                  </div>
                                </td>
                              )}
                              <td className="py-3 px-4">
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setSelectedRequest(request); setIsDetailOpen(true) }}>
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-3">
              {filteredRequests.map((request) => {
                const progress = getProgress(request)
                const requiredAmountDisplay = getRequiredAmountDisplay(request)
                const currentStock = request.currentStockLevel || request.currentStock || 0
                const shortage = Math.max(0, requiredAmountDisplay - currentStock)
                const actualCost = request.actualTotalCost || (request.actualUnitPrice ? request.actualUnitPrice * request.requestedQuantity : null)
                const reasonInfo = getReasonInfo(request.reason)
                const ReasonIcon = reasonInfo.icon

                return (
                  <Card key={request._id} className={`overflow-hidden ${request.status === 'pending' && shortage > 0 ? 'border-orange-300' : ''}`}>
                    <CardContent className="p-3">
                      {/* Top: Stock name + status + reason */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold text-sm truncate">{request.stockName}</h3>
                          <span className="text-[10px] text-muted-foreground">{request.reorderFrequency}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Badge variant="outline" className={`text-[10px] ${reasonInfo.color}`}>
                            <ReasonIcon className="h-2.5 w-2.5 mr-0.5" />
                            {reasonInfo.label}
                          </Badge>
                          {request.status === 'completed' ? (
                            <Badge className="bg-green-100 text-green-700 text-[10px]"><CheckCircle className="h-2.5 w-2.5 mr-0.5" />Done</Badge>
                          ) : request.status === 'purchased' ? (
                            <Badge className="bg-purple-100 text-purple-700 text-[10px]"><ShoppingCart className="h-2.5 w-2.5 mr-0.5" />Purchased</Badge>
                          ) : (
                            <Badge className="bg-yellow-100 text-yellow-700 text-[10px]"><Clock className="h-2.5 w-2.5 mr-0.5" />Pending</Badge>
                          )}
                        </div>
                      </div>

                      {/* Stock info */}
                      <div className="grid grid-cols-3 gap-2 mb-2">
                        <div className="text-center bg-muted/30 rounded p-1.5">
                          <p className="text-[9px] text-muted-foreground uppercase">Current</p>
                          <p className={`text-sm font-bold ${currentStock <= request.minimumStock ? 'text-red-600' : ''}`}>{currentStock}<span className="text-[9px] font-normal text-muted-foreground ml-0.5">{request.unit}</span></p>
                        </div>
                        <div className="text-center bg-muted/30 rounded p-1.5">
                          <p className="text-[9px] text-muted-foreground uppercase">Required</p>
                          <p className="text-sm font-bold text-blue-600">{requiredAmountDisplay}<span className="text-[9px] font-normal text-muted-foreground ml-0.5">{request.unit}</span></p>
                        </div>
                        <div className="text-center bg-muted/30 rounded p-1.5">
                          <p className="text-[9px] text-muted-foreground uppercase">To Buy</p>
                          <p className="text-sm font-bold">{request.requestedQuantity}<span className="text-[9px] font-normal text-muted-foreground ml-0.5">{request.unit}</span></p>
                        </div>
                      </div>

                      {shortage > 0 && (
                        <div className="bg-orange-50 dark:bg-orange-950/20 rounded px-2 py-1 mb-2 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3 text-orange-500" />
                          <span className="text-[10px] text-orange-700 dark:text-orange-400">Shortage: {shortage} {request.unit}</span>
                        </div>
                      )}

                      {/* Cost */}
                      <div className="flex items-center justify-between text-xs mb-2">
                        <span className="text-muted-foreground">Est: {request.estimatedTotalCost.toLocaleString()} ETB</span>
                        {actualCost && <span className="font-medium text-green-600">Actual: {actualCost.toLocaleString()} ETB</span>}
                      </div>

                      {/* Progress */}
                      <div className="flex items-center gap-2 mb-3">
                        <Progress value={progress} className="h-1.5 flex-1" />
                        <span className="text-[10px] text-muted-foreground w-7 text-right">{progress}%</span>
                      </div>

                      <Separator className="mb-3" />

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        {(canPurchase || isAdmin) && (
                          <div className="flex items-center gap-1.5 flex-1">
                            <Label className="text-[10px] text-muted-foreground whitespace-nowrap">Purchased</Label>
                            <Switch
                              checked={request.isPurchased}
                              onCheckedChange={() => handleToggle(request._id, 'purchased')}
                              disabled={request.isConfirmed || isToggling}
                            />
                          </div>
                        )}
                        {(canConfirm || isAdmin) && (
                          <div className="flex items-center gap-1.5 flex-1">
                            <Label className="text-[10px] text-muted-foreground whitespace-nowrap">Confirm</Label>
                            <Switch
                              checked={request.isConfirmed}
                              onCheckedChange={() => handleToggle(request._id, 'confirm')}
                              disabled={!request.isPurchased || isToggling}
                            />
                          </div>
                        )}
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => { setSelectedRequest(request); setIsDetailOpen(true) }}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* Request Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Purchase Request Details
            </DialogTitle>
          </DialogHeader>

          {selectedRequest && (() => {
            const reasonInfo = getReasonInfo(selectedRequest.reason)
            const ReasonIcon = reasonInfo.icon
            const requiredAmountDisplay = getRequiredAmountDisplay(selectedRequest)
            const currentStock = selectedRequest.currentStockLevel || selectedRequest.currentStock || 0
            const actualCost = selectedRequest.actualTotalCost || (selectedRequest.actualUnitPrice ? selectedRequest.actualUnitPrice * selectedRequest.requestedQuantity : null)

            return (
              <div className="space-y-4">
                {/* Reason Banner */}
                <div className={`rounded-lg p-3 border ${reasonInfo.color}`}>
                  <div className="flex items-center gap-2">
                    <ReasonIcon className="h-4 w-4" />
                    <div>
                      <p className="font-semibold text-sm">{reasonInfo.label}</p>
                      <p className="text-xs opacity-80">
                        {selectedRequest.reason === 'minimum_stock_reached'
                          ? `Current stock (${currentStock} ${selectedRequest.unit}) fell below minimum (${selectedRequest.minimumStock} ${selectedRequest.unit})`
                          : selectedRequest.reason === 'reorder_frequency_due'
                          ? `Scheduled reorder based on ${selectedRequest.reorderFrequency} frequency`
                          : reasonInfo.description}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Quick Info */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-muted/30 rounded-lg p-3 text-center">
                    <p className="text-[10px] text-muted-foreground uppercase">Current Stock</p>
                    <p className={`text-lg font-bold ${currentStock <= selectedRequest.minimumStock ? 'text-red-600' : ''}`}>{currentStock} <span className="text-xs font-normal text-muted-foreground">{selectedRequest.unit}</span></p>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-3 text-center">
                    <p className="text-[10px] text-muted-foreground uppercase">Required Amount</p>
                    <p className="text-lg font-bold text-blue-600">{requiredAmountDisplay} <span className="text-xs font-normal text-muted-foreground">{selectedRequest.unit}</span></p>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-3 text-center">
                    <p className="text-[10px] text-muted-foreground uppercase">Minimum Stock</p>
                    <p className="text-lg font-bold">{selectedRequest.minimumStock} <span className="text-xs font-normal text-muted-foreground">{selectedRequest.unit}</span></p>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-3 text-center">
                    <p className="text-[10px] text-muted-foreground uppercase">To Purchase</p>
                    <p className="text-lg font-bold text-purple-600">{selectedRequest.requestedQuantity} <span className="text-xs font-normal text-muted-foreground">{selectedRequest.unit}</span></p>
                  </div>
                </div>

                {/* Cost */}
                <div className="border rounded-lg p-3 space-y-2">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase">Cost</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs">Estimated</p>
                      <p className="font-medium">{selectedRequest.estimatedUnitPrice.toLocaleString()} ETB/unit</p>
                      <p className="font-bold">{selectedRequest.estimatedTotalCost.toLocaleString()} ETB total</p>
                    </div>
                    {actualCost && (
                      <div>
                        <p className="text-muted-foreground text-xs">Actual</p>
                        <p className="font-medium text-green-600">{selectedRequest.actualUnitPrice?.toLocaleString()} ETB/unit</p>
                        <p className="font-bold text-green-600">{actualCost.toLocaleString()} ETB total</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Timeline */}
                <div className="border rounded-lg p-3 space-y-2">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase">Workflow</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center ${selectedRequest.isPurchased ? 'bg-purple-100 text-purple-600' : selectedRequest.status === 'pending' ? 'bg-yellow-100 text-yellow-600' : 'bg-gray-100 text-gray-400'}`}>
                        {selectedRequest.isPurchased ? <CheckCircle className="h-3.5 w-3.5" /> : <span className="text-xs font-bold">1</span>}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">Purchased (Finance)</p>
                        {selectedRequest.isPurchased ? (
                          <p className="text-xs text-green-600">
                            {selectedRequest.purchasedAt ? new Date(selectedRequest.purchasedAt).toLocaleString() : 'Done'}
                            {selectedRequest.purchasedBy && <span className="text-muted-foreground ml-1">by {selectedRequest.purchasedBy}</span>}
                          </p>
                        ) : <p className="text-xs text-muted-foreground">Pending</p>}
                      </div>
                    </div>
                    <div className="ml-3 w-px h-4 bg-border" />
                    <div className="flex items-center gap-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center ${selectedRequest.isConfirmed ? 'bg-green-100 text-green-600' : selectedRequest.isPurchased ? 'bg-yellow-100 text-yellow-600' : 'bg-gray-100 text-gray-400'}`}>
                        {selectedRequest.isConfirmed ? <CheckCircle className="h-3.5 w-3.5" /> : <span className="text-xs font-bold">2</span>}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">Confirmed (Stock Manager)</p>
                        {selectedRequest.isConfirmed ? (
                          <p className="text-xs text-green-600">
                            {selectedRequest.confirmedAt ? new Date(selectedRequest.confirmedAt).toLocaleString() : 'Done'}
                            {selectedRequest.confirmedBy && <span className="text-muted-foreground ml-1">by {selectedRequest.confirmedBy}</span>}
                          </p>
                        ) : <p className="text-xs text-muted-foreground">Sets stock to {requiredAmountDisplay} {selectedRequest.unit}</p>}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button variant="outline" onClick={() => setIsDetailOpen(false)}>Close</Button>
                </div>
              </div>
            )
          })()}
        </DialogContent>
      </Dialog>
    </div>
  )
}
