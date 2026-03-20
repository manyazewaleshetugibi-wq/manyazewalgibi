"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Check,
  RefreshCw,
  Save,
  AlertCircle,
  Loader2,
  ShoppingBag,
  ArrowRight,
  Search,
  X,
  Users,
  Utensils,
  Clock,
  Sparkles,
  FileText,
  MapPin,
  User as UserIcon,
  Package,
  CheckCircle,
  Clock3,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

// Types
interface MenuItem {
  _id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  categoryId: string;
  preparationTime: number;
  calories: number;
  tags: string[];
  stock?: number;
}

interface Category {
  _id: string;
  name: string;
  type: string;
  imageUrl: string;
}

interface CartItem extends MenuItem {
  quantity: number;
  specialInstructions?: string;
  cartId: string;
  orderItemId?: string;
}

interface OrderItem {
  id: string;
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  specialInstructions?: string;
  total: number;
}

interface Order {
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
  createdAt: string;
  updatedAt: string;
  orderItems: OrderItem[];
  paymentStatus: string;
  paymentMethod: string;
  waiterId: string;
  waiterInfo?: {
    id: string;
    name: string;
    role: string;
  };
  _id?: string;
}

const getStatusColor = (status: string) => {
  switch (status.toUpperCase()) {
    case 'COMPLETED':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'PENDING':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'CANCELLED':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'CONFIRMED':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'PREPARING':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'READY':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'SERVED':
      return 'bg-purple-100 text-purple-800 border-purple-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const getStatusIcon = (status: string) => {
  switch (status.toUpperCase()) {
    case 'COMPLETED':
      return <CheckCircle className="h-4 w-4" />;
    case 'PENDING':
      return <Clock3 className="h-4 w-4" />;
    case 'CANCELLED':
      return <AlertCircle className="h-4 w-4" />;
    case 'CONFIRMED':
      return <Check className="h-4 w-4" />;
    case 'PREPARING':
      return <Clock3 className="h-4 w-4" />;
    case 'READY':
      return <CheckCircle className="h-4 w-4" />;
    case 'SERVED':
      return <CheckCircle className="h-4 w-4" />;
    default:
      return <Clock3 className="h-4 w-4" />;
  }
};

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

// Menu Item Component
const MenuItemComponent = ({ item, addToCart }: { item: MenuItem; addToCart: (item: MenuItem) => void }) => (
  <Card className="overflow-hidden h-full transition-all duration-300 hover:shadow-md hover:scale-[1.01] bg-background hover:bg-background/95 rounded-lg border-border/40 hover:border-primary/30 group">
    <div className="relative aspect-square sm:aspect-[4/3] overflow-hidden rounded-t-lg">
      <Image
        src={item.imageUrl || "/placeholder.svg"}
        alt={item.name}
        fill
        sizes="(max-width: 640px) 150px, (max-width: 1200px) 200px, 250px"
        className="object-cover transition-transform duration-500 group-hover:scale-110"
        loading="lazy"
      />
      <div className="absolute top-2 right-2 bg-black/75 text-white text-xs font-semibold px-1.5 py-0.5 rounded-md backdrop-blur-sm">
        ${item.price.toFixed(2)}
      </div>
      
      {item.tags?.includes('bestseller') && (
        <div className="absolute top-2 left-2 bg-primary/90 text-primary-foreground text-[9px] font-medium px-1.5 py-0.5 rounded-md backdrop-blur-sm flex items-center gap-1">
          <Sparkles className="h-2.5 w-2.5" />
          Best
        </div>
      )}
      
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
        <Button
          variant="default"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            addToCart(item);
          }}
          className="rounded-full shadow-lg hover:shadow-primary/25 transition-all duration-300 transform hover:scale-105 bg-primary/90 backdrop-blur-sm"
        >
          <Plus className="mr-1 h-3.5 w-3.5" />
          Add to cart
        </Button>
      </div>
    </div>
    
    <CardContent className="p-2 sm:p-3 flex flex-col gap-1 sm:gap-2 h-full">
      <div className="space-y-0.5 flex-grow">
        <h3 className="font-medium text-xs sm:text-sm line-clamp-1 group-hover:text-primary transition-colors">{item.name}</h3>
        <p className="text-[10px] sm:text-xs text-muted-foreground line-clamp-1 sm:line-clamp-2">{item.description}</p>
      </div>

      <div className="flex items-center justify-between mt-auto pt-1">
        <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
          <Badge variant="outline" className="h-4 px-1 text-[8px] font-normal flex items-center gap-0.5">
            <Clock className="h-2 w-2" />
            {item.preparationTime}m
          </Badge>
          <Badge variant="outline" className="h-4 px-1 text-[8px] font-normal flex items-center gap-0.5">
            <Utensils className="h-2 w-2" />
            {item.calories}cal
          </Badge>
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            addToCart(item);
          }}
          className="h-6 w-6 sm:h-7 sm:w-7 rounded-full bg-primary/10 hover:bg-primary/20 text-primary p-0 relative overflow-hidden transition-transform hover:scale-110"
        >
          <Plus className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
          <span className="sr-only">Add to cart</span>
        </Button>
      </div>
    </CardContent>
  </Card>
);

