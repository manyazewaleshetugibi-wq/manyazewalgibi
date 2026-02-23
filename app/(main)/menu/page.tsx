'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { toast } from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Search, X, ChevronDown, ChevronUp, Clock, DollarSign, Tag, Utensils, 
  Grid, List, ShoppingCart, Plus, Minus, ChefHat, Sparkles, ArrowLeft, Receipt,
  Users, MapPin, Phone, User, Mail, Home, CreditCard, Upload, Check, Info,
  Wallet, LogIn
} from 'lucide-react'
import { NavBar } from '@/components/NavBar'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Alert, AlertDescription } from "@/components/ui/alert"
import axios from 'axios'

// API client setup with interceptors
const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add response interceptor for better error handling
api.interceptors.response.use(
  response => response,
  error => {
    if (error.code === 'ECONNABORTED') {
      console.error('Request timeout:', error);
      return Promise.reject(new Error('Request timeout - please try again'));
    }
    
    if (error.response?.status === 404) {
      console.log('API endpoint not found:', error.config?.url);
      return Promise.reject(new Error(`Endpoint ${error.config?.url} not found`));
    }
    
    if (error.response?.data) {
      const contentType = error.response.headers['content-type'];
      if (contentType && contentType.includes('text/html')) {
        console.error('Received HTML instead of JSON');
        return Promise.reject(new Error('Server error - please try again'));
      }
    }
    
    return Promise.reject(error);
  }
);

interface Category {
  _id: string
  name: string
  description: string
  type: string
  imageUrl: string
}

interface NutritionalInfo {
  calories?: number
  protein?: number
  carbohydrates?: number
  fat?: number
}

interface Item {
  _id: string
  name: string
  description?: string
  categoryId: string
  price: number
  imageUrl?: string
  preparationTime?: number
  nutritionalInfo?: NutritionalInfo
  isActive?: boolean
  isFeatured?: boolean
  tags?: string[]
  requiredStock?: any[]
  cloudinaryData?: any
  createdAt?: string
  updatedAt?: string
}

interface CartItem extends Item {
  quantity: number
  specialInstructions?: string
}

interface DeliveryInfo {
  fullName: string
  phoneNumber: string
  email: string
  address: string
  city: string
  landmark?: string
  deliveryInstructions?: string
}

interface PaymentScreenshot {
  file: File | null
  previewUrl: string
  uploaded: boolean
}

interface Waiter {
  _id: string
  name: string
  shift?: string
  avatar?: string
}

interface UserData {
  _id: string
  firstName: string
  lastName: string
  email: string
  phoneNumber: string
  address: string
  city: string
  role?: string
  name?: string
  profile?: {
    phoneNumber?: string
    address?: string
    city?: string
  }
}

// Extend the session user type
interface ExtendedUser {
  id: string
  role: string
  name?: string | null
  email?: string | null
  image?: string | null
}

// Default nutritional info
const DEFAULT_NUTRITIONAL_INFO: NutritionalInfo = {
  calories: 0,
  protein: 0,
  carbohydrates: 0,
  fat: 0
}

// Custom debounce hook
const useDebounce = <T,>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(timer)
    }
  }, [value, delay])

  return debouncedValue
}

// Get category icon
const getCategoryIcon = (type: string) => {
  switch (type.toLowerCase()) {
    case 'food':
      return <Utensils className="h-4 w-4" />
    case 'drink':
      return <Sparkles className="h-4 w-4" />
    case 'dessert':
      return <Sparkles className="h-4 w-4" />
    default:
      return <Tag className="h-4 w-4" />
  }
}

