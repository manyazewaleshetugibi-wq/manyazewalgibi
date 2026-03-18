"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
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
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import * as XLSX from "xlsx";
import {
  Calendar as CalendarIcon,
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
  ChevronDown,
  ChevronUp,
  Eye,
  User,
  CreditCard,
  ArrowDownIcon,
  Utensils,
  CalendarDays,
  Award,
  Star,
  TrendingDown,
  X,
  MoreHorizontal,
  Grid,
  List,
  Search,
  RefreshCcw,
  Trash2,
  CheckCircle,
  XCircle,
  Coffee,
  Truck,
  ThumbsUp,
  ChefHat,
  Phone,
  MapPin,
  Receipt,
  AlertTriangle,
} from 'lucide-react';
import { format, subDays, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

// Types
interface OrderItem {
  id?: string;
  itemId?: string;
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  specialInstructions?: string;
  total: number;
  unitPrice?: number;
  subtotal?: number;
  status?: string;
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
  inTable?: boolean;
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
  preparationTime?: number;
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

interface DailySales {
  date: string;
  total: number;
  orders: number;
  averageOrderValue: number;
}

interface TopItem {
  id: string;
  name: string;
  quantity: number;
  revenue: number;
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

// Helper functions
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
    case 'READY':
      return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400';
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

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FF6B6B', '#4ECDC4'];

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
  const start = new Date();
  const end = new Date();

  switch (type) {
    case 'today':
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'yesterday':
      const yesterday = subDays(now, 1);
      start.setTime(yesterday.setHours(0, 0, 0, 0));
      end.setTime(yesterday.setHours(23, 59, 59, 999));
      break;
    case 'week':
      start.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1));
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
  }

  return { start, end };
}

