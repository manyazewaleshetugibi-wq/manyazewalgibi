"use client"

import type React from "react"
import { useState, useMemo } from "react"
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query"
import axios from "axios"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer, AreaChart, Area } from "recharts"
import { motion, AnimatePresence } from "framer-motion"
import { useTheme } from "next-themes"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowDownIcon, ArrowUpIcon, DollarSign, ShoppingCart, Package } from "lucide-react"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { DateRangePicker } from "./date-range-picker"

// API client setup
const api = axios.create({
  baseURL: "/api",
})

// API functions
const fetchExpenses = () => api.get("/expense").then((res) => res.data.data)
const fetchWaitresses = () => api.get("/waitress").then((res) => res.data)
const fetchOrderReport = () => api.get("/order/report").then((res) => res.data)
const fetchStock = () => api.get("/stock").then((res) => res.data.data)
const fetchFeedback = () => api.get("/feedback").then((res) => res.data.feedback)
const fetchBlogPosts = () => api.get("/blog").then((res) => res.data.data)
const fetchMenuItems = () => api.get("/items").then((res) => res.data.items)
const fetchStockPurchases = () => api.get("/stock-purchase").then((res) => res.data.purchases)

// Utility functions
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("et-ET", { style: "currency", currency: "ETB" }).format(amount)
}

const calculatePercentageChange = (current: number, previous: number) => {
  if (previous === 0) return 100
  return ((current - previous) / previous) * 100
}

// Components
const StatCard = ({
  title,
  value,
  icon,
  change,
  isLoading,
}: {
  title: string
  value: string
  icon: React.ReactNode
  change?: number
  isLoading: boolean
}) => (
  <Card className="bg-gradient-to-br from-primary/5 to-primary/10 hover:shadow-lg transition-all duration-300">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      {icon}
    </CardHeader>
    <CardContent>
      {isLoading ? (
        <Skeleton className="h-8 w-[100px]" />
      ) : (
        <>
          <div className="text-2xl font-bold">{value}</div>
      
        </>
      )}
    </CardContent>
  </Card>
)

const LoadingSpinner = () => (
  <div className="flex justify-center items-center h-40">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
  </div>
)

