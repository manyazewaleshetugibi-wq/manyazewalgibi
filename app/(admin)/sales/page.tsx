"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  BarChart,
  DollarSign,
  ShoppingCart,
  ArrowDownIcon,
  Download,
  Eye,
  User,
  Clock,
  CreditCard,
  CalendarDays,
  Utensils,
  Filter,
  TrendingUp,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, LineChart, Line, Bar } from "recharts"
import * as XLSX from "xlsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { DateRangePicker } from "@/components/ui/date-range-picker"
import { DatePicker } from "@/components/ui/date-picker"

type Order = {
  _id: string
  orderNumber: string
  tableNumber: string
  waiterId: string
  numberOfGuests: number
  items: Array<{
    itemId: string
    quantity: number
    unitPrice: number
    subtotal: number
    status: string
  }>
  totalAmount: number
  discount: number
  tax: number
  finalAmount: number
  status: string
  paymentMethod: string
  specialRequirements: string
  createdAt: string
  updatedAt: string
}

type Waitress = {
  _id: string
  name: string
  phone: string
  shift: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

type Item = {
  _id: string
  name: string
  description: string
  categoryId: string
  price: number
  imageUrl: string
  requiredStock: Array<{
    stockId: string
    quantity: number
  }>
  nutritionalInfo: {
    calories: number
    protein: number
    carbohydrates: number
    fat: number
  }
  preparationTime: number
  isActive: boolean
  isFeatured: boolean
  createdAt: string
  updatedAt: string
}

type SalesData = {
  totalSales: number
  orderCount: number
  totalTax: number
  totalDiscounts: number
  dailySales: Record<string, number>
  orders: Order[]
}

async function fetchSalesData(): Promise<SalesData> {
  const response = await fetch("/api/order/report")
  const data = await response.json()
  return data
}

async function fetchWaitress(id: string): Promise<Waitress> {
  const response = await fetch(`/api/waitress/${id}`)
  const data = await response.json()
  return data
}

async function fetchItems(itemIds: string[]): Promise<Record<string, Item>> {
  const items: Record<string, Item> = {}
  for (const id of itemIds) {
    const response = await fetch(`/api/items/${id}`)
    const data = await response.json()
    if (data.success && data.items.length > 0) {
      items[id] = data.items[0]
    }
  }
  return items
}

function exportToExcel(data: any[], filename: string) {
  const worksheet = XLSX.utils.json_to_sheet(data)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, "Sales Data")
  XLSX.writeFile(workbook, `${filename}.xlsx`)
}

function SalesChart({ data, type = "line" }: { data: Record<string, number>, type?: "line" | "bar" }) {
  const chartData = Object.entries(data).map(([date, amount]) => ({
    name: new Date(date).toLocaleDateString(),
    total: amount,
    date: date,
  }))

  return (
    <ResponsiveContainer width="100%" height={350}>
      {type === "line" ? (
        <LineChart data={chartData}>
          <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis
            stroke="#888888"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `${value} ETB`}
          />
          <Tooltip
            contentStyle={{ background: "#333", border: "none", borderRadius: "8px" }}
            labelStyle={{ color: "#fff" }}
            itemStyle={{ color: "#adfa1d" }}
            formatter={(value) => [`${value} ETB`, "Sales"]}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="total"
            stroke="#adfa1d"
            strokeWidth={2}
            dot={{ fill: "#adfa1d", strokeWidth: 2 }}
            name="Sales"
          />
        </LineChart>
      ) : (
        <BarChart data={chartData}>
          <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis
            stroke="#888888"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `${value} ETB`}
          />
          <Tooltip
            contentStyle={{ background: "#333", border: "none", borderRadius: "8px" }}
            labelStyle={{ color: "#fff" }}
            itemStyle={{ color: "#adfa1d" }}
            formatter={(value) => [`${value} ETB`, "Sales"]}
          />
          <Legend />
          <Bar dataKey="total" fill="#adfa1d" radius={[4, 4, 0, 0]} name="Sales" />
        </BarChart>
      )}
    </ResponsiveContainer>
  )
}

