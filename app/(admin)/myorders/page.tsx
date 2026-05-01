"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
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
  Utensils,
  X,
  Grid,
  List,
  Search,
  CheckCircle,
  XCircle,
  Coffee,
  Truck,
  ThumbsUp,
  ChefHat,
  Calculator,
  DoorOpen,
  LayoutGrid,
  ReceiptText,
} from 'lucide-react';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import * as XLSX from 'xlsx';

interface OrderItem {
  menuItemId: string;
  itemId?: string;
  name: string;
  price: number;
  unitPrice?: number;
  quantity: number;
  specialInstructions?: string;
  total: number;
  subtotal?: number;
  status?: string;
}

interface Order {
  _id: string;
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
  paymentMethod: string;
  waiterId: string;
  calculated?: boolean;
  delivery?: boolean;
  inTable?: boolean;
  deliveryInfo?: {
    fullName: string;
    phoneNumber: string;
    address: string;
    city: string;
  };
  paymentScreenshotUrl?: string;
  waiterName?: string;
}

interface Waitress {
  _id: string;
  name: string;
  shift: string;
  phone?: string;
  email?: string;
}

interface MenuItem {
  _id: string;
  name: string;
  description: string;
  price: number;
  imageUrl?: string;
  preparationTime?: number;
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

const getStatusColor = (status: string) => {
  switch (status?.toUpperCase()) {
    case 'COMPLETED': return 'bg-green-100 text-green-800 border-green-200';
    case 'PENDING': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'CANCELLED': return 'bg-red-100 text-red-800 border-red-200';
    case 'CONFIRMED': return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'PREPARING': return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'SERVED': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-ET', { style: 'currency', currency: 'ETB' }).format(amount);
};

// Cache for menu items
const menuItemsCache = new Map<string, { data: Map<string, MenuItem>; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000;
const BATCH_SIZE_LIMIT = 100;

// Batch fetch items with caching
const fetchItemsBatch = async (itemIds: string[]): Promise<Map<string, MenuItem>> => {
  if (itemIds.length === 0) return new Map();
  
  const uniqueIds = [...new Set(itemIds)];
  const limitedIds = uniqueIds.slice(0, BATCH_SIZE_LIMIT);
  const cacheKey = limitedIds.sort().join(',');
  
  const cached = menuItemsCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  
  try {
    const response = await fetch(`/api/items?ids=${limitedIds.join(',')}`);
    if (!response.ok) throw new Error("Failed to fetch items");
    const data = await response.json();
    
    const itemsMap = new Map<string, MenuItem>();
    const items = data.items || data || [];
    items.forEach((item: MenuItem) => {
      if (item?._id) {
        itemsMap.set(item._id, item);
      }
    });
    
    menuItemsCache.set(cacheKey, { data: itemsMap, timestamp: Date.now() });
    return itemsMap;
  } catch (error) {
    console.error("Error fetching items batch:", error);
    return new Map();
  }
};

// Prefetch common item combinations
const prefetchCommonItemCombinations = async (orders: Order[]) => {
  const allItemIds = new Set<string>();
  orders.forEach(order => {
    const items = order.orderItems || order.items || [];
    items.forEach(item => {
      const itemId = item.menuItemId || item.itemId;
      if (itemId) allItemIds.add(itemId);
    });
  });
  
  if (allItemIds.size > 0) {
    await fetchItemsBatch(Array.from(allItemIds));
  }
};

export default function WaiterReportPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [currentWaitress, setCurrentWaitress] = useState<Waitress | null>(null);
  const [filterType, setFilterType] = useState<'today' | 'yesterday' | 'week' | 'month'>('today');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "grid">("grid");
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [sortBy, setSortBy] = useState<keyof Order>("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [tableSummaries, setTableSummaries] = useState<Map<string, TableSummary>>(new Map());
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [calculateDialogOpen, setCalculateDialogOpen] = useState(false);
  const [selectedTableForCalculation, setSelectedTableForCalculation] = useState<string | null>(null);
  const [calculatedTotal, setCalculatedTotal] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [menuItemsMap, setMenuItemsMap] = useState<Map<string, MenuItem>>(new Map());
  const [loadingItems, setLoadingItems] = useState(false);
  
  const itemsPerPage = 12;
  const initialFetchDone = useRef(false);

  // Check for mobile screen
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const fetchCurrentWaitress = useCallback(async () => {
    if (!session?.user?.email) return null;
    try {
      const response = await fetch("/api/waitress");
      const data = await response.json();
      const waitress = (data || []).find((w: Waitress) => 
        w.email?.toLowerCase() === session.user?.email?.toLowerCase()
      );
      setCurrentWaitress(waitress || null);
      return waitress;
    } catch (error) {
      console.error("Error fetching waitress:", error);
      return null;
    }
  }, [session?.user?.email]);

  // Fetch menu items for orders
  const fetchMenuItemsForOrders = useCallback(async (orders: Order[]) => {
    const allItemIds = new Set<string>();
    orders.forEach(order => {
      const items = order.orderItems || order.items || [];
      items.forEach(item => {
        const itemId = item.menuItemId || item.itemId;
        if (itemId) allItemIds.add(itemId);
      });
    });
    
    if (allItemIds.size > 0) {
      setLoadingItems(true);
      const itemsMap = await fetchItemsBatch(Array.from(allItemIds));
      setMenuItemsMap(itemsMap);
      setLoadingItems(false);
    }
  }, []);

  // Enhance order items with menu item data
  const enhanceOrderItems = useCallback((order: Order): Order => {
    const items = order.orderItems || order.items || [];
    const enhancedItems = items.map(item => {
      const itemId = item.menuItemId || item.itemId;
      const menuItem = menuItemsMap.get(itemId || '');
      
      return {
        ...item,
        name: menuItem?.name || item.name || (loadingItems ? 'Loading...' : 'Unknown Item'),
        price: menuItem?.price || item.price || item.unitPrice || 0,
        total: (menuItem?.price || item.price || item.unitPrice || 0) * (item.quantity || 0),
      };
    });
    
    return {
      ...order,
      orderItems: enhancedItems,
      items: enhancedItems,
    };
  }, [menuItemsMap, loadingItems]);

  // Use useMemo to enhance orders with menu item details without causing infinite loops
  const enhancedAllOrders = useMemo(() => {
    return allOrders.map(order => enhanceOrderItems(order));
  }, [allOrders, enhanceOrderItems]);

  // Memoize active orders (orders not yet closed/calculated)
  const activeOrders = useMemo(() => {
    return enhancedAllOrders.filter((order: Order) => !order.calculated);
  }, [enhancedAllOrders]);

  const fetchOrders = useCallback(async (waiterId: string) => {
    try {
      setIsLoading(true);
      setApiError(null);

      const params = new URLSearchParams();
      
      if (filterType === 'today') {
        const today = format(new Date(), 'yyyy-MM-dd');
        params.append('startDate', today);
        params.append('endDate', today);
      } else if (filterType === 'yesterday') {
        const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');
        params.append('startDate', yesterday);
        params.append('endDate', yesterday);
      } else if (filterType === 'week') {
        const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
        const weekEnd = format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
        params.append('startDate', weekStart);
        params.append('endDate', weekEnd);
      } else if (filterType === 'month') {
        const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');
        const monthEnd = format(endOfMonth(new Date()), 'yyyy-MM-dd');
        params.append('startDate', monthStart);
        params.append('endDate', monthEnd);
      }

      params.append('waiterId', waiterId);
      params.append('includeAllStatuses', 'true');

      const response = await fetch(`/api/order/waiterreport?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || 'Failed to fetch reports');

      if (data.success) {
        const fetchedOrders = data.orders || [];
        
        // Validate and structure orders
        const validatedOrders = fetchedOrders.map((order: Order) => ({
          ...order,
          orderItems: (order.orderItems || order.items || []).map((item: OrderItem) => ({
            ...item,
            menuItemId: item.menuItemId || item.itemId,
            itemId: item.menuItemId || item.itemId,
            quantity: item.quantity || 1,
            price: item.price || item.unitPrice || 0,
            unitPrice: item.price || item.unitPrice || 0,
            total: (item.price || item.unitPrice || 0) * (item.quantity || 1),
            subtotal: (item.price || item.unitPrice || 0) * (item.quantity || 1),
          })),
        }));
        
        setAllOrders(validatedOrders);
        
        // Fetch menu items for these orders
        await fetchMenuItemsForOrders(validatedOrders);
      } else {
        throw new Error(data.error || 'Failed to fetch reports');
      }
    } catch (error) {
      setApiError(error instanceof Error ? error.message : 'Failed to fetch reports');
    } finally {
      setIsLoading(false);
    }
  }, [filterType, fetchMenuItemsForOrders]);

  const updateTableSummaries = useCallback(() => {
    const tablesMap = new Map<string, TableSummary>();
    
    activeOrders.forEach(order => {
      if (currentWaitress && order.waiterId !== currentWaitress._id) return;
      
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
          status: 'active',
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
      
      const hasActiveOrder = order.status !== 'COMPLETED' && order.status !== 'CANCELLED';
      if (hasActiveOrder) {
        tableSummary.status = 'pending_payment';
      }
    });
    
    setTableSummaries(tablesMap);
  }, [activeOrders, currentWaitress]);

  const handleCloseTable = async (tableNumber: string) => {
    const tableSummary = tableSummaries.get(tableNumber);
    if (!tableSummary) return;
    
    const confirmed = window.confirm(
      `Close Table ${tableNumber}?\n\n` +
      `Total: ${formatCurrency(tableSummary.totalAmount)}\n` +
      `Orders: ${tableSummary.orders.length}\n` +
      `Customers: ${tableSummary.customerCount}\n\n` +
      `This will mark all orders as completed and remove them from active view.`
    );
    
    if (!confirmed) return;
    
    try {
      setIsLoading(true);
      
      const orderIds = tableSummary.orders.map(o => o._id);
      
      const response = await fetch("/api/order/update-calculated-status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderIds, calculated: true }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        const updatedAllOrders = allOrders.map(order => 
          orderIds.includes(order._id) ? { ...order, calculated: true } : order
        );
        setAllOrders(updatedAllOrders);
        
        alert(`✅ Table ${tableNumber} closed successfully!\nTotal collected: ${formatCurrency(tableSummary.totalAmount)}`);
      } else {
        alert(data.error || "Failed to close table");
      }
    } catch (error) {
      console.error("Error closing table:", error);
      alert("An error occurred while closing the table");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCalculateTotal = (tableNumber: string) => {
    const tableSummary = tableSummaries.get(tableNumber);
    if (tableSummary) {
      setSelectedTableForCalculation(tableNumber);
      setCalculatedTotal(tableSummary.totalAmount);
      setCalculateDialogOpen(true);
    }
  };

  const applyFilters = useCallback(() => {
    let filtered = [...enhancedAllOrders];
    
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(order => order.status?.toUpperCase() === selectedStatus.toUpperCase());
    }
    
    if (searchTerm) {
      filtered = filtered.filter(order => 
        order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.tableNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.orderItems?.some(item => item.name?.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    
    filtered.sort((a, b) => {
      const aVal = a[sortBy];
      const bVal = b[sortBy];
      
      if (sortBy === 'createdAt') {
        return sortOrder === 'asc' 
          ? new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
      }
      
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      
      return 0;
    });
    
    setFilteredOrders(filtered);
    setCurrentPage(1);
  }, [enhancedAllOrders, selectedStatus, searchTerm, sortBy, sortOrder]);

  const handleExport = () => {
    const exportData = filteredOrders.map(order => ({
      'Order Number': order.orderNumber,
      'Table': order.tableNumber || 'N/A',
      'Subtotal': order.totalAmount,
      'Discount': order.discount,
      'Tax': order.tax,
      'Final Amount': order.finalAmount,
      'Status': order.status,
      'Payment Method': order.paymentMethod,
      'Guests': order.numberOfGuests,
      'Items Count': order.orderItems?.length || 0,
      'Items Details': order.orderItems?.map(item => `${item.name} (${item.quantity}x @ ${formatCurrency(item.price)})`).join('; ') || '',
      'Date': new Date(order.createdAt).toLocaleDateString(),
      'Time': new Date(order.createdAt).toLocaleTimeString(),
      'Calculated': order.calculated ? 'Yes (Closed)' : 'No (Active)',
    }));
    
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "My Orders");
    XLSX.writeFile(workbook, `my_orders_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  const getTableItems = (tableNumber: string) => {
    const tableSummary = tableSummaries.get(tableNumber);
    if (!tableSummary) return [];
    
    const allItems = tableSummary.orders.flatMap(order => {
      const items = order.orderItems || order.items || [];
      return items.map(item => ({
        ...item,
        orderNumber: order.orderNumber,
        orderStatus: order.status,
        price: item.price || 0,
        total: (item.price || 0) * (item.quantity || 0),
      }));
    });
    
    const grouped = allItems.reduce((acc, item) => {
      const key = item.menuItemId || item.itemId || item.name;
      if (!acc[key]) {
        acc[key] = {
          menuItemId: item.menuItemId || item.itemId,
          name: item.name || 'Unknown Item',
          quantity: 0,
          total: 0,
          price: item.price || 0,
          orders: new Set<string>(),
          specialInstructions: item.specialInstructions,
        };
      }
      acc[key].quantity += item.quantity || 0;
      acc[key].total += (item.price || 0) * (item.quantity || 0);
      if (item.orderNumber) acc[key].orders.add(item.orderNumber);
      return acc;
    }, {} as Record<string, { 
      menuItemId?: string; 
      name: string; 
      quantity: number; 
      total: number; 
      price: number; 
      orders: Set<string>;
      specialInstructions?: string;
    }>);
    
    return Object.values(grouped);
  };

  // Calculate total items sold
  const getTotalItemsSold = () => {
    return filteredOrders.reduce((sum, order) => {
      const items = order.orderItems || order.items || [];
      return sum + items.reduce((itemSum, item) => itemSum + (item.quantity || 0), 0);
    }, 0);
  };

  // Calculate total discount
  const getTotalDiscount = () => {
    return filteredOrders.reduce((sum, order) => sum + (order.discount || 0), 0);
  };

  // Calculate total tax
  const getTotalTax = () => {
    return filteredOrders.reduce((sum, order) => sum + (order.tax || 0), 0);
  };

  useEffect(() => {
    if (status === 'authenticated' && !initialFetchDone.current) {
      initialFetchDone.current = true;
      fetchCurrentWaitress().then(waitress => {
        if (waitress?._id) {
          fetchOrders(waitress._id);
        } else {
          setIsLoading(false);
        }
      });
    }
  }, [status, fetchCurrentWaitress, fetchOrders]);

  useEffect(() => {
    updateTableSummaries();
  }, [activeOrders, updateTableSummaries]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  useEffect(() => {
    if (currentWaitress?._id) {
      fetchOrders(currentWaitress._id);
    }
  }, [filterType, currentWaitress, fetchOrders]);

  if (status === 'loading' || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-50 to-white">
        <div className="text-center px-4">
          <Loader2 className="h-12 w-12 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading your orders...</p>
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
  
  const totalSales = filteredOrders.reduce((sum, order) => sum + (order.finalAmount || 0), 0);
  const totalOrdersCount = filteredOrders.length;
  const totalItems = getTotalItemsSold();
  const totalGuests = filteredOrders.reduce((sum, order) => sum + (order.numberOfGuests || 1), 0);
  const totalDiscount = getTotalDiscount();
  const totalTax = getTotalTax();

  // Helper to get display items from order
  const getOrderDisplayItems = (order: Order) => {
    return order.orderItems || order.items || [];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50">
      <div className="p-4 md:p-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 md:mb-8">
          <div>
            <h1 className="text-2xl md:text-4xl font-bold bg-gradient-to-r from-purple-900 to-purple-600 bg-clip-text text-transparent">
              My Orders
            </h1>
            <p className="text-sm md:text-base text-gray-600 mt-1 md:mt-2">
              {currentWaitress?.name || session.user?.name} • {currentWaitress?.shift || ''} Shift
            </p>
          </div>
          <Button 
            onClick={() => currentWaitress?._id && fetchOrders(currentWaitress._id)} 
            variant="outline" 
            disabled={isLoading}
            className="border-purple-200 hover:bg-purple-50 hover:border-purple-300 w-full md:w-auto"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {apiError && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{apiError}</AlertDescription>
          </Alert>
        )}

        {loadingItems && (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-purple-600 mr-2" />
            <span className="text-sm text-gray-500">Loading menu items...</span>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2 bg-purple-100">
            <TabsTrigger value="overview" className="data-[state=active]:bg-purple-900 data-[state=active]:text-white text-sm md:text-base">
              <LayoutGrid className="h-4 w-4 mr-2" />
              Orders Report
            </TabsTrigger>
            <TabsTrigger value="tables" className="data-[state=active]:bg-purple-900 data-[state=active]:text-white text-sm md:text-base">
              <Utensils className="h-4 w-4 mr-2" />
              Active Tables
            </TabsTrigger>
          </TabsList>
            
          {/* Orders Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Filters Card */}
            <Card className="border-purple-100 shadow-lg">
              <CardHeader className="bg-purple-50 border-b border-purple-100">
                <CardTitle className="flex items-center gap-2 text-purple-900 text-lg md:text-xl">
                  <Filter className="h-5 w-5" />
                  Filter Orders Report
                </CardTitle>
                <CardDescription className="text-sm">
                  Showing all orders including closed tables for accurate sales reporting
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="flex flex-wrap gap-2 mb-6">
                  {['today', 'yesterday', 'week', 'month'].map(type => (
                    <Button
                      key={type}
                      variant={filterType === type ? "default" : "outline"}
                      onClick={() => setFilterType(type as any)}
                      className={filterType === type ? "bg-purple-900 hover:bg-purple-800" : "border-purple-200 hover:bg-purple-50"}
                      size={isMobile ? "sm" : "default"}
                    >
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </Button>
                  ))}
                  <Button 
                    onClick={handleExport} 
                    variant="outline" 
                    disabled={filteredOrders.length === 0}
                    className="border-purple-200 hover:bg-purple-50"
                    size={isMobile ? "sm" : "default"}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Export
                  </Button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-purple-900 text-sm">Search Orders</Label>
                    <div className="relative mt-1">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-purple-400" />
                      <Input
                        placeholder="Order #, Table, or Item name..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8 border-purple-200 focus:border-purple-500 focus:ring-purple-500 text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-purple-900 text-sm">Order Status</Label>
                    <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                      <SelectTrigger className="mt-1 border-purple-200 focus:ring-purple-500 text-sm">
                        <SelectValue placeholder="All Statuses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        {statusOptions.map(status => (
                          <SelectItem key={status} value={status}>{status}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="flex justify-end mt-4">
                  <Button 
                    onClick={() => {
                      setSearchTerm("");
                      setSelectedStatus("all");
                    }} 
                    variant="outline" 
                    size="sm"
                    className="border-purple-200 hover:bg-purple-50"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Clear Filters
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Stats Cards */}
            <div className="grid gap-3 md:gap-4 grid-cols-2 md:grid-cols-4">
              <Card className="border-purple-100 shadow-md hover:shadow-lg transition-shadow">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs md:text-sm font-medium text-purple-900">Total Revenue</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm md:text-2xl font-bold text-purple-900">{formatCurrency(totalSales)}</div>
                  <p className="text-xs text-gray-500">{totalOrdersCount} orders</p>
                </CardContent>
              </Card>
              <Card className="border-purple-100 shadow-md hover:shadow-lg transition-shadow">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs md:text-sm font-medium text-purple-900">Items Sold</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm md:text-2xl font-bold text-purple-900">{totalItems}</div>
                  <p className="text-xs text-gray-500">Total quantity</p>
                </CardContent>
              </Card>
              <Card className="border-purple-100 shadow-md hover:shadow-lg transition-shadow">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs md:text-sm font-medium text-purple-900">Total Discount</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm md:text-2xl font-bold text-red-600">{formatCurrency(totalDiscount)}</div>
                  <p className="text-xs text-gray-500">Applied discounts</p>
                </CardContent>
              </Card>
              <Card className="border-purple-100 shadow-md hover:shadow-lg transition-shadow">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs md:text-sm font-medium text-purple-900">Total Guests</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm md:text-2xl font-bold text-purple-900">{totalGuests}</div>
                  <p className="text-xs text-gray-500">Customers served</p>
                </CardContent>
              </Card>
            </div>

            {/* View Toggle */}
            <div className="flex justify-end">
              <div className="flex border rounded-lg p-1 bg-purple-50">
                <Button
                  variant={viewMode === "grid" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("grid")}
                  className={viewMode === "grid" ? "bg-purple-900 hover:bg-purple-800" : "hover:bg-purple-100"}
                >
                  <Grid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                  className={viewMode === "list" ? "bg-purple-900 hover:bg-purple-800" : "hover:bg-purple-100"}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Orders Display */}
            {filteredOrders.length === 0 ? (
              <Card className="border-purple-100">
                <CardContent className="py-12 text-center">
                  <CheckCircle className="h-12 w-12 mx-auto text-purple-300 mb-4" />
                  <p className="text-gray-500">No orders found for this period</p>
                </CardContent>
              </Card>
            ) : viewMode === "grid" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {paginatedOrders.map((order, index) => {
                  const displayItems = getOrderDisplayItems(order);
                  return (
                    <Card 
                      key={order._id || `${order.orderNumber}-${index}`} 
                      className={`hover:shadow-xl transition-all duration-300 border-purple-100 hover:border-purple-300 ${order.calculated ? 'opacity-75 bg-gray-50' : ''}`}
                    >
                      <CardHeader className="pb-2 bg-gradient-to-r from-purple-50 to-white">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <CardTitle className="text-base md:text-lg font-bold text-purple-900">#{order.orderNumber}</CardTitle>
                            <p className="text-xs text-gray-500 mt-1">
                              {new Date(order.createdAt).toLocaleString()}
                            </p>
                          </div>
                          <Badge className={`${getStatusColor(order.status)} font-medium text-xs`}>
                            {statusIcons[order.status as OrderStatus]}
                            <span className="ml-1 hidden sm:inline">{order.status}</span>
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-4">
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600">Table:</span>
                            <span className="font-medium text-purple-900">{order.tableNumber || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600">Guests:</span>
                            <span>{order.numberOfGuests}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600">Items:</span>
                            <span>{displayItems.reduce((sum, item) => sum + (item.quantity || 0), 0)} ({displayItems.length} types)</span>
                          </div>
                          
                          {/* Item preview */}
                          {displayItems.length > 0 && (
                            <div className="pt-2 border-t border-purple-100">
                              <p className="text-xs font-medium text-gray-500 mb-1">Items:</p>
                              <div className="space-y-1 max-h-24 overflow-y-auto">
                                {displayItems.slice(0, 3).map((item, idx) => (
                                  <div key={idx} className="flex justify-between text-xs">
                                    <span className="text-gray-600 truncate">{item.quantity}x {item.name || 'Loading...'}</span>
                                    <span className="font-medium">{formatCurrency((item.price || 0) * (item.quantity || 0))}</span>
                                  </div>
                                ))}
                                {displayItems.length > 3 && (
                                  <p className="text-xs text-purple-600">+{displayItems.length - 3} more items</p>
                                )}
                              </div>
                            </div>
                          )}
                          
                          <div className="pt-2 border-t border-purple-100">
                            <div className="flex justify-between items-center">
                              <span className="text-gray-600">Total:</span>
                              <span className="text-lg md:text-xl font-bold text-purple-900">{formatCurrency(order.finalAmount)}</span>
                            </div>
                            {order.calculated && (
                              <div className="mt-2 text-xs text-green-600 flex items-center justify-end gap-1">
                                <CheckCircle className="h-3 w-3" />
                                <span>Closed</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter className="bg-purple-50">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => setSelectedOrder(order)}
                          className="w-full border-purple-200 hover:bg-purple-100 hover:border-purple-300"
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </Button>
                      </CardFooter>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card className="border-purple-100 overflow-x-auto">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader className="bg-purple-50">
                      <TableRow>
                        <TableHead className="cursor-pointer text-purple-900 text-xs md:text-sm" onClick={() => setSortBy("orderNumber")}>
                          Order # {sortBy === "orderNumber" && (sortOrder === "asc" ? "↑" : "↓")}
                        </TableHead>
                        <TableHead className="cursor-pointer text-purple-900 text-xs md:text-sm" onClick={() => setSortBy("tableNumber")}>
                          Table {sortBy === "tableNumber" && (sortOrder === "asc" ? "↑" : "↓")}
                        </TableHead>
                        <TableHead className="text-purple-900 text-xs md:text-sm">Items (Qty)</TableHead>
                        <TableHead className="cursor-pointer text-purple-900 text-xs md:text-sm" onClick={() => setSortBy("finalAmount")}>
                          Amount {sortBy === "finalAmount" && (sortOrder === "asc" ? "↑" : "↓")}
                        </TableHead>
                        <TableHead className="cursor-pointer text-purple-900 text-xs md:text-sm" onClick={() => setSortBy("status")}>
                          Status {sortBy === "status" && (sortOrder === "asc" ? "↑" : "↓")}
                        </TableHead>
                        <TableHead className="cursor-pointer text-purple-900 text-xs md:text-sm" onClick={() => setSortBy("createdAt")}>
                          Date {sortBy === "createdAt" && (sortOrder === "asc" ? "↑" : "↓")}
                        </TableHead>
                        <TableHead className="text-purple-900 text-xs md:text-sm">Closed</TableHead>
                        <TableHead className="text-purple-900 text-xs md:text-sm">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedOrders.map((order, index) => {
                        const displayItems = getOrderDisplayItems(order);
                        return (
                          <TableRow key={order._id || `${order.orderNumber}-${index}`} className="hover:bg-purple-50">
                            <TableCell className="font-medium text-purple-900 text-xs md:text-sm">#{order.orderNumber}</TableCell>
                            <TableCell className="text-xs md:text-sm">{order.tableNumber || 'N/A'}</TableCell>
                            <TableCell className="text-xs md:text-sm">
                              {displayItems.map(item => `${item.name || 'Loading...'} (${item.quantity})`).join(', ') || '-'}
                            </TableCell>
                            <TableCell className="text-xs md:text-sm">{formatCurrency(order.finalAmount)}</TableCell>
                            <TableCell>
                              <Badge className={`${getStatusColor(order.status)} text-xs`}>{order.status}</Badge>
                            </TableCell>
                            <TableCell className="text-xs md:text-sm">{new Date(order.createdAt).toLocaleDateString()}</TableCell>
                            <TableCell>
                              {order.calculated ? (
                                <Badge className="bg-green-100 text-green-800 text-xs">Closed</Badge>
                              ) : (
                                <Badge className="bg-yellow-100 text-yellow-800 text-xs">Active</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <Button variant="ghost" size="sm" onClick={() => setSelectedOrder(order)} className="hover:bg-purple-100">
                                <Eye className="h-4 w-4 text-purple-600" />
                              </Button>
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
                <PaginationContent className="flex-wrap gap-1">
                  <PaginationItem>
                    <PaginationPrevious 
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      className="cursor-pointer hover:bg-purple-50 text-sm"
                    />
                  </PaginationItem>
                  {[...Array(Math.min(totalPages, 5))].map((_, i) => {
                    const pageNum = i + 1;
                    return (
                      <PaginationItem key={i}>
                        <PaginationLink 
                          onClick={() => setCurrentPage(pageNum)} 
                          isActive={currentPage === pageNum}
                          className={currentPage === pageNum ? "bg-purple-900 text-white hover:bg-purple-800" : "cursor-pointer hover:bg-purple-50"}
                        >
                          {pageNum}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  })}
                  {totalPages > 5 && (
                    <>
                      <PaginationItem>
                        <span className="px-2">...</span>
                      </PaginationItem>
                      <PaginationItem>
                        <PaginationLink 
                          onClick={() => setCurrentPage(totalPages)} 
                          isActive={currentPage === totalPages}
                          className={currentPage === totalPages ? "bg-purple-900 text-white hover:bg-purple-800" : "cursor-pointer hover:bg-purple-50"}
                        >
                          {totalPages}
                        </PaginationLink>
                      </PaginationItem>
                    </>
                  )}
                  <PaginationItem>
                    <PaginationNext 
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      className="cursor-pointer hover:bg-purple-50 text-sm"
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            )}
          </TabsContent>

          {/* Tables Tab */}
          <TabsContent value="tables" className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h2 className="text-xl md:text-2xl font-bold text-purple-900">Active Tables Management</h2>
                <p className="text-sm text-gray-600 mt-1">Manage active tables, calculate bills, and close tables</p>
              </div>
              <Button 
                onClick={() => currentWaitress?._id && fetchOrders(currentWaitress._id)} 
                variant="outline"
                className="border-purple-200 hover:bg-purple-50 w-full md:w-auto"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>

            {tableSummaries.size === 0 ? (
              <Card className="border-purple-100">
                <CardContent className="py-12 text-center">
                  <DoorOpen className="h-12 w-12 mx-auto text-purple-300 mb-4" />
                  <p className="text-gray-500">No active tables at the moment</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {Array.from(tableSummaries.values()).map((table, index) => {
                  const tableItems = getTableItems(table.tableNumber);
                  return (
                    <Card 
                      key={table.tableNumber || index} 
                      className={`border-l-8 ${table.status === 'pending_payment' ? 'border-l-yellow-500' : 'border-l-purple-600'} hover:shadow-xl transition-all duration-300`}
                    >
                      <CardHeader className="bg-gradient-to-r from-purple-50 to-white">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <CardTitle className="text-xl md:text-2xl font-bold text-purple-900">Table {table.tableNumber}</CardTitle>
                            <p className="text-xs text-gray-500 mt-1">
                              {table.orders.length} order(s) • {table.customerCount} guest(s)
                            </p>
                          </div>
                          <Badge className={table.status === 'pending_payment' ? "bg-yellow-500 text-white text-xs" : "bg-purple-600 text-white text-xs"}>
                            {table.status === 'active' ? 'Active' : 'Pending Payment'}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-4 space-y-4">
                        {/* Total Amount */}
                        <div className="text-center p-3 bg-purple-50 rounded-lg">
                          <p className="text-xs text-gray-600">Total Bill</p>
                          <p className="text-xl md:text-3xl font-bold text-purple-900">{formatCurrency(table.totalAmount)}</p>
                        </div>

                        {/* Items Summary */}
                        {tableItems.length > 0 && (
                          <div>
                            <p className="text-sm font-semibold text-purple-900 mb-2 flex items-center">
                              <ShoppingBag className="h-4 w-4 mr-1" />
                              Items Ordered
                            </p>
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                              {tableItems.map((item, idx) => (
                                <div key={idx} className="flex flex-col sm:flex-row justify-between items-start sm:items-center text-sm p-2 bg-gray-50 rounded gap-2">
                                  <div className="flex-1">
                                    <span className="font-medium">{item.name}</span>
                                    {item.specialInstructions && (
                                      <p className="text-xs text-gray-500 mt-0.5">Note: {item.specialInstructions}</p>
                                    )}
                                    <span className="text-xs text-gray-500 ml-2">({item.orders.size} orders)</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Badge variant="secondary" className="bg-purple-100 text-purple-900 text-xs">
                                      {item.quantity}x
                                    </Badge>
                                    <span className="font-medium text-purple-900 text-sm">{formatCurrency(item.price)}</span>
                                    <span className="text-gray-400">→</span>
                                    <span className="font-medium text-purple-900 text-sm">{formatCurrency(item.total)}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Orders List */}
                        {table.orders.length > 1 && (
                          <div>
                            <p className="text-sm font-semibold text-purple-900 mb-2 flex items-center">
                              <ReceiptText className="h-4 w-4 mr-1" />
                              Orders Summary
                            </p>
                            <div className="space-y-1 text-sm">
                              {table.orders.map((order, idx) => (
                                <div key={idx} className="flex justify-between items-center p-1">
                                  <span className="text-gray-600">#{order.orderNumber}</span>
                                  <Badge className={getStatusColor(order.status)} variant="outline">
                                    {order.status}
                                  </Badge>
                                  <span className="font-medium">{formatCurrency(order.finalAmount)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Time Info */}
                        <div className="text-xs text-gray-500 pt-2 border-t border-purple-100">
                          <p>First: {new Date(table.firstOrderTime).toLocaleTimeString()}</p>
                          <p>Last: {new Date(table.lastOrderTime).toLocaleTimeString()}</p>
                        </div>
                      </CardContent>
                      <CardFooter className="flex flex-col sm:flex-row gap-2 pt-4 border-t border-purple-100">
                        <Button 
                          variant="outline" 
                          className="flex-1 border-purple-200 hover:bg-purple-50 hover:border-purple-300"
                          onClick={() => handleCalculateTotal(table.tableNumber)}
                        >
                          <Calculator className="h-4 w-4 mr-2" />
                          Calculate
                        </Button>
                        <Button 
                          variant="destructive" 
                          className="flex-1 bg-red-600 hover:bg-red-700"
                          onClick={() => handleCloseTable(table.tableNumber)}
                        >
                          <DoorOpen className="h-4 w-4 mr-2" />
                          Close Table
                        </Button>
                      </CardFooter>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Order Details Dialog */}
        <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto w-[95vw] md:w-full">
            <DialogHeader>
              <DialogTitle className="text-xl md:text-2xl font-bold text-purple-900">Order #{selectedOrder?.orderNumber}</DialogTitle>
              <DialogDescription>
                {selectedOrder && new Date(selectedOrder.createdAt).toLocaleString()}
                {selectedOrder?.calculated && (
                  <Badge className="ml-2 bg-green-100 text-green-800">Closed Order</Badge>
                )}
              </DialogDescription>
            </DialogHeader>
            {selectedOrder && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-purple-50 rounded-lg text-sm">
                  <div><strong className="text-purple-900">Table:</strong> {selectedOrder.tableNumber || 'N/A'}</div>
                  <div><strong className="text-purple-900">Guests:</strong> {selectedOrder.numberOfGuests}</div>
                  <div>
                    <strong className="text-purple-900">Status:</strong> 
                    <Badge className={`ml-2 ${getStatusColor(selectedOrder.status)} text-xs`}>{selectedOrder.status}</Badge>
                  </div>
                  <div><strong className="text-purple-900">Payment:</strong> {selectedOrder.paymentMethod || 'CASH'}</div>
                  {selectedOrder.calculated && (
                    <div><strong className="text-purple-900">Closed:</strong> Yes</div>
                  )}
                </div>
                
                <Separator />
                
                <div>
                  <h4 className="font-semibold text-purple-900 mb-3 flex items-center text-base md:text-lg">
                    <ShoppingBag className="h-4 w-4 mr-2" />
                    Order Items
                  </h4>
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-purple-50">
                        <TableRow>
                          <TableHead className="text-purple-900 text-xs md:text-sm">Item</TableHead>
                          <TableHead className="text-center text-purple-900 text-xs md:text-sm">Qty</TableHead>
                          <TableHead className="text-right text-purple-900 text-xs md:text-sm">Unit Price</TableHead>
                          <TableHead className="text-right text-purple-900 text-xs md:text-sm">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(selectedOrder.orderItems || selectedOrder.items || []).map((item, i) => (
                          <TableRow key={i}>
                            <TableCell className="font-medium text-sm">
                              {item.name || 'Loading...'}
                              {item.specialInstructions && (
                                <p className="text-xs text-gray-500 mt-0.5">Note: {item.specialInstructions}</p>
                              )}
                            </TableCell>
                            <TableCell className="text-center text-sm">{item.quantity}</TableCell>
                            <TableCell className="text-right text-sm">{formatCurrency(item.price || 0)}</TableCell>
                            <TableCell className="text-right font-medium text-purple-900 text-sm">
                              {formatCurrency((item.price || 0) * (item.quantity || 0))}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-2 p-4 bg-gray-50 rounded-lg">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal:</span>
                    <span>{formatCurrency(selectedOrder.totalAmount)}</span>
                  </div>
                  {selectedOrder.discount > 0 && (
                    <div className="flex justify-between text-sm text-red-600">
                      <span>Discount:</span>
                      <span>-{formatCurrency(selectedOrder.discount)}</span>
                    </div>
                  )}
                  {selectedOrder.tax > 0 && (
                    <div className="flex justify-between text-sm">
                      <span>Tax:</span>
                      <span>{formatCurrency(selectedOrder.tax)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-base md:text-lg pt-2 border-t">
                    <span className="text-purple-900">Total Amount:</span>
                    <span className="text-purple-900">{formatCurrency(selectedOrder.finalAmount)}</span>
                  </div>
                </div>
                
                {selectedOrder.specialRequirements && (
                  <>
                    <Separator />
                    <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200 text-sm">
                      <strong className="text-yellow-800">📝 Special Notes:</strong>
                      <p className="mt-1 text-gray-700">{selectedOrder.specialRequirements}</p>
                    </div>
                  </>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Calculate Total Dialog */}
        <Dialog open={calculateDialogOpen} onOpenChange={setCalculateDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto w-[95vw] md:w-full">
            <DialogHeader>
              <DialogTitle className="text-xl md:text-2xl font-bold text-purple-900 flex items-center">
                <ReceiptText className="h-5 w-5 md:h-6 md:w-6 mr-2" />
                Table {selectedTableForCalculation} - Bill Summary
              </DialogTitle>
            </DialogHeader>
            {selectedTableForCalculation && tableSummaries.get(selectedTableForCalculation) && (
              <div className="space-y-4">
                {/* Stats */}
                <div className="grid grid-cols-2 gap-3 p-4 bg-purple-50 rounded-lg">
                  <div className="text-center">
                    <p className="text-xs text-gray-600">Total Orders</p>
                    <p className="text-lg md:text-2xl font-bold text-purple-900">
                      {tableSummaries.get(selectedTableForCalculation)?.orders.length}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-600">Customers Served</p>
                    <p className="text-lg md:text-2xl font-bold text-purple-900">
                      {tableSummaries.get(selectedTableForCalculation)?.customerCount}
                    </p>
                  </div>
                </div>

                {/* Items Breakdown */}
                {(() => {
                  const items = getTableItems(selectedTableForCalculation);
                  if (items.length === 0) return null;
                  return (
                    <div>
                      <h4 className="font-semibold text-purple-900 mb-3 flex items-center text-base md:text-lg">
                        <ShoppingBag className="h-4 w-4 mr-2" />
                        Items Ordered
                      </h4>
                      <div className="rounded-md border overflow-x-auto">
                        <Table>
                          <TableHeader className="bg-purple-50">
                            <TableRow>
                              <TableHead className="text-purple-900 text-xs md:text-sm">Item</TableHead>
                              <TableHead className="text-center text-purple-900 text-xs md:text-sm">Quantity</TableHead>
                              <TableHead className="text-right text-purple-900 text-xs md:text-sm">Unit Price</TableHead>
                              <TableHead className="text-right text-purple-900 text-xs md:text-sm">Total</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {items.map((item, idx) => (
                              <TableRow key={idx}>
                                <TableCell className="text-sm">
                                  <div>
                                    <span className="font-medium">{item.name}</span>
                                    {item.specialInstructions && (
                                      <p className="text-xs text-gray-500 mt-0.5">Note: {item.specialInstructions}</p>
                                    )}
                                    <p className="text-xs text-gray-500">From {item.orders.size} order(s)</p>
                                  </div>
                                </TableCell>
                                <TableCell className="text-center">
                                  <Badge variant="secondary" className="bg-purple-100 text-purple-900 text-xs">
                                    {item.quantity}x
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right text-sm">{formatCurrency(item.price)}</TableCell>
                                <TableCell className="text-right font-medium text-purple-900 text-sm">
                                  {formatCurrency(item.total)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  );
                })()}

                {/* Orders Breakdown */}
                <div>
                  <h4 className="font-semibold text-purple-900 mb-3 flex items-center text-base md:text-lg">
                    <ReceiptText className="h-4 w-4 mr-2" />
                    Orders Breakdown
                  </h4>
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {tableSummaries.get(selectedTableForCalculation)?.orders.map((order, idx) => {
                      const displayItems = order.orderItems || order.items || [];
                      return (
                        <Card key={order._id || idx} className="border-purple-100">
                          <CardHeader className="pb-2 bg-purple-50">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                              <CardTitle className="text-sm md:text-md font-bold text-purple-900">Order #{order.orderNumber}</CardTitle>
                              <Badge className={getStatusColor(order.status)}>{order.status}</Badge>
                            </div>
                            <p className="text-xs text-gray-500">{new Date(order.createdAt).toLocaleTimeString()}</p>
                          </CardHeader>
                          <CardContent className="pt-3">
                            <div className="space-y-2">
                              {displayItems.map((item, itemIdx) => (
                                <div key={itemIdx} className="flex flex-col sm:flex-row justify-between items-start sm:items-center text-sm gap-1">
                                  <div className="flex-1">
                                    <span className="font-medium">{item.name || 'Loading...'}</span>
                                    {item.specialInstructions && (
                                      <p className="text-xs text-gray-500">Note: {item.specialInstructions}</p>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <span className="text-gray-500 text-xs">{item.quantity}x</span>
                                    <span className="font-medium">{formatCurrency((item.price || 0) * (item.quantity || 0))}</span>
                                  </div>
                                </div>
                              ))}
                              <Separator className="my-2" />
                              <div className="flex justify-between font-bold text-sm">
                                <span>Order Total:</span>
                                <span className="text-purple-900">{formatCurrency(order.finalAmount)}</span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>

                {/* Grand Total */}
                <div className="bg-gradient-to-r from-purple-900 to-purple-700 p-4 rounded-lg">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <div>
                      <p className="text-white text-base md:text-lg font-semibold">GRAND TOTAL</p>
                      <p className="text-purple-200 text-xs">To be collected from Table {selectedTableForCalculation}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl md:text-3xl font-bold text-white">{formatCurrency(calculatedTotal)}</p>
                      <p className="text-purple-200 text-xs">Including tax & discounts</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={() => setCalculateDialogOpen(false)} className="w-full sm:w-auto">
                Close
              </Button>
              <Button onClick={() => window.print()} className="bg-purple-900 hover:bg-purple-800 w-full sm:w-auto">
                <ReceiptText className="h-4 w-4 mr-2" />
                Print Bill
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}