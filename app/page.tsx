
'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, X, ChevronDown, ChevronUp, Clock, DollarSign, Tag, Utensils,
  Grid, List, ShoppingCart, Plus, Minus, ChefHat, Sparkles, ArrowLeft,
  MapPin, Home, Users, Info, RefreshCw, LogIn, AlertCircle, Loader2,
  Navigation, WifiOff, Truck, Star, Heart, Share2, Eye,
  Filter, SortAsc, SortDesc, Layers, Coffee, Pizza, Salad, ChefHat as Chef
} from 'lucide-react'
import axios, { AxiosResponse } from 'axios'

// UI Components
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { NavBar } from '@/components/NavBar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

// Custom Hooks and Providers
import { useUserData } from '@/providers/UserDataProvider'
import { useCart } from '@/hooks/useCart'

// Components
import { CartPanel } from '@/components/cart/CartPanel'
import { PaymentUploadDialog } from '@/components/cart/PaymentUploadDialog'
import { LoginPromptDialog } from '@/components/auth/LoginPromptDialog'
import { TableSelector, TableData as TableSelectorTableData } from '@/components/menu/TableSelector'

// Utils
import { EnhancedDeliveryCalculator, DeliveryError } from '@/types/utils/enhancedDeliveryCalculator'

// Types
import {
  Category, Item, Waiter, UserData,
  DeliveryFeeDetails, PaymentScreenshot
} from '@/types'

// Constants
const API_TIMEOUT = 30000
const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'dnqsoezfo'
const CLOUDINARY_UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'photoupload'

// API Client
const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' }
})

api.interceptors.response.use(undefined, async (err) => {
  const config = err.config
  if (!config || !config.retry) {
    return Promise.reject(err)
  }
  config.retryCount = config.retryCount || 0
  if (config.retryCount >= 3) {
    return Promise.reject(err)
  }
  config.retryCount += 1
  const delay = new Promise(resolve => setTimeout(resolve, 1000 * config.retryCount))
  await delay
  return api(config)
})

interface ApiResponse<T> {
  data?: T
  message?: string
  error?: string
}

interface TableData extends TableSelectorTableData {
  restaurantId?: string;
  restaurantName?: string;
  floor?: string;
}

// ============ UTILITY FUNCTIONS ============

const getCategoryIcon = (type: string, className?: string) => {
  switch (type?.toLowerCase()) {
    case 'food': return <Utensils className={className || "h-4 w-4"} />
    case 'drink': return <Coffee className={className || "h-4 w-4"} />
    case 'dessert': return <Sparkles className={className || "h-4 w-4"} />
    case 'appetizer': return <Salad className={className || "h-4 w-4"} />
    case 'main course': return <Pizza className={className || "h-4 w-4"} />
    default: return <Layers className={className || "h-4 w-4"} />
  }
}

const getImageSrc = (imageUrl?: string): string => {
  if (!imageUrl) return '/placeholder.svg'
  if (imageUrl.startsWith('http')) return imageUrl
  if (imageUrl.startsWith('/uploads')) return imageUrl
  return `/uploads/${imageUrl}`
}

const preloadImages = (urls: string[]) => {
  urls.forEach(url => {
    if (url && url !== '/placeholder.svg') {
      const img = new Image()
      img.src = url
    }
  })
}

const autoAssignWaiter = (tableNumber: string, waiters: Waiter[]): string => {
  if (!tableNumber || waiters.length === 0) return ''
  
  const tableNumberMatch = tableNumber.match(/\d+/)
  const tableNum = tableNumberMatch ? parseInt(tableNumberMatch[0]) : 0
  
  if (tableNum === 0) return waiters[0]?._id || ''
  
  const waiterCount = waiters.length
  const tablesPerWaiter = Math.ceil(30 / waiterCount)
  
  let assignedWaiterIndex = Math.floor((tableNum - 1) / tablesPerWaiter)
  
  if (assignedWaiterIndex >= waiterCount) {
    assignedWaiterIndex = waiterCount - 1
  }
  if (assignedWaiterIndex < 0) {
    assignedWaiterIndex = 0
  }
  
  return waiters[assignedWaiterIndex]?._id || ''
}

// Check if category should be hidden (packaging category)
const shouldHideCategory = (category: Category): boolean => {
  const name = category.name?.toLowerCase() || ''
  const type = category.type?.toLowerCase() || ''
   return name.includes('packaging') || 
         type === 'packaging' || 
         name.includes('packing') || 
         name.includes('package') ||
         name.includes('staff food') ||     // ✅ Add this
         name.includes('staff meal') ||     // ✅ Add this
         name === 'staff'
}

// Get category additional charge (only for delivery orders)
const getCategoryAdditionalCharge = (categoryName: string, categoryType?: string): number => {
  const name = categoryName?.toLowerCase() || ''
  const type = categoryType?.toLowerCase() || ''
  
  if (name.includes('food') || type === 'food' || name.includes('main course') || name.includes('appetizer')) {
    return 60
  }
  if (name.includes('juice') || type === 'juice') {
    return 60
  }
  if (name.includes('mocktail') || type === 'mocktail') {
    return 60
  }
  if (name.includes('hot drink') || name.includes('coffee') || name.includes('tea') || type === 'hot drink') {
    return 30
  }
  return 0
}

// Check if item is a food item (for packaging charge)
const isFoodItem = (category: Category | undefined): boolean => {
  if (!category) return false
  const name = category.name?.toLowerCase() || ''
  const type = category.type?.toLowerCase() || ''
  return name.includes('food') || type === 'food' || 
         name.includes('main course') || name.includes('appetizer')
}

// Calculate packaging charge (only for delivery) - 100 ETB per 4 food items
const calculatePackagingCharge = (cartItems: any[], categories: Category[], isDelivery: boolean): number => {
  if (!isDelivery) return 0
  
  const foodItemCount = cartItems.reduce((count, item) => {
    const category = categories.find(c => c._id === item.categoryId)
    if (isFoodItem(category)) {
      return count + (item.quantity || 1)
    }
    return count
  }, 0)
  
  if (foodItemCount === 0) return 0
  
  // Calculate number of "4-item groups" and charge 100 ETB per group
  // Example: 1-4 items = 100, 5-8 items = 200, 9-12 items = 300, etc.
  const groupsOfFour = Math.ceil(foodItemCount / 4)
  return groupsOfFour * 100
}

