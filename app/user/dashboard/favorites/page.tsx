"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { 
  Heart, 
  Star, 
  Clock, 
  TrendingUp, 
  ShoppingBag, 
  Filter,
  Search,
  X,
  Plus,
  ChevronRight,
  Loader2,
  Pizza,
  UtensilsCrossed,
  Coffee,
  Cake,
  Salad,
  Beer,
  AlertCircle,
  Crown,
  RefreshCw
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import Image from 'next/image';
import Link from 'next/link';

interface FavoriteItem {
  id: string;
  name: string;
  price: number;
  category: string;
  image?: string;
  orderCount: number;
  frequency: string;
  totalQuantityOrdered: number;
  totalSpent: number;
  lastOrdered: string;
  isManual?: boolean;
}

interface FavoritesData {
  topFavorites: FavoriteItem[];
  allFavorites: FavoriteItem[];
  recentItems: FavoriteItem[];
  totalOrders: number;
  stats: {
    totalItemsOrdered: number;
    uniqueItemsOrdered: number;
    mostOrderedItem: FavoriteItem | null;
    averageOrderValue: number;
    favoriteCategory: string | null;
    totalSpent: number;
  };
}

interface FavoritesResponse {
  success: boolean;
  data?: FavoritesData;
  error?: string;
  message?: string;
}

