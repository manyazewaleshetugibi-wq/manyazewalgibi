"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  Bell, 
  BellRing, 
  Truck, 
  UtensilsCrossed, 
  Clock, 
  CheckCircle, 
  XCircle,
  AlertCircle,
  MessageSquare,
  Package,
  User,
  Settings,
  Filter,
  BellOff,
  RefreshCw,
  Loader2,
  Gift,
  AlertTriangle,
  TrendingUp,
  ShoppingBag,
  CreditCard,
  Star,
  Award,
  Receipt,
  Users,
  Home,
  Coffee
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Notification {
  id: string;
  type: 'delivery' | 'table' | 'system' | 'message' | 'order' | 'points';
  title: string;
  description: string;
  time: string;
  read: boolean;
  priority: 'high' | 'medium' | 'low';
  action?: {
    label: string;
    type: string;
    orderId?: string;
    onClick: () => void;
  };
  meta?: {
    orderId?: string;
    orderNumber?: string;
    status?: string;
    tableNumber?: string;
    customerName?: string;
    deliveryTime?: string;
    estimatedTime?: string;
    items?: string[];
    points?: number;
    totalPoints?: number;
    milestone?: number;
    cancellationReason?: string;
    refundStatus?: string;
    delayReason?: string;
    newEstimatedTime?: string;
    transactionId?: string;
    totalAmount?: number;
  };
}

interface NotificationsResponse {
  success: boolean;
  data?: {
    notifications: Notification[];
    stats: {
      unreadCount: number;
      deliveryCount: number;
      tableCount: number;
      orderCount: number;
      pointsCount: number;
      warningCount: number;
      total: number;
      orderStats: {
        totalOrders: number;
        activeOrders: number;
        cancelledOrders: number;
        deliveredOrders: number;
      };
    };
  };
  error?: string;
  message?: string;
}

