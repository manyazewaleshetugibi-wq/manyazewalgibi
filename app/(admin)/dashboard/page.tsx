"use client"

import type React from "react"
import { useState, useMemo, useCallback, useEffect } from "react"
import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from "@tanstack/react-query"
import axios from "axios"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer, AreaChart, Area, Tooltip as RechartsTooltip, PieChart, Pie, Cell } from "recharts"
import { motion, AnimatePresence } from "framer-motion"
import { useTheme } from "next-themes"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowDownIcon, ArrowUpIcon, DollarSign, ShoppingCart, Package, TrendingUp, Calendar, Users, Clock, ArrowUp, ArrowDown, Star, Trash2, Filter, User, Utensils, ShoppingBag, Coffee, BookOpen, Shield, BarChart3, X, Search, Filter as FilterIcon, ToggleLeft, ToggleRight } from "lucide-react"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { DateRangePicker } from "./date-range-picker"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { StaffRegistrationForm } from "@/components/staff-registration-form"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

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
  category?: string
  unit?: string
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
  
  const sortedByCompletedOrders = [...employeeRanks].sort(
    (a, b) => (b.completedOrders || 0) - (a.completedOrders || 0)
  );
  
  const withGlobalRanks = sortedByCompletedOrders.map((emp, index) => {
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
  
  const employeesByRole = withGlobalRanks.reduce((acc, emp) => {
    const role = emp.role || "Unassigned";
    if (!acc[role]) acc[role] = [];
    acc[role].push(emp);
    return acc;
  }, {} as Record<string, typeof withGlobalRanks>);
  
  Object.entries(employeesByRole).forEach(([role, roleEmployees]) => {
    const sortedRoleEmployees = roleEmployees.sort(
      (a, b) => (b.completedOrders || 0) - (a.completedOrders || 0)
    );
    
    sortedRoleEmployees.forEach((emp, index) => {
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

// Role Icons Mapping - Use available icons from lucide-react
const roleIcons = {
  admin: Shield,
  kitchen: Utensils,
  stock_manager: Package,
  fb: Users,
  marketing: BarChart3,
  finance: DollarSign,
  pos: ShoppingCart,
  waitress: User,
  default: User
}

// Role Colors Mapping
const roleColors = {
  admin: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800/30",
  kitchen: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800/30",
  stock_manager: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800/30",
  fb: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800/30",
  marketing: "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800/30",
  finance: "bg-cyan-100 text-cyan-700 border-cyan-200 dark:bg-cyan-900/20 dark:text-cyan-300 dark:border-cyan-800/30",
  pos: "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-800/30",
  waitress: "bg-pink-100 text-pink-700 border-pink-200 dark:bg-pink-900/20 dark:text-pink-300 dark:border-pink-800/30"
}

// Stock Status Types
type StockStatus = 'critical' | 'low' | 'good';

// Main Dashboard Component
function Dashboard() {
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({ 
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 
    to: new Date() 
  })
  const [isRecalculating, setIsRecalculating] = useState(false)
  const [stockFilter, setStockFilter] = useState<StockStatus | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRole, setSelectedRole] = useState<string>('all')
  const [roleView, setRoleView] = useState<'cards' | 'table'>('cards')
  const [expandedRole, setExpandedRole] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const { theme, setTheme } = useTheme()
  const queryClient = useQueryClient()

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

  // Stock status calculation
  const getStockStatus = (item: StockItem): StockStatus => {
    const ratio = item.currentStock / item.minimumStock;
    if (ratio <= 0.5) return 'critical';
    if (ratio <= 1) return 'low';
    return 'good';
  }

  // Stock Filtering and Sorting
  const sortedAndFilteredStock = useMemo(() => {
    if (!stock) return [];
    
    let filtered = [...stock];
    
    // Apply stock status filter
    if (stockFilter !== 'all') {
      filtered = filtered.filter(item => getStockStatus(item) === stockFilter);
    }
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item => 
        item.name.toLowerCase().includes(query) ||
        (item.category && item.category.toLowerCase().includes(query))
      );
    }
    
    // Sort by stock level (lowest first)
    return filtered.sort((a, b) => {
      const ratioA = a.currentStock / a.minimumStock;
      const ratioB = b.currentStock / b.minimumStock;
      return ratioA - ratioB;
    });
  }, [stock, stockFilter, searchQuery])

  const stockStatusCounts = useMemo(() => {
    if (!stock) return { critical: 0, low: 0, good: 0, total: 0 };
    
    return stock.reduce((acc, item) => {
      const status = getStockStatus(item);
      acc[status]++;
      acc.total++;
      return acc;
    }, { critical: 0, low: 0, good: 0, total: 0 });
  }, [stock])

  // Filtered stock data for chart
  const stockChartData = useMemo(() => {
    if (!sortedAndFilteredStock || sortedAndFilteredStock.length === 0) return [];
    
    return sortedAndFilteredStock.map((item) => ({
      name: item.name.length > 20 ? item.name.substring(0, 20) + '...' : item.name,
      current: item.currentStock,
      minimum: item.minimumStock,
      percentage: (item.currentStock / item.minimumStock) * 100,
      status: getStockStatus(item),
      item // Keep reference to original item
    }))
  }, [sortedAndFilteredStock])

  // Stock status pie chart data
  const stockStatusPieData = useMemo(() => {
    return [
      { name: 'Critical', value: stockStatusCounts.critical, color: '#ef4444' },
      { name: 'Low', value: stockStatusCounts.low, color: '#f59e0b' },
      { name: 'Good', value: stockStatusCounts.good, color: '#10b981' }
    ].filter(item => item.value > 0);
  }, [stockStatusCounts])

  // Staff by role grouping
  const staffByRole = useMemo(() => {
    if (!staff) return {};
    
    return staff.reduce((acc, staffMember) => {
      const role = staffMember.role || 'unassigned';
      if (!acc[role]) {
        acc[role] = [];
      }
      acc[role].push(staffMember);
      return acc;
    }, {} as Record<string, Staff[]>);
  }, [staff])

  // Role statistics
  const roleStatistics = useMemo(() => {
    if (!staffByRole) return [];
    
    return Object.entries(staffByRole).map(([role, members]) => ({
      role,
      count: members.length,
      activeCount: members.filter(m => m.status === 'active').length,
      inactiveCount: members.filter(m => m.status === 'inactive').length,
      Icon: roleIcons[role as keyof typeof roleIcons] || roleIcons.default,
      color: roleColors[role as keyof typeof roleColors] || 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700'
    })).sort((a, b) => b.count - a.count);
  }, [staffByRole])

  // Filtered staff based on selected role and status
  const filteredStaff = useMemo(() => {
    if (!staff) return [];
    
    let filtered = [...staff];
    
    if (selectedRole !== 'all') {
      filtered = filtered.filter(member => member.role === selectedRole);
    }
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(member => member.status === statusFilter);
    }
    
    return filtered;
  }, [staff, selectedRole, statusFilter])

  // Staff status distribution
  const staffStatusStats = useMemo(() => {
    if (!staff) return { active: 0, inactive: 0, total: 0 };
    
    return {
      active: staff.filter(s => s.status === 'active').length,
      inactive: staff.filter(s => s.status === 'inactive').length,
      total: staff.length
    };
  }, [staff])

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

  // Handle delete staff member
  const handleDeleteStaff = async (id: string) => {
    if (confirm("Are you sure you want to delete this staff member?")) {
      try {
        await api.delete(`/staff/${id}`);
        queryClient.invalidateQueries({ queryKey: ["staff"] });
      } catch (error: any) {
        console.error("Failed to delete staff", error);
        alert(error.response?.data?.message || "Failed to delete staff member");
      }
    }
  };

  // Handle toggle staff status - Using existing PUT endpoint
  const handleToggleStatus = async (staffMember: Staff) => {
    const newStatus = staffMember.status === 'active' ? 'inactive' : 'active';
    const previousStatus = staffMember.status;
    
    // Optimistically update the UI
    queryClient.setQueryData<Staff[]>(["staff"], (old = []) => {
      return old.map(s => 
        s._id === staffMember._id 
          ? { ...s, status: newStatus }
          : s
      );
    });
    
    try {
      // Use PUT endpoint which already handles full user updates including status
      const response = await api.put(`/staff/${staffMember._id}`, {
        name: staffMember.name,
        email: staffMember.email,
        role: staffMember.role,
        phone: staffMember.phone,
        employeeId: staffMember.employeeId,
        status: newStatus,
        permissions: staffMember.permissions || []
      });
      
      if (!response.data.success) {
        // Revert on failure
        queryClient.setQueryData<Staff[]>(["staff"], (old = []) => {
          return old.map(s => 
            s._id === staffMember._id 
              ? { ...s, status: previousStatus }
              : s
          );
        });
        alert("Failed to update status");
      }
    } catch (error: any) {
      // Revert on error
      queryClient.setQueryData<Staff[]>(["staff"], (old = []) => {
        return old.map(s => 
          s._id === staffMember._id 
            ? { ...s, status: previousStatus }
            : s
        );
      });
      
      console.error("Failed to update staff status:", error);
      
      // Specific error handling based on status code
      if (error.response?.status === 404) {
        alert("Staff member not found. They may have been deleted.");
      } else if (error.response?.status === 400) {
        alert(error.response?.data?.message || "Invalid data provided");
      } else if (error.response?.status === 401 || error.response?.status === 403) {
        alert("You don't have permission to update staff status");
      } else {
        alert(error.response?.data?.message || "Failed to update staff status. Please try again.");
      }
    }
  };

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
    return stock.filter(item => getStockStatus(item) === 'critical')
  }, [stock])

  // Calculate ranks based on completedOrders
  const rankedEmployees = useMemo(() => {
    if (!employeeRanks) return [];
    return calculateRanksByCompletedOrders(employeeRanks);
  }, [employeeRanks])

  const employeesByRole = useMemo(() => {
    if (!rankedEmployees || rankedEmployees.length === 0) return {};
    
    const grouped = rankedEmployees.reduce((acc, emp) => {
      const role = emp.role || "Unassigned";
      if (!acc[role]) acc[role] = [];
      acc[role].push(emp);
      return acc;
    }, {} as Record<string, EmployeeRank[]>);
    
    Object.keys(grouped).forEach(role => {
      grouped[role].sort((a, b) => a.roleRank - b.roleRank);
    });
    
    return grouped;
  }, [rankedEmployees])

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

  const toggleRoleExpansion = (role: string) => {
    if (expandedRole === role) {
      setExpandedRole(null);
    } else {
      setExpandedRole(role);
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
              
              {/* Overview Tab */}
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

              {/* Sales Tab */}
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

              {/* Inventory Tab */}
              <TabsContent value="inventory" className="space-y-6">
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.4, delay: 0.1 }}
                >
                  <Card className="border dark:border-gray-800">
                    <CardHeader>
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                          <CardTitle className="flex items-center">
                            <Package className="h-5 w-5 mr-2 text-blue-500" />
                            Inventory Management
                          </CardTitle>
                          <CardDescription>Monitor and manage your stock levels</CardDescription>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row gap-2">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                              placeholder="Search inventory..."
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              className="pl-9 w-full sm:w-64"
                            />
                          </div>
                          
                          <div className="flex gap-2">
                            <Select value={stockFilter} onValueChange={(value: StockStatus | 'all') => setStockFilter(value)}>
                              <SelectTrigger className="w-[140px]">
                                <FilterIcon className="h-4 w-4 mr-2" />
                                <SelectValue placeholder="Filter by status" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All Items</SelectItem>
                                <SelectItem value="critical">Critical</SelectItem>
                                <SelectItem value="low">Low Stock</SelectItem>
                                <SelectItem value="good">Good Stock</SelectItem>
                              </SelectContent>
                            </Select>
                            
                            {searchQuery || stockFilter !== 'all' ? (
                              <Button
                                variant="outline"
                                onClick={() => {
                                  setSearchQuery('');
                                  setStockFilter('all');
                                }}
                                className="gap-2"
                              >
                                <X className="h-4 w-4" />
                                Clear
                              </Button>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                        {/* Stock Status Overview Cards */}
                        <motion.div 
                          className="space-y-4"
                          initial={{ scale: 0.9, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ delay: 0.2 }}
                        >
                          <Card className="border border-red-200 dark:border-red-800/30 bg-gradient-to-br from-red-50 to-red-50/50 dark:from-red-900/10 dark:to-red-900/5">
                            <CardContent className="pt-6">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm font-medium text-red-700 dark:text-red-300">Critical Stock</p>
                                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stockStatusCounts.critical}</p>
                                  <p className="text-xs text-red-500 dark:text-red-400 mt-1">Needs immediate attention</p>
                                </div>
                                <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                                  <Package className="h-6 w-6 text-red-600 dark:text-red-400" />
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                          
                          <Card className="border border-amber-200 dark:border-amber-800/30 bg-gradient-to-br from-amber-50 to-amber-50/50 dark:from-amber-900/10 dark:to-amber-900/5">
                            <CardContent className="pt-6">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm font-medium text-amber-700 dark:text-amber-300">Low Stock</p>
                                  <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stockStatusCounts.low}</p>
                                  <p className="text-xs text-amber-500 dark:text-amber-400 mt-1">Reordering soon</p>
                                </div>
                                <div className="h-12 w-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                                  <Package className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                          
                          <Card className="border border-green-200 dark:border-green-800/30 bg-gradient-to-br from-green-50 to-green-50/50 dark:from-green-900/10 dark:to-green-900/5">
                            <CardContent className="pt-6">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm font-medium text-green-700 dark:text-green-300">Good Stock</p>
                                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stockStatusCounts.good}</p>
                                  <p className="text-xs text-green-500 dark:text-green-400 mt-1">Well stocked</p>
                                </div>
                                <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                                  <Package className="h-6 w-6 text-green-600 dark:text-green-400" />
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                        
                        {/* Stock Status Pie Chart */}
                        <motion.div 
                          className="lg:col-span-2"
                          initial={{ scale: 0.9, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ delay: 0.3 }}
                        >
                          <Card className="h-full border dark:border-gray-800">
                            <CardHeader>
                              <CardTitle className="text-lg">Stock Status Distribution</CardTitle>
                            </CardHeader>
                            <CardContent className="flex items-center justify-center h-64">
                              {stockStatusPieData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                  <PieChart>
                                    <Pie
                                      data={stockStatusPieData}
                                      cx="50%"
                                      cy="50%"
                                      labelLine={false}
                                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                      outerRadius={80}
                                      fill="#8884d8"
                                      dataKey="value"
                                    >
                                      {stockStatusPieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                      ))}
                                    </Pie>
                                    <RechartsTooltip
                                      formatter={(value) => [`${value} items`, 'Count']}
                                    />
                                    <Legend />
                                  </PieChart>
                                </ResponsiveContainer>
                              ) : (
                                <div className="flex flex-col items-center justify-center text-center py-8">
                                  <Package className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-4" />
                                  <p className="text-gray-500 dark:text-gray-400">No stock data available</p>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        </motion.div>
                      </div>
                      
                      {/* Stock Items Table */}
                      <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.4 }}
                      >
                        <Card className="border dark:border-gray-800">
                          <CardHeader>
                            <CardTitle>Inventory Items ({sortedAndFilteredStock.length})</CardTitle>
                            <CardDescription>Sorted by stock level (lowest first)</CardDescription>
                          </CardHeader>
                          <CardContent>
                            {sortedAndFilteredStock.length > 0 ? (
                              <div className="rounded-md border dark:border-gray-800 overflow-hidden">
                                <Table>
                                  <TableHeader className="bg-gray-50 dark:bg-gray-900/50">
                                    <TableRow>
                                      <TableHead>Item Name</TableHead>
                                      <TableHead>Category</TableHead>
                                      <TableHead>Current Stock</TableHead>
                                      <TableHead>Minimum Required</TableHead>
                                      <TableHead>Stock Level</TableHead>
                                      <TableHead>Status</TableHead>
                                      <TableHead>Percentage</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {sortedAndFilteredStock.map((item) => {
                                      const status = getStockStatus(item);
                                      const percentage = Math.round((item.currentStock / item.minimumStock) * 100);
                                      
                                      const statusConfig = {
                                        critical: {
                                          badge: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/40 dark:text-red-300',
                                          text: 'text-red-600 dark:text-red-400',
                                          bg: 'bg-red-500'
                                        },
                                        low: {
                                          badge: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300',
                                          text: 'text-amber-600 dark:text-amber-400',
                                          bg: 'bg-amber-500'
                                        },
                                        good: {
                                          badge: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/40 dark:text-green-300',
                                          text: 'text-green-600 dark:text-green-400',
                                          bg: 'bg-green-500'
                                        }
                                      };
                                      
                                      return (
                                        <TableRow key={item._id} className="hover:bg-gray-50 dark:hover:bg-gray-900/30">
                                          <TableCell className="font-medium">
                                            <div className="flex items-center gap-2">
                                              <Package className="h-4 w-4 text-gray-400" />
                                              {item.name}
                                            </div>
                                          </TableCell>
                                          <TableCell>
                                            <Badge variant="outline" className="bg-gray-50 dark:bg-gray-800">
                                              {item.category || 'Uncategorized'}
                                            </Badge>
                                          </TableCell>
                                          <TableCell className={`font-medium ${statusConfig[status].text}`}>
                                            {item.currentStock} {item.unit || ''}
                                          </TableCell>
                                          <TableCell className="text-gray-600 dark:text-gray-400">
                                            {item.minimumStock} {item.unit || ''}
                                          </TableCell>
                                          <TableCell>
                                            <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                              <div 
                                                className={`h-2 rounded-full ${statusConfig[status].bg}`}
                                                style={{ width: `${Math.min(100, percentage)}%` }}
                                              />
                                            </div>
                                          </TableCell>
                                          <TableCell>
                                            <Badge variant="outline" className={statusConfig[status].badge}>
                                              {status === 'critical' ? 'Critical' : status === 'low' ? 'Low' : 'Good'}
                                            </Badge>
                                          </TableCell>
                                          <TableCell>
                                            <span className={statusConfig[status].text}>
                                              {percentage}%
                                            </span>
                                          </TableCell>
                                        </TableRow>
                                      );
                                    })}
                                  </TableBody>
                                </Table>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center justify-center py-8 text-center">
                                <Package className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-4" />
                                <p className="text-gray-700 dark:text-gray-300 font-medium">No inventory items found</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mt-1">
                                  {searchQuery || stockFilter !== 'all' 
                                    ? 'Try adjusting your search or filter criteria'
                                    : 'No inventory items available to display'}
                                </p>
                                {(searchQuery || stockFilter !== 'all') && (
                                  <Button
                                    variant="outline"
                                    onClick={() => {
                                      setSearchQuery('');
                                      setStockFilter('all');
                                    }}
                                    className="mt-4"
                                  >
                                    Clear Filters
                                  </Button>
                                )}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </motion.div>
                      
                      {/* Filtered Stock Chart */}
                      {sortedAndFilteredStock.length > 0 && (
                        <motion.div
                          initial={{ y: 20, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          transition={{ delay: 0.5 }}
                        >
                          <Card className="border dark:border-gray-800 mt-6">
                            <CardHeader>
                              <CardTitle>Filtered Stock Levels Visualization</CardTitle>
                              <CardDescription>
                                {stockFilter === 'all' ? 'All inventory items' : `${stockFilter.charAt(0).toUpperCase() + stockFilter.slice(1)} stock items only`}
                              </CardDescription>
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
                                  <BarChart data={stockChartData.slice(0, 10)}>
                                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                                    <XAxis 
                                      dataKey="name" 
                                      angle={-45}
                                      textAnchor="end"
                                      height={60}
                                      tick={{ fontSize: 12 }}
                                    />
                                    <YAxis />
                                    <RechartsTooltip
                                      content={({ active, payload }) => {
                                        if (active && payload && payload.length) {
                                          const data = payload[0].payload;
                                          return (
                                            <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 shadow-lg rounded-lg">
                                              <p className="font-medium">{data.item.name}</p>
                                              <div className="mt-2 space-y-1">
                                                <p className="text-sm flex items-center">
                                                  <span className="w-3 h-3 rounded-full bg-blue-500 mr-2"></span>
                                                  Current: <span className="font-medium ml-1">{data.current} {data.item.unit || ''}</span>
                                                </p>
                                                <p className="text-sm flex items-center">
                                                  <span className="w-3 h-3 rounded-full bg-amber-500 mr-2"></span>
                                                  Minimum: <span className="font-medium ml-1">{data.item.minimumStock} {data.item.unit || ''}</span>
                                                </p>
                                                <p className="text-sm flex items-center">
                                                  <span className="w-3 h-3 rounded-full bg-gray-500 mr-2"></span>
                                                  Status: <span className={`font-medium ml-1 ${
                                                    data.status === 'critical' ? 'text-red-600' :
                                                    data.status === 'low' ? 'text-amber-600' : 'text-green-600'
                                                  }`}>
                                                    {data.status.charAt(0).toUpperCase() + data.status.slice(1)}
                                                  </span>
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
                            </CardContent>
                          </Card>
                        </motion.div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              </TabsContent>

              {/* Staff Tab - Updated with Active/Inactive Toggle */}
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
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                          <CardTitle className="flex items-center">
                            <Users className="h-5 w-5 mr-2 text-violet-500" />
                            Staff Overview
                          </CardTitle>
                          <CardDescription>
                            View and manage staff by role, department, and status
                          </CardDescription>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            {/* Role Filter */}
                            <Select value={selectedRole} onValueChange={setSelectedRole}>
                              <SelectTrigger className="w-[160px]">
                                <SelectValue placeholder="Filter by role" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All Roles</SelectItem>
                                {roleStatistics.map((stat) => (
                                  <SelectItem key={stat.role} value={stat.role}>
                                    <div className="flex items-center gap-2">
                                      <stat.Icon className="h-3 w-3" />
                                      {formatRole(stat.role)} ({stat.count})
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>

                            {/* Status Filter */}
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                              <SelectTrigger className="w-[140px]">
                                <SelectValue placeholder="Filter by status" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All Status</SelectItem>
                                <SelectItem value="active">
                                  <div className="flex items-center gap-2">
                                    <span className="h-2 w-2 rounded-full bg-green-500"></span>
                                    Active
                                  </div>
                                </SelectItem>
                                <SelectItem value="inactive">
                                  <div className="flex items-center gap-2">
                                    <span className="h-2 w-2 rounded-full bg-gray-400"></span>
                                    Inactive
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            
                            {/* View Toggle */}
                            <div className="flex border rounded-md overflow-hidden">
                              <Button
                                variant={roleView === 'cards' ? 'default' : 'ghost'}
                                size="sm"
                                className="rounded-none px-3"
                                onClick={() => setRoleView('cards')}
                              >
                                <Package className="h-4 w-4 mr-2" />
                                Cards
                              </Button>
                              <Button
                                variant={roleView === 'table' ? 'default' : 'ghost'}
                                size="sm"
                                className="rounded-none px-3"
                                onClick={() => setRoleView('table')}
                              >
                                <div className="h-4 w-4 mr-2">T</div>
                                Table
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {/* Staff Status Summary Cards */}
                      {staff && staff.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                          <Card className="border border-green-200 dark:border-green-800/30 bg-gradient-to-br from-green-50 to-green-50/50 dark:from-green-900/10 dark:to-green-900/5">
                            <CardContent className="pt-6">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm font-medium text-green-700 dark:text-green-300">Active Staff</p>
                                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">{staffStatusStats.active}</p>
                                  <p className="text-xs text-green-500 dark:text-green-400 mt-1">
                                    {Math.round((staffStatusStats.active / staffStatusStats.total) * 100)}% of total
                                  </p>
                                </div>
                                <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                                  <Users className="h-6 w-6 text-green-600 dark:text-green-400" />
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                          
                          <Card className="border border-gray-200 dark:border-gray-800/30 bg-gradient-to-br from-gray-50 to-gray-50/50 dark:from-gray-900/10 dark:to-gray-900/5">
                            <CardContent className="pt-6">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Inactive Staff</p>
                                  <p className="text-2xl font-bold text-gray-600 dark:text-gray-400">{staffStatusStats.inactive}</p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    {Math.round((staffStatusStats.inactive / staffStatusStats.total) * 100)}% of total
                                  </p>
                                </div>
                                <div className="h-12 w-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                  <Users className="h-6 w-6 text-gray-600 dark:text-gray-400" />
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                          
                          <Card className="border border-blue-200 dark:border-blue-800/30 bg-gradient-to-br from-blue-50 to-blue-50/50 dark:from-blue-900/10 dark:to-blue-900/5">
                            <CardContent className="pt-6">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Total Staff</p>
                                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{staffStatusStats.total}</p>
                                  <p className="text-xs text-blue-500 dark:text-blue-400 mt-1">
                                    Across {roleStatistics.length} departments
                                  </p>
                                </div>
                                <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                  <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      )}
                      
                      {/* Role Cards View */}
                      {roleView === 'cards' && (
                        <div className="space-y-6">
                          {/* Role Cards */}
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {roleStatistics.map((stat) => {
                              const Icon = stat.Icon;
                              const isExpanded = expandedRole === stat.role;
                              
                              return (
                                <motion.div
                                  key={stat.role}
                                  layout
                                  className={`cursor-pointer ${isExpanded ? 'col-span-full' : ''}`}
                                  onClick={() => toggleRoleExpansion(stat.role)}
                                >
                                  <Card className={`border dark:border-gray-800 hover:shadow-md transition-all ${isExpanded ? 'bg-gray-50 dark:bg-gray-900/50' : ''}`}>
                                    <CardContent className="p-6">
                                      <div className="flex items-start justify-between">
                                        <div>
                                          <div className="flex items-center gap-2 mb-2">
                                            <div className={`p-2 rounded-lg ${stat.color.split(' ')[0]} ${stat.color.split(' ')[1]}`}>
                                              <Icon className="h-4 w-4" />
                                            </div>
                                            <div>
                                              <h3 className="font-semibold">{formatRole(stat.role)}</h3>
                                              <p className="text-xs text-gray-500 dark:text-gray-400">Department</p>
                                            </div>
                                          </div>
                                          
                                          <div className="flex items-center gap-4 mt-4">
                                            <div>
                                              <p className="text-2xl font-bold">{stat.count}</p>
                                              <p className="text-xs text-gray-500 dark:text-gray-400">Total Staff</p>
                                            </div>
                                            <div>
                                              <p className="text-xl font-semibold text-green-600 dark:text-green-400">
                                                {stat.activeCount}
                                              </p>
                                              <p className="text-xs text-gray-500 dark:text-gray-400">Active</p>
                                            </div>
                                            <div>
                                              <p className="text-xl font-semibold text-gray-600 dark:text-gray-400">
                                                {stat.inactiveCount}
                                              </p>
                                              <p className="text-xs text-gray-500 dark:text-gray-400">Inactive</p>
                                            </div>
                                          </div>
                                        </div>
                                        
                                        <div className="flex flex-col items-end gap-2">
                                          <Badge variant="outline" className={stat.color}>
                                            {Math.round((stat.activeCount / stat.count) * 100)}% Active
                                          </Badge>
                                          {stat.inactiveCount > 0 && (
                                            <Badge variant="outline" className="bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300">
                                              {stat.inactiveCount} Inactive
                                            </Badge>
                                          )}
                                        </div>
                                      </div>
                                      
                                      {/* Expanded View */}
                                      {isExpanded && staffByRole[stat.role] && (
                                        <motion.div
                                          initial={{ opacity: 0, height: 0 }}
                                          animate={{ opacity: 1, height: 'auto' }}
                                          exit={{ opacity: 0, height: 0 }}
                                          className="mt-6 pt-6 border-t"
                                        >
                                          <h4 className="font-medium mb-4">Staff Members in {formatRole(stat.role)}</h4>
                                          <div className="rounded-md border dark:border-gray-800 overflow-hidden">
                                            <Table>
                                              <TableHeader className="bg-gray-50 dark:bg-gray-900/50">
                                                <TableRow>
                                                  <TableHead>Name</TableHead>
                                                  <TableHead>Email</TableHead>
                                                  <TableHead>Employee ID</TableHead>
                                                  <TableHead>Phone</TableHead>
                                                  <TableHead>Status</TableHead>
                                                  <TableHead>Joined</TableHead>
                                                  <TableHead className="w-[160px]">Actions</TableHead>
                                                </TableRow>
                                              </TableHeader>
                                              <TableBody>
                                                {staffByRole[stat.role].map((staffMember) => (
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
                                                    <TableCell>
                                                      <div className="flex items-center gap-2">
                                                        <div className="flex items-center gap-2 border rounded-md px-2 py-1">
                                                          <span className={`text-xs font-medium ${staffMember.status === 'active' ? 'text-green-600' : 'text-gray-500'}`}>
                                                            {staffMember.status === 'active' ? 'Active' : 'Inactive'}
                                                          </span>
                                                          <Switch
                                                            checked={staffMember.status === 'active'}
                                                            onCheckedChange={() => handleToggleStatus(staffMember)}
                                                            className="data-[state=checked]:bg-green-600 data-[state=unchecked]:bg-gray-300"
                                                          />
                                                        </div>
                                                        <Button
                                                          variant="outline"
                                                          size="sm"
                                                          className="h-8 w-8 p-0 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/20"
                                                          onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDeleteStaff(staffMember._id);
                                                          }}
                                                          title="Delete staff member"
                                                        >
                                                          <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                      </div>
                                                    </TableCell>
                                                  </TableRow>
                                                ))}
                                              </TableBody>
                                            </Table>
                                          </div>
                                        </motion.div>
                                      )}
                                    </CardContent>
                                  </Card>
                                </motion.div>
                              );
                            })}
                          </div>
                          
                          {/* Total Staff Summary */}
                          {staff && (
                            <Card className="border dark:border-gray-800">
                              <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <h3 className="text-lg font-semibold">Total Staff Summary</h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                      {staff.length} staff members across {roleStatistics.length} departments
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-6">
                                    <div className="text-right">
                                      <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                                        {staff.filter(s => s.status === 'active').length}
                                      </p>
                                      <p className="text-sm text-green-600 dark:text-green-400">Active Staff</p>
                                    </div>
                                    <div className="text-right">
                                      <p className="text-2xl font-bold text-gray-600 dark:text-gray-400">
                                        {staff.filter(s => s.status === 'inactive').length}
                                      </p>
                                      <p className="text-sm text-gray-600 dark:text-gray-400">Inactive Staff</p>
                                    </div>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          )}
                        </div>
                      )}
                      
                      {/* Table View */}
                      {roleView === 'table' && (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300">
                                Total: {filteredStaff.length} staff
                              </Badge>
                              {selectedRole !== 'all' && (
                                <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300">
                                  Role: {formatRole(selectedRole)}
                                </Badge>
                              )}
                              {statusFilter !== 'all' && (
                                <Badge variant="outline" className={`${
                                  statusFilter === 'active' 
                                    ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300'
                                    : 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300'
                                }`}>
                                  Status: {statusFilter === 'active' ? 'Active' : 'Inactive'}
                                </Badge>
                              )}
                            </div>
                            {(selectedRole !== 'all' || statusFilter !== 'all') && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedRole('all');
                                  setStatusFilter('all');
                                }}
                                className="h-8 px-2 text-xs"
                              >
                                <X className="h-3 w-3 mr-1" />
                                Clear Filters
                              </Button>
                            )}
                          </div>

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
                                  <TableHead className="w-[160px]">Actions</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {filteredStaff.length > 0 ? (
                                  filteredStaff.map((staffMember) => {
                                    const Icon = roleIcons[staffMember.role as keyof typeof roleIcons] || roleIcons.default;
                                    const roleColor = roleColors[staffMember.role as keyof typeof roleColors] || "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700";
                                    
                                    return (
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
                                          <div className="flex items-center gap-2">
                                            <div className={`p-1 rounded ${roleColor.split(' ')[0]} ${roleColor.split(' ')[1]}`}>
                                              <Icon className="h-3 w-3" />
                                            </div>
                                            <Badge 
                                              variant="outline" 
                                              className={roleColor}
                                            >
                                              {formatRole(staffMember.role)}
                                            </Badge>
                                          </div>
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
                                        <TableCell>
                                          <div className="flex items-center gap-2">
                                            <div className="flex items-center gap-2 border rounded-md px-2 py-1">
                                              <span className={`text-xs font-medium ${staffMember.status === 'active' ? 'text-green-600' : 'text-gray-500'}`}>
                                                {staffMember.status === 'active' ? 'Active' : 'Inactive'}
                                              </span>
                                              <Switch
                                                checked={staffMember.status === 'active'}
                                                onCheckedChange={() => handleToggleStatus(staffMember)}
                                                className="data-[state=checked]:bg-green-600 data-[state=unchecked]:bg-gray-300"
                                              />
                                            </div>
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              className="h-8 w-8 p-0 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/20"
                                              onClick={() => handleDeleteStaff(staffMember._id)}
                                              title="Delete staff member"
                                            >
                                              <Trash2 className="h-4 w-4" />
                                            </Button>
                                          </div>
                                        </TableCell>
                                      </TableRow>
                                    );
                                  })
                                ) : (
                                  <TableRow>
                                    <TableCell colSpan={8} className="text-center py-8">
                                      <div className="flex flex-col items-center justify-center">
                                        <Users className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-4" />
                                        <p className="text-gray-700 dark:text-gray-300 font-medium">No staff members found</p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mt-1">
                                          {selectedRole !== 'all' || statusFilter !== 'all'
                                            ? 'Try adjusting your filter criteria'
                                            : 'No staff members available to display'}
                                        </p>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                )}
                              </TableBody>
                            </Table>
                          </div>
                          
                          {/* Role Summary */}
                          {staff && staff.length > 0 && (
                            <Card className="border dark:border-gray-800">
                              <CardContent className="p-4">
                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                  {roleStatistics.map((stat) => (
                                    <div key={stat.role} className="text-center p-3 rounded-lg border dark:border-gray-800">
                                      <div className="flex flex-col items-center">
                                        <div className={`p-2 rounded-full ${stat.color.split(' ')[0]} ${stat.color.split(' ')[1]} mb-2`}>
                                          <stat.Icon className="h-4 w-4" />
                                        </div>
                                        <p className="text-sm font-medium">{formatRole(stat.role)}</p>
                                        <p className="text-2xl font-bold">{stat.count}</p>
                                        <div className="flex gap-2 mt-1 text-xs">
                                          <span className="text-green-600 dark:text-green-400">{stat.activeCount} active</span>
                                          <span className="text-gray-500 dark:text-gray-400">{stat.inactiveCount} inactive</span>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </CardContent>
                            </Card>
                          )}
                        </div>
                      )}
                      
                      {(!staff || staff.length === 0) && (
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

                {/* Staff Schedule section */}
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.4, delay: 0.3 }}
                >
                  <Card className="border dark:border-gray-800">
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Clock className="h-5 w-5 mr-2 text-violet-500" />
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
                            <Clock className="h-8 w-8 text-gray-400" />
                          </div>
                          <p className="text-gray-700 dark:text-gray-300 font-medium">No staff schedule data</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mt-1">
                            There are no staff schedules available to display
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Employee Performance Ranking section
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
                </motion.div> */}
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
