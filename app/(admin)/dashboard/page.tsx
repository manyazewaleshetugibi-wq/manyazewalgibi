"use client"

import type React from "react"
import { useState, useMemo } from "react"
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query"
import axios from "axios"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer, AreaChart, Area, Tooltip as RechartsTooltip } from "recharts"
import { motion, AnimatePresence } from "framer-motion"
import { useTheme } from "next-themes"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowDownIcon, ArrowUpIcon, DollarSign, ShoppingCart, Package, TrendingUp, Calendar, Users, Clock, ArrowUp, ArrowDown } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

// Theme Provider Component (if you don't have one)
import { ThemeProvider } from "next-themes"

// API client setup with error handling
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "/api",
  timeout: 10000,
})

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("API Error:", error.message);
    return Promise.reject(error);
  }
);

// API functions with better error handling
const fetchExpenses = async () => {
  try {
    const response = await api.get("/expense");
    return response.data?.data || [];
  } catch (error) {
    console.error("Error fetching expenses:", error);
    return [];
  }
}

const fetchWaitresses = async () => {
  try {
    const response = await api.get("/waitress");
    return response.data?.waitresses || [];
  } catch (error) {
    console.error("Error fetching waitresses:", error);
    return [];
  }
}

const fetchOrderReport = async () => {
  try {
    const response = await api.get("/order/report");
    return response.data || { dailySales: {}, orderCount: 0, orders: [] };
  } catch (error) {
    console.error("Error fetching order report:", error);
    return { dailySales: {}, orderCount: 0, orders: [] };
  }
}

const fetchStock = async () => {
  try {
    const response = await api.get("/stock");
    return response.data?.stocks || [];
  } catch (error) {
    console.error("Error fetching stock:", error);
    return [];
  }
}

const fetchFeedback = async () => {
  try {
    const response = await api.get("/feedback");
    return response.data?.data || [];
  } catch (error) {
    console.error("Error fetching feedback:", error);
    return [];
  }
}

const fetchBlogPosts = async () => {
  try {
    const response = await api.get("/blog");
    return response.data?.data || [];
  } catch (error) {
    console.error("Error fetching blog posts:", error);
    return [];
  }
}

const fetchMenuItems = async () => {
  try {
    const response = await api.get("/items");
    return response.data?.items || response.data || [];
  } catch (error) {
    console.error("Error fetching menu items:", error);
    return [];
  }
}

const fetchStockPurchases = async () => {
  try {
    const response = await api.get("/stock-purchase");
    return response.data?.purchases || response.data || [];
  } catch (error) {
    console.error("Error fetching stock purchases:", error);
    return [];
  }
}

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

interface Order {
  _id: string;
  waiterId: string;
  finalAmount: number;
  createdAt: string;
  items: { subtotal: number }[];
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

// Utility functions
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("et-ET", { style: "currency", currency: "ETB" }).format(amount)
}

const calculatePercentageChange = (current: number, previous: number) => {
  if (previous === 0) return 100
  return ((current - previous) / previous) * 100
}

