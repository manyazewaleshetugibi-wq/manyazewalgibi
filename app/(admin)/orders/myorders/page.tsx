"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import * as XLSX from "xlsx";
import {
  Download,
  TrendingUp,
  DollarSign,
  Users,
  ShoppingBag,
  Clock,
  Filter,
  RefreshCw,
  Loader2,
  AlertCircle,
  Eye,
  User,
  CreditCard,
  ArrowDownIcon,
  Utensils,
  CalendarDays,
  Star,
  X,
  MoreHorizontal,
  Grid,
  List,
  Search,
  CheckCircle,
  XCircle,
  Coffee,
  Truck,
  ThumbsUp,
  ChefHat,
  Phone,
  MapPin,
  Receipt,
  Smartphone,
} from 'lucide-react';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

// Types (keep all your existing types here)
interface OrderItem {
  id?: string;
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  specialInstructions?: string;
  total: number;
}

interface Order {
  _id: string;
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: number;
  finalAmount: number;
  tax: number;
  discount: number;
  numberOfGuests: number;
  tableNumber: string;
  customerName: string;
  notes: string;
  specialRequirements?: string;
  createdAt: string;
  updatedAt: string;
  orderItems: OrderItem[];
  items?: OrderItem[];
  paymentStatus: string;
  paymentMethod: string;
  waiterId: string;
  waiterInfo?: {
    id: string;
    name: string;
    role: string;
    shift?: string;
    phone?: string;
  };
  delivery?: boolean;
  deliveryInfo?: {
    fullName: string;
    phoneNumber: string;
    address: string;
    city: string;
  };
  paymentScreenshotUrl?: string;
}

interface Waitress {
  _id: string;
  name: string;
  shift: string;
  phone?: string;
  email?: string;
}

interface Item {
  _id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  categoryId: string;
}

interface ReportSummary {
  totalOrders: number;
  totalSales: number;
  totalTax: number;
  totalDiscount: number;
  totalItems: number;
  totalGuests: number;
  averageOrderValue: number;
}

interface TopItem {
  id: string;
  name: string;
  quantity: number;
  revenue: number;
}

interface DailySales {
  date: string;
  total: number;
  orders: number;
  averageOrderValue: number;
}

type OrderStatus = "PENDING" | "CONFIRMED" | "PREPARING" | "PICKUP" | "SERVED" | "COMPLETED" | "CANCELLED";

const statusOptions: OrderStatus[] = ["PENDING", "CONFIRMED", "PREPARING", "PICKUP", "SERVED", "COMPLETED", "CANCELLED"];

const statusIcons: Record<OrderStatus, React.ReactNode> = {
  PENDING: <Clock className="h-4 w-4" />,
  CONFIRMED: <ThumbsUp className="h-4 w-4" />,
  PREPARING: <ChefHat className="h-4 w-4" />,
  PICKUP: <Truck className="h-4 w-4" />,
  SERVED: <Coffee className="h-4 w-4" />,
  COMPLETED: <CheckCircle className="h-4 w-4" />,
  CANCELLED: <XCircle className="h-4 w-4" />,
};

// Helper functions (keep all your existing helper functions)
const getStatusColor = (status: string) => {
  switch (status?.toUpperCase()) {
    case 'COMPLETED':
      return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400';
    case 'PENDING':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400';
    case 'CANCELLED':
      return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400';
    case 'CONFIRMED':
      return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400';
    case 'PREPARING':
      return 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400';
    case 'SERVED':
      return 'bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400';
    case 'PICKUP':
      return 'bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-400';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-400';
  }
};

