"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Search, 
  Filter, 
  Download, 
  Calendar,
  Clock,
  Package,
  CheckCircle,
  XCircle,
  Clock4,
  ChefHat,
  Truck,
  AlertCircle,
  RefreshCw,
  CreditCard,
  MapPin,
  Eye,
  ShoppingCart,
  FileText
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

// Utility functions
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'BIRR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

const cn = (...classes: (string | boolean | undefined | null)[]): string => {
  return classes.filter(Boolean).join(' ');
};

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
  total?: number;
  image?: string;
}

interface Order {
  id: string;
  orderNumber: string;
  date: string;
  datetime: string;
  total: number;
  subtotal?: number;
  tax?: number;
  deliveryFee?: number;
  discount?: number;
  notes?: string | null;
  status: 'completed' | 'pending' | 'cancelled' | 'preparing' | 'delivered';
  paymentMethod: string;
  deliveryAddress: string;
  items: OrderItem[];
}

interface ApiResponse {
  orders: Order[];
  count: number;
  success: boolean;
  message?: string;
  error?: string;
  details?: string;
}

export default function OrdersPage() {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  useEffect(() => {
    if (sessionStatus === 'authenticated') {
      fetchOrders();
    } else if (sessionStatus === 'unauthenticated') {
      setLoading(false);
      setError('Please sign in to view your orders');
    }
  }, [sessionStatus]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      setErrorDetails(null);
      
      console.log('Fetching orders from API...');
      const response = await fetch('/api/user/orders', {
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      console.log('API Response status:', response.status);
      
      if (!response.ok) {
        let errorMessage = `Server error: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
          if (errorData.details) {
            setErrorDetails(errorData.details);
          }
        } catch (e) {
          // Could not parse JSON response
        }
        throw new Error(errorMessage);
      }
      
      const data: ApiResponse = await response.json();
      console.log('API Response data:', data);
      
      if (data.success) {
        setOrders(data.orders || []);
        if (data.message) {
          console.log('API Message:', data.message);
        }
      } else {
        throw new Error(data.error || data.message || 'Failed to load orders');
      }
    } catch (error) {
      console.error('Error in fetchOrders:', error);
      setError(error instanceof Error ? error.message : 'An error occurred while fetching orders');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': 
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'delivered':
        return <Truck className="h-4 w-4 text-green-500" />;
      case 'pending': 
        return <Clock4 className="h-4 w-4 text-yellow-600" />;
      case 'preparing': 
        return <ChefHat className="h-4 w-4 text-blue-600" />;
      case 'cancelled': 
        return <XCircle className="h-4 w-4 text-red-600" />;
      default: 
        return <Package className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': 
        return 'bg-green-50 text-green-700 border-green-200';
      case 'delivered':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'pending': 
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'preparing': 
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'cancelled': 
        return 'bg-red-50 text-red-700 border-red-200';
      default: 
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const filterOrders = () => {
    let filtered = orders;

    // Filter by search
    if (search) {
      filtered = filtered.filter(order => 
        order.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
        order.items.some(item => 
          item.name.toLowerCase().includes(search.toLowerCase())
        ) ||
        order.paymentMethod.toLowerCase().includes(search.toLowerCase()) ||
        order.deliveryAddress.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.status === statusFilter);
    }

    // Filter by date
    if (dateFilter !== 'all') {
      const now = new Date();
      filtered = filtered.filter(order => {
        const orderDate = new Date(order.datetime);
        
        switch (dateFilter) {
          case 'week':
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(now.getDate() - 7);
            return orderDate >= oneWeekAgo;
          case 'month':
            const oneMonthAgo = new Date();
            oneMonthAgo.setMonth(now.getMonth() - 1);
            return orderDate >= oneMonthAgo;
          case 'year':
            const oneYearAgo = new Date();
            oneYearAgo.setFullYear(now.getFullYear() - 1);
            return orderDate >= oneYearAgo;
          default:
            return true;
        }
      });
    }

    return filtered;
  };

  const filteredOrders = filterOrders();

  const handleReorder = async (order: Order) => {
    try {
      // Store the order items in localStorage for reorder
      const reorderData = {
        items: order.items.map(item => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          image: item.image
        })),
        total: order.total,
        fromOrderId: order.id
      };
      
      localStorage.setItem('reorderData', JSON.stringify(reorderData));
      
      // Navigate to menu page with reorder flag
      router.push('/menu?reorder=true');
      
    } catch (error) {
      console.error('Error reordering:', error);
    }
  };

  const handleViewDetails = (order: Order) => {
    setSelectedOrder(order);
    setIsDetailsOpen(true);
  };

  const handleExportOrders = () => {
    if (orders.length === 0) return;
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Order Number,Date,Status,Total,Payment Method,Delivery Address,Items\n"
      + orders.map(order => 
          `${order.orderNumber},"${order.date}",${order.status},$${order.total.toFixed(2)},"${order.paymentMethod}","${order.deliveryAddress}","${order.items.map(item => `${item.name} (x${item.quantity})`).join(', ')}"`
        ).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `orders_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getTotalStats = () => {
    const totalOrders = orders.length;
    const totalSpent = orders.reduce((sum, order) => sum + order.total, 0);
    const pendingOrders = orders.filter(o => ['pending', 'preparing'].includes(o.status)).length;
    const completedOrders = orders.filter(o => ['completed', 'delivered'].includes(o.status)).length;
    
    return { totalOrders, totalSpent, pendingOrders, completedOrders };
  };

  // Handle session loading
  if (sessionStatus === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        <div className="text-center">
          <p className="font-medium">Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (sessionStatus === 'unauthenticated') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <div className="text-center">
          <h3 className="text-lg font-semibold">Authentication Required</h3>
          <p className="text-muted-foreground mt-1">Please sign in to view your orders</p>
        </div>
        <Button onClick={() => router.push('/auth/signin')}>
          Sign In
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        <div className="text-center">
          <p className="font-medium">Loading your orders</p>
          <p className="text-sm text-muted-foreground mt-1">Please wait while we fetch your order history</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4 p-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <div className="text-center">
          <h3 className="text-lg font-semibold">Error Loading Orders</h3>
          <p className="text-muted-foreground mt-1">{error}</p>
          {errorDetails && (
            <div className="mt-2 p-3 bg-gray-100 rounded-md text-sm text-left">
              <p className="font-medium">Debug Details:</p>
              <p className="text-xs mt-1 font-mono break-all">{errorDetails}</p>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Button onClick={handleRefresh} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
          <Button onClick={() => router.push('/menu')}>
            <ShoppingCart className="h-4 w-4 mr-2" />
            Browse Menu
          </Button>
        </div>
      </div>
    );
  }

  const stats = getTotalStats();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Order History</h1>
          <p className="text-muted-foreground">
            {orders.length === 0 
              ? 'No orders yet' 
              : `You have ${orders.length} order${orders.length !== 1 ? 's' : ''} in total`}
          </p>
        </div>
        <div className="flex gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={handleRefresh}
                  disabled={refreshing}
                >
                  <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Refresh orders</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          {orders.length > 0 && (
            <Button onClick={handleExportOrders}>
              <Download className="h-4 w-4 mr-2" />
              Export Orders
            </Button>
          )}
          <Button 
            onClick={() => router.push('/menu')}
            variant="outline"
          >
            <ShoppingCart className="h-4 w-4 mr-2" />
            Browse Menu
          </Button>
        </div>
      </div>

      {/* Stats */}
      {orders.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Orders</p>
                  <p className="text-2xl font-bold">{stats.totalOrders}</p>
                </div>
                <Package className="h-8 w-8 text-primary/50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Spent</p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(stats.totalSpent)}
                  </p>
                </div>
                <div className="h-8 w-8 bg-primary/10 rounded-full flex items-center justify-center">
                  <span className="text-sm font-bold text-primary">$</span>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active Orders</p>
                  <p className="text-2xl font-bold">{stats.pendingOrders}</p>
                </div>
                <Clock4 className="h-8 w-8 text-yellow-500/50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Completed</p>
                  <p className="text-2xl font-bold">{stats.completedOrders}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500/50" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by order #, item name, payment, address..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="preparing">Preparing</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <Calendar className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Date range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="week">Last 7 Days</SelectItem>
                  <SelectItem value="month">Last 30 Days</SelectItem>
                  <SelectItem value="year">Last Year</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Package className="h-12 w-12 mx-auto text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">No Orders Found</h3>
            <p className="text-muted-foreground mt-2">
              {orders.length === 0 
                ? 'You haven\'t placed any orders yet. Start by browsing our menu!' 
                : 'No orders match your search criteria. Try adjusting your filters.'}
            </p>
            {orders.length === 0 && (
              <Button 
                onClick={() => router.push('/menu')}
                className="mt-4"
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                Browse Menu
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <Card key={order.id} className="hover:shadow-md transition-shadow duration-200 overflow-hidden">
              <CardContent className="p-0">
                <div className="p-6">
                  {/* Order Header */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <h3 className="font-bold text-lg">Order #{order.orderNumber}</h3>
                        <Badge 
                          variant="outline" 
                          className={cn(
                            getStatusColor(order.status),
                            "flex items-center gap-1 border"
                          )}
                        >
                          {getStatusIcon(order.status)}
                          <span className="font-medium">{getStatusText(order.status)}</span>
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>{order.date}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{order.items.length} item{order.items.length !== 1 ? 's' : ''}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <CreditCard className="h-3 w-3" />
                          <span>{order.paymentMethod}</span>
                        </div>
                        {order.deliveryAddress && order.deliveryAddress !== 'Not specified' && (
                          <div className="flex items-center gap-1 truncate max-w-[200px]">
                            <MapPin className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate" title={order.deliveryAddress}>
                              {order.deliveryAddress}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className="text-2xl font-bold">{formatCurrency(order.total)}</div>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleViewDetails(order)}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          Details
                        </Button>
                        {(order.status === 'completed' || order.status === 'delivered') && (
                          <Button 
                            size="sm"
                            onClick={() => handleReorder(order)}
                          >
                            <ShoppingCart className="h-3 w-3 mr-1" />
                            Reorder
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Order Items Preview */}
                  {order.items.length > 0 && (
                    <div className="border-t pt-4">
                      <h4 className="text-sm font-medium text-muted-foreground mb-3">Order Items</h4>
                      <div className="space-y-3">
                        {order.items.slice(0, 3).map((item, index) => (
                          <div key={index} className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {item.image && item.image !== '/placeholder-food.jpg' ? (
                                <div className="h-10 w-10 rounded-md overflow-hidden border">
                                  <img 
                                    src={item.image} 
                                    alt={item.name}
                                    className="h-full w-full object-cover"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).src = '/placeholder-food.jpg';
                                    }}
                                  />
                                </div>
                              ) : (
                                <div className="h-10 w-10 rounded-md bg-gray-100 border flex items-center justify-center">
                                  <Package className="h-5 w-5 text-gray-400" />
                                </div>
                              )}
                              <div>
                                <p className="font-medium text-sm">{item.name}</p>
                                <p className="text-xs text-muted-foreground">Quantity: {item.quantity}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-medium">{formatCurrency(item.price)}</p>
                              <p className="text-xs text-muted-foreground">
                                Total: {formatCurrency(item.total || item.quantity * item.price)}
                              </p>
                            </div>
                          </div>
                        ))}
                        {order.items.length > 3 && (
                          <div className="text-center pt-2">
                            <p className="text-sm text-muted-foreground">
                              +{order.items.length - 3} more item{order.items.length - 3 !== 1 ? 's' : ''}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Order Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Order Details #{selectedOrder?.orderNumber}</DialogTitle>
            <DialogDescription>
              Placed on {selectedOrder?.date} at {selectedOrder?.datetime ? new Date(selectedOrder.datetime).toLocaleTimeString() : ''}
            </DialogDescription>
          </DialogHeader>
          
          {selectedOrder && (
            <div className="space-y-6">
              {/* Order Notes */}
              {selectedOrder.notes && (
                <div className="space-y-2">
                  <h4 className="font-medium text-sm text-muted-foreground flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    <span>Order Notes</span>
                  </h4>
                  <div className="bg-muted/30 p-3 rounded-lg text-sm">
                    <p className="whitespace-pre-wrap">{selectedOrder.notes}</p>
                  </div>
                </div>
              )}
              {/* Status and Info */}
              <div className="flex flex-wrap gap-4 justify-between items-start bg-muted/30 p-4 rounded-lg">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                  <Badge className={cn(getStatusColor(selectedOrder.status), "flex w-fit items-center gap-1 border")}>
                    {getStatusIcon(selectedOrder.status)}
                    <span>{getStatusText(selectedOrder.status)}</span>
                  </Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Payment Method</p>
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{selectedOrder.paymentMethod}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Delivery Address</p>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="max-w-[250px] truncate font-medium" title={selectedOrder.deliveryAddress}>
                      {selectedOrder.deliveryAddress}
                    </span>
                  </div>
                </div>
              </div>

              {/* Items List */}
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-muted/50 p-3 border-b text-sm font-medium grid grid-cols-12 gap-4">
                  <div className="col-span-6">Item</div>
                  <div className="col-span-2 text-center">Qty</div>
                  <div className="col-span-2 text-right">Price</div>
                  <div className="col-span-2 text-right">Total</div>
                </div>
                <div className="divide-y">
                  {selectedOrder.items.map((item, idx) => (
                    <div key={idx} className="p-3 grid grid-cols-12 gap-4 items-center text-sm">
                      <div className="col-span-6 flex items-center gap-3">
                        {item.image && item.image !== '/placeholder-food.jpg' ? (
                          <div className="h-10 w-10 rounded-md overflow-hidden border flex-shrink-0">
                            <img 
                              src={item.image} 
                              alt={item.name}
                              className="h-full w-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = '/placeholder-food.jpg';
                              }}
                            />
                          </div>
                        ) : (
                          <div className="h-10 w-10 rounded-md bg-gray-100 border flex items-center justify-center flex-shrink-0">
                            <Package className="h-5 w-5 text-gray-400" />
                          </div>
                        )}
                        <span className="font-medium">{item.name}</span>
                      </div>
                      <div className="col-span-2 text-center">{item.quantity}</div>
                      <div className="col-span-2 text-right">{formatCurrency(item.price)}</div>
                      <div className="col-span-2 text-right font-medium">{formatCurrency(item.total || item.quantity * item.price)}</div>
                    </div>
                  ))}
                </div>
                <div className="bg-muted/50 p-4 border-t">
                  <div className="w-full sm:w-1/2 ml-auto space-y-2">
                    <div className="flex justify-between text-sm">
                      <p className="text-muted-foreground">Subtotal</p>
                      <p className="font-medium">{formatCurrency(selectedOrder.subtotal ?? selectedOrder.items.reduce((acc, item) => acc + (item.total || item.quantity * item.price), 0))}</p>
                    </div>
                    {selectedOrder.deliveryFee && selectedOrder.deliveryFee > 0 && (
                      <div className="flex justify-between text-sm">
                        <p className="text-muted-foreground">Delivery Fee</p>
                        <p className="font-medium">{formatCurrency(selectedOrder.deliveryFee)}</p>
                      </div>
                    )}
                    {selectedOrder.tax && selectedOrder.tax > 0 && (
                      <div className="flex justify-between text-sm">
                        <p className="text-muted-foreground">Tax</p>
                        <p className="font-medium">{formatCurrency(selectedOrder.tax)}</p>
                      </div>
                    )}
                    {selectedOrder.discount && selectedOrder.discount > 0 && (
                      <div className="flex justify-between text-sm text-green-600">
                        <p>Discount</p>
                        <p className="font-medium">-{formatCurrency(selectedOrder.discount)}</p>
                      </div>
                    )}
                    <div className="border-t my-2 !mt-3 !mb-3"></div>
                    <div className="flex justify-between text-base font-bold">
                      <p>Total</p>
                      <p className="text-primary text-lg">{formatCurrency(selectedOrder.total)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}