// Create sample data for testing
const createSampleData = () => {
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  return {
    expenses: [
      { _id: "1", title: "Electricity Bill", category: "Utilities", amount: 5000, date: today },
      { _id: "2", title: "Food Supplies", category: "Inventory", amount: 15000, date: today },
      { _id: "3", title: "Rent", category: "Rent", amount: 30000, date: yesterday },
    ],
    waitresses: [
      { _id: "1", name: "Alice Johnson", phone: "+1234567890", shift: "Morning" },
      { _id: "2", name: "Bob Smith", phone: "+0987654321", shift: "Evening" },
      { _id: "3", name: "Carol Davis", phone: "+1234509876", shift: "Night" },
    ],
    orderReport: {
      dailySales: {
        [today]: 25000,
        [yesterday]: 22000,
        [twoDaysAgo]: 19500,
      },
      orderCount: 42,
      orders: [
        { _id: "1", waiterId: "1", finalAmount: 1500, createdAt: today, items: [{ subtotal: 1500 }] },
        { _id: "2", waiterId: "2", finalAmount: 2200, createdAt: today, items: [{ subtotal: 2200 }] },
        { _id: "3", waiterId: "1", finalAmount: 1800, createdAt: yesterday, items: [{ subtotal: 1800 }] },
      ],
    },
    stock: [
      { _id: "1", name: "Rice", currentStock: 50, minimumStock: 20 },
      { _id: "2", name: "Oil", currentStock: 30, minimumStock: 15 },
      { _id: "3", name: "Flour", currentStock: 40, minimumStock: 25 },
      { _id: "4", name: "Sugar", currentStock: 10, minimumStock: 15 },
    ],
    feedback: [
      { _id: "1", rating: 5, comment: "Great service!" },
      { _id: "2", rating: 4, comment: "Good food" },
      { _id: "3", rating: 3, comment: "Average experience" },
    ],
    menuItems: [
      { _id: "1", name: "Chicken Burger", price: 150, categoryId: "Main Course" },
      { _id: "2", name: "Pizza", price: 200, categoryId: "Main Course" },
      { _id: "3", name: "Pasta", price: 120, categoryId: "Main Course" },
      { _id: "4", name: "Salad", price: 80, categoryId: "Appetizer" },
    ],
    stockPurchases: [
      { _id: "1", purchaseDate: today, quantity: 10, unitPrice: 500 },
      { _id: "2", purchaseDate: yesterday, quantity: 5, unitPrice: 300 },
      { _id: "3", purchaseDate: twoDaysAgo, quantity: 8, unitPrice: 450 },
    ]
  };
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
    primary: "from-blue-100/50 to-blue-50/30 border-blue-200 dark:from-blue-900/20 dark:to-blue-900/10 dark:border-blue-800/30",
    success: "from-green-100/50 to-green-50/30 border-green-200 dark:from-green-900/20 dark:to-green-900/10 dark:border-green-800/30",
    warning: "from-amber-100/50 to-amber-50/30 border-amber-200 dark:from-amber-900/20 dark:to-amber-900/10 dark:border-amber-800/30",
    danger: "from-red-100/50 to-red-50/30 border-red-200 dark:from-red-900/20 dark:to-red-900/10 dark:border-red-800/30",
    info: "from-cyan-100/50 to-cyan-50/30 border-cyan-200 dark:from-cyan-900/20 dark:to-cyan-900/10 dark:border-cyan-800/30"
  }

  const iconStyles = {
    primary: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    success: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    warning: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    danger: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    info: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400"
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
function DashboardContent() {
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({ 
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 
    to: new Date() 
  })
  const [useSampleData, setUseSampleData] = useState(false);
  const { theme } = useTheme()

  // Fetch data or use sample data
  const { data: expenses = [], isLoading: isLoadingExpenses } = useQuery<Expense[]>({ 
    queryKey: ["expenses"], 
    queryFn: fetchExpenses,
    staleTime: 5 * 60 * 1000,
    enabled: !useSampleData,
  })
  
  const { data: waitresses = [], isLoading: isLoadingWaitresses } = useQuery<Waitress[]>({
    queryKey: ["waitresses"],
    queryFn: fetchWaitresses,
    staleTime: 5 * 60 * 1000,
    enabled: !useSampleData,
  })
  
  const { data: orderReport = { dailySales: {}, orderCount: 0, orders: [] }, isLoading: isLoadingOrderReport } = useQuery<OrderReport & { orders: Order[] }>({
    queryKey: ["orderReport"],
    queryFn: fetchOrderReport,
    staleTime: 5 * 60 * 1000,
    enabled: !useSampleData,
  })
  
  const { data: stock = [], isLoading: isLoadingStock } = useQuery<StockItem[]>({ 
    queryKey: ["stock"], 
    queryFn: fetchStock,
    staleTime: 5 * 60 * 1000,
    enabled: !useSampleData,
  })
  
  const { data: menuItems = [], isLoading: isLoadingMenuItems } = useQuery<MenuItem[]>({
    queryKey: ["menuItems"],
    queryFn: fetchMenuItems,
    staleTime: 5 * 60 * 1000,
    enabled: !useSampleData,
  })
  
  const { data: stockPurchases = [], isLoading: isLoadingStockPurchases } = useQuery<StockPurchase[]>({
    queryKey: ["stockPurchases"],
    queryFn: fetchStockPurchases,
    staleTime: 5 * 60 * 1000,
    enabled: !useSampleData,
  })

  const isLoading =
    (isLoadingExpenses && !useSampleData) ||
    (isLoadingWaitresses && !useSampleData) ||
    (isLoadingOrderReport && !useSampleData) ||
    (isLoadingStock && !useSampleData) ||
    (isLoadingMenuItems && !useSampleData) ||
    (isLoadingStockPurchases && !useSampleData)

  // Use sample data if real data is empty or if useSampleData is true
  const sampleData = useMemo(() => createSampleData(), []);
  
  const finalExpenses = useSampleData ? sampleData.expenses : expenses;
  const finalWaitresses = useSampleData ? sampleData.waitresses : waitresses;
  const finalOrderReport = useSampleData ? sampleData.orderReport : orderReport;
  const finalStock = useSampleData ? sampleData.stock : stock;
  const finalMenuItems = useSampleData ? sampleData.menuItems : menuItems;
  const finalStockPurchases = useSampleData ? sampleData.stockPurchases : stockPurchases;

  const filteredSalesData = useMemo(() => {
    return Object.entries(finalOrderReport.dailySales)
      .filter(([date]) => {
        try {
          const salesDate = new Date(date)
          return salesDate >= dateRange.from && salesDate <= dateRange.to
        } catch {
          return false;
        }
      })
      .map(([date, sales]) => ({
        date: new Date(date).toISOString().split("T")[0],
        sales,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [finalOrderReport, dateRange])

  const todaysRevenue = useMemo(() => {
    const today = new Date().toISOString().split("T")[0]
    return finalOrderReport.dailySales[today] || 0
  }, [finalOrderReport])

  const todaysExpenses = useMemo(() => {
    const today = new Date().toISOString().split("T")[0]
    return finalExpenses.filter((expense) => expense.date === today).reduce((sum: number, expense) => sum + expense.amount, 0)
  }, [finalExpenses])

  const todaysStockCosts = useMemo(() => {
    const today = new Date().toISOString().split("T")[0]
    return finalStockPurchases
      .filter((purchase) => purchase.purchaseDate.startsWith(today))
      .reduce((sum: number, purchase) => sum + purchase.quantity * purchase.unitPrice, 0)
  }, [finalStockPurchases])

  const stockData = useMemo(() => {
    return finalStock.map((item) => ({
      name: item.name,
      current: item.currentStock,
      minimum: item.minimumStock,
    }))
  }, [finalStock])

  const totalRevenue = useMemo(() => {
    return Object.values(finalOrderReport.dailySales).reduce((sum: number, sales: number) => sum + sales, 0)
  }, [finalOrderReport])

  const totalExpenses = useMemo(() => {
    return finalExpenses.reduce((sum: number, expense) => sum + expense.amount, 0)
  }, [finalExpenses])

  const totalStockCosts = useMemo(() => {
    return finalStockPurchases.reduce((sum: number, purchase) => sum + purchase.quantity * purchase.unitPrice, 0)
  }, [finalStockPurchases])

  const averageOrderValue = useMemo(() => {
    if (finalOrderReport.orderCount === 0) return 0
    return totalRevenue / finalOrderReport.orderCount
  }, [totalRevenue, finalOrderReport])

  const criticalStock = useMemo(() => {
    return finalStock.filter(item => item.currentStock <= item.minimumStock)
  }, [finalStock])

  const topWaitress = useMemo(() => {
    if (!finalOrderReport.orders || finalOrderReport.orders.length === 0 || finalWaitresses.length === 0) {
      return null;
    }

    const salesByWaitress: { [key: string]: number } = {};

    finalOrderReport.orders.forEach(order => {
      if (order.waiterId) {
        salesByWaitress[order.waiterId] = (salesByWaitress[order.waiterId] || 0) + order.finalAmount;
      }
    });

    const topWaitressId = Object.keys(salesByWaitress).reduce((a, b) => salesByWaitress[a] > salesByWaitress[b] ? a : b, '');

    if (!topWaitressId) return null;

    const waitressInfo = finalWaitresses.find(w => w._id === topWaitressId);

    return waitressInfo ? { ...waitressInfo, totalSales: salesByWaitress[topWaitressId] } : null;
  }, [finalOrderReport.orders, finalWaitresses]);

  const getStockStatus = (item: StockItem) => {
    const ratio = item.currentStock / item.minimumStock
    if (ratio <= 0.5) return 'critical'
    if (ratio <= 1) return 'low'
    return 'good'
  }

  // Generate dates for the last 30 days if no sales data
  const salesData = useMemo(() => {
    if (filteredSalesData.length > 0) return filteredSalesData;
    
    // Generate sample sales data for the last 30 days
    const data = [];
    for (let i = 30; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      data.push({
        date: dateStr,
        sales: 10000 + Math.random() * 15000, // Random sales between 10000 and 25000
      });
    }
    return data;
  }, [filteredSalesData])

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
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <motion.h1 
                className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent dark:from-primary dark:to-blue-400"
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5 }}
              >
                Restaurant Dashboard
              </motion.h1>
              
              <div className="flex items-center gap-4">
                {(useSampleData || (expenses.length === 0 && !isLoading)) && (
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300">
                    Using Sample Data
                  </Badge>
                )}
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setUseSampleData(!useSampleData)}
                  disabled={isLoading}
                >
                  {useSampleData ? "Use Real Data" : "Use Sample Data"}
                </Button>
              </div>
            </div>
            
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
                {/* Today's Stats */}
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
                    isLoading={false}
                    color="success"
                    description="Total sales for today"
                  />
                  <StatCard
                    title="Today's Expenses"
                    value={formatCurrency(todaysExpenses)}
                    icon={<ArrowDownIcon className="h-4 w-4" />}
                    change={-2.1}
                    trend="down"
                    isLoading={false}
                    color="danger"
                    description="Daily operational costs"
                  />
                  <StatCard
                    title="Today's Stock Costs"
                    value={formatCurrency(todaysStockCosts)}
                    icon={<Package className="h-4 w-4" />}
                    change={1.8}
                    trend="up"
                    isLoading={false}
                    color="warning"
                    description="Inventory purchases"
                  />
                  <StatCard
                    title="Total Orders"
                    value={finalOrderReport.orderCount.toString()}
                    icon={<ShoppingCart className="h-4 w-4" />}
                    change={3.5}
                    trend="up"
                    isLoading={false}
                    color="info"
                    description="Number of orders processed"
                  />
                </motion.div>

                {/* Overall Totals */}
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
                    isLoading={false}
                    color="primary"
                    description="All-time revenue"
                  />
                  <StatCard
                    title="Total Expenses"
                    value={formatCurrency(totalExpenses)}
                    icon={<ArrowDownIcon className="h-4 w-4" />}
                    isLoading={false}
                    color="warning"
                    description="All-time expenses"
                  />
                  <StatCard
                    title="Total Stock Costs"
                    value={formatCurrency(totalStockCosts)}
                    icon={<Package className="h-4 w-4" />}
                    isLoading={false}
                    color="info"
                    description="Inventory investment"
                  />
                  <StatCard
                    title="Average Order Value"
                    value={formatCurrency(averageOrderValue)}
                    icon={<ShoppingCart className="h-4 w-4" />}
                    isLoading={false}
                    color="success"
                    description="Revenue per order"
                  />
                </motion.div>

                {topWaitress && (
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.4, delay: 0.25 }}
                  >
                    <Card className="border dark:border-gray-800 bg-gradient-to-r from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/5">
                      <CardHeader>
                        <CardTitle className="flex items-center text-primary">
                          <TrendingUp className="h-5 w-5 mr-2" />
                          Top Performing Staff
                        </CardTitle>
                        <CardDescription>Highest sales by waitress</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-col md:flex-row items-center gap-4">
                          <div className="bg-primary/20 p-4 rounded-full">
                            <Users className="h-12 w-12 text-primary" />
                          </div>
                          <div className="flex-1">
                            <h3 className="text-xl font-bold">{topWaitress.name}</h3>
                            <p className="text-muted-foreground">{topWaitress.shift} Shift • {topWaitress.phone}</p>
                            <div className="mt-2 text-lg font-semibold text-primary">
                              Total Sales: {formatCurrency(topWaitress.totalSales)}
                            </div>
                          </div>
                          <Badge className="bg-primary text-primary-foreground px-4 py-2">
                            🏆 Top Performer
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}

                {/* Sales Chart */}
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
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          {salesData.length} days
                        </Badge>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setDateRange({ from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), to: new Date() })}
                        >
                          Reset
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[400px]">
                        {salesData.length === 0 ? (
                          <div className="flex flex-col items-center justify-center h-full">
                            <Calendar className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-4" />
                            <p className="text-gray-500 dark:text-gray-400">No sales data available</p>
                          </div>
                        ) : (
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={salesData}>
                              <defs>
                                <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
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
                                  return value.toString();
                                }}
                              />
                              <RechartsTooltip
                                content={({ active, payload }) => {
                                  if (active && payload && payload.length) {
                                    return (
                                      <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 shadow-lg rounded-lg">
                                        <p className="text-gray-500 text-xs">
                                          {new Date(payload[0].payload.date).toLocaleDateString('en-US', { 
                                            weekday: 'long', 
                                            year: 'numeric', 
                                            month: 'long', 
                                            day: 'numeric' 
                                          })}
                                        </p>
                                        <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
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
                                stroke="#3b82f6"
                                strokeWidth={2}
                                fillOpacity={1}
                                fill="url(#colorSales)"
                                activeDot={{ r: 6, strokeWidth: 2, stroke: "white" }}
                              />
                            </AreaChart>
                          </ResponsiveContainer>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Critical Stock */}
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
                                badge: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
                              },
                              low: {
                                badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                              },
                              good: {
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
                                      <span>Current: <span className={status === 'critical' ? 'text-red-600 dark:text-red-400' : status === 'low' ? 'text-amber-600 dark:text-amber-400' : 'text-green-600 dark:text-green-400'}>{item.currentStock}</span></span>
                                      <span>Minimum: {item.minimumStock}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              </TabsContent>

              <TabsContent value="sales" className="space-y-6">
                {/* Recent Expenses */}
                <Card className="border dark:border-gray-800">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <ArrowDownIcon className="h-5 w-5 mr-2 text-red-500" />
                      Recent Expenses
                    </CardTitle>
                    <CardDescription>Latest financial outflows</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {finalExpenses.length > 0 ? (
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
                            {finalExpenses.slice(0, 5).map((expense) => (
                              <TableRow key={expense._id} className="hover:bg-gray-50 dark:hover:bg-gray-900/30">
                                <TableCell className="font-medium">{expense.title}</TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="bg-gray-50 dark:bg-gray-800">
                                    {expense.category}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-red-600 dark:text-red-400 font-medium">{formatCurrency(expense.amount)}</TableCell>
                                <TableCell className="text-gray-500 dark:text-gray-400">
                                  {new Date(expense.date).toLocaleDateString()}
                                </TableCell>
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

                {/* Menu Items */}
                <Card className="border dark:border-gray-800">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <ShoppingCart className="h-5 w-5 mr-2 text-primary" />
                      Popular Menu Items
                    </CardTitle>
                    <CardDescription>Best selling products</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {finalMenuItems.length > 0 ? (
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
                            {finalMenuItems.slice(0, 5).map((item) => (
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
                {/* Inventory Status */}
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
                      <div className="h-[400px]">
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
                              fill="#3b82f6" 
                              name="Current Stock" 
                              radius={[4, 4, 0, 0]}
                            />
                            <Bar 
                              dataKey="minimum" 
                              fill="#f59e0b" 
                              name="Minimum Stock" 
                              radius={[4, 4, 0, 0]}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
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
                {/* Staff Schedule */}
                <Card className="border dark:border-gray-800">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Users className="h-5 w-5 mr-2 text-violet-500" />
                      Staff Schedule
                    </CardTitle>
                    <CardDescription>Current team member shifts</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {finalWaitresses.length > 0 ? (
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
                            {finalWaitresses.map((waitress) => (
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
              </TabsContent>
            </Tabs>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Wrap the Dashboard component with QueryClientProvider
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

export default function Dashboard() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <DashboardContent />
      </ThemeProvider>
    </QueryClientProvider>
  )
}