// Delete Order Dialog Component
const DeleteOrderDialog = ({ orderId, onDelete }: { orderId: string; onDelete: () => Promise<void> }) => {
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    setIsDeleting(true)
    await onDelete()
    setIsDeleting(false)
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10">
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the order and remove all associated data from our
            servers.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              "Delete Order"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

// Order Card Component
const OrderCard = ({ 
  order, 
  waitress,
  onViewDetails,
  onDelete,
  onStatusUpdate 
}: { 
  order: Order; 
  waitress?: Waitress;
  onViewDetails: () => void;
  onDelete: () => Promise<void>;
  onStatusUpdate: (status: OrderStatus) => Promise<void>;
}) => {
  return (
    <Card className="hover:shadow-lg transition-shadow duration-300">
      <CardHeader className="pb-2">
        <CardTitle className="flex justify-between items-center">
          <span className="text-lg font-bold">Order #{order.orderNumber}</span>
          <Badge className={getStatusColor(order.status)}>
            {statusIcons[order.status as OrderStatus]} {order.status}
          </Badge>
        </CardTitle>
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
            <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
            <span>{new Date(order.createdAt).toLocaleTimeString()}</span>
          </div>
          <div className="flex items-center">
            <MapPin className="mr-2 h-4 w-4 text-muted-foreground" />
            <span>Table {order.tableNumber || 'N/A'}</span>
          </div>
          <div className="flex items-center">
            <Users className="mr-2 h-4 w-4 text-muted-foreground" />
            <span>{order.numberOfGuests || 1} guests</span>
          </div>
          <div className="flex items-center">
            <DollarSign className="mr-2 h-4 w-4 text-muted-foreground" />
            <span>{formatCurrency(order.finalAmount || 0)}</span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="justify-between pt-2">
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
            <DeleteOrderDialog orderId={order._id} onDelete={onDelete} />
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Change Status</DropdownMenuLabel>
            {statusOptions.map((status) => (
              <DropdownMenuItem key={status} onClick={() => onStatusUpdate(status)}>
                {statusIcons[status]}
                <span className="ml-2">{status}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </CardFooter>
    </Card>
  );
};

// Sales Chart Component
const SalesChart = ({ data, type = "line" }: { data: Record<string, number>, type?: "line" | "bar" }) => {
  const chartData = Object.entries(data).map(([date, amount]) => ({
    name: new Date(date).toLocaleDateString(),
    total: amount,
    date: date,
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

  // State
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [waitresses, setWaitresses] = useState<Waitress[]>([]);
  const [dateRange, setDateRange] = useState<{ start: Date | null; end: Date | null }>({ start: null, end: null });
  const [filterType, setFilterType] = useState<'today' | 'yesterday' | 'week' | 'month' | 'custom'>('today');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "grid">("grid");
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [chartType, setChartType] = useState<"line" | "bar">("line");
  const [sortBy, setSortBy] = useState<keyof Order>("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;
  
  // Detail view state
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedWaitress, setSelectedWaitress] = useState<Waitress | null>(null);
  const [selectedItems, setSelectedItems] = useState<Record<string, Item>>({});
  
  // Summary stats
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

  // Fetch waitresses
  const fetchWaitresses = useCallback(async () => {
    try {
      const response = await fetch("/api/waitress");
      if (!response.ok) throw new Error("Failed to fetch waitresses");
      const data = await response.json();
      setWaitresses(data || []);
    } catch (error) {
      console.error("Error fetching waitresses:", error);
    }
  }, []);

  // Fetch data on mount and when filters change
  useEffect(() => {
    if (status === 'authenticated' && session?.user?.email) {
      fetchReports();
      fetchWaitresses();
    }
  }, [session, status, filterType, selectedStatus, selectedPaymentMethod]);

  // Apply client-side filtering when date range changes
  useEffect(() => {
    if (orders.length > 0 && dateRange.start && dateRange.end) {
      applyFilters();
    }
  }, [orders, dateRange, selectedStatus, selectedPaymentMethod, searchTerm]);

  const fetchReports = async () => {
    try {
      setIsLoading(true);
      setApiError(null);

      // Build query params - only filter by current user's email
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

      // Add user email to filter by current user only
      params.append('userEmail', session?.user?.email || '');

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
  };

  const applyFilters = () => {
    let filtered = [...orders];

    // Filter by date range
    if (dateRange.start && dateRange.end) {
      filtered = filtered.filter(order => {
        const orderDate = new Date(order.createdAt);
        return orderDate >= dateRange.start! && orderDate <= dateRange.end!;
      });
    }

    // Filter by status
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(order => 
        order.status?.toUpperCase() === selectedStatus.toUpperCase()
      );
    }

    // Filter by payment method
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
      
      return 0;
    });

    setFilteredOrders(filtered);
    setCurrentPage(1);
  };

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
    
    const sorted = [...filteredOrders].sort((a, b) => {
      const aVal = a[field];
      const bVal = b[field];
      
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return order === 'asc' 
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return order === 'asc' ? aVal - bVal : bVal - aVal;
      }
      
      return 0;
    });
    
    setFilteredOrders(sorted);
  };

  const handleDeleteOrder = async (orderId: string) => {
    try {
      const response = await fetch(`/api/order/${orderId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete order");
      
      // Show success message
      const toast = (await import('@/hooks/use-toast')).toast;
      toast({
        title: "Success",
        description: "Order deleted successfully",
      });
      
      fetchReports(); // Refresh data
    } catch (error) {
      console.error("Error deleting order:", error);
      const toast = (await import('@/hooks/use-toast')).toast;
      toast({
        title: "Error",
        description: "Failed to delete order",
        variant: "destructive",
      });
    }
  };

  const handleStatusUpdate = async (orderId: string, newStatus: OrderStatus) => {
    try {
      const response = await fetch(`/api/order/${orderId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!response.ok) throw new Error("Failed to update order status");
      
      // Show success message
      const toast = (await import('@/hooks/use-toast')).toast;
      toast({
        title: "Success",
        description: `Order status updated to ${newStatus}`,
      });
      
      fetchReports(); // Refresh data
    } catch (error) {
      console.error("Error updating order status:", error);
      const toast = (await import('@/hooks/use-toast')).toast;
      toast({
        title: "Error",
        description: "Failed to update order status",
        variant: "destructive",
      });
    }
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
    
    // Fetch waitress details
    if (order.waiterId) {
      try {
        const response = await fetch(`/api/waitress/${order.waiterId}`);
        const data = await response.json();
        setSelectedWaitress(data);
      } catch (error) {
        console.error('Error fetching waitress:', error);
      }
    }

    // Fetch item details - improved version
    const items = order.orderItems || order.items || [];
    const itemDetails: Record<string, Item> = {};
    
    for (const item of items) {
      // Get the item ID (could be menuItemId or itemId)
      const itemId = item.menuItemId || item.itemId || item.id;
      
      if (itemId) {
        try {
          // First try to get from items API
          const response = await fetch(`/api/items/${itemId}`);
          const data = await response.json();
          
          if (data.success) {
            // Handle different response structures
            if (data.item) {
              itemDetails[itemId] = data.item;
            } else if (data.items && data.items.length > 0) {
              itemDetails[itemId] = data.items[0];
            } else if (data.data) {
              itemDetails[itemId] = data.data;
            }
          }
          
          // If we already have the item name from the order, use it as fallback
          if (!itemDetails[itemId] && item.name) {
            itemDetails[itemId] = {
              _id: itemId,
              name: item.name,
              description: '',
              price: item.price || item.unitPrice || 0,
              imageUrl: '',
              categoryId: '',
            } as Item;
          }
        } catch (error) {
          console.error(`Error fetching item ${itemId}:`, error);
          // If fetch fails but we have item name from order, use it
          if (item.name) {
            itemDetails[itemId] = {
              _id: itemId,
              name: item.name,
              description: '',
              price: item.price || item.unitPrice || 0,
              imageUrl: '',
              categoryId: '',
            } as Item;
          }
        }
      }
    }
    
    setSelectedItems(itemDetails);
  };

  const calculateMetrics = (orders: Order[]) => {
    const totalSales = orders.reduce((sum, order) => sum + (order.finalAmount || 0), 0);
    const totalTax = orders.reduce((sum, order) => sum + (order.tax || 0), 0);
    const totalDiscounts = orders.reduce((sum, order) => sum + (order.discount || 0), 0);
    
    return {
      totalSales,
      orderCount: orders.length,
      totalTax,
      totalDiscounts,
      averageOrderValue: orders.length > 0 ? totalSales / orders.length : 0
    };
  };

  const getDailySalesData = (orders: Order[]) => {
    const dailySales: Record<string, number> = {};
    orders.forEach(order => {
      const date = new Date(order.createdAt).toLocaleDateString();
      dailySales[date] = (dailySales[date] || 0) + (order.finalAmount || 0);
    });
    return dailySales;
  };

  const overviewMetrics = useMemo(() => calculateMetrics(filteredOrders), [filteredOrders]);
  const dailySalesData = useMemo(() => getDailySalesData(filteredOrders), [filteredOrders]);
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedStatus("all");
    setSelectedPaymentMethod("all");
    setFilterType("today");
    const { start, end } = getDateRange("today");
    setDateRange({ start, end });
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

  return (
    <div className="flex-col md:flex">
      <div className="flex-1 space-y-4 p-8 pt-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">My Orders</h1>
            <p className="text-muted-foreground">
              {session.user?.name} • {session.user?.email}
            </p>
          </div>
          <Button 
            onClick={fetchReports} 
            variant="outline" 
            size="sm" 
            disabled={isLoading}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

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
                        placeholder="Order #, Table, Customer..."
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
                      <div className="text-2xl font-bold">{overviewMetrics.totalSales.toFixed(2)} BIRR</div>
                      <p className="text-xs text-muted-foreground">{filteredOrders.length} orders</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Average Order</CardTitle>
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{overviewMetrics.averageOrderValue.toFixed(2)} BIRR</div>
                      <p className="text-xs text-muted-foreground">per transaction</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Items</CardTitle>
                      <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{summary.totalItems}</div>
                      <p className="text-xs text-muted-foreground">items sold</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Guests</CardTitle>
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{summary.totalGuests}</div>
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
                        waitress={waitresses.find(w => w._id === order.waiterId)}
                        onViewDetails={() => handleViewDetails(order)}
                        onDelete={() => handleDeleteOrder(order._id)}
                        onStatusUpdate={(status) => handleStatusUpdate(order._id, status)}
                      />
                    ))}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[100px] cursor-pointer" onClick={() => handleSort("orderNumber")}>
                              Order #
                              {sortBy === "orderNumber" && (sortOrder === "asc" ? " ↑" : " ↓")}
                            </TableHead>
                            <TableHead className="cursor-pointer" onClick={() => handleSort("tableNumber")}>
                              Table
                              {sortBy === "tableNumber" && (sortOrder === "asc" ? " ↑" : " ↓")}
                            </TableHead>
                            <TableHead>Waitress</TableHead>
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
                          {paginatedOrders.map((order) => {
                            const waitress = waitresses.find(w => w._id === order.waiterId);
                            return (
                              <TableRow key={order._id || order.id}>
                                <TableCell className="font-medium">{order.orderNumber}</TableCell>
                                <TableCell>{order.tableNumber || 'N/A'}</TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <Avatar className="h-6 w-6">
                                      <AvatarFallback>{waitress?.name?.charAt(0) || 'W'}</AvatarFallback>
                                    </Avatar>
                                    <span className="truncate max-w-[100px]">{waitress?.name || 'Unknown'}</span>
                                  </div>
                                </TableCell>
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
                                        <DeleteOrderDialog orderId={order._id} onDelete={() => handleDeleteOrder(order._id)} />
                                        <DropdownMenuSeparator />
                                        <DropdownMenuLabel>Change Status</DropdownMenuLabel>
                                        {statusOptions.map((status) => (
                                          <DropdownMenuItem key={status} onClick={() => handleStatusUpdate(order._id, status)}>
                                            {statusIcons[status]}
                                            <span className="ml-2">{status}</span>
                                          </DropdownMenuItem>
                                        ))}
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
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
                  {Object.keys(dailySalesData).length > 0 ? (
                    <SalesChart data={dailySalesData} type={chartType} />
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
                {selectedWaitress && (
                  <>
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
                          const itemDetails = selectedItems[item.menuItemId || item.itemId || item.id || ''];
                          const itemName = itemDetails?.name || item.name || 'Unknown Item';
                          const unitPrice = item.price || item.unitPrice || 0;
                          const subtotal = item.subtotal || item.total || (unitPrice * item.quantity);
                          
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