"use client";

import React, { useState, useEffect, useCallback, useMemo, Suspense, lazy, useRef } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { toast } from "react-hot-toast"
import { Label } from "@/components/ui/label" 
import { motion, AnimatePresence } from "framer-motion"
import {
  ArrowLeft,
  Search,
  ShoppingCart,
  Minus,
  Plus,
  X,
  Users,
  Utensils,
  Coffee,
  Pizza,
  SandwichIcon as Hamburger,
  IceCream,
  Clock,
  ChefHat,
  Sparkles,
  Loader2,
  Receipt,
  Check,
  User as UserIcon,
  ArrowRightLeft,
  RefreshCw,
  Package,
  Bell,
  BellRing,
  Volume2,
  VolumeX,
  Home,
  Building2,
  BookOpen
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"

import { AlternativePickerDialog, type IngredientChoice, type AlternativeOption, type IngredientSelections } from "@/components/orders/AlternativePickerDialog"

// Types
interface MenuItem {
  _id: string
  name: string
  description: string
  price: number
  imageUrl: string
  categoryId: string
  preparationTime: number
  calories: number
  tags: string[]
  stock?: number
  bookQuantity?: number
  requiredStock?: {
    stockId: string
    stockName?: string
    stockUnit?: string
    quantity: number
    alternatives?: { stockId: string; stockName?: string; stockUnit?: string; quantity: number; label?: string }[]
  }[]
}

interface Category {
  _id: string
  name: string
  type: string
  imageUrl: string
}

interface CartItem extends MenuItem {
  quantity: number
  specialInstructions?: string
  originalPrice?: number
  taxAmount?: number
  ingredientChoices?: { defaultStockId: string; chosenStockId: string; chosenQuantity: number }[]
}

interface Waiter {
  _id: string
  name: string
  shift?: string
  avatar?: string
  email?: string
  role?: string
  restaurantId?: string
  restaurantName?: string
}

interface Stock {
  _id: string;
  name: string;
  unit?: string;
  currentStock?: number;
}

interface Purchase {
  _id: string
  stockId: string
  purchaseDate: string
  quantity: number
  unitPrice: number
  supplier: string
}

function getLatestPrice(stockId: string, purchases: Purchase[]): number {
  const stockPurchases = purchases
    .filter(p => p.stockId === stockId)
    .sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime())
  return stockPurchases.length > 0 ? stockPurchases[0].unitPrice : 0
}

function getStockName(stockId: string, stocks: Stock[]): string {
  const stock = stocks.find(s => s._id === stockId)
  return stock ? stock.name : "Unknown"
}

function getStockUnit(stockId: string, stocks: Stock[]): string {
  const stock = stocks.find(s => s._id === stockId)
  return stock ? stock.unit ?? "unit" : "unit"
}

interface OrderItem {
  id: string
  menuItemId: string
  name: string
  price: number
  quantity: number
  specialInstructions?: string
  total: number
}

interface EditRequest {
  requestedWaiterId: string
  requestedWaiterName?: string
  status: 'pending' | 'accepted' | 'cancelled'
  requestedBy: string
  requestedByName?: string
  requestedAt: string
  reason: string
  originalWaiterId: string
  originalWaiterName?: string
  cancelledBy?: string
  cancelledByRole?: string
}

interface AssignmentRequest {
  status: 'pending' | 'accepted' | 'rejected'
  type: 'table_assignment'
  requestedAt: string
  tableNumber: string
  numberOfGuests: number
  orderNumber: string
  customerName: string
  itemsCount: number
  totalAmount: number
  acceptedAt?: string
  acceptedBy?: string
  rejectedAt?: string
  rejectedBy?: string
  rejectionReason?: string
}

interface Order {
  id: string
  orderNumber: string
  status: string
  totalAmount: number
  finalAmount: number
  tax: number
  discount: number
  numberOfGuests: number
  tableNumber: string
  customerName: string
  notes: string
  createdAt: string
  updatedAt: string
  orderItems: OrderItem[]
  paymentStatus: string
  paymentMethod: string
  waiterId: string
  restaurantId?: string
  restaurantName?: string
  waiterInfo?: {
    id: string
    name: string
    role: string
  }
  editRequest?: EditRequest
  assignmentRequest?: AssignmentRequest
  _id?: string
}

interface Restaurant {
  _id: string
  name: string
  shortName: string
  isActive: boolean
}

// Helper function to calculate price breakdown
const calculatePriceBreakdown = (priceWithTax: number, taxRate: number = 0.15) => {
  const originalPrice = priceWithTax / (1 + taxRate)
  const taxAmount = priceWithTax - originalPrice
  return { originalPrice, taxAmount }
}

// Helper to normalize role
const normalizeRole = (role: string | undefined): string => {
  if (!role) return 'DEFAULT';
  return role.toUpperCase().trim();
};

const isAdminUser = (role: string | undefined): boolean => {
  if (!role) return false;
  const adminRoles = ["ADMIN", "admin", "Admin", "SUPER_ADMIN"];
  return adminRoles.includes(role);
};

const isPOSUser = (role: string | undefined): boolean => {
  if (!role) return false;
  return role.toUpperCase() === "POS";
};

const isKitchenUser = (role: string | undefined): boolean => {
  if (!role) return false;
  return role.toUpperCase() === "KITCHEN";
};

// Helper to get default restaurant ID
const getDefaultRestaurantId = (): string => {
  return "manyazewal1";
};

// Helper to get default restaurant name
const getDefaultRestaurantName = (): string => {
  return "Manyazewal Eshetu Gibi 1";
};

// Helper to determine restaurant based on waiter selection
const getRestaurantForWaiter = (
  waiterId: string | undefined, 
  waitersList: Waiter[], 
  defaultRestaurantId: string
): { id: string; name: string } => {
  // If no waiter selected, return Restaurant One
  if (!waiterId || waiterId === "") {
    const defaultRestaurant = waitersList.find(w => w.restaurantId === defaultRestaurantId);
    return {
      id: defaultRestaurantId,
      name: defaultRestaurant?.restaurantName || getDefaultRestaurantName()
    };
  }
  
  // Find the selected waiter
  const selectedWaiter = waitersList.find(w => w._id === waiterId);
  
  // If waiter has restaurantId, use it
  if (selectedWaiter?.restaurantId) {
    // Find restaurant name from the restaurant ID
    return {
      id: selectedWaiter.restaurantId,
      name: selectedWaiter.restaurantName || getRestaurantNameFromId(selectedWaiter.restaurantId)
    };
  }
  
  // If waiter has restaurantName, map it
  if (selectedWaiter?.restaurantName) {
    const name = selectedWaiter.restaurantName.toLowerCase();
    if (name.includes('2') || name.includes('gibi 2')) {
      return { id: "manyazewal2", name: "Manyazewal Eshetu Gibi 2" };
    } else {
      return { id: "manyazewal1", name: "Manyazewal Eshetu Gibi 1" };
    }
  }
  
  // Default to Restaurant One
  return {
    id: defaultRestaurantId,
    name: getDefaultRestaurantName()
  };
};

// Helper to get restaurant name from ID
const getRestaurantNameFromId = (restaurantId: string): string => {
  switch (restaurantId) {
    case "manyazewal1":
      return "Manyazewal Eshetu Gibi 1";
    case "manyazewal2":
      return "Manyazewal Eshetu Gibi 2";
    default:
      return getDefaultRestaurantName();
  }
};

// Helper to safely extract data from API response
const extractData = <T,>(response: any, fallback: T[] = []): T[] => {
  try {
    // Check various response formats
    if (response?.data?.data && Array.isArray(response.data.data)) {
      return response.data.data;
    }
    if (response?.data && Array.isArray(response.data)) {
      return response.data;
    }
    if (Array.isArray(response)) {
      return response;
    }
    // Check if response has success flag and data
    if (response?.data?.success && response.data.data) {
      return Array.isArray(response.data.data) ? response.data.data : fallback;
    }
    // Check if response itself has success and data
    if (response?.success && response.data) {
      return Array.isArray(response.data) ? response.data : fallback;
    }
    return fallback;
  } catch (error) {
    console.error('Error extracting data:', error);
    return fallback;
  }
};

// Custom debounce function
const useDebounce = <T,>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
};

// Sound notification hook
const useNotificationSound = () => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isEnabled, setIsEnabled] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [audioLoaded, setAudioLoaded] = useState(false);
  
  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'auto';
    audio.src = '/sounds/notification.mp3';
    audio.volume = 0.5;
    
    audio.addEventListener('canplaythrough', () => {
      setAudioLoaded(true);
      setIsReady(true);
    });
    
    audio.addEventListener('error', () => {
      setAudioLoaded(false);
      setIsReady(true);
    });
    
    audioRef.current = audio;
    
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }
    };
  }, []);

  const play = useCallback(() => {
    if (!isEnabled) return;
    if (audioRef.current && audioLoaded) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }
  }, [isEnabled, audioLoaded]);

  return { play, isEnabled, setIsEnabled };
};

// Sound Toggle Button
const SoundToggleButton = ({ isEnabled, onToggle }: { isEnabled: boolean; onToggle: () => void }) => (
  <Button variant="ghost" size="icon" onClick={onToggle} className="h-7 w-7 sm:h-8 sm:w-8 relative">
    {isEnabled ? <Volume2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> : <VolumeX className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
  </Button>
);

const getCategoryIcon = (type: string) => {
  switch (type.toLowerCase()) {
    case "food": return <Utensils className="h-4 w-4 sm:h-5 sm:w-5" />
    case "drink": return <Coffee className="h-4 w-4 sm:h-5 sm:w-5" />
    case "pizza": return <Pizza className="h-4 w-4 sm:h-5 sm:w-5" />
    case "burger": return <Hamburger className="h-4 w-4 sm:h-5 sm:w-5" />
    case "dessert": return <IceCream className="h-4 w-4 sm:h-5 sm:w-5" />
    case "book": return <BookOpen className="h-4 w-4 sm:h-5 sm:w-5" />
    default: return <Utensils className="h-4 w-4 sm:h-5 sm:w-5" />
  }
}

const getInitials = (name: string) => {
  return name.split(" ").map(word => word[0]).join("").toUpperCase().slice(0, 2)
}

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
}

