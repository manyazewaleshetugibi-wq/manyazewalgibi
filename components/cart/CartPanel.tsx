'use client';

import React, { memo, useState } from 'react';
import { 
  ShoppingCart, X, Minus, Plus, MapPin, Home, Users, Receipt,
  Clock, AlertCircle, Navigation, Truck, ChevronRight, Armchair,
  User, Phone, Mail, Map, UserPlus, ClipboardList, Lock, CreditCard
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CartItem, UserData, Waiter, DeliveryFeeDetails } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import { TableSelector } from '@/components/menu/TableSelector';
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

interface TableData {
  id: string;
  number: number;
  capacity: number;
  status: 'available' | 'occupied' | 'reserved' | 'cleaning' | 'maintenance';
  shape: string;
  location?: string;
  description?: string;
  features?: string[];
  tags?: string[];
}

// Guest user data interface
interface GuestUserData {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  isGuest: boolean;
}

const calculatePriceBreakdown = (priceWithTax: number, taxRate: number = 0.15) => {
  const originalPrice = priceWithTax / (1 + taxRate);
  const taxAmount = priceWithTax - originalPrice;
  return { originalPrice, taxAmount };
};

interface CartPanelProps {
  cart: CartItem[];
  onClose: () => void;
  onRemoveItem: (id: string) => void;
  onUpdateQuantity: (id: string, qty: number) => void;
  onUpdateInstructions?: (id: string, instructions: string) => void;
  orderType: 'table' | 'delivery' | '';
  onOrderTypeChange: (type: 'table' | 'delivery' | '') => void;
  tableNumber: string;
  onTableNumberChange: (num: string) => void;
  
  selectedTableData?: TableData | null;
  onTableSelect?: (table: TableData | null) => void;
  waiters: Waiter[];
  selectedWaiter: string;
  onWaiterChange: (id: string) => void;
  numberOfGuests: number;
  onGuestsChange: (num: number) => void;
  specialRequirements: string;
  onSpecialRequirementsChange: (req: string) => void;
  subtotal: number;
  tax: number;
  deliveryFee: DeliveryFeeDetails | null;
  total: number;
  orderNumber: string;
  onPlaceOrder: () => void;
  isPlacingOrder: boolean;
  isUserLoggedIn: boolean;
  onLoginRequired: (message: string) => void;
  userData?: UserData | null;
  onNavigateToProfile?: () => void;
  isCalculatingDelivery?: boolean;
  restaurantId?: string;
  floor?: string;
  arrangementId?: string;
  onGuestOrder?: (guestData: GuestUserData) => void;
}

