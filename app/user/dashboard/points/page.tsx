"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Gift, 
  History, 
  ArrowDownRight,
  Copy,
  Loader2,
  AlertCircle,
  RefreshCw,
  ShoppingCart,
  UserPlus,
  Package,
  TrendingUp,
  Award,
  Sparkles,
  PlusCircle,
  ExternalLink,
  Share2,
  Users
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

interface PointTransaction {
  id: string;
  type: 'referral' | 'order' | 'bonus' | 'redeemed';
  points: number;
  description: string;
  date: string;
  orderId?: string;
  referralId?: string;
  referredUserId?: string;
  referredName?: string;
  orderCount?: number;
}

interface PointsData {
  totalPoints: number;
  availablePoints: number;
  transactions: PointTransaction[];
  referralCode: string | null;
  userId: string;
  nextRewardThreshold: number;
  stats?: {
    totalOrders: number;
    successfulReferrals: number;
    ordersWithPoints: number;
    referralsWithPoints: number;
  };
  referredUsers?: Array<{
    name: string;
    email: string;
    orderCount: number;
    date: string;
  }>;
  _debug?: {
    uniqueOrders: number;
    uniqueReferrals: number;
    totalTransactions: number;
  };
}

interface ApiResponse {
  success: boolean;
  data?: PointsData;
  error?: string;
  message?: string;
}

