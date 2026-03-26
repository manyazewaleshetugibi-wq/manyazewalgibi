"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
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
  Calculator,
  DoorOpen,
} from 'lucide-react';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import * as XLSX from 'xlsx';

// Types
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

interface TableSummary {
  tableNumber: string;
  orders: Order[];
  totalAmount: number;
  totalOrders: number;
  customerCount: number;
  firstOrderTime: string;
  lastOrderTime: string;
  status: 'active' | 'closed' | 'pending_payment';
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

function exportToExcel(data: any[], filename: string) {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Sales Data");
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

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

// Table Summary Card Component
const TableSummaryCard = ({ 
  tableSummary, 
  onCalculate,
  onCloseTable,
  onViewOrders,
  itemsMap,
}: { 
  tableSummary: TableSummary;
  onCalculate: (tableNumber: string) => void;
  onCloseTable: (tableNumber: string) => void;
  onViewOrders: (tableNumber: string) => void;
  itemsMap: Map<string, Item>;
}) => {
  // Get all items from all orders with proper names from itemsMap
  const allItems = tableSummary.orders.flatMap(order => 
    (order.orderItems || order.items || []).map(item => {
      const itemDetails = itemsMap.get(item.menuItemId || item.id || '');
      return {
        ...item,
        name: itemDetails?.name || item.name || 'Unknown Item',
        price: itemDetails?.price || item.price || 0,
        orderNumber: order.orderNumber,
        orderStatus: order.status,
        orderTime: order.createdAt
      };
    })
  );

  // Group items by name for summary
  const itemSummary = allItems.reduce((acc, item) => {
    const key = item.name;
    if (!acc[key]) {
      acc[key] = {
        name: item.name,
        quantity: 0,
        total: 0,
        price: item.price
      };
    }
    acc[key].quantity += item.quantity;
    acc[key].total += (item.price * item.quantity);
    return acc;
  }, {} as Record<string, { name: string; quantity: number; total: number; price: number }>);

  const uniqueItems = Object.values(itemSummary);

  return (
    <Card className={`border-l-4 ${tableSummary.status === 'closed' ? 'border-l-gray-400' : 'border-l-green-500'} hover:shadow-lg transition-all duration-300`}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2 rounded-lg">
              <Utensils className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold">Table {tableSummary.tableNumber}</CardTitle>
              <p className="text-xs text-muted-foreground">
                {tableSummary.orders.length} order(s) • {tableSummary.totalOrders} transaction(s)
              </p>
            </div>
          </div>
          <Badge variant={tableSummary.status === 'closed' ? 'secondary' : tableSummary.status === 'pending_payment' ? 'destructive' : 'default'}>
            {tableSummary.status === 'active' && 'Active'}
            {tableSummary.status === 'pending_payment' && 'Pending Payment'}
            {tableSummary.status === 'closed' && 'Closed'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Total Amount</p>
            <p className="text-2xl font-bold text-primary">{formatCurrency(tableSummary.totalAmount)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Customers Served</p>
            <p className="text-2xl font-bold">{tableSummary.customerCount}</p>
          </div>
        </div>

        {/* Show items summary */}
        {uniqueItems.length > 0 && (
          <div className="space-y-1">
            <p className="text-sm font-medium">Items Ordered:</p>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {uniqueItems.slice(0, 5).map((item, idx) => (
                <div key={idx} className="flex justify-between text-sm">
                  <span className="truncate flex-1">{item.name}</span>
                  <span className="text-muted-foreground mx-2">{item.quantity}x</span>
                  <span className="font-medium">{formatCurrency(item.total)}</span>
                </div>
              ))}
              {uniqueItems.length > 5 && (
                <p className="text-xs text-muted-foreground">+{uniqueItems.length - 5} more items</p>
              )}
            </div>
          </div>
        )}
        
        <div className="text-xs text-muted-foreground">
          <p>First Order: {new Date(tableSummary.firstOrderTime).toLocaleTimeString()}</p>
          {tableSummary.lastOrderTime && (
            <p>Last Order: {new Date(tableSummary.lastOrderTime).toLocaleTimeString()}</p>
          )}
        </div>

        {tableSummary.orders.length > 0 && (
          <div className="space-y-1">
            <p className="text-sm font-medium">Recent Orders:</p>
            <div className="space-y-1 max-h-24 overflow-y-auto">
              {tableSummary.orders.slice(0, 3).map((order, idx) => (
                <div key={idx} className="flex justify-between text-sm">
                  <span>#{order.orderNumber}</span>
                  <Badge variant="outline" className={getStatusColor(order.status)}>
                    {order.status}
                  </Badge>
                  <span>{formatCurrency(order.finalAmount)}</span>
                </div>
              ))}
              {tableSummary.orders.length > 3 && (
                <p className="text-xs text-muted-foreground">+{tableSummary.orders.length - 3} more orders</p>
              )}
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex gap-2 pt-2 border-t">
        <Button 
          variant="outline" 
          size="sm" 
          className="flex-1"
          onClick={() => onViewOrders(tableSummary.tableNumber)}
        >
          <Eye className="h-4 w-4 mr-2" />
          View Orders
        </Button>
        <Button 
          variant="default" 
          size="sm" 
          className="flex-1"
          onClick={() => onCalculate(tableSummary.tableNumber)}
          disabled={tableSummary.status === 'closed'}
        >
          <Calculator className="h-4 w-4 mr-2" />
          Calculate Total
        </Button>
        <Button 
          variant={tableSummary.status === 'closed' ? 'secondary' : 'destructive'} 
          size="sm"
          onClick={() => onCloseTable(tableSummary.tableNumber)}
          disabled={tableSummary.status === 'closed'}
        >
          <DoorOpen className="h-4 w-4 mr-2" />
          Close Table
        </Button>
      </CardFooter>
    </Card>
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
  const [sortBy, setSortBy] = useState<keyof Order>("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;
  
  // Table Management States
  const [tableSummaries, setTableSummaries] = useState<Map<string, TableSummary>>(new Map());
  const [selectedTableForDetails, setSelectedTableForDetails] = useState<string | null>(null);
  const [calculateDialogOpen, setCalculateDialogOpen] = useState(false);
  const [selectedTableForCalculation, setSelectedTableForCalculation] = useState<string | null>(null);
  const [calculatedTotal, setCalculatedTotal] = useState(0);
  const [closedTables, setClosedTables] = useState<Set<string>>(new Set());
  
  // Items cache
  const [itemsMap, setItemsMap] = useState<Map<string, Item>>(new Map());
  const [itemsLoading, setItemsLoading] = useState(false);
  
  // Detail view state
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Fetch all items from API
  const fetchAllItems = useCallback(async () => {
    try {
      setItemsLoading(true);
      const response = await fetch("/api/items");
      const data = await response.json();
      
      if (data.success && data.items) {
        const itemsMapData = new Map<string, Item>();
        data.items.forEach((item: Item) => {
          itemsMapData.set(item._id, item);
        });
        setItemsMap(itemsMapData);
      }
    } catch (error) {
      console.error("Error fetching items:", error);
    } finally {
      setItemsLoading(false);
    }
  }, []);

  // Fetch current waitress
  useEffect(() => {
    if (status === 'authenticated' && session?.user?.email && !waitressFetched.current) {
      waitressFetched.current = true;
      fetchCurrentWaitress();
      fetchAllItems();
    }
  }, [status, session, fetchAllItems]);

  const fetchCurrentWaitress = useCallback(async () => {
    if (!session?.user?.email) return null;
    
    try {
      const response = await fetch("/api/waitress");
      if (!response.ok) throw new Error("Failed to fetch waitresses");
      const data = await response.json();
      
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

  // Fetch reports
  useEffect(() => {
    if (currentWaitress?._id && !initialFetchDone.current) {
      initialFetchDone.current = true;
      fetchReports(currentWaitress._id);
    }
  }, [currentWaitress]);

  useEffect(() => {
    if (currentWaitress?._id && initialFetchDone.current) {
      fetchReports(currentWaitress._id);
    }
  }, [filterType]);

  // Update table summaries
  useEffect(() => {
    if (orders.length > 0 && currentWaitress) {
      updateTableSummaries();
    }
  }, [orders, currentWaitress, closedTables]);

  const updateTableSummaries = () => {
    const tablesMap = new Map<string, TableSummary>();
    
    orders.forEach(order => {
      if (currentWaitress && order.waiterId !== currentWaitress._id) {
        return;
      }
      
      const tableNumber = order.tableNumber || 'Unknown';
      
      if (!tablesMap.has(tableNumber)) {
        tablesMap.set(tableNumber, {
          tableNumber,
          orders: [],
          totalAmount: 0,
          totalOrders: 0,
          customerCount: 0,
          firstOrderTime: order.createdAt,
          lastOrderTime: order.createdAt,
          status: closedTables.has(tableNumber) ? 'closed' : 'active',
        });
      }
      
      const tableSummary = tablesMap.get(tableNumber)!;
      tableSummary.orders.push(order);
      tableSummary.totalAmount += order.finalAmount || 0;
      tableSummary.totalOrders += 1;
      tableSummary.customerCount += order.numberOfGuests || 1;
      
      if (new Date(order.createdAt) < new Date(tableSummary.firstOrderTime)) {
        tableSummary.firstOrderTime = order.createdAt;
      }
      if (new Date(order.createdAt) > new Date(tableSummary.lastOrderTime)) {
        tableSummary.lastOrderTime = order.createdAt;
      }
      
      const hasUnpaidOrder = order.status !== 'COMPLETED' && order.status !== 'CANCELLED';
      if (hasUnpaidOrder && !closedTables.has(tableNumber)) {
        tableSummary.status = 'pending_payment';
      }
    });
    
    setTableSummaries(tablesMap);
  };

  const fetchReports = useCallback(async (waiterId: string) => {
    try {
      setIsLoading(true);
      setApiError(null);

      const params = new URLSearchParams();
      
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

      params.append('waiterId', waiterId);

      const response = await fetch(`/api/order/waiterreport?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || `Server error: ${response.status}`);
      }

      if (data.success) {
        setOrders(data.orders || []);
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

  // Apply filters
  useEffect(() => {
    if (orders.length > 0) {
      const timer = setTimeout(() => {
        applyFilters();
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [orders, dateRange, selectedStatus, selectedPaymentMethod, searchTerm, sortBy, sortOrder]);

  const applyFilters = useCallback(() => {
    let filtered = [...orders];

    if (dateRange.start && dateRange.end && filterType === 'custom') {
      filtered = filtered.filter(order => {
        const orderDate = new Date(order.createdAt);
        return orderDate >= dateRange.start! && orderDate <= dateRange.end!;
      });
    }

    if (selectedStatus !== 'all') {
      filtered = filtered.filter(order => 
        order.status?.toUpperCase() === selectedStatus.toUpperCase()
      );
    }

    if (selectedPaymentMethod !== 'all') {
      filtered = filtered.filter(order => 
        order.paymentMethod?.toUpperCase() === selectedPaymentMethod.toUpperCase()
      );
    }

    if (searchTerm) {
      filtered = filtered.filter(order => 
        order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.tableNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customerName?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

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

  const handleExport = () => {
    const filename = `my_orders_${format(new Date(), 'yyyy-MM-dd')}`;
    
    const exportData = filteredOrders.map(order => ({
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

  // Table Management Functions
  const handleCalculateTableTotal = (tableNumber: string) => {
    const tableSummary = tableSummaries.get(tableNumber);
    if (tableSummary) {
      setSelectedTableForCalculation(tableNumber);
      setCalculatedTotal(tableSummary.totalAmount);
      setCalculateDialogOpen(true);
    }
  };

  const handleCloseTable = async (tableNumber: string) => {
    const tableSummary = tableSummaries.get(tableNumber);
    if (!tableSummary) return;
    
    const finalTotal = tableSummary.totalAmount;
    
    const confirmed = window.confirm(
      `Table ${tableNumber}\n` +
      `Total Orders: ${tableSummary.orders.length}\n` +
      `Total Amount: ${formatCurrency(finalTotal)}\n` +
      `Customers Served: ${tableSummary.customerCount}\n\n` +
      `Are you sure you want to close this table?\n` +
      `This will mark it as ready for new customers.`
    );
    
    if (confirmed) {
      setClosedTables(prev => new Set(prev).add(tableNumber));
      alert(`Table ${tableNumber} has been closed.\nTotal collected: ${formatCurrency(finalTotal)}`);
      
      if (currentWaitress?._id) {
        fetchReports(currentWaitress._id);
      }
    }
  };

  const handleViewTableOrders = (tableNumber: string) => {
    setSelectedTableForDetails(tableNumber);
  };

  const getTableOrders = (tableNumber: string): Order[] => {
    return orders.filter(order => order.tableNumber === tableNumber);
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

  const handleViewDetails = (order: Order) => {
    setSelectedOrder(order);
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

  // Calculate summary statistics
  const totalSales = filteredOrders.reduce((sum, order) => sum + (order.finalAmount || 0), 0);
  const totalOrders = filteredOrders.length;
  const totalItems = filteredOrders.reduce((sum, order) => sum + (order.orderItems?.length || 0), 0);
  const totalGuests = filteredOrders.reduce((sum, order) => sum + (order.numberOfGuests || 1), 0);
  const averageOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

  return (
    <div className="flex-col md:flex">
      <div className="flex-1 space-y-4 p-8 pt-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">My Orders & Table Management</h1>
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
            <TabsTrigger value="overview">My Orders</TabsTrigger>
            <TabsTrigger value="tables">Table Management</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            {/* Date Filter */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Filter Orders
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
                  
                  <Button onClick={handleExport} variant="outline" size="sm" disabled={filteredOrders.length === 0}>
                    <Download className="mr-2 h-4 w-4" />
                    Export
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

            {/* Metrics Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(totalSales)}</div>
                  <p className="text-xs text-muted-foreground">{totalOrders} orders</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Average Order</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(averageOrderValue)}</div>
                  <p className="text-xs text-muted-foreground">per transaction</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Items</CardTitle>
                  <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatNumber(totalItems)}</div>
                  <p className="text-xs text-muted-foreground">items sold</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Guests</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatNumber(totalGuests)}</div>
                  <p className="text-xs text-muted-foreground">customers served</p>
                </CardContent>
              </Card>
            </div>

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

          {/* Table Management Tab */}
          <TabsContent value="tables" className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold">Table Management</h2>
                <p className="text-muted-foreground">Manage tables, calculate totals, and close tables when customers leave</p>
              </div>
              <Button onClick={() => handleRefresh()} variant="outline" size="sm">
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh Tables
              </Button>
            </div>

            {isLoading || itemsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className="h-[250px] w-full" />
                ))}
              </div>
            ) : tableSummaries.size === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <DoorOpen className="h-16 w-16 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Active Tables</h3>
                  <p className="text-muted-foreground text-center">
                    There are no active orders for any tables at the moment.
                    <br />
                    When you create orders, they will appear here for management.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from(tableSummaries.values())
                  .sort((a, b) => a.tableNumber.localeCompare(b.tableNumber))
                  .map((tableSummary) => (
                    <TableSummaryCard
                      key={tableSummary.tableNumber}
                      tableSummary={tableSummary}
                      onCalculate={handleCalculateTableTotal}
                      onCloseTable={handleCloseTable}
                      onViewOrders={handleViewTableOrders}
                      itemsMap={itemsMap}
                    />
                  ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Calculate Total Dialog with Item Details */}
      <Dialog open={calculateDialogOpen} onOpenChange={setCalculateDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center">
              <Calculator className="mr-2 h-6 w-6" />
              Table {selectedTableForCalculation} - Bill Summary
            </DialogTitle>
            <DialogDescription>
              Complete breakdown of all orders at this table
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh] pr-4">
            {selectedTableForCalculation && tableSummaries.get(selectedTableForCalculation) && (
              <div className="space-y-6">
                {/* Table Info Header */}
                <div className="bg-primary/10 p-4 rounded-lg">
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Orders</p>
                      <p className="text-xl font-bold">{tableSummaries.get(selectedTableForCalculation)?.orders.length}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Customers</p>
                      <p className="text-xl font-bold">{tableSummaries.get(selectedTableForCalculation)?.customerCount}</p>
                    </div>
                  </div>
                </div>

                {/* All Items Breakdown */}
                <div>
                  <h3 className="font-semibold text-lg mb-3 flex items-center">
                    <ShoppingBag className="h-5 w-5 mr-2" />
                    Items Ordered
                  </h3>
                  <div className="rounded-md border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item Name</TableHead>
                          <TableHead className="text-center">Quantity</TableHead>
                          <TableHead className="text-right">Unit Price</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(() => {
                          const tableData = tableSummaries.get(selectedTableForCalculation);
                          if (!tableData) return null;
                          
                          const allItems = tableData.orders.flatMap(order => 
                            (order.orderItems || order.items || []).map(item => {
                              const itemDetails = itemsMap.get(item.menuItemId || item.id || '');
                              return {
                                ...item,
                                name: itemDetails?.name || item.name || 'Unknown Item',
                                price: itemDetails?.price || item.price || 0,
                                orderNumber: order.orderNumber
                              };
                            })
                          );
                          
                          const groupedItems = allItems.reduce((acc, item) => {
                            const key = item.name;
                            if (!acc[key]) {
                              acc[key] = {
                                name: item.name,
                                quantity: 0,
                                total: 0,
                                price: item.price,
                                orders: new Set<string>()
                              };
                            }
                            acc[key].quantity += item.quantity;
                            acc[key].total += (item.price * item.quantity);
                            acc[key].orders.add(item.orderNumber);
                            return acc;
                          }, {} as Record<string, { name: string; quantity: number; total: number; price: number; orders: Set<string> }>);
                          
                          return Object.values(groupedItems).map((item, idx) => (
                            <TableRow key={idx}>
                              <TableCell>
                                <div>
                                  <p className="font-medium">{item.name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    From {item.orders.size} order(s)
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge variant="secondary">{item.quantity}x</Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(item.price)}
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                {formatCurrency(item.total)}
                              </TableCell>
                            </TableRow>
                          ));
                        })()}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Order Breakdown */}
                <div>
                  <h3 className="font-semibold text-lg mb-3 flex items-center">
                    <Receipt className="h-5 w-5 mr-2" />
                    Order Breakdown
                  </h3>
                  <div className="space-y-3">
                    {tableSummaries.get(selectedTableForCalculation)?.orders.map((order, idx) => (
                      <Card key={idx} className="bg-secondary/30">
                        <CardHeader className="pb-2">
                          <div className="flex justify-between items-center">
                            <div>
                              <CardTitle className="text-md">Order #{order.orderNumber}</CardTitle>
                              <p className="text-xs text-muted-foreground">
                                {new Date(order.createdAt).toLocaleTimeString()}
                              </p>
                            </div>
                            <Badge className={getStatusColor(order.status)}>
                              {order.status}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="space-y-2">
                            {(order.orderItems || order.items || []).map((item, itemIdx) => {
                              const itemDetails = itemsMap.get(item.menuItemId || item.id || '');
                              const itemName = itemDetails?.name || item.name || 'Unknown Item';
                              const itemPrice = itemDetails?.price || item.price || 0;
                              return (
                                <div key={itemIdx} className="flex justify-between text-sm">
                                  <span>{itemName}</span>
                                  <span className="text-muted-foreground">{item.quantity}x</span>
                                  <span>{formatCurrency(itemPrice * item.quantity)}</span>
                                </div>
                              );
                            })}
                            <Separator className="my-2" />
                            <div className="flex justify-between font-medium">
                              <span>Subtotal</span>
                              <span>{formatCurrency(order.totalAmount || 0)}</span>
                            </div>
                            {order.discount > 0 && (
                              <div className="flex justify-between text-red-600 dark:text-red-400">
                                <span>Discount</span>
                                <span>-{formatCurrency(order.discount)}</span>
                              </div>
                            )}
                            {order.tax > 0 && (
                              <div className="flex justify-between">
                                <span>Tax</span>
                                <span>{formatCurrency(order.tax)}</span>
                              </div>
                            )}
                            <div className="flex justify-between font-bold text-primary pt-2 border-t">
                              <span>Total</span>
                              <span>{formatCurrency(order.finalAmount)}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* Grand Total */}
                <div className="bg-primary/20 p-4 rounded-lg sticky bottom-0">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-lg font-semibold">GRAND TOTAL</p>
                      <p className="text-sm text-muted-foreground">To be collected from Table {selectedTableForCalculation}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-bold text-primary">{formatCurrency(calculatedTotal)}</p>
                      <p className="text-sm text-muted-foreground">
                        Including tax & discounts
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCalculateDialogOpen(false)}>
              Close
            </Button>
            <Button onClick={() => {
              setCalculateDialogOpen(false);
              window.print();
            }}>
              <Receipt className="h-4 w-4 mr-2" />
              Print Bill
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Table Orders Dialog */}
      <Dialog open={!!selectedTableForDetails} onOpenChange={() => setSelectedTableForDetails(null)}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center">
              <Utensils className="mr-2 h-6 w-6" />
              Table {selectedTableForDetails} - All Orders
            </DialogTitle>
            <DialogDescription>
              Complete order history for this table
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh] pr-4">
            {selectedTableForDetails && (
              <div className="space-y-4">
                {getTableOrders(selectedTableForDetails).map((order) => (
                  <Card key={order._id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg font-bold">Order #{order.orderNumber}</CardTitle>
                          <p className="text-sm text-muted-foreground">
                            {new Date(order.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <Badge className={getStatusColor(order.status)}>
                          {order.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="flex items-center">
                          <Users className="mr-2 h-4 w-4 text-muted-foreground" />
                          <span>{order.numberOfGuests || 1} guests</span>
                        </div>
                        <div className="flex items-center">
                          <ShoppingBag className="mr-2 h-4 w-4 text-muted-foreground" />
                          <span>{(order.orderItems || []).length} items</span>
                        </div>
                        <div className="flex items-center">
                          <CreditCard className="mr-2 h-4 w-4 text-muted-foreground" />
                          <span>{order.paymentMethod || 'CASH'}</span>
                        </div>
                        <div className="flex items-center">
                          <DollarSign className="mr-2 h-4 w-4 text-muted-foreground" />
                          <span className="font-semibold">{formatCurrency(order.finalAmount || 0)}</span>
                        </div>
                      </div>
                      {order.specialRequirements && (
                        <div className="text-sm bg-secondary/30 p-2 rounded">
                          <span className="font-medium">Notes:</span> {order.specialRequirements}
                        </div>
                      )}
                    </CardContent>
                    <CardFooter>
                      <Button variant="outline" size="sm" onClick={() => {
                        setSelectedTableForDetails(null);
                        handleViewDetails(order);
                      }}>
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

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
                          const itemDetails = itemsMap.get(item.menuItemId || item.id || '');
                          const itemName = itemDetails?.name || item.name || 'Unknown Item';
                          const unitPrice = itemDetails?.price || item.price || 0;
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
