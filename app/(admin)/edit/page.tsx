"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  ArrowRightLeft,
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
  Send,
  AlertTriangle,
  Volume2,
  BellRing,
  Lock,
  Unlock,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useNotificationSound } from '@/hooks/useNotificationSound';

// Helper function to calculate price breakdown (extract tax from price that includes tax)
const calculatePriceBreakdown = (priceWithTax: number, taxRate: number = 0.15) => {
  const originalPrice = priceWithTax / (1 + taxRate);
  const taxAmount = priceWithTax - originalPrice;
  return { originalPrice, taxAmount };
};

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

interface Waiter {
  _id: string;
  name: string;
  email: string;
  role: string;
  shift?: string;
  avatar?: string;
}

interface Restaurant {
  _id: string;
  name: string;
  shortName?: string;
  isActive: boolean;
}

interface CartItem extends MenuItem {
  quantity: number;
  specialInstructions?: string;
  cartId: string;
  orderItemId?: string;
  originalPrice?: number;
  taxAmount?: number;
  isUneditable?: boolean;
  uneditableAt?: string;
  uneditableBy?: string;
  itemStatus?: string;
}

interface OrderItem {
  id?: string;
  menuItemId?: string;
  itemId?: string;
  name: string;
  description?: string;
  price: number;
  quantity: number;
  specialInstructions?: string;
  total?: number;
  subtotal?: number;
  isUneditable?: boolean;
  uneditableAt?: string;
  uneditableBy?: string;
  itemStatus?: string;
}

interface EditRequest {
  requestedWaiterId: string;
  requestedWaiterName?: string;
  status: 'pending' | 'accepted' | 'cancelled';
  requestedBy: string;
  requestedByName?: string;
  requestedAt: string;
  reason: string;
  originalWaiterId: string;
  originalWaiterName?: string;
  cancelledBy?: string;
  cancelledByRole?: string;
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
  orderItems?: OrderItem[];
  items?: OrderItem[];
  paymentStatus: string;
  paymentMethod: string;
  waiterId: string;
  waiterInfo?: {
    id: string;
    name: string;
    role: string;
  };
  restaurantId?: string;
  restaurantName?: string;
  editRequest?: EditRequest;
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

// Helper function to get order items array
const getOrderItemsArray = (order: Order): OrderItem[] => {
  if (order.items && Array.isArray(order.items) && order.items.length > 0) {
    return order.items;
  }
  if (order.orderItems && Array.isArray(order.orderItems) && order.orderItems.length > 0) {
    return order.orderItems;
  }
  return [];
};

// Check if item is uneditable (locked/served) - CORRECTED to use isUneditable
const isItemUneditable = (item: CartItem | OrderItem): boolean => {
  return item.isUneditable === true;
};

// Sound Toggle Button Component
const SoundToggleButton = ({ isEnabled, onToggle }: { isEnabled: boolean; onToggle: () => void }) => (
  <Button
    variant="ghost"
    size="icon"
    onClick={onToggle}
    className="h-8 w-8 relative"
    title={isEnabled ? "Sound is on" : "Sound is off"}
  >
    {isEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
  </Button>
);

// Menu Item Component with tax info
const MenuItemComponent = ({ item, addToCart, isOrderLocked }: { item: MenuItem; addToCart: (item: MenuItem) => void; isOrderLocked: boolean }) => {
  const { originalPrice, taxAmount } = calculatePriceBreakdown(item.price);
  
  return (
    <Card className="overflow-hidden h-full transition-all duration-300 hover:shadow-md hover:scale-[1.01] bg-background hover:bg-background/95 rounded-lg border-border/40 hover:border-primary/30 group min-w-0">
      <div className="relative aspect-square sm:aspect-[4/3] overflow-hidden rounded-t-lg">
        <Image
          src={item.imageUrl || "/placeholder.svg"}
          alt={item.name}
          fill
          sizes="(max-width: 640px) 150px, (max-width: 1200px) 200px, 250px"
          className="object-cover transition-transform duration-500 group-hover:scale-110"
          loading="lazy"
        />
        <div className="absolute top-2 right-2 bg-black/75 text-white text-[10px] sm:text-xs font-semibold px-1.5 py-0.5 rounded-md backdrop-blur-sm flex flex-col items-end">
          <span>${item.price.toFixed(2)}</span>
          <span className="text-[6px] sm:text-[7px] opacity-80">incl. VAT</span>
        </div>
        
        {item.tags?.includes('bestseller') && (
          <div className="absolute top-2 left-2 bg-primary/90 text-primary-foreground text-[8px] sm:text-[9px] font-medium px-1.5 py-0.5 rounded-md backdrop-blur-sm flex items-center gap-1">
            <Sparkles className="h-2 w-2 sm:h-2.5 sm:w-2.5" />
            Best
          </div>
        )}
        
        <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
          <Button
            variant="default"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              if (!isOrderLocked) {
                addToCart(item);
              } else {
                toast({
                  title: "Cannot Add Items",
                  description: "This order has uneditable items or is completed. Cannot add new items.",
                  variant: "destructive",
                });
              }
            }}
            className="rounded-full shadow-lg hover:shadow-primary/25 transition-all duration-300 transform hover:scale-105 bg-primary/90 backdrop-blur-sm text-xs sm:text-sm px-2 sm:px-3"
            disabled={isOrderLocked}
          >
            <Plus className="mr-1 h-3 w-3 sm:h-3.5 sm:w-3.5" />
            Add
          </Button>
        </div>
      </div>
      
      <CardContent className="p-2 sm:p-3 flex flex-col gap-1 sm:gap-2 h-full">
        <div className="space-y-0.5 flex-grow">
          <h3 className="font-medium text-xs sm:text-sm line-clamp-1 group-hover:text-primary transition-colors">{item.name}</h3>
          <p className="text-[9px] sm:text-xs text-muted-foreground line-clamp-1 sm:line-clamp-2">{item.description}</p>
        </div>

        <div className="flex items-center justify-between mt-auto pt-1">
          <div className="flex items-center gap-1 text-[8px] sm:text-[9px] text-muted-foreground">
            <Badge variant="outline" className="h-3.5 px-1 text-[7px] sm:text-[8px] font-normal flex items-center gap-0.5">
              <Clock className="h-1.5 w-1.5 sm:h-2 sm:w-2" />
              {item.preparationTime}m
            </Badge>
            <Badge variant="outline" className="h-3.5 px-1 text-[7px] sm:text-[8px] font-normal flex items-center gap-0.5">
              <Utensils className="h-1.5 w-1.5 sm:h-2 sm:w-2" />
              {item.calories}cal
            </Badge>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              if (!isOrderLocked) {
                addToCart(item);
              } else {
                toast({
                  title: "Cannot Add Items",
                  description: "This order has uneditable items or is completed.",
                  variant: "destructive",
                });
              }
            }}
            className="h-5 w-5 sm:h-6 sm:w-6 rounded-full bg-primary/10 hover:bg-primary/20 text-primary p-0 relative overflow-hidden transition-transform hover:scale-110"
            disabled={isOrderLocked}
          >
            <Plus className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
            <span className="sr-only">Add to cart</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

