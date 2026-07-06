// components/orders/StockProcess.tsx
"use client"

import React, { useState, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Package, Loader2, AlertCircle, CheckCircle, XCircle, Clock, RefreshCw } from "lucide-react"
import { toast } from "react-hot-toast"
import type { Order } from "@/types/order"

interface StockProcessProps {
  onStockProcessed?: () => void
}

interface PendingStockInfo {
  count: number
  failedCount: number
  pendingOrders: Order[]
  failedOrders: Order[]
}

export function StockProcess({ onStockProcessed }: StockProcessProps) {
  const [pendingStockCount, setPendingStockCount] = useState<number>(0)
  const [failedStockCount, setFailedStockCount] = useState<number>(0)
  const [partialStockCount, setPartialStockCount] = useState<number>(0)
  const [processingStock, setProcessingStock] = useState<boolean>(false)
  const [stockError, setStockError] = useState<string | null>(null)
  const [showConfirmDialog, setShowConfirmDialog] = useState<boolean>(false)
  const [pendingOrders, setPendingOrders] = useState<Order[]>([])
  const [failedOrders, setFailedOrders] = useState<Order[]>([])
  const [partialOrders, setPartialOrders] = useState<Order[]>([])
  const [showDetails, setShowDetails] = useState<boolean>(false)

  const checkPendingStockOrders = useCallback(async () => {
    try {
      const response = await fetch('/api/order?all=true&status=COMPLETED')
      if (!response.ok) throw new Error('Failed to fetch orders')
      const data = await response.json()

      const completedOrders: Order[] = data.orders || []

      const pending = completedOrders.filter(
        o => o.status === "COMPLETED" && !o.stockProcessed && !o.stockProcessingError
      )
      const failed = completedOrders.filter(
        o => o.status === "COMPLETED" && !o.stockProcessed && o.stockProcessingError
      )
      const partial = completedOrders.filter(
        o => o.status === "COMPLETED" && o.stockProcessed && o.hasPartialStock
      )

      setPendingStockCount(pending.length)
      setFailedStockCount(failed.length)
      setPartialStockCount(partial.length)
      setPendingOrders(pending)
      setFailedOrders(failed)
      setPartialOrders(partial)

      if (pending.length === 0 && failed.length === 0 && partial.length === 0) {
        setStockError(null)
      }
    } catch (error) {
      console.error('Error checking pending stock:', error)
      setStockError('Failed to check')
    }
  }, [])

  const handleProcessStock = useCallback(async () => {
    setProcessingStock(true)
    setStockError(null)

    try {
      const response = await fetch('/api/cron/process-stock', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      })

      const result = await response.json()

      if (result.success) {
        const processed = result.processedOrders || 0
        const failed = result.failedOrders || 0
        const partial = result.partialOrders || 0

        if (processed > 0) toast.success(`✅ Successfully processed ${processed} orders!`)
        if (partial > 0) toast(`⚠️ ${partial} orders partially processed — some stocks still pending`)
        if (failed > 0) toast.error(`❌ ${failed} orders failed to process`)
        if (processed === 0 && failed === 0 && partial === 0) toast('No pending orders to process')

        setTimeout(() => {
          checkPendingStockOrders()
          onStockProcessed?.()
        }, 2000)
      } else {
        throw new Error(result.error || 'Processing failed')
      }
    } catch (error) {
      console.error('Error processing stock:', error)
      setStockError('Error')
      toast.error('Failed to process stock. Please try again.')
    } finally {
      setProcessingStock(false)
      setShowConfirmDialog(false)
    }
  }, [checkPendingStockOrders, onStockProcessed])

  const handleRetryFailed = useCallback(async () => {
    if (failedOrders.length === 0) return
    
    setProcessingStock(true)
    try {
      // Call API to retry specific failed orders or all
      const response = await fetch('/api/cron/process-stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ retryFailed: true })
      })
      
      const result = await response.json()
      
      if (result.success) {
        toast.success(`Retried ${result.processedOrders || 0} failed orders`)
        setTimeout(() => {
          checkPendingStockOrders()
          onStockProcessed?.()
        }, 2000)
      } else {
        throw new Error(result.error || 'Retry failed')
      }
    } catch (error) {
      console.error('Error retrying failed orders:', error)
      toast.error('Failed to retry orders')
    } finally {
      setProcessingStock(false)
    }
  }, [failedOrders, checkPendingStockOrders, onStockProcessed])

  useEffect(() => {
    checkPendingStockOrders()
    const interval = setInterval(checkPendingStockOrders, 30000)
    return () => clearInterval(interval)
  }, [checkPendingStockOrders])

  const getStockStatusBadge = (order: Order) => {
    if (order.stockProcessed && !order.hasPartialStock) {
      return {
        icon: <CheckCircle className="h-3 w-3" />,
        label: "Stock Processed",
        color: "bg-green-100 text-green-800 border-green-200",
        tooltip: `Processed on ${order.stockProcessedAt ? new Date(order.stockProcessedAt).toLocaleString() : 'Unknown'}`
      }
    } else if (order.stockProcessed && order.hasPartialStock) {
      const names = order.pendingStockItems?.map(i => `${i.stockName} (need ${i.requiredQuantity}${i.unit}, have ${i.currentStock}${i.unit})`).join(', ') || ''
      return {
        icon: <AlertCircle className="h-3 w-3" />,
        label: "Partial Stock",
        color: "bg-orange-100 text-orange-800 border-orange-200",
        tooltip: `Waiting for: ${names}`
      }
    } else if (order.stockProcessingError) {
      return {
        icon: <XCircle className="h-3 w-3" />,
        label: "Stock Failed",
        color: "bg-red-100 text-red-800 border-red-200",
        tooltip: order.stockProcessingError
      }
    } else if (order.status === "COMPLETED") {
      return {
        icon: <Clock className="h-3 w-3" />,
        label: "Pending Stock",
        color: "bg-yellow-100 text-yellow-800 border-yellow-200",
        tooltip: "Awaiting stock processing"
      }
    }
    return null
  }

  const StockStatusBadge = ({ order }: { order: Order }) => {
    const status = getStockStatusBadge(order)
    if (!status) return null
    
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className={status.color}>
              {status.icon}
              <span className="ml-1">{status.label}</span>
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs max-w-xs">{status.tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  const StockConfirmDialog = () => (
    <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
      <AlertDialogContent className="max-w-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle>Process Stock for {pendingStockCount + partialStockCount} Orders?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div>
              <p>This will deduct stock quantities for {pendingStockCount} new order(s) and retry {partialStockCount} partial order(s).</p>

              {/* Partial stock warnings */}
              {partialOrders.length > 0 && (
                <div className="mt-4 p-3 bg-orange-50 rounded-lg border border-orange-200">
                  <p className="text-sm font-semibold text-orange-800 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    {partialOrders.length} order(s) waiting for restocking:
                  </p>
                  <ul className="mt-2 space-y-2 max-h-48 overflow-y-auto">
                    {partialOrders.map(order => (
                      <li key={order._id} className="text-xs text-orange-700">
                        <span className="font-medium">Order #{order.orderNumber}:</span>
                        <ul className="ml-3 mt-1 space-y-0.5">
                          {order.pendingStockItems?.map((item, i) => (
                            <li key={i} className="text-orange-600">
                              ⚠️ <span className="font-medium">{item.stockName}</span> — needs {item.requiredQuantity}{item.unit}, only {item.currentStock}{item.unit} available (short by {item.deficit}{item.unit})
                            </li>
                          ))}
                        </ul>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Failed orders */}
              {failedStockCount > 0 && (
                <div className="mt-3 p-3 bg-red-50 rounded-lg border border-red-200">
                  <p className="text-sm font-semibold text-red-800 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    {failedStockCount} order(s) previously failed:
                  </p>
                  <ul className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                    {failedOrders.slice(0, 5).map(order => (
                      <li key={order._id} className="text-xs text-red-700">
                        Order #{order.orderNumber}: {order.stockProcessingError}
                      </li>
                    ))}
                    {failedOrders.length > 5 && (
                      <li className="text-xs text-red-600">...and {failedOrders.length - 5} more</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex gap-2">
          <AlertDialogCancel onClick={() => setShowConfirmDialog(false)}>
            Cancel
          </AlertDialogCancel>
          {failedStockCount > 0 && (
            <Button
              onClick={handleRetryFailed}
              disabled={processingStock}
              variant="outline"
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${processingStock ? "animate-spin" : ""}`} />
              Retry Failed ({failedStockCount})
            </Button>
          )}
          <AlertDialogAction
            onClick={handleProcessStock}
            className="bg-green-600 hover:bg-green-700"
            disabled={processingStock || (pendingStockCount === 0 && partialStockCount === 0)}
          >
            {processingStock ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing...</>
            ) : (
              <><Package className="mr-2 h-4 w-4" />Process Stock ({pendingStockCount + partialStockCount})</>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )

  return {
    pendingStockCount,
    failedStockCount,
    partialStockCount,
    processingStock,
    stockError,
    checkPendingStockOrders,
    handleProcessStock,
    handleRetryFailed,
    StockStatusBadge,
    StockConfirmDialog,
    setShowConfirmDialog,
    pendingOrders,
    failedOrders,
    partialOrders,
    showDetails,
    setShowDetails
  }
}