// Login Prompt Dialog Component
const LoginPromptDialog = ({ 
  open, 
  onOpenChange,
  onLogin,
  message = 'Please login to continue'
}: { 
  open: boolean
  onOpenChange: (open: boolean) => void
  onLogin: () => void
  message?: string
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <LogIn className="h-6 w-6 text-primary" />
            Login Required
          </DialogTitle>
          <DialogDescription className="text-base pt-2">
            {message}
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <Alert>
            <AlertDescription className="text-sm">
              You need to be logged in to:
              <ul className="list-disc ml-4 mt-2 space-y-1">
                <li>Add items to your cart</li>
                <li>Place orders</li>
                <li>Track your order history</li>
                <li>Save your delivery information</li>
              </ul>
            </AlertDescription>
          </Alert>
        </div>
        
        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            onClick={onLogin}
            className="bg-primary hover:bg-primary/90"
          >
            <LogIn className="mr-2 h-4 w-4" />
            Login Now
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Item Detail Dialog Component
const ItemDetailDialog = ({ 
  item, 
  categoryName,
  isOpen,
  onOpenChange,
  onAddToCart,
  isUserLoggedIn,
  onLoginRequired
}: { 
  item: Item
  categoryName: string
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onAddToCart: (item: Item) => void
  isUserLoggedIn: boolean
  onLoginRequired: (message: string) => void
}) => {
  const [selectedImage, setSelectedImage] = useState(item.imageUrl || '/placeholder.svg')
  const nutritionalInfo = item.nutritionalInfo || DEFAULT_NUTRITIONAL_INFO
  
  const handleAddToCartClick = () => {
    if (!isUserLoggedIn) {
      onLoginRequired('Please login to add items to your cart')
      return
    }
    onAddToCart(item)
    onOpenChange(false)
    toast.success(`Added ${item.name} to cart`)
  }
  
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <Info className="h-5 w-5 text-primary" />
            {item.name}
          </DialogTitle>
          <DialogDescription className="text-base">
            Complete details of the menu item
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="max-h-[70vh] pr-4">
          <div className="space-y-6">
            {/* Image Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="relative h-64 lg:h-80 rounded-lg overflow-hidden">
                <Image
                  src={selectedImage}
                  alt={item.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 50vw"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    target.src = '/placeholder.svg'
                  }}
                  unoptimized={selectedImage.includes('cloudinary.com')}
                />
                {item.isFeatured && (
                  <Badge className="absolute top-3 left-3 bg-yellow-400 text-white border-none">
                    <Sparkles className="mr-1 h-3 w-3" /> Featured
                  </Badge>
                )}
                {item.isActive === false && (
                  <Badge className="absolute top-3 right-3 bg-red-500 text-white border-none">
                    Out of Stock
                  </Badge>
                )}
              </div>
              
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Description</h3>
                  <p className="text-gray-600">{item.description || 'No description available'}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="flex items-center gap-2 text-gray-700 mb-1">
                      <DollarSign className="h-4 w-4" />
                      <span className="text-sm font-medium">Price</span>
                    </div>
                    <p className="text-2xl font-bold text-primary">{(item.price || 0).toFixed(2)} ETB</p>
                  </div>
                  
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="flex items-center gap-2 text-gray-700 mb-1">
                      <Clock className="h-4 w-4" />
                      <span className="text-sm font-medium">Prep Time</span>
                    </div>
                    <p className="text-2xl font-bold text-blue-600">{item.preparationTime || 0} min</p>
                  </div>
                  
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="flex items-center gap-2 text-gray-700 mb-1">
                      <Tag className="h-4 w-4" />
                      <span className="text-sm font-medium">Category</span>
                    </div>
                    <p className="text-lg font-semibold">{categoryName || 'Uncategorized'}</p>
                  </div>
                  
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="flex items-center gap-2 text-gray-700 mb-1">
                      <Utensils className="h-4 w-4" />
                      <span className="text-sm font-medium">Status</span>
                    </div>
                    <Badge variant={item.isActive ? "default" : "secondary"} className="text-lg">
                      {item.isActive ? 'Available' : 'Unavailable'}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
            
            <Separator />
            
            {/* Nutritional Information */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Nutritional Information</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-700">{nutritionalInfo.calories || 0}</p>
                  <p className="text-sm text-gray-600">Calories</p>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-700">{nutritionalInfo.protein || 0}g</p>
                  <p className="text-sm text-gray-600">Protein</p>
                </div>
                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <p className="text-2xl font-bold text-yellow-700">{nutritionalInfo.carbohydrates || 0}g</p>
                  <p className="text-sm text-gray-600">Carbs</p>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <p className="text-2xl font-bold text-red-700">{nutritionalInfo.fat || 0}g</p>
                  <p className="text-sm text-gray-600">Fat</p>
                </div>
              </div>
            </div>
            
            {/* Required Stock (if available) */}
            {item.requiredStock && item.requiredStock.length > 0 && (
              <>
                <Separator />
                <div>
                  <h3 className="text-lg font-semibold mb-4">Required Ingredients</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {item.requiredStock.map((stock, index) => (
                      <div key={index} className="text-center p-4 bg-gray-50 rounded-lg">
                        <p className="text-base font-semibold text-gray-800">{stock.name || 'Unknown'}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </ScrollArea>
        
        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
          <Button
            onClick={handleAddToCartClick}
            className="bg-primary hover:bg-primary/90"
          >
            <ShoppingCart className="mr-2 h-4 w-4" />
            Add to Cart
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Payment Upload Dialog Component
const PaymentUploadDialog = ({
  open,
  onOpenChange,
  paymentScreenshot,
  onRemoveScreenshot,
  onFileUpload,
  transactionId,
  onTransactionIdChange,
  subtotal,
  tax,
  discount,
  orderType,
  deliveryFee,
  total,
  onFinalizeOrder,
  isPlacingOrder,
  paymentMethod
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  paymentScreenshot: PaymentScreenshot
  onRemoveScreenshot: () => void
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
  transactionId: string
  onTransactionIdChange: (value: string) => void
  subtotal: number
  tax: number
  discount: number
  orderType: string
  deliveryFee: number
  total: number
  onFinalizeOrder: () => void
  isPlacingOrder: boolean
  paymentMethod: string
}) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          {paymentMethod === 'cash' ? (
            <Wallet className="h-5 w-5" />
          ) : (
            <CreditCard className="h-5 w-5" />
          )}
          {paymentMethod === 'cash' ? 'Cash Payment' : 'Payment Verification'}
        </DialogTitle>
        <DialogDescription>
          {paymentMethod === 'cash' 
            ? 'Order confirmation for cash payment'
            : 'Please upload a screenshot of your payment confirmation'}
        </DialogDescription>
      </DialogHeader>
      
      <div className="flex-1 overflow-y-auto -mr-4 pr-4">
        <div className="space-y-4 py-1">
          {paymentMethod === 'online' && (
            <Alert>
              <AlertDescription className="text-sm">
                Payment Details:
                <div className="mt-2 space-y-1">
                  <div className="flex justify-between">
                    <span>Bank Name:</span>
                    <span className="font-semibold">Commercial Bank of Ethiopia</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Account Number:</span>
                    <span className="font-semibold">1000000000000</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Account Name:</span>
                    <span className="font-semibold">Manyazewal Eshetu Gibi</span>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}
          
          {paymentMethod === 'online' && (
            <div className="space-y-3">
              <Label>Upload Payment Screenshot</Label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary transition-colors">
                {paymentScreenshot.previewUrl ? (
                  <div className="space-y-3">
                    <div className="relative w-48 h-48 mx-auto">
                      <Image
                        src={paymentScreenshot.previewUrl}
                        alt="Payment screenshot"
                        fill
                        className="object-contain rounded-md"
                        unoptimized
                      />
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={onRemoveScreenshot}
                      className="mt-2"
                    >
                      <X className="mr-2 h-4 w-4" />
                      Remove Image
                    </Button>
                  </div>
                ) : (
                  <>
                    <Upload className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <div className="text-sm text-gray-600 mb-3">
                      Drag & drop your payment screenshot here, or click to browse
                    </div>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={onFileUpload}
                      className="hidden"
                      id="payment-screenshot"
                    />
                    <Button
                      variant="outline"
                      onClick={() => document.getElementById('payment-screenshot')?.click()}
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      Choose File
                    </Button>
                    <p className="text-xs text-gray-500 mt-2">
                      Supported: JPG, PNG, GIF (Max 5MB)
                    </p>
                  </>
                )}
              </div>
            </div>
          )}
          
          {paymentMethod === 'online' && (
            <div className="space-y-2">
              <Label htmlFor="transaction-id">Transaction ID (Optional)</Label>
              <Input
                id="transaction-id"
                placeholder="Enter transaction ID if available"
                value={transactionId}
                onChange={(e) => onTransactionIdChange(e.target.value)}
              />
            </div>
          )}
          
          {paymentMethod === 'cash' && orderType === 'delivery' && (
            <Alert>
              <AlertDescription className="text-sm">
                <div className="flex items-center gap-2 mb-2">
                  <Wallet className="h-4 w-4" />
                  <span className="font-medium">Cash on Delivery</span>
                </div>
                <p>You'll pay {total.toLocaleString()} ETB in cash when your order is delivered.</p>
                <p className="mt-2 text-xs text-gray-600">
                  Please have the exact amount ready for faster transaction.
                </p>
              </AlertDescription>
            </Alert>
          )}
          
          {paymentMethod === 'cash' && orderType === 'table' && (
            <Alert>
              <AlertDescription className="text-sm">
                <div className="flex items-center gap-2 mb-2">
                  <Wallet className="h-4 w-4" />
                  <span className="font-medium">Cash Payment at Table</span>
                </div>
                <p>You'll pay {total.toLocaleString()} ETB in cash when you receive your order.</p>
                <p className="mt-2 text-xs text-gray-600">
                  Your waitress will bring the bill to your table.
                </p>
              </AlertDescription>
            </Alert>
          )}
          
          <div className="pt-4 space-y-2">
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="text-sm font-medium mb-1">Order Summary</div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{subtotal.toLocaleString()} ETB</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax (15%):</span>
                  <span>{tax.toLocaleString()} ETB</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount (10%):</span>
                    <span>-{discount.toLocaleString()} ETB</span>
                  </div>
                )}
                {orderType === 'delivery' && (
                  <div className="flex justify-between">
                    <span>Delivery Fee:</span>
                    <span>{deliveryFee.toLocaleString()} ETB</span>
                  </div>
                )}
                <Separator className="my-1" />
                <div className="flex justify-between font-bold">
                  <span>Total:</span>
                  <span>{total.toLocaleString()} ETB</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <DialogFooter className="gap-2 mt-2">
        <Button
          variant="outline"
          onClick={() => onOpenChange(false)}
          disabled={isPlacingOrder}
        >
          Cancel
        </Button>
        <Button
          onClick={onFinalizeOrder}
          disabled={(paymentMethod === 'online' && !paymentScreenshot.uploaded) || isPlacingOrder}
          className="min-w-[120px]"
        >
          {isPlacingOrder ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
              Processing...
            </>
          ) : paymentMethod === 'cash' ? (
            <>
              <Check className="mr-2 h-4 w-4" />
              Confirm Cash Order
            </>
          ) : (
            <>
              <Check className="mr-2 h-4 w-4" />
              Confirm Payment
            </>
          )}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
)

// CartPanel Component
const CartPanel = ({
  cart,
  onClose,
  onRemoveItem,
  onUpdateQuantity,
  orderType,
  onOrderTypeChange,
  tableNumber,
  onTableNumberChange,
  waiters,
  selectedWaiter,
  onWaiterChange,
  deliveryInfo,
  onDeliveryInfoChange,
  numberOfGuests,
  onGuestsChange,
  specialRequirements,
  onSpecialRequirementsChange,
  paymentMethod,
  onPaymentMethodChange,
  applyDiscount,
  onApplyDiscountChange,
  subtotal,
  tax,
  discount,
  deliveryFee,
  total,
  orderNumber,
  onPlaceOrder,
  isPlacingOrder,
  isUserLoggedIn,
  userData,
  userDataError,
  onLoginRequired
}: {
  cart: CartItem[]
  onClose: () => void
  onRemoveItem: (id: string) => void
  onUpdateQuantity: (id: string, qty: number) => void
  orderType: 'table' | 'delivery' | ''
  onOrderTypeChange: (type: 'table' | 'delivery' | '') => void
  tableNumber: string
  onTableNumberChange: (num: string) => void
  waiters: Waiter[]
  selectedWaiter: string
  onWaiterChange: (id: string) => void
  deliveryInfo: DeliveryInfo
  onDeliveryInfoChange: (field: keyof DeliveryInfo, value: string) => void
  numberOfGuests: number
  onGuestsChange: (num: number) => void
  specialRequirements: string
  onSpecialRequirementsChange: (req: string) => void
  paymentMethod: string
  onPaymentMethodChange: (method: string) => void
  applyDiscount: boolean
  onApplyDiscountChange: (apply: boolean) => void
  subtotal: number
  tax: number
  discount: number
  deliveryFee: number
  total: number
  orderNumber: string
  onPlaceOrder: () => void
  isPlacingOrder: boolean
  isUserLoggedIn: boolean
  userData: UserData | null
  userDataError: string | null
  onLoginRequired: (message: string) => void
}) => {
  const handlePlaceOrder = () => {
    if (!isUserLoggedIn) {
      onLoginRequired('Please login to place an order')
      return
    }
    onPlaceOrder()
  }
  
  // Auto-fill delivery info when user data changes and order type is delivery
  useEffect(() => {
    if (isUserLoggedIn && userData && orderType === 'delivery') {
      // Get current values from userData
      const phoneNumber = userData.phoneNumber || userData.profile?.phoneNumber || '';
      const address = userData.address || userData.profile?.address || '';
      const city = userData.city || userData.profile?.city || '';
      const fullName = userData.firstName && userData.lastName 
        ? `${userData.firstName} ${userData.lastName}`.trim()
        : userData.name || '';
      
      // Only update if values are different from current deliveryInfo
      const updates: Partial<DeliveryInfo> = {};
      
      if (fullName && fullName !== deliveryInfo.fullName) {
        updates.fullName = fullName;
      }
      if (userData.email && userData.email !== deliveryInfo.email) {
        updates.email = userData.email;
      }
      if (phoneNumber && phoneNumber !== deliveryInfo.phoneNumber) {
        updates.phoneNumber = phoneNumber;
      }
      if (address && address !== deliveryInfo.address) {
        updates.address = address;
      }
      if (city && city !== deliveryInfo.city) {
        updates.city = city;
      }
      
      // Apply updates only if there are changes
      if (Object.keys(updates).length > 0) {
        Object.entries(updates).forEach(([key, value]) => {
          onDeliveryInfoChange(key as keyof DeliveryInfo, value);
        });
      }
    }
  }, [
    isUserLoggedIn, 
    userData,
    orderType,
    // Add specific deliveryInfo fields to compare values
    deliveryInfo.fullName,
    deliveryInfo.email,
    deliveryInfo.phoneNumber,
    deliveryInfo.address,
    deliveryInfo.city,
    onDeliveryInfoChange
  ]);
  
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="font-semibold flex items-center gap-2 text-lg">
          <ShoppingCart className="h-5 w-5" />
          Your Order
          <Badge variant="outline">
            {cart.length} {cart.length === 1 ? 'item' : 'items'}
          </Badge>
        </h3>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onClose}
          className="h-8 w-8 rounded-full"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </Button>
      </div>

      {cart.length > 0 ? (
        <>
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-6">
              <div className="space-y-3">
                {cart.map((item) => (
                  <div key={item._id} className="flex border rounded-lg overflow-hidden bg-background/50">
                    <div className="relative h-20 w-20 flex-shrink-0">
                      <Image
                        src={item.imageUrl || "/placeholder.svg"}
                        alt={item.name}
                        fill
                        sizes="80px"
                        className="object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.src = '/placeholder.svg'
                        }}
                        unoptimized={item.imageUrl?.includes('cloudinary.com')}
                      />
                    </div>
                    
                    <div className="flex-1 p-3 flex flex-col">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-medium">{item.name}</h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            {item.price.toLocaleString()} ETB
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onRemoveItem(item._id)}
                          className="h-6 w-6 rounded-full text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <X className="h-3 w-3" />
                          <span className="sr-only">Remove</span>
                        </Button>
                      </div>
                      
                      <div className="mt-auto pt-2 flex justify-between items-center">
                        <div className="flex items-center border rounded-md">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onUpdateQuantity(item._id, item.quantity - 1)}
                            className="h-7 w-7 rounded-none rounded-l-md p-0"
                          >
                            <Minus className="h-3 w-3" />
                            <span className="sr-only">Decrease</span>
                          </Button>
                          <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onUpdateQuantity(item._id, item.quantity + 1)}
                            className="h-7 w-7 rounded-none rounded-r-md p-0"
                          >
                            <Plus className="h-3 w-3" />
                            <span className="sr-only">Increase</span>
                          </Button>
                        </div>
                        
                        <span className="text-sm font-medium">
                          {(item.price * item.quantity).toLocaleString()} ETB
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <Separator />

              <div className="space-y-3">
                {userDataError && (
                  <Alert variant="destructive">
                    <AlertDescription className="text-sm">
                      {userDataError}
                    </AlertDescription>
                  </Alert>
                )}

                {isUserLoggedIn && userData && (
                  <Alert>
                    <AlertDescription className="text-sm">
                      <div className="flex items-center gap-2 mb-1">
                        <User className="h-4 w-4" />
                        <span className="font-medium">Logged in as:</span>
                      </div>
                      <div className="mt-1">
                        <p>{userData.firstName || userData.name || ''} {userData.lastName || ''}</p>
                        <p className="text-xs text-gray-600">{userData.email}</p>
                        {userData.phoneNumber && (
                          <p className="text-xs text-gray-600">📞 {userData.phoneNumber}</p>
                        )}
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                <div className="space-y-3">
                  <Label className="text-base font-medium">Order Type</Label>
                  <RadioGroup
                    value={orderType}
                    onValueChange={(value: 'table' | 'delivery') => {
                      if (!isUserLoggedIn) {
                        onLoginRequired('Please login to select order type')
                        return
                      }
                      onOrderTypeChange(value)
                    }}
                    className="flex gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="table" id="table" />
                      <Label htmlFor="table" className="cursor-pointer">
                        <div className="flex items-center gap-2">
                          <Home className="h-4 w-4" />
                          Dine In (Table)
                        </div>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="delivery" id="delivery" />
                      <Label htmlFor="delivery" className="cursor-pointer">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          Delivery
                        </div>
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {orderType === 'table' && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="table-number">Table Number *</Label>
                      <Select value={tableNumber} onValueChange={onTableNumberChange}>
                        <SelectTrigger id="table-number">
                          <SelectValue placeholder="Select Table" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 20 }, (_, i) => (
                            <SelectItem key={i} value={`T${i + 1}`}>Table {i + 1}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="waiter">Waitress/Server *</Label>
                      <Select value={selectedWaiter} onValueChange={onWaiterChange}>
                        <SelectTrigger id="waiter">
                          <SelectValue placeholder="Select Waitress" />
                        </SelectTrigger>
                        <SelectContent>
                          {waiters.map((waiter) => (
                            <SelectItem key={waiter._id} value={waiter._id}>{waiter.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}

                {orderType === 'delivery' && (
                  <div className="space-y-3 border rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        Delivery Information
                      </h4>
                      {isUserLoggedIn && userData && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const phoneNumber = userData.phoneNumber || userData.profile?.phoneNumber || '';
                            const address = userData.address || userData.profile?.address || '';
                            const city = userData.city || userData.profile?.city || '';
                            const fullName = userData.firstName && userData.lastName 
                              ? `${userData.firstName} ${userData.lastName}`.trim()
                              : userData.name || '';
                            
                            const updates: Partial<DeliveryInfo> = {};
                            if (fullName) updates.fullName = fullName;
                            if (userData.email) updates.email = userData.email;
                            if (phoneNumber) updates.phoneNumber = phoneNumber;
                            if (address) updates.address = address;
                            if (city) updates.city = city;
                            
                            Object.entries(updates).forEach(([key, value]) => {
                              onDeliveryInfoChange(key as keyof DeliveryInfo, value);
                            });
                            
                            toast.success('Profile information applied');
                          }}
                          disabled={!userData}
                        >
                          <User className="mr-2 h-3 w-3" />
                          Use My Info
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="full-name">Full Name *</Label>
                        <Input
                          id="full-name"
                          placeholder="John Doe"
                          value={deliveryInfo.fullName}
                          onChange={(e) => onDeliveryInfoChange('fullName', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone Number *</Label>
                        <Input
                          id="phone"
                          placeholder="0912345678"
                          value={deliveryInfo.phoneNumber}
                          onChange={(e) => onDeliveryInfoChange('phoneNumber', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="email">Email *</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="john@example.com"
                          value={deliveryInfo.email}
                          onChange={(e) => onDeliveryInfoChange('email', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="address">Address *</Label>
                        <Input
                          id="address"
                          placeholder="Street, House Number"
                          value={deliveryInfo.address}
                          onChange={(e) => onDeliveryInfoChange('address', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="city">City *</Label>
                        <Input
                          id="city"
                          placeholder="Addis Ababa"
                          value={deliveryInfo.city}
                          onChange={(e) => onDeliveryInfoChange('city', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="landmark">Landmark (Optional)</Label>
                        <Input
                          id="landmark"
                          placeholder="Nearby landmark"
                          value={deliveryInfo.landmark || ''}
                          onChange={(e) => onDeliveryInfoChange('landmark', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="delivery-instructions">Delivery Instructions (Optional)</Label>
                        <Textarea
                          id="delivery-instructions"
                          placeholder="Gate code, floor number, etc."
                          value={deliveryInfo.deliveryInstructions || ''}
                          onChange={(e) => onDeliveryInfoChange('deliveryInstructions', e.target.value)}
                          rows={2}
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="guests">
                    <Users className="inline mr-2 h-4 w-4" />
                    Number of Guests
                  </Label>
                  <Select 
                    value={numberOfGuests.toString()} 
                    onValueChange={(v) => onGuestsChange(parseInt(v))}
                  >
                    <SelectTrigger id="guests">
                      <SelectValue placeholder="Select number of guests" />
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

                <div className="space-y-2">
                  <Label htmlFor="special-requirements">Special Requirements</Label>
                  <Textarea
                    id="special-requirements"
                    placeholder="Any special requirements or notes..."
                    value={specialRequirements}
                    onChange={(e) => onSpecialRequirementsChange(e.target.value)}
                    rows={2}
                  />
                </div>

                <div className="space-y-3">
                  <Label className="text-base font-medium">Payment Method</Label>
                  <RadioGroup
                    value={paymentMethod}
                    onValueChange={onPaymentMethodChange}
                    className="flex flex-col gap-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="online" id="online" />
                      <Label htmlFor="online" className="cursor-pointer">
                        Online Payment (Bank Transfer)
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="card" id="card" />
                      <Label htmlFor="card" className="cursor-pointer">
                        Credit/Debit Card
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="cash" id="cash" />
                      <Label htmlFor="cash" className="cursor-pointer">
                        <div className="flex items-center gap-2">
                          <Wallet className="h-4 w-4" />
                          Cash on Delivery
                        </div>
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                
              </div>
            </div>
          </ScrollArea>

          <div className="border-t p-4 space-y-4 bg-background shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-10">
            <div className="space-y-2 bg-gray-50 p-3 rounded-lg">
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-sm">Subtotal:</span>
                  <span className="font-medium">{subtotal.toLocaleString()} ETB</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Tax (15%):</span>
                  <span className="font-medium">{tax.toLocaleString()} ETB</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span className="text-sm">Discount (10%):</span>
                    <span className="font-medium">-{discount.toLocaleString()} ETB</span>
                  </div>
                )}
                {orderType === 'delivery' && (
                  <div className="flex justify-between">
                    <span className="text-sm">Delivery Fee:</span>
                    <span className="font-medium">{deliveryFee.toLocaleString()} ETB</span>
                  </div>
                )}
                <Separator className="my-1" />
                <div className="flex justify-between font-bold">
                  <span>Total:</span>
                  <span className="text-lg">{total.toLocaleString()} ETB</span>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <p className="text-sm text-muted-foreground mb-2">
                Order #: <span className="font-mono font-medium">{orderNumber}</span>
              </p>
              <Button 
                onClick={handlePlaceOrder} 
                className="w-full"
                disabled={cart.length === 0 || !orderType || isPlacingOrder}
              >
                <Receipt className="mr-2 h-4 w-4" />
                {isPlacingOrder ? 'Processing...' : 'Proceed to Payment'}
              </Button>
            </div>
          </div>
        </>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <ShoppingCart className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-medium mb-2">Your cart is empty</h3>
          <p className="text-muted-foreground max-w-md mb-6">
            {!isUserLoggedIn 
              ? 'Please login to add items to your cart and place orders.'
              : 'Add some delicious items from the menu to get started with your order.'
            }
          </p>
          <Button variant="outline" onClick={onClose}>
            Browse Menu
          </Button>
        </div>
      )}
    </div>
  )
}

export default function ItemMenu() {
  const router = useRouter()
  const { data: session, status: sessionStatus } = useSession()
  
  // Cast session user to ExtendedUser type
  const user = session?.user as ExtendedUser | undefined
  const isUserLoggedIn = !!user
  
  const [categories, setCategories] = useState<Category[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [filteredItems, setFilteredItems] = useState<Item[]>([])
  const [waiters, setWaiters] = useState<Waiter[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortField, setSortField] = useState<'name' | 'price' | 'preparationTime'>('name')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  
  // User data state
  const [userData, setUserData] = useState<UserData | null>(null)
  const [userDataError, setUserDataError] = useState<string | null>(null)
  const [isLoadingUser, setIsLoadingUser] = useState(false)
  
  // Login prompt state
  const [showLoginPrompt, setShowLoginPrompt] = useState(false)
  const [loginPromptMessage, setLoginPromptMessage] = useState('Please login to continue')
  
  // Item detail state
  const [selectedItem, setSelectedItem] = useState<Item | null>(null)
  const [showItemDetail, setShowItemDetail] = useState(false)
  
  // Cart state
  const [cart, setCart] = useState<CartItem[]>([])
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [orderProgress, setOrderProgress] = useState(0)
  const [orderNumber, setOrderNumber] = useState(`ORD-${Date.now().toString().slice(-6)}`)
  
  // Order type state
  const [orderType, setOrderType] = useState<'table' | 'delivery' | ''>('')
  const [tableNumber, setTableNumber] = useState('')
  const [selectedWaiter, setSelectedWaiter] = useState('')
  
  // Delivery info state
  const [deliveryInfo, setDeliveryInfo] = useState<DeliveryInfo>({
    fullName: '',
    phoneNumber: '',
    email: '',
    address: '',
    city: '',
    landmark: '',
    deliveryInstructions: ''
  })
  
  // Payment state
  const [paymentScreenshot, setPaymentScreenshot] = useState<PaymentScreenshot>({
    file: null,
    previewUrl: '',
    uploaded: false
  })
  const [paymentMethod, setPaymentMethod] = useState<string>('')
  const [transactionId, setTransactionId] = useState('')
  const [applyDiscount, setApplyDiscount] = useState(false)
  const [specialRequirements, setSpecialRequirements] = useState('')
  const [numberOfGuests, setNumberOfGuests] = useState(1)
  const [isPlacingOrder, setIsPlacingOrder] = useState(false)
  const [showPaymentUpload, setShowPaymentUpload] = useState(false)

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        
        const [categoriesRes, itemsRes] = await Promise.all([
          api.get('/item-category'),
          api.get('/items')
        ])

        setCategories(categoriesRes.data?.data || [])
        
        // Try to fetch waiters but don't fail if it doesn't exist
        try {
          const waitersRes = await api.get('/waitress')
          setWaiters(waitersRes.data || [])
        } catch (err) {
          console.log('Waiters endpoint not available')
          setWaiters([])
        }
        
        // Normalize items data
        const itemsData = itemsRes.data?.items || itemsRes.data?.data || []
        const normalizedItems = itemsData.map((item: Item) => ({
          ...item,
          nutritionalInfo: item.nutritionalInfo || DEFAULT_NUTRITIONAL_INFO,
          price: item.price || 0,
          preparationTime: item.preparationTime || 0,
          isActive: item.isActive !== undefined ? item.isActive : true,
          isFeatured: item.isFeatured || false,
          description: item.description || '',
          imageUrl: item.imageUrl || '/placeholder.svg'
        }))
        
        setItems(normalizedItems)
        setFilteredItems(normalizedItems)
      } catch (err) {
        console.error('Fetch error:', err)
        setError('Failed to load menu items. Please try again.')
        toast.error('Failed to load menu items')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // Fetch complete user data from database when session is available
  useEffect(() => {
    let isMounted = true;
    let hasFetched = false; // Add flag to prevent multiple fetches
    
    const fetchUserData = async () => {
      if (user?.id && !hasFetched) {
        try {
          setIsLoadingUser(true);
          setUserDataError(null);
          hasFetched = true; // Set flag immediately
          
          let userData = null;
          let userProfile = null;
          
          // Try multiple endpoints to get complete user data
          const endpoints = [
            `/users/${user.id}`,
            `/staff/${user.id}`,
            '/auth/current-user',
            `/customers/${user.id}`,
            `/profiles/${user.id}`
          ];
          
          for (const endpoint of endpoints) {
            try {
              const response = await api.get(endpoint);
              if (response.data) {
                let data = null;
                if (response.data.success && response.data.data) {
                  data = response.data.data;
                } else if (response.data.data) {
                  data = response.data.data;
                } else if (response.data.user) {
                  data = response.data.user;
                } else if (response.data.profile) {
                  userProfile = response.data.profile;
                } else {
                  data = response.data;
                }
                
                if (data) {
                  if (userData) {
                    userData = { ...userData, ...data };
                  } else {
                    userData = data;
                  }
                }
              }
            } catch (err) {
              console.log(`Endpoint ${endpoint} not available`);
            }
          }
          
          // Try to fetch user profile separately if not found in user data
          if (!userData?.phoneNumber || !userData?.address || !userData?.city) {
            try {
              const profileRes = await api.get(`/users/${user.id}/profile`);
              if (profileRes.data) {
                userProfile = profileRes.data.data || profileRes.data;
              }
            } catch (err) {
              console.log('Profile endpoint not available');
            }
          }
          
          if (isMounted) {
            if (userData || userProfile) {
              // Merge user data and profile
              const mergedUserData: UserData = {
                _id: user.id,
                firstName: userData?.firstName || userProfile?.firstName || user.name?.split(' ')[0] || '',
                lastName: userData?.lastName || userProfile?.lastName || user.name?.split(' ').slice(1).join(' ') || '',
                name: userData?.name || user.name || '',
                email: userData?.email || user.email || '',
                phoneNumber: userData?.phoneNumber || userProfile?.phoneNumber || '',
                address: userData?.address || userProfile?.address || '',
                city: userData?.city || userProfile?.city || '',
                role: userData?.role || user.role || 'user',
                profile: userProfile
              };
              
              setUserData(mergedUserData);
            } else {
              // Create basic user info from session
              const basicUserData: UserData = {
                _id: user.id,
                firstName: user.name?.split(' ')[0] || '',
                lastName: user.name?.split(' ').slice(1).join(' ') || '',
                name: user.name || '',
                email: user.email || '',
                phoneNumber: '',
                address: '',
                city: '',
                role: user.role || 'user'
              };
              setUserData(basicUserData);
              setUserDataError('Please complete your profile for faster checkout');
            }
          }
        } catch (err) {
          console.error('Error fetching user data:', err);
          if (isMounted && user) {
            // Create basic user info as fallback
            const basicUserData: UserData = {
              _id: user.id,
              firstName: user.name?.split(' ')[0] || '',
              lastName: user.name?.split(' ').slice(1).join(' ') || '',
              name: user.name || '',
              email: user.email || '',
              phoneNumber: '',
              address: '',
              city: '',
              role: user.role || 'user'
            };
            setUserData(basicUserData);
            setUserDataError('Using basic profile information');
          }
        } finally {
          if (isMounted) {
            setIsLoadingUser(false);
          }
        }
      } else {
        if (isMounted) {
          setUserData(null);
        }
      }
    }

    fetchUserData();
    
    return () => {
      isMounted = false;
    };
  }, [user?.id, user?.name, user?.email, user?.role]); // Keep dependencies minimal

  // Filter and sort items
  useEffect(() => {
    let result = items

    if (selectedCategory) {
      result = result.filter(item => item.categoryId === selectedCategory)
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      result = result.filter(item =>
        item.name.toLowerCase().includes(term) ||
        (item.description && item.description.toLowerCase().includes(term))
      )
    }

    result.sort((a, b) => {
      const aValue = a[sortField] || 0
      const bValue = b[sortField] || 0
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
      return 0
    })

    setFilteredItems(result)
  }, [items, selectedCategory, searchTerm, sortField, sortDirection])

  const handleSort = (field: 'name' | 'price' | 'preparationTime') => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const handleLoginRequired = (message: string) => {
    setLoginPromptMessage(message)
    setShowLoginPrompt(true)
  }

  const handleLogin = () => {
    setShowLoginPrompt(false)
    router.push('/login?callbackUrl=/menu')
  }

  const addToCart = useCallback((item: Item) => {
    if (!isUserLoggedIn) {
      handleLoginRequired('Please login to add items to your cart')
      return
    }

    // Check if item is active
    if (item.isActive === false) {
      toast.error(`Sorry, ${item.name} is currently unavailable`, {
        icon: '❌',
        duration: 3000,
      })
      return
    }
    
    setCart(prev => {
      const existing = prev.find(i => i._id === item._id)
      if (existing) {
        return prev.map(i => 
          i._id === item._id ? { ...i, quantity: i.quantity + 1 } : i
        )
      }
      return [...prev, { ...item, quantity: 1 }]
    })
    
    toast.success(`Added ${item.name} to cart`, {
      icon: '🛒',
      duration: 2000,
    })
  }, [isUserLoggedIn])

  const removeFromCart = useCallback((itemId: string) => {
    setCart(prev => prev.filter(item => item._id !== itemId))
    toast.success('Item removed from cart')
  }, [])

  const updateQuantity = useCallback((itemId: string, newQuantity: number) => {
    if (newQuantity < 1) {
      removeFromCart(itemId)
      return
    }
    setCart(prev => prev.map(item => 
      item._id === itemId ? { ...item, quantity: newQuantity } : item
    ))
  }, [removeFromCart])

  const subtotal = useMemo(() => 
    cart.reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0), 
    [cart]
  )
  
  const tax = useMemo(() => subtotal * 0.15, [subtotal])
  const discount = useMemo(() => applyDiscount ? subtotal * 0.1 : 0, [applyDiscount, subtotal])
  const deliveryFee = useMemo(() => orderType === 'delivery' ? 50 : 0, [orderType])
  const total = useMemo(() => subtotal + tax - discount + deliveryFee, [subtotal, tax, discount, deliveryFee])

  const handleDeliveryInfoChange = (field: keyof DeliveryInfo, value: string) => {
    setDeliveryInfo(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please upload an image file')
        return
      }
      
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB')
        return
      }
      
      const previewUrl = URL.createObjectURL(file)
      setPaymentScreenshot({
        file,
        previewUrl,
        uploaded: true
      })
      toast.success('Payment screenshot uploaded successfully')
    }
  }

  const removePaymentScreenshot = () => {
    if (paymentScreenshot.previewUrl) {
      URL.revokeObjectURL(paymentScreenshot.previewUrl)
    }
    setPaymentScreenshot({
      file: null,
      previewUrl: '',
      uploaded: false
    })
  }

  const validateDeliveryInfo = () => {
    const requiredFields: (keyof DeliveryInfo)[] = ['fullName', 'phoneNumber', 'email', 'address', 'city']
    for (const field of requiredFields) {
      if (!deliveryInfo[field]?.trim()) {
        toast.error(`Please fill in ${field.replace(/([A-Z])/g, ' $1').toLowerCase()}`)
        return false
      }
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(deliveryInfo.email)) {
      toast.error('Please enter a valid email address')
      return false
    }
    
    const phoneRegex = /^[0-9]{10}$/
    if (!phoneRegex.test(deliveryInfo.phoneNumber.replace(/\D/g, ''))) {
      toast.error('Please enter a valid 10-digit phone number')
      return false
    }
    
    return true
  }

  const handleFinalizeOrder = async () => {
    if (!isUserLoggedIn) {
      handleLoginRequired('Please login to place an order')
      return
    }

    if (paymentMethod === 'online' && !paymentScreenshot.uploaded) {
      toast.error('Please upload payment screenshot')
      return
    }

    setIsPlacingOrder(true)
    const orderToast = toast.loading('Placing your order...')

    try {
      const orderData = {
        orderNumber,
        orderType,
        tableNumber: orderType === 'table' ? tableNumber : undefined,
        waiterId: orderType === 'table' ? selectedWaiter : undefined,
        deliveryInfo: orderType === 'delivery' ? deliveryInfo : undefined,
        numberOfGuests,
        items: cart.map(item => ({
          itemId: item._id,
          quantity: item.quantity,
          specialInstructions: item.specialInstructions || '',
          price: item.price
        })),
        paymentMethod,
        transactionId: transactionId || undefined,
        subtotal,
        tax,
        discount,
        deliveryFee,
        total,
        specialRequirements,
        status: paymentMethod === 'cash' ? 'PENDING_CASH' : 'PENDING',
        delivery: orderType === 'delivery',
        inTable: orderType === 'table',
        userId: user?.id,
        userEmail: user?.email,
        userName: user?.name
      }

      const response = await api.post('/orders', orderData)

      if (response.data) {
        toast.success('Order placed successfully!', { id: orderToast })
        
        // Reset order state
        setCart([])
        setOrderNumber(`ORD-${Date.now().toString().slice(-6)}`)
        setOrderType('')
        setTableNumber('')
        setSelectedWaiter('')
        setPaymentScreenshot({
          file: null,
          previewUrl: '',
          uploaded: false
        })
        setPaymentMethod('')
        setTransactionId('')
        setApplyDiscount(false)
        setSpecialRequirements('')
        setShowPaymentUpload(false)
        
        // Keep delivery info for next order
        if (userData) {
          setDeliveryInfo(prev => ({
            ...prev,
            fullName: userData.firstName && userData.lastName 
              ? `${userData.firstName} ${userData.lastName}`.trim()
              : userData.name || '',
            email: userData.email || '',
            phoneNumber: userData.phoneNumber || prev.phoneNumber,
            address: userData.address || prev.address,
            city: userData.city || prev.city,
            landmark: '',
            deliveryInstructions: ''
          }));
        }
        
        // Simulate order progress
        let progress = 0
        const interval = setInterval(() => {
          progress += 10
          setOrderProgress(progress)
          if (progress >= 100) {
            clearInterval(interval)
            toast.success(
              paymentMethod === 'cash' 
                ? 'Order confirmed! Please have cash ready.' 
                : orderType === 'delivery' 
                  ? 'Your order is on the way!' 
                  : 'Your order is being prepared!'
            )
            setTimeout(() => {
              setOrderProgress(0)
            }, 2000)
          }
        }, 500)
      }
    } catch (error) {
      console.error('Error placing order:', error)
      toast.error('Failed to place order. Please try again.', { id: orderToast })
    } finally {
      setIsPlacingOrder(false)
    }
  }

  const handlePlaceOrder = async () => {
    if (!isUserLoggedIn) {
      handleLoginRequired('Please login to place an order')
      return
    }

    if (cart.length === 0) {
      toast.error('Please add items to your cart')
      return
    }

    if (!orderType) {
      toast.error('Please select order type')
      return
    }

    if (orderType === 'table') {
      if (!tableNumber) {
        toast.error('Please select a table number')
        return
      }
      if (!selectedWaiter) {
        toast.error('Please select a waitress/server')
        return
      }
    }

    if (orderType === 'delivery' && !validateDeliveryInfo()) {
      return
    }

    if (!paymentMethod) {
      toast.error('Please select a payment method')
      return
    }

    setShowPaymentUpload(true)
  }

  const handleViewDetails = (item: Item) => {
    setSelectedItem(item)
    setShowItemDetail(true)
  }

  const ItemCard = ({ item }: { item: Item }) => {
    const categoryName = categories.find(c => c._id === item.categoryId)?.name || 'Uncategorized'
    
    return (
      <Card className="h-full transition-all duration-300 hover:shadow-lg group">
        <CardHeader className="p-0 relative">
          <div className="relative w-full h-48">
            <Image
              src={item.imageUrl || "/placeholder.svg"}
              alt={item.name}
              fill
              className="object-cover rounded-t-lg"
              onError={(e) => {
                const target = e.target as HTMLImageElement
                target.src = '/placeholder.svg'
              }}
              unoptimized={item.imageUrl?.includes('cloudinary.com')}
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          </div>
          
          <div className="absolute top-2 right-2 bg-black/75 text-white text-xs font-semibold px-2 py-1 rounded-md backdrop-blur-sm">
            {(item.price || 0).toLocaleString()} ETB
          </div>
          
          {item.isFeatured && (
            <div className="absolute top-2 left-2 bg-primary/90 text-primary-foreground text-xs font-medium px-2 py-1 rounded-md backdrop-blur-sm flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              Featured
            </div>
          )}
          
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
            <Button
              variant="default"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                addToCart(item)
              }}
              className="rounded-full shadow-lg hover:shadow-primary/25 transition-all duration-300 transform hover:scale-105 bg-primary/90 backdrop-blur-sm"
              disabled={item.isActive === false}
            >
              <Plus className="mr-1 h-3.5 w-3.5" />
              {item.isActive === false ? 'Unavailable' : 'Add to cart'}
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="p-4">
          <CardTitle className="text-xl mb-2 group-hover:text-primary transition-colors line-clamp-1">
            {item.name}
          </CardTitle>
          <CardDescription className="text-sm text-gray-600 mb-4 line-clamp-2 min-h-[40px]">
            {item.description || 'No description available'}
          </CardDescription>
          
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-lg font-semibold">
                {(item.price || 0).toLocaleString()} ETB
              </Badge>
              <Badge variant="outline" className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {item.preparationTime || 0} mins
              </Badge>
            </div>
            
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation()
                  addToCart(item)
                }}
                className="h-8 w-8 rounded-full bg-primary/10 hover:bg-primary/20 text-primary"
                disabled={item.isActive === false}
              >
                <Plus className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation()
                  handleViewDetails(item)
                }}
                className="h-8 w-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700"
              >
                <Info className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
        
        <CardFooter className="p-4 pt-0">
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => handleViewDetails(item)}
          >
            <Info className="mr-2 h-4 w-4" />
            View Full Details
          </Button>
        </CardFooter>
      </Card>
    )
  }

  const ListViewItem = ({ item }: { item: Item }) => {
    return (
      <div className="flex border border-border/40 rounded-lg overflow-hidden hover:border-primary/30 transition-all bg-background hover:bg-background/95 hover:shadow-sm group">
        <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden">
          <Image
            src={item.imageUrl || "/placeholder.svg"}
            alt={item.name}
            fill
            sizes="96px"
            className="object-cover transition-transform duration-500 group-hover:scale-110"
            onError={(e) => {
              const target = e.target as HTMLImageElement
              target.src = '/placeholder.svg'
            }}
            unoptimized={item.imageUrl?.includes('cloudinary.com')}
          />
          {item.isFeatured && (
            <div className="absolute top-2 left-2 bg-primary/90 text-primary-foreground text-xs font-medium px-1.5 py-0.5 rounded flex items-center gap-1">
              <Sparkles className="h-2.5 w-2.5" />
              Featured
            </div>
          )}
        </div>
        
        <div className="flex-1 p-4 flex flex-col">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-medium text-lg group-hover:text-primary transition-colors line-clamp-1">
                {item.name}
              </h3>
              <p className="text-sm text-muted-foreground line-clamp-2 mt-1 min-h-[40px]">
                {item.description || 'No description available'}
              </p>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-lg font-medium text-primary">
                {(item.price || 0).toLocaleString()} ETB
              </span>
              <div className="flex gap-1 mt-2">
                <Badge variant="outline" className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {item.preparationTime || 0}m
                </Badge>
              </div>
            </div>
          </div>
          
          <div className="mt-auto pt-2 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                {categories.find(c => c._id === item.categoryId)?.name || 'Uncategorized'}
              </Badge>
            </div>
            
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => addToCart(item)}
                className="h-8 w-8 rounded-full bg-primary/10 hover:bg-primary/20 text-primary"
                disabled={item.isActive === false}
              >
                <Plus className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleViewDetails(item)}
                className="h-8 w-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700"
              >
                <Info className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <NavBar />
      
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => router.back()}
              className="rounded-full"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="text-4xl font-bold">Item Menu</h1>
          </div>
          
          <div className="flex items-center gap-4">
            {isUserLoggedIn && userData && (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-full">
                  <User className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">
                    {userData.firstName || userData.name || 'User'} {userData.lastName || ''}
                  </span>
                </div>
                {userData.phoneNumber && (
                  <div className="hidden md:flex items-center gap-1 text-xs text-gray-600">
                    <Phone className="h-3 w-3" />
                    {userData.phoneNumber}
                  </div>
                )}
              </div>
            )}
            
            <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
              <SheetTrigger asChild>
                <Button variant="default" className="relative">
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  Cart
                  {cart.length > 0 && (
                    <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {cart.length}
                    </span>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-full sm:max-w-lg">
                <CartPanel 
                  cart={cart}
                  onClose={() => setIsCartOpen(false)}
                  onRemoveItem={removeFromCart}
                  onUpdateQuantity={updateQuantity}
                  orderType={orderType}
                  onOrderTypeChange={setOrderType}
                  tableNumber={tableNumber}
                  onTableNumberChange={setTableNumber}
                  waiters={waiters}
                  selectedWaiter={selectedWaiter}
                  onWaiterChange={setSelectedWaiter}
                  deliveryInfo={deliveryInfo}
                  onDeliveryInfoChange={handleDeliveryInfoChange}
                  numberOfGuests={numberOfGuests}
                  onGuestsChange={setNumberOfGuests}
                  specialRequirements={specialRequirements}
                  onSpecialRequirementsChange={setSpecialRequirements}
                  paymentMethod={paymentMethod}
                  onPaymentMethodChange={setPaymentMethod}
                  applyDiscount={applyDiscount}
                  onApplyDiscountChange={setApplyDiscount}
                  subtotal={subtotal}
                  tax={tax}
                  discount={discount}
                  deliveryFee={deliveryFee}
                  total={total}
                  orderNumber={orderNumber}
                  onPlaceOrder={handlePlaceOrder}
                  isPlacingOrder={isPlacingOrder}
                  isUserLoggedIn={isUserLoggedIn}
                  userData={userData}
                  userDataError={userDataError}
                  onLoginRequired={handleLoginRequired}
                />
              </SheetContent>
            </Sheet>
          </div>
        </div>
        
        <div className="sticky top-0 z-10 bg-gray-100 py-4 mb-8 space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-3 text-gray-400" size={20} />
              <Input
                type="text"
                placeholder="Search items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select onValueChange={(value) => setSelectedCategory(value === 'all' ? null : value)}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category._id} value={category._id}>
                    <div className="flex items-center gap-2">
                      {getCategoryIcon(category.type)}
                      {category.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSort('name')}
                className="flex items-center gap-1"
              >
                Name
                {sortField === 'name' && (sortDirection === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />)}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSort('price')}
                className="flex items-center gap-1"
              >
                Price
                {sortField === 'price' && (sortDirection === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />)}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSort('preparationTime')}
                className="flex items-center gap-1"
              >
                Prep Time
                {sortField === 'preparationTime' && (sortDirection === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />)}
              </Button>
            </div>
            
            <div className="ml-auto flex gap-2">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="icon"
                onClick={() => setViewMode('grid')}
              >
                <Grid size={20} />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="icon"
                onClick={() => setViewMode('list')}
              >
                <List size={20} />
              </Button>
            </div>
          </div>
        </div>

        <ScrollArea className="h-[calc(100vh-300px)]">
          {loading || sessionStatus === 'loading' || isLoadingUser ? (
            <div className={`grid gap-8 ${viewMode === 'grid' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1'}`}>
              {[...Array(8)].map((_, index) => (
                <Card key={index} className="h-full">
                  <Skeleton className="h-48 w-full rounded-t-lg" />
                  <CardContent className="p-4">
                    <Skeleton className="h-6 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-full mb-4" />
                    <Skeleton className="h-10 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : error ? (
            <div className="text-center text-red-500 p-8">
              <p className="text-lg">{error}</p>
              <Button onClick={() => window.location.reload()} className="mt-4">
                Try Again
              </Button>
            </div>
          ) : (
            <motion.div
              layout
              className={`grid gap-6 ${viewMode === 'grid' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1'}`}
            >
              <AnimatePresence>
                {filteredItems.map((item) => (
                  <motion.div
                    key={item._id}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    {viewMode === 'grid' ? (
                      <ItemCard item={item} />
                    ) : (
                      <ListViewItem item={item} />
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </ScrollArea>
      </main>

      <LoginPromptDialog 
        open={showLoginPrompt}
        onOpenChange={setShowLoginPrompt}
        onLogin={handleLogin}
        message={loginPromptMessage}
      />

      {selectedItem && (
        <ItemDetailDialog 
          item={selectedItem}
          categoryName={categories.find(c => c._id === selectedItem.categoryId)?.name || 'Uncategorized'}
          isOpen={showItemDetail}
          onOpenChange={setShowItemDetail}
          onAddToCart={addToCart}
          isUserLoggedIn={isUserLoggedIn}
          onLoginRequired={handleLoginRequired}
        />
      )}

      <PaymentUploadDialog 
        open={showPaymentUpload}
        onOpenChange={setShowPaymentUpload}
        paymentScreenshot={paymentScreenshot}
        onRemoveScreenshot={removePaymentScreenshot}
        onFileUpload={handleFileUpload}
        transactionId={transactionId}
        onTransactionIdChange={setTransactionId}
        subtotal={subtotal}
        tax={tax}
        discount={discount}
        orderType={orderType}
        deliveryFee={deliveryFee}
        total={total}
        onFinalizeOrder={handleFinalizeOrder}
        isPlacingOrder={isPlacingOrder}
        paymentMethod={paymentMethod}
      />

      {orderProgress > 0 && orderProgress < 100 && (
        <motion.div
          className="fixed bottom-5 right-5 bg-background/95 backdrop-blur-sm p-4 rounded-xl shadow-lg border border-primary/20 z-50 w-64"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
        >
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium flex items-center gap-2">
              <div className="bg-primary/20 rounded-full p-1.5">
                <ChefHat className="h-4 w-4 text-primary animate-pulse" />
              </div>
              {orderType === 'delivery' ? 'Preparing Delivery' : 'Preparing Order'}
            </h3>
            <Badge className="bg-primary/20 text-primary border-none">
              {orderProgress}%
            </Badge>
          </div>
          <Progress value={orderProgress} className="w-full h-2 bg-primary/10" />
          <p className="text-xs text-muted-foreground mt-2">
            {orderType === 'delivery' 
              ? 'Your order is being prepared for delivery...' 
              : 'Your order is being prepared...'}
          </p>
        </motion.div>
      )}
    </div>
  )
}