// Cart Panel Component
const CartPanel = ({
  cart,
  updateQuantity,
  removeFromCart,
  subtotal,
  tax,
  discount,
  total,
  applyDiscount,
  setApplyDiscount,
  numberOfGuests,
  setNumberOfGuests,
  specialRequirements,
  setSpecialRequirements,
  orderNumber,
  handleSaveOrder,
  editingOrder,
  cancelEdit,
  orderStatus,
  setOrderStatus,
  customerName,
  setCustomerName,
  tableNumber,
  setTableNumber,
  onAddItems,
  onRefreshCart,
  isSaving
}: {
  cart: CartItem[];
  updateQuantity: (cartId: string, quantity: number) => void;
  removeFromCart: (cartId: string) => void;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  applyDiscount: boolean;
  setApplyDiscount: (value: boolean) => void;
  numberOfGuests: number;
  setNumberOfGuests: (value: number) => void;
  specialRequirements: string;
  setSpecialRequirements: (value: string) => void;
  orderNumber: string;
  handleSaveOrder: () => Promise<void>;
  editingOrder: Order | null;
  cancelEdit: () => void;
  orderStatus: string;
  setOrderStatus: (status: string) => void;
  customerName: string;
  setCustomerName: (name: string) => void;
  tableNumber: string;
  setTableNumber: (table: string) => void;
  onAddItems: () => void;
  onRefreshCart: () => void;
  isSaving: boolean;
}) => (
  <div className="flex flex-col h-full bg-gray-50/50 dark:bg-gray-900/50">
    <div className="flex items-center justify-between px-4 py-3 border-b bg-background sticky top-0 z-20">
      <div className="flex flex-col">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          Edit Order
          <Badge variant="secondary" className="rounded-full px-2.5">
            {cart.length}
          </Badge>
        </h3>
        <span className="text-xs text-muted-foreground font-mono">#{orderNumber}</span>
      </div>
      
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" onClick={onRefreshCart} title="Refresh Prices" className="h-8 w-8">
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
        <Badge variant="outline" className={`h-8 px-3 flex items-center justify-center border-0 ring-1 ring-inset ${
          orderStatus === 'COMPLETED' ? 'bg-green-50 text-green-700 ring-green-600/20' :
          orderStatus === 'PENDING' ? 'bg-yellow-50 text-yellow-700 ring-yellow-600/20' :
          'bg-gray-50 text-gray-700 ring-gray-600/20'
        }`}>
          {orderStatus}
        </Badge>
      </div>
    </div>

    {cart.length > 0 ? (
      <>
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="p-4 space-y-6">
            {/* Cart Items */}
            <div className="space-y-3">
              {cart.map((item) => (
                <div key={item.cartId} className="group flex gap-3 bg-card p-2.5 rounded-xl border shadow-sm hover:shadow-md transition-all duration-200">
                  <div className="relative h-20 w-20 flex-shrink-0 rounded-lg overflow-hidden bg-muted">
                    <Image
                      src={item.imageUrl || "/placeholder.svg"}
                      alt={item.name}
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                  </div>
                  
                  <div className="flex-1 flex flex-col justify-between min-w-0">
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0">
                        <h4 className="font-medium text-sm truncate">{item.name}</h4>
                        <p className="text-xs text-muted-foreground truncate">
                          ${item.price.toFixed(2)}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeFromCart(item.cartId)}
                        className="h-6 w-6 -mr-1 -mt-1 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    <div className="flex items-end justify-between mt-2">
                      <div className="flex items-center bg-muted/50 rounded-lg border p-0.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => updateQuantity(item.cartId, item.quantity - 1)}
                          className="h-6 w-6 rounded-md hover:bg-background shadow-sm"
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center text-xs font-medium tabular-nums">
                          {item.quantity}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => updateQuantity(item.cartId, item.quantity + 1)}
                          className="h-6 w-6 rounded-md hover:bg-background shadow-sm"
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      <span className="font-semibold text-sm">
                        ${(item.price * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              
              <Button 
                variant="ghost" 
                className="w-full border-2 border-dashed border-muted-foreground/20 hover:border-primary/50 hover:bg-primary/5 text-muted-foreground hover:text-primary h-12 rounded-xl gap-2" 
                onClick={onAddItems}
              >
                <Plus className="h-4 w-4" />
                Add More Items
              </Button>
            </div>

            {/* Order Details Card */}
            <div className="bg-card rounded-xl border shadow-sm p-4 space-y-4">
              <h4 className="font-medium text-sm flex items-center gap-2 text-muted-foreground">
                <FileText className="h-4 w-4" />
                Order Details
              </h4>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="table-number" className="text-xs text-muted-foreground">Table</Label>
                  <div className="relative">
                    <MapPin className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      id="table-number"
                      value={tableNumber}
                      onChange={(e) => setTableNumber(e.target.value)}
                      className="h-9 pl-8 text-sm bg-muted/30"
                      placeholder="Table No."
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="guests" className="text-xs text-muted-foreground">Guests</Label>
                  <div className="relative">
                    <Users className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Select value={numberOfGuests.toString()} onValueChange={(v) => setNumberOfGuests(parseInt(v))}>
                      <SelectTrigger id="guests" className="h-9 pl-8 text-sm bg-muted/30">
                        <SelectValue placeholder="Guests" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 10 }, (_, i) => (
                          <SelectItem key={i} value={(i + 1).toString()}>
                            {i + 1} {i === 0 ? 'Guest' : 'Guests'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="customer-name" className="text-xs text-muted-foreground">Customer</Label>
                <div className="relative">
                  <UserIcon className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    id="customer-name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="h-9 pl-8 text-sm bg-muted/30"
                    placeholder="Customer Name"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="special-requirements" className="text-xs text-muted-foreground">Notes</Label>
                <Textarea
                  id="special-requirements"
                  placeholder="Kitchen notes, allergies, etc..."
                  className="min-h-[60px] text-sm bg-muted/30 resize-none"
                  value={specialRequirements}
                  onChange={(e) => setSpecialRequirements(e.target.value)}
                />
              </div>
            </div>

            {/* Bill Summary */}
            <div className="bg-card rounded-xl border shadow-sm p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="apply-discount" className="text-sm font-normal">Apply Discount (10%)</Label>
                <Switch
                  id="apply-discount"
                  checked={applyDiscount}
                  onCheckedChange={setApplyDiscount}
                />
              </div>
              
              <Separator className="bg-border/50" />
              
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Tax (15%)</span>
                  <span>${tax.toFixed(2)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-green-600 font-medium">
                    <span>Discount</span>
                    <span>-${discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 font-bold text-lg">
                  <span>Total</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-background border-t space-y-3 z-20">
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={cancelEdit}
              className="flex-1 h-11 rounded-xl border-muted-foreground/20"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSaveOrder} 
              className="flex-1 h-11 rounded-xl shadow-lg shadow-primary/20"
              disabled={cart.length === 0 || isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Update Order
                </>
              )}
            </Button>
          </div>
        </div>
      </>
    ) : (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-muted/5">
        <div className="h-20 w-20 rounded-full bg-muted/50 flex items-center justify-center mb-4 animate-in zoom-in duration-300">
          <ShoppingBag className="h-10 w-10 text-muted-foreground/50" />
        </div>
        <h3 className="text-xl font-semibold mb-2">Empty Order</h3>
        <p className="text-sm text-muted-foreground max-w-[200px] mb-6">
          Select items from the menu to update the order.
        </p>
        <Button onClick={onAddItems} className="rounded-full px-8">
          Browse Menu
        </Button>
      </div>
    )}
  </div>
);

export default function OrderEditPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderStatus, setOrderStatus] = useState('PENDING');
  const [notes, setNotes] = useState('');
  const [tableNumber, setTableNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [numberOfGuests, setNumberOfGuests] = useState(1);
  const [applyDiscount, setApplyDiscount] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isMenuLoading, setIsMenuLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('orders');
  const [insufficientStockItem, setInsufficientStockItem] = useState<string | null>(null);

  // Fetch user orders and menu data
  useEffect(() => {
    if (status === 'authenticated' && session?.user?.id) {
      fetchOrders();
      fetchMenuData();
    }
  }, [session, status]);

  // Initialize cart when order is selected
  useEffect(() => {
    if (selectedOrder && menuItems.length > 0) {
      initializeCartFromOrder(selectedOrder);
    }
  }, [selectedOrder, menuItems]);

  const fetchOrders = useCallback(async (showLoading = true) => {
    if (!session?.user?.id) return;

    try {
      if (showLoading) setIsLoading(true);
      if (showLoading) setApiError(null);
      
      const response = await fetch(`/api/order/waitress/${session.user.id}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || data.message || `Server error: ${response.status}`);
      }
      
      if (data.success) {
        setOrders(data.orders || []);
      } else {
        throw new Error(data.error || 'Failed to fetch orders');
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch orders';
      
      if (showLoading) {
        setApiError(errorMessage);
        
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        });
      }
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, [session]);

  const fetchMenuData = useCallback(async () => {
    try {
      setIsMenuLoading(true);
      const [itemsRes, categoriesRes] = await Promise.all([
        fetch("/api/items"),
        fetch("/api/item-category"),
      ]);

      const itemsData = await itemsRes.json();
      const categoriesData = await categoriesRes.json();

      setMenuItems(itemsData.items || []);
      setCategories(categoriesData.data || []);
    } catch (error) {
      console.error("Error fetching menu data:", error);
      toast({
        title: "Error",
        description: "Failed to load menu data",
        variant: "destructive",
      });
    } finally {
      setIsMenuLoading(false);
    }
  }, []);

  // Poll for new orders
  useEffect(() => {
    if (status === 'authenticated' && session?.user?.id) {
      const intervalId = setInterval(() => {
        fetchOrders(false); // Background fetch
      }, 10000); // Poll every 10 seconds

      return () => clearInterval(intervalId);
    }
  }, [status, session, fetchOrders]);

  const initializeCartFromOrder = (order: Order) => {
    const cartItems: CartItem[] = [];
    
    order.orderItems.forEach((orderItem, index) => {
      const menuItem = menuItems.find(m => m._id === orderItem.menuItemId);
      
      if (menuItem) {
        // Use menu item data for consistency
        cartItems.push({
          ...menuItem,
          quantity: orderItem.quantity,
          specialInstructions: orderItem.specialInstructions,
          cartId: `order-item-${orderItem.id || `temp-${index}`}`,
          orderItemId: orderItem.id
        });
      } else {
        // If menu item not found, use order item data
        cartItems.push({
          _id: orderItem.menuItemId,
          name: orderItem.name,
          description: 'Item not found in current menu',
          price: orderItem.price,
          imageUrl: '/placeholder.svg',
          categoryId: '',
          preparationTime: 0,
          calories: 0,
          tags: [],
          quantity: orderItem.quantity,
          specialInstructions: orderItem.specialInstructions,
          cartId: `order-item-${orderItem.id || `temp-${index}`}`,
          orderItemId: orderItem.id
        });
      }
    });
    
    setCart(cartItems);
    setOrderStatus(order.status);
    setNotes(order.notes || '');
    setTableNumber(order.tableNumber || '');
    setCustomerName(order.customerName || '');
    setNumberOfGuests(order.numberOfGuests || 1);
    setApplyDiscount(order.discount > 0);
  };

  const handleSelectOrder = (order: Order) => {
    setSelectedOrder(order);
    setShowSuccessMessage(false);
  };

  const addToCart = useCallback((item: MenuItem) => {
    // Check stock availability
    if (item.stock !== undefined && item.stock <= 0) {
      toast({
        title: "Out of Stock",
        description: `${item.name} is currently out of stock.`,
        variant: "destructive",
      });
      setInsufficientStockItem(item.name);
      return;
    }

    setCart((prev) => {
      const existing = prev.find((i) => i._id === item._id);
      if (existing) {
        return prev.map((i) => 
          i.cartId === existing.cartId 
            ? { ...i, quantity: i.quantity + 1 } 
            : i
        );
      }
      return [...prev, { 
        ...item, 
        quantity: 1, 
        cartId: `cart-item-${Date.now()}-${Math.random()}` 
      }];
    });

    toast({
      title: "Added to Cart",
      description: `${item.name} added to order.`,
    });
  }, []);

  const removeFromCart = useCallback((cartId: string) => {
    setCart((prev) => prev.filter((item) => item.cartId !== cartId));
    toast({
      title: "Item Removed",
      description: "Item removed from order",
    });
  }, []);

  const updateQuantity = useCallback((cartId: string, newQuantity: number) => {
    if (newQuantity < 1) {
      removeFromCart(cartId);
      return;
    }
    setCart((prev) => 
      prev.map((item) => 
        item.cartId === cartId 
          ? { ...item, quantity: newQuantity } 
          : item
      )
    );
  }, [removeFromCart]);

  const refreshCartItems = useCallback(() => {
    setCart(prev => prev.map(item => {
      const menuItem = menuItems.find(m => m._id === item._id);
      if (menuItem) {
        return {
          ...item,
          name: menuItem.name,
          price: menuItem.price,
          description: menuItem.description,
          imageUrl: menuItem.imageUrl,
          categoryId: menuItem.categoryId,
          preparationTime: menuItem.preparationTime,
          calories: menuItem.calories,
          tags: menuItem.tags,
          stock: menuItem.stock
        };
      }
      return item;
    }));
    toast({
      title: "Cart Updated",
      description: "Items refreshed from menu data",
    });
  }, [menuItems]);

  const calculateSubtotal = () => {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const tax = subtotal * 0.15;
    const discount = applyDiscount ? subtotal * 0.1 : 0;
    return subtotal + tax - discount;
  };

  const handleSaveOrder = async () => {
    if (!session?.user?.id) return;

    if (cart.length === 0) {
      toast({
        title: "Empty Cart",
        description: "Please add items to the order before saving.",
        variant: "destructive",
      });
      return;
    }

    if (!selectedOrder) {
      toast({
        title: "No Order Selected",
        description: "Please select an order to update.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSaving(true);
      setApiError(null);

      // Create order items array with proper item IDs
      const processedOrderItems = cart.map(item => {
        const menuItem = menuItems.find(m => m._id === item._id);
        
        // Use the menu item price if available, otherwise use cart item price
        const finalPrice = menuItem ? menuItem.price : item.price;
        const finalName = menuItem ? menuItem.name : item.name;
        
        return {
          menuItemId: item._id, // Use the item ID from cart
          name: finalName,
          price: finalPrice,
          quantity: item.quantity,
          specialInstructions: item.specialInstructions || '',
          total: finalPrice * item.quantity
        };
      });

      // Recalculate totals based on processed items
      const newSubtotal = processedOrderItems.reduce((sum, item) => sum + item.total, 0);
      const newTax = newSubtotal * 0.15;
      const newDiscount = applyDiscount ? newSubtotal * 0.1 : 0;
      const newTotal = newSubtotal + newTax - newDiscount;

      // Prepare order data for API
      const orderData = {
        orderId: selectedOrder.id || selectedOrder._id,
        orderItems: processedOrderItems,
        notes: notes || '',
        tableNumber: tableNumber || '',
        customerName: customerName || 'Walk-in Customer',
        status: orderStatus,
        numberOfGuests: numberOfGuests || 1,
        discount: newDiscount,
        tax: newTax,
        totalAmount: newSubtotal,
        finalAmount: newTotal,
        waiterId: session.user.id
      };

      console.log('Sending order update:', orderData);

      const response = await fetch(`/api/order/waitress/${session.user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      });

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (e) {
          errorData = {};
        }
        throw new Error(errorData.error || 'Failed to update order');
      }

      const result = await response.json();

      if (result.success) {
        toast({
          title: 'Success',
          description: 'Order updated successfully!',
        });

        // Refresh orders to get updated data
        await fetchOrders();

        // Update selected order with new data
        if (result.order) {
          setSelectedOrder(result.order);
          // Re-initialize cart with updated order data
          initializeCartFromOrder(result.order);
        }

        setShowSuccessMessage(true);
      } else {
        throw new Error(result.error || 'Failed to update order');
      }

    } catch (error) {
      console.error('Error updating order:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update order';
      setApiError(errorMessage);
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const filteredMenuItems = useMemo(() => {
    return menuItems.filter((item) => {
      const matchesCategory = selectedCategory === "all" || item.categoryId === selectedCategory;
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [menuItems, selectedCategory, searchQuery]);

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

  const subtotal = calculateSubtotal();
  const tax = subtotal * 0.15;
  const discount = applyDiscount ? subtotal * 0.1 : 0;
  const total = subtotal + tax - discount;

  return (
    <div className="container mx-auto p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Order Management</h1>
          <p className="text-muted-foreground">
            {session.user?.name} • {session.user?.role || 'WAITER'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => fetchOrders(true)} variant="outline" size="sm" disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh Orders
          </Button>
        </div>
      </div>

      {apiError && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{apiError}</AlertDescription>
        </Alert>
      )}

      {showSuccessMessage && (
        <Alert className="mb-6 bg-green-50 border-green-200">
          <Check className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Order updated successfully!
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="orders">My Orders</TabsTrigger>
          <TabsTrigger value="menu">Menu</TabsTrigger>
        </TabsList>

        {/* Orders Tab */}
        <TabsContent value="orders" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Orders List */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle>Your Orders</CardTitle>
                <CardDescription>
                  {orders.length} order{orders.length !== 1 ? 's' : ''} found
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8">
                    <Loader2 className="h-8 w-8 mx-auto animate-spin text-muted-foreground" />
                    <p className="mt-2 text-muted-foreground">Loading orders...</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[500px] overflow-y-auto pr-4">
                    {orders.map(order => (
                      <Card
                        key={order.id}
                        className={`cursor-pointer transition-all hover:shadow-md ${
                          selectedOrder?.id === order.id ? 'border-primary ring-2 ring-primary/20' : ''
                        }`}
                        onClick={() => handleSelectOrder(order)}
                      >
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold">#{order.orderNumber}</h3>
                                <Badge 
                                  className={`${getStatusColor(order.status)} text-xs flex items-center gap-1`}
                                >
                                  {getStatusIcon(order.status)}
                                  {order.status}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {order.tableNumber || 'No table'}
                              </p>
                              <p className="text-sm font-medium">
                                ${order.finalAmount.toFixed(2)}
                              </p>
                            </div>
                            <div className="text-right space-y-1">
                              <p className="text-xs text-muted-foreground">
                                {new Date(order.createdAt).toLocaleDateString()}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {order.orderItems.length} item{order.orderItems.length !== 1 ? 's' : ''}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Order Details */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                  <div>
                    <CardTitle>
                      {selectedOrder ? `Edit Order #${selectedOrder.orderNumber}` : 'Select an Order'}
                    </CardTitle>
                    <CardDescription>
                      {selectedOrder && (
                        <div className="flex items-center gap-2">
                          <span>Status: {selectedOrder.status}</span>
                          <span>• Table: {selectedOrder.tableNumber || 'N/A'}</span>
                          <span>• Customer: {selectedOrder.customerName || 'N/A'}</span>
                        </div>
                      )}
                    </CardDescription>
                  </div>
                  {selectedOrder && (
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setIsCartOpen(true)}
                      >
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        View Cart ({cart.length})
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>

              {selectedOrder ? (
                <CardContent className="space-y-6">
                  {/* Quick Actions */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Quick Actions</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Button 
                        onClick={() => {
                          setActiveTab('menu');
                          setIsCartOpen(true);
                        }}
                        className="w-full gap-2"
                        variant="default"
                      >
                        <ShoppingBag className="h-4 w-4" />
                        Add More Items
                        <ArrowRight className="h-4 w-4 ml-auto" />
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Order Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="table">Table Number</Label>
                      <Input
                        id="table"
                        value={tableNumber}
                        onChange={(e) => setTableNumber(e.target.value)}
                        placeholder="e.g., T-5, Takeaway"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="customer">Customer Name</Label>
                      <Input
                        id="customer"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="Walk-in Customer"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Guests</Label>
                      <div className="flex items-center h-10 px-3 border rounded-md bg-muted/50 text-sm">
                        {numberOfGuests} Person{numberOfGuests !== 1 ? 's' : ''}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <div className="flex items-center h-10 px-3 border rounded-md bg-muted/50 text-sm">
                        {orderStatus}
                      </div>
                    </div>
                  </div>

                  {/* Order Items */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-semibold">Order Items ({cart.length})</h3>
                    </div>

                    {cart.length === 0 ? (
                      <div className="text-center py-8 border-2 border-dashed rounded-lg">
                        <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground" />
                        <p className="mt-2 text-muted-foreground">No items in this order</p>
                        <Button 
                          onClick={() => {
                            setActiveTab('menu');
                            setIsCartOpen(true);
                          }} 
                          className="mt-4"
                        >
                          <ShoppingBag className="h-4 w-4 mr-2" />
                          Add Items from Menu
                        </Button>
                      </div>
                    ) : (
                      <div className="border rounded-lg overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Item</TableHead>
                              <TableHead className="text-right">Price</TableHead>
                              <TableHead className="text-center">Qty</TableHead>
                              <TableHead className="text-right">Total</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {cart.map((item) => (
                              <TableRow key={item.cartId}>
                                <TableCell>
                                  <div>
                                    <p className="font-medium">{item.name}</p>
                                    {item.specialInstructions && (
                                      <p className="text-xs text-muted-foreground">
                                        Note: {item.specialInstructions}
                                      </p>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className="text-right">
                                  ${item.price.toFixed(2)}
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center justify-center gap-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-6 w-6 p-0"
                                      onClick={() => updateQuantity(item.cartId, item.quantity - 1)}
                                    >
                                      -
                                    </Button>
                                    <span className="w-8 text-center">{item.quantity}</span>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-6 w-6 p-0"
                                      onClick={() => updateQuantity(item.cartId, item.quantity + 1)}
                                    >
                                      +
                                    </Button>
                                  </div>
                                </TableCell>
                                <TableCell className="text-right">
                                  ${(item.price * item.quantity).toFixed(2)}
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-8 w-8 p-0 text-destructive"
                                    onClick={() => removeFromCart(item.cartId)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>

                  {/* Order Notes */}
                  <div>
                    <Label htmlFor="notes">Order Notes</Label>
                    <Textarea
                      id="notes"
                      placeholder="Add any special instructions or notes..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                    />
                  </div>

                  {/* Order Summary */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Order Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Subtotal</span>
                          <span>${subtotal.toFixed(2)}</span>
                        </div>
                        {discount > 0 && (
                          <div className="flex justify-between text-green-600">
                            <span>Discount</span>
                            <span>-${discount.toFixed(2)}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span>Tax (15%)</span>
                          <span>${tax.toFixed(2)}</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between text-lg font-bold">
                          <span>Total</span>
                          <span>${total.toFixed(2)}</span>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="flex gap-3 border-t pt-6">
                      <Button 
                        variant="outline" 
                        className="flex-1"
                        onClick={() => setSelectedOrder(null)}
                      >
                        Cancel
                      </Button>
                      <Button 
                        className="flex-1"
                        onClick={handleSaveOrder}
                        disabled={isSaving || cart.length === 0}
                      >
                        {isSaving ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Updating...
                          </>
                        ) : (
                          <>
                            <Save className="mr-2 h-4 w-4" />
                            Update Order
                          </>
                        )}
                      </Button>
                    </CardFooter>
                  </Card>
                </CardContent>
              ) : (
                <CardContent className="text-center py-12">
                  <ShoppingCart className="h-16 w-16 mx-auto text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-semibold">No Order Selected</h3>
                  <p className="text-muted-foreground mt-2">
                    Select an order from the list to edit it
                  </p>
                </CardContent>
              )}
            </Card>
          </div>
        </TabsContent>

        {/* Menu Tab */}
        <TabsContent value="menu" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <CardTitle>Menu</CardTitle>
                  <CardDescription>
                    Browse and add items to your order
                  </CardDescription>
                </div>
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search menu items..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8 w-full md:w-64"
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setIsCartOpen(!isCartOpen)}
                    className="relative"
                  >
                    <ShoppingCart className="h-4 w-4" />
                    {cart.length > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 bg-primary text-primary-foreground text-[9px] rounded-full h-4 w-4 flex items-center justify-center">
                        {cart.length}
                      </span>
                    )}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Categories */}
              <div className="flex w-full overflow-x-auto pb-4 mb-6">
                <div className="flex space-x-2">
                  <Button
                    variant={selectedCategory === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedCategory('all')}
                    className="rounded-full shrink-0"
                  >
                    All
                  </Button>
                  {categories.map((category) => (
                    <Button
                      key={category._id}
                      variant={selectedCategory === category._id ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedCategory(category._id)}
                      className="rounded-full whitespace-nowrap shrink-0"
                    >
                      <span className="flex items-center gap-1">
                        <Utensils className="h-4 w-4" />
                        {category.name}
                      </span>
                    </Button>
                  ))}
                </div>
              </div>

              {/* Menu Items */}
              {isMenuLoading ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                    <div key={i} className="h-64 bg-muted/40 animate-pulse rounded-lg"></div>
                  ))}
                </div>
              ) : filteredMenuItems.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  <AnimatePresence mode="popLayout">
                    {filteredMenuItems.map((item, index) => (
                      <motion.div
                        key={item._id}
                        layout
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        variants={fadeInUp}
                        transition={{ duration: 0.25, delay: index * 0.02 }}
                      >
                        <MenuItemComponent item={item} addToCart={addToCart} />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No items found</h3>
                  <p className="text-muted-foreground">
                    Try adjusting your search or selecting a different category.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Cart Sidebar */}
      <Dialog open={isCartOpen} onOpenChange={setIsCartOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col overflow-hidden p-0">
          <DialogHeader className="sr-only">
            <DialogTitle>Order Cart</DialogTitle>
            <DialogDescription>Review and modify items in your order</DialogDescription>
          </DialogHeader>
          <CartPanel
            cart={cart}
            updateQuantity={updateQuantity}
            removeFromCart={removeFromCart}
            subtotal={subtotal}
            tax={tax}
            discount={discount}
            total={total}
            applyDiscount={applyDiscount}
            setApplyDiscount={setApplyDiscount}
            numberOfGuests={numberOfGuests}
            setNumberOfGuests={setNumberOfGuests}
            specialRequirements={notes}
            setSpecialRequirements={setNotes}
            orderNumber={selectedOrder?.orderNumber || `ORD-${Date.now().toString().slice(-6)}`}
            handleSaveOrder={handleSaveOrder}
            editingOrder={selectedOrder}
            cancelEdit={() => {
              setSelectedOrder(null);
              setCart([]);
              setIsCartOpen(false);
            }}
            orderStatus={orderStatus}
            setOrderStatus={setOrderStatus}
            customerName={customerName}
            setCustomerName={setCustomerName}
            tableNumber={tableNumber}
            setTableNumber={setTableNumber}
            onAddItems={() => {
              setActiveTab('menu');
              setIsCartOpen(false);
            }}
            onRefreshCart={refreshCartItems}
            isSaving={isSaving}
          />
        </DialogContent>
      </Dialog>

      {/* Insufficient Stock Dialog */}
      <Dialog open={!!insufficientStockItem} onOpenChange={() => setInsufficientStockItem(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Insufficient Stock</DialogTitle>
            <DialogDescription>
              We're sorry, but there is not enough stock for the requested item.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2">
            <div className="bg-destructive/10 rounded-full p-2">
              <X className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="font-medium">{insufficientStockItem}</p>
              <p className="text-sm text-muted-foreground">
                Please adjust your order or check back later.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setInsufficientStockItem(null)}>
              Understood
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}