export default function FavoritesPage() {
  const { data: session, status: sessionStatus } = useSession();
  const [loading, setLoading] = useState(true);
  const [favoritesData, setFavoritesData] = useState<FavoritesData | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [addingToCart, setAddingToCart] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (sessionStatus === 'authenticated') {
      fetchFavorites();
    } else if (sessionStatus === 'unauthenticated') {
      setLoading(false);
      setError('Please sign in to view your favorites');
    }
  }, [sessionStatus]);

  const fetchFavorites = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fixed: Changed from '/api/user/favorite' to '/api/user/favorites'
      const response = await fetch('/api/user/favorite');
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Please sign in to view your favorites');
        } else if (response.status === 404) {
          throw new Error('Favorites API endpoint not found');
        } else {
          throw new Error(`Failed to load favorites: ${response.status}`);
        }
      }
      
      const data: FavoritesResponse = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch favorites');
      }
      
      // Ensure all required arrays exist with default values
      setFavoritesData({
        topFavorites: data.data?.topFavorites || [],
        allFavorites: data.data?.allFavorites || [],
        recentItems: data.data?.recentItems || [],
        totalOrders: data.data?.totalOrders || 0,
        stats: data.data?.stats || {
          totalItemsOrdered: 0,
          uniqueItemsOrdered: 0,
          mostOrderedItem: null,
          averageOrderValue: 0,
          favoriteCategory: null,
          totalSpent: 0
        }
      });
      
    } catch (error) {
      console.error('Error fetching favorites:', error);
      setError(error instanceof Error ? error.message : 'Failed to load favorites');
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load favorites",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addToFavorites = async (item: any) => {
    try {
      const response = await fetch('/api/user/favorites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          itemId: item.id,
          itemName: item.name,
          price: item.price,
          category: item.category,
          image: item.image
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add to favorites');
      }
      
      toast({
        title: "Added to favorites",
        description: `${item.name} has been added to your favorites`,
      });
      
      // Refresh favorites
      fetchFavorites();
    } catch (error) {
      console.error('Error adding to favorites:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add to favorites",
        variant: "destructive",
      });
    }
  };

  const removeFromFavorites = async (itemId: string) => {
    try {
      const response = await fetch(`/api/user/favorites?itemId=${itemId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to remove from favorites');
      }
      
      toast({
        title: "Removed from favorites",
        description: "Item has been removed from your favorites",
      });
      
      // Refresh favorites
      fetchFavorites();
    } catch (error) {
      console.error('Error removing from favorites:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to remove from favorites",
        variant: "destructive",
      });
    }
  };

  const addToCart = (item: FavoriteItem) => {
    setAddingToCart(item.id);
    // Simulate API call
    setTimeout(() => {
      toast({
        title: "Added to cart",
        description: `${item.name} has been added to your cart`,
      });
      setAddingToCart(null);
    }, 500);
  };

  const getCategoryIcon = (category: string) => {
    switch (category?.toLowerCase()) {
      case 'pizza':
      case 'pizzas':
        return <Pizza className="h-4 w-4" />;
      case 'pasta':
      case 'italian':
        return <UtensilsCrossed className="h-4 w-4" />;
      case 'coffee':
      case 'beverages':
      case 'drinks':
        return <Coffee className="h-4 w-4" />;
      case 'dessert':
      case 'desserts':
      case 'sweets':
        return <Cake className="h-4 w-4" />;
      case 'salad':
      case 'salads':
        return <Salad className="h-4 w-4" />;
      case 'alcohol':
      case 'beer':
      case 'wine':
        return <Beer className="h-4 w-4" />;
      default:
        return <UtensilsCrossed className="h-4 w-4" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category?.toLowerCase()) {
      case 'pizza': return 'bg-red-100 text-red-700';
      case 'pasta': return 'bg-amber-100 text-amber-700';
      case 'coffee': return 'bg-amber-100 text-amber-700';
      case 'dessert': return 'bg-pink-100 text-pink-700';
      case 'salad': return 'bg-green-100 text-green-700';
      case 'alcohol': return 'bg-blue-100 text-blue-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  // Safely filter favorites with null checks
  const filteredFavorites = (favoritesData?.allFavorites || []).filter(item => {
    // Skip if item is undefined
    if (!item) return false;
    
    // Search filter
    if (searchQuery && !item.name?.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    
    // Category filter
    if (selectedCategory !== 'all' && item.category !== selectedCategory) {
      return false;
    }
    
    return true;
  });

  // Safely get unique categories with null checks
  const categories = ['all', ...new Set(
    (favoritesData?.allFavorites || [])
      .map(item => item?.category)
      .filter((category): category is string => !!category)
  )];

  // Loading state
  if (sessionStatus === 'loading' || loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-lg">Loading your favorites...</p>
        </div>
      </div>
    );
  }

  // Unauthenticated state
  if (sessionStatus === 'unauthenticated') {
    return (
      <div className="container mx-auto p-6">
        <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
          <AlertCircle className="h-12 w-12 text-destructive" />
          <h2 className="text-xl font-semibold">Authentication Required</h2>
          <p className="text-muted-foreground text-center">Please sign in to view your favorites</p>
          <Button asChild>
            <Link href="/auth/signin">Sign In</Link>
          </Button>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
          <AlertCircle className="h-12 w-12 text-destructive" />
          <h2 className="text-xl font-semibold">Error Loading Favorites</h2>
          <p className="text-muted-foreground text-center">{error}</p>
          <Button onClick={fetchFavorites} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  // No favorites state
  if (!favoritesData || favoritesData.totalOrders === 0) {
    return (
      <div className="container mx-auto p-6">
        <Card className="text-center py-12">
          <div className="mx-auto max-w-md">
            <div className="inline-block p-4 rounded-full bg-rose-100 mb-4">
              <Heart className="h-12 w-12 text-rose-500" />
            </div>
            <h2 className="text-2xl font-bold">No Favorites Yet</h2>
            <p className="text-muted-foreground mt-2 mb-6">
              Start ordering to discover your favorite foods! Your favorites will be automatically 
              calculated based on your order history.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild size="lg">
                <Link href="/menu">
                  <ShoppingBag className="h-5 w-5 mr-2" />
                  Browse Menu
                </Link>
              </Button>
              <Button variant="outline" asChild size="lg">
                <Link href="/user/dashboard/order">
                  <Clock className="h-5 w-5 mr-2" />
                  View Orders
                </Link>
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  const { topFavorites, allFavorites, recentItems, totalOrders, stats } = favoritesData;

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Heart className="h-8 w-8 text-rose-500" />
            My Favorite Foods
          </h1>
          <p className="text-muted-foreground mt-1">
            Based on your {totalOrders} order{totalOrders !== 1 ? 's' : ''} • ${stats.totalSpent?.toFixed(2) || '0.00'} total spent
          </p>
        </div>
        <Button asChild>
          <Link href="/menu">
            <Plus className="h-4 w-4 mr-2" />
            Order Now
          </Link>
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Top Favorite</p>
                <h3 className="text-lg font-bold mt-1 truncate">
                  {stats.mostOrderedItem?.name || 'None yet'}
                </h3>
                {stats.mostOrderedItem && (
                  <p className="text-xs text-muted-foreground">
                    Ordered {stats.mostOrderedItem.orderCount} times
                  </p>
                )}
              </div>
              <div className="p-3 rounded-full bg-rose-100">
                <Crown className="h-6 w-6 text-rose-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Unique Items</p>
                <h3 className="text-2xl font-bold mt-1">{stats.uniqueItemsOrdered || 0}</h3>
                <p className="text-xs text-muted-foreground">
                  {stats.totalItemsOrdered || 0} total items
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
                <p className="text-sm text-muted-foreground">Favorite Category</p>
                <h3 className="text-lg font-bold mt-1 capitalize">
                  {stats.favoriteCategory || 'None'}
                </h3>
                <p className="text-xs text-muted-foreground">
                  Most ordered category
                </p>
              </div>
              <div className="p-3 rounded-full bg-green-100">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Order</p>
                <h3 className="text-2xl font-bold mt-1">${stats.averageOrderValue?.toFixed(2) || '0.00'}</h3>
                <p className="text-xs text-muted-foreground">
                  Per order average
                </p>
              </div>
              <div className="p-3 rounded-full bg-purple-100">
                <Clock className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Top Favorites */}
        <div className="lg:col-span-2 space-y-6">
          {/* Search and Filter */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search your favorites..."
                    className="w-full pl-10 pr-4 py-2 border rounded-lg"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2"
                    >
                      <X className="h-4 w-4 text-muted-foreground" />
                    </button>
                  )}
                </div>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {categories.map(category => (
                    <Button
                      key={category}
                      variant={selectedCategory === category ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedCategory(category)}
                      className="whitespace-nowrap"
                    >
                      {category === 'all' ? (
                        <>
                          <Filter className="h-3 w-3 mr-1" />
                          All
                        </>
                      ) : (
                        <>
                          {getCategoryIcon(category)}
                          <span className="ml-1 capitalize">{category}</span>
                        </>
                      )}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Favorites List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-rose-500" />
                All Favorites ({filteredFavorites.length})
              </CardTitle>
              <CardDescription>
                Your most ordered items, ranked by frequency
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredFavorites.length > 0 ? (
                <div className="space-y-4">
                  {filteredFavorites.map((item, index) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      {/* Rank Badge */}
                      <div className="flex flex-col items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold
                          ${index === 0 ? 'bg-rose-100 text-rose-700' : 
                            index === 1 ? 'bg-amber-100 text-amber-700' : 
                            index === 2 ? 'bg-yellow-100 text-yellow-700' : 
                            'bg-gray-100 text-gray-700'}`}
                        >
                          {index + 1}
                        </div>
                        {index < 3 && (
                          <div className="mt-1 text-xs text-muted-foreground">
                            {index === 0 ? 'Top' : index === 1 ? '2nd' : '3rd'}
                          </div>
                        )}
                      </div>

                      {/* Item Image */}
                      <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                        {item.image ? (
                          <Image
                            src={item.image}
                            alt={item.name}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <UtensilsCrossed className="h-8 w-8 text-gray-400" />
                          </div>
                        )}
                      </div>

                      {/* Item Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h3 className="font-semibold truncate">{item.name}</h3>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <Badge className={getCategoryColor(item.category)}>
                                <span className="flex items-center gap-1">
                                  {getCategoryIcon(item.category)}
                                  <span className="capitalize">{item.category}</span>
                                </span>
                              </Badge>
                              <span className="text-sm text-muted-foreground">
                                ${item.price?.toFixed(2) || '0.00'}
                              </span>
                              {item.isManual && (
                                <Badge variant="outline" className="text-xs">
                                  Manual
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="font-bold text-lg">${item.totalSpent?.toFixed(2) || '0.00'}</div>
                            <div className="text-sm text-muted-foreground">
                              {item.orderCount || 0} order{item.orderCount !== 1 ? 's' : ''}
                            </div>
                          </div>
                        </div>

                        {/* Frequency Bar */}
                        <div className="mt-3">
                          <div className="flex justify-between text-xs mb-1">
                            <span>Order Frequency</span>
                            <span>{item.frequency || '0'}% of your items</span>
                          </div>
                          <Progress 
                            value={parseFloat(item.frequency) || 0} 
                            className="h-2"
                          />
                        </div>

                        {/* Last Ordered */}
                        <div className="flex items-center justify-between mt-2">
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Last ordered: {item.lastOrdered ? new Date(item.lastOrdered).toLocaleDateString() : 'Never'}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => addToCart(item)}
                              disabled={addingToCart === item.id}
                            >
                              {addingToCart === item.id ? (
                                <Loader2 className="h-3 w-3 animate-spin mr-1" />
                              ) : (
                                <Plus className="h-3 w-3 mr-1" />
                              )}
                              Add
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => removeFromFavorites(item.id)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Heart className="h-16 w-16 mx-auto text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-semibold">No matching favorites</h3>
                  <p className="text-muted-foreground mt-2">
                    {searchQuery 
                      ? `No favorites match "${searchQuery}"`
                      : `No favorites in "${selectedCategory}" category`}
                  </p>
                  {(searchQuery || selectedCategory !== 'all') && (
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={() => {
                        setSearchQuery('');
                        setSelectedCategory('all');
                      }}
                    >
                      Clear filters
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Stats & Top Picks */}
        <div className="space-y-6">
          {/* Top 3 Favorites */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-amber-500" />
                Top 3 Favorites
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {(topFavorites || []).slice(0, 3).map((item, index) => (
                <div key={item.id} className="flex items-center gap-3 p-3 border rounded-lg">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white
                    ${index === 0 ? 'bg-rose-500' : 
                      index === 1 ? 'bg-amber-500' : 
                      'bg-yellow-500'}`}
                  >
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold">{item.name}</h4>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">
                        {item.orderCount || 0} order{item.orderCount !== 1 ? 's' : ''}
                      </span>
                      <Separator orientation="vertical" className="h-3" />
                      <span className="font-medium">${item.totalSpent?.toFixed(2) || '0.00'} spent</span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => addToCart(item)}
                    disabled={addingToCart === item.id}
                  >
                    {addingToCart === item.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Plus className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Recently Ordered */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Recently Ordered
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(recentItems || []).map(item => (
                <div key={item.id} className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors">
                  <div className="w-12 h-12 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                    {item.image ? (
                      <div className="w-full h-full relative">
                        <Image
                          src={item.image}
                          alt={item.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <UtensilsCrossed className="h-6 w-6 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm truncate">{item.name}</h4>
                    <p className="text-xs text-muted-foreground">
                      Last: {item.lastOrdered ? new Date(item.lastOrdered).toLocaleDateString() : 'Never'}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => addToCart(item)}
                    disabled={addingToCart === item.id}
                    className="flex-shrink-0"
                  >
                    {addingToCart === item.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Category Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                By Category
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {Object.entries(
                (allFavorites || []).reduce((acc, item) => {
                  if (item?.category) {
                    acc[item.category] = (acc[item.category] || 0) + 1;
                  }
                  return acc;
                }, {} as Record<string, number>)
              ).map(([category, count]) => (
                <div key={category} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getCategoryIcon(category)}
                    <span className="font-medium capitalize">{category}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{count} items</Badge>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setSelectedCategory(category)}
                    >
                      <Filter className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Your Taste Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Most Ordered</span>
                <span className="font-semibold">{stats.mostOrderedItem?.name || 'None'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Favorite Category</span>
                <span className="font-semibold capitalize">{stats.favoriteCategory || 'None'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Total Items Ordered</span>
                <span className="font-semibold">{stats.totalItemsOrdered || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Average Order Value</span>
                <span className="font-semibold">${stats.averageOrderValue?.toFixed(2) || '0.00'}</span>
              </div>
              <Separator />
              <div className="pt-2">
                <p className="text-xs text-muted-foreground">
                  Based on {totalOrders} order{totalOrders !== 1 ? 's' : ''} • ${stats.totalSpent?.toFixed(2) || '0.00'} spent
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}