const getPaymentMethodIcon = (method: string) => {
  switch (method?.toUpperCase()) {
    case 'CASH':
      return <DollarSign className="h-4 w-4" />;
    case 'CARD':
      return <CreditCard className="h-4 w-4" />;
    case 'MOBILE':
    case 'MPESA':
      return <Smartphone className="h-4 w-4" />;
    default:
      return <DollarSign className="h-4 w-4" />;
  }
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-ET', {
    style: 'currency',
    currency: 'ETB',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

const formatNumber = (num: number) => {
  return new Intl.NumberFormat('en-US').format(num);
};

// Export to Excel function
function exportToExcel(data: any[], filename: string) {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Sales Data");
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

// Date range helper
function getDateRange(type: 'today' | 'yesterday' | 'week' | 'month' | 'custom') {
  const now = new Date();
  let start = new Date();
  let end = new Date();

  switch (type) {
    case 'today':
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'yesterday':
      const yesterday = subDays(now, 1);
      start = new Date(yesterday.setHours(0, 0, 0, 0));
      end = new Date(yesterday.setHours(23, 59, 59, 999));
      break;
    case 'week':
      start = startOfWeek(now, { weekStartsOn: 1 });
      end = endOfWeek(now, { weekStartsOn: 1 });
      break;
    case 'month':
      start = startOfMonth(now);
      end = endOfMonth(now);
      break;
  }

  return { start, end };
}

// Order Card Component
const OrderCard = ({ 
  order, 
  waitress,
  onViewDetails,
}: { 
  order: Order; 
  waitress?: Waitress;
  onViewDetails: () => void;
}) => {
  return (
    <Card className="hover:shadow-lg transition-shadow duration-300">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg font-bold">Order #{order.orderNumber}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {new Date(order.createdAt).toLocaleDateString()} • {new Date(order.createdAt).toLocaleTimeString()}
            </p>
          </div>
          <Badge className={getStatusColor(order.status)}>
            {statusIcons[order.status as OrderStatus]} {order.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {order.delivery ? (
          <div className="flex items-center space-x-4">
            <Avatar>
              <AvatarFallback><Truck className="h-4 w-4" /></AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{order.deliveryInfo?.fullName || "Delivery"}</p>
              <p className="text-sm text-muted-foreground">{order.deliveryInfo?.phoneNumber || "No Phone"}</p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center space-x-4">
              <Avatar>
                <AvatarImage src="/placeholder-avatar.jpg" />
                <AvatarFallback>{waitress?.name?.charAt(0) || "W"}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{waitress?.name || "Unknown Waitress"}</p>
                <p className="text-sm text-muted-foreground">{waitress?.shift || "Unknown"} Shift</p>
              </div>
            </div>
            {waitress?.phone && (
              <div className="flex items-center text-sm">
                <Phone className="mr-2 h-4 w-4 text-muted-foreground" />
                <span>{waitress.phone}</span>
              </div>
            )}
          </div>
        )}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex items-center">
            <MapPin className="mr-2 h-4 w-4 text-muted-foreground" />
            <span>Table {order.tableNumber || 'N/A'}</span>
          </div>
          <div className="flex items-center">
            <Users className="mr-2 h-4 w-4 text-muted-foreground" />
            <span>{order.numberOfGuests || 1} guests</span>
          </div>
          <div className="flex items-center">
            <ShoppingBag className="mr-2 h-4 w-4 text-muted-foreground" />
            <span>{(order.orderItems || []).length} items</span>
          </div>
          <div className="flex items-center">
            <DollarSign className="mr-2 h-4 w-4 text-muted-foreground" />
            <span className="font-semibold">{formatCurrency(order.finalAmount || 0)}</span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="justify-between pt-2 border-t">
        <Button variant="ghost" size="sm" onClick={onViewDetails}>
          <Eye className="h-4 w-4 mr-2" />
          View
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={onViewDetails}>
              <Eye className="h-4 w-4 mr-2" />
              View Details
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardFooter>
    </Card>
  );
};

// Sales Chart Component
const SalesChart = ({ data, type = "line" }: { data: DailySales[], type?: "line" | "bar" }) => {
  const chartData = data.map(day => ({
    name: new Date(day.date).toLocaleDateString(),
    total: day.total,
    date: day.date,
  }));

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
            tickFormatter={(value) => `${value} BIRR`}
          />
          <Tooltip
            contentStyle={{ background: "#333", border: "none", borderRadius: "8px" }}
            labelStyle={{ color: "#fff" }}
            itemStyle={{ color: "#adfa1d" }}
            formatter={(value) => [`${value} BIRR`, "Sales"]}
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
            tickFormatter={(value) => `${value} BIRR`}
          />
          <Tooltip
            contentStyle={{ background: "#333", border: "none", borderRadius: "8px" }}
            labelStyle={{ color: "#fff" }}
            itemStyle={{ color: "#adfa1d" }}
            formatter={(value) => [`${value} BIRR`, "Sales"]}
          />
          <Legend />
          <Bar dataKey="total" fill="#adfa1d" radius={[4, 4, 0, 0]} name="Sales" />
        </BarChart>
      )}
    </ResponsiveContainer>
  );
};