export default function PointsPage() {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const [pointsData, setPointsData] = useState<PointsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [redeeming, setRedeeming] = useState<string | null>(null);
  const [copyingCode, setCopyingCode] = useState(false);
  const [generatingReferral, setGeneratingReferral] = useState(false);
  const [showReferralCode, setShowReferralCode] = useState(false);

  useEffect(() => {
    if (sessionStatus === 'authenticated') {
      fetchPoints();
    } else if (sessionStatus === 'unauthenticated') {
      setLoading(false);
      setError('Please sign in to view your points');
    }
  }, [sessionStatus]);

  const fetchPoints = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/user/points', {
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to fetch points: ${response.status}`);
      }
      
      const data: ApiResponse = await response.json();
      
      if (data.success && data.data) {
        console.log('Points data received for user:', data.data.userId);
        
        // Check if user has a referral code from registration
        const hasReferralCode = !!data.data.referralCode;
        
        setPointsData(data.data);
        
        // Show referral code if it exists
        if (hasReferralCode) {
          setShowReferralCode(true);
        }
      } else {
        throw new Error(data.error || 'Failed to load points data');
      }
    } catch (error) {
      console.error('Error fetching points:', error);
      setError(error instanceof Error ? error.message : 'An error occurred while fetching points');
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
      
      const data = await response.json();
      
      if (data.success && data.referralCode) {
        toast({
          title: "Success!",
          description: "Your unique referral code has been created",
          duration: 3000,
        });
        
        // Update points data with new referral code
        if (pointsData) {
          setPointsData({
            ...pointsData,
            referralCode: data.referralCode
          });
        }
        
        setShowReferralCode(true);
        
        return data.referralCode;
      } else {
        throw new Error(data.error || 'Failed to generate referral code');
      }
    } catch (error) {
      console.error('Error generating referral code:', error);
      
      toast({
        title: "Error",
        description: "Failed to generate referral code. Please try again.",
        variant: "destructive",
        duration: 3000,
      });
      
      return '';
    } finally {
      setGeneratingReferral(false);
    }
  };

  const handleGenerateClick = async () => {
    await generateReferralCode();
  };

  const copyReferralCode = async () => {
    if (!pointsData?.referralCode) return;
    
    setCopyingCode(true);
    try {
      await navigator.clipboard.writeText(pointsData.referralCode);
      toast({
        title: "Copied!",
        description: "Referral code copied to clipboard",
        duration: 3000,
      });
    } catch (err) {
      toast({
        title: "Failed to copy",
        description: "Please try again",
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setCopyingCode(false);
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'referral':
        return <UserPlus className="h-4 w-4 text-green-500" />;
      case 'order':
        return <Package className="h-4 w-4 text-blue-500" />;
      case 'bonus':
        return <Gift className="h-4 w-4 text-yellow-500" />;
      case 'redeemed':
        return <ArrowDownRight className="h-4 w-4 text-red-500" />;
      default:
        return <History className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'referral':
        return 'text-green-600 bg-green-50';
      case 'order':
        return 'text-blue-600 bg-blue-50';
      case 'bonus':
        return 'text-yellow-600 bg-yellow-50';
      case 'redeemed':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const handleRedeem = async (points: number, reward: string) => {
    try {
      setRedeeming(reward);
      
      const response = await fetch('/api/user/points', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          points,
          reward,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: "Success!",
          description: data.message || `You've redeemed ${points} points for ${reward}`,
          duration: 5000,
        });
        fetchPoints(); // Refresh points data
      } else {
        toast({
          title: "Failed",
          description: data.error || "Failed to redeem points",
          variant: "destructive",
          duration: 5000,
        });
      }
    } catch (error) {
      console.error('Error redeeming points:', error);
      toast({
        title: "Error",
        description: "Failed to redeem points. Please try again.",
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setRedeeming(null);
    }
  };

  const handleShareReferral = () => {
    if (!pointsData?.referralCode) return;
    
    const referralLink = `${window.location.origin}/register?ref=${pointsData.referralCode}`;
    const shareText = `Join me on FoodieHub! Use my referral code ${pointsData.referralCode} to get 10% off your first order. Sign up here: ${referralLink}`;
    
    if (navigator.share) {
      navigator.share({
        title: 'Join FoodieHub!',
        text: shareText,
        url: referralLink,
      }).catch(() => {
        // Fallback if share fails
        copyToClipboard(shareText, 'Referral message copied to clipboard');
      });
    } else {
      copyToClipboard(shareText, 'Referral message copied to clipboard');
    }
  };

  const copyToClipboard = async (text: string, successMessage: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied!",
        description: successMessage,
        duration: 3000,
      });
    } catch (err) {
      toast({
        title: "Failed to copy",
        description: "Please try again",
        variant: "destructive",
        duration: 3000,
      });
    }
  };

  // Calculate points breakdown from transactions
  const calculatePointsBreakdown = () => {
    if (!pointsData || !pointsData.transactions) return null;
    
    const orderTransactions = pointsData.transactions.filter(t => t.type === 'order');
    const referralTransactions = pointsData.transactions.filter(t => t.type === 'referral');
    const redeemedTransactions = pointsData.transactions.filter(t => t.type === 'redeemed');
    
    const earnedFromOrders = orderTransactions.reduce((sum, t) => sum + t.points, 0);
    const earnedFromReferrals = referralTransactions.reduce((sum, t) => sum + t.points, 0);
    const redeemedPoints = redeemedTransactions.reduce((sum, t) => sum + Math.abs(t.points), 0);
    
    // Calculate unique orders and referrals from transactions
    const uniqueOrderIds = new Set(orderTransactions.map(t => t.orderId).filter(Boolean));
    const uniqueReferralIds = new Set(referralTransactions.map(t => t.referredUserId).filter(Boolean));
    
    return {
      earnedFromOrders,
      earnedFromReferrals,
      redeemedPoints,
      totalOrders: uniqueOrderIds.size,
      totalReferrals: uniqueReferralIds.size,
      availablePoints: pointsData.availablePoints,
      totalPoints: pointsData.totalPoints,
      netPoints: earnedFromOrders + earnedFromReferrals - redeemedPoints
    };
  };

  if (sessionStatus === 'loading' || loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <div className="text-center">
          <p className="font-medium">Loading your points</p>
          <p className="text-sm text-muted-foreground mt-1">Please wait while we fetch your loyalty points</p>
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
          <p className="text-muted-foreground mt-1">Please sign in to view your points</p>
        </div>
        <Button onClick={() => router.push('/auth/signin')}>
          Sign In
        </Button>
      </div>
    );
  }

  if (error && !pointsData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <div className="text-center">
          <h3 className="text-lg font-semibold">Error Loading Points</h3>
          <p className="text-muted-foreground mt-1">{error}</p>
        </div>
        <Button onClick={fetchPoints} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
      </div>
    );
  }

  const pointsBreakdown = calculatePointsBreakdown();
  const hasReferralCode = pointsData?.referralCode && showReferralCode;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">My Points</h1>
          <p className="text-muted-foreground">
            Welcome back, {session?.user?.name || session?.user?.email}!
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="icon"
            onClick={fetchPoints}
            disabled={loading}
            title="Refresh points"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button onClick={() => router.push('/menu')}>
            <ShoppingCart className="h-4 w-4 mr-2" />
            Order Now
          </Button>
        </div>
      </div>

      {/* Points Summary - Updated next reward threshold to 100 */}
      <Card className="bg-gradient-to-br from-primary to-primary/80 text-white">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between">
            <div>
              <p className="text-sm opacity-90">Available Points</p>
              <h2 className="text-4xl font-bold mt-2">{pointsData?.availablePoints || 0}</h2>
              <p className="text-sm opacity-90 mt-2">
                {pointsData?.availablePoints === 0 
                  ? "Start earning points by placing orders!" 
                  : "Ready to redeem for rewards"}
              </p>
              {pointsData && (
                <div className="mt-4 max-w-xs">
                  <p className="text-sm opacity-90">
                    {Math.max(0, 100 - (pointsData.availablePoints || 0))} points until next reward
                  </p>
                  <div className="w-full bg-white/20 rounded-full h-2 mt-1">
                    <div 
                      className="bg-white h-2 rounded-full transition-all duration-500"
                      style={{ 
                        width: `${Math.min(100, ((pointsData.availablePoints || 0) / 100) * 100)}%` 
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-xs opacity-80 mt-1">
                    <span>0</span>
                    <span>100</span>
                  </div>
                </div>
              )}
            </div>
            <div className="mt-4 md:mt-0 flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm opacity-90">Total Earned</p>
                <p className="text-2xl font-bold">{pointsData?.totalPoints || 0}</p>
              </div>
              <Gift className="h-12 w-12 opacity-80" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Points Stats */}
      {pointsBreakdown && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Points Breakdown
            </CardTitle>
            <CardDescription>See where your points come from</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Package className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">From Orders</p>
                    <p className="text-2xl font-bold">+{pointsBreakdown.earnedFromOrders}</p>
                    <p className="text-sm text-muted-foreground">
                      {pointsBreakdown.totalOrders} order{pointsBreakdown.totalOrders !== 1 ? 's' : ''} × 5 points each
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <UserPlus className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">From Referrals</p>
                    <p className="text-2xl font-bold">+{pointsBreakdown.earnedFromReferrals}</p>
                    <p className="text-sm text-muted-foreground">
                      {pointsBreakdown.totalReferrals} referral{pointsBreakdown.totalReferrals !== 1 ? 's' : ''} × 10 points each
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Award className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Net Points</p>
                    <p className="text-2xl font-bold">{pointsBreakdown.netPoints}</p>
                    <p className="text-sm text-muted-foreground">
                      After redemptions
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            {pointsBreakdown.redeemedPoints > 0 && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
                <span className="text-sm font-medium text-red-800 flex items-center gap-2">
                  <ArrowDownRight className="h-4 w-4" />
                  Points Redeemed
                </span>
                <span className="font-bold text-red-600">-{pointsBreakdown.redeemedPoints}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* How to Earn */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            How to Earn Points
          </CardTitle>
          <CardDescription>Simple ways to earn more points</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg hover:border-primary transition-colors">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Package className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-lg">Place Orders</h4>
                  <p className="text-muted-foreground">Earn points for every order</p>
                </div>
              </div>
              <div className="pl-11">
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="font-medium">Each completed order</span>
                  <span className="font-bold text-green-600 text-lg">+5 points</span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Points are added automatically after your order is completed
                </p>
              </div>
            </div>
            
            <div className="p-4 border rounded-lg hover:border-primary transition-colors">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <UserPlus className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-lg">Refer Friends</h4>
                  <p className="text-muted-foreground">Invite friends to earn more</p>
                </div>
              </div>
              <div className="pl-11">
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="font-medium">Each successful referral</span>
                  <span className="font-bold text-green-600 text-lg">+10 points</span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Get points when friends sign up with your code and place their first order
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Referral Section - UPDATED: Shows registered referral code exactly as stored */}
      <Card>
        <CardHeader>
          <CardTitle>Refer & Earn</CardTitle>
          <CardDescription>Share your code and earn 10 points for each friend who joins</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!hasReferralCode ? (
            // Show generate button when no referral code exists
            <div className="text-center py-8 border-2 border-dashed border-primary/20 rounded-lg">
              <div className="inline-block p-4 bg-primary/10 rounded-full mb-4">
                <PlusCircle className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Generate Your Referral Code</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                Create your unique referral code to start earning points when your friends place their first order!
              </p>
              <Button 
                onClick={handleGenerateClick} 
                size="lg"
                disabled={generatingReferral}
                className="min-w-[200px]"
              >
                {generatingReferral ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Share2 className="h-4 w-4 mr-2" />
                    Generate Referral Code
                  </>
                )}
              </Button>
            </div>
          ) : (
            // Show referral code exactly as stored in database (like "MW-69A00A-D6ZC")
            <>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="flex-1 p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Your Referral Code</p>
                  <div className="font-mono text-xl font-bold tracking-wider break-all">
                    {pointsData?.referralCode}
                  </div>
                </div>
                <Button 
                  onClick={copyReferralCode} 
                  size="lg"
                  disabled={copyingCode}
                  className="sm:w-auto w-full"
                >
                  {copyingCode ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Copy className="h-4 w-4 mr-2" />
                  )}
                  Copy Code
                </Button>
              </div>
              
              <Button 
                onClick={handleShareReferral} 
                className="w-full" 
                variant="outline"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Share Referral Link
              </Button>

              {/* Show referred users if any */}
              {pointsData?.referredUsers && pointsData.referredUsers.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Your Successful Referrals ({pointsData.referredUsers.length})
                  </h4>
                  <div className="space-y-2 max-h-[200px] overflow-y-auto">
                    {pointsData.referredUsers.map((user, index) => (
                      <div key={index} className="p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-medium">{user.name}</p>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                          </div>
                          <Badge className="bg-green-500">
                            {user.orderCount} {user.orderCount === 1 ? 'order' : 'orders'}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Referred on {new Date(user.date).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
          
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="font-semibold text-green-800 flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              How It Works:
            </h4>
            <ul className="mt-2 space-y-1 text-sm text-green-700">
              <li>• Your friend gets 10% off their first order</li>
              <li>• You earn <strong>10 points</strong> for every successful referral</li>
              <li>• No limit on how many friends you can refer!</li>
              <li>• Points are added after their first order is completed</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Redeem Points - Updated thresholds to 100, 200, 500 */}
      <Card>
        <CardHeader>
          <CardTitle>Redeem Points</CardTitle>
          <CardDescription>Exchange your points for amazing rewards</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg hover:border-primary transition-colors">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">100 pts</div>
                <h4 className="font-semibold mt-2">10% Off</h4>
                <p className="text-sm text-muted-foreground mt-1">Your next order</p>
              </div>
              <Button 
                className="mt-4 w-full" 
                disabled={(pointsData?.availablePoints || 0) < 100 || redeeming === '10% Off'}
                onClick={() => handleRedeem(100, '10% Off')}
              >
                {redeeming === '10% Off' ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : 'Redeem Now'}
              </Button>
            </div>
            
            <div className="p-4 border rounded-lg hover:border-primary transition-colors">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">200 pts</div>
                <h4 className="font-semibold mt-2">Free Drink</h4>
                <p className="text-sm text-muted-foreground mt-1">Any beverage from menu</p>
              </div>
              <Button 
                className="mt-4 w-full" 
                disabled={(pointsData?.availablePoints || 0) < 200 || redeeming === 'Free Drink'}
                onClick={() => handleRedeem(200, 'Free Drink')}
              >
                {redeeming === 'Free Drink' ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : 'Redeem Now'}
              </Button>
            </div>
            
            <div className="p-4 border rounded-lg hover:border-primary transition-colors">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">500 pts</div>
                <h4 className="font-semibold mt-2">Free Appetizer</h4>
                <p className="text-sm text-muted-foreground mt-1">Choose any starter</p>
              </div>
              <Button 
                className="mt-4 w-full" 
                disabled={(pointsData?.availablePoints || 0) < 500 || redeeming === 'Free Appetizer'}
                onClick={() => handleRedeem(500, 'Free Appetizer')}
              >
                {redeeming === 'Free Appetizer' ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : 'Redeem Now'}
              </Button>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Quick Math:</strong> 
              <br />
              • Place 20 orders (5 points each) = 100 points → <strong>10% off</strong>
              <br />
              • Place 40 orders OR refer 20 friends = 200 points → <strong>Free drink</strong>
              <br />
              • Place 100 orders OR refer 50 friends = 500 points → <strong>Free appetizer</strong>
              <br />
              • Mix and match to earn faster!
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Point History
              </CardTitle>
              <CardDescription>Track your point earnings and redemptions</CardDescription>
            </div>
            <Badge variant="outline" className="text-sm">
              Total: {pointsData?.totalPoints || 0} pts
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {!pointsData?.transactions || pointsData.transactions.length === 0 ? (
            <div className="text-center py-8">
              <History className="h-12 w-12 mx-auto text-muted-foreground" />
              <p className="mt-2 text-muted-foreground">No point transactions yet</p>
              <p className="text-sm text-muted-foreground mt-1">Start earning points by placing orders!</p>
              <Button className="mt-4" onClick={() => router.push('/menu')}>
                <ShoppingCart className="h-4 w-4 mr-2" />
                Place Your First Order
              </Button>
            </div>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
              {pointsData.transactions
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .map((transaction) => {
                  const colorClass = getTransactionColor(transaction.type);
                  return (
                    <div 
                      key={transaction.id} 
                      className={`flex items-center justify-between p-4 border rounded-lg hover:shadow-md transition-all ${colorClass.split(' ')[1]}`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className={`p-2 rounded-lg ${colorClass.split(' ')[0]} bg-opacity-10`}>
                          {getTransactionIcon(transaction.type)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">{transaction.description}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(transaction.date).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        <div className={`font-bold ${transaction.type === 'redeemed' ? 'text-red-600' : 'text-green-600'}`}>
                          {transaction.type === 'redeemed' ? '-' : '+'}{Math.abs(transaction.points)} pts
                        </div>
                        <Badge variant="outline" className="mt-1 capitalize">
                          {transaction.type}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}