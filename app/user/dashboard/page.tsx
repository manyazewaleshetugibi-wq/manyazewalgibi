"use client";

import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { 
  TrendingUp, 
  ShoppingBag, 
  Star, 
  Gift, 
  Share2, 
  Clock,
  Heart,
  History,
  Copy,
  ExternalLink,
  User,
  AlertCircle,
  RefreshCw,
  Loader2
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from '@/hooks/use-toast';
import Link from 'next/link';

interface UserStats {
  totalOrders: number;
  totalSpent: number;
  points: number;
  availablePoints: number;
  totalPoints: number;
  referralCount: number;
  favoriteFood: string;
  recentOrders: Array<{
    id: string;
    orderNumber: string;
    total: number;
    date: string;
    status: string;
  }>;
  referralCode: string;
  referralLink: string;
  stats: {
    totalOrders: number;
    successfulReferrals: number;
    ordersWithPoints: number;
    referralsWithPoints: number;
  };
  nextRewardThreshold: number;
  transactions: Array<{
    id: string;
    type: string;
    points: number;
    description: string;
    date: string;
    status: string;
  }>;
}

interface PointsResponse {
  success: boolean;
  data?: {
    totalPoints: number;
    availablePoints: number;
    transactions: Array<any>;
    referralCode: string;
    userId: string;
    nextRewardThreshold: number;
    stats: {
      totalOrders: number;
      successfulReferrals: number;
      ordersWithPoints: number;
      referralsWithPoints: number;
    };
  };
  error?: string;
  message?: string;
}

interface OrdersResponse {
  success: boolean;
  orders?: Array<{
    id: string;
    orderNumber: string;
    date: string;
    datetime: string;
    total: number;
    subtotal: number;
    tax: number;
    deliveryFee: number;
    discount: number;
    notes: string | null;
    status: 'completed' | 'pending' | 'cancelled' | 'preparing' | 'delivered';
    paymentMethod: string;
    deliveryAddress: string;
    items: Array<{
      name: string;
      quantity: number;
      price: number;
      total: number;
      image?: string;
    }>;
  }>;
  count?: number;
  error?: string;
  message?: string;
}

interface ReferralResponse {
  success: boolean;
  referralCode?: string;
  referralLink?: string;
  hasReferralCode?: boolean;
  message?: string;
  error?: string;
  existing?: boolean;
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generatingReferral, setGeneratingReferral] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (session?.user) {
      fetchUserStats();
    }
  }, [session]);

  const fetchUserStats = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch points data
      const pointsRes = await fetch('/api/user/points');
      let pointsData: PointsResponse;
      
      if (!pointsRes.ok) {
        throw new Error(`Points API error: ${pointsRes.status}`);
      }
      
      pointsData = await pointsRes.json();
      
      if (!pointsData.success) {
        throw new Error(pointsData.error || 'Failed to fetch points');
      }
      
      // Fetch orders data
      const ordersRes = await fetch('/api/user/orders');
      let ordersData: OrdersResponse;
      
      if (!ordersRes.ok) {
        throw new Error(`Orders API error: ${ordersRes.status}`);
      }
      
      ordersData = await ordersRes.json();
      
      if (!ordersData.success) {
        throw new Error(ordersData.error || 'Failed to fetch orders');
      }
      
      // Fetch referral code
      let referralCode = '';
      let referralLink = '';
      
      try {
        const referralRes = await fetch('/api/user/referral/generate');
        
        if (referralRes.ok) {
          const referralData: ReferralResponse = await referralRes.json();
          
          if (referralData.success) {
            if (referralData.hasReferralCode === false) {
              // User doesn't have a referral code yet, we'll generate it later
              console.log('No referral code found, will generate when needed');
            } else {
              referralCode = referralData.referralCode || '';
              referralLink = referralData.referralLink || '';
            }
          }
        }
      } catch (referralError) {
        console.error('Error fetching referral code:', referralError);
        // Don't throw - we'll generate a fallback code
      }
      
      // Extract data from responses
      const pointsInfo = pointsData.data || {
        totalPoints: 0,
        availablePoints: 0,
        transactions: [],
        referralCode: referralCode || '',
        userId: session?.user?.id || '',
        nextRewardThreshold: 50,
        stats: {
          totalOrders: 0,
          successfulReferrals: 0,
          ordersWithPoints: 0,
          referralsWithPoints: 0
        }
      };
      
      const userOrders = ordersData.orders || [];
      
      // Calculate stats
      const totalSpent = userOrders.reduce((acc, order) => acc + order.total, 0);
      
      // Calculate favorite food from all orders
      const foodCounts: Record<string, number> = {};
      userOrders.forEach((order) => {
        order.items?.forEach((item) => {
          const name = item.name;
          if (name) {
            foodCounts[name] = (foodCounts[name] || 0) + item.quantity;
          }
        });
      });
      
      const favoriteFood = Object.entries(foodCounts)
        .sort(([,a], [,b]) => b - a)[0]?.[0] || 'Start ordering to discover favorites!';
      
      // Prepare recent orders data
      const recentOrders = userOrders
        .sort((a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime())
        .slice(0, 5)
        .map((order) => ({
          id: order.id,
          orderNumber: order.orderNumber,
          total: order.total,
          date: order.date,
          status: order.status
        }));
      
      // Create fallback referral code if none exists
      const fallbackCode = session?.user?.id 
        ? `REF-${session.user.id.substring(0, 8).toUpperCase()}` 
        : 'REF-USER';
      
      // Create final stats object
      const userStats: UserStats = {
        totalOrders: userOrders.length,
        totalSpent,
        points: pointsInfo.availablePoints || 0,
        availablePoints: pointsInfo.availablePoints || 0,
        totalPoints: pointsInfo.totalPoints || 0,
        referralCount: pointsInfo.stats.successfulReferrals || 0,
        favoriteFood,
        recentOrders,
        referralCode: pointsInfo.referralCode || referralCode || fallbackCode,
        referralLink: referralLink || `${window.location.origin}/register?ref=${pointsInfo.referralCode || referralCode || fallbackCode}`,
        stats: pointsInfo.stats,
        nextRewardThreshold: pointsInfo.nextRewardThreshold || 50,
        transactions: pointsInfo.transactions || []
      };
      
      setStats(userStats);
      
    } catch (error) {
      console.error('Error fetching stats:', error);
      setError(error instanceof Error ? error.message : 'Failed to load dashboard data');
      
      // Set default stats if API fails
      const fallbackCode = session?.user?.id 
        ? `REF-${session.user.id.substring(0, 8).toUpperCase()}` 
        : 'REF-USER';
      
      setStats({
        totalOrders: 0,
        totalSpent: 0,
        points: 0,
        availablePoints: 0,
        totalPoints: 0,
        referralCount: 0,
        favoriteFood: 'Start ordering to discover favorites!',
        recentOrders: [],
        referralCode: fallbackCode,
        referralLink: `${window.location.origin}/register?ref=${fallbackCode}`,
        stats: {
          totalOrders: 0,
          successfulReferrals: 0,
          ordersWithPoints: 0,
          referralsWithPoints: 0
        },
        nextRewardThreshold: 50,
        transactions: []
      });
    } finally {
      setLoading(false);
    }
  };

  const generateReferralCode = async (): Promise<string> => {
    try {
      setGeneratingReferral(true);
      
      const response = await fetch('/api/user/referral/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to generate referral code');
      }
      
      const data: ReferralResponse = await response.json();
      
      if (data.success && data.referralCode) {
        toast({
          title: "Success!",
          description: "Your unique referral code has been created",
        });
        
        // Update stats with new referral code
        if (stats) {
          setStats({
            ...stats,
            referralCode: data.referralCode,
            referralLink: data.referralLink || `${window.location.origin}/register?ref=${data.referralCode}`
          });
        }
        
        return data.referralCode;
      } else {
        throw new Error(data.error || 'Failed to generate referral code');
      }
    } catch (error) {
      console.error('Error generating referral code:', error);
      
      // Create a fallback code
      const fallbackCode = session?.user?.id 
        ? `REF-${session.user.id.substring(0, 8).toUpperCase()}` 
        : 'REF-USER';
      
      toast({
        title: "Using temporary code",
        description: "We'll generate a permanent code for you soon",
      });
      
      // Update stats with fallback code
      if (stats) {
        setStats({
          ...stats,
          referralCode: fallbackCode,
          referralLink: `${window.location.origin}/register?ref=${fallbackCode}`
        });
      }
      
      return fallbackCode;
    } finally {
      setGeneratingReferral(false);
    }
  };

  const handleGenerateClick = async () => {
    await generateReferralCode();
  };

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      toast({
        title: "Copied!",
        description: `${type} copied to clipboard`,
      });
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      toast({
        title: "Failed to copy",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  const shareReferral = async () => {
    if (!stats?.referralLink) return;
    
    const shareText = `Join me on FoodieHub! Use my referral code ${stats.referralCode} to get 10% off your first order. Sign up here: ${stats.referralLink}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join FoodieHub!',
          text: shareText,
          url: stats.referralLink,
        });
      } catch (error) {
        // User cancelled share
        console.log('Share cancelled');
      }
    } else {
      copyToClipboard(stats.referralLink, 'Link');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed': 
      case 'delivered': 
        return 'bg-green-500';
      case 'pending': 
        return 'bg-yellow-500';
      case 'preparing': 
        return 'bg-blue-500';
      case 'cancelled': 
        return 'bg-red-500';
      default: 
        return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="mt-2">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <AlertCircle className="h-12 w-12 text-red-500" />
        <h2 className="text-xl font-semibold">Error Loading Dashboard</h2>
        <p className="text-muted-foreground text-center max-w-md">{error}</p>
        <Button onClick={fetchUserStats} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-primary to-primary/80 text-white rounded-2xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">
              Welcome back, {session?.user?.name?.split(' ')[0] || 'Valued Customer'}! 👋
            </h1>
            <p className="mt-2 opacity-90">
              {stats?.totalOrders === 0 
                ? 'Start your first order to earn points and rewards!' 
                : 'Track your orders, points, and referrals'}
            </p>
          </div>
          {stats && stats.points > 0 && (
            <div className="mt-4 md:mt-0 flex flex-col items-end">
              <Badge className="bg-white/20 text-white border-none mb-2">
                {stats.points} Available Points
              </Badge>
              <div className="text-sm opacity-80">
                Total: {stats.totalPoints} points
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Orders</p>
                <h3 className="text-xl font-bold mt-1">{stats?.totalOrders || 0}</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats?.stats?.ordersWithPoints || 0} with points
                </p>
              </div>
              <ShoppingBag className="h-8 w-8 text-primary/60" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Spent</p>
                <h3 className="text-xl font-bold mt-1">${(stats?.totalSpent || 0).toFixed(2)}</h3>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500/60" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Points</p>
                <h3 className="text-xl font-bold mt-1">{stats?.points || 0}</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Next reward: {stats?.nextRewardThreshold || 50}
                </p>
              </div>
              <Gift className="h-8 w-8 text-amber-500/60" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Referrals</p>
                <h3 className="text-xl font-bold mt-1">{stats?.referralCount || 0}</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats?.stats?.referralsWithPoints || 0} completed
                </p>
              </div>
              <Share2 className="h-8 w-8 text-purple-500/60" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Points Progress */}
      {stats && stats.points > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5" />
              Points Progress
            </CardTitle>
            <CardDescription>
              {stats.points} points earned • {Math.max(0, stats.nextRewardThreshold - stats.points)} points to next reward
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Your Points</span>
                <span className="font-semibold">{stats.points} / {stats.nextRewardThreshold}</span>
              </div>
              <Progress 
                value={(stats.points / stats.nextRewardThreshold) * 100} 
                className="h-2"
              />
              <div className="grid grid-cols-4 gap-2 text-xs text-muted-foreground mt-2">
                <div className="text-center">50</div>
                <div className="text-center">100</div>
                <div className="text-center">200</div>
                <div className="text-center">300+</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Referral Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Refer & Earn
          </CardTitle>
          <CardDescription>
            Share your referral code and earn 10 points when friends complete their first order
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-sm font-medium mb-2 block">Your Referral Code</Label>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex-1 p-3 bg-muted rounded-lg font-mono flex items-center justify-between">
                <span className="text-sm sm:text-base break-all">{stats?.referralCode || 'LOADING...'}</span>
                <Badge variant="outline" className="ml-2 whitespace-nowrap">
                  Active
                </Badge>
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={() => copyToClipboard(stats?.referralCode || '', 'Code')} 
                  size="icon" 
                  variant="outline" 
                  title="Copy Code"
                  disabled={!stats?.referralCode}
                >
                  {copied === 'Code' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
                </Button>
                <Button 
                  onClick={() => copyToClipboard(stats?.referralLink || '', 'Link')} 
                  size="icon" 
                  variant="outline" 
                  title="Copy Link"
                  disabled={!stats?.referralLink}
                >
                  {copied === 'Link' ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
                </Button>
                <Button 
                  onClick={shareReferral} 
                  size="icon" 
                  variant="outline" 
                  title="Share"
                  disabled={!stats?.referralLink}
                >
                  <Share2 className="h-4 w-4" />
                </Button>
                <Button 
                  onClick={handleGenerateClick} 
                  size="sm" 
                  variant="default"
                  disabled={generatingReferral}
                >
                  {generatingReferral ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    'Generate New'
                  )}
                </Button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="text-center p-4 bg-primary/5 rounded-lg">
              <div className="text-2xl font-bold text-primary">10</div>
              <div className="text-sm text-muted-foreground">Points per referral</div>
              <div className="text-xs text-muted-foreground mt-1">When friend orders</div>
            </div>
            <div className="text-center p-4 bg-primary/5 rounded-lg">
              <div className="text-2xl font-bold text-primary">5</div>
              <div className="text-sm text-muted-foreground">Points per order</div>
              <div className="text-xs text-muted-foreground mt-1">For every order</div>
            </div>
          </div>

          <div className="text-sm text-muted-foreground space-y-1">
            <p>• Earn 10 points when a friend uses your referral code for their first order.</p>
            <p>• You earn 5 points for every order you make (excluding cancelled orders).</p>
            <p>• Points can be redeemed for rewards starting at 50 points.</p>
            {stats?.referralLink && (
              <p className="mt-2">
                <span className="font-medium">Share this link:</span>{' '}
                <span className="font-mono text-xs bg-muted p-1 rounded break-all">{stats.referralLink}</span>
              </p>
            )}
          </div>

          <div className="flex justify-center">
            <Button 
              onClick={() => window.open(stats?.referralLink, '_blank')}
              variant="default"
              className="w-full sm:w-auto"
              disabled={!stats?.referralLink}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open Registration Page
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Rest of your existing code remains the same... */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Recent Orders
            </CardTitle>
            <CardDescription>
              {stats?.totalOrders || 0} total orders
            </CardDescription>
          </CardHeader>
          <CardContent>
            {stats?.recentOrders && stats.recentOrders.length > 0 ? (
              <div className="space-y-3">
                {stats.recentOrders.slice(0, 3).map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                    <div>
                      <p className="font-medium">#{order.orderNumber}</p>
                      <p className="text-sm text-muted-foreground">{order.date}</p>
                    </div>
                    <div className="text-right">
                      <Badge className={`${getStatusColor(order.status)} text-white`}>
                        {getStatusText(order.status)}
                      </Badge>
                      <p className="font-bold mt-1">${order.total.toFixed(2)}</p>
                    </div>
                  </div>
                ))}
                <Link href="/user/dashboard/orders">
                  <Button variant="ghost" className="w-full">
                    View All Orders
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="text-center py-6">
                <ShoppingBag className="h-12 w-12 mx-auto text-muted-foreground" />
                <p className="mt-2 text-muted-foreground">No orders yet</p>
                <Button className="mt-4" asChild>
                  <Link href="/menu">Order Now</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Favorite Food */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5" />
              Favorite Food
            </CardTitle>
            <CardDescription>
              Your most ordered item
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-6">
              <div className="inline-block p-4 bg-rose-100 rounded-full mb-4">
                <Heart className="h-8 w-8 text-rose-500" />
              </div>
              <h3 className="font-semibold text-lg">{stats?.favoriteFood}</h3>
              <p className="text-sm text-muted-foreground mt-2">
                {stats?.totalOrders === 0 
                  ? 'Order something to discover your favorites!' 
                  : 'Based on your order history'}
              </p>
              {stats?.totalOrders !== 0 && (
                <Button className="mt-4" variant="outline" asChild>
                  <Link href="/menu">
                    <Star className="h-4 w-4 mr-2" />
                    Order Again
                  </Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Points Transactions */}
      {stats && stats.transactions && stats.transactions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Recent Points Activity
            </CardTitle>
            <CardDescription>
              Your latest points transactions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.transactions.slice(0, 3).map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{transaction.description}</p>
                    <p className="text-sm text-muted-foreground capitalize">
                      {transaction.type} • {new Date(transaction.date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className={`text-right font-semibold ${transaction.points > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {transaction.points > 0 ? '+' : ''}{transaction.points} pts
                  </div>
                </div>
              ))}
              <Link href="/user/dashboard/points">
                <Button variant="ghost" className="w-full">
                  View All Points History
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link href="/user/profile/edit">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardContent className="p-4 text-center">
              <div className="inline-block p-3 bg-primary/10 rounded-full mb-2">
                <User className="h-6 w-6 text-primary" />
              </div>
              <p className="font-medium">Edit Profile</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/user/dashboard/orders">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardContent className="p-4 text-center">
              <div className="inline-block p-3 bg-blue-100 rounded-full mb-2">
                <History className="h-6 w-6 text-blue-600" />
              </div>
              <p className="font-medium">Order History</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/user/dashboard/points">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardContent className="p-4 text-center">
              <div className="inline-block p-3 bg-amber-100 rounded-full mb-2">
                <Gift className="h-6 w-6 text-amber-600" />
              </div>
              <p className="font-medium">My Points</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/user/dashboard/favorites">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardContent className="p-4 text-center">
              <div className="inline-block p-3 bg-rose-100 rounded-full mb-2">
                <Heart className="h-6 w-6 text-rose-600" />
              </div>
              <p className="font-medium">Favorites</p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}