export default function WaiterReportPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const initialFetchDone = useRef(false);
  const waitressFetched = useRef(false);

  // State
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [currentWaitress, setCurrentWaitress] = useState<Waitress | null>(null);
  const [dateRange, setDateRange] = useState<{ start: Date | null; end: Date | null }>({ start: null, end: null });
  const [filterType, setFilterType] = useState<'today' | 'yesterday' | 'week' | 'month' | 'custom'>('today');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "grid">("grid");
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [chartType, setChartType] = useState<"line" | "bar">("line");
  const [sortBy, setSortBy] = useState<keyof Order>("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;
  
  // Detail view state
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedItems, setSelectedItems] = useState<Record<string, Item>>({});
  
  // Summary stats from API
  const [summary, setSummary] = useState<ReportSummary>({
    totalOrders: 0,
    totalSales: 0,
    totalTax: 0,
    totalDiscount: 0,
    totalItems: 0,
    totalGuests: 0,
    averageOrderValue: 0,
  });
  
  const [statusBreakdown, setStatusBreakdown] = useState<Record<string, { count: number; total: number }>>({});
  const [paymentBreakdown, setPaymentBreakdown] = useState<Record<string, { count: number; total: number }>>({});
  const [topItems, setTopItems] = useState<TopItem[]>([]);
  const [dailySales, setDailySales] = useState<DailySales[]>([]);

  // Fetch current waitress - only once
  useEffect(() => {
    if (status === 'authenticated' && session?.user?.email && !waitressFetched.current) {
      waitressFetched.current = true;
      fetchCurrentWaitress();
    }
  }, [status, session]);

  const fetchCurrentWaitress = useCallback(async () => {
    if (!session?.user?.email) return null;
    
    try {
      const response = await fetch("/api/waitress");
      if (!response.ok) throw new Error("Failed to fetch waitresses");
      const data = await response.json();
      
      // Find the waitress that matches the logged-in user's email
      const waitress = (data || []).find((w: Waitress) => 
        w.email?.toLowerCase() === session.user?.email?.toLowerCase()
      );
      
      setCurrentWaitress(waitress || null);
      
      if (!waitress) {
        console.warn("No waitress profile found for user:", session.user?.email);
        setIsLoading(false);
      }
      
      return waitress;
    } catch (error) {
      console.error("Error fetching current waitress:", error);
      setIsLoading(false);
      return null;
    }
  }, [session?.user?.email]);

  // Fetch reports - only when filterType changes and we have waitress
  useEffect(() => {
    if (currentWaitress?._id && !initialFetchDone.current) {
      initialFetchDone.current = true;
      fetchReports(currentWaitress._id);
    }
  }, [currentWaitress]);

  // Separate effect for filterType changes
  useEffect(() => {
    if (currentWaitress?._id && initialFetchDone.current) {
      fetchReports(currentWaitress._id);
    }
  }, [filterType]);

  const fetchReports = useCallback(async (waiterId: string) => {
    try {
      setIsLoading(true);
      setApiError(null);

      // Build query params
      const params = new URLSearchParams();
      
      // Set date range based on selection
      if (filterType === 'today') {
        const today = new Date();
        params.append('startDate', format(today, 'yyyy-MM-dd'));
        params.append('endDate', format(today, 'yyyy-MM-dd'));
      } else if (filterType === 'yesterday') {
        const yesterday = subDays(new Date(), 1);
        params.append('startDate', format(yesterday, 'yyyy-MM-dd'));
        params.append('endDate', format(yesterday, 'yyyy-MM-dd'));
      } else if (filterType === 'week') {
        const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
        const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
        params.append('startDate', format(weekStart, 'yyyy-MM-dd'));
        params.append('endDate', format(weekEnd, 'yyyy-MM-dd'));
      } else if (filterType === 'month') {
        const monthStart = startOfMonth(new Date());
        const monthEnd = endOfMonth(new Date());
        params.append('startDate', format(monthStart, 'yyyy-MM-dd'));
        params.append('endDate', format(monthEnd, 'yyyy-MM-dd'));
      }

      // Add waiterId filter
      params.append('waiterId', waiterId);

      // Fetch reports from the waiterreport endpoint
      const response = await fetch(`/api/order/waiterreport?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || `Server error: ${response.status}`);
      }

      if (data.success) {
        setOrders(data.orders || []);
        setSummary(data.summary || {
          totalOrders: 0,
          totalSales: 0,
          totalTax: 0,
          totalDiscount: 0,
          totalItems: 0,
          totalGuests: 0,
          averageOrderValue: 0,
        });
        setStatusBreakdown(data.breakdown?.byStatus || {});
        setPaymentBreakdown(data.breakdown?.byPayment || {});
        setTopItems(data.topItems || []);
        setDailySales(data.dailySales || []);
        
        // Set date range from response or calculate
        const { start, end } = getDateRange(filterType);
        setDateRange({ start, end });
      } else {
        throw new Error(data.error || 'Failed to fetch reports');
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch reports';
      setApiError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [filterType]);

  // Apply client-side filtering - use debounce for search
  useEffect(() => {
    if (orders.length > 0) {
      const timer = setTimeout(() => {
        applyFilters();
      }, 300); // Debounce search
      
      return () => clearTimeout(timer);
    }
  }, [orders, dateRange, selectedStatus, selectedPaymentMethod, searchTerm, sortBy, sortOrder]);

  const applyFilters = useCallback(() => {
    let filtered = [...orders];

    // Filter by date range (client-side for custom ranges)
    if (dateRange.start && dateRange.end && filterType === 'custom') {
      filtered = filtered.filter(order => {
        const orderDate = new Date(order.createdAt);
        return orderDate >= dateRange.start! && orderDate <= dateRange.end!;
      });
    }

    // Filter by status (client-side in addition to server filter)
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(order => 
        order.status?.toUpperCase() === selectedStatus.toUpperCase()
      );
    }

    // Filter by payment method (client-side in addition to server filter)
    if (selectedPaymentMethod !== 'all') {
      filtered = filtered.filter(order => 
        order.paymentMethod?.toUpperCase() === selectedPaymentMethod.toUpperCase()
      );
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(order => 
        order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.tableNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customerName?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      const aVal = a[sortBy];
      const bVal = b[sortBy];
      
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortOrder === 'asc' 
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
      }
      
      // Handle date comparison
      if (sortBy === 'createdAt' || sortBy === 'updatedAt') {
        const aDate = new Date(a[sortBy] as string).getTime();
        const bDate = new Date(b[sortBy] as string).getTime();
        return sortOrder === 'asc' ? aDate - bDate : bDate - aDate;
      }
      
      return 0;
    });

    setFilteredOrders(filtered);
    setCurrentPage(1);
  }, [orders, dateRange, filterType, selectedStatus, selectedPaymentMethod, searchTerm, sortBy, sortOrder]);

  const handleFilterChange = (type: 'today' | 'yesterday' | 'week' | 'month' | 'custom', customStart?: Date, customEnd?: Date) => {
    setFilterType(type);
    
    if (type === 'custom' && customStart && customEnd) {
      setDateRange({ start: customStart, end: customEnd });
    } else if (type !== 'custom') {
      const { start, end } = getDateRange(type);
      setDateRange({ start, end });
    }
  };

  const handleSort = (field: keyof Order) => {
    const order = field === sortBy && sortOrder === "asc" ? "desc" : "asc";
    setSortBy(field);
    setSortOrder(order);
  };

  const handleExport = (section: 'overview' | 'analytics') => {
    const data = section === 'overview' ? filteredOrders : filteredOrders;
    const filename = section === 'overview' 
      ? `waiter_sales_overview_${format(new Date(), 'yyyy-MM-dd')}`
      : `waiter_sales_analytics_${format(new Date(), 'yyyy-MM-dd')}`;
    
    const exportData = data.map(order => ({
      'Order Number': order.orderNumber,
      'Table Number': order.tableNumber || 'N/A',
      'Customer': order.customerName || 'Walk-in',
      'Total Amount': order.totalAmount || 0,
      'Discount': order.discount || 0,
      'Tax': order.tax || 0,
      'Final Amount': order.finalAmount || 0,
      'Status': order.status || 'PENDING',
      'Payment Method': order.paymentMethod || 'CASH',
      'Number of Guests': order.numberOfGuests || 1,
      'Items Count': order.orderItems?.length || 0,
      'Created Date': new Date(order.createdAt).toLocaleDateString(),
      'Created Time': new Date(order.createdAt).toLocaleTimeString(),
    }));
    
    exportToExcel(exportData, filename);
  };

  const handleViewDetails = async (order: Order) => {
    setSelectedOrder(order);
    
    // Fetch item details
    const items = order.orderItems || order.items || [];
    const itemDetails: Record<string, Item> = {};
    
    for (const item of items) {
      const itemId = item.menuItemId || item.id;
      
      if (itemId) {
        try {
          const response = await fetch(`/api/items/${itemId}`);
          const data = await response.json();
          
          if (data.success && data.item) {
            itemDetails[itemId] = data.item;
          } else if (item.name) {
            itemDetails[itemId] = {
              _id: itemId,
              name: item.name,
              description: '',
              price: item.price || 0,
              imageUrl: '',
              categoryId: '',
            } as Item;
          }
        } catch (error) {
          console.error(`Error fetching item ${itemId}:`, error);
          if (item.name) {
            itemDetails[itemId] = {
              _id: itemId,
              name: item.name,
              description: '',
              price: item.price || 0,
              imageUrl: '',
              categoryId: '',
            } as Item;
          }
        }
      }
    }
    
    setSelectedItems(itemDetails);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedStatus("all");
    setSelectedPaymentMethod("all");
    setFilterType("today");
    const { start, end } = getDateRange("today");
    setDateRange({ start, end });
  };

  const handleRefresh = () => {
    if (currentWaitress?._id) {
      fetchReports(currentWaitress._id);
    }
  };

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          <p className="mt-2">Loading session...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    router.push('/login');
    return null;
  }

  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="flex-col md:flex">
      <div className="flex-1 space-y-4 p-8 pt-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">My Orders</h1>
            <p className="text-muted-foreground">
              {currentWaitress?.name || session.user?.name || 'Waitress'} • {session.user?.email}
            </p>
            {currentWaitress && (
              <p className="text-sm text-muted-foreground mt-1">
                Waitress ID: {currentWaitress._id} • {currentWaitress.shift} Shift • {currentWaitress.phone || 'No phone'}
              </p>
            )}
          </div>
          <Button 
            onClick={handleRefresh} 
            variant="outline" 
            size="sm" 
            disabled={isLoading}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {!currentWaitress && !isLoading && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No waitress profile found for your account. Please contact an administrator.
            </AlertDescription>
          </Alert>
        )}

        {apiError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{apiError}</AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="overview" className="space-y-4" onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            {/* Date Filter */}
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
                      variant={filterType === 'yesterday' ? "default" : "outline"}
                      onClick={() => handleFilterChange('yesterday')}
                    >
                      Yesterday
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
                  
                  <Button onClick={() => handleExport('overview')} variant="outline" size="sm" disabled={filteredOrders.length === 0}>
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
                          const start = e.target.value ? new Date(e.target.value) : null;
                          if (start && dateRange.end) {
                            handleFilterChange('custom', start, dateRange.end);
                          }
                        }}
                      />
                    </div>
                    <div>
                      <Label>End Date</Label>
                      <Input
                        type="date"
                        value={dateRange.end?.toISOString().split('T')[0] || ''}
                        onChange={(e) => {
                          const end = e.target.value ? new Date(e.target.value) : null;
                          if (end && dateRange.start) {
                            handleFilterChange('custom', dateRange.start, end);
                          }
                        }}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Status and Payment Filters */}
            <Card>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="search">Search</Label>
                    <div className="relative mt-1">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="search"
                        placeholder="Order #, Table..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="status-filter">Order Status</Label>
                    <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                      <SelectTrigger id="status-filter" className="mt-1">
                        <Clock className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="All Statuses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        {statusOptions.map((status) => (
                          <SelectItem key={status} value={status}>
                            <div className="flex items-center">
                              {statusIcons[status]}
                              <span className="ml-2">{status}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="payment-filter">Payment Method</Label>
                    <Select value={selectedPaymentMethod} onValueChange={setSelectedPaymentMethod}>
                      <SelectTrigger id="payment-filter" className="mt-1">
                        <CreditCard className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="All Methods" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Methods</SelectItem>
                        <SelectItem value="CASH">Cash</SelectItem>
                        <SelectItem value="CARD">Card</SelectItem>
                        <SelectItem value="MOBILE">Mobile Money</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex justify-end mt-4">
                  <Button onClick={clearFilters} variant="outline" size="sm">
                    <X className="h-4 w-4 mr-2" />
                    Clear Filters
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* View Mode Toggle */}
            <div className="flex justify-end">
              <div className="flex items-center gap-2 border rounded-lg p-1">
                <Button
                  variant={viewMode === "grid" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("grid")}
                  className="h-8 w-8 p-0"
                >
                  <Grid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                  className="h-8 w-8 p-0"
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {isLoading ? (
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  {[...Array(4)].map((_, i) => (
                    <Skeleton key={i} className="h-[125px] w-full" />
                  ))}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[...Array(6)].map((_, i) => (
                    <Skeleton key={i} className="h-[250px] w-full" />
                  ))}
                </div>
              </div>
            ) : (
              <>
                {/* Metrics Cards */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{formatCurrency(summary.totalSales)}</div>
                      <p className="text-xs text-muted-foreground">{summary.totalOrders} orders</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Average Order</CardTitle>
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{formatCurrency(summary.averageOrderValue)}</div>
                      <p className="text-xs text-muted-foreground">per transaction</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Items</CardTitle>
                      <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{formatNumber(summary.totalItems)}</div>
                      <p className="text-xs text-muted-foreground">items sold</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Guests</CardTitle>
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{formatNumber(summary.totalGuests)}</div>
                      <p className="text-xs text-muted-foreground">customers served</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Orders Display */}
                {viewMode === "grid" ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {paginatedOrders.map((order) => (
                      <OrderCard
                        key={order._id || order.id}
                        order={order}
                        waitress={currentWaitress || undefined}
                        onViewDetails={() => handleViewDetails(order)}
                      />
                    ))}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="cursor-pointer" onClick={() => handleSort("orderNumber")}>
                              Order #
                              {sortBy === "orderNumber" && (sortOrder === "asc" ? " ↑" : " ↓")}
                            </TableHead>
                            <TableHead className="cursor-pointer" onClick={() => handleSort("tableNumber")}>
                              Table
                              {sortBy === "tableNumber" && (sortOrder === "asc" ? " ↑" : " ↓")}
                            </TableHead>
                            <TableHead className="cursor-pointer" onClick={() => handleSort("finalAmount")}>
                              Amount
                              {sortBy === "finalAmount" && (sortOrder === "asc" ? " ↑" : " ↓")}
                            </TableHead>
                            <TableHead className="cursor-pointer" onClick={() => handleSort("status")}>
                              Status
                              {sortBy === "status" && (sortOrder === "asc" ? " ↑" : " ↓")}
                            </TableHead>
                            <TableHead>Payment</TableHead>
                            <TableHead>Items</TableHead>
                            <TableHead className="cursor-pointer" onClick={() => handleSort("createdAt")}>
                              Date
                              {sortBy === "createdAt" && (sortOrder === "asc" ? " ↑" : " ↓")}
                            </TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paginatedOrders.map((order) => (
                            <TableRow key={order._id || order.id}>
                              <TableCell className="font-medium">{order.orderNumber}</TableCell>
                              <TableCell>{order.tableNumber || 'N/A'}</TableCell>
                              <TableCell>{formatCurrency(order.finalAmount || 0)}</TableCell>
                              <TableCell>
                                <Badge className={getStatusColor(order.status)}>
                                  {statusIcons[order.status as OrderStatus]} {order.status}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  {getPaymentMethodIcon(order.paymentMethod || 'CASH')}
                                  <span>{order.paymentMethod || 'CASH'}</span>
                                </div>
                              </TableCell>
                              <TableCell>{order.orderItems?.length || 0}</TableCell>
                              <TableCell>{new Date(order.createdAt).toLocaleDateString()}</TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-1">
                                  <Button variant="ghost" size="icon" onClick={() => handleViewDetails(order)}>
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon">
                                        <MoreHorizontal className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem onSelect={() => handleViewDetails(order)}>
                                        <Eye className="h-4 w-4 mr-2" />
                                        View Details
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                          className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                      {[...Array(totalPages)].map((_, i) => (
                        <PaginationItem key={i}>
                          <PaginationLink
                            onClick={() => setCurrentPage(i + 1)}
                            isActive={currentPage === i + 1}
                          >
                            {i + 1}
                          </PaginationLink>
                        </PaginationItem>
                      ))}
                      <PaginationItem>
                        <PaginationNext
                          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                          className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                )}
              </>
            )}
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-4">
            {/* Metrics Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(summary.totalSales)}</div>
                  <p className="text-xs text-muted-foreground">{summary.totalOrders} orders</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Average Order</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(summary.averageOrderValue)}</div>
                  <p className="text-xs text-muted-foreground">per transaction</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Items</CardTitle>
                  <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatNumber(summary.totalItems)}</div>
                  <p className="text-xs text-muted-foreground">items sold</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Guests</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatNumber(summary.totalGuests)}</div>
                  <p className="text-xs text-muted-foreground">customers served</p>
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
                  {dailySales.length > 0 ? (
                    <SalesChart data={dailySales} type={chartType} />
                  ) : (
                    <div className="h-[350px] flex items-center justify-center">
                      <p className="text-muted-foreground">No sales data available</p>
                    </div>
                  )}
                </CardContent>
              </Card>
              <Card className="col-span-3">
                <CardHeader>
                  <CardTitle>Recent Sales</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[350px]">
                    <div className="space-y-4">
                      {filteredOrders.slice(0, 10).map((order) => (
                        <div className="flex items-center justify-between" key={order._id || order.id}>
                          <div>
                            <p className="text-sm font-medium leading-none">{order.orderNumber}</p>
                            <p className="text-sm text-muted-foreground">
                              Table {order.tableNumber || 'N/A'} • {new Date(order.createdAt).toLocaleTimeString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="font-medium">{formatCurrency(order.finalAmount || 0)}</div>
                            <Badge variant="secondary" className="text-xs">
                              {order.status || 'PENDING'}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>

            {/* Status and Payment Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Orders by Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(statusBreakdown).map(([status, data]) => (
                      <div key={status} className="flex items-center justify-between">
                        <Badge className={getStatusColor(status)}>
                          {status}
                        </Badge>
                        <div className="flex items-center gap-4">
                          <span className="font-medium">{data.count}</span>
                          <span className="text-muted-foreground w-24">
                            {formatCurrency(data.total)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Payment Methods</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(paymentBreakdown).map(([method, data]) => (
                      <div key={method} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getPaymentMethodIcon(method)}
                          <span>{method}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="font-medium">{data.count}</span>
                          <span className="text-muted-foreground w-24">
                            {formatCurrency(data.total)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Top Items */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-yellow-500" />
                  Top Selling Items
                </CardTitle>
              </CardHeader>
              <CardContent>
                {topItems.length > 0 ? (
                  <div className="space-y-4">
                    {topItems.map((item, index) => (
                      <div key={item.id || index} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium text-muted-foreground w-6">
                            #{index + 1}
                          </span>
                          <div>
                            <p className="font-medium">{item.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {item.quantity} units sold
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{formatCurrency(item.revenue)}</p>
                          <p className="text-xs text-muted-foreground">
                            {((item.revenue / summary.totalSales) * 100 || 0).toFixed(1)}% of sales
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <ShoppingBag className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No item data available</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Export Button */}
            <div className="flex justify-end">
              <Button onClick={() => handleExport('analytics')} variant="outline" disabled={filteredOrders.length === 0}>
                <Download className="mr-2 h-4 w-4" />
                Export Analytics
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        {/* Summary Footer */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
              <div>
                <p className="text-sm text-muted-foreground">Total Orders</p>
                <p className="text-xl font-bold">{summary.totalOrders}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Sales</p>
                <p className="text-xl font-bold text-primary">{formatCurrency(summary.totalSales)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Tax</p>
                <p className="text-xl font-bold">{formatCurrency(summary.totalTax)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Discount</p>
                <p className="text-xl font-bold text-red-600 dark:text-red-400">{formatCurrency(summary.totalDiscount)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg Order</p>
                <p className="text-xl font-bold">{formatCurrency(summary.averageOrderValue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Order Details Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center">
              <Receipt className="mr-2 h-6 w-6" />
              Order Details
            </DialogTitle>
            <DialogDescription>
              Order #{selectedOrder?.orderNumber} - {selectedOrder && new Date(selectedOrder.createdAt).toLocaleString()}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh] pr-4">
            {selectedOrder && (
              <div className="space-y-6">
                {currentWaitress && (
                  <>
                    <div className="flex items-center space-x-4">
                      <Avatar className="h-16 w-16">
                        <AvatarImage src="/placeholder-user.jpg" alt={currentWaitress?.name || "Waitress"} />
                        <AvatarFallback>
                          {currentWaitress?.name
                            ? currentWaitress.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                            : "W"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="text-lg font-semibold">{currentWaitress?.name || "Unknown"}</h3>
                        <p className="text-sm text-muted-foreground">{currentWaitress?.phone || "No phone number"}</p>
                        <Badge variant="outline" className="mt-1">
                          {currentWaitress?.shift || "Unknown"} Shift
                        </Badge>
                      </div>
                    </div>
                    <Separator />
                  </>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium flex items-center">
                      <ShoppingBag className="mr-2 h-4 w-4" /> Order Number
                    </h4>
                    <p>{selectedOrder.orderNumber}</p>
                  </div>
                  <div>
                    <h4 className="font-medium flex items-center">
                      <Utensils className="mr-2 h-4 w-4" /> Table Number
                    </h4>
                    <p>{selectedOrder.tableNumber || 'N/A'}</p>
                  </div>
                  <div>
                    <h4 className="font-medium flex items-center">
                      <Users className="mr-2 h-4 w-4" /> Number of Guests
                    </h4>
                    <p>{selectedOrder.numberOfGuests || 1}</p>
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
                    <Utensils className="mr-2 h-4 w-4" /> Order Items
                  </h4>
                  <div className="rounded-md border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item</TableHead>
                          <TableHead className="text-center">Quantity</TableHead>
                          <TableHead className="text-right">Unit Price</TableHead>
                          <TableHead className="text-right">Subtotal</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(selectedOrder.orderItems || selectedOrder.items || []).map((item, index) => {
                          const itemDetails = selectedItems[item.menuItemId || item.id || ''];
                          const itemName = itemDetails?.name || item.name || 'Unknown Item';
                          const unitPrice = item.price || 0;
                          const subtotal = item.total || (unitPrice * item.quantity);
                          
                          return (
                            <TableRow key={index}>
                              <TableCell>
                                <div className="flex items-center space-x-3">
                                  <Avatar className="h-10 w-10">
                                    <AvatarImage 
                                      src={itemDetails?.imageUrl || "/placeholder.svg"} 
                                      alt={itemName} 
                                    />
                                    <AvatarFallback>
                                      {itemName.charAt(0).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <p className="font-medium">{itemName}</p>
                                    {item.specialInstructions && (
                                      <p className="text-xs text-muted-foreground">
                                        Note: {item.specialInstructions}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="text-center">{item.quantity}</TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(unitPrice)}
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                {formatCurrency(subtotal)}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium flex items-center">
                      <DollarSign className="mr-2 h-4 w-4" /> Total Amount
                    </h4>
                    <p>{formatCurrency(selectedOrder.totalAmount || 0)}</p>
                  </div>
                  <div>
                    <h4 className="font-medium flex items-center">
                      <ArrowDownIcon className="mr-2 h-4 w-4" /> Discount
                    </h4>
                    <p className="text-red-600 dark:text-red-400">-{formatCurrency(selectedOrder.discount || 0)}</p>
                  </div>
                  <div>
                    <h4 className="font-medium flex items-center">
                      <TrendingUp className="mr-2 h-4 w-4" /> Tax
                    </h4>
                    <p>{formatCurrency(selectedOrder.tax || 0)}</p>
                  </div>
                  <div>
                    <h4 className="font-medium flex items-center">
                      <DollarSign className="mr-2 h-4 w-4" /> Final Amount
                    </h4>
                    <p className="text-lg font-bold text-primary">{formatCurrency(selectedOrder.finalAmount || 0)}</p>
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium flex items-center">
                      <CreditCard className="mr-2 h-4 w-4" /> Payment Method
                    </h4>
                    <Badge variant="outline" className="mt-1">
                      {getPaymentMethodIcon(selectedOrder.paymentMethod || 'CASH')}
                      <span className="ml-1">{selectedOrder.paymentMethod || 'CASH'}</span>
                    </Badge>
                  </div>
                  <div>
                    <h4 className="font-medium flex items-center">
                      <CalendarDays className="mr-2 h-4 w-4" /> Status
                    </h4>
                    <Badge className={`mt-1 ${getStatusColor(selectedOrder.status || 'PENDING')}`}>
                      {selectedOrder.status || 'PENDING'}
                    </Badge>
                  </div>
                </div>

                {(selectedOrder.specialRequirements || selectedOrder.notes) && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="font-medium flex items-center mb-2">
                        <User className="mr-2 h-4 w-4" /> Special Requirements
                      </h4>
                      <p className="bg-secondary/50 p-3 rounded-md">
                        {selectedOrder.specialRequirements || selectedOrder.notes}
                      </p>
                    </div>
                  </>
                )}

                {selectedOrder.delivery && selectedOrder.deliveryInfo && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="font-medium flex items-center mb-2">
                        <Truck className="mr-2 h-4 w-4" /> Delivery Information
                      </h4>
                      <div className="bg-secondary/50 p-3 rounded-md space-y-2">
                        <p><span className="font-medium">Name:</span> {selectedOrder.deliveryInfo.fullName}</p>
                        <p><span className="font-medium">Phone:</span> {selectedOrder.deliveryInfo.phoneNumber}</p>
                        <p><span className="font-medium">Address:</span> {selectedOrder.deliveryInfo.address}, {selectedOrder.deliveryInfo.city}</p>
                      </div>
                    </div>
                  </>
                )}

                {selectedOrder.paymentScreenshotUrl && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="font-medium flex items-center mb-2">
                        <CreditCard className="mr-2 h-4 w-4" /> Payment Proof
                      </h4>
                      <div className="relative w-full h-48 rounded-md overflow-hidden border bg-muted/30">
                        <img 
                          src={selectedOrder.paymentScreenshotUrl} 
                          alt="Payment Proof" 
                          className="w-full h-full object-contain"
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}