// Cart Panel Component with correct tax calculation and uneditable support
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
  restaurantId,
  setRestaurantId,
  restaurantName,
  setRestaurantName,
  restaurants,
  onAddItems,
  onRefreshCart,
  isSaving,
  isOrderLocked
}: any) => {
  // Check if any item is uneditable
  const hasUneditableItems = cart.some((item: CartItem) => isItemUneditable(item));
  const isFullyUneditable = cart.length > 0 && cart.every((item: CartItem) => isItemUneditable(item));
  
  return (
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
          <Button variant="outline" size="icon" onClick={onRefreshCart} title="Refresh Prices" className="h-8 w-8" disabled={isOrderLocked}>
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

      {/* Uneditable items warning */}
      {hasUneditableItems && (
        <Alert className="mx-4 mt-4 bg-yellow-50 border-yellow-200">
          <Lock className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800 text-sm">
            {isFullyUneditable 
              ? "All items in this order are uneditable (served/locked) and cannot be modified." 
              : "Some items in this order are uneditable (served/locked). Uneditable items cannot be modified."}
          </AlertDescription>
        </Alert>
      )}

      {cart.length > 0 ? (
        <>
          <div className="flex-1 overflow-y-auto min-h-0">
            <div className="p-4 space-y-6">
              {/* Cart Items with Tax Breakdown */}
              <div className="space-y-3">
                {cart.map((item: CartItem) => {
                  const { originalPrice, taxAmount } = calculatePriceBreakdown(item.price);
                  const itemTotalOriginal = originalPrice * item.quantity;
                  const itemTotalTax = taxAmount * item.quantity;
                  const uneditable = isItemUneditable(item);
                  
                  return (
                    <div key={item.cartId} className={`group flex gap-3 bg-card p-2.5 rounded-xl border shadow-sm hover:shadow-md transition-all duration-200 ${uneditable ? 'bg-yellow-50/30 border-yellow-200' : ''}`}>
                      <div className="relative h-20 w-20 flex-shrink-0 rounded-lg overflow-hidden bg-muted">
                        <Image
                          src={item.imageUrl || "/placeholder.svg"}
                          alt={item.name}
                          fill
                          sizes="80px"
                          className="object-cover"
                        />
                        {uneditable && (
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                            <Lock className="h-6 w-6 text-white" />
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1 flex flex-col justify-between min-w-0">
                        <div className="flex justify-between items-start gap-2">
                          <div className="min-w-0">
                            <h4 className="font-medium text-sm truncate flex items-center gap-1">
                              {item.name}
                              {uneditable && (
                                <Badge variant="outline" className="bg-yellow-100 text-yellow-700 text-[9px] h-4 px-1">
                                  <Lock className="h-2 w-2 mr-0.5" />
                                  Uneditable
                                </Badge>
                              )}
                            </h4>
                            <div className="flex flex-col">
                              <p className="text-xs text-muted-foreground">
                                ${originalPrice.toFixed(2)} <span className="text-[10px]">(excl. VAT)</span>
                              </p>
                              <p className="text-[10px] text-primary">
                                + VAT: ${taxAmount.toFixed(2)}
                              </p>
                            </div>
                            {uneditable && item.uneditableBy && (
                              <p className="text-[9px] text-muted-foreground mt-0.5">
                                Locked by: {item.uneditableBy}
                              </p>
                            )}
                          </div>
                          {!uneditable && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeFromCart(item.cartId)}
                              className="h-6 w-6 -mr-1 -mt-1 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>

                        <div className="flex items-end justify-between mt-2">
                          <div className="flex items-center bg-muted/50 rounded-lg border p-0.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => !uneditable && updateQuantity(item.cartId, item.quantity - 1)}
                              className="h-6 w-6 rounded-md hover:bg-background shadow-sm"
                              disabled={uneditable}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-8 text-center text-xs font-medium tabular-nums">
                              {item.quantity}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => !uneditable && updateQuantity(item.cartId, item.quantity + 1)}
                              className="h-6 w-6 rounded-md hover:bg-background shadow-sm"
                              disabled={uneditable}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                          <div className="text-right">
                            <span className="font-semibold text-sm">
                              ${itemTotalOriginal.toFixed(2)}
                            </span>
                            <p className="text-[9px] text-muted-foreground">
                              + VAT: ${itemTotalTax.toFixed(2)}
                            </p>
                          </div>
                        </div>
                        
                        {item.specialInstructions && (
                          <p className="text-[10px] text-muted-foreground mt-1 italic">
                            Note: {item.specialInstructions}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
                
                {!isOrderLocked && !isFullyUneditable && (
                  <Button 
                    variant="ghost" 
                    className="w-full border-2 border-dashed border-muted-foreground/20 hover:border-primary/50 hover:bg-primary/5 text-muted-foreground hover:text-primary h-12 rounded-xl gap-2" 
                    onClick={onAddItems}
                  >
                    <Plus className="h-4 w-4" />
                    Add More Items
                  </Button>
                )}
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
                        disabled={isOrderLocked}
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="guests" className="text-xs text-muted-foreground">Guests</Label>
                    <div className="relative">
                      <Users className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                      <Select value={numberOfGuests.toString()} onValueChange={(v) => !isOrderLocked && setNumberOfGuests(parseInt(v))} disabled={isOrderLocked}>
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
                      disabled={isOrderLocked}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="restaurant" className="text-xs text-muted-foreground">Restaurant</Label>
                  <div className="relative">
                    <Utensils className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Select
                      value={restaurantId || 'none'}
                      onValueChange={(v) => {
                        if (isOrderLocked) return;
                        if (v === 'none') {
                          setRestaurantId('');
                          setRestaurantName('');
                        } else {
                          const r = restaurants.find((rest: Restaurant) => rest._id === v);
                          setRestaurantId(v);
                          setRestaurantName(r?.name || '');
                        }
                      }}
                      disabled={isOrderLocked}
                    >
                      <SelectTrigger id="restaurant" className="h-9 pl-8 text-sm bg-muted/30">
                        <SelectValue placeholder="Select Restaurant" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Restaurant</SelectItem>
                        {restaurants.map((restaurant: Restaurant) => (
                          <SelectItem key={restaurant._id} value={restaurant._id}>
                            {restaurant.shortName || restaurant.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                    disabled={isOrderLocked}
                  />
                </div>
              </div>

              {/* Bill Summary with correct tax display */}
              <div className="bg-card rounded-xl border shadow-sm p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="apply-discount" className="text-sm font-normal">Apply Discount (10%)</Label>
                  <Switch
                    id="apply-discount"
                    checked={applyDiscount}
                    onCheckedChange={setApplyDiscount}
                    disabled={isOrderLocked}
                  />
                </div>
                
                <Separator className="bg-border/50" />
                
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal (excl. VAT)</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>VAT (15%)</span>
                    <span>${tax.toFixed(2)}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-green-600 font-medium">
                      <span>Discount</span>
                      <span>-${discount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 font-bold text-lg">
                    <span>Total (incl. VAT)</span>
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
                disabled={cart.length === 0 || isSaving || isOrderLocked || isFullyUneditable}
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
          <Button onClick={onAddItems} className="rounded-full px-8" disabled={isOrderLocked}>
            Browse Menu
          </Button>
        </div>
      )}
    </div>
  );
};

// Transfer Request Dialog Component
function TransferRequestDialog({
  open,
  onOpenChange,
  waiters,
  currentWaiterId,
  order,
  onSubmit,
  cooldownRemaining = 0
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  waiters: Waiter[];
  currentWaiterId: string;
  order: Order | null;
  onSubmit: (targetWaiterId: string, reason: string) => Promise<void>;
  cooldownRemaining?: number;
}) {
  const [selectedWaiter, setSelectedWaiter] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!selectedWaiter || !reason.trim()) {
      toast({
        title: "Missing Information",
        description: "Please select a waiter and provide a reason for transfer.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(selectedWaiter, reason);
      onOpenChange(false);
      setSelectedWaiter('');
      setReason('');
    } catch (error) {
      console.error('Error submitting transfer request:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const availableWaiters = waiters.filter(w => w._id !== currentWaiterId);
  const hasCooldown = cooldownRemaining > 0;
  const cooldownMinutes = Math.floor(cooldownRemaining / 60000);
  const cooldownSeconds = Math.ceil((cooldownRemaining % 60000) / 1000);
  
  const isCancelledByOriginalRequester = order?.editRequest?.cancelledByRole === 'original_requester';
  const isCancelledByTargetWaiter = order?.editRequest?.cancelledByRole === 'target_waiter';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5" />
            Transfer Order
          </DialogTitle>
          <DialogDescription>
            Request to transfer order #{order?.orderNumber} to another waiter.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {hasCooldown && (
            <Alert className="bg-yellow-50 border-yellow-200">
              <Clock3 className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800 text-xs">
                Please wait {cooldownMinutes > 0 ? `${cooldownMinutes} minute${cooldownMinutes !== 1 ? 's' : ''}` : ''}
                {cooldownMinutes > 0 && cooldownSeconds > 0 ? ' and ' : ''}
                {cooldownSeconds > 0 ? `${cooldownSeconds} second${cooldownSeconds !== 1 ? 's' : ''}` : ''}
                before requesting another transfer.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label>Current Waiter</Label>
            <div className="p-2 bg-muted/30 rounded-md text-sm">
              {waiters.find(w => w._id === currentWaiterId)?.name || 'Current Waiter'}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Transfer To *</Label>
            <Select value={selectedWaiter} onValueChange={setSelectedWaiter} disabled={hasCooldown}>
              <SelectTrigger>
                <SelectValue placeholder="Select waiter to transfer to" />
              </SelectTrigger>
              <SelectContent>
                {availableWaiters.map((waiter) => (
                  <SelectItem key={waiter._id} value={waiter._id}>
                    <div className="flex items-center gap-2">
                      <UserIcon className="h-4 w-4" />
                      {waiter.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Reason for Transfer *</Label>
            <Textarea
              placeholder="Why do you need to transfer this order? (e.g., customer moved to another table, shift change, etc.)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              disabled={hasCooldown}
            />
          </div>

          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              The requested waiter will receive a notification and must accept the transfer before it takes effect.
              {order?.editRequest?.status === 'cancelled' && (
                <span className="block mt-1 text-yellow-600">
                  {isCancelledByOriginalRequester ? (
                    <>Note: You cancelled a previous transfer request. Please wait 2 minutes before requesting again.</>
                  ) : isCancelledByTargetWaiter ? (
                    <>Note: The previous transfer request was cancelled by the target waiter. You can request again immediately.</>
                  ) : (
                    <>Note: A previous transfer request was cancelled. Please wait before requesting again.</>
                  )}
                </span>
              )}
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting || hasCooldown || !selectedWaiter || !reason.trim()}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending Request...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Send Transfer Request
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Main Component
export default function OrderEditPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [waiters, setWaiters] = useState<Waiter[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState('');
  const [selectedRestaurantName, setSelectedRestaurantName] = useState('');
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
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [hasPendingRequest, setHasPendingRequest] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationData, setNotificationData] = useState({ title: '', message: '' });
  
  // Polling refs
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isPollingActiveRef = useRef(false);
  
  const { play: playNotificationSound, isEnabled: soundEnabled, setIsEnabled: setSoundEnabled } = useNotificationSound();

  // Check if order has any uneditable items - CORRECTED to use isUneditable
  const hasUneditableItems = useMemo(() => {
    if (!selectedOrder) return false;
    const items = getOrderItemsArray(selectedOrder);
    return items.some(item => item.isUneditable === true);
  }, [selectedOrder]);

  // Check if order is fully uneditable (all items uneditable) - CORRECTED
  const isOrderFullyUneditable = useMemo(() => {
    if (!selectedOrder) return false;
    const items = getOrderItemsArray(selectedOrder);
    if (items.length === 0) return false;
    return items.every(item => item.isUneditable === true);
  }, [selectedOrder]);

  // Determine if order editing is disabled
  const isOrderEditDisabled = useMemo(() => {
    return selectedOrder?.status === 'COMPLETED' || hasPendingRequest || isOrderFullyUneditable;
  }, [selectedOrder, hasPendingRequest, isOrderFullyUneditable]);

  // Cooldown timer effect
  useEffect(() => {
    if (cooldownRemaining > 0) {
      const timer = setInterval(() => {
        setCooldownRemaining(prev => Math.max(0, prev - 1000));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [cooldownRemaining]);

  // Fetch user orders and menu data
  useEffect(() => {
    if (status === 'authenticated' && session?.user?.id) {
      fetchOrders();
      fetchMenuData();
      fetchWaiters();
      fetchRestaurants();
    }
  }, [session, status]);

  // Initialize cart when order is selected
  useEffect(() => {
    if (selectedOrder && menuItems.length > 0) {
      initializeCartFromOrder(selectedOrder);
      setHasPendingRequest(selectedOrder.editRequest?.status === 'pending');
    }
  }, [selectedOrder, menuItems]);

  const fetchWaiters = useCallback(async () => {
    try {
      const response = await fetch("/api/waitress");
      const data = await response.json();
      const arr = Array.isArray(data) ? data : (data.data ?? data.waitresses ?? []);
      setWaiters(arr);
    } catch (error) {
      console.error("Error fetching waiters:", error);
    }
  }, []);

  const fetchRestaurants = useCallback(async () => {
    try {
      const response = await fetch("/api/restaurants");
      const data = await response.json();
      const arr = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
      const active = arr.filter((r: Restaurant) => r.isActive !== false);
      setRestaurants(active);
    } catch (error) {
      console.error("Error fetching restaurants:", error);
    }
  }, []);

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

  // Poll for new orders - 15 second interval
  useEffect(() => {
    if (status === 'authenticated' && session?.user?.id && !isPollingActiveRef.current) {
      isPollingActiveRef.current = true;
      
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      
      pollingIntervalRef.current = setInterval(() => {
        fetchOrders(false);
      }, 15000);

      return () => {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
        }
        isPollingActiveRef.current = false;
      };
    }
  }, [status, session, fetchOrders]);

  // Initialize cart from order with tax breakdown and uneditable status - CORRECTED to use isUneditable
  const initializeCartFromOrder = useCallback((order: Order) => {
    const cartItems: CartItem[] = [];
    const orderItemsArray = getOrderItemsArray(order);
    
    if (!orderItemsArray || orderItemsArray.length === 0) {
      setCart([]);
      setOrderStatus(order.status);
      setNotes(order.notes || '');
      setTableNumber(order.tableNumber || '');
      setCustomerName(order.customerName || '');
      setNumberOfGuests(order.numberOfGuests || 1);
      setApplyDiscount(order.discount > 0);
      return;
    }
    
    orderItemsArray.forEach((orderItem, index) => {
      const itemId = orderItem.menuItemId || orderItem.itemId;
      
      if (!itemId) return;
      
      const menuItem = menuItems.find(m => m._id === itemId);
      const price = orderItem.price || menuItem?.price || 0;
      const { originalPrice, taxAmount } = calculatePriceBreakdown(price);
      
      if (menuItem) {
        cartItems.push({
          ...menuItem,
          quantity: orderItem.quantity,
          specialInstructions: orderItem.specialInstructions,
          cartId: `order-item-${orderItem.id || `temp-${index}`}`,
          orderItemId: orderItem.id,
          originalPrice,
          taxAmount,
          isUneditable: orderItem.isUneditable === true,
          uneditableAt: orderItem.uneditableAt,
          uneditableBy: orderItem.uneditableBy,
        });
      } else {
        cartItems.push({
          _id: itemId,
          name: orderItem.name,
          description: orderItem.description || 'Item not found in current menu',
          price: price,
          imageUrl: '/placeholder.svg',
          categoryId: '',
          preparationTime: 0,
          calories: 0,
          tags: [],
          quantity: orderItem.quantity,
          specialInstructions: orderItem.specialInstructions,
          cartId: `order-item-${orderItem.id || `temp-${index}`}`,
          orderItemId: orderItem.id,
          originalPrice,
          taxAmount,
          isUneditable: orderItem.isUneditable === true,
          uneditableAt: orderItem.uneditableAt,
          uneditableBy: orderItem.uneditableBy,
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
    setSelectedRestaurantId(order.restaurantId || '');
    setSelectedRestaurantName(order.restaurantName || '');
  }, [menuItems]);

  const handleSelectOrder = (order: Order) => {
    if (order.status === 'COMPLETED') {
      toast({
        title: "Cannot Edit",
        description: "This order is already completed and cannot be edited.",
        variant: "destructive",
      });
      return;
    }
    
    // Check if order has uneditable items
    const items = getOrderItemsArray(order);
    const hasUneditable = items.some(item => item.isUneditable === true);
    const allUneditable = items.length > 0 && items.every(item => item.isUneditable === true);
    
    if (allUneditable) {
      toast({
        title: "Cannot Edit",
        description: "All items in this order are uneditable (served/locked). This order cannot be edited.",
        variant: "destructive",
      });
      return;
    }
    
    if (hasUneditable) {
      toast({
        title: "Partial Editing Only",
        description: "Some items in this order are uneditable and cannot be modified.",
        variant: "default",
      });
    }
    
    setSelectedOrder(order);
    setShowSuccessMessage(false);
    
    if (order.editRequest?.status === 'pending') {
      setHasPendingRequest(true);
      toast({
        title: "Transfer Request Pending",
        description: `This order has a pending transfer request to ${order.editRequest.requestedWaiterName}. Please wait for approval.`,
        variant: "default",
      });
    } else {
      setHasPendingRequest(false);
    }
  };

  const addToCart = useCallback((item: MenuItem) => {
    if (selectedOrder?.status === 'COMPLETED') {
      toast({
        title: "Cannot Edit",
        description: "This order is completed and cannot be modified.",
        variant: "destructive",
      });
      return;
    }

    if (hasPendingRequest) {
      toast({
        title: "Cannot Edit",
        description: "This order has a pending transfer request. Please wait for approval.",
        variant: "destructive",
      });
      return;
    }

    if (isOrderFullyUneditable) {
      toast({
        title: "Cannot Edit",
        description: "All items in this order are uneditable (served/locked). Cannot add new items.",
        variant: "destructive",
      });
      return;
    }

    if (item.stock !== undefined && item.stock <= 0) {
      toast({
        title: "Out of Stock",
        description: `${item.name} is currently out of stock.`,
        variant: "destructive",
      });
      setInsufficientStockItem(item.name);
      return;
    }

    const { originalPrice, taxAmount } = calculatePriceBreakdown(item.price);
    
    setCart((prev) => {
      const existing = prev.find((i) => i._id === item._id && !isItemUneditable(i));
      if (existing) {
        return prev.map((i) => 
          i.cartId === existing.cartId && !isItemUneditable(i)
            ? { ...i, quantity: i.quantity + 1 } 
            : i
        );
      }
      return [...prev, { 
        ...item, 
        quantity: 1, 
        cartId: `cart-item-${Date.now()}-${Math.random()}`,
        originalPrice,
        taxAmount,
        isUneditable: false,
      }];
    });

    toast({
      title: "Added to Cart",
      description: `${item.name} added to order.`,
    });
  }, [selectedOrder, hasPendingRequest, isOrderFullyUneditable]);

  const removeFromCart = useCallback((cartId: string) => {
    const item = cart.find(i => i.cartId === cartId);
    if (item && isItemUneditable(item)) {
      toast({
        title: "Cannot Remove",
        description: `${item.name} is uneditable (served/locked) and cannot be removed.`,
        variant: "destructive",
      });
      return;
    }
    setCart((prev) => prev.filter((item) => item.cartId !== cartId));
    toast({
      title: "Item Removed",
      description: "Item removed from order",
    });
  }, [cart]);

  const updateQuantity = useCallback((cartId: string, newQuantity: number) => {
    const item = cart.find(i => i.cartId === cartId);
    if (item && isItemUneditable(item)) {
      toast({
        title: "Cannot Update",
        description: `${item.name} is uneditable (served/locked) and quantity cannot be changed.`,
        variant: "destructive",
      });
      return;
    }
    if (newQuantity < 1) {
      removeFromCart(cartId);
      return;
    }
    setCart((prev) => 
      prev.map((item) => 
        item.cartId === cartId && !isItemUneditable(item)
          ? { ...item, quantity: newQuantity } 
          : item
      )
    );
  }, [cart, removeFromCart]);

  const refreshCartItems = useCallback(() => {
    setCart(prev => prev.map(item => {
      const menuItem = menuItems.find(m => m._id === item._id);
      if (menuItem && !isItemUneditable(item)) {
        const { originalPrice, taxAmount } = calculatePriceBreakdown(menuItem.price);
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
          stock: menuItem.stock,
          originalPrice,
          taxAmount
        };
      }
      return item;
    }));
    toast({
      title: "Cart Updated",
      description: "Items refreshed from menu data",
    });
  }, [menuItems]);

  // Calculate subtotal (original prices without tax) - only for editable items
  const calculateSubtotal = () => {
    return cart.reduce((sum, item) => {
      if (isItemUneditable(item)) return sum;
      const originalPrice = item.originalPrice || (item.price / 1.15);
      return sum + (originalPrice * item.quantity);
    }, 0);
  };

  // Calculate total tax - only for editable items
  const calculateTax = () => {
    return cart.reduce((sum, item) => {
      if (isItemUneditable(item)) return sum;
      const taxAmount = item.taxAmount || (item.price - (item.price / 1.15));
      return sum + (taxAmount * item.quantity);
    }, 0);
  };

  const subtotal = calculateSubtotal();
  const tax = calculateTax();
  const discount = applyDiscount ? subtotal * 0.1 : 0;
  const total = subtotal + tax - discount;

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

    if (selectedOrder.status === 'COMPLETED') {
      toast({
        title: "Cannot Edit",
        description: "This order is completed and cannot be modified.",
        variant: "destructive",
      });
      return;
    }

    if (hasPendingRequest) {
      toast({
        title: "Cannot Edit",
        description: "This order has a pending transfer request. Please wait for approval.",
        variant: "destructive",
      });
      return;
    }

    if (isOrderFullyUneditable) {
      toast({
        title: "Cannot Edit",
        description: "All items in this order are uneditable (served/locked). Cannot save changes.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSaving(true);
      setApiError(null);

      // Only include editable items in the update (preserve uneditable items as they are)
      const processedOrderItems = cart
        .filter(item => !isItemUneditable(item))
        .map(item => {
          const menuItem = menuItems.find(m => m._id === item._id);
          const finalPrice = menuItem ? menuItem.price : item.price;
          const finalName = menuItem ? menuItem.name : item.name;
          const { originalPrice, taxAmount } = calculatePriceBreakdown(finalPrice);
          
          return {
            menuItemId: item._id,
            name: finalName,
            price: finalPrice,
            priceWithoutTax: originalPrice,
            taxAmount: taxAmount,
            quantity: item.quantity,
            specialInstructions: item.specialInstructions || '',
            subtotal: originalPrice * item.quantity,
            taxTotal: taxAmount * item.quantity,
            total: finalPrice * item.quantity
          };
        });

      // Keep uneditable items with their original data (preserve isUneditable flag)
      const uneditableOrderItems = cart
        .filter(item => isItemUneditable(item))
        .map(item => ({
          menuItemId: item._id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          specialInstructions: item.specialInstructions || '',
          isUneditable: true,
          uneditableAt: item.uneditableAt,
          uneditableBy: item.uneditableBy
        }));

      // Calculate totals (only include editable items for new totals)
      const newSubtotal = processedOrderItems.reduce((sum, item) => sum + item.subtotal, 0);
      const newTax = processedOrderItems.reduce((sum, item) => sum + item.taxTotal, 0);
      const newDiscount = applyDiscount ? newSubtotal * 0.1 : 0;
      const uneditableTotal = uneditableOrderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const newTotal = newSubtotal + newTax + uneditableTotal - newDiscount;

      const orderData = {
        orderId: selectedOrder.id || selectedOrder._id,
        orderItems: [...uneditableOrderItems, ...processedOrderItems],
        notes: notes || '',
        tableNumber: tableNumber || '',
        customerName: customerName || 'Walk-in Customer',
        status: orderStatus,
        numberOfGuests: numberOfGuests || 1,
        discount: newDiscount,
        tax: newTax,
        subtotal: newSubtotal,
        totalAmount: newSubtotal + newTax + uneditableTotal,
        finalAmount: newTotal,
        waiterId: session.user.id,
        restaurantId: selectedRestaurantId || null,
        restaurantName: selectedRestaurantName || null
      };

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

        await fetchOrders();

        if (result.order) {
          setSelectedOrder(result.order);
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

  const handleTransferRequest = async (targetWaiterId: string, reason: string) => {
    if (!selectedOrder) return;
    
    setIsTransferring(true);

    try {
      const response = await fetch('/api/order/request-transfer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId: selectedOrder.id || selectedOrder._id,
          targetWaiterId,
          reason,
          currentWaiterId: session?.user?.id,
          orderNumber: selectedOrder.orderNumber,
          tableNumber: selectedOrder.tableNumber
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.error && data.error.includes('Please wait')) {
          if (data.cooldownRemaining) {
            setCooldownRemaining(data.cooldownRemaining);
          }
          toast({
            title: "Cooldown Period",
            description: data.error,
            variant: "default",
            duration: 5000,
          });
        } else {
          toast({
            title: 'Error',
            description: data.error || data.message || 'Failed to send transfer request',
            variant: 'destructive',
          });
        }
        return;
      }

      // Play sound on successful request
      if (soundEnabled) {
        playNotificationSound();
      }
      
      // Show notification
      setNotificationData({
        title: 'Transfer Request Sent',
        message: `Request sent to ${waiters.find(w => w._id === targetWaiterId)?.name} for order #${selectedOrder.orderNumber}`
      });
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 4000);

      toast({
        title: 'Transfer Request Sent',
        description: `Request sent to ${waiters.find(w => w._id === targetWaiterId)?.name}. They will need to accept the transfer.`,
      });

      await fetchOrders();
      
      if (data.order) {
        setSelectedOrder(data.order);
        setHasPendingRequest(true);
      }

    } catch (error) {
      console.error('Error sending transfer request:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to send transfer request',
        variant: 'destructive',
      });
    } finally {
      setIsTransferring(false);
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

  // Get uneditable items count for display
  const uneditableItemsCount = cart.filter(item => isItemUneditable(item)).length;

  return (
    <div className="container mx-auto p-4 md:p-6">
      {/* Notification Toast */}
      {showNotification && (
        <motion.div
          initial={{ opacity: 0, y: -50, x: '-50%' }}
          animate={{ opacity: 1, y: 0, x: '-50%' }}
          exit={{ opacity: 0, y: -50, x: '-50%' }}
          className="fixed top-4 left-1/2 z-50 w-[90%] max-w-md"
        >
          <div className="bg-yellow-50 border-l-4 border-yellow-500 rounded-lg shadow-lg overflow-hidden">
            <div className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <BellRing className="h-5 w-5 text-yellow-600 animate-pulse" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-yellow-800">{notificationData.title}</p>
                  <p className="text-xs text-yellow-700 mt-1">{notificationData.message}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 flex-shrink-0 text-yellow-600 hover:text-yellow-800 hover:bg-yellow-100"
                  onClick={() => setShowNotification(false)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <div className="h-1 bg-yellow-500 animate-progress" style={{ animationDuration: '4000ms' }} />
          </div>
        </motion.div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Order Management</h1>
          <p className="text-muted-foreground">
            {session.user?.name} • {session.user?.role || 'WAITER'}
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <SoundToggleButton isEnabled={soundEnabled} onToggle={() => setSoundEnabled(!soundEnabled)} />
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
                    {orders.map(order => {
                      const itemsCount = getOrderItemsArray(order).length;
                      const items = getOrderItemsArray(order);
                      const hasUneditable = items.some(item => item.isUneditable === true);
                      const allUneditable = items.length > 0 && items.every(item => item.isUneditable === true);
                      
                      return (
                        <Card
                          key={order.id}
                          className={`cursor-pointer transition-all hover:shadow-md ${
                            selectedOrder?.id === order.id ? 'border-primary ring-2 ring-primary/20' : ''
                          } ${allUneditable ? 'opacity-75 bg-gray-50' : ''}`}
                          onClick={() => handleSelectOrder(order)}
                        >
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h3 className="font-semibold">#{order.orderNumber}</h3>
                                  <Badge 
                                    className={`${getStatusColor(order.status)} text-xs flex items-center gap-1`}
                                  >
                                    {getStatusIcon(order.status)}
                                    {order.status}
                                  </Badge>
                                  {hasUneditable && (
                                    <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 text-xs">
                                      <Lock className="h-2 w-2 mr-1" />
                                      {allUneditable ? 'Fully Locked' : 'Partially Locked'}
                                    </Badge>
                                  )}
                                  {order.editRequest?.status === 'pending' && (
                                    <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 text-xs">
                                      Transfer Pending
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  {order.tableNumber || 'No table'}
                                </p>
                                <p className="text-sm font-medium">
                                  ${(order.finalAmount || order.totalAmount).toFixed(2)}
                                </p>
                              </div>
                              <div className="text-right space-y-1">
                                <p className="text-xs text-muted-foreground">
                                  {new Date(order.createdAt).toLocaleDateString()}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {itemsCount} item{itemsCount !== 1 ? 's' : ''}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
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
                        <div className="flex items-center gap-2 flex-wrap">
                          <span>Status: {selectedOrder.status}</span>
                          <span>• Table: {selectedOrder.tableNumber || 'N/A'}</span>
                          <span>• Customer: {selectedOrder.customerName || 'N/A'}</span>
                          {hasUneditableItems && (
                            <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
                              <Lock className="h-3 w-3 mr-1" />
                              {uneditableItemsCount} Locked Item{uneditableItemsCount !== 1 ? 's' : ''}
                            </Badge>
                          )}
                          {selectedOrder.editRequest?.status === 'pending' && (
                            <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
                              Transfer Request Pending
                            </Badge>
                          )}
                        </div>
                      )}
                    </CardDescription>
                  </div>
                  {selectedOrder && selectedOrder.status !== 'COMPLETED' && !hasPendingRequest && !isOrderFullyUneditable && (
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setShowTransferDialog(true)}
                        disabled={isTransferring}
                      >
                        <ArrowRightLeft className="h-4 w-4 mr-2" />
                        Transfer Order
                      </Button>
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
                  {selectedOrder && (selectedOrder.status === 'COMPLETED' || hasPendingRequest || isOrderFullyUneditable) && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      disabled
                      className={isOrderFullyUneditable ? "bg-yellow-50" : "bg-yellow-50"}
                    >
                      {isOrderFullyUneditable ? (
                        <><Lock className="h-4 w-4 mr-2" />Order Locked</>
                      ) : hasPendingRequest ? (
                        <><Clock3 className="h-4 w-4 mr-2" />Transfer Pending</>
                      ) : (
                        <><CheckCircle className="h-4 w-4 mr-2" />Completed</>
                      )}
                    </Button>
                  )}
                </div>
              </CardHeader>

              {selectedOrder ? (
                <CardContent className="space-y-6">
                  {selectedOrder.status === 'COMPLETED' && (
                    <Alert variant="destructive" className="mb-4">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        This order is completed and cannot be edited. View only mode.
                      </AlertDescription>
                    </Alert>
                  )}

                  {isOrderFullyUneditable && (
                    <Alert className="bg-yellow-50 border-yellow-200 mb-4">
                      <Lock className="h-4 w-4 text-yellow-600" />
                      <AlertDescription className="text-yellow-800">
                        All items in this order are uneditable (served/locked). This order cannot be edited.
                      </AlertDescription>
                    </Alert>
                  )}

                  {hasPendingRequest && selectedOrder.editRequest && (
                    <Alert className="bg-yellow-50 border-yellow-200">
                      <AlertTriangle className="h-4 w-4 text-yellow-600" />
                      <AlertDescription className="text-yellow-800">
                        A transfer request has been sent to {selectedOrder.editRequest.requestedWaiterName}. 
                        This order cannot be edited until the request is processed.
                        <div className="mt-2 text-sm">
                          <strong>Reason:</strong> {selectedOrder.editRequest.reason}
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}

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
                        disabled={selectedOrder.status === 'COMPLETED' || hasPendingRequest || isOrderFullyUneditable}
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
                        placeholder="e.g., T-5, POS"
                        disabled={selectedOrder.status === 'COMPLETED' || hasPendingRequest || isOrderFullyUneditable}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="customer">Customer Name</Label>
                      <Input
                        id="customer"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="Walk-in Customer"
                        disabled={selectedOrder.status === 'COMPLETED' || hasPendingRequest || isOrderFullyUneditable}
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
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="restaurant">Restaurant</Label>
                      <Select
                        value={selectedRestaurantId || 'none'}
                        onValueChange={(v) => {
                          const isLocked = selectedOrder?.status === 'COMPLETED' || hasPendingRequest || isOrderFullyUneditable;
                          if (isLocked) return;
                          if (v === 'none') {
                            setSelectedRestaurantId('');
                            setSelectedRestaurantName('');
                          } else {
                            const r = restaurants.find((rest: Restaurant) => rest._id === v);
                            setSelectedRestaurantId(v);
                            setSelectedRestaurantName(r?.name || '');
                          }
                        }}
                        disabled={selectedOrder?.status === 'COMPLETED' || hasPendingRequest || isOrderFullyUneditable}
                      >
                        <SelectTrigger id="restaurant" className="h-10 text-sm">
                          <SelectValue placeholder="Select Restaurant" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No Restaurant</SelectItem>
                          {restaurants.map((restaurant: Restaurant) => (
                            <SelectItem key={restaurant._id} value={restaurant._id}>
                              {restaurant.shortName || restaurant.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Order Items with Tax Breakdown and Lock Status */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-semibold">Order Items ({cart.length})</h3>
                      {uneditableItemsCount > 0 && (
                        <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
                          <Lock className="h-3 w-3 mr-1" />
                          {uneditableItemsCount} Locked Item{uneditableItemsCount !== 1 ? 's' : ''}
                        </Badge>
                      )}
                    </div>

                    {cart.length === 0 ? (
                      <div className="text-center py-8 border-2 border-dashed rounded-lg">
                        <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground" />
                        <p className="mt-2 text-muted-foreground">No items in this order</p>
                        {selectedOrder.status !== 'COMPLETED' && !hasPendingRequest && !isOrderFullyUneditable && (
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
                        )}
                      </div>
                    ) : (
                      <div className="border rounded-lg overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Item</TableHead>
                              <TableHead className="text-right">Price (excl. VAT)</TableHead>
                              <TableHead className="text-center">Qty</TableHead>
                              <TableHead className="text-right">Subtotal (excl. VAT)</TableHead>
                              <TableHead className="text-right">VAT</TableHead>
                              <TableHead className="text-right">Status</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {cart.map((item) => {
                              const { originalPrice, taxAmount } = calculatePriceBreakdown(item.price);
                              const itemSubtotal = originalPrice * item.quantity;
                              const itemTaxTotal = taxAmount * item.quantity;
                              const uneditable = isItemUneditable(item);
                              
                              return (
                                <TableRow key={item.cartId} className={uneditable ? "bg-yellow-50/50" : ""}>
                                  <TableCell>
                                    <div>
                                      <div className="font-medium flex items-center gap-1">
                                        {item.name}
                                        {uneditable && (
                                          <Badge variant="outline" className="bg-yellow-100 text-yellow-700 text-[10px] h-4">
                                            <Lock className="h-2 w-2 mr-0.5" />
                                            Locked
                                          </Badge>
                                        )}
                                      </div>
                                      {item.specialInstructions && (
                                        <p className="text-xs text-muted-foreground">
                                          Note: {item.specialInstructions}
                                        </p>
                                      )}
                                      {uneditable && item.uneditableBy && (
                                        <p className="text-[9px] text-muted-foreground">
                                          Locked by: {item.uneditableBy}
                                        </p>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-right">
                                    ${originalPrice.toFixed(2)}
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center justify-center gap-2">
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-6 w-6 p-0"
                                        onClick={() => updateQuantity(item.cartId, item.quantity - 1)}
                                        disabled={selectedOrder.status === 'COMPLETED' || hasPendingRequest || uneditable || isOrderFullyUneditable}
                                      >
                                        -
                                      </Button>
                                      <span className="w-8 text-center">{item.quantity}</span>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-6 w-6 p-0"
                                        onClick={() => updateQuantity(item.cartId, item.quantity + 1)}
                                        disabled={selectedOrder.status === 'COMPLETED' || hasPendingRequest || uneditable || isOrderFullyUneditable}
                                      >
                                        +
                                      </Button>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-right">
                                    ${itemSubtotal.toFixed(2)}
                                  </TableCell>
                                  <TableCell className="text-right text-primary">
                                    +${itemTaxTotal.toFixed(2)}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <Badge variant="outline" className={uneditable ? "bg-yellow-100 text-yellow-700" : "bg-green-100 text-green-700"}>
                                      {uneditable ? <Lock className="h-3 w-3 mr-1" /> : <Unlock className="h-3 w-3 mr-1" />}
                                      {uneditable ? "Uneditable" : "Editable"}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-8 w-8 p-0 text-destructive"
                                      onClick={() => removeFromCart(item.cartId)}
                                      disabled={selectedOrder.status === 'COMPLETED' || hasPendingRequest || uneditable || isOrderFullyUneditable}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
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
                      disabled={selectedOrder.status === 'COMPLETED' || hasPendingRequest || isOrderFullyUneditable}
                    />
                  </div>

                  {/* Order Summary with correct tax display */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Order Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Subtotal (excl. VAT)</span>
                          <span>${subtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-primary">
                          <span>VAT (15%)</span>
                          <span>+${tax.toFixed(2)}</span>
                        </div>
                        {discount > 0 && (
                          <div className="flex justify-between text-green-600">
                            <span>Discount</span>
                            <span>-${discount.toFixed(2)}</span>
                          </div>
                        )}
                        <Separator />
                        <div className="flex justify-between text-lg font-bold">
                          <span>Total (incl. VAT)</span>
                          <span>${total.toFixed(2)}</span>
                        </div>
                      </div>
                    </CardContent>
                    {selectedOrder.status !== 'COMPLETED' && !hasPendingRequest && !isOrderFullyUneditable && cart.filter(item => !isItemUneditable(item)).length > 0 && (
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
                          disabled={isSaving || cart.filter(item => !isItemUneditable(item)).length === 0}
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
                    )}
                    {selectedOrder.status !== 'COMPLETED' && !hasPendingRequest && isOrderFullyUneditable && (
                      <CardFooter className="border-t pt-6">
                        <p className="text-sm text-muted-foreground text-center w-full">
                          This order cannot be edited because all items are uneditable (served/locked).
                        </p>
                      </CardFooter>
                    )}
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
        <TabsContent value="menu" className="space-y-0 -mt-2">
          <div className="sticky top-0 z-10 bg-background border-b">
            <div className="flex items-center gap-1.5 px-2 py-1.5">
              <div className="relative shrink-0">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-7 h-8 text-xs w-[150px] bg-background"
                />
              </div>

              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-[120px] h-8 text-xs bg-background/70 shrink-0">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all"><span className="flex items-center gap-1.5 text-xs"><Utensils className="h-3.5 w-3.5" />All</span></SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category._id} value={category._id}>
                      <span className="flex items-center gap-1.5 text-xs">{category.name}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                variant="default"
                size="icon"
                className="relative shrink-0 h-8 w-8 ml-auto"
                onClick={() => {
                  if (!selectedOrder) {
                    toast({
                      title: "No Order Selected",
                      description: "Please select an order first to add items.",
                      variant: "destructive",
                    });
                    return;
                  }
                  setActiveTab('orders');
                }}
                title={selectedOrder ? "Go to order" : "Select an order first"}
              >
                <ShoppingCart className="h-4 w-4" />
                {cart.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[9px] rounded-full h-4 w-4 flex items-center justify-center font-bold">{cart.length}</span>
                )}
              </Button>
            </div>
          </div>

          <div className="p-2 overflow-auto">
            {isMenuLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 pb-24">
                {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                  <div key={i} className="bg-muted/40 animate-pulse rounded-lg overflow-hidden">
                    <div className="aspect-square sm:aspect-[4/3] bg-muted/60 animate-pulse rounded-t-lg"></div>
                    <div className="p-2 sm:p-3 space-y-1.5">
                      <div className="h-3 bg-muted/60 animate-pulse rounded-md w-3/4"></div>
                      <div className="h-2 bg-muted/60 animate-pulse rounded-md w-full"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredMenuItems.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 pb-24">
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
                      <MenuItemComponent item={item} addToCart={addToCart} isOrderLocked={isOrderFullyUneditable || !!hasPendingRequest || selectedOrder?.status === 'COMPLETED'} />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[50vh] text-center p-4">
                <Search className="h-8 w-8 sm:h-12 sm:w-12 mx-auto text-muted-foreground mb-2 sm:mb-4" />
                <h3 className="text-sm sm:text-base font-medium mb-1">No items found</h3>
                <p className="text-[10px] sm:text-xs text-muted-foreground max-w-md">Try adjusting your search or selecting a different category.</p>
                {searchQuery && (
                  <Button variant="outline" className="mt-2 sm:mt-3 text-xs" onClick={() => setSearchQuery('')}>Clear Search</Button>
                )}
              </div>
            )}
          </div>
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
            restaurantId={selectedRestaurantId}
            setRestaurantId={setSelectedRestaurantId}
            restaurantName={selectedRestaurantName}
            setRestaurantName={setSelectedRestaurantName}
            restaurants={restaurants}
            onAddItems={() => {
              setActiveTab('menu');
              setIsCartOpen(false);
            }}
            onRefreshCart={refreshCartItems}
            isSaving={isSaving}
            isOrderLocked={isOrderFullyUneditable || hasPendingRequest || selectedOrder?.status === 'COMPLETED'}
          />
        </DialogContent>
      </Dialog>

      {/* Transfer Request Dialog */}
      <TransferRequestDialog
        open={showTransferDialog}
        onOpenChange={setShowTransferDialog}
        waiters={waiters}
        currentWaiterId={session.user.id}
        order={selectedOrder}
        onSubmit={handleTransferRequest}
        cooldownRemaining={cooldownRemaining}
      />

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

      {/* Add CSS animation for progress bar */}
      <style jsx global>{`
        @keyframes progress {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }
        .animate-progress {
          animation: progress linear forwards;
        }
      `}</style>
    </div>
  );
}