// Table Assignment Card Component
function TableAssignmentCard({
  order,
  onAccept,
  onReject,
  isLoading
}: {
  order: Order;
  onAccept: (orderId: string) => Promise<void>;
  onReject: (orderId: string, reason?: string) => Promise<void>;
  isLoading: boolean;
}) {
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="border-2 border-green-200 bg-green-50/30 hover:shadow-lg transition-shadow">
        <CardContent className="p-3 sm:p-6">
          <div className="flex flex-col gap-3 sm:gap-4">
            <div className="flex items-start justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Home className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 animate-pulse" />
                <h3 className="font-semibold text-sm sm:text-base">New Table Assignment - Order #{order.orderNumber}</h3>
                <Badge className="bg-green-100 text-green-800 text-[10px] sm:text-xs">Table {order.tableNumber}</Badge>
                {order.restaurantName && (
                  <Badge variant="outline" className="bg-indigo-50 text-indigo-800 text-[10px] sm:text-xs">
                    <Building2 className="h-2.5 w-2.5 mr-1" />
                    {order.restaurantName}
                  </Badge>
                )}
              </div>
              <div className="text-xs sm:text-sm font-semibold text-green-600">
                {new Intl.NumberFormat('en-ET', { style: 'currency', currency: 'ETB' }).format(order.finalAmount)}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-2 sm:gap-3 text-xs sm:text-sm">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <UserIcon className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                <span className="truncate">Customer: {order.customerName || 'Walk-in'}</span>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Users className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                <span>Guests: {order.numberOfGuests}</span>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2 col-span-2 sm:col-span-1">
                <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                <span className="text-[10px] sm:text-xs">{new Date(order.createdAt).toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Package className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                <span>{order.orderItems?.length || 0} items</span>
              </div>
            </div>
            
            {order.assignmentRequest && (
              <div className="bg-white/70 rounded-lg p-2 sm:p-3 space-y-1">
                <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
                  <ChefHat className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
                  <span className="font-medium">Order Details:</span>
                </div>
                <div className="text-[10px] sm:text-xs space-y-0.5 sm:space-y-1 pl-4 sm:pl-6">
                  <p><span className="text-muted-foreground">Items:</span> {order.orderItems?.slice(0, 2).map(i => i.name).join(', ')}</p>
                  {order.orderItems?.length > 2 && <p className="text-[9px] sm:text-[10px] text-muted-foreground">+{order.orderItems.length - 2} more items</p>}
                  <p className="text-[9px] sm:text-[10px] text-muted-foreground">Requested: {new Date(order.assignmentRequest.requestedAt).toLocaleString()}</p>
                </div>
              </div>
            )}
            
            <div className="flex gap-2 sm:gap-3 mt-2">
              <Button 
                onClick={() => onAccept(order.id)} 
                disabled={isLoading} 
                className="flex-1 gap-1.5 sm:gap-2 bg-green-600 hover:bg-green-700 text-xs sm:text-sm h-8 sm:h-10"
              >
                <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                Accept & Serve
              </Button>
              <Button 
                onClick={() => setShowRejectDialog(true)} 
                disabled={isLoading} 
                variant="outline" 
                className="flex-1 gap-1.5 sm:gap-2 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 text-xs sm:text-sm h-8 sm:h-10"
              >
                <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                Decline
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Decline Table Assignment</DialogTitle>
            <DialogDescription>
              Please provide a reason for declining this assignment.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Reason for declining (e.g., too busy, shift ending, etc.)"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            className="min-h-[100px]"
          />
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => {
                onReject(order.id, rejectReason);
                setShowRejectDialog(false);
                setRejectReason('');
              }}
            >
              Decline Assignment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

// Pending Transfer Requests Component
function PendingTransferRequests({ 
  requests, 
  onAccept, 
  onCancel,
  isLoading,
  onNewRequest
}: { 
  requests: Order[]; 
  onAccept: (orderId: string) => Promise<void>;
  onCancel: (orderId: string) => Promise<void>;
  isLoading: boolean;
  onNewRequest: (request: Order) => void;
}) {
  const previousRequestsRef = useRef<string[]>([]);

  useEffect(() => {
    const currentRequestIds = requests.map(r => r.id);
    const newRequests = currentRequestIds.filter(id => !previousRequestsRef.current.includes(id));
    
    if (newRequests.length > 0) {
      const newRequest = requests.find(r => r.id === newRequests[0]);
      if (newRequest) {
        onNewRequest(newRequest);
      }
    }
    
    previousRequestsRef.current = currentRequestIds;
  }, [requests, onNewRequest]);

  if (requests.length === 0) {
    return (
      <div className="text-center py-8 sm:py-12">
        <div className="h-12 w-12 sm:h-16 sm:w-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-3 sm:mb-4">
          <Bell className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground/50" />
        </div>
        <h3 className="text-base sm:text-lg font-medium mb-1 sm:mb-2">No Pending Transfer Requests</h3>
        <p className="text-xs sm:text-sm text-muted-foreground px-4">
          When waiters request to transfer orders to you, they'll appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      {requests.map((order, index) => (
        <motion.div
          key={order.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <Card className="border-2 border-yellow-200 bg-yellow-50/30 hover:shadow-lg transition-shadow">
            <CardContent className="p-3 sm:p-6">
              <div className="flex flex-col gap-3 sm:gap-4">
                <div className="flex items-start justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <BellRing className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-600 animate-pulse" />
                    <h3 className="font-semibold text-sm sm:text-base">Order #{order.orderNumber}</h3>
                    <Badge className="bg-yellow-100 text-yellow-800 text-[10px] sm:text-xs">Transfer Request</Badge>
                    <Badge variant="outline" className="bg-blue-50 text-[10px] sm:text-xs">Table {order.tableNumber}</Badge>
                    {order.restaurantName && (
                      <Badge variant="outline" className="bg-indigo-50 text-indigo-800 text-[10px] sm:text-xs">
                        <Building2 className="h-2.5 w-2.5 mr-1" />
                        {order.restaurantName}
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs sm:text-sm font-semibold text-green-600">
                    {new Intl.NumberFormat('en-ET', { style: 'currency', currency: 'ETB' }).format(order.finalAmount)}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:gap-3 text-xs sm:text-sm">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <UserIcon className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                    <span className="truncate">Customer: {order.customerName || 'Walk-in'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <Users className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                    <span>Guests: {order.numberOfGuests}</span>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2 col-span-2 sm:col-span-1">
                    <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                    <span className="text-[10px] sm:text-xs">{new Date(order.createdAt).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <Package className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                    <span>{order.orderItems?.length || 0} items</span>
                  </div>
                </div>
                {order.editRequest && (
                  <div className="bg-white/70 rounded-lg p-2 sm:p-3 space-y-1">
                    <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
                      <ArrowRightLeft className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600" />
                      <span className="font-medium">Transfer Details:</span>
                    </div>
                    <div className="text-[10px] sm:text-xs space-y-0.5 sm:space-y-1 pl-4 sm:pl-6">
                      <p><span className="text-muted-foreground">From:</span> {order.editRequest.requestedByName || 'Unknown'}</p>
                      <p><span className="text-muted-foreground">Reason:</span> {order.editRequest.reason}</p>
                      <p className="text-[9px] sm:text-[10px] text-muted-foreground">Requested: {new Date(order.editRequest.requestedAt).toLocaleString()}</p>
                    </div>
                  </div>
                )}
                <div className="flex gap-2 sm:gap-3 mt-2">
                  <Button onClick={() => onAccept(order.id)} disabled={isLoading} className="flex-1 gap-1.5 sm:gap-2 bg-green-600 hover:bg-green-700 text-xs sm:text-sm h-8 sm:h-10">
                    <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    Accept Transfer
                  </Button>
                  <Button onClick={() => onCancel(order.id)} disabled={isLoading} variant="outline" className="flex-1 gap-1.5 sm:gap-2 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 text-xs sm:text-sm h-8 sm:h-10">
                    <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    Cancel
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}

// Cart Panel Component with correct tax calculation
function CartPanel({
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
  handlePlaceOrder,
  closeCart
}: any) {
  const canClose = typeof closeCart === 'function' && closeCart.toString() !== '() => {}';
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-3 border-b sticky top-0 bg-background z-10">
        <h3 className="font-semibold flex items-center gap-2 text-sm">
          <ShoppingCart className="h-4 w-4" />
          Current Order
          <Badge variant="outline" className="ml-1 text-xs">
            {cart.length} {cart.length === 1 ? 'item' : 'items'}
          </Badge>
        </h3>
        {canClose && (
          <Button variant="ghost" size="icon" onClick={closeCart} className="h-8 w-8 rounded-full">
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {cart.length > 0 && (
        <>
          <ScrollArea className="flex-1 p-3">
            <div className="space-y-2">
              {cart.map((item: any) => {
                const { originalPrice, taxAmount } = calculatePriceBreakdown(item.price);
                const itemTotalOriginal = originalPrice * item.quantity;
                const itemTotalTax = taxAmount * item.quantity;
                return (
                  <div key={item._id} className="flex border rounded-lg overflow-hidden bg-background/50">
                    <div className="relative h-14 w-14 flex-shrink-0">
                      <Image src={item.imageUrl || "/placeholder.svg"} alt={item.name} fill sizes="56px" className="object-cover" />
                    </div>
                    <div className="flex-1 p-2 flex flex-col">
                      <div className="flex items-start justify-between gap-1">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-xs truncate">{item.name}</h4>
                          <p className="text-[10px] text-muted-foreground">
                            {new Intl.NumberFormat('en-ET', { style: 'currency', currency: 'ETB' }).format(originalPrice)} <span className="text-[9px]">(excl. VAT)</span>
                          </p>
                          <p className="text-[10px] text-primary">
                            + VAT: {new Intl.NumberFormat('en-ET', { style: 'currency', currency: 'ETB' }).format(taxAmount)}
                          </p>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => removeFromCart(item._id)} className="h-6 w-6 rounded-full text-destructive shrink-0">
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="mt-1 flex justify-between items-center">
                        <div className="flex items-center border rounded-md">
                          <Button variant="ghost" size="icon" onClick={() => updateQuantity(item._id, item.quantity - 1)} className="h-7 w-7 rounded-none rounded-l-md p-0">
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-7 text-center text-xs font-medium">{item.quantity}</span>
                          <Button variant="ghost" size="icon" onClick={() => updateQuantity(item._id, item.quantity + 1)} className="h-7 w-7 rounded-none rounded-r-md p-0">
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-medium">
                            {new Intl.NumberFormat('en-ET', { style: 'currency', currency: 'ETB' }).format(itemTotalOriginal)}
                          </span>
                          <p className="text-[9px] text-muted-foreground">
                            + VAT: {new Intl.NumberFormat('en-ET', { style: 'currency', currency: 'ETB' }).format(itemTotalTax)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>

          <div className="border-t p-3 space-y-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Subtotal (excl. VAT)</span>
                <span>{new Intl.NumberFormat('en-ET', { style: 'currency', currency: 'ETB' }).format(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">VAT (15%)</span>
                <span>{new Intl.NumberFormat('en-ET', { style: 'currency', currency: 'ETB' }).format(tax)}</span>
              </div>
              {discount > 0 && (
                <div className="flex items-center justify-between text-xs text-primary">
                  <span>Discount (10%)</span>
                  <span>-{new Intl.NumberFormat('en-ET', { style: 'currency', currency: 'ETB' }).format(discount)}</span>
                </div>
              )}
              <Separator />
              <div className="flex items-center justify-between font-semibold text-sm">
                <span>Total (incl. VAT)</span>
                <span>{new Intl.NumberFormat('en-ET', { style: 'currency', currency: 'ETB' }).format(total)}</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="guests" className="text-xs whitespace-nowrap">Guests:</Label>
                <Select value={numberOfGuests.toString()} onValueChange={(v) => setNumberOfGuests(parseInt(v))}>
                  <SelectTrigger id="guests" className="h-8 text-xs flex-1">
                    <SelectValue placeholder="Number" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 10 }, (_, i) => (
                      <SelectItem key={i} value={(i + 1).toString()}>
                        {i + 1} {i === 0 ? 'guest' : 'guests'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="special-requirements" className="text-xs">Special Notes</Label>
                <Textarea
                  id="special-requirements"
                  placeholder="Add notes..."
                  className="min-h-[60px] text-xs"
                  value={specialRequirements}
                  onChange={(e) => setSpecialRequirements(e.target.value)}
                />
              </div>

              <Button onClick={handlePlaceOrder} className="w-full rounded-lg h-10 text-sm" disabled={cart.length === 0}>
                <Receipt className="mr-2 h-4 w-4" />
                Place Order
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// List View Item Component with tax info
function ListViewItem({ item, addToCart, stockCost, categoryName }: { item: MenuItem; addToCart: (item: MenuItem) => void; stockCost?: number; categoryName?: string }) {
  const { originalPrice, taxAmount } = calculatePriceBreakdown(item.price);
  const isStaffFood = categoryName?.toLowerCase().includes('staff food') || categoryName?.toLowerCase().includes('staff meal');
  
  return (
    <div className="flex border border-border/40 rounded-lg overflow-hidden hover:border-primary/30 transition-all bg-background hover:bg-background/95 hover:shadow-sm group">
      <div className="relative h-12 w-12 sm:h-14 sm:w-14 flex-shrink-0 overflow-hidden">
        <Image src={item.imageUrl || "/placeholder.svg"} alt={item.name} fill sizes="56px" className="object-cover" />
        {item.tags?.includes('bestseller') && !isStaffFood && (
          <div className="absolute top-0.5 left-0.5 bg-primary/90 text-primary-foreground text-[6px] sm:text-[7px] font-medium px-1 py-0.5 rounded">Best</div>
        )}
      </div>
      <div className="flex-1 p-1.5 sm:p-2 flex flex-col">
        <div className="flex items-start justify-between gap-1">
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-[10px] sm:text-xs line-clamp-1">{item.name}</h3>
            <p className="text-[8px] sm:text-[9px] text-muted-foreground line-clamp-1">{item.description}</p>
            {isStaffFood && stockCost !== undefined && stockCost > 0 && (
              <div className="flex items-center gap-1 mt-0.5 text-[7px] sm:text-[8px] bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-400 font-medium px-1 py-0.5 rounded w-fit">
                <Package className="h-2 w-2 sm:h-2.5 sm:w-2.5 flex-shrink-0" />
                Stock Cost: {new Intl.NumberFormat('en-ET', { style: 'currency', currency: 'ETB' }).format(stockCost)}
              </div>
            )}
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[9px] sm:text-[10px] font-medium text-primary">
              {new Intl.NumberFormat('en-ET', { style: 'currency', currency: 'ETB' }).format(item.price)} <span className="text-[7px]">incl. VAT</span>
            </span>
            <span className="text-[7px] sm:text-[8px] text-muted-foreground">
              {new Intl.NumberFormat('en-ET', { style: 'currency', currency: 'ETB' }).format(originalPrice)} excl.
            </span>
            <div className="flex gap-0.5 sm:gap-1 mt-0.5">
              <Badge variant="outline" className="h-3 px-0.5 sm:px-1 text-[6px] sm:text-[7px] font-normal">{item.preparationTime}m</Badge>
              <Badge variant="outline" className="h-3 px-0.5 sm:px-1 text-[6px] sm:text-[7px] font-normal">{item.calories}cal</Badge>
            </div>
          </div>
        </div>
        <div className="mt-0.5 pt-0.5 flex justify-end">
          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); addToCart(item); }} className="h-5 w-5 sm:h-6 sm:w-6 rounded-full bg-primary/10 hover:bg-primary/20 text-primary p-0">
            <Plus className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// Book card component - cover image + name only, styled like a book
function BookCard({ item, addToCart }: { item: MenuItem; addToCart: (item: MenuItem) => void }) {
  const isOutOfStock = item.bookQuantity !== undefined && item.bookQuantity <= 0;
  const isLowStock = item.bookQuantity !== undefined && item.bookQuantity > 0 && item.bookQuantity <= 3;

  return (
    <Card className={`overflow-hidden h-full transition-all duration-300 bg-background rounded-lg border-amber-200 group min-w-0 ${isOutOfStock ? 'opacity-60 grayscale' : 'hover:shadow-lg hover:scale-[1.02] hover:border-amber-400'}`}>
      <div className="relative aspect-[3/4] overflow-hidden rounded-t-lg bg-gradient-to-br from-amber-900 via-amber-800 to-amber-950">
        <Image
          src={item.imageUrl || "/placeholder.svg"}
          alt={item.name}
          fill
          sizes="(max-width: 640px) 150px, (max-width: 1200px) 200px, 250px"
          className="object-cover transition-transform duration-500 group-hover:scale-110"
          loading="lazy"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = "/placeholder.svg";
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <div className="absolute top-2 right-2 bg-amber-600/90 text-white text-[10px] sm:text-xs font-semibold px-1.5 py-0.5 rounded-md backdrop-blur-sm flex flex-col items-end">
          <span>{new Intl.NumberFormat('en-ET', { style: 'currency', currency: 'ETB' }).format(item.price)}</span>
        </div>
        {isOutOfStock && (
          <div className="absolute top-2 left-2 bg-red-600/90 text-white text-[10px] sm:text-xs font-bold px-1.5 py-0.5 rounded-md backdrop-blur-sm">
            Out of Stock
          </div>
        )}
        {!isOutOfStock && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
            <Button
              variant="default"
              size="sm"
              onClick={(e) => { e.stopPropagation(); addToCart(item); }}
              className="rounded-full shadow-lg hover:shadow-amber-500/25 transition-all duration-300 transform hover:scale-105 bg-amber-600/90 backdrop-blur-sm text-xs sm:text-sm px-2 sm:px-3"
            >
              <Plus className="mr-1 h-3 w-3 sm:h-3.5 sm:w-3.5" />
              Add
            </Button>
          </div>
        )}
      </div>
      <CardContent className="p-2 sm:p-3 flex flex-col gap-1 h-full">
        <div className="space-y-0.5 flex-grow">
          <h3 className="font-semibold text-xs sm:text-sm line-clamp-2 group-hover:text-amber-700 transition-colors">{item.name}</h3>
          {item.bookQuantity !== undefined && (
            <p className={`text-[10px] sm:text-xs ${isOutOfStock ? 'text-red-600 font-semibold' : isLowStock ? 'text-amber-600 font-medium' : 'text-gray-500'}`}>
              {isOutOfStock ? 'Out of stock' : isLowStock ? `Only ${item.bookQuantity} left` : `${item.bookQuantity} in stock`}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Lazy loaded components
const MenuItemComponent = lazy(() => {
  return new Promise<{ default: React.ComponentType<any> }>((resolve) => {
    setTimeout(() => {
      resolve({
        default: ({ item, addToCart, stockCost, categoryName }: { item: MenuItem; addToCart: (item: MenuItem) => void; stockCost?: number; categoryName?: string }) => {
          const { originalPrice, taxAmount } = calculatePriceBreakdown(item.price);
          const isStaffFood = categoryName?.toLowerCase().includes('staff food') || categoryName?.toLowerCase().includes('staff meal');
          
          return (
            <Card className="overflow-hidden h-full transition-all duration-300 hover:shadow-md hover:scale-[1.01] bg-background hover:bg-background/95 rounded-lg border-border/40 hover:border-primary/300 group min-w-0">
              <div className="relative aspect-square sm:aspect-[4/3] overflow-hidden rounded-t-lg">
                <Image
                  src={item.imageUrl || "/placeholder.svg"}
                  alt={item.name}
                  fill
                  sizes="(max-width: 640px) 150px, (max-width: 1200px) 200px, 250px"
                  className="object-cover transition-transform duration-500 group-hover:scale-110"
                  loading="lazy"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = "/placeholder.svg";
                  }}
                />
                <div className="absolute top-2 right-2 bg-black/75 text-white text-[10px] sm:text-xs font-semibold px-1.5 py-0.5 rounded-md backdrop-blur-sm flex flex-col items-end">
                  <span>{new Intl.NumberFormat('en-ET', { style: 'currency', currency: 'ETB' }).format(item.price)}</span>
                  <span className="text-[6px] sm:text-[7px] opacity-80">incl. VAT</span>
                </div>
                {item.tags?.includes('bestseller') && !isStaffFood && (
                  <div className="absolute top-2 left-2 bg-primary/90 text-primary-foreground text-[8px] sm:text-[9px] font-medium px-1.5 py-0.5 rounded-md backdrop-blur-sm flex items-center gap-1">
                    <Sparkles className="h-2 w-2 sm:h-2.5 sm:w-2.5" />
                    Best
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); addToCart(item); }}
                    className="rounded-full shadow-lg hover:shadow-primary/25 transition-all duration-300 transform hover:scale-105 bg-primary/90 backdrop-blur-sm text-xs sm:text-sm px-2 sm:px-3"
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
                  {isStaffFood && stockCost !== undefined && stockCost > 0 && (
                    <div className="flex items-center gap-1 mt-1 text-[9px] sm:text-xs bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-400 font-medium px-1.5 py-0.5 rounded">
                      <Package className="h-2.5 w-2.5 sm:h-3 sm:w-3 flex-shrink-0" />
                      Stock Cost: {new Intl.NumberFormat('en-ET', { style: 'currency', currency: 'ETB' }).format(stockCost)}
                    </div>
                  )}
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
                    onClick={(e) => { e.stopPropagation(); addToCart(item); }}
                    className="h-5 w-5 sm:h-6 sm:w-6 rounded-full bg-primary/10 hover:bg-primary/20 text-primary p-0 relative overflow-hidden transition-transform hover:scale-110"
                  >
                    <Plus className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        },
      })
    }, 50)
  })
})

const MenuItemFallback = () => (
  <div className="overflow-hidden h-full rounded-lg border border-border/40 bg-background/60">
    <div className="relative aspect-square sm:aspect-[4/3] bg-muted/40 animate-pulse rounded-t-lg"></div>
    <div className="p-2 sm:p-3 space-y-1 sm:space-y-2">
      <div className="h-3 bg-muted/40 animate-pulse rounded-md w-3/4"></div>
      <div className="h-2 bg-muted/40 animate-pulse rounded-md w-full"></div>
      <div className="pt-1 flex items-center justify-between">
        <div className="h-3 bg-muted/40 animate-pulse rounded-md w-1/3"></div>
        <div className="h-5 w-5 bg-muted/40 animate-pulse rounded-full"></div>
      </div>
    </div>
  </div>
)

function UserNamePopover({ user }: { user: { name: string; role?: string; email?: string; restaurantName?: string } }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} className="relative shrink-0">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 rounded-full bg-primary/10 hover:bg-primary/20"
        onClick={() => setOpen(v => !v)}
      >
        <UserIcon className="h-4 w-4 text-primary" />
      </Button>
      {open && (
        <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 bg-popover border rounded-lg shadow-lg p-3 z-50 min-w-[180px]">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <UserIcon className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold truncate">{user.name}</p>
              {user.role && <p className="text-[10px] text-muted-foreground capitalize">{user.role}</p>}
            </div>
          </div>
          {user.email && (
            <p className="text-[10px] text-muted-foreground truncate border-t pt-1.5">{user.email}</p>
          )}
          {user.restaurantName && (
            <p className="text-[10px] text-muted-foreground truncate mt-0.5 flex items-center gap-1">
              <Building2 className="h-2.5 w-2.5 shrink-0" />{user.restaurantName}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// Main Component
export default function POSPage() {
  const router = useRouter()
  const [categories, setCategories] = useState<Category[]>([])
  const [items, setItems] = useState<MenuItem[]>([])
  const [waiters, setWaiters] = useState<Waiter[]>([])
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [bookCategoryId, setBookCategoryId] = useState<string | null>(null)
  const [cart, setCart] = useState<CartItem[]>([])
  const [selectedWaiter, setSelectedWaiter] = useState("")
  const [selectedRestaurant, setSelectedRestaurant] = useState<string>(getDefaultRestaurantId())
  const [selectedRestaurantName, setSelectedRestaurantName] = useState<string>(getDefaultRestaurantName())
  const [tableNumber, setTableNumber] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [orderNumber, setOrderNumber] = useState(`ORD-${Date.now()}`)
  const [numberOfGuests, setNumberOfGuests] = useState(1)
  const [specialRequirements, setSpecialRequirements] = useState("")
  const [applyDiscount, setApplyDiscount] = useState(false)
  const [insufficientStockItem, setInsufficientStockItem] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [orderProgress, setOrderProgress] = useState(0)
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [activeView, setActiveView] = useState<'grid' | 'list'>('grid')
  const [pendingTransfers, setPendingTransfers] = useState<Order[]>([])
  const [tableAssignments, setTableAssignments] = useState<Order[]>([])
  const [isProcessingTransfer, setIsProcessingTransfer] = useState(false)
  const [isProcessingAssignment, setIsProcessingAssignment] = useState(false)
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; role: string; email: string; restaurantId?: string; restaurantName?: string } | null>(null)
  const [showNotification, setShowNotification] = useState(false)
  const [notificationData, setNotificationData] = useState({ title: '', message: '' })
  const [altPickerOpen, setAltPickerOpen] = useState(false)
  const [altPickerItem, setAltPickerItem] = useState<MenuItem | null>(null)
  const [altPickerIngredients, setAltPickerIngredients] = useState<IngredientChoice[]>([])
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [allStocks, setAllStocks] = useState<Stock[]>([])
  
  // Get user role
  const userRole = currentUser?.role;
  const isAdmin = isAdminUser(userRole);
  const isPOS = isPOSUser(userRole);
  
  // Use refs to store data
  const lastRequestIdsRef = useRef<string[]>([]);
  const lastAssignmentIdsRef = useRef<string[]>([]);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const assignmentPollingRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef<boolean>(true);
  
  // Sound hook
  const { play: playNotificationSound, isEnabled: soundEnabled, setIsEnabled: setSoundEnabled } = useNotificationSound()
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Set mounted flag
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Add global styles
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      .hide-scrollbar::-webkit-scrollbar { display: none; }
      @keyframes progress {
        from { width: 100%; }
        to { width: 0%; }
      }
      .animate-progress { animation: progress linear forwards; }
    `;
    document.head.appendChild(style);
    return () => { document.head.removeChild(style); };
  }, []);

  // Fetch restaurants from database
  useEffect(() => {
    const fetchRestaurants = async () => {
      try {
        const response = await fetch('/api/restaurants');
        const data = await response.json();
        
        // Use extractData to safely get restaurants
        const restaurantsData = extractData<Restaurant>(data, []);
        
        if (restaurantsData.length > 0) {
          const activeRestaurants = restaurantsData
            .filter((r: any) => r.isActive !== false)
            .map((r: any) => ({
              _id: r._id,
              name: r.name,
              shortName: r.name.includes('1') ? 'Restaurant 1' : (r.name.includes('2') ? 'Restaurant 2' : r.name.substring(0, 15)),
              isActive: r.isActive
            }));
          
          setRestaurants(activeRestaurants);
          
          // Set default restaurant to Restaurant One
          const restaurantOne = activeRestaurants.find((r: Restaurant) => 
            r._id === "manyazewal1" || r.name.toLowerCase().includes('manyazewal 1') || r.name.includes('1')
          );
          
          if (restaurantOne) {
            setSelectedRestaurant(restaurantOne._id);
            setSelectedRestaurantName(restaurantOne.name);
          } else if (activeRestaurants.length > 0) {
            setSelectedRestaurant(activeRestaurants[0]._id);
            setSelectedRestaurantName(activeRestaurants[0].name);
          } else {
            setSelectedRestaurant(getDefaultRestaurantId());
            setSelectedRestaurantName(getDefaultRestaurantName());
          }
        } else {
          setRestaurants([
            { _id: "manyazewal1", name: "Manyazewal Eshetu Gibi 1", shortName: "Restaurant 1", isActive: true },
            { _id: "manyazewal2", name: "Manyazewal Eshetu Gibi 2", shortName: "Restaurant 2", isActive: true }
          ]);
          setSelectedRestaurant(getDefaultRestaurantId());
          setSelectedRestaurantName(getDefaultRestaurantName());
        }
      } catch (error) {
        console.error('Error fetching restaurants:', error);
        setRestaurants([
          { _id: "manyazewal1", name: "Manyazewal Eshetu Gibi 1", shortName: "Restaurant 1", isActive: true },
          { _id: "manyazewal2", name: "Manyazewal Eshetu Gibi 2", shortName: "Restaurant 2", isActive: true }
        ]);
        setSelectedRestaurant(getDefaultRestaurantId());
        setSelectedRestaurantName(getDefaultRestaurantName());
      }
    };
    
    fetchRestaurants();
  }, []);

  // ========== FIXED: Fetch current user info ==========
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const sessionRes = await fetch('/api/auth/session');
        const sessionData = await sessionRes.json();
        
        if (sessionData?.user) {
          const waitersRes = await fetch('/api/waitress');
          const waitersData = await waitersRes.json();
          
          // Use extractData to safely get waiters array
          const waitersList = extractData<Waiter>(waitersData, []);
          
          // Now safely find the matching waiter
          const matchingWaiter = waitersList.find(
            (w: any) => w.email === sessionData.user.email
          );
          
          if (matchingWaiter && matchingWaiter._id) {
            const waiterRestaurantId = matchingWaiter.restaurantId || getDefaultRestaurantId();
            const waiterRestaurantName = matchingWaiter.restaurantName || getRestaurantNameFromId(waiterRestaurantId);
            
            setCurrentUser({
              id: matchingWaiter._id,
              name: matchingWaiter.name,
              role: matchingWaiter.role || sessionData.user.role,
              email: matchingWaiter.email,
              restaurantId: waiterRestaurantId,
              restaurantName: waiterRestaurantName
            });
            
            // Auto-select restaurant from user's assigned restaurant
            if (waiterRestaurantId) {
              setSelectedRestaurant(waiterRestaurantId);
              setSelectedRestaurantName(waiterRestaurantName);
            }
            
            // For POS users, auto-select themselves as waiter
            if (isPOSUser(matchingWaiter.role || sessionData.user.role)) {
              setSelectedWaiter(matchingWaiter._id);
            }
          } else {
            setCurrentUser({
              id: sessionData.user.id,
              name: sessionData.user.name,
              role: sessionData.user.role,
              email: sessionData.user.email,
              restaurantId: getDefaultRestaurantId(),
              restaurantName: getDefaultRestaurantName()
            });
            setSelectedRestaurant(getDefaultRestaurantId());
            setSelectedRestaurantName(getDefaultRestaurantName());
          }
        }
      } catch (error) {
        console.error('Error fetching user:', error);
        setSelectedRestaurant(getDefaultRestaurantId());
        setSelectedRestaurantName(getDefaultRestaurantName());
      }
    };
    fetchCurrentUser();
  }, []);

  // Update selected restaurant name when restaurant changes
  useEffect(() => {
    const restaurant = restaurants.find(r => r._id === selectedRestaurant);
    if (restaurant) {
      setSelectedRestaurantName(restaurant.name);
    } else {
      setSelectedRestaurantName(getRestaurantNameFromId(selectedRestaurant));
    }
  }, [selectedRestaurant, restaurants]);

  // ========== FIXED: Fetch waiters ==========
  useEffect(() => {
    const fetchWaiters = async () => {
      try {
        const response = await fetch("/api/waitress");
        const data = await response.json();
        
        // Use extractData to safely get waiters array
        const waitersList = extractData<Waiter>(data, []);
        setWaiters(waitersList);
        
        // For non-POS users, select first waiter if none selected
        if (!isPOS && !selectedWaiter && waitersList.length > 0) {
          setSelectedWaiter(waitersList[0]._id);
        }
      } catch (error) {
        console.error("Error fetching waiters:", error);
      }
    };
    
    fetchWaiters();
  }, [isPOS, selectedWaiter]);

  // Fetch items, categories, books, purchases, and stocks
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [itemsRes, categoriesRes, booksRes, purchasesRes, stocksRes] = await Promise.all([
          fetch("/api/items"),
          fetch("/api/item-category"),
          fetch("/api/books"),
          fetch("/api/stock-purchase"),
          fetch("/api/stock"),
        ]);

        const itemsData = await itemsRes.json();
        const categoriesData = await categoriesRes.json();
        const booksData = await booksRes.json();
        const purchasesData = await purchasesRes.json();
        const stocksData = await stocksRes.json();

        // Extract purchases
        const purchasesList: Purchase[] = purchasesData.success && purchasesData.data
          ? purchasesData.data
          : purchasesData.data && Array.isArray(purchasesData.data)
            ? purchasesData.data
            : purchasesData.purchases && Array.isArray(purchasesData.purchases)
              ? purchasesData.purchases
              : Array.isArray(purchasesData) ? purchasesData : []
        setPurchases(purchasesList);

        // Extract stocks
        const stocksList: Stock[] = stocksData.success && stocksData.data
          ? stocksData.data
          : stocksData.data && Array.isArray(stocksData.data)
            ? stocksData.data
            : Array.isArray(stocksData) ? stocksData : []
        setAllStocks(stocksList);

        let cats = categoriesData.data || [];

        // Find or create the "Books" category
        let booksCat = cats.find((c: Category) => c.name === "Books" || c.type === "BOOK");
        if (!booksCat) {
          try {
            const createRes = await fetch("/api/item-category", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                name: "Books",
                description: "Books for sale",
                type: "BOOK",
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date(),
              }),
            });
            const createData = await createRes.json();
            if (createData.data) {
              booksCat = createData.data;
              cats = [...cats, booksCat];
            }
          } catch (e) {
            console.error("Failed to create Books category:", e);
          }
        }

        if (booksCat) {
          setBookCategoryId(booksCat._id);
        }

        // Deduplicate categories by name (keep first occurrence)
        const seen = new Set<string>();
        const uniqueCats = cats.filter((c: Category) => {
          const key = c.name.toLowerCase();
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        setCategories(uniqueCats);

        // Merge books into items list as menu items
        const books = booksData.books || booksData.data || [];
        const booksAsItems: MenuItem[] = books.map((book: any) => ({
          _id: book._id,
          name: book.title,
          description: book.category || "",
          price: book.price,
          imageUrl: book.cloudinaryData?.url || book.imageUrl || "/placeholder.svg",
          categoryId: booksCat?._id || "",
          preparationTime: 0,
          calories: 0,
          tags: ["book"],
          bookQuantity: book.quantity,
          stock: undefined,
          requiredStock: undefined,
        }));

        setItems([...(itemsData.items || []), ...booksAsItems]);
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load menu data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Fetch table assignments (only for POS users)
  const fetchTableAssignments = useCallback(async () => {
    if (!isPOS || !currentUser?.id) return;
    
    try {
      const response = await fetch(`/api/order/table-assignments?waiterId=${currentUser.id}`);
      const data = await response.json();
      
      if (data.success && isMountedRef.current) {
        const newAssignments = (data.assignments || []) as Order[];
        const newAssignmentIds = newAssignments.map(a => a.id);
        
        const trulyNewAssignments = newAssignments.filter(a => !lastAssignmentIdsRef.current.includes(a.id));
        
        if (trulyNewAssignments.length > 0) {
          trulyNewAssignments.forEach(newAssignment => {
            playNotificationSound();
            if (isMountedRef.current) {
              setNotificationData({
                title: `New Table Assignment - Order #${newAssignment.orderNumber}`,
                message: `Table ${newAssignment.tableNumber} | ${newAssignment.numberOfGuests} guests`
              });
              setShowNotification(true);
              setTimeout(() => setShowNotification(false), 4000);
            }
          });
        }
        
        lastAssignmentIdsRef.current = newAssignmentIds;
        
        if (isMountedRef.current) {
          setTableAssignments(newAssignments);
        }
      }
    } catch (error) {
      console.error('Error fetching table assignments:', error);
    }
  }, [isPOS, currentUser?.id, playNotificationSound]);

  // Fetch transfer requests (only for POS users)
  const fetchTransfers = useCallback(async () => {
    if (!isPOS || !currentUser?.id) return;
    
    try {
      const response = await fetch(`/api/order/pending-requests?waiterId=${currentUser.id}`);
      const data = await response.json();
      
      if (data.success && isMountedRef.current) {
        const newRequests = (data.requests || []) as Order[];
        const newRequestIds = newRequests.map(r => r.id);
        
        const trulyNewRequests = newRequests.filter(r => !lastRequestIdsRef.current.includes(r.id));
        
        if (trulyNewRequests.length > 0) {
          trulyNewRequests.forEach(newRequest => {
            playNotificationSound();
            if (isMountedRef.current) {
              setNotificationData({
                title: `New Transfer Request - Order #${newRequest.orderNumber}`,
                message: `From: ${newRequest.editRequest?.requestedByName || 'Unknown'} | Table: ${newRequest.tableNumber}`
              });
              setShowNotification(true);
              setTimeout(() => setShowNotification(false), 4000);
            }
          });
        }
        
        lastRequestIdsRef.current = newRequestIds;
        
        if (isMountedRef.current) {
          setPendingTransfers(newRequests);
        }
      }
    } catch (error) {
      console.error('Error fetching pending transfers:', error);
    }
  }, [isPOS, currentUser?.id, playNotificationSound]);

  // Start polling for transfers and assignments (only for POS users)
  useEffect(() => {
    if (isPOS && currentUser?.id) {
      fetchTransfers();
      fetchTableAssignments();
      
      pollingIntervalRef.current = setInterval(() => {
        if (isMountedRef.current) fetchTransfers();
      }, 15000);
      
      assignmentPollingRef.current = setInterval(() => {
        if (isMountedRef.current) fetchTableAssignments();
      }, 15000);
    }
    
    return () => {
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
      if (assignmentPollingRef.current) clearInterval(assignmentPollingRef.current);
    };
  }, [isPOS, currentUser?.id, fetchTransfers, fetchTableAssignments]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
  }

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesCategory = selectedCategory === "all" || item.categoryId === selectedCategory
      const matchesSearch = item.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
      return matchesCategory && matchesSearch
    })
  }, [items, selectedCategory, debouncedSearchQuery])

  // Build a map: categoryId -> category name
  const categoryNameMap = useMemo(() => {
    const map: Record<string, string> = {}
    for (const cat of categories) {
      map[cat._id] = cat.name
    }
    return map
  }, [categories])

  // Calculate stock cost for each item using requiredStock + latest purchase prices
  const stockCostMap = useMemo(() => {
    const map: Record<string, number> = {}
    for (const item of items) {
      if (!item.requiredStock || item.requiredStock.length === 0) {
        map[item._id] = 0
        continue
      }
      let totalCost = 0
      for (const req of item.requiredStock) {
        const latestPrice = getLatestPrice(req.stockId, purchases)
        totalCost += req.quantity * latestPrice
      }
      map[item._id] = totalCost
    }
    return map
  }, [items, purchases])

  const addToCart = useCallback((item: MenuItem, stocks: Stock[]) => {
    if (item.stock !== undefined && item.stock <= 0) {
      toast.error(`Sorry, ${item.name} is out of stock!`);
      setInsufficientStockItem(item.name);
      return;
    }

    // Check book quantity
    if (item.tags?.includes("book") && item.bookQuantity !== undefined && item.bookQuantity <= 0) {
      toast.error(`Sorry, "${item.name}" is out of stock!`);
      return;
    }

    // Check if any ingredient has alternatives
    const ingredientsWithAlts = (item.requiredStock || []).filter(
      (ing) => ing.alternatives && ing.alternatives.length > 0
    );

    if (ingredientsWithAlts.length > 0) {
      // Build IngredientChoice list for the dialog using enriched stockName from API
      const choices: IngredientChoice[] = ingredientsWithAlts.map((ing) => ({
        defaultStockId: ing.stockId,
        defaultStockName: ing.stockName || stocks.find((s: Stock) => s._id === ing.stockId)?.name || ing.stockId,
        defaultQuantity: ing.quantity,
        defaultUnit: ing.stockUnit || stocks.find((s: Stock) => s._id === ing.stockId)?.unit || '',
        options: (ing.alternatives || []).map((alt) => ({
          stockId: alt.stockId,
          stockName: alt.stockName || alt.label || stocks.find((s: Stock) => s._id === alt.stockId)?.name || alt.stockId,
          quantity: alt.quantity,
          unit: alt.stockUnit || stocks.find((s: Stock) => s._id === alt.stockId)?.unit || '',
        })),
      }))
      setAltPickerIngredients(choices)
      setAltPickerItem(item)
      setAltPickerOpen(true)
      return
    }

    // No alternatives — add directly
    const { originalPrice, taxAmount } = calculatePriceBreakdown(item.price);
    setCart((prev) => {
      const existing = prev.find((i) => i._id === item._id)
      if (existing) {
        return prev.map((i) => (i._id === item._id ? { ...i, quantity: i.quantity + 1 } : i))
      }
      return [...prev, { ...item, quantity: 1, originalPrice, taxAmount, ingredientChoices: [] }]
    })
    toast.success(`Added ${item.name} to cart`);
  }, [setCart, setInsufficientStockItem, setAltPickerIngredients, setAltPickerItem, setAltPickerOpen])

  const handleAltPickerConfirm = useCallback((selections: IngredientSelections[]) => {
    if (!altPickerItem) return
    const { originalPrice, taxAmount } = calculatePriceBreakdown(altPickerItem.price)
    // Flatten all chosen options across all ingredients into ingredientChoices
    const ingredientChoices = selections.flatMap((sel) =>
      sel.chosen.map((c) => ({
        defaultStockId: sel.defaultStockId,
        chosenStockId: c.stockId,
        chosenQuantity: c.quantity,
      }))
    )
    setCart((prev) => {
      const existing = prev.find((i) => i._id === altPickerItem._id)
      if (existing) {
        return prev.map((i) =>
          i._id === altPickerItem._id
            ? { ...i, quantity: i.quantity + 1, ingredientChoices }
            : i
        )
      }
      return [...prev, { ...altPickerItem, quantity: 1, originalPrice, taxAmount, ingredientChoices }]
    })
    toast.success(`Added ${altPickerItem.name} to cart`)
    setAltPickerItem(null)
    setAltPickerIngredients([])
  }, [altPickerItem])

  const removeFromCart = useCallback((itemId: string) => {
    setCart((prev) => prev.filter((item) => item._id !== itemId))
    toast.success("Item removed from cart")
  }, [])

  const updateQuantity = useCallback((itemId: string, newQuantity: number) => {
    if (newQuantity < 1) {
      removeFromCart(itemId)
      return
    }
    setCart((prev) => prev.map((item) => (item._id === itemId ? { ...item, quantity: newQuantity } : item)))
  }, [removeFromCart])

  // Calculate totals
  const subtotal = cart.reduce((sum, item) => {
    const originalPrice = item.originalPrice || (item.price / 1.15)
    return sum + originalPrice * item.quantity
  }, 0)
  
  const tax = cart.reduce((sum, item) => {
    const taxAmount = item.taxAmount || (item.price - (item.price / 1.15))
    return sum + taxAmount * item.quantity
  }, 0)
  
  const totalWithTax = subtotal + tax
  const discount = applyDiscount ? totalWithTax * 0.1 : 0
  const finalTotal = totalWithTax - discount

  // Handle accept transfer (for POS users)
  const handleAcceptTransfer = useCallback(async (orderId: string) => {
    if (!isPOS) return;
    setIsProcessingTransfer(true);
    try {
      const response = await fetch('/api/order/handle-transfer', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, action: 'accept', waiterId: currentUser?.id }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Transfer accepted! Order assigned to you.');
        if (soundEnabled) playNotificationSound();
        await fetchTransfers();
        window.location.reload();
      } else {
        throw new Error(data.error || 'Failed to accept transfer');
      }
    } catch (error) {
      console.error('Error accepting transfer:', error);
      toast.error('Failed to accept transfer');
    } finally {
      setIsProcessingTransfer(false);
    }
  }, [isPOS, currentUser?.id, soundEnabled, playNotificationSound, fetchTransfers]);

  // Handle cancel transfer (for POS users)
  const handleCancelTransfer = useCallback(async (orderId: string) => {
    if (!isPOS) return;
    setIsProcessingTransfer(true);
    try {
      const response = await fetch('/api/order/handle-transfer', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, action: 'cancel', waiterId: currentUser?.id }),
      });

      const data = await response.json();
      if (data.success) {
        toast('Transfer request cancelled.', { icon: 'ℹ️' });
        await fetchTransfers();
      } else {
        throw new Error(data.error || 'Failed to cancel transfer');
      }
    } catch (error) {
      console.error('Error cancelling transfer:', error);
      toast.error('Failed to cancel transfer');
    } finally {
      setIsProcessingTransfer(false);
    }
  }, [isPOS, currentUser?.id, fetchTransfers]);

  // Handle accept table assignment (for POS users)
  const handleAcceptAssignment = useCallback(async (orderId: string) => {
    if (!isPOS) return;
    setIsProcessingAssignment(true);
    try {
      const response = await fetch('/api/order/accept-assignment', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, action: 'accept', waiterId: currentUser?.id }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Assignment accepted! Order added to your queue.');
        if (soundEnabled) playNotificationSound();
        await fetchTableAssignments();
        window.location.reload();
      } else {
        throw new Error(data.error || 'Failed to accept assignment');
      }
    } catch (error) {
      console.error('Error accepting assignment:', error);
      toast.error('Failed to accept assignment');
    } finally {
      setIsProcessingAssignment(false);
    }
  }, [isPOS, currentUser?.id, soundEnabled, playNotificationSound, fetchTableAssignments]);

  // Handle reject table assignment (for POS users)
  const handleRejectAssignment = useCallback(async (orderId: string, reason?: string) => {
    if (!isPOS) return;
    setIsProcessingAssignment(true);
    try {
      const response = await fetch('/api/order/accept-assignment', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, action: 'reject', waiterId: currentUser?.id, reason }),
      });

      const data = await response.json();
      if (data.success) {
        toast('Assignment declined. The order will be reassigned.', { icon: 'ℹ️' });
        if (soundEnabled) playNotificationSound();
        await fetchTableAssignments();
      } else {
        throw new Error(data.error || 'Failed to decline assignment');
      }
    } catch (error) {
      console.error('Error rejecting assignment:', error);
      toast.error('Failed to decline assignment');
    } finally {
      setIsProcessingAssignment(false);
    }
  }, [isPOS, currentUser?.id, soundEnabled, playNotificationSound, fetchTableAssignments]);

  const handleNewRequest = useCallback((request: Order) => {
    if (soundEnabled) {
      playNotificationSound();
      setNotificationData({
        title: `New Transfer Request - Order #${request.orderNumber}`,
        message: `From: ${request.editRequest?.requestedByName || 'Unknown'} | Table: ${request.tableNumber}`
      });
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 4000);
    }
  }, [soundEnabled, playNotificationSound]);

  // handlePlaceOrder with proper restaurant information
  const handlePlaceOrder = async () => {
    // Determine which waiter ID to use based on user type
    let finalWaiterId = selectedWaiter;
    
    // For POS users, ALWAYS use their own ID
    if (isPOS && currentUser?.id) {
      finalWaiterId = currentUser.id;
      if (selectedWaiter !== currentUser.id) {
        setSelectedWaiter(currentUser.id);
      }
    }
    
    // Determine final restaurant - use selectedRestaurant from state
    let finalRestaurantId = selectedRestaurant;
    let finalRestaurantName = selectedRestaurantName;
    
    // If no restaurant selected, use default
    if (!finalRestaurantId || finalRestaurantId === "") {
      finalRestaurantId = getDefaultRestaurantId();
      finalRestaurantName = getDefaultRestaurantName();
    }
    
    // Try to get restaurant from waiter if available (for non-POS users)
    if (!isPOS && finalWaiterId && finalWaiterId !== "") {
      const selectedWaiterInfo = waiters.find(w => w._id === finalWaiterId);
      if (selectedWaiterInfo?.restaurantId) {
        finalRestaurantId = selectedWaiterInfo.restaurantId;
        finalRestaurantName = selectedWaiterInfo.restaurantName || getRestaurantNameFromId(finalRestaurantId);
      }
    }
    
    // Validate based on user type
    if (isPOS) {
      if (!finalWaiterId || !tableNumber || cart.length === 0) {
        toast.error("Please fill in all required fields (Table number required)")
        return
      }
    } else {
      if (!finalWaiterId || !tableNumber || cart.length === 0) {
        toast.error("Please select a waiter, table number, and add items")
        return
      }
    }

    // Prepare items with proper tax breakdown
    const itemsWithTax = cart.map(item => {
      const { originalPrice, taxAmount } = calculatePriceBreakdown(item.price)
      return {
        itemId: item._id,
        quantity: item.quantity,
        specialInstructions: item.specialInstructions || "",
        priceWithTax: item.price,
        priceWithoutTax: originalPrice,
        taxAmount: taxAmount,
        subtotal: originalPrice * item.quantity,
        taxTotal: taxAmount * item.quantity,
        total: item.price * item.quantity,
        ingredientChoices: item.ingredientChoices || [],
      }
    })

    const selectedWaiterInfo = waiters.find(w => w._id === finalWaiterId);
    
    const orderData = {
      orderNumber,
      tableNumber,
      waiterId: finalWaiterId || '',
      waiterName: isPOS 
        ? (currentUser?.name || selectedWaiterInfo?.name || "")
        : (selectedWaiterInfo?.name || ""),
      customerId: "walk-in",
      numberOfGuests,
      items: itemsWithTax,
      status: "PENDING",
      discount: discount,
      subtotal: subtotal,
      tax: tax,
      totalAmount: totalWithTax,
      finalAmount: finalTotal,
      paymentMethod: "CARD",
      specialRequirements,
      isActive: true,
      restaurantId: finalRestaurantId,
      restaurantName: finalRestaurantName,
      inTable: false,  // POS orders are typically in-table orders
      delivery: false,
      createdBy: currentUser?.id,
      createdByName: currentUser?.name,
      createdByRole: currentUser?.role
    }

    console.log("Placing order with restaurant:", { 
      restaurantId: finalRestaurantId, 
      restaurantName: finalRestaurantName,
      waiterId: finalWaiterId,
      isPOS: isPOS
    });

    const orderToast = toast.loading("Placing your order...")

    try {
      const response = await fetch("/api/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderData),
      })

      const responseData = await response.json()

      if (response.ok) {
        toast.success("Order placed successfully!", { id: orderToast })

        // Book quantity is now decremented when the order status changes to COMPLETED
        // (handled in processOrderStockUsage in stockHelpers.ts)

        setCart([])
        setOrderNumber(`ORD-${Date.now()}`)
        setIsCartOpen(false)
        router.refresh()

        let progress = 0
        const interval = setInterval(() => {
          progress += 10
          setOrderProgress(progress)
          if (progress >= 100) {
            clearInterval(interval)
            toast.success("Your order is ready!")
          }
        }, 1000)
      } else {
        throw new Error(responseData.message || "Failed to place order");
      }
    } catch (error) {
      console.error("Error placing order:", error)
      toast.error("Failed to place order", { id: orderToast })
    }
  }

  if (isLoading && !items.length) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-primary/5 via-background to-background/80">
        <motion.div className="text-center space-y-3 sm:space-y-4 w-full max-w-xs px-4" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
          <div className="relative w-16 h-16 sm:w-20 sm:h-20 mx-auto">
            <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping"></div>
            <div className="relative flex items-center justify-center w-full h-full bg-background rounded-full border-2 border-primary/40">
              <ChefHat className="h-8 w-8 sm:h-10 sm:w-10 text-primary" />
            </div>
          </div>
          <h2 className="text-lg sm:text-xl font-semibold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">Loading Menu...</h2>
          <Progress value={33} className="w-full mx-auto h-1.5 sm:h-2" />
          <p className="text-xs sm:text-sm text-muted-foreground">Preparing your experience</p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-background/95 overflow-hidden">
      {/* Notification Toast */}
      {showNotification && (
        <motion.div
          initial={{ opacity: 0, y: -50, x: '-50%' }}
          animate={{ opacity: 1, y: 0, x: '-50%' }}
          exit={{ opacity: 0, y: -50, x: '-50%' }}
          className="fixed top-4 left-1/2 z-50 w-[90%] max-w-md"
        >
          <div className={`rounded-lg shadow-lg overflow-hidden ${
            notificationData.title.includes('Table Assignment') 
              ? 'bg-green-50 border-l-4 border-green-500' 
              : 'bg-yellow-50 border-l-4 border-yellow-500'
          }`}>
            <div className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  {notificationData.title.includes('Table Assignment') ? (
                    <Home className="h-5 w-5 text-green-600 animate-pulse" />
                  ) : (
                    <BellRing className="h-5 w-5 text-yellow-600 animate-pulse" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${
                    notificationData.title.includes('Table Assignment') 
                      ? 'text-green-800' 
                      : 'text-yellow-800'
                  }`}>{notificationData.title}</p>
                  <p className={`text-xs mt-1 ${
                    notificationData.title.includes('Table Assignment') 
                      ? 'text-green-700' 
                      : 'text-yellow-700'
                  }`}>{notificationData.message}</p>
                </div>
                <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0" onClick={() => setShowNotification(false)}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <div className={`h-1 animate-progress ${
              notificationData.title.includes('Table Assignment') 
                ? 'bg-green-500' 
                : 'bg-yellow-500'
            }`} style={{ animationDuration: '4000ms' }} />
          </div>
        </motion.div>
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
        {/* Header - 2 rows on mobile, 1 row on desktop */}
        <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-10">
          {/* Desktop: single row */}
          <div className="hidden lg:flex items-center gap-1.5 px-2 py-1.5">
            <Select value={selectedRestaurant || getDefaultRestaurantId()} onValueChange={(value) => {
              setSelectedRestaurant(value);
              const restaurant = restaurants.find(r => r._id === value);
              if (restaurant) setSelectedRestaurantName(restaurant.name);
            }}>
              <SelectTrigger className="w-[110px] bg-background/70 text-xs h-8 shrink-0">
                <Building2 className="h-3 w-3 mr-1 text-indigo-600 shrink-0" />
                <SelectValue placeholder="Rest." />
              </SelectTrigger>
              <SelectContent>
                {restaurants.map((restaurant) => (
                  <SelectItem key={restaurant._id} value={restaurant._id}>
                    <span className="text-xs">{restaurant.shortName}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={tableNumber} onValueChange={setTableNumber}>
              <SelectTrigger className="w-[80px] bg-background/70 text-xs h-8 shrink-0">
                <SelectValue placeholder="Table" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 40 }, (_, i) => (
                  <SelectItem key={i} value={`T${i + 1}`}>T{i + 1}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {currentUser && <UserNamePopover user={currentUser} />}

            {!isPOS && (
              <Select value={selectedWaiter} onValueChange={setSelectedWaiter}>
                <SelectTrigger className="w-[110px] bg-background/70 text-xs h-8 shrink-0">
                  <SelectValue placeholder="Server" />
                </SelectTrigger>
                <SelectContent>
                  {waiters.map((waiter) => (
                    <SelectItem key={waiter._id} value={waiter._id}>
                      <div className="flex items-center gap-1.5">
                        <Avatar className="h-4 w-4"><AvatarFallback className="text-[9px]">{getInitials(waiter.name)}</AvatarFallback></Avatar>
                        <span className="truncate text-xs">{waiter.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <div className="w-px h-5 bg-border mx-0.5" />

            <div className="relative shrink-0">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input placeholder="Search..." value={searchQuery} onChange={handleSearchChange} className="pl-7 h-8 text-xs w-[150px] bg-background" />
            </div>

            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[120px] h-8 text-xs bg-background/70 shrink-0">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all"><span className="flex items-center gap-1.5 text-xs"><Utensils className="h-3.5 w-3.5" />All</span></SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category._id} value={category._id}>
                    <span className="flex items-center gap-1.5 text-xs">{getCategoryIcon(category.type)}{category.name}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center shrink-0">
              <Button variant={activeView === 'grid' ? 'default' : 'outline'} size="icon" className="h-7 w-7 rounded-l-md rounded-r-none" onClick={() => setActiveView('grid')}>
                <div className="grid grid-cols-2 gap-0.5"><div className="w-0.5 h-0.5 rounded-sm bg-current" /><div className="w-0.5 h-0.5 rounded-sm bg-current" /><div className="w-0.5 h-0.5 rounded-sm bg-current" /><div className="w-0.5 h-0.5 rounded-sm bg-current" /></div>
              </Button>
              <Button variant={activeView === 'list' ? 'default' : 'outline'} size="icon" className="h-7 w-7 rounded-l-none rounded-r-md" onClick={() => setActiveView('list')}>
                <div className="flex flex-col items-center gap-0.5"><div className="w-2 h-0.5 rounded-sm bg-current" /><div className="w-2 h-0.5 rounded-sm bg-current" /><div className="w-2 h-0.5 rounded-sm bg-current" /></div>
              </Button>
            </div>

            <Button variant="default" size="icon" className="relative shrink-0 h-8 w-8 ml-auto" onClick={() => setIsCartOpen(true)}>
              <ShoppingCart className="h-4 w-4" />
              {cart.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[9px] rounded-full h-4 w-4 flex items-center justify-center font-bold">{cart.length}</span>
              )}
            </Button>
          </div>

          {/* Mobile: 2 rows */}
          <div className="lg:hidden">
            <div className="overflow-x-auto hide-scrollbar border-b border-border/40">
              <div className="flex items-center gap-1.5 px-2 py-1.5 min-w-max">
                <Select value={selectedRestaurant || getDefaultRestaurantId()} onValueChange={(value) => {
                  setSelectedRestaurant(value);
                  const restaurant = restaurants.find(r => r._id === value);
                  if (restaurant) setSelectedRestaurantName(restaurant.name);
                }}>
                  <SelectTrigger className="w-[110px] bg-background/70 text-xs h-8 shrink-0">
                    <Building2 className="h-3 w-3 mr-1 text-indigo-600 shrink-0" />
                    <SelectValue placeholder="Rest." />
                  </SelectTrigger>
                  <SelectContent>
                    {restaurants.map((restaurant) => (
                      <SelectItem key={restaurant._id} value={restaurant._id}>
                        <span className="text-xs">{restaurant.shortName}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={tableNumber} onValueChange={setTableNumber}>
                  <SelectTrigger className="w-[80px] bg-background/70 text-xs h-8 shrink-0">
                    <SelectValue placeholder="Table" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 40 }, (_, i) => (
                      <SelectItem key={i} value={`T${i + 1}`}>T{i + 1}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {currentUser && <UserNamePopover user={currentUser} />}

                {!isPOS && (
                  <Select value={selectedWaiter} onValueChange={setSelectedWaiter}>
                    <SelectTrigger className="w-[110px] bg-background/70 text-xs h-8 shrink-0">
                      <SelectValue placeholder="Server" />
                    </SelectTrigger>
                    <SelectContent>
                      {waiters.map((waiter) => (
                        <SelectItem key={waiter._id} value={waiter._id}>
                          <div className="flex items-center gap-1.5">
                            <Avatar className="h-4 w-4"><AvatarFallback className="text-[9px]">{getInitials(waiter.name)}</AvatarFallback></Avatar>
                            <span className="truncate text-xs">{waiter.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                <Button variant="default" size="icon" className="relative shrink-0 h-8 w-8 ml-auto" onClick={() => setIsCartOpen(true)}>
                  <ShoppingCart className="h-4 w-4" />
                  {cart.length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[9px] rounded-full h-4 w-4 flex items-center justify-center font-bold">{cart.length}</span>
                  )}
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto hide-scrollbar">
              <div className="flex items-center gap-1.5 px-2 py-1.5 min-w-max">
                <div className="relative shrink-0">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input placeholder="Search..." value={searchQuery} onChange={handleSearchChange} className="pl-7 h-8 text-xs w-[150px] bg-background" />
                </div>

                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-[120px] h-8 text-xs bg-background/70 shrink-0">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all"><span className="flex items-center gap-1.5 text-xs"><Utensils className="h-3.5 w-3.5" />All</span></SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category._id} value={category._id}>
                        <span className="flex items-center gap-1.5 text-xs">{getCategoryIcon(category.type)}{category.name}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="flex items-center shrink-0">
                  <Button variant={activeView === 'grid' ? 'default' : 'outline'} size="icon" className="h-7 w-7 rounded-l-md rounded-r-none" onClick={() => setActiveView('grid')}>
                    <div className="grid grid-cols-2 gap-0.5"><div className="w-0.5 h-0.5 rounded-sm bg-current" /><div className="w-0.5 h-0.5 rounded-sm bg-current" /><div className="w-0.5 h-0.5 rounded-sm bg-current" /><div className="w-0.5 h-0.5 rounded-sm bg-current" /></div>
                  </Button>
                  <Button variant={activeView === 'list' ? 'default' : 'outline'} size="icon" className="h-7 w-7 rounded-l-none rounded-r-md" onClick={() => setActiveView('list')}>
                    <div className="flex flex-col items-center gap-0.5"><div className="w-2 h-0.5 rounded-sm bg-current" /><div className="w-2 h-0.5 rounded-sm bg-current" /><div className="w-2 h-0.5 rounded-sm bg-current" /></div>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Table Assignments Section - Only for POS users */}
        {isPOS && tableAssignments.length > 0 && (
          <div className="border-b bg-green-50/30 p-2 sm:p-3 max-h-[40vh] overflow-y-auto">
            <div className="max-w-6xl mx-auto">
              <div className="flex items-center justify-between mb-2 sm:mb-3 sticky top-0 bg-green-50/30 py-1">
                <div className="flex items-center gap-1 sm:gap-2">
                  <Home className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                  <h2 className="font-semibold text-sm sm:text-base">New Table Assignments</h2>
                  <Badge className="bg-green-100 text-green-800 text-[10px] sm:text-xs">{tableAssignments.length}</Badge>
                </div>
                <Button variant="ghost" size="sm" onClick={fetchTableAssignments} disabled={isProcessingAssignment} className="h-6 sm:h-7 text-[10px] sm:text-xs">
                  <RefreshCw className={`h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1 ${isProcessingAssignment ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
              
              <div className="space-y-3 sm:space-y-4">
                {tableAssignments.map((order) => (
                  <TableAssignmentCard
                    key={order.id}
                    order={order}
                    onAccept={handleAcceptAssignment}
                    onReject={handleRejectAssignment}
                    isLoading={isProcessingAssignment}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Pending Transfer Requests Section - Only for POS users */}
        {isPOS && pendingTransfers.length > 0 && (
          <div className="border-b bg-yellow-50/30 p-2 sm:p-3 max-h-[40vh] overflow-y-auto">
            <div className="max-w-6xl mx-auto">
              <div className="flex items-center justify-between mb-2 sm:mb-3 sticky top-0 bg-yellow-50/30 py-1">
                <div className="flex items-center gap-1 sm:gap-2">
                  <ArrowRightLeft className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-600" />
                  <h2 className="font-semibold text-sm sm:text-base">Transfer Requests</h2>
                  <Badge className="bg-yellow-100 text-yellow-800 text-[10px] sm:text-xs">{pendingTransfers.length}</Badge>
                </div>
                <Button variant="ghost" size="sm" onClick={fetchTransfers} disabled={isProcessingTransfer} className="h-6 sm:h-7 text-[10px] sm:text-xs">
                  <RefreshCw className={`h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1 ${isProcessingTransfer ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
              
              <PendingTransferRequests
                requests={pendingTransfers}
                onAccept={handleAcceptTransfer}
                onCancel={handleCancelTransfer}
                isLoading={isProcessingTransfer}
                onNewRequest={handleNewRequest}
              />
            </div>
          </div>
        )}

        {/* Menu Items */}
        <div className="flex-1 p-2 overflow-auto">
          <div className="max-w-full">
            {filteredItems.length > 0 ? (
              <div className={
                activeView === 'grid'
                  ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 pb-24"
                  : "flex flex-col gap-2 pb-24"
              }>
                <AnimatePresence mode="popLayout">
                  {filteredItems.map((item, index) => {
                    const isBook = item.tags?.includes("book");
                    const addCartFn = (item: MenuItem) => addToCart(item, items.flatMap(i => i.requiredStock || []).map(rs => ({ _id: rs.stockId, name: rs.stockName || 'Unknown' })) as Stock[]);
                    return (
                      <motion.div
                        key={item._id + '-' + activeView}
                        layout
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        variants={fadeInUp}
                        transition={{ duration: 0.25, delay: index * 0.02 }}
                      >
                        {activeView === 'grid' ? (
                          isBook ? (
                            <BookCard item={item} addToCart={addCartFn} />
                          ) : (
                            <Suspense fallback={<MenuItemFallback />}>
                              <MenuItemComponent
                                item={item}
                                addToCart={addCartFn}
                                stockCost={stockCostMap[item._id] || 0}
                                categoryName={categoryNameMap[item.categoryId] || 'Uncategorized'}
                              />
                            </Suspense>
                          )
                        ) : (
                          <ListViewItem
                            item={item}
                            addToCart={addCartFn}
                            stockCost={stockCostMap[item._id] || 0}
                            categoryName={categoryNameMap[item.categoryId] || 'Uncategorized'}
                          />
                        )}
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            ) : (
              <motion.div className="flex flex-col items-center justify-center h-[50vh] text-center p-4">
                <Search className="h-8 w-8 sm:h-12 sm:w-12 mx-auto text-muted-foreground mb-2 sm:mb-4" />
                <h3 className="text-sm sm:text-base font-medium mb-1">No items found</h3>
                <p className="text-[10px] sm:text-xs text-muted-foreground max-w-md">Try adjusting your search or category.</p>
                {searchQuery && (
                  <Button variant="outline" className="mt-2 sm:mt-3 text-xs" onClick={() => setSearchQuery('')}>Clear Search</Button>
                )}
              </motion.div>
            )}
          </div>
        </div>
      </main>

      {/* Alternative Ingredient Picker */}
      {altPickerItem && (
        <AlternativePickerDialog
          open={altPickerOpen}
          onOpenChange={(open) => {
            setAltPickerOpen(open)
            if (!open) {
              setAltPickerItem(null)
              setAltPickerIngredients([])
            }
          }}
          itemName={altPickerItem.name}
          ingredients={altPickerIngredients}
          onConfirm={handleAltPickerConfirm}
        />
      )}

      {/* Dialogs */}
      <Dialog open={!!insufficientStockItem} onOpenChange={() => setInsufficientStockItem(null)}>
        <DialogContent className="sm:max-w-md max-w-[90%] p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-sm sm:text-base">Insufficient Stock</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">Sorry, there is not enough stock for the requested item.</DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2">
            <div className="bg-destructive/10 rounded-full p-1.5 sm:p-2"><X className="h-4 w-4 sm:h-5 sm:w-5 text-destructive" /></div>
            <div><p className="font-medium text-xs sm:text-sm">{insufficientStockItem}</p><p className="text-[10px] sm:text-xs text-muted-foreground">Please adjust your order.</p></div>
          </div>
          <DialogFooter><Button onClick={() => setInsufficientStockItem(null)} className="text-xs sm:text-sm">Understood</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cart sheet */}
      <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col h-full border-l">
          <CartPanel
            cart={cart}
            updateQuantity={updateQuantity}
            removeFromCart={removeFromCart}
            subtotal={subtotal}
            tax={tax}
            discount={discount}
            total={finalTotal}
            applyDiscount={applyDiscount}
            setApplyDiscount={setApplyDiscount}
            numberOfGuests={numberOfGuests}
            setNumberOfGuests={setNumberOfGuests}
            specialRequirements={specialRequirements}
            setSpecialRequirements={setSpecialRequirements}
            orderNumber={orderNumber}
            handlePlaceOrder={handlePlaceOrder}
            closeCart={() => setIsCartOpen(false)}
          />
        </SheetContent>
      </Sheet>

      {/* Sticky cart bar */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-20 p-3 bg-background/95 backdrop-blur-sm border-t">
          <Button
            className="w-full h-12 text-sm font-semibold rounded-xl flex items-center justify-between px-4"
            onClick={() => setIsCartOpen(true)}
          >
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              <span>{`${cart.length} item${cart.length > 1 ? 's' : ''} in cart`}</span>
            </div>
            <span className="font-bold">{new Intl.NumberFormat('en-ET', { style: 'currency', currency: 'ETB' }).format(finalTotal)}</span>
          </Button>
        </div>
      )}

      {/* Order Progress */}
      {orderProgress > 0 && orderProgress < 100 && (
        <motion.div
          className="fixed bottom-20 sm:bottom-4 left-1/2 -translate-x-1/2 sm:left-5 sm:translate-x-0 bg-background/95 backdrop-blur-sm p-3 rounded-xl shadow-lg border border-primary/20 z-30 w-[85%] max-w-xs"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
        >
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium text-xs flex items-center gap-1.5">
              <ChefHat className="h-3 w-3 text-primary animate-pulse" />
              Preparing Order
            </h3>
            <Badge className="bg-primary/20 text-primary border-none px-2 text-[10px]">{orderProgress}%</Badge>
          </div>
          <Progress value={orderProgress} className="w-full h-1.5 bg-primary/10" />
        </motion.div>
      )}
    </div>
  );
}