"use client"

import { useState, useEffect } from "react"
import { Package, ShoppingCart, CheckCircle, XCircle } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface StockUsageDetail {
  stockId: string
  stockName: string
  stockCategory: string
  stockUnit: string
  totalQuantityUsed: number
  totalCost: number
  usageCount: number
  lastUsed: Date | null
  usedInOrders: Array<{ orderNumber: string; orderId: string; quantityUsed: number; cost: number; status: string; usedAt: Date }> | null
}

interface StockUsageDetailsResponse {
  success: boolean
  data?: StockUsageDetail
  items?: any[] // menu items that used this stock
}

export function StockUsageDetailView({
  stockId,
  isOpen,
  onClose,
}: {
  stockId: string
  isOpen: boolean
  onClose: () => void
}) {
  const [stockDetail, setStockDetail] = useState<StockUsageDetail | null>(null)
  const [itemsData, setItemsData] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (stockId && isOpen) {
      fetchStockDetail()
    }
  }, [stockId, isOpen])

  const fetchStockDetail = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      // Fetch main stock usage details
      const response = await fetch(`/api/stock-usage/${stockId}`)
      if (!response.ok) {
        throw new Error("Failed to fetch stock usage details")
      }
      const result: StockUsageDetailsResponse = await response.json()
      
      if (result.success && result.data) {
        setStockDetail(result.data)
        
        // Fetch menu items that used this stock
        if (result.items && result.items.length > 0) {
          setItemsData(result.items)
        } else {
          try {
            const itemsResponse = await fetch(`/api/stock-usage/${stockId}/items`)
            if (itemsResponse.ok) {
              const itemsResult = await itemsResponse.json()
              if (itemsResult.success) {
                setItemsData(itemsResult.items || [])
              }
            }
          } catch (itemsError) {
          }
        }
      } else {
        throw new Error(result.error || "Failed to fetch stock usage details")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center">
            <Package className="mr-2 h-5 w-5" />
            Stock Usage Details - {stockDetail?.stockName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 max-h-[85vh] overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <p className="text-red-600">Error: {error}</p>
              <Button onClick={fetchStockDetail} variant="outline" className="mt-4">
                Retry
              </Button>
            </div>
          ) : stockDetail ? (
            <>
              {/* Stock Information Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <Package className="h-8 w-8 text-blue-500" />
                      <div>
                        <p className="text-sm text-muted-foreground">Stock Name</p>
                        <p className="text-lg font-semibold">{stockDetail.stockName}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <ShoppingCart className="h-8 w-8 text-green-500" />
                      <div>
                        <p className="text-sm text-muted-foreground">Total Used</p>
                        <p className="text-lg font-semibold">
                          {stockDetail.totalQuantityUsed} {stockDetail.stockUnit}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-8 w-8 text-purple-500" />
                      <div>
                        <p className="text-sm text-muted-foreground">Times Used</p>
                        <p className="text-lg font-semibold">{stockDetail.usageCount}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Stock Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardContent className="pt-4">
                    <h3 className="text-lg font-semibold mb-4">Stock Details</h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Category:</span>
                        <span className="font-medium">{stockDetail.stockCategory}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Unit:</span>
                        <Badge variant="secondary">{stockDetail.stockUnit}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total Cost:</span>
                        <span className="font-semibold text-green-600">
                          ${stockDetail.totalCost.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Current Status:</span>
                        <Badge variant={stockDetail.usageCount > 0 ? "default" : "secondary"}>
                          {stockDetail.usageCount > 0 ? "Active" : "Unused"}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-4">
                    <h3 className="text-lg font-semibold mb-4">Usage Summary</h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Last Used:</span>
                        <span className="font-medium">
                          {stockDetail.lastUsed
                            ? new Date(stockDetail.lastUsed).toLocaleDateString()
                            : "Never"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Average per Order:</span>
                        <span className="font-medium">
                          {(stockDetail.totalQuantityUsed / Math.max(stockDetail.usageCount, 1)).toFixed(2)} 
                          {stockDetail.stockUnit}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Usage Frequency:</span>
                        <span className="font-medium">
                          {stockDetail.usageCount > 0 
                            ? `Every ${Math.round((new Date().getTime() - (stockDetail.lastUsed ? new Date(stockDetail.lastUsed).getTime() : new Date().getTime()) ) / (stockDetail.usageCount - 1) / (1000 * 60 * 60 * 24)).toFixed(1)} days`
                            : "No usage yet"}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Orders Using This Stock */}
              {stockDetail.usedInOrders && stockDetail.usedInOrders.length > 0 && (
                <Card>
                  <CardContent className="pt-4">
                    <h3 className="text-lg font-semibold mb-4">Orders Using This Stock</h3>
                    <div className="rounded-md border overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b bg-muted/50">
                            <th className="p-3 text-left font-semibold">Order #</th>
                            <th className="p-3 text-left font-semibold">Status</th>
                            <th className="p-3 text-left font-semibold">Qty Used</th>
                            <th className="p-3 text-left font-semibold">Cost</th>
                            <th className="p-3 text-left font-semibold">Used Date</th>
                            <th className="p-3 text-left font-semibold">Processing</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stockDetail.usedInOrders.map((order) => (
                            <tr key={order.orderId} className="border-b hover:bg-muted/50">
                              <td className="p-3 font-medium">{order.orderNumber}</td>
                              <td className="p-3">
                                <Badge
                                  variant={order.status === "COMPLETED" ? "default" : "secondary"}
                                  className={order.status === "COMPLETED" ? "bg-green-100 text-green-800" : ""}
                                >
                                  {order.status}
                                </Badge>
                              </td>
                              <td className="p-3 font-semibold text-green-600">
                                {order.quantityUsed} {stockDetail.stockUnit}
                              </td>
                              <td className="p-3">
                                ${order.cost.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className="p-3">
                                {order.usedAt ? new Date(order.usedAt).toLocaleDateString() : "N/A"}
                              </td>
                              <td className="p-3">
                                <Badge
                                  variant={order.processingStatus === 'completed' ? 'default' : 
                                           order.processingStatus === 'partial' ? 'outline' : 
                                           order.processingStatus === 'failed' ? 'destructive' : 'secondary'}
                                  className="text-xs"
                                >
                                  {order.processingStatus || 'pending'}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Clear Item Usage Breakdown - What Items Were Used */}
              {itemsData.length > 0 && (
                <Card>
                  <CardContent className="pt-4">
                    <h3 className="text-lg font-semibold mb-4">📋 What Items Were Used From This Stock</h3>
                    <div className="rounded-md border overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b bg-green-50 dark:bg-green-950/20">
                            <th className="p-3 text-left font-semibold">Item Name</th>
                            <th className="p-3 text-left font-semibold">Category</th>
                            <th className="p-3 text-left font-semibold">Total Used</th>
                            <th className="p-3 text-left font-semibold">Per Order</th>
                            <th className="p-3 text-left font-semibold">Unit Cost</th>
                            <th className="p-3 text-left font-semibold">Total Cost</th>
                            <th className="p-3 text-left font-semibold">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {itemsData.map((item, index) => (
                            <tr key={index} className="border-b hover:bg-green-50 dark:hover:bg-green-950/10">
                              <td className="p-3">
                                <div className="font-semibold text-green-700 dark:text-green-400">
                                  {item.itemName || item.name || "Unknown Item"}
                                </div>
                                {item.menuItemDetails?.description && (
                                  <div className="text-xs text-muted-foreground mt-1">
                                    {item.menuItemDetails.description}
                                  </div>
                                )}
                              </td>
                              <td className="p-3">
                                <Badge variant="outline">
                                  {item.menuItemDetails?.category || item.stockCategory || "General"}
                                </Badge>
                              </td>
                              <td className="p-3">
                                <div className="font-bold text-green-600">
                                  {(item.totalQuantity || item.total_quantity || 0).toFixed(2)}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  of {item.menuItemDetails?.unit || item.unit || "unit"}
                                </div>
                              </td>
                              <td className="p-3">
                                <div className="font-medium">
                                  {(item.frequency || 1)} order{((item.frequency || 1) > 1 ? 's' : '')}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  Average: {(item.totalQuantity || item.total_quantity || 0) / Math.max(item.frequency || 1, 1) || 0} each
                                </div>
                              </td>
                              <td className="p-3">
                                <div className="font-medium">
                                  ${((item.totalCost || item.total_cost || 0) / Math.max(item.totalQuantity || item.total_quantity || 1, 1)).toFixed(2)}
                                </div>
                                <div className="text-xs text-muted-foreground">per unit</div>
                              </td>
                              <td className="p-3">
                                <div className="font-bold text-green-700">
                                  ${(item.totalCost || item.total_cost || 0).toFixed(2)}
                                </div>
                              </td>
                              <td className="p-3">
                                <Badge 
                                  variant={item.status === 'used' ? 'default' : 
                                           item.status === 'pending' ? 'outline' : 'destructive'}
                                  className="text-xs"
                                >
                                  {item.status || "used"}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    
                    {/* Summary Box */}
                    <div className="mt-4 p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                      <div className="text-sm font-semibold text-green-800 dark:text-green-300 mb-2">
                        📊 Stock Usage Summary
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                        <div>
                          <div className="text-muted-foreground">Total Items Used</div>
                          <div className="font-bold text-green-700">
                            {itemsData.reduce((sum, item) => sum + (item.totalQuantity || item.total_quantity || 0), 0)} units
                          </div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Unique Items</div>
                          <div className="font-bold text-green-700">
                            {itemsData.length} item{itemsData.length !== 1 ? 's' : ''}
                          </div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Total Orders</div>
                          <div className="font-bold text-green-700">
                            {stockDetail.usedInOrders?.length || 0}
                          </div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Stock Efficiency</div>
                          <div className="font-bold text-green-700">
                            {((itemsData.reduce((sum, item) => sum + (item.totalQuantity || item.total_quantity || 0), 0) / (stockDetail.usageCount || 1)).toFixed(1))} avg/unit
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Processing Status Information */}
              {(stockDetail.usageCount > 0 && stockDetail.processedOrders > 0) && (
                <Card>
                  <CardContent className="pt-4">
                    <h3 className="text-lg font-semibold mb-4">🔄 Processing Status</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="flex items-center gap-3">
                        <div className="h-3 w-3 bg-green-500 rounded-full"></div>
                        <div>
                          <div className="text-sm font-medium">Completed</div>
                          <div className="text-xs text-muted-foreground">
                            {stockDetail.processedOrders} orders fully processed
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="h-3 w-3 bg-amber-500 rounded-full"></div>
                        <div>
                          <div className="text-sm font-medium">Partial</div>
                          <div className="text-xs text-muted-foreground">
                            {stockDetail.pendingOrders} orders partially processed
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="h-3 w-3 bg-red-500 rounded-full"></div>
                        <div>
                          <div className="text-sm font-medium">Failed</div>
                          <div className="text-xs text-muted-foreground">
                            {stockDetail.failedOrders} orders failed processing
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}