function getDateRange(type: 'today' | 'week' | 'month' | 'year' | 'custom') {
  const now = new Date();
  const start = new Date();
  const end = new Date();

  switch (type) {
    case 'today':
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'week':
      start.setDate(now.getDate() - now.getDay());
      start.setHours(0, 0, 0, 0);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      break;
    case 'month':
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(now.getMonth() + 1, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'year':
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(11, 31);
      end.setHours(23, 59, 59, 999);
      break;
  }

  return { start, end };
}

export default function DashboardPage() {
  const [salesData, setSalesData] = useState<SalesData | null>(null)
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([])
  const [filteredOverviewOrders, setFilteredOverviewOrders] = useState<Order[]>([])
  const [dateRange, setDateRange] = useState<{ start: Date | null; end: Date | null }>({ start: null, end: null })
  const [filterType, setFilterType] = useState<'today' | 'week' | 'month' | 'year' | 'custom'>('today')
  const [sortBy, setSortBy] = useState<keyof Order>("createdAt")
  const [sortOrder, setSortOrder] = useState("desc")
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [selectedWaitress, setSelectedWaitress] = useState<Waitress | null>(null)
  const [selectedItems, setSelectedItems] = useState<Record<string, Item>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [chartType, setChartType] = useState<"line" | "bar">("line")

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      const data = await fetchSalesData()
      setSalesData(data)
      const { start, end } = getDateRange('today')
      setDateRange({ start, end })
      const filtered = filterOrdersByDate(data.orders || [], start, end)
      setFilteredOrders(filtered)
      setFilteredOverviewOrders(filtered)
      setIsLoading(false)
    }
    loadData()
  }, [])

  const filterOrdersByDate = (orders: Order[], start: Date | null, end: Date | null) => {
    if (!start || !end) return orders
    return orders.filter(order => {
      const orderDate = new Date(order.createdAt)
      return orderDate >= start && orderDate <= end
    })
  }

  const handleFilterChange = (type: 'today' | 'week' | 'month' | 'year' | 'custom', customStart?: Date, customEnd?: Date) => {
    setFilterType(type)
    let start: Date | null = null
    let end: Date | null = null

    if (type === 'custom' && customStart && customEnd) {
      start = customStart
      end = customEnd
    } else if (type !== 'custom') {
      const range = getDateRange(type)
      start = range.start
      end = range.end
    }

    if (start && end) {
      setDateRange({ start, end })
      if (salesData) {
        const filtered = filterOrdersByDate(salesData.orders, start, end)
        setFilteredOrders(filtered)
        setFilteredOverviewOrders(filtered)
      }
    }
  }

  const calculateMetrics = (orders: Order[]) => {
    const totalSales = orders.reduce((sum, order) => sum + order.finalAmount, 0)
    const totalTax = orders.reduce((sum, order) => sum + order.tax, 0)
    const totalDiscounts = orders.reduce((sum, order) => sum + order.discount, 0)
    
    return {
      totalSales,
      orderCount: orders.length,
      totalTax,
      totalDiscounts,
      averageOrderValue: orders.length > 0 ? totalSales / orders.length : 0
    }
  }

  const getDailySalesData = (orders: Order[]) => {
    const dailySales: Record<string, number> = {}
    orders.forEach(order => {
      const date = new Date(order.createdAt).toLocaleDateString()
      dailySales[date] = (dailySales[date] || 0) + order.finalAmount
    })
    return dailySales
  }

  const handleSort = (field: keyof Order) => {
    const order = field === sortBy && sortOrder === "asc" ? "desc" : "asc"
    setSortBy(field)
    setSortOrder(order)
    const sorted = [...filteredOrders].sort((a, b) => {
      if (a[field] < b[field]) return order === "asc" ? -1 : 1
      if (a[field] > b[field]) return order === "asc" ? 1 : -1
      return 0
    })
    setFilteredOrders(sorted)
  }

  const handleExport = (section: 'overview' | 'analytics') => {
    const data = section === 'overview' ? filteredOverviewOrders : filteredOrders
    const filename = section === 'overview' ? 'overview_sales_report' : 'analytics_sales_report'
    
    const exportData = data.map(order => ({
      'Order Number': order.orderNumber,
      'Table Number': order.tableNumber,
      'Total Amount': order.totalAmount,
      'Discount': order.discount,
      'Tax': order.tax,
      'Final Amount': order.finalAmount,
      'Status': order.status,
      'Payment Method': order.paymentMethod,
      'Number of Guests': order.numberOfGuests,
      'Created Date': new Date(order.createdAt).toLocaleDateString(),
      'Created Time': new Date(order.createdAt).toLocaleTimeString(),
    }))
    
    exportToExcel(exportData, filename)
  }

  const handleViewDetails = async (order: Order) => {
    setSelectedOrder(order)
    const waitress = await fetchWaitress(order.waiterId)
    setSelectedWaitress(waitress)

    const itemIds = order.items.map((item) => item.itemId)
    const items = await fetchItems(itemIds)
    setSelectedItems(items)
  }

  const columns = [
    { accessorKey: "orderNumber", header: "Order Number" },
    { accessorKey: "tableNumber", header: "Table" },
    {
      accessorKey: "totalAmount",
      header: "Total",
      cell: ({ row }: { row: { getValue: (key: string) => string } }) => {
        const amount = Number.parseFloat(row.getValue("totalAmount"))
        const formatted = new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "ETB",
        }).format(amount)
        return <div className="font-medium">{formatted}</div>
      },
    },
    {
      accessorKey: "discount",
      header: "Discount",
      cell: ({ row }: { row: { getValue: (key: string) => string } }) => {
        const amount = Number.parseFloat(row.getValue("discount"))
        const formatted = new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "ETB",
        }).format(amount)
        return <div className="text-right font-medium">{formatted}</div>
      },
    },
    {
      accessorKey: "tax",
      header: "Tax",
      cell: ({ row }: { row: { getValue: (key: string) => string } }) => {
        const amount = Number.parseFloat(row.getValue("tax"))
        const formatted = new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "ETB",
        }).format(amount)
        return <div className="text-right font-medium">{formatted}</div>
      },
    },
    {
      accessorKey: "finalAmount",
      header: "Final Amount",
      cell: ({ row }: { row: { getValue: (key: string) => string } }) => {
        const amount = Number.parseFloat(row.getValue("finalAmount"))
        const formatted = new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "ETB",
        }).format(amount)
        return <div className="text-right font-medium">{formatted}</div>
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }: { row: { getValue: (key: string) => string } }) => {
        const status = row.getValue("status") as string
        return (
          <Badge variant={status === "COMPLETED" ? "default" : status === "PENDING" ? "secondary" : "destructive"}>
            {status}
          </Badge>
        )
      },
    },
    {
      accessorKey: "createdAt",
      header: "Date",
      cell: ({ row }: { row: { getValue: (key: string) => string } }) => {
        return new Date(row.getValue("createdAt")).toLocaleString()
      },
    },
    {
      id: "actions",
      cell: ({ row }: { row: { original: Order } }) => {
        const order = row.original
        return (
          <Button variant="ghost" onClick={() => handleViewDetails(order)}>
            <Eye className="h-4 w-4 mr-2" />
            View
          </Button>
        )
      },
    },
  ]

  const overviewMetrics = useMemo(() => calculateMetrics(filteredOverviewOrders), [filteredOverviewOrders])
  const dailySalesData = useMemo(() => getDailySalesData(filteredOverviewOrders), [filteredOverviewOrders])

  if (isLoading)
    return (
      <div className="flex-col md:flex">
        <div className="flex-1 space-y-4 p-8 pt-6">
          <Skeleton className="w-[250px] h-[36px]" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-[125px] w-full" />
            ))}
          </div>
          <Skeleton className="h-[350px] w-full" />
        </div>
      </div>
    )

  return (
    <div className="flex-col md:flex">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Sales Dashboard</h2>
          <div className="flex items-center space-x-2">
            <Button variant="outline" className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filter by Date
            </Button>
          </div>
        </div>
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="space-y-4">
            {/* Date Filter for Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Filter by Date Range
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col md:flex-row md:items-center gap-4 mb-4">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant={filterType === 'today' ? "default" : "outline"}
                      onClick={() => handleFilterChange('today')}
                    >
                      Today
                    </Button>
                    <Button
                      variant={filterType === 'week' ? "default" : "outline"}
                      onClick={() => handleFilterChange('week')}
                    >
                      This Week
                    </Button>
                    <Button
                      variant={filterType === 'month' ? "default" : "outline"}
                      onClick={() => handleFilterChange('month')}
                    >
                      This Month
                    </Button>
                    <Button
                      variant={filterType === 'year' ? "default" : "outline"}
                      onClick={() => handleFilterChange('year')}
                    >
                      This Year
                    </Button>
                    <Button
                      variant={filterType === 'custom' ? "default" : "outline"}
                      onClick={() => setFilterType('custom')}
                    >
                      Custom Range
                    </Button>
                  </div>
                  
                  <div className="flex-1 flex items-center gap-2">
                    <span className="text-sm font-medium">Date Range:</span>
                    <span className="text-sm text-muted-foreground">
                      {dateRange.start && dateRange.end
                        ? `${dateRange.start.toLocaleDateString()} - ${dateRange.end.toLocaleDateString()}`
                        : 'Select a date range'}
                    </span>
                  </div>
                  
                  <Button onClick={() => handleExport('overview')} variant="outline" size="sm">
                    <Download className="mr-2 h-4 w-4" />
                    Export Overview
                  </Button>
                </div>

                {filterType === 'custom' && (
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <Label>Start Date</Label>
                      <Input
                        type="date"
                        value={dateRange.start?.toISOString().split('T')[0] || ''}
                        onChange={(e) => {
                          const start = e.target.value ? new Date(e.target.value) : null
                          handleFilterChange('custom', start, dateRange.end)
                        }}
                      />
                    </div>
                    <div>
                      <Label>End Date</Label>
                      <Input
                        type="date"
                        value={dateRange.end?.toISOString().split('T')[0] || ''}
                        onChange={(e) => {
                          const end = e.target.value ? new Date(e.target.value) : null
                          handleFilterChange('custom', dateRange.start, end)
                        }}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Metrics Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{overviewMetrics.totalSales.toFixed(2)} ETB</div>
                  <p className="text-xs text-muted-foreground">{filteredOverviewOrders.length} orders</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                  <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{overviewMetrics.orderCount}</div>
                  <p className="text-xs text-muted-foreground">
                    Avg: {(overviewMetrics.averageOrderValue || 0).toFixed(2)} ETB
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Tax</CardTitle>
                  <BarChart className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{overviewMetrics.totalTax.toFixed(2)} ETB</div>
                  <p className="text-xs text-muted-foreground">
                    {overviewMetrics.totalSales > 0 ? ((overviewMetrics.totalTax / overviewMetrics.totalSales) * 100).toFixed(1) : 0}% of revenue
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Discounts</CardTitle>
                  <ArrowDownIcon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{overviewMetrics.totalDiscounts.toFixed(2)} ETB</div>
                  <p className="text-xs text-muted-foreground">
                    {overviewMetrics.totalSales > 0 ? ((overviewMetrics.totalDiscounts / overviewMetrics.totalSales) * 100).toFixed(1) : 0}% of revenue
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Chart Section */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
              <Card className="col-span-4">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Sales Overview</CardTitle>
                  <div className="flex items-center gap-2">
                    <Button
                      variant={chartType === "line" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setChartType("line")}
                    >
                      Line
                    </Button>
                    <Button
                      variant={chartType === "bar" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setChartType("bar")}
                    >
                      Bar
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pl-2">
                  <SalesChart data={dailySalesData} type={chartType} />
                </CardContent>
              </Card>
              <Card className="col-span-3">
                <CardHeader>
                  <CardTitle>Recent Sales</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-4">
                      {filteredOverviewOrders.slice(0, 10).map((order: Order) => (
                        <div className="flex items-center justify-between" key={order._id}>
                          <div>
                            <p className="text-sm font-medium leading-none">{order.orderNumber}</p>
                            <p className="text-sm text-muted-foreground">
                              Table {order.tableNumber} • {new Date(order.createdAt).toLocaleTimeString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="font-medium">+{order.finalAmount.toFixed(2)} ETB</div>
                            <Badge variant="secondary" className="text-xs">
                              {order.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>

            {/* Orders Table in Overview */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Recent Orders</CardTitle>
                <Button variant="outline" size="sm" onClick={() => handleExport('overview')}>
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order Number</TableHead>
                        <TableHead>Table</TableHead>
                        <TableHead>Total Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredOverviewOrders.slice(0, 10).map((order) => (
                        <TableRow key={order._id}>
                          <TableCell className="font-medium">{order.orderNumber}</TableCell>
                          <TableCell>{order.tableNumber}</TableCell>
                          <TableCell>{order.finalAmount.toFixed(2)} ETB</TableCell>
                          <TableCell>
                            <Badge variant={
                              order.status === "COMPLETED" ? "default" : 
                              order.status === "PENDING" ? "secondary" : 
                              "destructive"
                            }>
                              {order.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{new Date(order.createdAt).toLocaleString()}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm" onClick={() => handleViewDetails(order)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="analytics" className="space-y-4">
            {/* Date Filter for Analytics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Filter by Date Range
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col md:flex-row md:items-center gap-4 mb-4">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant={filterType === 'today' ? "default" : "outline"}
                      onClick={() => handleFilterChange('today')}
                    >
                      Today
                    </Button>
                    <Button
                      variant={filterType === 'week' ? "default" : "outline"}
                      onClick={() => handleFilterChange('week')}
                    >
                      This Week
                    </Button>
                    <Button
                      variant={filterType === 'month' ? "default" : "outline"}
                      onClick={() => handleFilterChange('month')}
                    >
                      This Month
                    </Button>
                    <Button
                      variant={filterType === 'year' ? "default" : "outline"}
                      onClick={() => handleFilterChange('year')}
                    >
                      This Year
                    </Button>
                    <Button
                      variant={filterType === 'custom' ? "default" : "outline"}
                      onClick={() => setFilterType('custom')}
                    >
                      Custom Range
                    </Button>
                  </div>
                  
                  <div className="flex-1 flex items-center gap-2">
                    <span className="text-sm font-medium">Date Range:</span>
                    <span className="text-sm text-muted-foreground">
                      {dateRange.start && dateRange.end
                        ? `${dateRange.start.toLocaleDateString()} - ${dateRange.end.toLocaleDateString()}`
                        : 'Select a date range'}
                    </span>
                    <span className="text-sm text-muted-foreground ml-2">
                      • Showing {filteredOrders.length} orders
                    </span>
                  </div>
                  
                  <Button onClick={() => handleExport('analytics')} variant="outline" size="sm">
                    <Download className="mr-2 h-4 w-4" />
                    Export Analytics
                  </Button>
                </div>

                {filterType === 'custom' && (
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <Label>Start Date</Label>
                      <Input
                        type="date"
                        value={dateRange.start?.toISOString().split('T')[0] || ''}
                        onChange={(e) => {
                          const start = e.target.value ? new Date(e.target.value) : null
                          handleFilterChange('custom', start, dateRange.end)
                        }}
                      />
                    </div>
                    <div>
                      <Label>End Date</Label>
                      <Input
                        type="date"
                        value={dateRange.end?.toISOString().split('T')[0] || ''}
                        onChange={(e) => {
                          const end = e.target.value ? new Date(e.target.value) : null
                          handleFilterChange('custom', dateRange.start, end)
                        }}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Analytics Table */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Detailed Analytics</CardTitle>
                <div className="flex items-center gap-2">
                  <Select onValueChange={(value) => handleSort(value as keyof Order)}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="createdAt">Date</SelectItem>
                      <SelectItem value="finalAmount">Amount</SelectItem>
                      <SelectItem value="orderNumber">Order Number</SelectItem>
                      <SelectItem value="tableNumber">Table Number</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={() => handleExport('analytics')} variant="outline">
                    <Download className="mr-2 h-4 w-4" />
                    Export
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {columns.map((column) => (
                          <TableHead 
                            key={column.accessorKey || column.id}
                            className="cursor-pointer hover:bg-gray-100"
                            onClick={() => column.accessorKey && handleSort(column.accessorKey as keyof Order)}
                          >
                            {column.header}
                            {column.accessorKey === sortBy && (
                              <span className="ml-1">
                                {sortOrder === 'asc' ? '↑' : '↓'}
                              </span>
                            )}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredOrders.map((order) => (
                        <TableRow key={order._id}>
                          {columns.map((column) => (
                            <TableCell key={`${order._id}-${column.accessorKey || column.id}`}>
                              {column.cell
                                ? column.cell({
                                    row: { getValue: (key: string) => order[key as keyof Order], original: order },
                                  } as any)
                                : (order[column.accessorKey as keyof Order] as any)}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Order Details</DialogTitle>
            <DialogDescription>Full details for order {selectedOrder?.orderNumber}</DialogDescription>
          </DialogHeader>
          <ScrollArea className="mt-8 max-h-[70vh]">
            {selectedOrder && selectedWaitress && (
              <div className="space-y-6">
                <div className="flex items-center space-x-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src="/placeholder-user.jpg" alt={selectedWaitress?.name || "Waitress"} />
                    <AvatarFallback>
                      {selectedWaitress?.name
                        ? selectedWaitress.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                        : "W"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-lg font-semibold">{selectedWaitress?.name || "Unknown"}</h3>
                    <p className="text-sm text-muted-foreground">{selectedWaitress?.phone || "No phone number"}</p>
                    <Badge variant="outline" className="mt-1">
                      {selectedWaitress?.shift || "Unknown"} Shift
                    </Badge>
                  </div>
                </div>
                <Separator />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium flex items-center">
                      <ShoppingCart className="mr-2 h-4 w-4" /> Order Number
                    </h4>
                    <p>{selectedOrder.orderNumber}</p>
                  </div>
                  <div>
                    <h4 className="font-medium flex items-center">
                      <Utensils className="mr-2 h-4 w-4" /> Table Number
                    </h4>
                    <p>{selectedOrder.tableNumber}</p>
                  </div>
                  <div>
                    <h4 className="font-medium flex items-center">
                      <User className="mr-2 h-4 w-4" /> Number of Guests
                    </h4>
                    <p>{selectedOrder.numberOfGuests}</p>
                  </div>
                  <div>
                    <h4 className="font-medium flex items-center">
                      <Clock className="mr-2 h-4 w-4" /> Created At
                    </h4>
                    <p>{new Date(selectedOrder.createdAt).toLocaleString()}</p>
                  </div>
                </div>
                <Separator />
                <div>
                  <h4 className="font-medium flex items-center mb-2">
                    <Utensils className="mr-2 h-4 w-4" /> Items
                  </h4>
                  <div className="grid gap-2">
                    {selectedOrder.items.map((item, index) => {
                      const itemDetails = selectedItems[item.itemId]
                      return (
                        <div key={index} className="flex items-center justify-between bg-secondary p-2 rounded-md">
                          <div className="flex items-center space-x-2">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={itemDetails?.imageUrl || ""} alt={itemDetails?.name || ""} />
                              <AvatarFallback>{itemDetails?.name?.charAt(0) || "I"}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{itemDetails?.name || "Unknown Item"}</p>
                              <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                            </div>
                          </div>
                          <p className="font-medium">{item.subtotal.toFixed(2)} ETB</p>
                        </div>
                      )
                    })}
                  </div>
                </div>
                <Separator />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium flex items-center">
                      <DollarSign className="mr-2 h-4 w-4" /> Total Amount
                    </h4>
                    <p>{selectedOrder.totalAmount.toFixed(2)} ETB</p>
                  </div>
                  <div>
                    <h4 className="font-medium flex items-center">
                      <ArrowDownIcon className="mr-2 h-4 w-4" /> Discount
                    </h4>
                    <p>{selectedOrder.discount.toFixed(2)} ETB</p>
                  </div>
                  <div>
                    <h4 className="font-medium flex items-center">
                      <BarChart className="mr-2 h-4 w-4" /> Tax
                    </h4>
                    <p>{selectedOrder.tax.toFixed(2)} ETB</p>
                  </div>
                  <div>
                    <h4 className="font-medium flex items-center">
                      <DollarSign className="mr-2 h-4 w-4" /> Final Amount
                    </h4>
                    <p className="text-lg font-bold">{selectedOrder.finalAmount.toFixed(2)} ETB</p>
                  </div>
                </div>
                <Separator />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium flex items-center">
                      <CreditCard className="mr-2 h-4 w-4" /> Payment Method
                    </h4>
                    <Badge variant="secondary">{selectedOrder.paymentMethod}</Badge>
                  </div>
                  <div>
                    <h4 className="font-medium flex items-center">
                      <CalendarDays className="mr-2 h-4 w-4" /> Status
                    </h4>
                    <Badge
                      variant={
                        selectedOrder.status === "COMPLETED"
                          ? "default"
                          : selectedOrder.status === "PENDING"
                            ? "secondary"
                            : "secondary"
                      }
                    >
                      {selectedOrder.status}
                    </Badge>
                  </div>
                </div>
                {selectedOrder.specialRequirements && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="font-medium flex items-center">
                        <User className="mr-2 h-4 w-4" /> Special Requirements
                      </h4>
                      <p>{selectedOrder.specialRequirements}</p>
                    </div>
                  </>
                )}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  )
}