export const CartPanel = memo(({
  cart,
  onClose,
  onRemoveItem,
  onUpdateQuantity,
  onUpdateInstructions,
  orderType,
  onOrderTypeChange,
  tableNumber,
  onTableNumberChange,
  selectedTableData = null,
  onTableSelect,
  waiters,
  selectedWaiter,
  onWaiterChange,
  numberOfGuests,
  onGuestsChange,
  specialRequirements,
  onSpecialRequirementsChange,
  subtotal = 0,
  tax = 0,
  deliveryFee,
  total = 0,
  orderNumber,
  onPlaceOrder,
  isPlacingOrder = false,
  isUserLoggedIn = false,
  onLoginRequired,
  userData,
  onNavigateToProfile,
  isCalculatingDelivery = false,
  restaurantId = 'manyazewal1',
  floor = 'Ground Floor',
  arrangementId,
  onGuestOrder,
}: CartPanelProps) => {
  const [showTableSelector, setShowTableSelector] = useState(false);
  const [showGuestInfoDialog, setShowGuestInfoDialog] = useState(false);
  const [guestInfo, setGuestInfo] = useState<GuestUserData>({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    isGuest: true
  });
  const [guestInfoErrors, setGuestInfoErrors] = useState<Partial<GuestUserData>>({});

  const getImageSrc = (imageUrl?: string): string => {
    if (!imageUrl) return '/placeholder.svg';
    if (imageUrl.startsWith('http')) return imageUrl;
    if (imageUrl.startsWith('/uploads')) return imageUrl;
    return `/uploads/${imageUrl}`;
  };

  const formatCurrency = (value: number | undefined | null): string => {
    if (value === undefined || value === null || isNaN(value)) {
      return '0.00';
    }
    return value.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const formattedSubtotal = formatCurrency(subtotal);
  const formattedTax = formatCurrency(tax);
  const formattedTotal = formatCurrency(total);
  const formattedDeliveryFee = formatCurrency(deliveryFee?.fee);

  // Validate guest information
  const validateGuestInfo = (): boolean => {
    const errors: Partial<GuestUserData> = {};
    
    if (!guestInfo.firstName.trim()) {
      errors.firstName = 'First name is required';
    }
    if (!guestInfo.lastName.trim()) {
      errors.lastName = 'Last name is required';
    }
    if (!guestInfo.phone.trim()) {
      errors.phone = 'Phone number is required';
    } else if (!/^[0-9+\-\s]{8,15}$/.test(guestInfo.phone)) {
      errors.phone = 'Invalid phone number (e.g., 0912345678)';
    }
    if (guestInfo.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestInfo.email)) {
      errors.email = 'Invalid email address';
    }
    
    setGuestInfoErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle guest info submission - THIS WILL CLOSE DIALOG AND CALL onPlaceOrder
  const handleGuestInfoSubmit = () => {
    if (validateGuestInfo()) {
      // Pass guest data to parent component
      if (onGuestOrder) {
        onGuestOrder(guestInfo);
      }
      // Close the guest info dialog
      setShowGuestInfoDialog(false);
      // Now proceed to payment verification
      onPlaceOrder();
    }
  };

  // Check if order can be placed
  const canPlaceOrder = () => {
    if (cart.length === 0) return false;
    if (!orderType) return false;
    
    if (orderType === 'table') {
      return selectedTableData !== null;
    }
    
    if (orderType === 'delivery') {
      if (!isUserLoggedIn) return false;
      return true;
    }
    
    return true;
  };

  // Handle place order click - shows guest info dialog for non-logged-in table orders
  const handlePlaceOrderClick = () => {
    if (!canPlaceOrder()) return;
    
    // For table orders without login, show guest info dialog first
    if (orderType === 'table' && !isUserLoggedIn) {
      setShowGuestInfoDialog(true);
    } else {
      // For logged-in users or delivery, proceed directly to payment
      onPlaceOrder();
    }
  };

  // Handle order type change with login check
  const handleOrderTypeChange = (type: 'table' | 'delivery') => {
    if (type === 'delivery' && !isUserLoggedIn) {
      onLoginRequired('Please login to use delivery service');
      return;
    }
    onOrderTypeChange(type);
  };

  // Get user display name for logged-in users
  const getUserDisplayName = () => {
    if (!userData) return '';
    const firstName = userData.firstName || '';
    const lastName = userData.lastName || '';
    return `${firstName} ${lastName}`.trim() || userData.email?.split('@')[0] || 'User';
  };

  // Get user phone for logged-in users
  const getUserPhone = () => {
    return userData?.phone || '';
  };

  // Get user address for logged-in users
  const getUserAddress = () => {
    return userData?.address || '';
  };

  const getPlaceOrderText = () => {
    if (orderType === 'table') {
      return 'Place Order';
    }
    if (orderType === 'delivery') {
      return 'Place Delivery Order';
    }
    return 'Place Order';
  };

  return (
    <>
      <div className="flex flex-col h-full bg-gradient-to-br from-white to-purple-50/30">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-purple-100 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
          <motion.h3 
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="font-bold flex items-center gap-1.5"
          >
            <div className="p-1 bg-gradient-to-r from-purple-800 to-purple-900 rounded-md shadow-lg">
              <ShoppingCart className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="bg-gradient-to-r from-purple-900 to-purple-700 bg-clip-text text-transparent text-sm">
              Your Order
            </span>
            <Badge variant="outline" className="ml-1 bg-purple-50 text-purple-900 border-purple-200 rounded-full text-[10px] px-1.5">
              {cart.length}
            </Badge>
          </motion.h3>
          <motion.div
            whileHover={{ rotate: 90 }}
            whileTap={{ scale: 0.9 }}
          >
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onClose}
              className="h-6 w-6 rounded-full hover:bg-red-50 hover:text-red-600 transition-colors"
            >
              <X className="h-3 w-3" />
            </Button>
          </motion.div>
        </div>

        {/* User Info Banner - For logged in users */}
        {isUserLoggedIn && userData && (
          <div className="bg-gradient-to-r from-purple-100 to-purple-50 px-3 py-1.5 border-b border-purple-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1 bg-purple-200 rounded-full">
                  <User className="h-3 w-3 text-purple-800" />
                </div>
                <div>
                  <p className="text-[10px] font-medium text-purple-900">
                    {getUserDisplayName()}
                  </p>
                  {getUserPhone() && (
                    <p className="text-[8px] text-purple-600">{getUserPhone()}</p>
                  )}
                </div>
              </div>
              {onNavigateToProfile && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={onNavigateToProfile}
                  className="h-5 text-[8px] px-2 rounded-full text-purple-700 hover:text-purple-900 hover:bg-purple-100"
                >
                  Profile
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Guest Mode Banner - For non-logged in users */}
        {!isUserLoggedIn && (
          <div className="bg-blue-50 border-b border-blue-200 px-3 py-1.5">
            <div className="flex items-center gap-2">
              <UserPlus className="h-3 w-3 text-blue-600" />
              <p className="text-[9px] text-blue-700 flex-1">
                You're ordering as a guest. For delivery, please login.
              </p>
            </div>
          </div>
        )}

        {cart.length > 0 ? (
          <>
            <div className="flex-1 overflow-y-auto">
              <div className="p-3 space-y-3 pb-28">
                {/* Cart Items */}
                <AnimatePresence>
                  <div className="space-y-1.5">
                    {cart.map((item, index) => {
                      const { originalPrice, taxAmount } = calculatePriceBreakdown(Number(item.price));
                      const itemTotalOriginal = originalPrice * item.quantity;
                      
                      return (
                        <motion.div
                          key={item._id}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          transition={{ delay: index * 0.05 }}
                          className="group"
                        >
                          <div className="flex gap-1.5 border border-purple-100 rounded-lg bg-white hover:shadow-sm transition-all p-1.5">
                            <div className="relative h-10 w-10 flex-shrink-0 rounded-md overflow-hidden bg-gradient-to-br from-purple-50 to-gray-50">
                              <img
                                src={getImageSrc(item.imageUrl)}
                                alt={item.name}
                                className="object-cover w-full h-full"
                                onError={(e) => (e.target as HTMLImageElement).src = '/placeholder.svg'}
                              />
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-1">
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-semibold text-[11px] text-gray-800 truncate">
                                    {item.name}
                                  </h4>
                                  <div className="flex items-center gap-1 mt-0.5">
                                    <span className="text-[9px] font-semibold text-purple-900">
                                      {originalPrice.toFixed(2)}
                                    </span>
                                    <span className="text-[8px] text-gray-500">ETB</span>
                                    {item.preparationTime && (
                                      <span className="text-[8px] text-gray-500 flex items-center gap-0.5 ml-0.5">
                                        <Clock className="h-2 w-2" />
                                        {item.preparationTime}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => onRemoveItem(item._id)}
                                  className="h-4 w-4 p-0 rounded-full text-red-400 hover:bg-red-50 hover:text-red-600 flex-shrink-0"
                                >
                                  <X className="h-2 w-2" />
                                </Button>
                              </div>
                              
                              <div className="flex items-center justify-between mt-1">
                                <div className="flex items-center border border-purple-100 rounded-md overflow-hidden bg-white">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => onUpdateQuantity(item._id, item.quantity - 1)}
                                    className="h-4 w-4 p-0 rounded-none hover:bg-purple-50"
                                  >
                                    <Minus className="h-1.5 w-1.5" />
                                  </Button>
                                  <span className="w-5 text-center text-[9px] font-semibold text-purple-900">
                                    {item.quantity}
                                  </span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => onUpdateQuantity(item._id, item.quantity + 1)}
                                    className="h-4 w-4 p-0 rounded-none hover:bg-purple-50"
                                  >
                                    <Plus className="h-1.5 w-1.5" />
                                  </Button>
                                </div>
                                
                                <div className="text-right">
                                  <span className="text-[10px] font-bold text-purple-900">
                                    {itemTotalOriginal.toFixed(2)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </AnimatePresence>

                <Separator className="bg-gradient-to-r from-transparent via-purple-200 to-transparent my-2" />

                {/* ORDER TYPE SECTION */}
                <div className="space-y-2">
                  <div className="flex items-center gap-1">
                    <div className="p-0.5 bg-purple-100 rounded">
                      <ChevronRight className="h-2.5 w-2.5 text-purple-900" />
                    </div>
                    <Label className="text-[10px] font-bold text-purple-900 uppercase tracking-wide">
                      Order Type
                    </Label>
                  </div>
                  
                  <RadioGroup
                    value={orderType}
                    onValueChange={(value: 'table' | 'delivery') => handleOrderTypeChange(value)}
                    className="grid grid-cols-2 gap-2"
                  >
                    <div>
                      <RadioGroupItem value="table" id="table-modern" className="peer sr-only" />
                      <Label
                        htmlFor="table-modern"
                        className="flex items-center justify-center gap-1.5 rounded-md border border-purple-200 bg-white py-2 px-2 hover:bg-purple-50 hover:border-purple-400 peer-data-[state=checked]:border-purple-600 peer-data-[state=checked]:bg-purple-50 peer-data-[state=checked]:shadow-sm cursor-pointer transition-all group"
                      >
                        <div className="p-0.5 bg-purple-100 rounded group-hover:bg-purple-200 peer-data-[state=checked]:bg-purple-200">
                          <Home className="h-3.5 w-3.5 text-purple-700" />
                        </div>
                        <span className="text-[11px] font-medium text-gray-700 group-hover:text-purple-800 peer-data-[state=checked]:text-purple-800">
                          Dine In
                        </span>
                      </Label>
                    </div>

                    <div>
                      <RadioGroupItem 
                        value="delivery" 
                        id="delivery-modern" 
                        className="peer sr-only" 
                        disabled={!isUserLoggedIn}
                      />
                      <Label
                        htmlFor="delivery-modern"
                        className={`flex items-center justify-center gap-1.5 rounded-md border py-2 px-2 transition-all group ${
                          !isUserLoggedIn 
                            ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-50' 
                            : 'border-purple-200 bg-white hover:bg-purple-50 hover:border-purple-400 cursor-pointer peer-data-[state=checked]:border-purple-600 peer-data-[state=checked]:bg-purple-50 peer-data-[state=checked]:shadow-sm'
                        }`}
                      >
                        <div className={`p-0.5 rounded ${!isUserLoggedIn ? 'bg-gray-100' : 'bg-purple-100 group-hover:bg-purple-200'}`}>
                          <Truck className={`h-3.5 w-3.5 ${!isUserLoggedIn ? 'text-gray-400' : 'text-purple-700'}`} />
                        </div>
                        <span className={`text-[11px] font-medium ${!isUserLoggedIn ? 'text-gray-400' : 'text-gray-700 group-hover:text-purple-800'}`}>
                          Delivery
                        </span>
                        {!isUserLoggedIn && <Lock className="h-2.5 w-2.5 text-gray-400 ml-0.5" />}
                      </Label>
                    </div>
                  </RadioGroup>
                  
                  {/* Delivery disabled message */}
                  {!isUserLoggedIn && (
                    <p className="text-[8px] text-amber-600 text-center mt-1">
                      Login to enable delivery service
                    </p>
                  )}
                </div>

                {/* Table Order Fields */}
                <AnimatePresence>
                  {orderType === 'table' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-2 overflow-hidden"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1">
                          <Armchair className="h-3 w-3 text-purple-600" />
                          <Label className="text-[10px] font-medium text-purple-900">Select Table</Label>
                        </div>
                        
                        {selectedTableData ? (
                          <div className="bg-purple-50 border border-purple-200 rounded-md p-1.5">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <div>
                                  <div className="font-bold text-purple-900 text-[11px]">Table {selectedTableData.number}</div>
                                  <div className="text-[9px] text-gray-600">{selectedTableData.capacity} seats</div>
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowTableSelector(true)}
                                className="h-6 text-[10px] px-2 rounded-full"
                              >
                                Change
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <Button
                            variant="outline"
                            className="w-full border border-purple-200 hover:border-purple-500 hover:bg-purple-50 rounded-md h-8 text-[10px]"
                            onClick={() => setShowTableSelector(true)}
                          >
                            <Armchair className="w-3 h-3 mr-1.5" />
                            Select a Table
                          </Button>
                        )}
                      </div>
                      
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3 text-purple-600" />
                          <Label className="text-[10px] font-medium text-purple-900">Number of Guests</Label>
                        </div>
                        <Select 
                          value={numberOfGuests.toString()} 
                          onValueChange={(v) => onGuestsChange(parseInt(v))}
                        >
                          <SelectTrigger className="border border-purple-200 focus:border-purple-500 rounded-md h-8 text-[10px]">
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: Math.min(20, selectedTableData?.capacity || 10) }, (_, i) => (
                              <SelectItem key={i} value={(i + 1).toString()} className="text-[11px]">
                                {i + 1} {i === 0 ? 'Guest' : 'Guests'}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </motion.div>
                  )}

                  {/* Delivery Fields - Only for logged in users */}
                  {orderType === 'delivery' && isUserLoggedIn && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-2 overflow-hidden"
                    >
                      {/* User Address Information */}
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-2">
                        <div className="flex items-start gap-2">
                          <MapPin className="h-3 w-3 text-purple-600 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-[9px] font-medium text-purple-900">Delivery Address</p>
                            <p className="text-[8px] text-gray-600">
                              {getUserAddress() || 'No address saved. Please update your profile.'}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Delivery fee display */}
                      {isCalculatingDelivery ? (
                        <div className="flex items-center justify-center py-2 bg-purple-50 rounded-lg border border-purple-200">
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-purple-900 mr-1.5"></div>
                          <span className="text-[10px] text-purple-900">Calculating delivery...</span>
                        </div>
                      ) : deliveryFee && (
                        <div className="bg-gradient-to-r from-purple-50 to-white border border-purple-200 rounded-lg p-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <Truck className="h-3 w-3 text-purple-700" />
                              <span className="text-[10px] font-bold text-purple-900">Delivery Fee</span>
                            </div>
                            <Badge className={deliveryFee.fee === 0 ? "bg-green-100 text-green-700 text-[9px] px-1.5" : "bg-purple-900 text-white text-[9px] px-1.5"}>
                              {deliveryFee.fee === 0 ? 'FREE' : `${formattedDeliveryFee} ETB`}
                            </Badge>
                          </div>
                          <div className="text-[9px] text-gray-500 mt-0.5 flex items-center gap-1">
                            <Navigation className="h-2.5 w-2.5" />
                            {deliveryFee.distance} km from restaurant
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Special Requirements */}
                <div className="space-y-1">
                  <div className="flex items-center gap-1">
                    <span className="text-[10px]">📝</span>
                    <Label className="text-[9px] font-medium text-purple-900">Special Instructions</Label>
                  </div>
                  <Textarea
                    placeholder="Any special requests or notes..."
                    value={specialRequirements}
                    onChange={(e) => onSpecialRequirementsChange(e.target.value)}
                    rows={1}
                    className="resize-none border border-purple-200 focus:border-purple-500 rounded-md text-[9px] h-12"
                  />
                </div>
              </div>
            </div>

            {/* Bottom Section */}
            <div className="sticky bottom-0 border-t border-purple-100 bg-white/95 backdrop-blur-md shadow-lg">
              {/* Table Summary Badge */}
              {orderType === 'table' && selectedTableData && (
                <div className="px-3 pt-1.5 pb-0.5">
                  <div className="bg-purple-50 rounded-full px-2 py-0.5 text-center inline-block w-full">
                    <span className="text-[9px] font-medium text-purple-900">
                      Table {selectedTableData.number} • {selectedTableData.capacity} seats
                    </span>
                  </div>
                </div>
              )}
              
              {/* Delivery Summary - For logged in users */}
              {orderType === 'delivery' && isUserLoggedIn && getUserPhone() && (
                <div className="px-3 pt-1.5 pb-0.5">
                  <div className="bg-purple-50 rounded-full px-2 py-0.5 text-center inline-block w-full">
                    <span className="text-[9px] font-medium text-purple-900">
                      Delivering to: {getUserPhone()}
                    </span>
                  </div>
                </div>
              )}
              
              {/* Order Summary */}
              <div className="px-3 py-1.5 space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-[9px] text-gray-500">Subtotal</span>
                  <span className="text-[9px] font-medium text-purple-900">{formattedSubtotal}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[9px] text-gray-500">VAT 15%</span>
                  <span className="text-[9px] font-medium text-purple-900">{formattedTax}</span>
                </div>
                {orderType === 'delivery' && isUserLoggedIn && deliveryFee && deliveryFee.fee > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] text-gray-500">Delivery Fee</span>
                    <span className="text-[9px] font-medium text-purple-900">{formattedDeliveryFee}</span>
                  </div>
                )}
                
                <div className="border-t border-purple-100 my-0.5"></div>
                
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-gray-700">Total</span>
                  <span className="text-[11px] font-bold bg-gradient-to-r from-purple-900 to-purple-700 bg-clip-text text-transparent">
                    {formattedTotal}
                  </span>
                </div>
                
                <div className="flex justify-center">
                  <Badge variant="outline" className="bg-purple-50 text-purple-900 border-purple-200 rounded-full text-[8px] px-1.5 py-0">
                    Order #{orderNumber}
                  </Badge>
                </div>
                
                {/* Guest indicator for non-logged-in table orders */}
                {!isUserLoggedIn && orderType === 'table' && (
                  <div className="flex justify-center">
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 rounded-full text-[8px] px-1.5 py-0">
                      <UserPlus className="h-2 w-2 mr-0.5" />
                      Guest Order
                    </Badge>
                  </div>
                )}
                
                {/* Place Order Button */}
                <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                  <Button 
                    onClick={handlePlaceOrderClick} 
                    className="w-full h-8 text-[11px] font-bold bg-gradient-to-r from-purple-800 to-purple-900 hover:from-purple-900 hover:to-purple-950 text-white border-0 rounded-md shadow-sm hover:shadow-md transition-all"
                    disabled={
                      cart.length === 0 || 
                      !orderType || 
                      isPlacingOrder ||
                      (orderType === 'table' && !selectedTableData) ||
                      (orderType === 'delivery' && !isUserLoggedIn)
                    }
                  >
                    {isPlacingOrder ? (
                      <>
                        <div className="h-2.5 w-2.5 animate-spin rounded-full border-2 border-white border-t-transparent mr-1.5" />
                        <span className="text-[10px]">Processing...</span>
                      </>
                    ) : (
                      <>
                        <Receipt className="mr-1.5 h-3 w-3" />
                        <span className="text-[10px]">{getPlaceOrderText()}</span>
                      </>
                    )}
                  </Button>
                </motion.div>
                
                {/* Login hint for delivery */}
                {!isUserLoggedIn && orderType === 'delivery' && (
                  <p className="text-[8px] text-center text-amber-600 mt-1">
                    Please login to place delivery order
                  </p>
                )}
                
                {/* Guest info hint for table order */}
                {!isUserLoggedIn && orderType === 'table' && (
                  <p className="text-[8px] text-center text-blue-600 mt-1">
                    You'll be asked to provide contact info
                  </p>
                )}
              </div>
            </div>
          </>
        ) : (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex-1 flex flex-col items-center justify-center p-6 text-center"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-700 to-purple-900 rounded-full blur-2xl opacity-20" />
              <div className="relative h-16 w-16 rounded-full bg-gradient-to-br from-purple-100 to-purple-50 flex items-center justify-center mb-3 shadow-md">
                <ShoppingCart className="h-8 w-8 text-purple-900" />
              </div>
            </div>
            <h3 className="text-sm font-bold text-gray-800 mb-1">Your cart is empty</h3>
            <p className="text-[10px] text-gray-600 mb-3">
              Add delicious items from our menu
            </p>
            <Button variant="outline" onClick={onClose} className="rounded-full px-4 py-1 text-[10px] border border-purple-200 hover:border-purple-500 hover:bg-purple-50 h-7">
              Browse Menu
            </Button>
          </motion.div>
        )}

        {/* Table Selector */}
        <TableSelector
          open={showTableSelector}
          onOpenChange={setShowTableSelector}
          restaurantId={restaurantId}
          floor={floor}
          onTableSelect={(table, _restaurantId, _floor) => {
            if (!table || table === null) {
              onTableSelect?.(null);
              onTableNumberChange('');
            } else {
              onTableSelect?.(table);
              onTableNumberChange(table.number.toString());
            }
            setShowTableSelector(false);
          }}
          selectedTable={selectedTableData}
          isUserLoggedIn={isUserLoggedIn}
          onLoginRequired={onLoginRequired}
          arrangementId={arrangementId}
          allowUnselect={true}
          autoSwitchTables={true}
        />
      </div>

      {/* Guest Information Dialog - MODAL THAT COLLECTS GUEST DATA BEFORE PAYMENT */}
      <Dialog open={showGuestInfoDialog} onOpenChange={setShowGuestInfoDialog}>
        <DialogContent className="sm:max-w-md rounded-xl p-0 overflow-hidden">
          <DialogHeader className="px-4 pt-4 pb-2 bg-gradient-to-r from-purple-50 to-white">
            <DialogTitle className="flex items-center gap-2 text-purple-900">
              <UserPlus className="h-4 w-4" />
              Guest Information Required
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-600">
              Please provide your contact information to complete your table order
            </DialogDescription>
          </DialogHeader>
          
          <div className="px-4 py-4 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-[10px] font-medium text-purple-900 flex items-center gap-1">
                  First Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={guestInfo.firstName}
                  onChange={(e) => {
                    setGuestInfo({ ...guestInfo, firstName: e.target.value });
                    if (guestInfoErrors.firstName) setGuestInfoErrors({ ...guestInfoErrors, firstName: undefined });
                  }}
                  placeholder="John"
                  className={`h-8 text-[11px] rounded-md ${guestInfoErrors.firstName ? 'border-red-500' : 'border-purple-200'}`}
                />
                {guestInfoErrors.firstName && (
                  <p className="text-[8px] text-red-500">{guestInfoErrors.firstName}</p>
                )}
              </div>
              
              <div className="space-y-1">
                <Label className="text-[10px] font-medium text-purple-900 flex items-center gap-1">
                  Last Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={guestInfo.lastName}
                  onChange={(e) => {
                    setGuestInfo({ ...guestInfo, lastName: e.target.value });
                    if (guestInfoErrors.lastName) setGuestInfoErrors({ ...guestInfoErrors, lastName: undefined });
                  }}
                  placeholder="Doe"
                  className={`h-8 text-[11px] rounded-md ${guestInfoErrors.lastName ? 'border-red-500' : 'border-purple-200'}`}
                />
                {guestInfoErrors.lastName && (
                  <p className="text-[8px] text-red-500">{guestInfoErrors.lastName}</p>
                )}
              </div>
            </div>
            
            <div className="space-y-1">
              <Label className="text-[10px] font-medium text-purple-900 flex items-center gap-1">
                Phone Number <span className="text-red-500">*</span>
              </Label>
              <Input
                value={guestInfo.phone}
                onChange={(e) => {
                  setGuestInfo({ ...guestInfo, phone: e.target.value });
                  if (guestInfoErrors.phone) setGuestInfoErrors({ ...guestInfoErrors, phone: undefined });
                }}
                placeholder="0912345678"
                className={`h-8 text-[11px] rounded-md ${guestInfoErrors.phone ? 'border-red-500' : 'border-purple-200'}`}
              />
              {guestInfoErrors.phone && (
                <p className="text-[8px] text-red-500">{guestInfoErrors.phone}</p>
              )}
            </div>
            
            <div className="space-y-1">
              <Label className="text-[10px] font-medium text-purple-900">Email (Optional)</Label>
              <Input
                value={guestInfo.email}
                onChange={(e) => {
                  setGuestInfo({ ...guestInfo, email: e.target.value });
                  if (guestInfoErrors.email) setGuestInfoErrors({ ...guestInfoErrors, email: undefined });
                }}
                placeholder="john@example.com"
                className={`h-8 text-[11px] rounded-md ${guestInfoErrors.email ? 'border-red-500' : 'border-purple-200'}`}
              />
              {guestInfoErrors.email && (
                <p className="text-[8px] text-red-500">{guestInfoErrors.email}</p>
              )}
            </div>
            
            <div className="bg-blue-50 rounded-md p-2 mt-2">
              <p className="text-[9px] text-blue-700 flex items-start gap-1">
                <CreditCard className="h-3 w-3 mt-0.5 flex-shrink-0" />
                <span>After providing your information, you'll proceed to payment verification to complete your order.</span>
              </p>
            </div>
          </div>
          
          <DialogFooter className="px-4 py-3 bg-gray-50 border-t border-gray-100">
            <Button
              variant="outline"
              onClick={() => setShowGuestInfoDialog(false)}
              className="h-8 text-[11px] rounded-md"
            >
              Cancel
            </Button>
            <Button
              onClick={handleGuestInfoSubmit}
              className="h-8 text-[11px] bg-gradient-to-r from-purple-800 to-purple-900 hover:from-purple-900 hover:to-purple-950 rounded-md"
            >
              Continue to Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
});

CartPanel.displayName = 'CartPanel';

export default CartPanel;