// ============ ITEM CARD COMPONENT ============
const ItemCard = ({
  item,
  categoryName,
  onAddToCart,
  onViewDetails,
  isUserLoggedIn,
  onLoginRequired,
  index = 0
}: {
  item: Item
  categoryName: string
  onAddToCart: (item: Item) => void
  onViewDetails: (item: Item) => void
  isUserLoggedIn: boolean
  onLoginRequired: (message: string) => void
  index?: number
}) => {
  const [isHovered, setIsHovered] = useState(false)
  const [isImageLoaded, setIsImageLoaded] = useState(false)
  
  const priceWithTax = Number(item.price)

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!isUserLoggedIn) {
      onLoginRequired('Please login to add items to your cart')
      return
    }
    if (item.isActive === false) {
      toast.error(`Sorry, ${item.name} is currently unavailable`)
      return
    }
    onAddToCart(item)
    toast.success(`Added ${item.name} to cart`, {
      icon: '🛒',
      style: {
        borderRadius: '10px',
        background: '#4a1d6d',
        color: '#fff',
      },
    })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      whileHover={{ y: -8 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
    >
      <Card className="group relative overflow-hidden border-0 bg-white/90 backdrop-blur-sm shadow-xl hover:shadow-2xl transition-all duration-500 rounded-3xl">
        <div className="absolute inset-0 bg-gradient-to-t from-purple-900/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-10 rounded-3xl" />

        <div className="relative h-56 overflow-hidden rounded-t-3xl">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-900/10 to-transparent z-10 mix-blend-overlay" />

          {!isImageLoaded && (
            <Skeleton className="absolute inset-0 bg-gradient-to-r from-gray-200 via-purple-100 to-gray-200 animate-shimmer" />
          )}

          <img
            src={getImageSrc(item.imageUrl)}
            alt={item.name}
            className={`object-cover w-full h-full transition-all duration-700 ${isHovered ? 'scale-110 rotate-1' : 'scale-100'
              } ${isImageLoaded ? 'opacity-100' : 'opacity-0'}`}
            onLoad={() => setIsImageLoaded(true)}
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/placeholder.svg'
              setIsImageLoaded(true)
            }}
          />

          <div className="absolute top-0 left-0 w-32 h-32 bg-gradient-to-br from-purple-900/20 to-transparent rounded-full -translate-x-16 -translate-y-16 blur-2xl" />
          <div className="absolute bottom-0 right-0 w-40 h-40 bg-gradient-to-tl from-purple-900/20 to-transparent rounded-full translate-x-20 translate-y-20 blur-2xl" />

          <div className="absolute top-4 right-4 z-20">
            <div className="bg-white/95 backdrop-blur-sm text-purple-900 font-bold px-4 py-2 rounded-full shadow-lg border border-purple-200 flex flex-col items-end">
              <div className="flex items-center gap-1">
                <span>{priceWithTax.toLocaleString()} ETB</span>
              </div>
              <div className="text-xs text-gray-500 font-normal mt-0.5">
                incl. VAT
              </div>
            </div>
          </div>

          {item.isFeatured && (
            <div className="absolute top-4 left-4 z-20">
              <div className="bg-gradient-to-r from-purple-800 to-purple-900 text-white text-xs font-medium px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1 backdrop-blur-sm">
                <Sparkles className="h-3 w-3" />
                <span>Featured</span>
              </div>
            </div>
          )}

          <div className={`absolute inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center gap-3 transition-all duration-300 z-30 ${isHovered ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="secondary"
                    className="rounded-full bg-white/90 hover:bg-white shadow-lg hover:scale-110 transition-all"
                    onClick={(e) => {
                      e.stopPropagation()
                      onViewDetails(item)
                    }}
                  >
                    <Eye className="h-4 w-4 text-purple-900" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Quick view</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="secondary"
                    className="rounded-full bg-white/90 hover:bg-white shadow-lg hover:scale-110 transition-all"
                    onClick={handleAddToCart}
                    disabled={item.isActive === false}
                  >
                    <ShoppingCart className="h-4 w-4 text-purple-900" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Add to cart</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        <CardContent className="p-5 relative z-10">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="text-xl font-bold text-gray-800 mb-1 line-clamp-1 group-hover:text-purple-900 transition-colors">
                {item.name}
              </h3>
              <p className="text-sm text-gray-500 line-clamp-2 min-h-[40px]">
                {item.description || 'No description available'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 mb-4">
            <Badge variant="secondary" className="bg-purple-50 text-purple-900 border-purple-200 rounded-full px-3 py-1 text-xs font-medium">
              {getCategoryIcon(categoryName, "h-3 w-3 mr-1")}
              {categoryName}
            </Badge>
            <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200 rounded-full px-3 py-1 text-xs font-medium flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {Number(item.preparationTime) || 0} min
            </Badge>
          </div>

          <Separator className="my-3 bg-gradient-to-r from-transparent via-purple-200 to-transparent" />

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 fill-purple-900 text-purple-900" />
              <Star className="h-4 w-4 fill-purple-900 text-purple-900" />
              <Star className="h-4 w-4 fill-purple-900 text-purple-900" />
              <Star className="h-4 w-4 fill-purple-900 text-purple-900" />
              <Star className="h-4 w-4 fill-purple-300 text-purple-300" />
              <span className="text-xs text-gray-500 ml-1">(24)</span>
            </div>

            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleAddToCart}
              disabled={item.isActive === false}
              className={`relative overflow-hidden group/btn rounded-full p-2.5 transition-all ${item.isActive === false
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-purple-800 to-purple-900 text-white shadow-lg hover:shadow-xl'
                }`}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000" />
              <Plus className="h-5 w-5" />
            </motion.button>
          </div>
        </CardContent>

        <div className="absolute bottom-0 right-0 w-16 h-16 bg-gradient-to-tl from-purple-900/20 to-transparent rounded-tl-full" />
      </Card>
    </motion.div>
  )
}

// ============ LIST VIEW COMPONENT ============
const ListViewItem = ({
  item,
  categoryName,
  onAddToCart,
  onViewDetails,
  isUserLoggedIn,
  onLoginRequired,
  index = 0
}: {
  item: Item
  categoryName: string
  onAddToCart: (item: Item) => void
  onViewDetails: (item: Item) => void
  isUserLoggedIn: boolean
  onLoginRequired: (message: string) => void
  index?: number
}) => {
  const [isHovered, setIsHovered] = useState(false)
  
  const priceWithTax = Number(item.price)

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!isUserLoggedIn) {
      onLoginRequired('Please login to add items to your cart')
      return
    }
    if (item.isActive === false) {
      toast.error(`Sorry, ${item.name} is currently unavailable`)
      return
    }
    onAddToCart(item)
    toast.success(`Added ${item.name} to cart`, {
      icon: '🛒',
      style: {
        borderRadius: '10px',
        background: '#4a1d6d',
        color: '#fff',
      },
    })
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      whileHover={{ scale: 1.02, x: 4 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
    >
      <Card className={`relative overflow-hidden border-0 bg-white/90 backdrop-blur-sm shadow-md hover:shadow-xl transition-all duration-500 rounded-2xl ${isHovered ? 'border-l-4 border-l-purple-900' : ''
        }`}>
        <div className="flex flex-col md:flex-row">
          <div className="relative md:w-48 h-48 md:h-auto overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-900/10 to-transparent z-10 mix-blend-overlay" />
            <img
              src={getImageSrc(item.imageUrl)}
              alt={item.name}
              className="object-cover w-full h-full transition-transform duration-700"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/placeholder.svg'
              }}
            />

            {item.isFeatured && (
              <div className="absolute top-3 left-3 z-20">
                <Badge className="bg-gradient-to-r from-purple-800 to-purple-900 text-white border-0 shadow-lg">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Featured
                </Badge>
              </div>
            )}
          </div>

          <div className="flex-1 p-6">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-2xl font-bold text-gray-800 group-hover:text-purple-900 transition-colors">
                    {item.name}
                  </h3>
                  {item.isActive === false && (
                    <Badge variant="destructive" className="rounded-full">
                      Unavailable
                    </Badge>
                  )}
                </div>

                <p className="text-gray-600 mb-4 line-clamp-2">
                  {item.description || 'No description available'}
                </p>

                <div className="flex flex-wrap items-center gap-3 mb-4">
                  <Badge variant="secondary" className="bg-purple-50 text-purple-900 border-purple-200 rounded-full px-3 py-1.5">
                    {getCategoryIcon(categoryName, "h-3.5 w-3.5 mr-1")}
                    {categoryName}
                  </Badge>
                  <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200 rounded-full px-3 py-1.5 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {Number(item.preparationTime) || 0} min
                  </Badge>
                  <Badge variant="outline" className="bg-purple-50 text-purple-900 border-purple-200 rounded-full px-3 py-1.5 flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 fill-purple-900 text-purple-900" />
                    4.5 (24 reviews)
                  </Badge>
                </div>

                <div className="flex flex-wrap gap-2">
                  <div className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                    🔥 {item.nutritionalInfo?.calories || 0} cal
                  </div>
                  <div className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                    💪 {item.nutritionalInfo?.protein || 0}g protein
                  </div>
                  <div className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                    🥑 {item.nutritionalInfo?.fat || 0}g fat
                  </div>
                </div>
              </div>

              <div className="flex flex-row md:flex-col items-center md:items-end gap-4 md:gap-3">
                <div className="text-right">
                  <div className="text-3xl font-bold text-purple-900">
                    {priceWithTax.toLocaleString()} <span className="text-sm font-normal text-gray-500">ETB</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">incl. VAT</div>
                </div>

                <div className="flex gap-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="icon"
                          variant="outline"
                          className="rounded-full border-gray-200 hover:border-purple-300 hover:bg-purple-50"
                          onClick={() => onViewDetails(item)}
                        >
                          <Eye className="h-4 w-4 text-purple-900" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>View details</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="icon"
                          onClick={handleAddToCart}
                          disabled={item.isActive === false}
                          className={`rounded-full ${item.isActive === false
                              ? 'bg-gray-200 text-gray-400'
                              : 'bg-gradient-to-r from-purple-800 to-purple-900 text-white hover:from-purple-900 hover:to-purple-950 shadow-md hover:shadow-lg'
                            }`}
                        >
                          <ShoppingCart className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Add to cart</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={`absolute inset-0 bg-gradient-to-r from-purple-900/5 to-transparent pointer-events-none transition-opacity duration-500 ${isHovered ? 'opacity-100' : 'opacity-0'
          }`} />
      </Card>
    </motion.div>
  )
}

// ============ ITEM DETAIL DIALOG ============
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
  const nutritionalInfo = item.nutritionalInfo || {
    calories: 0,
    protein: 0,
    carbohydrates: 0,
    fat: 0
  }
  
  const priceWithTax = Number(item.price)

  const handleAddToCartClick = () => {
    if (!isUserLoggedIn) {
      onLoginRequired('Please login to add items to your cart')
      return
    }
    onAddToCart(item)
    onOpenChange(false)
    toast.success(`Added ${item.name} to cart`, {
      icon: '🛒',
      style: {
        borderRadius: '10px',
        background: '#4a1d6d',
        color: '#fff',
      },
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto p-0 bg-gradient-to-br from-white to-purple-50/30 border-0 shadow-2xl rounded-3xl">
        <div className="relative">
          <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-purple-900/20 to-transparent rounded-t-3xl" />

          <DialogHeader className="p-6 pb-0 relative">
            <DialogTitle className="text-3xl font-bold flex items-center gap-3 text-gray-800">
              <div className="p-3 bg-gradient-to-br from-purple-800 to-purple-900 rounded-2xl shadow-lg">
                <Info className="h-6 w-6 text-white" />
              </div>
              {item.name}
            </DialogTitle>
          </DialogHeader>

          <div className="p-6 space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="relative group">
                <div className="absolute -inset-2 bg-gradient-to-r from-purple-700 to-purple-900 rounded-3xl blur-lg opacity-50 group-hover:opacity-75 transition-opacity" />
                <div className="relative h-80 rounded-2xl overflow-hidden shadow-xl">
                  <img
                    src={getImageSrc(item.imageUrl)}
                    alt={item.name}
                    className="object-cover w-full h-full transition-transform duration-700 group-hover:scale-110"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/placeholder.svg'
                    }}
                  />
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-purple-100">
                  <h3 className="text-xl font-semibold mb-3 flex items-center gap-2 text-gray-800">
                    <Chef className="h-5 w-5 text-purple-900" />
                    Description
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    {item.description || 'No description available'}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gradient-to-br from-purple-50 to-white p-5 rounded-xl shadow-md border border-purple-100">
                    <div className="flex items-center gap-2 text-purple-900 mb-2">
                      <DollarSign className="h-5 w-5" />
                      <span className="font-medium">Price (incl. VAT)</span>
                    </div>
                    <p className="text-3xl font-bold text-purple-900">
                      {priceWithTax.toFixed(2)} <span className="text-sm font-normal text-gray-500">ETB</span>
                    </p>
                  </div>

                  <div className="bg-gradient-to-br from-blue-50 to-white p-5 rounded-xl shadow-md border border-blue-100">
                    <div className="flex items-center gap-2 text-blue-700 mb-2">
                      <Clock className="h-5 w-5" />
                      <span className="font-medium">Prep Time</span>
                    </div>
                    <p className="text-3xl font-bold text-blue-600">
                      {Number(item.preparationTime) || 0} <span className="text-sm font-normal text-gray-500">min</span>
                    </p>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-white p-5 rounded-xl shadow-md border border-purple-100">
                  <h4 className="font-medium text-purple-900 mb-3 flex items-center gap-2">
                    <Tag className="h-4 w-4" />
                    Category
                  </h4>
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      {getCategoryIcon(categoryName, "h-5 w-5 text-purple-900")}
                    </div>
                    <span className="text-lg font-medium text-gray-700">{categoryName}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-purple-100">
              <h3 className="text-xl font-semibold mb-6 flex items-center gap-2 text-gray-800">
                <Sparkles className="h-5 w-5 text-purple-900" />
                Nutritional Information
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-gradient-to-br from-green-50 to-white rounded-xl shadow-sm border border-green-100">
                  <p className="text-3xl font-bold text-green-600 mb-1">{Number(nutritionalInfo.calories) || 0}</p>
                  <p className="text-sm text-gray-600 flex items-center justify-center gap-1">
                    <span>🔥</span> Calories
                  </p>
                </div>
                <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-white rounded-xl shadow-sm border border-blue-100">
                  <p className="text-3xl font-bold text-blue-600 mb-1">{Number(nutritionalInfo.protein) || 0}g</p>
                  <p className="text-sm text-gray-600 flex items-center justify-center gap-1">
                    <span>💪</span> Protein
                  </p>
                </div>
                <div className="text-center p-4 bg-gradient-to-br from-yellow-50 to-white rounded-xl shadow-sm border border-yellow-100">
                  <p className="text-3xl font-bold text-yellow-600 mb-1">{Number(nutritionalInfo.carbohydrates) || 0}g</p>
                  <p className="text-sm text-gray-600 flex items-center justify-center gap-1">
                    <span>🌾</span> Carbs
                  </p>
                </div>
                <div className="text-center p-4 bg-gradient-to-br from-red-50 to-white rounded-xl shadow-sm border border-red-100">
                  <p className="text-3xl font-bold text-red-600 mb-1">{Number(nutritionalInfo.fat) || 0}g</p>
                  <p className="text-sm text-gray-600 flex items-center justify-center gap-1">
                    <span>🥑</span> Fat
                  </p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="p-6 pt-0 gap-3">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="rounded-full px-6 border-2 border-gray-200 hover:border-purple-300 hover:bg-purple-50"
            >
              Close
            </Button>
            <Button
              onClick={handleAddToCartClick}
              className="rounded-full px-8 bg-gradient-to-r from-purple-800 to-purple-900 hover:from-purple-900 hover:to-purple-950 text-white border-0 shadow-lg hover:shadow-xl transition-all"
            >
              <ShoppingCart className="mr-2 h-5 w-5" />
              Add to Cart
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ============ MAIN COMPONENT ============
export default function MenuPage() {
  const router = useRouter()
  const { userData, isLoggedIn } = useUserData()
  const {
    cart,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    subtotal: baseSubtotal,
    totalItems
  } = useCart()

  // State
  const [categories, setCategories] = useState<Category[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [filteredItems, setFilteredItems] = useState<Item[]>([])
  const [waiters, setWaiters] = useState<Waiter[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortField, setSortField] = useState<'name' | 'price' | 'preparationTime'>('name')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [loading, setLoading] = useState(true)
  const [loadingTimeout, setLoadingTimeout] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [imagesPreloaded, setImagesPreloaded] = useState(false)

  const [showLoginPrompt, setShowLoginPrompt] = useState(false)
  const [loginPromptMessage, setLoginPromptMessage] = useState('Please login to continue')

  const [selectedItem, setSelectedItem] = useState<Item | null>(null)
  const [showItemDetail, setShowItemDetail] = useState(false)

  const [isCartOpen, setIsCartOpen] = useState(false)
  const [orderProgress, setOrderProgress] = useState(0)
  const [orderNumber, setOrderNumber] = useState(`ORD-${Date.now().toString().slice(-6)}`)

  const [orderType, setOrderType] = useState<'table' | 'delivery' | ''>('')
  const [tableNumber, setTableNumber] = useState('')
  const [selectedTableData, setSelectedTableData] = useState<TableData | null>(null)
  const [numberOfGuests, setNumberOfGuests] = useState(1)
  const [specialRequirements, setSpecialRequirements] = useState('')
  const [arrangementId, setArrangementId] = useState('')

  const [paymentScreenshot, setPaymentScreenshot] = useState<PaymentScreenshot>({
    file: null,
    previewUrl: '',
    uploaded: false
  })
  const [transactionId, setTransactionId] = useState('')
  const [isPlacingOrder, setIsPlacingOrder] = useState(false)
  const [showPaymentUpload, setShowPaymentUpload] = useState(false)

  const [deliveryFee, setDeliveryFee] = useState<DeliveryFeeDetails | null>(null)
  const [isCalculatingDelivery, setIsCalculatingDelivery] = useState(false)

  const deliveryCalculator = useMemo(() => new EnhancedDeliveryCalculator(), [])

  const abortControllerRef = useRef<AbortController | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Calculate packaging charge (only for delivery)
  const packagingCharge = useMemo(() => {
    return calculatePackagingCharge(cart, categories, orderType === 'delivery')
  }, [cart, categories, orderType])

  // Calculate category additional charges total (only for delivery)
  const categoryChargesTotal = useMemo(() => {
    if (orderType !== 'delivery') return 0
    
    return cart.reduce((total, cartItem) => {
      const category = categories.find(c => c._id === cartItem.categoryId)
      const charge = getCategoryAdditionalCharge(category?.name || '', category?.type)
      return total + (charge * (cartItem.quantity || 1))
    }, 0)
  }, [cart, categories, orderType])

  // Calculate adjusted subtotal with category charges (only for delivery)
  const adjustedSubtotal = useMemo(() => {
    if (orderType !== 'delivery') return baseSubtotal
    return baseSubtotal + categoryChargesTotal
  }, [baseSubtotal, categoryChargesTotal, orderType])

  // Calculate tax (15% VAT)
  const calculatedTax = useMemo(() => {
    return adjustedSubtotal * 0.15
  }, [adjustedSubtotal])

  // Fetch arrangement ID - FIXED: Silently handle 404
  useEffect(() => {
    const fetchArrangementId = async () => {
      try {
        const response = await api.get('/api/tables/arrangement', {
          params: { 
            restaurantId: 'manyazewal1', 
            floor: 'Ground Floor' 
          }
        })
        if (response.data?.data?._id) {
          setArrangementId(response.data.data._id)
        }
      } catch (error: any) {
        // Silently handle 404 - arrangement not configured yet
        if (error.response?.status === 404) {
          console.log('Table arrangement not configured yet')
        } else {
          console.error('Error fetching arrangement:', error)
        }
      }
    }
    fetchArrangementId()
  }, [])

  const handleTableSelect = useCallback((table: TableData | null, restaurantId?: string, floor?: string) => {
    if (!table) {
      setSelectedTableData(null)
      setTableNumber('')
      setOrderType('')
      toast.success('Table unselected')
      return
    }
    
    const tableWithDetails: TableData = {
      ...table,
      restaurantId: restaurantId || table.restaurantId,
      restaurantName: table.restaurantName,
      floor: floor || table.floor
    }
    
    setSelectedTableData(tableWithDetails)
    setTableNumber(table.number.toString())
    setOrderType('table')
    
    toast.success(`Table ${table.number} selected! ${tableWithDetails.restaurantName ? `Restaurant: ${tableWithDetails.restaurantName}, ` : ''}Capacity: ${table.capacity} seats`)
    
    if (table.capacity && table.capacity < numberOfGuests) {
      setNumberOfGuests(table.capacity)
      toast(`Number of guests adjusted to table capacity (${table.capacity})`, { icon: 'ℹ️' })
    }
  }, [numberOfGuests])

  // Fetch menu data - Filter out packaging categories
  const fetchMenuData = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    const controller = new AbortController()
    abortControllerRef.current = controller

    timeoutRef.current = setTimeout(() => {
      if (loading) {
        setLoadingTimeout(true)
        toast.error('Loading is taking longer than expected...', {
          duration: 5000,
          icon: '⏳',
          style: {
            borderRadius: '10px',
            background: '#4a1d6d',
            color: '#fff',
          },
        })
      }
    }, 25000)

    try {
      setLoading(true)
      setLoadingTimeout(false)

      const timeoutPromise = (ms: number) => new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), ms)
      )

      const categoriesPromise = api.get('/item-category', {
        signal: controller.signal,
        timeout: 30000
      })

      const itemsPromise = api.get('/items', {
        signal: controller.signal,
        timeout: 30000
      })

      const waitersPromise = api.get('/waitress', {
        signal: controller.signal,
        timeout: 30000
      }).catch(() => ({ data: [] }))

      const [categoriesRes, itemsRes, waitersRes] = await Promise.allSettled([
        Promise.race([categoriesPromise, timeoutPromise(30000)]),
        Promise.race([itemsPromise, timeoutPromise(30000)]),
        Promise.race([waitersPromise, timeoutPromise(30000)])
      ])

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }

      if (categoriesRes.status === 'fulfilled') {
        const response = categoriesRes.value as AxiosResponse<ApiResponse<Category[]>>
        let categoriesData: Category[] = []
        const catData = response.data as any

        if (Array.isArray(catData)) categoriesData = catData
        else if (catData?.data && Array.isArray(catData.data)) categoriesData = catData.data
        else if (catData?.categories && Array.isArray(catData.categories)) categoriesData = catData.categories

        // Filter out packaging categories
        const visibleCategories = categoriesData.filter(cat => !shouldHideCategory(cat))
        setCategories(visibleCategories)
      }

      if (itemsRes.status === 'fulfilled') {
        const response = itemsRes.value as AxiosResponse<ApiResponse<any[]>>

        let itemsData: any[] = []
        const itemData = response.data as any

        if (Array.isArray(itemData)) itemsData = itemData
        else if (itemData?.data && Array.isArray(itemData.data)) itemsData = itemData.data
        else if (itemData?.items && Array.isArray(itemData.items)) itemsData = itemData.items

        const normalizedItems: Item[] = itemsData.map((item: any) => ({
          _id: item._id || item.id || '',
          name: item.name || 'Unnamed Item',
          description: item.description || '',
          categoryId: item.categoryId || item.category || item.category_id || '',
          price: Number(item.price) || 0,
          imageUrl: item.imageUrl || item.image || item.image_url || '',
          preparationTime: Number(item.preparationTime) || Number(item.preparation_time) || 0,
          nutritionalInfo: {
            calories: Number(item.nutritionalInfo?.calories) || 0,
            protein: Number(item.nutritionalInfo?.protein) || 0,
            carbohydrates: Number(item.nutritionalInfo?.carbohydrates) || 0,
            fat: Number(item.nutritionalInfo?.fat) || 0
          },
          isActive: item.isActive !== undefined ? item.isActive : true,
          isFeatured: item.isFeatured || false,
          tags: item.tags || [],
          createdAt: item.createdAt || '',
          updatedAt: item.updatedAt || ''
        }))

        setItems(normalizedItems)
        setFilteredItems(normalizedItems)
      }

      if (waitersRes.status === 'fulfilled') {
        const response = waitersRes.value as AxiosResponse<ApiResponse<Waiter[]>>
        let waitersData: Waiter[] = []
        const waiterData = response.data as any

        if (Array.isArray(waiterData)) waitersData = waiterData
        else if (waiterData?.data && Array.isArray(waiterData.data)) waitersData = waiterData.data

        setWaiters(waitersData)
      }

    } catch (err: any) {
      if (err.name === 'AbortError') return
      console.error('Fetch error:', err)

      if (err.message === 'Request timeout') {
        toast.error('Connection timeout. Please try again.', {
          duration: 3000,
          style: {
            borderRadius: '10px',
            background: '#4a1d6d',
            color: '#fff',
          },
        })
      }
    } finally {
      setLoading(false)
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (items.length > 0 && !imagesPreloaded) {
      const imageUrls = items
        .map(item => getImageSrc(item.imageUrl))
        .filter(url => url && url !== '/placeholder.svg')

      preloadImages(imageUrls)
      setImagesPreloaded(true)

      if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        (window as any).requestIdleCallback(() => preloadImages(imageUrls))
      }
    }
  }, [items, imagesPreloaded])

  useEffect(() => {
    fetchMenuData()
    return () => {
      if (abortControllerRef.current) abortControllerRef.current.abort()
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [fetchMenuData])

  useEffect(() => {
    if (items.length === 0) return

    let result = [...items]

    // Filter out items from hidden categories
    const visibleCategoryIds = categories.map(c => c._id)
    result = result.filter(item => visibleCategoryIds.includes(item.categoryId))

    if (selectedCategory) {
      result = result.filter(item => item.categoryId === selectedCategory)
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      result = result.filter(item =>
        item.name.toLowerCase().includes(term) ||
        (item.description?.toLowerCase() || '').includes(term)
      )
    }

    result.sort((a, b) => {
      if (sortField === 'name') {
        return sortDirection === 'asc'
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name)
      } else {
        const aVal = Number(a[sortField]) || 0
        const bVal = Number(b[sortField]) || 0
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal
      }
    })

    setFilteredItems(result)
  }, [items, categories, selectedCategory, searchTerm, sortField, sortDirection])

  // Delivery fee calculation
  useEffect(() => {
    const calculateDeliveryFee = async () => {
      if (orderType === 'delivery' && userData && adjustedSubtotal > 0) {
        setIsCalculatingDelivery(true)

        try {
          let feeDetails: DeliveryFeeDetails

          if (userData.location?.coordinates &&
            Array.isArray(userData.location.coordinates) &&
            userData.location.coordinates.length === 2) {

            const [lng, lat] = userData.location.coordinates

            if (lat < 3 || lat > 15 || lng < 33 || lng > 48) {
              throw new DeliveryError(
                'Invalid coordinates outside Ethiopia',
                'INVALID_COORDINATES'
              )
            }

            feeDetails = await deliveryCalculator.calculateDeliveryFeeFromCoordinates(
              lat,
              lng,
              adjustedSubtotal,
              new Date().getHours()
            )

          } else if (userData.address) {
            const area = deliveryCalculator.extractAreaFromAddress(userData.address)
            feeDetails = deliveryCalculator.calculateEstimatedDeliveryFee(
              'Addis Ababa',
              area,
              adjustedSubtotal
            )
          } else {
            setDeliveryFee(null)
            setIsCalculatingDelivery(false)
            return
          }

          setDeliveryFee(feeDetails)

          if (feeDetails.fee === 0) {
            toast.success('🎉 Free delivery eligible!', {
              style: {
                borderRadius: '10px',
                background: '#4a1d6d',
                color: '#fff',
              },
            })
          }

        } catch (error: unknown) {
          console.error('Delivery calculation error:', error)

          if (error instanceof DeliveryError) {
            switch (error.code) {
              case 'OUT_OF_RANGE':
                toast.error(`Delivery not available to this location (${error.details?.distance}km away)`)
                break
              case 'MIN_ORDER_NOT_MET':
                toast.error(`Minimum order for delivery is ${error.details?.minRequired} ETB`)
                break
              case 'ZONE_INACTIVE':
                toast.error('Delivery temporarily unavailable in this area')
                break
              default:
                toast.error(error.message)
            }
          } else if (error instanceof Error) {
            toast.error(error.message || 'Unable to calculate delivery fee')
          } else {
            toast.error('Unable to calculate delivery fee')
          }

          setDeliveryFee(null)
        } finally {
          setIsCalculatingDelivery(false)
        }
      } else {
        setDeliveryFee(null)
      }
    }

    calculateDeliveryFee()
  }, [orderType, userData, adjustedSubtotal, deliveryCalculator])

  const finalTotal = useMemo(() => {
    const deliveryFeeAmount = orderType === 'delivery' ? deliveryFee?.fee || 0 : 0
    const packagingFeeAmount = orderType === 'delivery' ? packagingCharge : 0
    return adjustedSubtotal + calculatedTax + deliveryFeeAmount + packagingFeeAmount
  }, [adjustedSubtotal, calculatedTax, deliveryFee, packagingCharge, orderType])

  const handleSort = (field: 'name' | 'price' | 'preparationTime') => {
    if (field === sortField) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
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

  const handleViewDetails = (item: Item) => {
    setSelectedItem(item)
    setShowItemDetail(true)
  }

  const getAutoAssignedWaiter = useCallback(() => {
    if (orderType === 'table' && tableNumber && waiters.length > 0) {
      return autoAssignWaiter(tableNumber, waiters)
    }
    return ''
  }, [orderType, tableNumber, waiters])

  const handlePlaceOrder = () => {
    if (!isLoggedIn) {
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
      if (!selectedTableData) {
        toast.error('Please select a table')
        return
      }
      
      const assignedWaiter = getAutoAssignedWaiter()
      if (!assignedWaiter && waiters.length === 0) {
        toast.error('No waiters available. Please try again later.')
        return
      }
    }

    if (orderType === 'delivery') {
      if (!userData?.phone || !userData?.address) {
        toast.error('Please complete your profile with phone and address')
        router.push('/profile')
        return
      }
      if (!deliveryFee) {
        toast.error('Unable to calculate delivery fee')
        return
      }
    }

    setShowPaymentUpload(true)
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
      toast.success('Payment screenshot uploaded', {
        style: {
          borderRadius: '10px',
          background: '#4a1d6d',
          color: '#fff',
        },
      })
    }
  }

  const removePaymentScreenshot = () => {
    if (paymentScreenshot.previewUrl) URL.revokeObjectURL(paymentScreenshot.previewUrl)
    setPaymentScreenshot({ file: null, previewUrl: '', uploaded: false })
  }

  const handleFinalizeOrder = async () => {
    if (!isLoggedIn) {
      handleLoginRequired('Please login to place an order')
      return
    }

    if (!paymentScreenshot.uploaded || !paymentScreenshot.file) {
      toast.error('Please upload payment screenshot')
      return
    }

    setIsPlacingOrder(true)
    const orderToast = toast.loading('Processing your order...', {
      style: {
        borderRadius: '10px',
        background: '#4a1d6d',
        color: '#fff',
      },
    })

    try {
      const deliveryFeeAmount = orderType === 'delivery' ? deliveryFee?.fee || 0 : 0
      const packagingFeeAmount = orderType === 'delivery' ? packagingCharge : 0
      const assignedWaiterId = orderType === 'table' ? getAutoAssignedWaiter() : ''
      const assignedWaiterName = waiters.find(w => w._id === assignedWaiterId)?.name || ''

      // Prepare items with proper pricing
      const orderItems = cart.map(cartItem => {
        const category = categories.find(c => c._id === cartItem.categoryId)
        const basePrice = Number(cartItem.price)
        const categoryCharge = orderType === 'delivery' 
          ? getCategoryAdditionalCharge(category?.name || '', category?.type)
          : 0
        const finalItemPrice = basePrice + categoryCharge
        
        return {
          itemId: cartItem._id,
          itemName: cartItem.name,
          quantity: cartItem.quantity,
          notes: cartItem.specialInstructions || '',
          basePrice: basePrice,
          categoryCharge: categoryCharge,
          price: finalItemPrice,
          total: finalItemPrice * cartItem.quantity
        }
      })

      const orderData = {
        orderNumber,
        orderType,
        paymentMethod: 'ONLINE',
        restaurantId: selectedTableData?.restaurantId || 'manyazewal1',
        restaurantName: selectedTableData?.restaurantName || 'Manyazewal Restaurant',
        floor: selectedTableData?.floor || 'Ground Floor',
        arrangementId: arrangementId,
        numberOfGuests: orderType === 'table' ? numberOfGuests : 1,
        items: orderItems,
        discount: 0,
        specialRequirements,
        transactionId: transactionId || `TXN-${Date.now()}`,
        customerId: userData?.id || userData?._id || 'walk-in',
        customerName: `${userData?.firstName || ''} ${userData?.lastName || ''}`.trim() || 'Walk-in',
        customerPhone: userData?.phone || '',
        customerEmail: userData?.email || '',
        deliveryFee: deliveryFeeAmount,
        packagingCharge: packagingFeeAmount,
        categoryChargesTotal: orderType === 'delivery' ? categoryChargesTotal : 0,
        subtotal: baseSubtotal,
        adjustedSubtotal: adjustedSubtotal,
        tax: calculatedTax,
        totalAmount: adjustedSubtotal + calculatedTax,
        finalAmount: finalTotal,
        ...(orderType === 'table' && {
          tableNumber: selectedTableData?.number.toString() || tableNumber,
          tableId: selectedTableData?.id,
          tableCapacity: selectedTableData?.capacity,
          tableLocation: selectedTableData?.location,
          tableFeatures: selectedTableData?.features,
          tableShape: selectedTableData?.shape,
          waiterId: assignedWaiterId,
          waiterName: assignedWaiterName,
          inTable: true,
          delivery: false,
          assignmentRequest: {
            status: 'pending',
            type: 'table_assignment',
            requestedAt: new Date().toISOString(),
            tableNumber: selectedTableData?.number.toString() || tableNumber,
            tableId: selectedTableData?.id,
            restaurantId: selectedTableData?.restaurantId || 'manyazewal1',
            restaurantName: selectedTableData?.restaurantName || 'Manyazewal Restaurant',
            floor: selectedTableData?.floor || 'Ground Floor',
            arrangementId: arrangementId,
            waiterId: assignedWaiterId,
            waiterName: assignedWaiterName,
            numberOfGuests: numberOfGuests,
            orderNumber: orderNumber,
            customerId: userData?.id || userData?._id || 'walk-in',
            customerName: `${userData?.firstName || ''} ${userData?.lastName || ''}`.trim() || 'Walk-in',
            customerPhone: userData?.phone || '',
            itemsCount: cart.length,
            totalAmount: finalTotal
          }
        })
      }

      if (orderType === 'delivery') {
        let locationData = null
        if (userData?.location?.coordinates && Array.isArray(userData.location.coordinates) && userData.location.coordinates.length === 2) {
          const [lng, lat] = userData.location.coordinates
          if (lat >= 3 && lat <= 15 && lng >= 33 && lng <= 48) {
            locationData = { type: "Point", coordinates: [lng, lat] }
          }
        }

        ;(orderData as any).deliveryInfo = {
          fullName: `${userData?.firstName || ''} ${userData?.lastName || ''}`.trim() || 'Customer',
          phoneNumber: userData?.phone || '',
          email: userData?.email || '',
          address: userData?.address || '',
          city: 'Addis Ababa',
          landmark: '',
          deliveryInstructions: specialRequirements || '',
          location: locationData,
          latitude: locationData?.coordinates?.[1],
          longitude: locationData?.coordinates?.[0]
        }
        ;(orderData as any).delivery = true
        ;(orderData as any).inTable = false
      }

      const formData = new FormData()
      formData.append('paymentScreenshot', paymentScreenshot.file)
      formData.append('orderData', JSON.stringify(orderData))

      const endpoint = orderType === 'delivery' ? '/api/delivery' : '/api/order'

      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) throw new Error(result.error || result.message || 'Failed to place order')

      clearCart()
      setOrderNumber(`ORD-${Date.now().toString().slice(-6)}`)
      setOrderType('')
      setTableNumber('')
      setSelectedTableData(null)
      setPaymentScreenshot({ file: null, previewUrl: '', uploaded: false })
      setTransactionId('')
      setSpecialRequirements('')
      setShowPaymentUpload(false)
      setIsCartOpen(false)

      const successMessage = orderType === 'delivery'
        ? 'Your order has been placed and will be delivered soon!'
        : `Order placed! Restaurant: ${selectedTableData?.restaurantName || 'Manyazewal'}, Table ${selectedTableData?.number || tableNumber}. ${assignedWaiterName || 'A server'} has been notified and will serve you shortly.`

      toast.success(successMessage, { id: orderToast, duration: 5000 })

      let progress = 0
      const interval = setInterval(() => {
        progress += 10
        setOrderProgress(progress)
        if (progress >= 100) {
          clearInterval(interval)
          setTimeout(() => setOrderProgress(0), 2000)
        }
      }, 300)

    } catch (error: any) {
      toast.error(error.message || 'Failed to place order. Please try again.', { id: orderToast })
    } finally {
      setIsPlacingOrder(false)
    }
  }

  const handleNavigateToProfile = () => router.push('/profile')

  const categoryCounts = useMemo(() => {
    return items.reduce((acc, item) => {
      acc[item.categoryId] = (acc[item.categoryId] || 0) + 1
      return acc
    }, {} as Record<string, number>)
  }, [items])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50/50 via-white to-purple-50/30">
        <NavBar />
        <main className="container mx-auto px-4 py-8">
          {loadingTimeout && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6"
            >
              <Alert className="bg-gradient-to-r from-purple-100 to-purple-200 border-purple-300 rounded-2xl shadow-lg">
                <Clock className="h-5 w-5 text-purple-900" />
                <AlertDescription className="text-purple-900 font-medium">
                  Loading is taking longer than expected. Please bear with us...
                </AlertDescription>
              </Alert>
            </motion.div>
          )}

          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <Skeleton className="h-12 w-48 rounded-xl" />
            </div>
            <Skeleton className="h-12 w-32 rounded-xl" />
          </div>

          <div className="space-y-6 mb-10">
            <Skeleton className="h-14 w-full rounded-2xl" />
            <div className="flex gap-3">
              <Skeleton className="h-12 w-28 rounded-xl" />
              <Skeleton className="h-12 w-28 rounded-xl" />
              <Skeleton className="h-12 w-28 rounded-xl" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <Card key={i} className="overflow-hidden rounded-3xl border-0 shadow-xl">
                <Skeleton className="h-56 w-full bg-gradient-to-r from-gray-200 via-purple-100 to-gray-200 animate-shimmer" />
                <CardContent className="p-5 space-y-4">
                  <Skeleton className="h-7 w-3/4 rounded-lg" />
                  <Skeleton className="h-4 w-full rounded-lg" />
                  <Skeleton className="h-4 w-2/3 rounded-lg" />
                  <div className="flex justify-between pt-3">
                    <Skeleton className="h-10 w-24 rounded-full" />
                    <Skeleton className="h-10 w-10 rounded-full" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50/50 via-white to-purple-50/30">
      <NavBar />

      <main className="container mx-auto px-4 py-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="sticky top-0 z-20 bg-gradient-to-b from-purple-50/80 via-white/80 to-transparent backdrop-blur-xl pt-2 pb-1 mt-3"
        >
          <div className="space-y-1">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-grow">
                <Search className="absolute left-4 top-4 text-purple-700" size={20} />
                <Input
                  type="text"
                  placeholder="Search for delicious items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-12 pr-4 py-6 text-lg bg-white/90 backdrop-blur-sm border-2 border-purple-200 rounded-2xl focus:border-purple-900 focus:ring-4 focus:ring-purple-200 transition-all shadow-lg"
                />
              </div>

              <Select
                value={selectedCategory || 'all'}
                onValueChange={(value) => setSelectedCategory(value === 'all' ? null : value)}
              >
                <SelectTrigger className="w-full md:w-[280px] bg-white/90 backdrop-blur-sm border-2 border-purple-200 rounded-2xl px-4 py-6 text-lg focus:border-purple-900 focus:ring-4 focus:ring-purple-200 shadow-lg">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-2 border-purple-200 shadow-xl">
                  <SelectItem value="all" className="py-3 text-base">
                    <div className="flex items-center gap-2">
                      <Layers className="h-4 w-4 text-purple-900" />
                      All Categories
                    </div>
                  </SelectItem>
                  {categories
                    .filter(cat => !shouldHideCategory(cat))
                    .map((category) => (
                    <SelectItem key={category._id} value={category._id} className="py-3 text-base">
                      <div className="flex items-center gap-3">
                        <div className="p-1.5 bg-purple-100 rounded-lg">
                          {getCategoryIcon(category.type, "h-4 w-4 text-purple-900")}
                        </div>
                        <span>{category.name}</span>
                        <Badge variant="secondary" className="ml-2 bg-purple-100 text-purple-900 rounded-full">
                          {categoryCounts[category._id] || 0}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex gap-2 bg-white/80 backdrop-blur-sm p-2 rounded-2xl border border-purple-200 shadow-md">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('name')}
                  className={`rounded-xl px-4 py-2 transition-all ${sortField === 'name'
                      ? 'bg-gradient-to-r from-purple-800 to-purple-900 text-white shadow-lg'
                      : 'hover:bg-purple-50 text-gray-600'
                    }`}
                >
                  <span className="flex items-center gap-1">
                    Name
                    {sortField === 'name' && (
                      sortDirection === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                    )}
                  </span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('price')}
                  className={`rounded-xl px-4 py-2 transition-all ${sortField === 'price'
                      ? 'bg-gradient-to-r from-purple-800 to-purple-900 text-white shadow-lg'
                      : 'hover:bg-purple-50 text-gray-600'
                    }`}
                >
                  <span className="flex items-center gap-1">
                    Price
                    {sortField === 'price' && (
                      sortDirection === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                    )}
                  </span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('preparationTime')}
                  className={`rounded-xl px-4 py-2 transition-all ${sortField === 'preparationTime'
                      ? 'bg-gradient-to-r from-purple-800 to-purple-900 text-white shadow-lg'
                      : 'hover:bg-purple-50 text-gray-600'
                    }`}
                >
                  <span className="flex items-center gap-1">
                    Prep Time
                    {sortField === 'preparationTime' && (
                      sortDirection === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                    )}
                  </span>
                </Button>
              </div>

              <div className="ml-auto flex gap-2 bg-white/80 backdrop-blur-sm p-2 rounded-2xl border border-purple-200 shadow-md">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={viewMode === 'grid' ? 'default' : 'ghost'}
                        size="icon"
                        onClick={() => setViewMode('grid')}
                        className={`rounded-xl h-10 w-10 transition-all ${viewMode === 'grid'
                            ? 'bg-gradient-to-r from-purple-800 to-purple-900 text-white shadow-lg'
                            : 'hover:bg-purple-50 text-gray-600'
                          }`}
                      >
                        <Grid size={18} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Grid view</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={viewMode === 'list' ? 'default' : 'ghost'}
                        size="icon"
                        onClick={() => setViewMode('list')}
                        className={`rounded-xl h-10 w-10 transition-all ${viewMode === 'list'
                            ? 'bg-gradient-to-r from-purple-800 to-purple-900 text-white shadow-lg'
                            : 'hover:bg-purple-50 text-gray-600'
                          }`}
                      >
                        <List size={18} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>List view</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              <div className="flex items-center justify-between mb-6 mt-4 ml-5 mr-5">
                <div className="flex items-center gap-4">
                  <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
                    <SheetTrigger asChild>
                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Button
                          variant="default"
                          className="relative shadow-xl bg-gradient-to-r from-purple-800 to-purple-900 hover:from-purple-900 hover:to-purple-950 text-white border border-2xl border-purple-200 rounded-full px-6 py-7 mt-3 text-lg"
                        >
                          <ShoppingCart className="mr-2 h-5 w-5" />
                          Cart
                          {totalItems > 0 && (
                            <motion.span
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-6 w-6 flex items-center justify-center shadow-lg"
                            >
                              {totalItems}
                            </motion.span>
                          )}
                        </Button>
                      </motion.div>
                    </SheetTrigger>
                    <SheetContent side="right" className="w-full sm:max-w-lg p-0 bg-gradient-to-br from-white to-purple-50/30 border-l-0 shadow-2xl">
                      <CartPanel
                        cart={cart}
                        onClose={() => setIsCartOpen(false)}
                        onRemoveItem={removeFromCart}
                        onUpdateQuantity={updateQuantity}
                        orderType={orderType}
                        onOrderTypeChange={setOrderType}
                        tableNumber={tableNumber}
                        onTableNumberChange={setTableNumber}
                        selectedTableData={selectedTableData}
                        onTableSelect={handleTableSelect}
                        waiters={waiters}
                        selectedWaiter={getAutoAssignedWaiter()}
                        onWaiterChange={() => {}}
                        numberOfGuests={numberOfGuests}
                        onGuestsChange={setNumberOfGuests}
                        specialRequirements={specialRequirements}
                        onSpecialRequirementsChange={setSpecialRequirements}
                        subtotal={adjustedSubtotal}
                        tax={calculatedTax}
                        deliveryFee={deliveryFee}
                        packagingCharge={packagingCharge}
                        categoryChargesTotal={categoryChargesTotal}
                        total={finalTotal}
                        orderNumber={orderNumber}
                        onPlaceOrder={handlePlaceOrder}
                        isPlacingOrder={isPlacingOrder}
                        isUserLoggedIn={isLoggedIn}
                        onLoginRequired={handleLoginRequired}
                        userData={userData as UserData | null}
                        onNavigateToProfile={handleNavigateToProfile}
                        isCalculatingDelivery={isCalculatingDelivery}
                        restaurantId="manyazewal1"
                        floor="Ground Floor"
                        arrangementId={arrangementId}
                      />
                    </SheetContent>
                  </Sheet>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <AnimatePresence mode="wait">
          {filteredItems.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center py-20"
            >
              <div className="relative inline-block">
                <div className="text-8xl mb-6 animate-float">🍽️</div>
                <div className="absolute inset-0 bg-gradient-to-r from-purple-700 to-purple-900 rounded-full blur-3xl opacity-20" />
              </div>
              <h3 className="text-3xl font-bold text-gray-800 mb-3">No items found</h3>
              <p className="text-gray-600 text-lg mb-8 max-w-md mx-auto">
                {searchTerm
                  ? `No items matching "${searchTerm}"`
                  : selectedCategory
                    ? 'No items in this category'
                    : items.length === 0
                      ? 'No items available. Please check back later.'
                      : 'No items match your filters'}
              </p>
              {(searchTerm || selectedCategory) && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchTerm('')
                    setSelectedCategory(null)
                  }}
                  className="rounded-full px-8 py-6 text-lg border-2 border-purple-200 hover:border-purple-900 hover:bg-purple-50"
                >
                  Clear Filters
                </Button>
              )}
              {items.length === 0 && !searchTerm && !selectedCategory && (
                <Button
                  variant="outline"
                  onClick={fetchMenuData}
                  className="rounded-full px-8 py-6 text-lg border-2 border-purple-200 hover:border-purple-900 hover:bg-purple-50"
                >
                  <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
                  Refresh
                </Button>
              )}
            </motion.div>
          ) : (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={`grid gap-6 ${viewMode === 'grid'
                    ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                    : 'grid-cols-1'
                  }`}
              >
                {filteredItems.map((item, index) => {
                  const category = categories.find(c => c._id === item.categoryId)
                  const categoryName = category?.name || 'Uncategorized'

                  return viewMode === 'grid' ? (
                    <ItemCard
                      key={item._id}
                      item={item}
                      categoryName={categoryName}
                      onAddToCart={addToCart}
                      onViewDetails={handleViewDetails}
                      isUserLoggedIn={isLoggedIn}
                      onLoginRequired={handleLoginRequired}
                      index={index}
                    />
                  ) : (
                    <ListViewItem
                      key={item._id}
                      item={item}
                      categoryName={categoryName}
                      onAddToCart={addToCart}
                      onViewDetails={handleViewDetails}
                      isUserLoggedIn={isLoggedIn}
                      onLoginRequired={handleLoginRequired}
                      index={index}
                    />
                  )
                })}
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-center mt-12"
              >
                <Badge variant="outline" className="bg-white/80 backdrop-blur-sm px-6 py-3 rounded-full text-base border-2 border-purple-200 shadow-lg">
                  <Eye className="h-4 w-4 mr-2 text-purple-900" />
                  Showing {filteredItems.length} of {items.length} menu items
                </Badge>
              </motion.div>
            </>
          )}
        </AnimatePresence>
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
          isUserLoggedIn={isLoggedIn}
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
        subtotal={adjustedSubtotal}
        tax={calculatedTax}
        orderType={orderType}
        deliveryFee={deliveryFee?.fee || 0}
        packagingCharge={packagingCharge}
        total={finalTotal}
        onFinalizeOrder={handleFinalizeOrder}
        isPlacingOrder={isPlacingOrder}
      />

      <AnimatePresence>
        {orderProgress > 0 && orderProgress < 100 && (
          <motion.div
            className="fixed bottom-6 right-6 z-50"
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
          >
            <div className="bg-white/95 backdrop-blur-xl p-5 rounded-2xl shadow-2xl border border-purple-200 w-72">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold flex items-center gap-2 text-gray-800">
                  <div className="p-1.5 bg-gradient-to-r from-purple-800 to-purple-900 rounded-lg">
                    <ChefHat className="h-4 w-4 text-white" />
                  </div>
                  {orderType === 'delivery' ? 'Preparing Delivery' : 'Preparing Order'}
                </h3>
                <Badge className="bg-gradient-to-r from-purple-800 to-purple-900 text-white border-0">
                  {orderProgress}%
                </Badge>
              </div>
              <Progress value={orderProgress} className="h-2.5 bg-purple-100 [&>div]:bg-gradient-to-r [&>div]:from-purple-800 [&>div]:to-purple-900" />
              <p className="text-sm text-gray-500 mt-3 flex items-center gap-2">
                <Clock className="h-4 w-4 animate-pulse text-purple-900" />
                {orderType === 'delivery'
                  ? 'Your order is being prepared for delivery...'
                  : 'Your order is being prepared...'}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div> 
  )
}