// Main Dashboard Component
function Dashboard() {
  const [dateRange, setDateRange] = useState({ from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), to: new Date() })
  const { theme, setTheme } = useTheme()

  const { data: expenses, isLoading: isLoadingExpenses } = useQuery({ queryKey: ["expenses"], queryFn: fetchExpenses })
  const { data: waitresses, isLoading: isLoadingWaitresses } = useQuery({
    queryKey: ["waitresses"],
    queryFn: fetchWaitresses,
  })
  const { data: orderReport, isLoading: isLoadingOrderReport } = useQuery({
    queryKey: ["orderReport"],
    queryFn: fetchOrderReport,
  })
  const { data: stock, isLoading: isLoadingStock } = useQuery({ queryKey: ["stock"], queryFn: fetchStock })
  const { data: feedback, isLoading: isLoadingFeedback } = useQuery({ queryKey: ["feedback"], queryFn: fetchFeedback })
  const { data: blogPosts, isLoading: isLoadingBlogPosts } = useQuery({
    queryKey: ["blogPosts"],
    queryFn: fetchBlogPosts,
  })
  const { data: menuItems, isLoading: isLoadingMenuItems } = useQuery({
    queryKey: ["menuItems"],
    queryFn: fetchMenuItems,
  })
  const { data: stockPurchases, isLoading: isLoadingStockPurchases } = useQuery({
    queryKey: ["stockPurchases"],
    queryFn: fetchStockPurchases,
  })

  const isLoading =
    isLoadingExpenses ||
    isLoadingWaitresses ||
    isLoadingOrderReport ||
    isLoadingStock ||
    isLoadingFeedback ||
    isLoadingBlogPosts ||
    isLoadingMenuItems ||
    isLoadingStockPurchases

  const filteredSalesData = useMemo(() => {
    if (!orderReport) return []
    return Object.entries(orderReport.dailySales)
      .filter(([date]) => {
        const salesDate = new Date(date)
        return salesDate >= dateRange.from && salesDate <= dateRange.to
      })
      .map(([date, sales]) => ({
        date: new Date(date).toISOString().split("T")[0],
        sales,
      }))
  }, [orderReport, dateRange])

  const todaysRevenue = useMemo(() => {
    if (!orderReport) return 0
    const today = new Date().toISOString().split("T")[0]
    return orderReport.dailySales[today] || 0
  }, [orderReport])

  const todaysExpenses = useMemo(() => {
    if (!expenses) return 0
    const today = new Date().toISOString().split("T")[0]
    return expenses.filter((expense) => expense.date === today).reduce((sum, expense) => sum + expense.amount, 0)
  }, [expenses])

  const todaysStockCosts = useMemo(() => {
    if (!stockPurchases) return 0
    const today = new Date().toISOString().split("T")[0]
    return stockPurchases
      .filter((purchase) => purchase.purchaseDate.startsWith(today))
      .reduce((sum, purchase) => sum + purchase.quantity * purchase.unitPrice, 0)
  }, [stockPurchases])

  const stockData = useMemo(() => {
    if (!stock) return []
    return stock.map((item) => ({
      name: item.name,
      current: item.currentStock,
      minimum: item.minimumStock,
    }))
  }, [stock])

  const feedbackData = useMemo(() => {
    if (!feedback) return {}
    return feedback.reduce((acc, item) => {
      acc[item.rating] = (acc[item.rating] || 0) + 1
      return acc
    }, {})
  }, [feedback])

  const feedbackChartData = Object.entries(feedbackData).map(([rating, count]) => ({
    rating: Number(rating),
    count: Number(count),
  }))

  const totalRevenue = useMemo(() => {
    if (!orderReport) return 0
    return Object.values(orderReport.dailySales).reduce((sum, sales) => sum + sales, 0)
  }, [orderReport])

  const totalExpenses = useMemo(() => {
    if (!expenses) return 0
    return expenses.reduce((sum, expense) => sum + expense.amount, 0)
  }, [expenses])

  const totalStockCosts = useMemo(() => {
    if (!stockPurchases) return 0
    return stockPurchases.reduce((sum, purchase) => sum + purchase.quantity * purchase.unitPrice, 0)
  }, [stockPurchases])

  const averageOrderValue = useMemo(() => {
    if (!orderReport || orderReport.orderCount === 0) return 0
    return totalRevenue / orderReport.orderCount
  }, [totalRevenue, orderReport])

  return (
    <div className="container mx-auto p-4">
      <AnimatePresence>
        {isLoading ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <LoadingSpinner />
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Tabs defaultValue="overview" className="space-y-4">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="sales">Sales</TabsTrigger>
                <TabsTrigger value="inventory">Inventory</TabsTrigger>
                <TabsTrigger value="staff">Staff</TabsTrigger>
              </TabsList>
              <TabsContent value="overview" className="space-y-4">
                {/* Overall Totals */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <StatCard
                    title="Total Revenue"
                    value={formatCurrency(totalRevenue)}
                    icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
                    isLoading={isLoading}
                  />
                  <StatCard
                    title="Total Expenses"
                    value={formatCurrency(totalExpenses)}
                    icon={<ArrowDownIcon className="h-4 w-4 text-muted-foreground" />}
                    isLoading={isLoading}
                  />
                  <StatCard
                    title="Total Stock Costs"
                    value={formatCurrency(totalStockCosts)}
                    icon={<Package className="h-4 w-4 text-muted-foreground" />}
                    isLoading={isLoading}
                  />
                  <StatCard
                    title="Average Order Value"
                    value={formatCurrency(averageOrderValue)}
                    icon={<ShoppingCart className="h-4 w-4 text-muted-foreground" />}
                    isLoading={isLoading}
                  />
                </div>

                {/* Today's Stats */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <StatCard
                    title="Today's Revenue"
                    value={formatCurrency(todaysRevenue)}
                    icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
                    change={5.2}
                    isLoading={isLoading}
                  />
                  <StatCard
                    title="Today's Expenses"
                    value={formatCurrency(todaysExpenses)}
                    icon={<ArrowDownIcon className="h-4 w-4 text-muted-foreground" />}
                    change={-2.1}
                    isLoading={isLoading}
                  />
                  <StatCard
                    title="Today's Stock Costs"
                    value={formatCurrency(todaysStockCosts)}
                    icon={<Package className="h-4 w-4 text-muted-foreground" />}
                    change={1.8}
                    isLoading={isLoading}
                  />
                  <StatCard
                    title="Total Orders"
                    value={orderReport ? orderReport.orderCount.toString() : "0"}
                    icon={<ShoppingCart className="h-4 w-4 text-muted-foreground" />}
                    change={3.5}
                    isLoading={isLoading}
                  />
                </div>

                {/* Sales Chart */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Sales Overview</CardTitle>
                    <DateRangePicker
                      from={dateRange.from}
                      to={dateRange.to}
                      onSelect={(range) => setDateRange(range)}
                    />
                  </CardHeader>
                  <CardContent>
                    <ChartContainer
                      config={{
                        sales: {
                          label: "Sales",
                          color: "hsl(var(--chart-1))",
                        },
                      }}
                      className="h-[400px]"
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={filteredSalesData}>
                          <defs>
                            <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="var(--color-sales)" stopOpacity={0.8} />
                              <stop offset="95%" stopColor="var(--color-sales)" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Area
                            type="monotone"
                            dataKey="sales"
                            stroke="var(--color-sales)"
                            fillOpacity={1}
                            fill="url(#colorSales)"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="sales" className="space-y-4">
                {/* Recent Expenses */}
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Expenses</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Title</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {expenses &&
                          expenses.slice(0, 5).map((expense) => (
                            <TableRow key={expense._id}>
                              <TableCell className="font-medium">{expense.title}</TableCell>
                              <TableCell>{expense.category}</TableCell>
                              <TableCell>{formatCurrency(expense.amount)}</TableCell>
                              <TableCell>{new Date(expense.date).toLocaleDateString()}</TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                {/* Menu Items */}
                <Card>
                  <CardHeader>
                    <CardTitle>Popular Menu Items</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Price</TableHead>
                          <TableHead>Category</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {menuItems &&
                          menuItems.slice(0, 5).map((item) => (
                            <TableRow key={item._id}>
                              <TableCell className="font-medium">{item.name}</TableCell>
                              <TableCell>{formatCurrency(item.price)}</TableCell>
                              <TableCell>{item.categoryId}</TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="inventory" className="space-y-4">
                {/* Inventory Status */}
                <Card>
                  <CardHeader>
                    <CardTitle>Inventory Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ChartContainer
                      config={{
                        current: {
                          label: "Current Stock",
                          color: "hsl(var(--chart-1))",
                        },
                        minimum: {
                          label: "Minimum Stock",
                          color: "hsl(var(--chart-2))",
                        },
                      }}
                      className="h-[400px]"
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={stockData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Legend />
                          <Bar dataKey="current" fill="var(--color-current)" name="Current Stock" />
                          <Bar dataKey="minimum" fill="var(--color-minimum)" name="Minimum Stock" />
                        </BarChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="staff" className="space-y-4">
                {/* Staff Schedule */}
                <Card>
                  <CardHeader>
                    <CardTitle>Staff Schedule</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Phone</TableHead>
                          <TableHead>Shift</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {waitresses &&
                          waitresses.map((waitress) => (
                            <TableRow key={waitress._id}>
                              <TableCell className="font-medium">{waitress.name}</TableCell>
                              <TableCell>{waitress.phone}</TableCell>
                              <TableCell>{waitress.shift}</TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Wrap the Dashboard component with QueryClientProvider
const queryClient = new QueryClient()

export default function DashboardWithQueryClient() {
  return (
    <QueryClientProvider client={queryClient}>
      <Dashboard />
    </QueryClientProvider>
  )
}

