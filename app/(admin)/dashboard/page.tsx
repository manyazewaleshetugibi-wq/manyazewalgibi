"use client"

import type React from "react"
import { useState, useMemo, useCallback } from "react"
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query"
import axios from "axios"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer, AreaChart, Area, Tooltip as RechartsTooltip } from "recharts"
import { motion, AnimatePresence } from "framer-motion"
import { useTheme } from "next-themes"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowDownIcon, ArrowUpIcon, DollarSign, ShoppingCart, Package, TrendingUp, Calendar, Users, Clock, ArrowUp, ArrowDown, Star } from "lucide-react"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { DateRangePicker } from "./date-range-picker"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { StaffRegistrationForm } from "@/components/staff-registration-form"

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
const fetchStaff = () => api.get("/staff").then((res) => res.data.data)
const fetchEmployeeRanks = () => api.get("/employee-rank").then((res) => res.data)

// Types
interface Expense {
  _id: string
  title: string
  category: string
  amount: number
  date: string
}

interface Waitress {
  _id: string
  name: string
  phone: string
  shift: string
}

interface OrderReport {
  dailySales: Record<string, number>
  orderCount: number
}

interface StockItem {
  _id: string
  name: string
  currentStock: number
  minimumStock: number
}

interface FeedbackItem {
  _id: string
  rating: number
  comment: string
}

interface MenuItem {
  _id: string
  name: string
  price: number
  categoryId: string
}

interface StockPurchase {
  _id: string
  purchaseDate: string
  quantity: number
  unitPrice: number
}

interface Staff {
  _id: string
  name: string
  email: string
  role: string
  employeeId: string
  phone: string
  status: string
  permissions: string[]
  createdAt: string
  updatedAt: string
}

interface EmployeeRank {
  _id: string;
  userId: string;
  name: string;
  email: string;
  role: string;
  department?: string;
  performanceScore: number;
  attendance: number;
  efficiency: number;
  completedOrders: number;
  salesTarget?: number;
  salesAchieved?: number;
  customerRating: number;
  points: number;
  rank: number;
  roleRank: number;
  globalRank: number;
  lastUpdated: Date;
  createdAt: Date;
}

// Utility functions
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount) + " ETB"
}

const calculatePercentageChange = (current: number, previous: number) => {
  if (previous === 0) return 100
  return ((current - previous) / previous) * 100
}