export default function NotificationsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [stats, setStats] = useState({
    unreadCount: 0,
    deliveryCount: 0,
    tableCount: 0,
    orderCount: 0,
    pointsCount: 0,
    warningCount: 0,
    total: 0,
    orderStats: {
      totalOrders: 0,
      activeOrders: 0,
      cancelledOrders: 0,
      deliveredOrders: 0
    }
  });
  const [settings, setSettings] = useState({
    deliveryNotifications: true,
    tableNotifications: true,
    orderNotifications: true,
    messageNotifications: true,
    systemNotifications: true,
    pointsNotifications: true,
    soundEnabled: true,
    vibrationEnabled: true
  });

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/user/notifications');
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data: NotificationsResponse = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch notifications');
      }
      
      if (data.data) {
        // Process notifications
        const processedNotifications = data.data.notifications.map(notif => ({
          ...notif,
          time: getRelativeTime(notif.time),
          action: notif.action ? {
            ...notif.action,
            onClick: () => handleNotificationAction(notif)
          } : undefined
        }));
        
        setNotifications(processedNotifications);
        setStats(data.data.stats);
      }
      
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast({
        title: "Error",
        description: "Failed to load notifications",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (session?.user) {
      fetchNotifications();
      
      // Set up polling for real-time updates (every 60 seconds)
      const interval = setInterval(() => {
        fetchNotifications();
      }, 60000);
      
      return () => clearInterval(interval);
    }
  }, [session]);

  const getRelativeTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
      
      if (diffInSeconds < 60) return 'Just now';
      if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} min ago`;
      if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hour${Math.floor(diffInSeconds / 3600) > 1 ? 's' : ''} ago`;
      if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} day${Math.floor(diffInSeconds / 86400) > 1 ? 's' : ''} ago`;
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: new Date().getFullYear() !== date.getFullYear() ? 'numeric' : undefined
      });
    } catch (error) {
      return 'Recent';
    }
  };

  const handleNotificationAction = (notification: Notification) => {
    switch (notification.action?.type) {
      case 'view_order':
        if (notification.meta?.orderId) {
          router.push(`/user/user/user/user//user/dashboard/order/${notification.meta.orderId}`);
        } else {
          router.push('/user/dashboard/order');
        }
        break;
      case 'track_order':
        toast({
          title: "Tracking Order",
          description: `Opening tracking for order ${notification.meta?.orderNumber}`,
        });
        // In a real app, this would open tracking
        break;
      case 'contact_support':
        router.push('/support');
        break;
      case 'retry_order':
        toast({
          title: "Retrying Order",
          description: "Redirecting to order page...",
        });
        router.push('/menu');
        break;
      case 'view_points':
        router.push('/dashboard/points');
        break;
      default:
        // Default action
        if (notification.type === 'delivery') {
          toast({
            title: "Delivery Details",
            description: `Viewing delivery for order ${notification.meta?.orderNumber}`,
          });
        } else if (notification.type === 'table') {
          toast({
            title: "Table Service",
            description: `Managing table ${notification.meta?.tableNumber}`,
          });
        }
        break;
    }
  };

  const markAsRead = async (id: string) => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notificationId: id, read: true })
      });
      
      if (!response.ok) throw new Error('Failed to mark as read');
      
      setNotifications(prev =>
        prev.map(notification =>
          notification.id === id ? { ...notification, read: true } : notification
        )
      );
      
      // Update stats
      setStats(prev => ({
        ...prev,
        unreadCount: Math.max(0, prev.unreadCount - 1)
      }));
      
      toast({
        title: "Marked as read",
        description: "Notification has been marked as read",
      });
    } catch (error) {
      console.error('Error marking as read:', error);
      toast({
        title: "Error",
        description: "Failed to mark notification as read",
        variant: "destructive",
      });
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter(n => !n.read);
      
      // Mark each unread notification
      for (const notification of unreadNotifications) {
        await fetch('/api/notifications', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ notificationId: notification.id, read: true })
        });
      }
      
      setNotifications(prev =>
        prev.map(notification => ({ ...notification, read: true }))
      );
      
      // Reset all unread counts
      setStats(prev => ({
        ...prev,
        unreadCount: 0,
        deliveryCount: 0,
        tableCount: 0,
        orderCount: 0,
        pointsCount: 0,
        warningCount: 0
      }));
      
      toast({
        title: "All marked as read",
        description: "All notifications have been marked as read",
      });
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast({
        title: "Error",
        description: "Failed to mark all notifications as read",
        variant: "destructive",
      });
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      const response = await fetch(`/api/notifications?id=${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) throw new Error('Failed to delete notification');
      
      const notificationToDelete = notifications.find(n => n.id === id);
      setNotifications(prev => prev.filter(notification => notification.id !== id));
      
      // Update stats if notification was unread
      if (notificationToDelete && !notificationToDelete.read) {
        setStats(prev => ({
          ...prev,
          unreadCount: Math.max(0, prev.unreadCount - 1),
          total: Math.max(0, prev.total - 1)
        }));
      } else {
        setStats(prev => ({
          ...prev,
          total: Math.max(0, prev.total - 1)
        }));
      }
      
      toast({
        title: "Deleted",
        description: "Notification has been deleted",
      });
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast({
        title: "Error",
        description: "Failed to delete notification",
        variant: "destructive",
      });
    }
  };

  const clearAllNotifications = async () => {
    try {
      const response = await fetch('/api/notifications?deleteAll=true', {
        method: 'DELETE',
      });
      
      if (!response.ok) throw new Error('Failed to clear all notifications');
      
      setNotifications([]);
      setStats({
        unreadCount: 0,
        deliveryCount: 0,
        tableCount: 0,
        orderCount: 0,
        pointsCount: 0,
        warningCount: 0,
        total: 0,
        orderStats: {
          totalOrders: 0,
          activeOrders: 0,
          cancelledOrders: 0,
          deliveredOrders: 0
        }
      });
      
      toast({
        title: "Cleared all",
        description: "All notifications have been cleared",
      });
    } catch (error) {
      console.error('Error clearing all notifications:', error);
      toast({
        title: "Error",
        description: "Failed to clear all notifications",
        variant: "destructive",
      });
    }
  };

  const toggleSetting = (key: keyof typeof settings) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
    toast({
      title: "Settings updated",
      description: `Notification setting updated`,
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return <AlertTriangle className="h-4 w-4" />;
      case 'medium': return <AlertCircle className="h-4 w-4" />;
      case 'low': return <Bell className="h-4 w-4" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'delivery': return <Truck className="h-5 w-5" />;
      case 'table': return <UtensilsCrossed className="h-5 w-5" />;
      case 'order': return <Package className="h-5 w-5" />;
      case 'message': return <MessageSquare className="h-5 w-5" />;
      case 'system': return <AlertCircle className="h-5 w-5" />;
      case 'points': return <Gift className="h-5 w-5" />;
      default: return <Bell className="h-5 w-5" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'delivery': return 'bg-blue-100 text-blue-700';
      case 'table': return 'bg-green-100 text-green-700';
      case 'order': return 'bg-purple-100 text-purple-700';
      case 'message': return 'bg-amber-100 text-amber-700';
      case 'system': return 'bg-rose-100 text-rose-700';
      case 'points': return 'bg-emerald-100 text-emerald-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusBadge = (status?: string) => {
    if (!status) return null;
    
    switch (status.toLowerCase()) {
      case 'confirmed':
      case 'pending':
        return <Badge className="bg-blue-100 text-blue-700">Confirmed</Badge>;
      case 'preparing':
        return <Badge className="bg-yellow-100 text-yellow-700">Preparing</Badge>;
      case 'ready':
        return <Badge className="bg-green-100 text-green-700">Ready</Badge>;
      case 'delivered':
      case 'completed':
        return <Badge className="bg-emerald-100 text-emerald-700">Delivered</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-100 text-red-700">Cancelled</Badge>;
      case 'failed':
      case 'rejected':
        return <Badge className="bg-red-100 text-red-700">Failed</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-700">{status}</Badge>;
    }
  };

  const filteredNotifications = notifications.filter(notification => {
    if (activeTab === 'all') return true;
    if (activeTab === 'unread') return !notification.read;
    if (activeTab === 'warning') return notification.priority === 'high';
    return notification.type === activeTab;
  });

  const deliveryNotifications = notifications.filter(n => n.type === 'delivery');
  const tableNotifications = notifications.filter(n => n.type === 'table');
  const orderNotifications = notifications.filter(n => n.type === 'order');
  const messageNotifications = notifications.filter(n => n.type === 'message');
  const systemNotifications = notifications.filter(n => n.type === 'system');
  const pointsNotifications = notifications.filter(n => n.type === 'points');
  const warningNotifications = notifications.filter(n => n.priority === 'high');

  if (loading && notifications.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-lg">Loading notifications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BellRing className="h-8 w-8" />
            Notifications
          </h1>
          <p className="text-muted-foreground mt-1">
            Real-time updates for your orders, points, and restaurant activities
          </p>
        </div>
        <div className="flex items-center gap-3">
          {stats.unreadCount > 0 && (
            <Badge variant="destructive" className="px-3 py-1">
              {stats.unreadCount} unread
            </Badge>
          )}
          {stats.warningCount > 0 && (
            <Badge variant="outline" className="px-3 py-1 border-red-500 text-red-500">
              <AlertTriangle className="h-3 w-3 mr-1" />
              {stats.warningCount} warnings
            </Badge>
          )}
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={markAllAsRead} 
              disabled={stats.unreadCount === 0 || refreshing}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Mark all read
            </Button>
            <Button 
              variant="outline" 
              onClick={clearAllNotifications} 
              disabled={stats.total === 0 || refreshing}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Clear all
            </Button>
            <Button 
              variant="outline" 
              onClick={() => {
                setRefreshing(true);
                fetchNotifications();
              }}
              disabled={refreshing}
            >
              {refreshing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Refresh
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Column - Stats & Filters */}
        <div className="lg:col-span-1 space-y-6">
          {/* Order Statistics */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Receipt className="h-4 w-4" />
                Order Statistics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Total Orders</span>
                  <Badge variant="outline">{stats.orderStats.totalOrders}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Active Orders</span>
                  <Badge variant="outline" className="bg-blue-50">{stats.orderStats.activeOrders}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Delivered</span>
                  <Badge variant="outline" className="bg-green-50">{stats.orderStats.deliveredOrders}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Cancelled</span>
                  <Badge variant="outline" className="bg-red-50">{stats.orderStats.cancelledOrders}</Badge>
                </div>
              </div>
              <Separator />
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-red-500" />
                    Urgent Warnings
                  </span>
                  <Badge variant="outline">{stats.warningCount}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-blue-500" />
                    Unread Total
                  </span>
                  <Badge variant="outline">{stats.unreadCount}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-gray-500" />
                    Total Notifications
                  </span>
                  <Badge variant="outline">{stats.total}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-start" onClick={markAllAsRead}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Mark all as read
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={clearAllNotifications}>
                <XCircle className="h-4 w-4 mr-2" />
                Clear all notifications
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start" 
                onClick={() => {
                  setRefreshing(true);
                  fetchNotifications();
                }}
                disabled={refreshing}
              >
                {refreshing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Refresh
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => router.push('/user/dashboard/order')}
              >
                <ShoppingBag className="h-4 w-4 mr-2" />
                View Orders
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => router.push('/dashboard/points')}
              >
                <Gift className="h-4 w-4 mr-2" />
                View Points
              </Button>
            </CardContent>
          </Card>

          {/* Notification Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Notification Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="delivery" className="flex items-center gap-2">
                    <Truck className="h-4 w-4" />
                    Delivery Updates
                  </Label>
                  <Switch
                    id="delivery"
                    checked={settings.deliveryNotifications}
                    onCheckedChange={() => toggleSetting('deliveryNotifications')}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="table" className="flex items-center gap-2">
                    <UtensilsCrossed className="h-4 w-4" />
                    Table Service
                  </Label>
                  <Switch
                    id="table"
                    checked={settings.tableNotifications}
                    onCheckedChange={() => toggleSetting('tableNotifications')}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="orders" className="flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Order Status
                  </Label>
                  <Switch
                    id="orders"
                    checked={settings.orderNotifications}
                    onCheckedChange={() => toggleSetting('orderNotifications')}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="points" className="flex items-center gap-2">
                    <Gift className="h-4 w-4" />
                    Points Updates
                  </Label>
                  <Switch
                    id="points"
                    checked={settings.pointsNotifications}
                    onCheckedChange={() => toggleSetting('pointsNotifications')}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="system" className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    System Alerts
                  </Label>
                  <Switch
                    id="system"
                    checked={settings.systemNotifications}
                    onCheckedChange={() => toggleSetting('systemNotifications')}
                  />
                </div>
              </div>
              <Separator />
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="sound">Sound Alerts</Label>
                  <Switch
                    id="sound"
                    checked={settings.soundEnabled}
                    onCheckedChange={() => toggleSetting('soundEnabled')}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="vibration">Vibration</Label>
                  <Switch
                    id="vibration"
                    checked={settings.vibrationEnabled}
                    onCheckedChange={() => toggleSetting('vibrationEnabled')}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Notifications */}
        <div className="lg:col-span-3 space-y-6">
          {/* Filter Tabs */}
          <Card>
            <CardContent className="p-4">
              <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="w-full justify-start h-auto flex-wrap">
                  <TabsTrigger value="all" className="flex items-center gap-2">
                    <Bell className="h-4 w-4" />
                    All
                    <Badge variant="secondary" className="ml-2">
                      {stats.total}
                    </Badge>
                  </TabsTrigger>
                  <TabsTrigger value="unread" className="flex items-center gap-2">
                    <BellRing className="h-4 w-4" />
                    Unread
                    {stats.unreadCount > 0 && (
                      <Badge variant="destructive" className="ml-2">
                        {stats.unreadCount}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="warning" className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Warnings
                    {stats.warningCount > 0 && (
                      <Badge variant="destructive" className="ml-2">
                        {stats.warningCount}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="delivery" className="flex items-center gap-2">
                    <Truck className="h-4 w-4" />
                    Delivery
                    <Badge variant="secondary" className="ml-2">
                      {deliveryNotifications.length}
                    </Badge>
                  </TabsTrigger>
                  <TabsTrigger value="order" className="flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Orders
                    <Badge variant="secondary" className="ml-2">
                      {orderNotifications.length}
                    </Badge>
                  </TabsTrigger>
                  <TabsTrigger value="points" className="flex items-center gap-2">
                    <Gift className="h-4 w-4" />
                    Points
                    <Badge variant="secondary" className="ml-2">
                      {pointsNotifications.length}
                    </Badge>
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </CardContent>
          </Card>

          {/* Notifications List */}
          <Card>
            <CardHeader>
              <CardTitle>
                {activeTab === 'all' && 'All Notifications'}
                {activeTab === 'unread' && 'Unread Notifications'}
                {activeTab === 'warning' && '⚠️ Urgent Warnings'}
                {activeTab === 'delivery' && 'Delivery Updates'}
                {activeTab === 'order' && 'Order Status Updates'}
                {activeTab === 'points' && 'Points & Rewards'}
                {activeTab === 'system' && 'System Alerts'}
              </CardTitle>
              <CardDescription>
                {filteredNotifications.length} notification{filteredNotifications.length !== 1 ? 's' : ''}
                {refreshing && ' • Refreshing...'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredNotifications.length > 0 ? (
                <div className="space-y-4">
                  {filteredNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 rounded-lg border ${!notification.read ? 'bg-blue-50 border-blue-200' : 'bg-white'}
                        ${notification.priority === 'high' ? 'border-red-200 bg-red-50' : ''}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          <div className={`p-2 rounded-full ${getTypeColor(notification.type)}`}>
                            {getTypeIcon(notification.type)}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-semibold">{notification.title}</h3>
                              {!notification.read && (
                                <Badge variant="outline" className="text-xs">
                                  New
                                </Badge>
                              )}
                              <Badge className={`text-xs ${getPriorityColor(notification.priority)} flex items-center gap-1`}>
                                {getPriorityIcon(notification.priority)}
                                {notification.priority}
                              </Badge>
                              {notification.meta?.status && getStatusBadge(notification.meta.status)}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              {notification.description}
                            </p>
                            
                            {/* Meta Information */}
                            {notification.meta && (
                              <div className="mt-3 pt-3 border-t">
                                <div className="flex flex-wrap gap-2 items-center">
                                  {/* Order Information */}
                                  {notification.meta.orderNumber && (
                                    <Badge variant="outline" className="text-xs">
                                      <Package className="h-3 w-3 mr-1" />
                                      {notification.meta.orderNumber}
                                    </Badge>
                                  )}
                                  
                                  {/* Points Information */}
                                  {notification.meta.points && (
                                    <Badge variant="outline" className="text-xs bg-emerald-50">
                                      <Gift className="h-3 w-3 mr-1" />
                                      +{notification.meta.points} points
                                    </Badge>
                                  )}
                                  
                                  {/* Total Points */}
                                  {notification.meta.totalPoints && (
                                    <Badge variant="outline" className="text-xs">
                                      <Star className="h-3 w-3 mr-1" />
                                      Total: {notification.meta.totalPoints}
                                    </Badge>
                                  )}
                                  
                                  {/* Milestone */}
                                  {notification.meta.milestone && (
                                    <Badge variant="outline" className="text-xs bg-purple-50">
                                      <Award className="h-3 w-3 mr-1" />
                                      {notification.meta.milestone} pts
                                    </Badge>
                                  )}
                                  
                                  {/* Table Information */}
                                  {notification.meta.tableNumber && (
                                    <Badge variant="outline" className="text-xs">
                                      <UtensilsCrossed className="h-3 w-3 mr-1" />
                                      Table {notification.meta.tableNumber}
                                    </Badge>
                                  )}
                                  
                                  {/* Time Information */}
                                  {notification.meta.estimatedTime && (
                                    <Badge variant="outline" className="text-xs">
                                      <Clock className="h-3 w-3 mr-1" />
                                      {notification.meta.estimatedTime}
                                    </Badge>
                                  )}
                                  
                                  {/* Amount */}
                                  {notification.meta.totalAmount && (
                                    <Badge variant="outline" className="text-xs">
                                      <CreditCard className="h-3 w-3 mr-1" />
                                      ${notification.meta.totalAmount.toFixed(2)}
                                    </Badge>
                                  )}
                                </div>
                                
                                {/* Items */}
                                {notification.meta.items && notification.meta.items.length > 0 && (
                                  <div className="mt-2">
                                    <p className="text-xs text-muted-foreground mb-1">Items:</p>
                                    <div className="flex flex-wrap gap-1">
                                      {notification.meta.items.slice(0, 3).map((item, index) => (
                                        <Badge key={index} variant="outline" className="text-xs">
                                          {item}
                                        </Badge>
                                      ))}
                                      {notification.meta.items.length > 3 && (
                                        <Badge variant="outline" className="text-xs">
                                          +{notification.meta.items.length - 3} more
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                )}
                                
                                {/* Cancellation Reason */}
                                {notification.meta.cancellationReason && (
                                  <div className="text-xs text-red-600 mt-2">
                                    <AlertTriangle className="h-3 w-3 inline mr-1" />
                                    Reason: {notification.meta.cancellationReason}
                                  </div>
                                )}
                                
                                {/* Refund Status */}
                                {notification.meta.refundStatus && (
                                  <div className="text-xs text-orange-600 mt-1">
                                    Refund: {notification.meta.refundStatus}
                                  </div>
                                )}
                              </div>
                            )}
                            
                            <div className="flex items-center justify-between mt-3">
                              <div className="text-xs text-muted-foreground flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {notification.time}
                              </div>
                              {notification.meta?.orderId && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => router.push(`/user/user/user/user/user//user/dashboard/order/${notification.meta.orderId}`)}
                                  className="h-7 text-xs"
                                >
                                  View Details
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {/* Actions */}
                        <div className="flex flex-col gap-2 ml-4">
                          {!notification.read && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => markAsRead(notification.id)}
                              className="h-8 w-8 p-0"
                              title="Mark as read"
                              disabled={refreshing}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          )}
                          {notification.action && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={notification.action.onClick}
                              className="h-8 whitespace-nowrap text-xs"
                              disabled={refreshing}
                            >
                              {notification.action.label}
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteNotification(notification.id)}
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                            title="Delete"
                            disabled={refreshing}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <BellOff className="h-16 w-16 mx-auto text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-semibold">No notifications</h3>
                  <p className="text-muted-foreground mt-2">
                    {activeTab === 'unread' 
                      ? 'All notifications are read' 
                      : activeTab === 'warning'
                      ? 'No urgent warnings'
                      : 'No notifications match your current filter'}
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center mt-4">
                    <Button
                      variant="outline"
                      onClick={() => setActiveTab('all')}
                    >
                      View all notifications
                    </Button>
                    <Button
                      variant="default"
                      onClick={() => router.push('/menu')}
                    >
                      <ShoppingBag className="h-4 w-4 mr-2" />
                      Order Now
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Active Orders</p>
                    <h3 className="text-2xl font-bold mt-1">
                      {stats.orderStats.activeOrders}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      In progress
                    </p>
                  </div>
                  <div className="p-3 rounded-full bg-blue-100">
                    <ShoppingBag className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Points Notifications</p>
                    <h3 className="text-2xl font-bold mt-1">
                      {stats.pointsCount}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Recent updates
                    </p>
                  </div>
                  <div className="p-3 rounded-full bg-emerald-100">
                    <TrendingUp className="h-6 w-6 text-emerald-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">⚠️ Issues</p>
                    <h3 className="text-2xl font-bold mt-1">
                      {stats.warningCount}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Need attention
                    </p>
                  </div>
                  <div className="p-3 rounded-full bg-red-100">
                    <AlertTriangle className="h-6 w-6 text-red-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}