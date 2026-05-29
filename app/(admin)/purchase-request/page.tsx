"use client"

import { useState, useEffect, useMemo } from "react"
import { useSession } from "next-auth/react"
import { Toaster, toast } from "react-hot-toast"
import {
  Package,
  RefreshCw,
  Search,
  Filter,
  CheckCircle,
  Truck,
  ShoppingCart,
  UserCheck,
  Clock,
  DollarSign,
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
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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
  isDelivered: boolean
  isPurchased: boolean
  isConfirmed: boolean
  deliveredAt?: string
  deliveredBy?: string
  purchasedAt?: string
  purchasedBy?: string
  confirmedAt?: string
  confirmedBy?: string
  reason: string
  status: 'pending' | 'delivered' | 'purchased' | 'completed'
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
  delivered: number
  purchased: number
  completed: number
}

const normalizeRole = (role: string | undefined): string => {
  if (!role) return 'DEFAULT';
  return role.toUpperCase().trim();
};

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
  const [generationStatus, setGenerationStatus] = useState<{ canGenerate: boolean; hoursRemaining: number; lastGeneratedAt: string | null } | null>(null)
  
  // Price input modal states
  const [isPriceModalOpen, setIsPriceModalOpen] = useState(false)
  const [priceInputRequestId, setPriceInputRequestId] = useState<string | null>(null)
  const [unitPriceInput, setUnitPriceInput] = useState<string>("")
  const [calculatedTotal, setCalculatedTotal] = useState<number>(0)

  const isAdmin = userRole === 'ADMIN'
  const isFinance = userRole === 'FINANCE'
  const isStockManager = userRole === 'STOCK_MANAGER'
  const canGenerate = isAdmin || isStockManager
  const canToggleDelivered = isAdmin || isFinance
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

  const checkGenerationStatus = async () => {
    if (!canGenerate) return
    try {
      const response = await fetch("/api/purchase-request/generate")
      const data = await response.json()
      if (data.success) {
        setGenerationStatus(data.data)
      }
    } catch (error) {
      console.error("Error checking generation status:", error)
    }
  }

  const handleGenerateRequests = async () => {
    if (!canGenerate) {
      toast.error("You don't have permission to generate purchase requests")
      return
    }
    
    setIsLoading(true)
    try {
      const response = await fetch("/api/purchase-request/generate", {
        method: "POST",
      })
      const data = await response.json()
      if (data.success) {
        toast.success(`${data.data.count} new requests generated for ${data.data.date}`)
        fetchRequests()
        checkGenerationStatus()
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

  // Open price modal before marking as purchased
  const openPriceModal = (requestId: string) => {
    const request = requests.find(r => r._id === requestId)
    if (request) {
      setPriceInputRequestId(requestId)
      // Pre-fill with estimated price if available
      const defaultPrice = request.estimatedUnitPrice || 0
      setUnitPriceInput(defaultPrice.toString())
      setCalculatedTotal(defaultPrice * request.requestedQuantity)
      setIsPriceModalOpen(true)
    }
  }

 // Handle price submission and mark as purchased
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
  
  console.log(`💰 Submitting purchase - Request ID: ${priceInputRequestId}, Unit Price: ${unitPrice}, Total Cost: ${totalCost}`)
  
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

  const handleToggle = async (requestId: string, action: 'delivered' | 'purchased' | 'confirm') => {
    if (action === 'delivered' || action === 'purchased') {
      if (!canToggleDelivered) {
        toast.error("You don't have permission to update delivery/purchase status")
        return
      }
    }
    if (action === 'confirm') {
      if (!canConfirm) {
        toast.error("You don't have permission to confirm stock")
        return
      }
    }
    
    // For purchased action, open price modal instead of direct toggle
    if (action === 'purchased') {
      openPriceModal(requestId)
      return
    }
    
    setIsToggling(true)
    try {
      const payload: any = {
        action,
        userId: session?.user?.id || "system",
      }

      const response = await fetch(`/api/purchase-request/${requestId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await response.json()
      if (data.success) {
        toast.success(`Request ${action}ed successfully`)
        fetchRequests()
      } else {
        toast.error(data.message || `Failed to ${action} request`)
      }
    } catch (error) {
      console.error(`Error toggling ${action}:`, error)
      toast.error(`Failed to ${action} request`)
    } finally {
      setIsToggling(false)
    }
  }

  useEffect(() => {
    fetchRequests()
    if (canGenerate) {
      checkGenerationStatus()
    }
  }, [selectedDate, statusFilter])

  const todaySummary = summary.find(s => s.date === selectedDate)

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return { label: 'Pending', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400', icon: Clock }
      case 'delivered':
        return { label: 'Delivered', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400', icon: Truck }
      case 'purchased':
        return { label: 'Purchased', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400', icon: ShoppingCart }
      case 'completed':
        return { label: 'Completed', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400', icon: CheckCircle }
      default:
        return { label: status, color: 'bg-gray-100 text-gray-800', icon: Package }
    }
  }

  const dailyProgress = todaySummary ? 
    ((todaySummary.completed + todaySummary.purchased) / todaySummary.totalRequests) * 100 : 0

  const changeDate = (days: number) => {
    const currentDate = new Date(selectedDate)
    currentDate.setDate(currentDate.getDate() + days)
    setSelectedDate(currentDate.toISOString().split('T')[0])
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

  // Update calculated total when unit price changes
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

  return (
    <div className="container mx-auto py-10">
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
              Enter the actual unit price to calculate the total purchase cost.
            </DialogDescription>
          </DialogHeader>
          
          {priceInputRequestId && (() => {
            const request = requests.find(r => r._id === priceInputRequestId)
            if (!request) return null
            
            return (
              <div className="space-y-4">
                <div className="bg-gray-50 dark:bg-gray-900/30 p-3 rounded-lg">
                  <p className="text-sm text-muted-foreground">Stock</p>
                  <p className="font-medium">{request.stockName}</p>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div>
                      <p className="text-xs text-muted-foreground">Requested Quantity</p>
                      <p className="font-semibold">{request.requestedQuantity} {request.unit}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Required Amount</p>
                      <p className="font-semibold">{getRequiredAmountDisplay(request)} {request.unit}</p>
                    </div>
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
                
                <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg">
                  <p className="text-sm text-muted-foreground">Calculated Total Cost</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {calculatedTotal.toLocaleString()} ETB
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {request.requestedQuantity} {request.unit} × {parseFloat(unitPriceInput) || 0} ETB
                  </p>
                </div>
                
                <DialogFooter className="gap-2">
                  <Button variant="outline" onClick={() => setIsPriceModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handlePriceSubmit} disabled={!unitPriceInput || parseFloat(unitPriceInput) <= 0}>
                    Confirm Purchase
                  </Button>
                </DialogFooter>
              </div>
            )
          })()}
        </DialogContent>
      </Dialog>

      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <TrendingUp className="h-8 w-8" />
            Purchase Requests
          </h1>
          <div className="flex items-center gap-2 mt-2">
            <p className="text-muted-foreground">
              One request per stock per day | Confirming sets stock to Required Amount
            </p>
            <Badge variant="outline" className="ml-2">
              <Shield className="h-3 w-3 mr-1" />
              Role: {userRole}
            </Badge>
          </div>
        </div>
        <div className="flex gap-2">
          {canGenerate && (
            <Button 
              onClick={handleGenerateRequests} 
              disabled={isLoading}
              className="bg-green-600 hover:bg-green-700"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Generate Requests
            </Button>
          )}
          <Button onClick={fetchRequests} variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {!canGenerate && (
        <Alert className="mb-6 bg-blue-50 dark:bg-blue-950/20 border-blue-200">
          <Lock className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800 dark:text-blue-300">
            You are viewing as {userRole}. You can update Delivered and Purchased status, but cannot generate new requests.
          </AlertDescription>
        </Alert>
      )}

      <Card className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="icon" onClick={() => changeDate(-1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="text-center">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  {new Date(selectedDate).toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </h2>
                {selectedDate !== new Date().toISOString().split('T')[0] && (
                  <p className="text-sm text-muted-foreground">Historical View</p>
                )}
              </div>
              <Button variant="outline" size="icon" onClick={() => changeDate(1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <Badge variant={selectedDate === new Date().toISOString().split('T')[0] ? "default" : "secondary"}>
              {selectedDate === new Date().toISOString().split('T')[0] ? "Today" : "Past Date"}
            </Badge>
          </div>

          {todaySummary ? (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Total Requests</p>
                <p className="text-2xl font-bold">{todaySummary.totalRequests}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Estimated Cost</p>
                <p className="text-2xl font-bold text-blue-600">
                  {todaySummary.totalEstimatedCost.toLocaleString()} ETB
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">{todaySummary.pending}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Delivered/Purchased</p>
                <p className="text-2xl font-bold text-purple-600">{todaySummary.delivered + todaySummary.purchased}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold text-green-600">{todaySummary.completed}</p>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">No requests found for this date</p>
              {selectedDate === new Date().toISOString().split('T')[0] && canGenerate && (
                <Button onClick={handleGenerateRequests} variant="outline" className="mt-4">
                  Generate Requests for Today
                </Button>
              )}
            </div>
          )}
          
          {todaySummary && (
            <div className="mt-4">
              <div className="flex justify-between text-sm mb-1">
                <span>Daily Progress</span>
                <span>{Math.round(dailyProgress)}% Complete</span>
              </div>
              <Progress value={dailyProgress} className="h-2" />
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by stock name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[200px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="purchased">Purchased</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Requests for {new Date(selectedDate).toLocaleDateString()}</CardTitle>
          <CardDescription>
            {isFinance && "Click 'Purchased' to enter unit price and calculate total cost"}
            {isStockManager && "Confirm stock delivery after purchase is completed"}
            {isAdmin && "You have full access to all features"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No purchase requests found for this date</p>
              {selectedDate === new Date().toISOString().split('T')[0] && canGenerate && (
                <Button onClick={handleGenerateRequests} variant="outline" className="mt-4">
                  Generate Requests
                </Button>
              )}
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Stock</TableHead>
                    <TableHead>Required</TableHead>
                    <TableHead>Requested Qty</TableHead>
                    <TableHead>Current Stock</TableHead>
                    <TableHead>Est. Cost</TableHead>
                    <TableHead>Actual Cost</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Progress</TableHead>
                    {(canToggleDelivered || isAdmin) && <TableHead>Finance Actions</TableHead>}
                    {(canConfirm || isAdmin) && <TableHead>Stock Manager Actions</TableHead>}
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.filter(req => 
                    req.stockName.toLowerCase().includes(searchQuery.toLowerCase())
                  ).map((request) => {
                    const statusBadge = getStatusBadge(request.status)
                    const StatusIcon = statusBadge.icon
                    const progress = request.isConfirmed ? 100 : request.isPurchased ? 75 : request.isDelivered ? 50 : 25
                    const requiredAmountDisplay = getRequiredAmountDisplay(request)
                    const currentStock = request.currentStockLevel || request.currentStock || 0
                    const needsReorder = requiredAmountDisplay > currentStock
                    const actualCost = request.actualTotalCost || (request.actualUnitPrice ? request.actualUnitPrice * request.requestedQuantity : null)
                    
                    return (
                      <TableRow key={request._id} className={needsReorder && request.status === 'pending' ? 'bg-orange-50 dark:bg-orange-950/10' : ''}>
                        <TableCell className="font-medium">{request.stockName}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                            <Target className="mr-1 h-3 w-3" />
                            {requiredAmountDisplay} {request.unit}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {request.requestedQuantity} {request.unit}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className={currentStock <= request.minimumStock ? 'text-red-600 font-bold' : ''}>
                              {currentStock} {request.unit}
                            </span>
                            {currentStock < requiredAmountDisplay && requiredAmountDisplay > 0 && (
                              <span className="text-xs text-orange-600">
                                Shortage: {requiredAmountDisplay - currentStock}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {request.estimatedTotalCost.toLocaleString()} ETB
                        </TableCell>
                        <TableCell>
                          {actualCost ? (
                            <span className="font-medium text-green-600">
                              {actualCost.toLocaleString()} ETB
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={statusBadge.color}>
                            <StatusIcon className="mr-1 h-3 w-3" />
                            {statusBadge.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="min-w-[100px]">
                          <Progress value={progress} className="h-2" />
                          <span className="text-xs text-muted-foreground">{progress}%</span>
                        </TableCell>
                        
                        {(canToggleDelivered || isAdmin) && (
                          <TableCell>
                            <div className="flex flex-col gap-2 min-w-[140px]">
                              <div className="flex items-center justify-between gap-2">
                                <Label htmlFor={`delivered-${request._id}`} className="text-sm flex items-center gap-1">
                                  <Truck className="h-3 w-3" />
                                  Delivered
                                </Label>
                                <Switch
                                  id={`delivered-${request._id}`}
                                  checked={request.isDelivered}
                                  onCheckedChange={() => handleToggle(request._id, 'delivered')}
                                  disabled={request.isConfirmed || isToggling}
                                />
                              </div>
                              
                              <div className="flex items-center justify-between gap-2">
                                <Label htmlFor={`purchased-${request._id}`} className="text-sm flex items-center gap-1">
                                  <ShoppingCart className="h-3 w-3" />
                                  Purchased
                                </Label>
                                <Switch
                                  id={`purchased-${request._id}`}
                                  checked={request.isPurchased}
                                  onCheckedChange={() => handleToggle(request._id, 'purchased')}
                                  disabled={!request.isDelivered || request.isConfirmed || isToggling}
                                />
                              </div>
                            </div>
                          </TableCell>
                        )}
                        
                        {(canConfirm || isAdmin) && (
                          <TableCell>
                            <div className="flex flex-col gap-1 min-w-[140px]">
                              <div className="flex items-center justify-between gap-2">
                                <Label htmlFor={`confirm-${request._id}`} className="text-sm flex items-center gap-1">
                                  <UserCheck className="h-3 w-3" />
                                  Confirm
                                </Label>
                                <Switch
                                  id={`confirm-${request._id}`}
                                  checked={request.isConfirmed}
                                  onCheckedChange={() => handleToggle(request._id, 'confirm')}
                                  disabled={!request.isPurchased || isToggling}
                                />
                              </div>
                              {!request.isConfirmed && request.isPurchased && (
                                <span className="text-xs text-green-600">
                                  Will set stock to: {requiredAmountDisplay}
                                </span>
                              )}
                            </div>
                          </TableCell>
                        )}
                        
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedRequest(request)
                              setIsDetailOpen(true)
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Request Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Purchase Request Details</DialogTitle>
            <DialogDescription>
              Complete information about this purchase request
            </DialogDescription>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Stock Name</h4>
                  <p className="text-lg font-semibold">{selectedRequest.stockName}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Request Date</h4>
                  <p>{new Date(selectedRequest.requestDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Unit</h4>
                  <p>{selectedRequest.unit}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Required Amount</h4>
                  <Badge variant="outline" className="bg-blue-50">
                    <Target className="mr-1 h-3 w-3" />
                    {getRequiredAmountDisplay(selectedRequest)} {selectedRequest.unit}
                  </Badge>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Reorder Frequency</h4>
                  <Badge variant="outline" className="capitalize">
                    <Calendar className="mr-1 h-3 w-3" />
                    {selectedRequest.reorderFrequency}
                  </Badge>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Reason</h4>
                  <Badge variant="outline" className="capitalize">
                    {selectedRequest.reason === 'minimum_stock_reached' ? 'Low Stock' : 
                     selectedRequest.reason === 'reorder_frequency_due' ? 'Frequency Due' : 
                     'Manual Request'}
                  </Badge>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-semibold mb-2">Stock Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Current Stock</p>
                    <p className="font-medium">{selectedRequest.currentStockLevel || selectedRequest.currentStock} {selectedRequest.unit}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Required Amount</p>
                    <p className="font-medium text-blue-600">{getRequiredAmountDisplay(selectedRequest)} {selectedRequest.unit}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Minimum Stock</p>
                    <p className="font-medium">{selectedRequest.minimumStock} {selectedRequest.unit}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Requested Quantity</p>
                    <p className="font-medium text-purple-600">{selectedRequest.requestedQuantity} {selectedRequest.unit}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground">Stock After Confirmation</p>
                    <p className="font-medium text-green-600">
                      {getRequiredAmountDisplay(selectedRequest)} {selectedRequest.unit}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Note: Confirming will set stock to the Required Amount
                    </p>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-semibold mb-2">Financial Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Estimated Unit Price</p>
                    <p className="font-medium">{selectedRequest.estimatedUnitPrice.toLocaleString()} ETB</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Estimated Total Cost</p>
                    <p className="font-medium">{selectedRequest.estimatedTotalCost.toLocaleString()} ETB</p>
                  </div>
                  {selectedRequest.actualUnitPrice && (
                    <>
                      <div>
                        <p className="text-sm text-muted-foreground">Actual Unit Price</p>
                        <p className="font-medium text-green-600">{selectedRequest.actualUnitPrice.toLocaleString()} ETB</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Actual Total Cost</p>
                        <p className="font-medium text-green-600">{selectedRequest.actualTotalCost?.toLocaleString()} ETB</p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-semibold mb-2">Workflow Timeline</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-900/30 rounded">
                    <div className="flex items-center gap-2">
                      <Truck className="h-4 w-4 text-blue-600" />
                      <span>Delivered (Finance)</span>
                    </div>
                    <div>
                      {selectedRequest.isDelivered ? (
                        <span className="text-green-600 text-sm">
                          ✓ {selectedRequest.deliveredAt ? new Date(selectedRequest.deliveredAt).toLocaleString() : 'Completed'}
                          {selectedRequest.deliveredBy && <span className="text-xs text-muted-foreground ml-1">by {selectedRequest.deliveredBy}</span>}
                        </span>
                      ) : (
                        <span className="text-gray-400">Pending</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-900/30 rounded">
                    <div className="flex items-center gap-2">
                      <ShoppingCart className="h-4 w-4 text-purple-600" />
                      <span>Purchased (Finance)</span>
                    </div>
                    <div>
                      {selectedRequest.isPurchased ? (
                        <span className="text-green-600 text-sm">
                          ✓ {selectedRequest.purchasedAt ? new Date(selectedRequest.purchasedAt).toLocaleString() : 'Completed'}
                          {selectedRequest.purchasedBy && <span className="text-xs text-muted-foreground ml-1">by {selectedRequest.purchasedBy}</span>}
                        </span>
                      ) : (
                        <span className="text-gray-400">Pending</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-900/30 rounded">
                    <div className="flex items-center gap-2">
                      <UserCheck className="h-4 w-4 text-green-600" />
                      <span>Confirmed (Stock Manager)</span>
                    </div>
                    <div>
                      {selectedRequest.isConfirmed ? (
                        <span className="text-green-600 text-sm">
                          ✓ {selectedRequest.confirmedAt ? new Date(selectedRequest.confirmedAt).toLocaleString() : 'Completed'}
                          {selectedRequest.confirmedBy && <span className="text-xs text-muted-foreground ml-1">by {selectedRequest.confirmedBy}</span>}
                        </span>
                      ) : (
                        <span className="text-gray-400">Pending</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {selectedRequest.notes && (
                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-2">Notes</h4>
                  <p className="text-sm text-muted-foreground">{selectedRequest.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