// Helper function to safely format role
const formatRole = (role?: string) => {
  if (!role) return 'Unassigned'
  return role.replace('_', ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
}

// Function to calculate ranks based on completedOrders
const calculateRanksByCompletedOrders = (employeeRanks: EmployeeRank[]) => {
  if (!employeeRanks || employeeRanks.length === 0) return [];
  
  // Sort all employees by completedOrders in descending order
  const sortedByCompletedOrders = [...employeeRanks].sort(
    (a, b) => (b.completedOrders || 0) - (a.completedOrders || 0)
  );
  
  // Calculate global ranks (handling ties)
  const withGlobalRanks = sortedByCompletedOrders.map((emp, index) => {
    // Handle ties - if same completedOrders as previous, same rank
    let rank = index + 1;
    if (index > 0 && emp.completedOrders === sortedByCompletedOrders[index - 1].completedOrders) {
      rank = sortedByCompletedOrders[index - 1].rank || index;
    }
    
    return {
      ...emp,
      rank: rank,
      globalRank: rank
    };
  });
  
  // Calculate role-based ranks
  const employeesByRole = withGlobalRanks.reduce((acc, emp) => {
    const role = emp.role || "Unassigned";
    if (!acc[role]) acc[role] = [];
    acc[role].push(emp);
    return acc;
  }, {} as Record<string, typeof withGlobalRanks>);
  
  // Sort each role's employees by completedOrders and assign role rank
  Object.entries(employeesByRole).forEach(([role, roleEmployees]) => {
    const sortedRoleEmployees = roleEmployees.sort(
      (a, b) => (b.completedOrders || 0) - (a.completedOrders || 0)
    );
    
    sortedRoleEmployees.forEach((emp, index) => {
      // Handle ties within role
      let roleRank = index + 1;
      if (index > 0 && emp.completedOrders === sortedRoleEmployees[index - 1].completedOrders) {
        roleRank = sortedRoleEmployees[index - 1].roleRank || index;
      }
      emp.roleRank = roleRank;
    });
  });
  
  return withGlobalRanks;
};

// Components
const StatCard = ({
  title,
  value,
  icon,
  change,
  isLoading,
  trend,
  description,
  color = "primary",
}: {
  title: string
  value: string
  icon: React.ReactNode
  change?: number
  isLoading: boolean
  trend?: "up" | "down" | "neutral"
  description?: string
  color?: "primary" | "success" | "warning" | "danger" | "info"
}) => {
  const colorStyles = {
    primary: "from-primary/10 to-primary/5 border-primary/20 dark:from-primary/20 dark:to-primary/5 dark:border-primary/30",
    success: "from-green-100/50 to-green-50/30 border-green-200 dark:from-green-900/20 dark:to-green-900/10 dark:border-green-800/30",
    warning: "from-amber-100/50 to-amber-50/30 border-amber-200 dark:from-amber-900/20 dark:to-amber-900/10 dark:border-amber-800/30",
    danger: "from-red-100/50 to-red-50/30 border-red-200 dark:from-red-900/20 dark:to-red-900/10 dark:border-red-800/30",
    info: "from-blue-100/50 to-blue-50/30 border-blue-200 dark:from-blue-900/20 dark:to-blue-900/10 dark:border-blue-800/30"
  }

  const iconStyles = {
    primary: "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-foreground",
    success: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    warning: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    danger: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    info: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
  }

  const trendStyles = {
    up: "text-green-600 dark:text-green-400",
    down: "text-red-600 dark:text-red-400",
    neutral: "text-gray-500 dark:text-gray-400"
  }

  return (
    <motion.div 
      whileHover={{ y: -5, boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)" }}
      transition={{ duration: 0.2 }}
    >
      <Card className={`bg-gradient-to-br ${colorStyles[color]} hover:shadow-lg transition-all duration-300 h-full border dark:border-opacity-40 overflow-hidden group`}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
          <div className="absolute top-0 right-0 h-24 w-24 bg-gradient-to-bl from-black/[0.01] to-transparent dark:from-white/[0.01] rounded-full -mr-12 -mt-12 opacity-70"></div>
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <div className={`p-2 rounded-full ${iconStyles[color]}`}>
            {icon}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-8 w-[100px]" />
          ) : (
            <>
              <div className="text-2xl font-bold tracking-tight transition-all duration-200 group-hover:scale-105 origin-left">{value}</div>
              {description && (
                <p className="text-xs text-muted-foreground mt-1">{description}</p>
              )}
              {typeof change !== 'undefined' && (
                <div className="flex items-center mt-2 text-sm">
                  <span className={trendStyles[trend || 'neutral']}>
                    {trend === 'up' ? <ArrowUp className="h-3 w-3 mr-1 inline" /> : trend === 'down' ? <ArrowDown className="h-3 w-3 mr-1 inline" /> : null}
                    {change > 0 ? "+" : ""}{change.toFixed(1)}%
                  </span>
                  <span className="text-xs text-muted-foreground ml-2">from last period</span>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

const LoadingSpinner = () => (
  <div className="flex justify-center items-center h-40">
    <div className="relative h-20 w-20">
      <div className="absolute inset-0 rounded-full border-t-2 border-primary animate-spin"></div>
      <div className="absolute inset-2 rounded-full border-r-2 border-primary/60 animate-spin animate-reverse"></div>
      <div className="absolute inset-4 rounded-full border-b-2 border-primary/40 animate-spin animate-delay-150"></div>
    </div>
  </div>
)

// Main Dashboard Component
function Dashboard() {
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({ 
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 
    to: new Date() 
  })
  const [isRecalculating, setIsRecalculating] = useState(false)
  const { theme, setTheme } = useTheme()

  const { data: expenses, isLoading: isLoadingExpenses } = useQuery<Expense[]>({ 
    queryKey: ["expenses"], 
    queryFn: fetchExpenses 
  })
  
  const { data: waitresses, isLoading: isLoadingWaitresses } = useQuery<Waitress[]>({
    queryKey: ["waitresses"],
    queryFn: fetchWaitresses,
  })
  
  const { data: orderReport, isLoading: isLoadingOrderReport } = useQuery<OrderReport>({
    queryKey: ["orderReport"],
    queryFn: fetchOrderReport,
  })
  
  const { data: stock, isLoading: isLoadingStock } = useQuery<StockItem[]>({ 
    queryKey: ["stock"], 
    queryFn: fetchStock 
  })
  
  const { data: feedback, isLoading: isLoadingFeedback } = useQuery<FeedbackItem[]>({ 
    queryKey: ["feedback"], 
    queryFn: fetchFeedback 
  })
  
  const { data: blogPosts, isLoading: isLoadingBlogPosts } = useQuery({
    queryKey: ["blogPosts"],
    queryFn: fetchBlogPosts,
  })
  
  const { data: menuItems, isLoading: isLoadingMenuItems } = useQuery<MenuItem[]>({
    queryKey: ["menuItems"],
    queryFn: fetchMenuItems,
  })
  
  const { data: stockPurchases, isLoading: isLoadingStockPurchases } = useQuery<StockPurchase[]>({
    queryKey: ["stockPurchases"],
    queryFn: fetchStockPurchases,
  })

  const { data: staff, isLoading: isLoadingStaff } = useQuery<Staff[]>({
    queryKey: ["staff"],
    queryFn: fetchStaff,
  })

  const { data: employeeRanks, isLoading: isLoadingEmployeeRanks, refetch: refetchEmployeeRanks } = useQuery<EmployeeRank[]>({
    queryKey: ["employeeRanks"],
    queryFn: fetchEmployeeRanks,
  })

  const isLoading =
    isLoadingExpenses ||
    isLoadingWaitresses ||
    isLoadingOrderReport ||
    isLoadingStock ||
    isLoadingFeedback ||
    isLoadingBlogPosts ||
    isLoadingMenuItems ||
    isLoadingStockPurchases ||
    isLoadingStaff ||
    isLoadingEmployeeRanks

  const handleDateRangeSelect = useCallback((range: { from?: Date; to?: Date }) => {
    if (range.from && range.to) {
      if (
        dateRange.from.getTime() !== range.from.getTime() ||
        dateRange.to.getTime() !== range.to.getTime()
      ) {
        setDateRange({ from: range.from, to: range.to })
      }
    }
  }, [dateRange.from, dateRange.to])

  const handleResetDateRange = useCallback(() => {
    const newFrom = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const newTo = new Date()
    setDateRange({ from: newFrom, to: newTo })
  }, [])

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
    return expenses.filter((expense) => expense.date === today).reduce((sum: number, expense) => sum + expense.amount, 0)
  }, [expenses])

  const todaysStockCosts = useMemo(() => {
    if (!stockPurchases) return 0
    const today = new Date().toISOString().split("T")[0]
    return stockPurchases
      .filter((purchase) => purchase.purchaseDate.startsWith(today))
      .reduce((sum: number, purchase) => sum + purchase.quantity * purchase.unitPrice, 0)
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
    return feedback.reduce((acc: Record<string, number>, item) => {
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
    return Object.values(orderReport.dailySales).reduce((sum: number, sales: number) => sum + sales, 0)
  }, [orderReport])

  const totalExpenses = useMemo(() => {
    if (!expenses) return 0
    return expenses.reduce((sum: number, expense) => sum + expense.amount, 0)
  }, [expenses])

  const totalStockCosts = useMemo(() => {
    if (!stockPurchases) return 0
    return stockPurchases.reduce((sum: number, purchase) => sum + purchase.quantity * purchase.unitPrice, 0)
  }, [stockPurchases])

  const averageOrderValue = useMemo(() => {
    if (!orderReport || orderReport.orderCount === 0) return 0
    return totalRevenue / orderReport.orderCount
  }, [totalRevenue, orderReport])

  const criticalStock = useMemo(() => {
    if (!stock) return []
    return stock.filter(item => item.currentStock <= item.minimumStock)
  }, [stock])

  // Calculate ranks based on completedOrders
  const rankedEmployees = useMemo(() => {
    if (!employeeRanks) return [];
    return calculateRanksByCompletedOrders(employeeRanks);
  }, [employeeRanks]);

  const employeesByRole = useMemo(() => {
    if (!rankedEmployees || rankedEmployees.length === 0) return {};
    
    // Group by role after calculating ranks
    const grouped = rankedEmployees.reduce((acc, emp) => {
      const role = emp.role || "Unassigned";
      if (!acc[role]) acc[role] = [];
      acc[role].push(emp);
      return acc;
    }, {} as Record<string, EmployeeRank[]>);
    
    // Sort each role's employees by roleRank
    Object.keys(grouped).forEach(role => {
      grouped[role].sort((a, b) => a.roleRank - b.roleRank);
    });
    
    return grouped;
  }, [rankedEmployees])

  const getStockStatus = (item: StockItem) => {
    const ratio = item.currentStock / item.minimumStock
    if (ratio <= 0.5) return 'critical'
    if (ratio <= 1) return 'low'
    return 'good'
  }

  const handleRecalculateRanks = async () => {
    try {
      setIsRecalculating(true);
      await api.post("/employee-rank/recalculate");
      await refetchEmployeeRanks();
    } catch (error) {
      console.error("Failed to recalculate ranks", error);
    } finally {
      setIsRecalculating(false);
    }
  };

  return (
    <div className="container mx-auto p-4 min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-950 dark:to-gray-900">
      <AnimatePresence>
        {isLoading ? (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center mt-16"
          >
            <LoadingSpinner />
            <p className="mt-4 text-gray-500 dark:text-gray-400">Loading dashboard data...</p>
          </motion.div>
        ) : (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="space-y-8"
          >
            <motion.h1 
              className="text-4xl font-bold text-center bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent dark:from-primary dark:to-blue-400"
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              Restaurant Dashboard
            </motion.h1>
            
            <Tabs defaultValue="overview" className="space-y-6">
              <TabsList className="grid grid-cols-4 max-w-xl mx-auto">
                <TabsTrigger value="overview" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Overview
                </TabsTrigger>
                <TabsTrigger value="sales" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <DollarSign className="w-4 h-4 mr-2" />
                  Sales
                </TabsTrigger>
                <TabsTrigger value="inventory" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <Package className="w-4 h-4 mr-2" /> 
                  Inventory
                </TabsTrigger>
                <TabsTrigger value="staff" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <Users className="w-4 h-4 mr-2" />
                  Staff
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="overview" className="space-y-6">
                <motion.div 
                  className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.4, delay: 0.1 }}
                >
                  <StatCard
                    title="Today's Revenue"
                    value={formatCurrency(todaysRevenue)}
                    icon={<DollarSign className="h-4 w-4" />}
                    change={5.2}
                    trend="up"
                    isLoading={isLoading}
                    color="success"
                    description="Total sales for today"
                  />
                  <StatCard
                    title="Today's Expenses"
                    value={formatCurrency(todaysExpenses)}
                    icon={<ArrowDownIcon className="h-4 w-4" />}
                    change={-2.1}
                    trend="down"
                    isLoading={isLoading}
                    color="danger"
                    description="Daily operational costs"
                  />
                  <StatCard
                    title="Today's Stock Costs"
                    value={formatCurrency(todaysStockCosts)}
                    icon={<Package className="h-4 w-4" />}
                    change={1.8}
                    trend="up"
                    isLoading={isLoading}
                    color="warning"
                    description="Inventory purchases"
                  />
                  <StatCard
                    title="Total Orders"
                    value={orderReport ? orderReport.orderCount.toString() : "0"}
                    icon={<ShoppingCart className="h-4 w-4" />}
                    change={3.5}
                    trend="up"
                    isLoading={isLoading}
                    color="info"
                    description="Number of orders processed"
                  />
                </motion.div>

                <motion.div 
                  className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.4, delay: 0.2 }}
                >
                  <StatCard
                    title="Total Revenue"
                    value={formatCurrency(totalRevenue)}
                    icon={<DollarSign className="h-4 w-4" />}
                    isLoading={isLoading}
                    color="primary"
                    description="All-time revenue"
                  />
                  <StatCard
                    title="Total Expenses"
                    value={formatCurrency(totalExpenses)}
                    icon={<ArrowDownIcon className="h-4 w-4" />}
                    isLoading={isLoading}
                    color="warning"
                    description="All-time expenses"
                  />
                  <StatCard
                    title="Total Stock Costs"
                    value={formatCurrency(totalStockCosts)}
                    icon={<Package className="h-4 w-4" />}
                    isLoading={isLoading}
                    color="info"
                    description="Inventory investment"
                  />
                  <StatCard
                    title="Average Order Value"
                    value={formatCurrency(averageOrderValue)}
                    icon={<ShoppingCart className="h-4 w-4" />}
                    isLoading={isLoading}
                    color="success"
                    description="Revenue per order"
                  />
                </motion.div>

                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.4, delay: 0.3 }}
                >
                  <Card className="border dark:border-gray-800">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <div>
                        <CardTitle className="text-xl">Sales Overview</CardTitle>
                        <CardDescription>Daily revenue over time</CardDescription>
                      </div>
                      <DateRangePicker
                        from={dateRange.from}
                        to={dateRange.to}
                        onSelect={handleDateRangeSelect}
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
                        {filteredSalesData.length === 0 ? (
                          <div className="flex flex-col items-center justify-center h-full">
                            <Calendar className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-4" />
                            <p className="text-gray-500 dark:text-gray-400">No sales data available for the selected period</p>
                            <Button 
                              variant="outline" 
                              className="mt-4" 
                              onClick={handleResetDateRange}
                            >
                              Reset to Last 30 Days
                            </Button>
                          </div>
                        ) : (
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={filteredSalesData}>
                              <defs>
                                <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="var(--color-sales)" stopOpacity={0.8} />
                                  <stop offset="95%" stopColor="var(--color-sales)" stopOpacity={0} />
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                              <XAxis 
                                dataKey="date" 
                                tickMargin={10}
                                tickFormatter={(value) => {
                                  const date = new Date(value);
                                  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                                }}
                              />
                              <YAxis 
                                tickFormatter={(value) => {
                                  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
                                  return value;
                                }}
                              />
                              <RechartsTooltip
                                content={({ active, payload }) => {
                                  if (active && payload && payload.length) {
                                    return (
                                      <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 shadow-lg rounded-lg">
                                        <p className="text-gray-500 text-xs">{new Date(payload[0].payload.date).toLocaleDateString('en-US', { 
                                          weekday: 'long', 
                                          year: 'numeric', 
                                          month: 'long', 
                                          day: 'numeric' 
                                        })}</p>
                                        <p className="text-lg font-bold text-primary">
                                          {formatCurrency(payload[0].value as number)}
                                        </p>
                                      </div>
                                    );
                                  }
                                  return null;
                                }}
                              />
                              <Area
                                type="monotone"
                                dataKey="sales"
                                stroke="var(--color-sales)"
                                strokeWidth={2}
                                fillOpacity={1}
                                fill="url(#colorSales)"
                                activeDot={{ r: 6, strokeWidth: 2, stroke: "white" }}
                              />
                            </AreaChart>
                          </ResponsiveContainer>
                        )}
                      </ChartContainer>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.4, delay: 0.4 }}
                >
                  <Card className="border dark:border-gray-800">
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Package className="h-5 w-5 mr-2 text-amber-500" />
                        Critical Stock Items
                      </CardTitle>
                      <CardDescription>Items that need restocking soon</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {criticalStock.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                          <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-full mb-4">
                            <Package className="h-8 w-8 text-green-600 dark:text-green-400" />
                          </div>
                          <p className="text-gray-700 dark:text-gray-300 font-medium">All inventory items are at healthy levels</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mt-1">
                            There are no items below their minimum stock threshold
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {criticalStock.slice(0, 4).map((item) => {
                            const status = getStockStatus(item);
                            const statusColors = {
                              critical: {
                                bg: 'bg-red-600 dark:bg-red-500/80',
                                text: 'text-red-600 dark:text-red-400',
                                badge: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
                              },
                              low: {
                                bg: 'bg-amber-500 dark:bg-amber-500/80',
                                text: 'text-amber-600 dark:text-amber-400',
                                badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                              },
                              good: {
                                bg: 'bg-green-500 dark:bg-green-500/80',
                                text: 'text-green-600 dark:text-green-400',
                                badge: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
                              }
                            };
                            
                            const percentage = Math.min(100, Math.round((item.currentStock / item.minimumStock) * 100));
                            
                            return (
                              <div key={item._id} className="p-3 rounded-lg border border-gray-100 dark:border-gray-800">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="font-medium">{item.name}</div>
                                  <Badge className={statusColors[status].badge}>
                                    {status === 'critical' ? 'Critical' : status === 'low' ? 'Low Stock' : 'Good'}
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-3">
                                  <div className="w-full">
                                    <Progress value={percentage} className="h-2" />
                                    <div className="flex justify-between mt-1 text-xs text-gray-500 dark:text-gray-400">
                                      <span>Current: <span className={statusColors[status].text}>{item.currentStock}</span></span>
                                      <span>Minimum: {item.minimumStock}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}

                          {criticalStock.length > 4 && (
                            <div className="text-center pt-2">
                              <Button variant="outline" size="sm">
                                View all {criticalStock.length} items
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              </TabsContent>

              <TabsContent value="sales" className="space-y-6">
                <Card className="border dark:border-gray-800">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <ArrowDownIcon className="h-5 w-5 mr-2 text-red-500" />
                      Recent Expenses
                    </CardTitle>
                    <CardDescription>Latest financial outflows</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {expenses && expenses.length > 0 ? (
                      <div className="rounded-md border dark:border-gray-800 overflow-hidden">
                        <Table>
                          <TableHeader className="bg-gray-50 dark:bg-gray-900/50">
                            <TableRow>
                              <TableHead>Title</TableHead>
                              <TableHead>Category</TableHead>
                              <TableHead>Amount</TableHead>
                              <TableHead>Date</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {expenses.slice(0, 5).map((expense) => (
                              <TableRow key={expense._id} className="hover:bg-gray-50 dark:hover:bg-gray-900/30">
                                <TableCell className="font-medium">{expense.title}</TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="bg-gray-50 dark:bg-gray-800">
                                    {expense.category}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-red-600 dark:text-red-400 font-medium">{formatCurrency(expense.amount)}</TableCell>
                                <TableCell className="text-gray-500 dark:text-gray-400">{new Date(expense.date).toLocaleDateString()}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-8 text-center">
                        <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-full mb-4">
                          <Clock className="h-8 w-8 text-gray-400" />
                        </div>
                        <p className="text-gray-700 dark:text-gray-300 font-medium">No recent expenses</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mt-1">
                          There are no expense records available to display
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="border dark:border-gray-800">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <ShoppingCart className="h-5 w-5 mr-2 text-primary" />
                      Popular Menu Items
                    </CardTitle>
                    <CardDescription>Best selling products</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {menuItems && menuItems.length > 0 ? (
                      <div className="rounded-md border dark:border-gray-800 overflow-hidden">
                        <Table>
                          <TableHeader className="bg-gray-50 dark:bg-gray-900/50">
                            <TableRow>
                              <TableHead>Name</TableHead>
                              <TableHead>Price</TableHead>
                              <TableHead>Category</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {menuItems.slice(0, 5).map((item) => (
                              <TableRow key={item._id} className="hover:bg-gray-50 dark:hover:bg-gray-900/30">
                                <TableCell className="font-medium">{item.name}</TableCell>
                                <TableCell className="text-primary font-medium">{formatCurrency(item.price)}</TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="bg-gray-50 dark:bg-gray-800">
                                    {item.categoryId}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-8 text-center">
                        <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-full mb-4">
                          <ShoppingCart className="h-8 w-8 text-gray-400" />
                        </div>
                        <p className="text-gray-700 dark:text-gray-300 font-medium">No menu items</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mt-1">
                          There are no menu items available to display
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="inventory" className="space-y-6">
                <Card className="border dark:border-gray-800">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Package className="h-5 w-5 mr-2 text-blue-500" />
                      Inventory Status
                    </CardTitle>
                    <CardDescription>Current stock levels compared to minimum requirements</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {stockData.length > 0 ? (
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
                            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <RechartsTooltip
                              content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                  return (
                                    <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 shadow-lg rounded-lg">
                                      <p className="font-medium">{payload[0].payload.name}</p>
                                      <div className="mt-2 space-y-1">
                                        <p className="text-sm flex items-center">
                                          <span className="w-3 h-3 rounded-full bg-blue-500 mr-2"></span>
                                          Current: <span className="font-medium ml-1">{payload[0].value}</span>
                                        </p>
                                        <p className="text-sm flex items-center">
                                          <span className="w-3 h-3 rounded-full bg-amber-500 mr-2"></span>
                                          Minimum: <span className="font-medium ml-1">{payload[1].value}</span>
                                        </p>
                                      </div>
                                    </div>
                                  );
                                }
                                return null;
                              }}
                            />
                            <Legend wrapperStyle={{ paddingTop: 20 }} />
                            <Bar 
                              dataKey="current" 
                              fill="var(--color-current)" 
                              name="Current Stock" 
                              radius={[4, 4, 0, 0]}
                              animationDuration={1500}
                            />
                            <Bar 
                              dataKey="minimum" 
                              fill="var(--color-minimum)" 
                              name="Minimum Stock" 
                              radius={[4, 4, 0, 0]}
                              animationDuration={1500}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </ChartContainer>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-8 text-center">
                        <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-full mb-4">
                          <Package className="h-8 w-8 text-gray-400" />
                        </div>
                        <p className="text-gray-700 dark:text-gray-300 font-medium">No inventory data</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mt-1">
                          There are no inventory items available to display
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="staff" className="space-y-6">
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.4, delay: 0.1 }}
                >
                  <Card className="border dark:border-gray-800 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800">
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center">
                          <Users className="h-5 w-5 mr-2 text-blue-500" />
                          Staff Management
                        </div>
                        <StaffRegistrationForm />
                      </CardTitle>
                      <CardDescription>
                        Manage your restaurant staff members, roles, and permissions
                      </CardDescription>
                    </CardHeader>
                  </Card>
                </motion.div>

                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.4, delay: 0.2 }}
                >
                  <Card className="border dark:border-gray-800">
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Users className="h-5 w-5 mr-2 text-violet-500" />
                        All Staff Members
                      </CardTitle>
                      <CardDescription>
                        Complete list of all registered staff with their roles and status
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {staff && staff.length > 0 ? (
                        <div className="rounded-md border dark:border-gray-800 overflow-hidden">
                          <Table>
                            <TableHeader className="bg-gray-50 dark:bg-gray-900/50">
                              <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead>Employee ID</TableHead>
                                <TableHead>Phone</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Joined</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {staff.map((staffMember) => (
                                <TableRow key={staffMember._id} className="hover:bg-gray-50 dark:hover:bg-gray-900/30">
                                  <TableCell className="font-medium">
                                    <div className="flex items-center gap-2">
                                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                        <Users className="h-4 w-4 text-primary" />
                                      </div>
                                      {staffMember.name}
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-sm">{staffMember.email}</TableCell>
                                  <TableCell>
                                    <Badge 
                                      variant="outline" 
                                      className={`
                                        ${staffMember.role === 'admin' ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800/30' : ''}
                                        ${staffMember.role === 'kitchen' ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800/30' : ''}
                                        ${staffMember.role === 'stock_manager' ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800/30' : ''}
                                        ${staffMember.role === 'fb' ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800/30' : ''}
                                        ${staffMember.role === 'marketing' ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800/30' : ''}
                                        ${staffMember.role === 'finance' ? 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-900/20 dark:text-cyan-300 dark:border-cyan-800/30' : ''}
                                        ${staffMember.role === 'pos' ? 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-800/30' : ''}
                                        ${staffMember.role === 'waitress' ? 'bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-900/20 dark:text-pink-300 dark:border-pink-800/30' : ''}
                                        capitalize
                                      `}
                                    >
                                      {formatRole(staffMember.role)}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-sm">
                                      {staffMember.employeeId}
                                    </code>
                                  </TableCell>
                                  <TableCell>{staffMember.phone}</TableCell>
                                  <TableCell>
                                    <Badge 
                                      variant="outline" 
                                      className={
                                        staffMember.status === 'active' 
                                          ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800/30" 
                                          : "bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700"
                                      }
                                    >
                                      {staffMember.status === 'active' ? 'Active' : 'Inactive'}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-gray-500 dark:text-gray-400">
                                    {new Date(staffMember.createdAt).toLocaleDateString()}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                          <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-full mb-4">
                            <Users className="h-8 w-8 text-gray-400" />
                          </div>
                          <p className="text-gray-700 dark:text-gray-300 font-medium">No staff members registered</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mt-1 mb-4">
                            Add your first staff member to get started
                          </p>
                          <StaffRegistrationForm />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.4, delay: 0.3 }}
                >
                  <Card className="border dark:border-gray-800">
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Users className="h-5 w-5 mr-2 text-violet-500" />
                        Staff Schedule
                      </CardTitle>
                      <CardDescription>Current team member shifts</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {waitresses && waitresses.length > 0 ? (
                        <div className="rounded-md border dark:border-gray-800 overflow-hidden">
                          <Table>
                            <TableHeader className="bg-gray-50 dark:bg-gray-900/50">
                              <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Phone</TableHead>
                                <TableHead>Shift</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {waitresses.map((waitress) => (
                                <TableRow key={waitress._id} className="hover:bg-gray-50 dark:hover:bg-gray-900/30">
                                  <TableCell className="font-medium">{waitress.name}</TableCell>
                                  <TableCell>{waitress.phone}</TableCell>
                                  <TableCell>
                                    <Badge variant="outline" className={
                                      waitress.shift === "Morning" 
                                        ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800/30" 
                                        : waitress.shift === "Evening"
                                        ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800/30"
                                        : "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800/30"
                                    }>
                                      {waitress.shift}
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                          <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-full mb-4">
                            <Users className="h-8 w-8 text-gray-400" />
                          </div>
                          <p className="text-gray-700 dark:text-gray-300 font-medium">No staff data</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mt-1">
                            There are no staff members available to display
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Employee Performance Ranking Table */}
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.4, delay: 0.4 }}
                >
                  <Card className="border dark:border-gray-800">
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center">
                          <TrendingUp className="h-5 w-5 mr-2 text-emerald-500" />
                          Employee Performance Ranking
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800/30">
                            Ranked by Items Sold
                          </Badge>
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-900/20"
                            onClick={handleRecalculateRanks}
                            disabled={isRecalculating}
                          >
                            <TrendingUp className={`h-4 w-4 mr-2 ${isRecalculating ? 'animate-spin' : ''}`} />
                            {isRecalculating ? 'Recalculating...' : 'Recalculate'}
                          </Button>
                        </div>
                      </CardTitle>
                      <CardDescription>
                        Employee ranking based on items sold (completed orders), performance, attendance, and customer ratings
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {rankedEmployees && rankedEmployees.length > 0 ? (
                        <div className="space-y-8">
                          {Object.entries(employeesByRole)
                            .sort(([roleA], [roleB]) => roleA.localeCompare(roleB))
                            .map(([role, employees]) => (
                              <div key={role} className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="capitalize text-sm font-semibold px-3 py-1 bg-gray-100 dark:bg-gray-800">
                                      {formatRole(role)} Department
                                    </Badge>
                                    <span className="text-xs text-muted-foreground">
                                      {employees.length} Staff
                                    </span>
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    Top {Math.min(5, employees.length)} Ranked by Items Sold
                                  </div>
                                </div>

                                <div className="rounded-md border dark:border-gray-800 overflow-hidden">
                                  <Table>
                                    <TableHeader className="bg-gray-50 dark:bg-gray-900/50">
                                      <TableRow>
                                        <TableHead className="w-[70px] text-center">Role Rank</TableHead>
                                        <TableHead>Name</TableHead>
                                        <TableHead className="text-right">Items Sold</TableHead>
                                        <TableHead className="text-right">Performance</TableHead>
                                        <TableHead className="text-right">Attendance</TableHead>
                                        <TableHead className="text-right">Rating</TableHead>
                                        <TableHead className="text-right">Global Rank</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {employees.slice(0, 5).map((emp) => {
                                        // Determine badge color based on rank
                                        const getRankBadge = (rank: number) => {
                                          if (rank === 1) return "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/40 dark:text-yellow-300";
                                          if (rank === 2) return "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300";
                                          if (rank === 3) return "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300";
                                          if (rank <= 10) return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300";
                                          return "bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400";
                                        };
                                        
                                        const getRankIcon = (rank: number) => {
                                          if (rank === 1) return "🥇";
                                          if (rank === 2) return "🥈";
                                          if (rank === 3) return "🥉";
                                          return `#${rank}`;
                                        };
                                        
                                        // Format role properly
                                        const formattedRole = formatRole(emp.role);
                                        
                                        return (
                                          <TableRow 
                                            key={emp._id} 
                                            className="hover:bg-gray-50 dark:hover:bg-gray-900/30"
                                          >
                                            <TableCell className="text-center">
                                              <div className={`flex items-center justify-center w-8 h-8 rounded-full border mx-auto ${getRankBadge(emp.roleRank)}`}>
                                                <span className="font-bold text-sm">{getRankIcon(emp.roleRank)}</span>
                                              </div>
                                            </TableCell>
                                            <TableCell className="font-medium">
                                              <div className="flex items-center gap-2">
                                                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white text-sm font-bold">
                                                  {emp.name?.charAt(0).toUpperCase() || '?'}
                                                </div>
                                                <div>
                                                  <div className="font-medium">{emp.name || 'Unknown'}</div>
                                                  <div className="text-xs text-gray-500 dark:text-gray-400">{formattedRole}</div>
                                                </div>
                                              </div>
                                            </TableCell>
                                            <TableCell className="text-right font-medium">
                                              <div className="flex flex-col items-end">
                                                <span className="text-lg">{(emp.completedOrders || 0).toLocaleString()}</span>
                                                <span className="text-xs text-emerald-600 dark:text-emerald-400">
                                                  {emp.completedOrders === 0 ? 'No sales' : 
                                                   emp.completedOrders < 50 ? 'Beginner' :
                                                   emp.completedOrders < 200 ? 'Intermediate' : 'Expert'}
                                                </span>
                                              </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                              <div className="flex items-center justify-end">
                                                <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2 mr-2">
                                                  <div 
                                                    className={`h-2 rounded-full ${
                                                      (emp.performanceScore || 0) >= 80 ? 'bg-emerald-500' :
                                                      (emp.performanceScore || 0) >= 60 ? 'bg-amber-500' : 'bg-red-500'
                                                    }`}
                                                    style={{ width: `${Math.min(100, emp.performanceScore || 0)}%` }}
                                                  />
                                                </div>
                                                <span className={`font-medium ${
                                                  (emp.performanceScore || 0) >= 80 ? 'text-emerald-600 dark:text-emerald-400' :
                                                  (emp.performanceScore || 0) >= 60 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'
                                                }`}>
                                                  {(emp.performanceScore || 0)}%
                                                </span>
                                              </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                              <div className="flex items-center justify-end">
                                                <div className="w-20 bg-gray-200 dark:bg-gray-700 rounded-full h-2 mr-2">
                                                  <div 
                                                    className={`h-2 rounded-full ${
                                                      (emp.attendance || 0) >= 95 ? 'bg-emerald-500' :
                                                      (emp.attendance || 0) >= 90 ? 'bg-amber-500' : 'bg-red-500'
                                                    }`}
                                                    style={{ width: `${Math.min(100, emp.attendance || 0)}%` }}
                                                  />
                                                </div>
                                                <span className="font-medium">{emp.attendance || 0}%</span>
                                              </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                              <div className="flex items-center justify-end">
                                                <div className="flex mr-2">
                                                  {[...Array(5)].map((_, i) => (
                                                    <Star 
                                                      key={i} 
                                                      className={`h-4 w-4 ${
                                                        i < Math.floor(emp.customerRating || 0) 
                                                          ? "text-yellow-500 fill-yellow-500" 
                                                          : "text-gray-300 dark:text-gray-600"
                                                      }`}
                                                    />
                                                  ))}
                                                </div>
                                                <span className="font-medium">{(emp.customerRating || 0).toFixed(1)}</span>
                                              </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                              <Badge 
                                                variant="outline" 
                                                className={
                                                  emp.rank === 1 ? "bg-yellow-50 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300" :
                                                  emp.rank <= 3 ? "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300" :
                                                  emp.rank <= 10 ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300" :
                                                  "bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400"
                                                }
                                              >
                                                #{emp.rank || 'N/A'}
                                              </Badge>
                                            </TableCell>
                                          </TableRow>
                                        );
                                      })}
                                    </TableBody>
                                  </Table>
                                </div>
                              </div>
                            ))}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                          <div className="bg-gradient-to-br from-emerald-100 to-emerald-50 dark:from-emerald-900/20 dark:to-emerald-900/5 p-4 rounded-2xl mb-4">
                            <TrendingUp className="h-12 w-12 text-emerald-500" />
                          </div>
                          <p className="text-gray-700 dark:text-gray-300 font-medium">No employee rankings yet</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mt-1 mb-4">
                            Performance rankings will appear here once employees complete orders
                          </p>
                          <Button 
                            variant="outline" 
                            className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-900/20"
                            onClick={handleRecalculateRanks}
                            disabled={isRecalculating}
                          >
                            <TrendingUp className={`h-4 w-4 mr-2 ${isRecalculating ? 'animate-spin' : ''}`} />
                            {isRecalculating ? 'Calculating...' : 'Calculate Ranks'}
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              </TabsContent>
            </Tabs>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

const queryClient = new QueryClient()

export default function DashboardWithQueryClient() {
  return (
    <QueryClientProvider client={queryClient}>
      <Dashboard />
    </QueryClientProvider>
  ) 
}