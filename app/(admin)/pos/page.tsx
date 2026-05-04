// app/pos/page.tsx
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
  Building2
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

// Restaurant options
const RESTAURANTS = [
  { id: "manyazewal1", name: "Manyazewal Eshetu Gibi 1", shortName: "Manyazewal 1", color: "indigo" },
  { id: "manyazewal2", name: "Manyazewal Eshetu Gibi 2", shortName: "Manyazewal 2", color: "rose" }
]

// Helper function to calculate price breakdown
const calculatePriceBreakdown = (priceWithTax: number, taxRate: number = 0.15) => {
  const originalPrice = priceWithTax / (1 + taxRate)
  const taxAmount = priceWithTax - originalPrice
  return { originalPrice, taxAmount }
}

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
  const audioContextRef = useRef<AudioContext | null>(null);
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
    
    if (typeof window !== 'undefined') {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContext) {
        audioContextRef.current = new AudioContext();
      }
    }
    
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const playFallbackBeep = useCallback(() => {
    try {
      if (!audioContextRef.current) {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContext) return;
        audioContextRef.current = new AudioContext();
      }
      
      if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
      }
      
      const oscillator = audioContextRef.current.createOscillator();
      const gainNode = audioContextRef.current.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContextRef.current.destination);
      
      oscillator.frequency.value = 800;
      gainNode.gain.value = 0.3;
      
      oscillator.start();
      gainNode.gain.exponentialRampToValueAtTime(0.00001, audioContextRef.current.currentTime + 0.3);
      oscillator.stop(audioContextRef.current.currentTime + 0.3);
    } catch (error) {
      console.error('Failed to play fallback beep:', error);
    }
  }, []);

  const play = useCallback(() => {
    if (!isEnabled) return;
    if (!isReady) return;
    
    if (audioRef.current && audioLoaded) {
      audioRef.current.currentTime = 0;
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => playFallbackBeep());
      }
      return;
    }
    playFallbackBeep();
  }, [isEnabled, isReady, audioLoaded, playFallbackBeep]);

  return { play, isEnabled, setIsEnabled, isReady };
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
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-3 sm:p-4 border-b sticky top-0 bg-background z-10">
        <h3 className="font-semibold flex items-center gap-2 text-sm sm:text-base">
          <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5" />
          Current Order
          <Badge variant="outline" className="ml-1 text-xs">
            {cart.length} {cart.length === 1 ? 'item' : 'items'}
          </Badge>
        </h3>
        <Button variant="ghost" size="icon" onClick={closeCart} className="h-7 w-7 sm:h-8 sm:w-8 rounded-full">
          <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        </Button>
      </div>

      {cart.length > 0 ? (
        <>
          <ScrollArea className="flex-1 p-2 sm:p-3">
            <div className="space-y-2 sm:space-y-3">
              {cart.map((item: any) => {
                const { originalPrice, taxAmount } = calculatePriceBreakdown(item.price);
                const itemTotalOriginal = originalPrice * item.quantity;
                const itemTotalTax = taxAmount * item.quantity;
                
                return (
                  <div key={item._id} className="flex border rounded-lg overflow-hidden bg-background/50">
                    <div className="relative h-12 w-12 sm:h-14 sm:w-14 flex-shrink-0">
                      <Image src={item.imageUrl || "/placeholder.svg"} alt={item.name} fill sizes="56px" className="object-cover" />
                    </div>
                    <div className="flex-1 p-1.5 sm:p-2 flex flex-col">
                      <div className="flex items-start justify-between gap-1">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-xs sm:text-sm truncate">{item.name}</h4>
                          <div className="flex flex-col">
                            <p className="text-[9px] sm:text-[10px] text-muted-foreground">
                              {new Intl.NumberFormat('en-ET', { style: 'currency', currency: 'ETB' }).format(originalPrice)} <span className="text-[8px]">(excl. VAT)</span>
                            </p>
                            <p className="text-[8px] sm:text-[9px] text-primary">
                              + VAT: {new Intl.NumberFormat('en-ET', { style: 'currency', currency: 'ETB' }).format(taxAmount)}
                            </p>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => removeFromCart(item._id)} className="h-5 w-5 sm:h-6 sm:w-6 rounded-full text-destructive">
                          <X className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                        </Button>
                      </div>
                      <div className="mt-1 pt-0.5 flex justify-between items-center">
                        <div className="flex items-center border rounded-md">
                          <Button variant="ghost" size="icon" onClick={() => updateQuantity(item._id, item.quantity - 1)} className="h-5 w-5 sm:h-6 sm:w-6 rounded-none rounded-l-md p-0">
                            <Minus className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                          </Button>
                          <span className="w-5 sm:w-6 text-center text-[10px] sm:text-xs font-medium">{item.quantity}</span>
                          <Button variant="ghost" size="icon" onClick={() => updateQuantity(item._id, item.quantity + 1)} className="h-5 w-5 sm:h-6 sm:w-6 rounded-none rounded-r-md p-0">
                            <Plus className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                          </Button>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] sm:text-xs font-medium">
                            {new Intl.NumberFormat('en-ET', { style: 'currency', currency: 'ETB' }).format(itemTotalOriginal)}
                          </span>
                          <p className="text-[7px] sm:text-[8px] text-muted-foreground">
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

          <div className="border-t p-3 sm:p-4 space-y-2 sm:space-y-3">
            <div className="space-y-1 sm:space-y-2">
              <div className="flex items-center justify-between text-[10px] sm:text-xs">
                <span className="text-muted-foreground">Subtotal (excl. VAT)</span>
                <span>{new Intl.NumberFormat('en-ET', { style: 'currency', currency: 'ETB' }).format(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between text-[10px] sm:text-xs">
                <span className="text-muted-foreground">VAT (15%)</span>
                <span>{new Intl.NumberFormat('en-ET', { style: 'currency', currency: 'ETB' }).format(tax)}</span>
              </div>
              {discount > 0 && (
                <div className="flex items-center justify-between text-[10px] sm:text-xs text-primary">
                  <span>Discount (10%)</span>
                  <span>-{new Intl.NumberFormat('en-ET', { style: 'currency', currency: 'ETB' }).format(discount)}</span>
                </div>
              )}
              <Separator />
              <div className="flex items-center justify-between font-semibold text-xs sm:text-sm">
                <span>Total (incl. VAT)</span>
                <span>{new Intl.NumberFormat('en-ET', { style: 'currency', currency: 'ETB' }).format(total)}</span>
              </div>
            </div>

            <div className="space-y-2 sm:space-y-3 pt-1">
              <div className="flex items-center gap-2">
                <Label htmlFor="guests" className="text-[10px] sm:text-xs whitespace-nowrap">Guests:</Label>
                <Select value={numberOfGuests.toString()} onValueChange={(v) => setNumberOfGuests(parseInt(v))}>
                  <SelectTrigger id="guests" className="h-7 sm:h-8 text-[10px] sm:text-xs flex-1">
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
                <Label htmlFor="special-requirements" className="text-[10px] sm:text-xs">Special Notes</Label>
                <Textarea
                  id="special-requirements"
                  placeholder="Add notes..."
                  className="min-h-[50px] sm:min-h-[60px] text-[10px] sm:text-xs"
                  value={specialRequirements}
                  onChange={(e) => setSpecialRequirements(e.target.value)}
                />
              </div>

              <Button onClick={handlePlaceOrder} className="w-full rounded-lg h-8 sm:h-10 text-xs sm:text-sm" disabled={cart.length === 0}>
                <Receipt className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                Place Order
              </Button>
            </div>
          </div>
        </>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
          <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-muted flex items-center justify-center mb-2 sm:mb-3">
            <ShoppingCart className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground" />
          </div>
          <h3 className="text-sm sm:text-base font-medium mb-1">Your cart is empty</h3>
          <p className="text-[10px] sm:text-xs text-muted-foreground max-w-md mb-3 sm:mb-4">
            Add items from the menu to get started.
          </p>
          <Button variant="outline" onClick={closeCart} className="rounded-lg text-xs sm:text-sm">
            Browse Menu
          </Button>
        </div>
      )}
    </div>
  );
}

// List View Item Component with tax info
function ListViewItem({ item, addToCart }: { item: MenuItem; addToCart: (item: MenuItem) => void }) {
  const { originalPrice, taxAmount } = calculatePriceBreakdown(item.price);
  
  return (
    <div className="flex border border-border/40 rounded-lg overflow-hidden hover:border-primary/30 transition-all bg-background hover:bg-background/95 hover:shadow-sm group">
      <div className="relative h-12 w-12 sm:h-14 sm:w-14 flex-shrink-0 overflow-hidden">
        <Image src={item.imageUrl || "/placeholder.svg"} alt={item.name} fill sizes="56px" className="object-cover" />
        {item.tags?.includes('bestseller') && (
          <div className="absolute top-0.5 left-0.5 bg-primary/90 text-primary-foreground text-[6px] sm:text-[7px] font-medium px-1 py-0.5 rounded">Best</div>
        )}
      </div>
      <div className="flex-1 p-1.5 sm:p-2 flex flex-col">
        <div className="flex items-start justify-between gap-1">
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-[10px] sm:text-xs line-clamp-1">{item.name}</h3>
            <p className="text-[8px] sm:text-[9px] text-muted-foreground line-clamp-1">{item.description}</p>
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

// Lazy loaded components
const MenuItemComponent = lazy(() => {
  return new Promise<{ default: React.ComponentType<any> }>((resolve) => {
    setTimeout(() => {
      resolve({
        default: ({ item, addToCart }: { item: MenuItem; addToCart: (item: MenuItem) => void }) => {
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
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = "/placeholder.svg";
                  }}
                />
                <div className="absolute top-2 right-2 bg-black/75 text-white text-[10px] sm:text-xs font-semibold px-1.5 py-0.5 rounded-md backdrop-blur-sm flex flex-col items-end">
                  <span>{new Intl.NumberFormat('en-ET', { style: 'currency', currency: 'ETB' }).format(item.price)}</span>
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

// Main Component
export default function POSPage() {
  const router = useRouter()
  const [categories, setCategories] = useState<Category[]>([])
  const [items, setItems] = useState<MenuItem[]>([])
  const [waiters, setWaiters] = useState<Waiter[]>([])
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [cart, setCart] = useState<CartItem[]>([])
  const [selectedWaiter, setSelectedWaiter] = useState("")
  const [selectedRestaurant, setSelectedRestaurant] = useState("")
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
  
  // Use refs to store data that shouldn't trigger re-renders
  const lastRequestIdsRef = useRef<string[]>([]);
  const lastAssignmentIdsRef = useRef<string[]>([]);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const assignmentPollingRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef<boolean>(true);
  
  // Sound hook
  const { play: playNotificationSound, isEnabled: soundEnabled, setIsEnabled: setSoundEnabled } = useNotificationSound()
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Get selected restaurant details
  const selectedRestaurantDetails = RESTAURANTS.find(r => r.id === selectedRestaurant);

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

  // Fetch current user info (waiter with their assigned restaurant)
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const sessionRes = await fetch('/api/auth/session');
        const sessionData = await sessionRes.json();
        
        if (sessionData?.user) {
          const waitersRes = await fetch('/api/waitress');
          const waitersData = await waitersRes.json();
          
          const matchingWaiter = (waitersData || []).find(
            (w: any) => w.email === sessionData.user.email
          );
          
          if (matchingWaiter && matchingWaiter._id) {
            const waiterRestaurantId = matchingWaiter.restaurantId || "manyazewal1";
            const waiterRestaurant = RESTAURANTS.find(r => r.id === waiterRestaurantId);
            
            setCurrentUser({
              id: matchingWaiter._id,
              name: matchingWaiter.name,
              role: matchingWaiter.role || sessionData.user.role,
              email: matchingWaiter.email,
              restaurantId: waiterRestaurantId,
              restaurantName: waiterRestaurant?.name || matchingWaiter.restaurantName || "Manyazewal Eshetu Gibi 1"
            });
            
            // Auto-select the waiter's assigned restaurant
            setSelectedRestaurant(waiterRestaurantId);
            // Auto-select the waiter themselves
            setSelectedWaiter(matchingWaiter._id);
          } else {
            // Fallback: use first restaurant
            setCurrentUser({
              id: sessionData.user.id,
              name: sessionData.user.name,
              role: sessionData.user.role,
              email: sessionData.user.email,
              restaurantId: "manyazewal1",
              restaurantName: "Manyazewal Eshetu Gibi 1"
            });
            setSelectedRestaurant("manyazewal1");
          }
        }
      } catch (error) {
        console.error('Error fetching user:', error);
        // Fallback
        setSelectedRestaurant("manyazewal1");
      }
    };
    fetchCurrentUser();
  }, []);

  // Fetch waiters (filtered by selected restaurant for display)
  useEffect(() => {
    const fetchWaiters = async () => {
      try {
        const response = await fetch("/api/waitress");
        const data = await response.json();
        
        // Filter waiters by selected restaurant if needed
        let filteredWaiters = data || [];
        if (selectedRestaurant) {
          filteredWaiters = filteredWaiters.filter((waiter: Waiter) => 
            !waiter.restaurantId || waiter.restaurantId === selectedRestaurant
          );
        }
        
        setWaiters(filteredWaiters);
        
        // If current user is a waiter and is in the filtered list, keep them selected
        if (currentUser?.id && filteredWaiters.some((w: Waiter) => w._id === currentUser.id)) {
          setSelectedWaiter(currentUser.id);
        } else if (filteredWaiters.length > 0 && !selectedWaiter) {
          setSelectedWaiter(filteredWaiters[0]._id);
        }
      } catch (error) {
        console.error("Error fetching waiters:", error);
      }
    };
    
    if (selectedRestaurant) {
      fetchWaiters();
    }
  }, [selectedRestaurant, currentUser?.id]);

  // Fetch items and categories (no filtering by restaurant - just fetch all)
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [itemsRes, categoriesRes] = await Promise.all([
          fetch("/api/items"),
          fetch("/api/item-category"),
        ]);

        const itemsData = await itemsRes.json();
        const categoriesData = await categoriesRes.json();

        setItems(itemsData.items || []);
        setCategories(categoriesData.data || []);
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load menu data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Fetch table assignments (for the logged-in waiter only)
  const fetchTableAssignments = useCallback(async () => {
    if (!currentUser?.id) return;
    
    try {
      const response = await fetch(`/api/order/table-assignments?waiterId=${currentUser.id}`);
      const data = await response.json();
      
      if (data.success && isMountedRef.current) {
        const newAssignments = (data.assignments || []) as Order[];
        const newAssignmentIds = newAssignments.map(a => a.id);
        
        // Check for truly new assignments
        const trulyNewAssignments = newAssignments.filter(a => !lastAssignmentIdsRef.current.includes(a.id));
        
        if (trulyNewAssignments.length > 0) {
          console.log(`🎵 Found ${trulyNewAssignments.length} new table assignments!`);
          
          trulyNewAssignments.forEach(newAssignment => {
            console.log(`🔊 Playing sound for table assignment - Order #${newAssignment.orderNumber}`);
            playNotificationSound();
            
            if (isMountedRef.current) {
              setNotificationData({
                title: `New Table Assignment - Order #${newAssignment.orderNumber}`,
                message: `Table ${newAssignment.tableNumber} | ${newAssignment.numberOfGuests} guests`
              });
              setShowNotification(true);
              setTimeout(() => setShowNotification(false), 4000);
              
              toast.custom((t) => (
                <div className={`bg-green-50 border-l-4 border-green-500 p-3 rounded shadow-lg ${t.visible ? 'animate-in slide-in-from-top-2' : 'animate-out slide-out-to-top-2'}`}>
                  <div className="flex items-center gap-2">
                    <Home className="h-4 w-4 text-green-600 animate-pulse" />
                    <div>
                      <p className="font-medium text-sm">New Table Assignment!</p>
                      <p className="text-xs text-muted-foreground">
                        Order #{newAssignment.orderNumber} - Table {newAssignment.tableNumber}
                      </p>
                    </div>
                  </div>
                </div>
              ), { duration: 4000 });
            }
          });
        }
        
        // Update refs
        lastAssignmentIdsRef.current = newAssignmentIds;
        
        // Update state
        if (isMountedRef.current) {
          setTableAssignments(newAssignments);
        }
      }
    } catch (error) {
      console.error('Error fetching table assignments:', error);
    }
  }, [currentUser?.id, playNotificationSound]);

  // Fetch transfer requests (for the logged-in waiter only)
  const fetchTransfers = useCallback(async () => {
    if (!currentUser?.id) return;
    
    try {
      const response = await fetch(`/api/order/pending-requests?waiterId=${currentUser.id}`);
      const data = await response.json();
      
      if (data.success && isMountedRef.current) {
        const newRequests = (data.requests || []) as Order[];
        const newRequestIds = newRequests.map(r => r.id);
        
        // Check for truly new requests
        const trulyNewRequests = newRequests.filter(r => !lastRequestIdsRef.current.includes(r.id));
        
        if (trulyNewRequests.length > 0) {
          console.log(`🎵 Found ${trulyNewRequests.length} new transfer requests!`);
          
          trulyNewRequests.forEach(newRequest => {
            console.log(`🔊 Playing sound for order #${newRequest.orderNumber}`);
            playNotificationSound();
            
            if (isMountedRef.current) {
              setNotificationData({
                title: `New Transfer Request - Order #${newRequest.orderNumber}`,
                message: `From: ${newRequest.editRequest?.requestedByName || 'Unknown'} | Table: ${newRequest.tableNumber}`
              });
              setShowNotification(true);
              setTimeout(() => setShowNotification(false), 4000);
              
              toast.custom((t) => (
                <div className={`bg-yellow-50 border-l-4 border-yellow-500 p-3 rounded shadow-lg ${t.visible ? 'animate-in slide-in-from-top-2' : 'animate-out slide-out-to-top-2'}`}>
                  <div className="flex items-center gap-2">
                    <BellRing className="h-4 w-4 text-yellow-600 animate-pulse" />
                    <div>
                      <p className="font-medium text-sm">New Transfer Request!</p>
                      <p className="text-xs text-muted-foreground">
                        Order #{newRequest.orderNumber} from {newRequest.editRequest?.requestedByName}
                      </p>
                    </div>
                  </div>
                </div>
              ), { duration: 4000 });
            }
          });
        }
        
        // Update refs
        lastRequestIdsRef.current = newRequestIds;
        
        // Update state
        if (isMountedRef.current) {
          setPendingTransfers(newRequests);
        }
      }
    } catch (error) {
      console.error('Error fetching pending transfers:', error);
    }
  }, [currentUser?.id, playNotificationSound]);

  // Start polling for both transfers and assignments
  const startPolling = useCallback(() => {
    if (!currentUser?.id) return;
    
    // Clear existing intervals
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    if (assignmentPollingRef.current) {
      clearInterval(assignmentPollingRef.current);
      assignmentPollingRef.current = null;
    }
    
    console.log(`[Polling] Starting polling for waiter: ${currentUser.id}`);
    
    // Initial fetches
    fetchTransfers();
    fetchTableAssignments();
    
    // Set up intervals (15 seconds for both)
    pollingIntervalRef.current = setInterval(() => {
      if (isMountedRef.current) {
        fetchTransfers();
      }
    }, 15000);
    
    assignmentPollingRef.current = setInterval(() => {
      if (isMountedRef.current) {
        fetchTableAssignments();
      }
    }, 15000);
  }, [currentUser?.id, fetchTransfers, fetchTableAssignments]);

  // Start polling when user is loaded
  useEffect(() => {
    if (currentUser?.id) {
      startPolling();
    }
    
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      if (assignmentPollingRef.current) {
        clearInterval(assignmentPollingRef.current);
        assignmentPollingRef.current = null;
      }
    };
  }, [currentUser?.id, startPolling]);

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

  const addToCart = useCallback((item: MenuItem) => {
    if (item.stock !== undefined && item.stock <= 0) {
      toast.error(`Sorry, ${item.name} is out of stock!`);
      setInsufficientStockItem(item.name);
      return;
    }

    const { originalPrice, taxAmount } = calculatePriceBreakdown(item.price);
    
    setCart((prev) => {
      const existing = prev.find((i) => i._id === item._id)
      if (existing) {
        return prev.map((i) => (i._id === item._id ? { ...i, quantity: i.quantity + 1 } : i))
      }
      return [...prev, { ...item, quantity: 1, originalPrice, taxAmount }]
    })

    toast.success(`Added ${item.name} to cart`);
  }, [])

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

  // Calculate subtotal (original prices without tax)
  const subtotal = cart.reduce((sum, item) => {
    const originalPrice = item.originalPrice || (item.price / 1.15)
    return sum + originalPrice * item.quantity
  }, 0)
  
  // Calculate total tax (sum of tax from all items)
  const tax = cart.reduce((sum, item) => {
    const taxAmount = item.taxAmount || (item.price - (item.price / 1.15))
    return sum + taxAmount * item.quantity
  }, 0)
  
  // Calculate total with tax
  const totalWithTax = subtotal + tax
  
  // Discount is applied to total with tax
  const discount = applyDiscount ? totalWithTax * 0.1 : 0
  const finalTotal = totalWithTax - discount

  // Handle accept transfer
  const handleAcceptTransfer = useCallback(async (orderId: string) => {
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
  }, [currentUser?.id, soundEnabled, playNotificationSound, fetchTransfers]);

  // Handle cancel transfer
  const handleCancelTransfer = useCallback(async (orderId: string) => {
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
  }, [currentUser?.id, fetchTransfers]);

  // Handle accept table assignment
  const handleAcceptAssignment = useCallback(async (orderId: string) => {
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
  }, [currentUser?.id, soundEnabled, playNotificationSound, fetchTableAssignments]);

  // Handle reject table assignment
  const handleRejectAssignment = useCallback(async (orderId: string, reason?: string) => {
    setIsProcessingAssignment(true);
    try {
      const response = await fetch('/api/order/accept-assignment', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, action: 'reject', waiterId: currentUser?.id, reason }),
      });

      const data = await response.json();
      if (data.success) {
        toast('Assignment declined. The order will be reassigned.', {
          icon: 'ℹ️',
          style: {
            borderRadius: '10px',
            background: '#f59e0b',
            color: '#fff',
          },
        });
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
  }, [currentUser?.id, soundEnabled, playNotificationSound, fetchTableAssignments]);

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

  const handlePlaceOrder = async () => {
    if (!selectedWaiter || !tableNumber || cart.length === 0) {
      toast.error("Please fill in all required fields")
      return
    }

    if (!selectedRestaurant) {
      toast.error("Please select a restaurant")
      return
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
        total: item.price * item.quantity
      }
    })

    const selectedRestaurantInfo = RESTAURANTS.find(r => r.id === selectedRestaurant);
    const selectedWaiterInfo = waiters.find(w => w._id === selectedWaiter);
    
    const orderData = {
      orderNumber,
      tableNumber,
      waiterId: selectedWaiter,
      waiterName: selectedWaiterInfo?.name || "",
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
      restaurantId: selectedRestaurant,
      restaurantName: selectedRestaurantInfo?.name || selectedRestaurant,
      inTable: false,
      delivery: false
    }

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
    <div className="flex flex-col h-screen bg-background/95 overflow-hidden">
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
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <header className="border-b bg-background/80 backdrop-blur-sm p-2 sm:p-3 sticky top-0 z-10">
          <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1 sm:gap-2">
              <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard')} className="h-7 w-7 sm:h-8 sm:w-8">
                <ArrowLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </Button>
              <h1 className="text-base sm:text-xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">POS System</h1>
            </div>

            <div className="flex items-center gap-1 sm:gap-2">
              {/* Restaurant Selector - Pre-filled with waiter's assigned restaurant */}
              <Select value={selectedRestaurant} onValueChange={setSelectedRestaurant}>
                <SelectTrigger className="w-[110px] sm:w-[140px] lg:w-[160px] bg-background/70 text-[10px] sm:text-xs h-7 sm:h-8">
                  <SelectValue placeholder="Select Restaurant" />
                </SelectTrigger>
                <SelectContent>
                  {RESTAURANTS.map((restaurant) => (
                    <SelectItem key={restaurant.id} value={restaurant.id}>
                      <div className="flex items-center gap-1 sm:gap-2">
                        <Building2 className={`h-3 w-3 sm:h-3.5 sm:w-3.5 text-${restaurant.color}-600`} />
                        <span className="truncate text-[10px] sm:text-xs">{restaurant.shortName}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={tableNumber} onValueChange={setTableNumber}>
                <SelectTrigger className="w-[70px] sm:w-[90px] lg:w-[110px] bg-background/70 text-[10px] sm:text-xs h-7 sm:h-8">
                  <SelectValue placeholder="Table" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 40 }, (_, i) => (
                    <SelectItem key={i} value={`T${i + 1}`}>T{i + 1}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedWaiter} onValueChange={setSelectedWaiter}>
                <SelectTrigger className="w-[90px] sm:w-[130px] lg:w-[150px] bg-background/70 text-[10px] sm:text-xs h-7 sm:h-8">
                  <SelectValue placeholder="Server" />
                </SelectTrigger>
                <SelectContent>
                  {waiters.map((waiter) => (
                    <SelectItem key={waiter._id} value={waiter._id}>
                      <div className="flex items-center gap-1 sm:gap-2">
                        <Avatar className="h-4 w-4 sm:h-5 sm:w-5">
                          <AvatarFallback className="text-[8px] sm:text-[10px]">{getInitials(waiter.name)}</AvatarFallback>
                        </Avatar>
                        <span className="truncate text-[10px] sm:text-xs">{waiter.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-1 sm:gap-2">
              <SoundToggleButton isEnabled={soundEnabled} onToggle={() => setSoundEnabled(!soundEnabled)} />
              
              <div className="hidden sm:flex items-center mr-1">
                <Button variant={activeView === 'grid' ? 'default' : 'outline'} size="icon" className="h-6 w-6 sm:h-7 sm:w-7 rounded-l-md rounded-r-none" onClick={() => setActiveView('grid')}>
                  <div className="grid grid-cols-2 gap-0.5"><div className="w-0.5 h-0.5 rounded-sm bg-current"></div><div className="w-0.5 h-0.5 rounded-sm bg-current"></div><div className="w-0.5 h-0.5 rounded-sm bg-current"></div><div className="w-0.5 h-0.5 rounded-sm bg-current"></div></div>
                </Button>
                <Button variant={activeView === 'list' ? 'default' : 'outline'} size="icon" className="h-6 w-6 sm:h-7 sm:w-7 rounded-l-none rounded-r-md" onClick={() => setActiveView('list')}>
                  <div className="flex flex-col items-center justify-center gap-0.5"><div className="w-2 h-0.5 rounded-sm bg-current"></div><div className="w-2 h-0.5 rounded-sm bg-current"></div><div className="w-2 h-0.5 rounded-sm bg-current"></div></div>
                </Button>
              </div>

              <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
                <SheetTrigger asChild>
                  <Button variant="default" size="icon" className="relative shrink-0 h-7 w-7 sm:h-8 sm:w-8">
                    <ShoppingCart className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    {cart.length > 0 && (
                      <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[8px] sm:text-[9px] rounded-full h-3.5 w-3.5 sm:h-4 sm:w-4 flex items-center justify-center">
                        {cart.length}
                      </span>
                    )}
                  </Button>
                </SheetTrigger>
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
            </div>
          </div>
        </header>

        {/* Table Assignments Section */}
        {tableAssignments.length > 0 && (
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

        {/* Pending Transfer Requests Section */}
        {pendingTransfers.length > 0 && (
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

        {/* Search & Categories */}
        <div className="border-b bg-background/60 p-2 sm:p-3">
          <div className="max-w-6xl mx-auto space-y-2 w-full">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3 w-3 sm:h-3.5 sm:w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search menu..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="pl-7 sm:pl-8 bg-background pr-3 border-input h-7 sm:h-8 text-xs"
              />
            </div>

            <div className="flex w-full overflow-x-auto pb-1 hide-scrollbar">
              <div className="flex space-x-1 pb-1 w-max">
                <Button variant={selectedCategory === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setSelectedCategory('all')} className="rounded-full shrink-0 h-6 sm:h-7 text-[10px] sm:text-xs px-2 sm:px-3">All</Button>
                {categories.map((category) => (
                  <Button key={category._id} variant={selectedCategory === category._id ? 'default' : 'outline'} size="sm" onClick={() => setSelectedCategory(category._id)} className="rounded-full whitespace-nowrap shrink-0 h-6 sm:h-7 text-[10px] sm:text-xs px-2 sm:px-3">
                    <span className="flex items-center gap-0.5 sm:gap-1">
                      {getCategoryIcon(category.type)}
                      <span className="truncate max-w-[60px] sm:max-w-[80px]">{category.name}</span>
                    </span>
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Menu Items */}
        <div className="flex-1 p-2 sm:p-3 overflow-auto">
          <div className="max-w-6xl mx-auto">
            {filteredItems.length > 0 ? (
              <div className={
                activeView === 'grid'
                  ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1.5 sm:gap-3 pb-16 md:pb-4"
                  : "flex flex-col gap-1.5 sm:gap-2 pb-16 md:pb-4"
              }>
                <AnimatePresence mode="popLayout">
                  {filteredItems.map((item, index) => (
                    <motion.div
                      key={item._id}
                      layout
                      initial="initial"
                      animate="animate"
                      exit="exit"
                      variants={fadeInUp}
                      transition={{ duration: 0.25, delay: index * 0.02 }}
                    >
                      {activeView === 'grid' ? (
                        <Suspense fallback={<MenuItemFallback />}>
                          <MenuItemComponent item={item} addToCart={addToCart} />
                        </Suspense>
                      ) : (
                        <ListViewItem item={item} addToCart={addToCart} />
                      )}
                    </motion.div>
                  ))}
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

      {/* Order Progress */}
      {orderProgress > 0 && orderProgress < 100 && (
        <motion.div
          className="fixed bottom-4 left-1/2 -translate-x-1/2 lg:bottom-5 lg:left-5 lg:translate-x-0 bg-background/95 backdrop-blur-sm p-2 sm:p-4 rounded-xl shadow-lg border border-primary/20 z-30 w-[85%] sm:w-[90%] max-w-xs"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
        >
          <div className="flex items-center justify-between mb-1 sm:mb-2">
            <h3 className="font-medium text-[10px] sm:text-xs flex items-center gap-1 sm:gap-2">
              <ChefHat className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-primary animate-pulse" />
              Preparing Order
            </h3>
            <Badge className="bg-primary/20 text-primary border-none px-1.5 sm:px-2 text-[8px] sm:text-[10px]">{orderProgress}%</Badge>
          </div>
          <Progress value={orderProgress} className="w-full h-1 sm:h-1.5 bg-primary/10" />
        </motion.div>
      )}
    </div>
  );
}