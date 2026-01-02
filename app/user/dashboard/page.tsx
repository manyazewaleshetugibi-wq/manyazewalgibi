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
  User
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from '@/hooks/use-toast';
import Link from 'next/link';

interface UserStats {
  totalOrders: number;
  totalSpent: number;
  points: number;
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
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserStats();
  }, []);

  const fetchUserStats = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/user/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
      // Set default stats if API fails
      setStats({
        totalOrders: 0,
        totalSpent: 0,
        points: 0,
        referralCount: 0,
        favoriteFood: 'Start ordering to discover favorites!',
        recentOrders: [],
        referralCode: session?.user?.referralCode || 'REF' + Date.now().toString().slice(-6)
      });
    } finally {
      setLoading(false);
    }
  };

  const copyReferralLink = () => {
    if (!stats?.referralCode) return;
    const referralLink = `${window.location.origin}/register?ref=${stats.referralCode}`;
    navigator.clipboard.writeText(referralLink);
    toast({
      title: "Copied!",
      description: "Referral link copied to clipboard",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'pending': return 'bg-yellow-500';
      case 'preparing': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
          <p className="mt-2">Loading dashboard...</p>
        </div>
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
            <div className="mt-4 md:mt-0">
              <Badge className="bg-white/20 text-white border-none">
                {stats.points} Points
              </Badge>
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
              </div>
              <ShoppingBag className="h-8 w-8 text-primary/60" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Spent</p>
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
              </div>
              <Share2 className="h-8 w-8 text-purple-500/60" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Referral Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Refer & Earn
          </CardTitle>
          <CardDescription>
            Share your referral code and earn 0.10 points when friends order
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-sm font-medium mb-2 block">Your Referral Code</Label>
            <div className="flex gap-2">
              <div className="flex-1 p-3 bg-muted rounded-lg font-mono">
                {stats?.referralCode || 'LOADING...'}
              </div>
              <Button onClick={copyReferralLink} size="icon">
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-primary/5 rounded-lg">
              <div className="text-2xl font-bold text-primary">0.10</div>
              <div className="text-sm text-muted-foreground">Points per referral</div>
            </div>
            <div className="text-center p-4 bg-primary/5 rounded-lg">
              <div className="text-2xl font-bold text-primary">0.05</div>
              <div className="text-sm text-muted-foreground">Points per order</div>
            </div>
          </div>

          <div className="text-sm text-muted-foreground">
            Earn 0.10 points when a friend uses your referral code for their first order.
            You also earn 0.05 points for every order you make.
          </div>
        </CardContent>
      </Card>

      {/* Recent Orders & Favorite Food */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Recent Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.recentOrders && stats.recentOrders.length > 0 ? (
              <div className="space-y-3">
                {stats.recentOrders.slice(0, 3).map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">#{order.orderNumber}</p>
                      <p className="text-sm text-muted-foreground">{order.date}</p>
                    </div>
                    <div className="text-right">
                      <Badge className={getStatusColor(order.status)}>
                        {order.status}
                      </Badge>
                      <p className="font-bold mt-1">${order.total.toFixed(2)}</p>
                    </div>
                  </div>
                ))}
                <Link href="/dashboard/orders">
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
                  : 'Your most ordered item'}
              </p>
              {stats?.totalOrders !== 0 && (
                <Button className="mt-4" variant="outline">
                  <Star className="h-4 w-4 mr-2" />
                  Order Again
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link href="/dashboard/profile">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-4 text-center">
              <div className="inline-block p-3 bg-primary/10 rounded-full mb-2">
                <User className="h-6 w-6 text-primary" />
              </div>
              <p className="font-medium">Edit Profile</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/orders">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-4 text-center">
              <div className="inline-block p-3 bg-blue-100 rounded-full mb-2">
                <History className="h-6 w-6 text-blue-600" />
              </div>
              <p className="font-medium">Order History</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/points">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-4 text-center">
              <div className="inline-block p-3 bg-amber-100 rounded-full mb-2">
                <Gift className="h-6 w-6 text-amber-600" />
              </div>
              <p className="font-medium">My Points</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/favorites">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
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