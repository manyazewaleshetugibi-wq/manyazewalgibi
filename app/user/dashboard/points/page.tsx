"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Gift, 
  TrendingUp, 
  History, 
  ArrowUpRight, 
  ArrowDownRight,
  Zap,
  Copy,
  CheckCircle
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/hooks/use-toast';

interface PointTransaction {
  id: string;
  type: 'referral' | 'order' | 'bonus' | 'redeemed';
  points: number;
  description: string;
  date: string;
}

interface PointsData {
  totalPoints: number;
  availablePoints: number;
  transactions: PointTransaction[];
  referralCode: string;
}

export default function PointsPage() {
  const [pointsData, setPointsData] = useState<PointsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPoints();
  }, []);

  const fetchPoints = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/user/points');
      if (response.ok) {
        const data = await response.json();
        setPointsData(data);
      } else {
        // Mock data if API fails
        setPointsData({
          totalPoints: 125,
          availablePoints: 125,
          transactions: [
            { id: '1', type: 'referral', points: 10, description: 'Referral - John Doe', date: '2024-01-15' },
            { id: '2', type: 'order', points: 5, description: 'Order #ORD-001', date: '2024-01-14' },
            { id: '3', type: 'referral', points: 10, description: 'Referral - Jane Smith', date: '2024-01-13' },
            { id: '4', type: 'order', points: 5, description: 'Order #ORD-002', date: '2024-01-12' },
          ],
          referralCode: 'REF-' + Date.now().toString().slice(-6)
        });
      }
    } catch (error) {
      console.error('Error fetching points:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyReferralCode = () => {
    if (!pointsData?.referralCode) return;
    navigator.clipboard.writeText(pointsData.referralCode);
    toast({
      title: "Copied!",
      description: "Referral code copied to clipboard",
    });
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'referral':
        return <ArrowUpRight className="h-4 w-4 text-green-500" />;
      case 'order':
        return <TrendingUp className="h-4 w-4 text-blue-500" />;
      case 'bonus':
        return <Zap className="h-4 w-4 text-yellow-500" />;
      case 'redeemed':
        return <ArrowDownRight className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
          <p className="mt-2">Loading points...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">My Points</h1>
        <p className="text-muted-foreground">Track and redeem your loyalty points</p>
      </div>

      {/* Points Summary */}
      <Card className="bg-gradient-to-br from-primary to-primary/80 text-white">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between">
            <div>
              <p className="text-sm opacity-90">Available Points</p>
              <h2 className="text-4xl font-bold mt-2">{pointsData?.availablePoints || 0}</h2>
              <p className="text-sm opacity-90 mt-2">
                ≈ ${((pointsData?.availablePoints || 0) * 0.01).toFixed(2)} value
              </p>
            </div>
            <div className="mt-4 md:mt-0">
              <Gift className="h-16 w-16 opacity-80" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* How to Earn */}
      <Card>
        <CardHeader>
          <CardTitle>How to Earn Points</CardTitle>
          <CardDescription>Ways to accumulate more points</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-primary">0.10</div>
              <h4 className="font-semibold mt-2">Refer a Friend</h4>
              <p className="text-sm text-muted-foreground mt-1">For their first order</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-primary">0.05</div>
              <h4 className="font-semibold mt-2">Place an Order</h4>
              <p className="text-sm text-muted-foreground mt-1">For every order</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-primary">0.02</div>
              <h4 className="font-semibold mt-2">Write a Review</h4>
              <p className="text-sm text-muted-foreground mt-1">For each review</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-primary">0.50</div>
              <h4 className="font-semibold mt-2">Birthday Bonus</h4>
              <p className="text-sm text-muted-foreground mt-1">On your birthday</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Referral Code */}
      <Card>
        <CardHeader>
          <CardTitle>Your Referral Code</CardTitle>
          <CardDescription>Share this code to earn 0.10 points per referral</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <div className="flex-1 p-4 bg-muted rounded-lg font-mono text-lg">
              {pointsData?.referralCode || 'LOADING...'}
            </div>
            <Button onClick={copyReferralCode} size="lg">
              <Copy className="h-4 w-4 mr-2" />
              Copy
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Redeem Points */}
      <Card>
        <CardHeader>
          <CardTitle>Redeem Points</CardTitle>
          <CardDescription>Exchange your points for rewards</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg text-center hover:border-primary transition-colors">
              <div className="text-2xl font-bold text-primary">50 pts</div>
              <h4 className="font-semibold mt-2">10% Off</h4>
              <p className="text-sm text-muted-foreground mt-1">Next order discount</p>
              <Button 
                className="mt-4 w-full" 
                disabled={(pointsData?.availablePoints || 0) < 50}
              >
                Redeem Now
              </Button>
            </div>
            <div className="p-4 border rounded-lg text-center hover:border-primary transition-colors">
              <div className="text-2xl font-bold text-primary">100 pts</div>
              <h4 className="font-semibold mt-2">Free Drink</h4>
              <p className="text-sm text-muted-foreground mt-1">Any drink free</p>
              <Button 
                className="mt-4 w-full" 
                disabled={(pointsData?.availablePoints || 0) < 100}
              >
                Redeem Now
              </Button>
            </div>
            <div className="p-4 border rounded-lg text-center hover:border-primary transition-colors">
              <div className="text-2xl font-bold text-primary">200 pts</div>
              <h4 className="font-semibold mt-2">Free Appetizer</h4>
              <p className="text-sm text-muted-foreground mt-1">Complimentary starter</p>
              <Button 
                className="mt-4 w-full" 
                disabled={(pointsData?.availablePoints || 0) < 200}
              >
                Redeem Now
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle>Point History</CardTitle>
          <CardDescription>Track your point earnings and redemptions</CardDescription>
        </CardHeader>
        <CardContent>
          {pointsData?.transactions && pointsData.transactions.length === 0 ? (
            <div className="text-center py-8">
              <History className="h-12 w-12 mx-auto text-muted-foreground" />
              <p className="mt-2 text-muted-foreground">No point transactions yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pointsData?.transactions?.map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-muted rounded-lg">
                      {getTransactionIcon(transaction.type)}
                    </div>
                    <div>
                      <p className="font-medium">{transaction.description}</p>
                      <p className="text-sm text-muted-foreground">{transaction.date}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`font-bold ${transaction.type === 'redeemed' ? 'text-red-600' : 'text-green-600'}`}>
                      {transaction.type === 'redeemed' ? '-' : '+'}{transaction.points} pts
                    </div>
                    <Badge variant="outline" className="mt-1 capitalize">
                      {transaction.type}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}