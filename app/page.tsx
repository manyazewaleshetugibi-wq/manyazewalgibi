// app/menu/page.tsx - COMPLETE WITH FULL-SCREEN MOBILE PAYMENT FLOW

'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Eye, Clock, Sparkles, Layers, ShoppingCart, RefreshCw,
  ChevronUp, ChevronDown, Grid, List, Star, Search,
  Filter, ArrowUpDown, X, TrendingUp, Flame, Crown,
  ArrowLeft, ChevronRight, Plus, Minus, Heart, Table,
  User, Users, MapPin, Phone, Mail, CheckCircle, CreditCard,
  Upload, FileImage, Trash2, AlertCircle, ScanLine, Home,
  Truck, Receipt, Lock, UserPlus, Navigation, Armchair
} from 'lucide-react'

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

import { useUserData } from '@/providers/UserDataProvider'
import { useCart } from '@/hooks/useCart'

import { NavBar } from '@/components/NavBar'
import { CartPanel } from '@/components/cart/CartPanel'
import { PaymentUploadDialog } from '@/components/cart/PaymentUploadDialog'

import { ItemCard } from '@/components/menu/ItemCard'
import { ListViewItem } from '@/components/menu/ListViewItem'
import { ItemDetailDialog } from '@/components/menu/ItemDetailDialog'
import { OrderProgressIndicator } from '@/components/menu/OrderProgressIndicator'
import { EmptyMenuState } from '@/components/menu/EmptyMenuState'

import { EnhancedDeliveryCalculator } from '@/types/utils/enhancedDeliveryCalculator'

import {
  Category, Item, Waiter, UserData,
  DeliveryFeeDetails, PaymentScreenshot, CartItem
} from '@/types'

import {
  api,
  getImageSrc,
  preloadImages,
  shouldHideCategory,
  getCategoryAdditionalCharge,
  calculatePackagingCharge,
  autoAssignWaiter
} from '@/lib/menu-utils'

import { getCategoryIcon } from '@/components/menu/MenuIcons'
import { MenuCacheManager } from '@/lib/menu-cache-manager'

// ========== CART PERSISTENCE UTILITIES ==========

const CART_STORAGE_KEY = 'restaurant_cart_data'

/**
 * Save cart to localStorage
 */
const saveCartToLocalStorage = (items: CartItem[]): void => {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items))
    console.log('💾 Cart saved to localStorage:', items.length, 'items')
  } catch (error) {
    console.error('Failed to save cart to localStorage:', error)
  }
}

/**
 * Load cart from localStorage
 */
const loadCartFromLocalStorage = (): CartItem[] | null => {
  try {
    const data = localStorage.getItem(CART_STORAGE_KEY)
    if (!data) return null
    
    const parsed = JSON.parse(data)
    if (!Array.isArray(parsed)) return null
    
    console.log('📦 Cart loaded from localStorage:', parsed.length, 'items')
    return parsed
  } catch (error) {
    console.error('Failed to load cart from localStorage:', error)
    return null
  }
}

/**
 * Clear cart from localStorage
 */
const clearCartFromLocalStorage = (): void => {
  localStorage.removeItem(CART_STORAGE_KEY)
  console.log('🗑️ Cart cleared from localStorage')
}

// ========== SECURITY UTILITIES ==========

/**
 * Sanitize input to prevent XSS attacks
 */
const sanitizeInput = (input: string): string => {
  if (!input) return ''
  let sanitized = input.replace(/<[^>]*>/g, '')
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
  sanitized = sanitized.replace(/javascript:/gi, '')
  sanitized = sanitized.replace(/\son\w+\s*=/gi, '')
  sanitized = sanitized.replace(/\b(alert|confirm|prompt|eval|function)\s*\(/gi, '')
  sanitized = sanitized.replace(/[<>{}()\[\]\\;'"`]/g, '')
  sanitized = sanitized.trim()
  return sanitized
}

/**
 * Validate search input
 */
const validateSearchInput = (input: string): { isValid: boolean; sanitized: string } => {
  if (!input) return { isValid: true, sanitized: '' }
  const sanitized = sanitizeInput(input)
  const validPattern = /^[a-zA-Z0-9\s\-'.,\u00C0-\u017F]*$/
  if (!validPattern.test(sanitized)) {
    const cleaned = sanitized.replace(/[^a-zA-Z0-9\s\-'.,\u00C0-\u017F]/g, '')
    return { isValid: true, sanitized: cleaned }
  }
  return { isValid: true, sanitized }
}

/**
 * Validate text input
 */
const validateTextInput = (input: string): { isValid: boolean; sanitized: string } => {
  if (!input) return { isValid: true, sanitized: '' }
  let sanitized = sanitizeInput(input)
  const validPattern = /^[a-zA-Z0-9\s\-'.,!?@#$%^&*()_+=:;<>\/\\|~`\u00C0-\u017F]*$/
  if (!validPattern.test(sanitized)) {
    const cleaned = sanitized.replace(/[^a-zA-Z0-9\s\-'.,!?@#$%^&*()_+=:;<>\/\\|~`\u00C0-\u017F]/g, '')
    return { isValid: true, sanitized: cleaned }
  }
  return { isValid: true, sanitized }
}

/**
 * Check if input contains potentially malicious code
 */
const containsMaliciousCode = (input: string): boolean => {
  if (!input) return false
  const maliciousPatterns = [
    /<script/i, /javascript:/i, /on\w+\s*=/i, /alert\s*\(/i,
    /confirm\s*\(/i, /prompt\s*\(/i, /eval\s*\(/i, /document\./i,
    /window\./i, /<iframe/i, /<object/i, /<embed/i, /<link/i,
    /<meta/i, /<style/i, /<base/i, /<form/i, /<input/i,
    /<button/i, /<textarea/i, /<select/i, /<option/i, /<svg/i,
    /<math/i, /&#/i, /%3C/i, /%3E/i, /%22/i, /%27/i, /%3B/i,
    /%2F/i, /%5C/i, /%3D/i
  ]
  return maliciousPatterns.some(pattern => pattern.test(input))
}

/**
 * Input validation hook
 */
const useInputValidation = () => {
  const [error, setError] = useState<string | null>(null)
  const validateAndSanitize = (value: string, type: 'search' | 'text' | 'number' = 'text'): string => {
    setError(null)
    if (containsMaliciousCode(value)) {
      setError('Input contains potentially malicious content')
      return ''
    }
    let result: { isValid: boolean; sanitized: string }
    switch (type) {
      case 'search':
        result = validateSearchInput(value)
        break
      case 'number':
        return value.replace(/[^0-9.]/g, '')
      default:
        result = validateTextInput(value)
    }
    if (!result.isValid) {
      setError('Invalid input')
      return ''
    }
    return result.sanitized
  }
  return { validateAndSanitize, error, setError }
}

// Guest user data interface
interface GuestUserData {
  firstName: string
  lastName: string
  phone: string
  email: string
  isGuest: boolean
}

interface TableData {
  id?: string
  _id?: string
  number: number
  capacity: number
  location?: string
  features?: string[]
  shape?: string
  restaurantId?: string
  restaurantName?: string
  floor?: string
}

// ========== MIXED RATIO DISPLAY CONFIGURATION ==========
const FOOD_PER_BATCH = 4
const JUICE_PER_BATCH = 2

const isFoodCategory = (categoryName: string): boolean => {
  const foodKeywords = [
    'pizza', 'burger', 'sandwich', 'pasta', 'salad', 'appetizer', 
    'main course', 'seafood', 'grill', 'chicken', 'beef', 'vegetarian',
    'vegan', 'breakfast', 'lunch', 'dinner', 'side dish', 'soup',
    'food', 'meal', 'dish', 'plate', 'entree', 'starter'
  ]
  const lowerName = categoryName.toLowerCase()
  return foodKeywords.some(keyword => lowerName.includes(keyword))
}

const isJuiceCategory = (categoryName: string): boolean => {
  const juiceKeywords = [
    'juice', 'smoothie', 'milkshake', 'fruit juice', 'vegetable juice',
    'detox juice', 'green juice', 'orange juice', 'apple juice', 
    'mango juice', 'mixed juice', 'cold pressed', 'fresh juice', 'shake'
  ]
  const lowerName = categoryName.toLowerCase()
  return juiceKeywords.some(keyword => lowerName.includes(keyword))
}

const getTopPricedJuices = (items: Item[], categories: Category[]): Item[] => {
  const juiceCategoryIds = categories
    .filter(cat => isJuiceCategory(cat.name))
    .map(cat => cat._id)
  const juiceItems = items.filter(item => 
    juiceCategoryIds.includes(item.categoryId) && item.isActive !== false
  )
  return [...juiceItems].sort((a, b) => b.price - a.price)
}

const getFoodItems = (items: Item[], categories: Category[]): Item[] => {
  const foodCategoryIds = categories
    .filter(cat => isFoodCategory(cat.name))
    .map(cat => cat._id)
  return items.filter(item => 
    foodCategoryIds.includes(item.categoryId) && item.isActive !== false
  )
}

const getOtherItems = (items: Item[], categories: Category[]): Item[] => {
  const otherCategoryIds = categories
    .filter(cat => !isFoodCategory(cat.name) && !isJuiceCategory(cat.name))
    .map(cat => cat._id)
  return items.filter(item => 
    otherCategoryIds.includes(item.categoryId) && item.isActive !== false
  )
}

const createMixedDisplayArray = (
  foodItems: Item[], 
  juiceItems: Item[], 
  otherItems: Item[]
): Item[] => {
  const result: Item[] = []
  let foodIndex = 0
  let juiceIndex = 0
  const featuredAdded: string[] = []
  const featuredItems = [...foodItems, ...juiceItems].filter(item => item.isFeatured)
  featuredItems.slice(0, 3).forEach(item => {
    if (!featuredAdded.includes(item._id)) {
      result.push(item)
      featuredAdded.push(item._id)
      if (foodItems.find(f => f._id === item._id)) foodIndex++
      if (juiceItems.find(j => j._id === item._id)) juiceIndex++
    }
  })
  while (foodIndex < foodItems.length || juiceIndex < juiceItems.length) {
    for (let i = 0; i < FOOD_PER_BATCH && foodIndex < foodItems.length; i++) {
      const foodItem = foodItems[foodIndex]
      if (!featuredAdded.includes(foodItem._id)) {
        result.push(foodItem)
      }
      foodIndex++
    }
    for (let i = 0; i < JUICE_PER_BATCH && juiceIndex < juiceItems.length; i++) {
      const juiceItem = juiceItems[juiceIndex]
      if (!featuredAdded.includes(juiceItem._id)) {
        result.push(juiceItem)
      }
      juiceIndex++
    }
  }
  if (otherItems.length > 0) {
    otherItems.forEach(item => {
      if (!featuredAdded.includes(item._id)) {
        result.push(item)
      }
    })
  }
  return result
}

const sortCategoriesByPriority = (categories: Category[]): Category[] => {
  return [...categories].sort((a, b) => {
    if (isFoodCategory(a.name) && !isFoodCategory(b.name)) return -1
    if (!isFoodCategory(a.name) && isFoodCategory(b.name)) return 1
    if (isJuiceCategory(a.name) && !isJuiceCategory(b.name)) return -1
    if (!isJuiceCategory(a.name) && isJuiceCategory(b.name)) return 1
    return a.name.localeCompare(b.name)
  })
}

// ========== MINIMAL ITEM CARD COMPONENT ==========
const MinimalItemCard = ({ 
  item, 
  categoryName, 
  onAddToCart, 
  onViewDetails,
  index = 0,
  isDesktop = false
}: {
  item: Item
  categoryName: string
  onAddToCart: (item: Item) => void
  onViewDetails: (item: Item) => void
  index?: number
  isDesktop?: boolean
}) => {
  const [isHovered, setIsHovered] = useState(false)

  const handleImageClick = () => {
    onAddToCart(item)
    toast.success(`Added ${item.name} to cart!`)
  }

  const handleDotsClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onViewDetails(item)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.03 }}
      className="flex flex-col items-center cursor-pointer group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div 
        className={`
          aspect-square rounded-lg overflow-hidden bg-gradient-to-br from-purple-50 to-purple-100/50 relative
          ${isDesktop ? 'w-36' : 'w-full'}
          transition-all duration-200 hover:ring-2 hover:ring-purple-400 hover:shadow-lg
        `}
        onClick={handleImageClick}
        role="button"
        aria-label={`Add ${item.name} to cart`}
      >
        {item.imageUrl ? (
          <img
            src={getImageSrc(item.imageUrl)}
            alt={item.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/placeholder.svg'
            }}
          />
        ) : (
          <div className="flex items-center justify-center w-full h-full">
            <span className="text-2xl text-purple-300">🍽️</span>
          </div>
        )}
        <div className={`
          absolute inset-0 bg-purple-900/60 flex items-center justify-center 
          transition-opacity duration-200 rounded-lg
          ${isHovered ? 'opacity-100' : 'opacity-0'}
        `}>
          <ShoppingCart className="h-5 w-5 text-white" />
        </div>
      </div>
      <div className="w-full flex items-center justify-between mt-1 px-0.5">
        <h3 className="text-xs font-medium text-gray-700 truncate flex-1 min-w-0">
          {item.name}
        </h3>
        <button
          onClick={handleDotsClick}
          className="p-0.5 rounded-full hover:bg-purple-50 transition-colors text-gray-400 hover:text-purple-900 flex-shrink-0"
          aria-label={`View details for ${item.name}`}
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
            <circle cx="8" cy="2" r="1.5" />
            <circle cx="8" cy="8" r="1.5" />
            <circle cx="8" cy="14" r="1.5" />
          </svg>
        </button>
      </div>
    </motion.div>
  )
}

// ========== LIST VIEW ITEM CARD ==========
const ListViewItemCard = ({
  item,
  categoryName,
  onAddToCart,
  onViewDetails,
  index = 0
}: {
  item: Item
  categoryName: string
  onAddToCart: (item: Item) => void
  onViewDetails: (item: Item) => void
  index?: number
}) => {
  const handleImageClick = () => {
    onAddToCart(item)
    toast.success(`Added ${item.name} to cart!`)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.05 }}
      className="flex items-center gap-3 p-2.5 bg-white rounded-xl shadow-sm border border-purple-100/50 hover:border-purple-300 hover:shadow-md transition-all cursor-pointer group"
      onClick={() => onViewDetails(item)}
    >
      <div 
        className="w-16 h-16 rounded-lg overflow-hidden bg-gradient-to-br from-purple-50 to-purple-100/50 flex-shrink-0 cursor-pointer hover:ring-2 hover:ring-purple-400 transition-all"
        onClick={(e) => {
          e.stopPropagation()
          handleImageClick()
        }}
      >
        {item.imageUrl ? (
          <img
            src={getImageSrc(item.imageUrl)}
            alt={item.name}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/placeholder.svg'
            }}
          />
        ) : (
          <div className="flex items-center justify-center w-full h-full">
            <span className="text-2xl text-purple-300">🍽️</span>
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1">
          <h3 className="text-sm font-medium text-gray-800 truncate flex-1">
            {item.name}
          </h3>
          <span className="text-sm font-bold text-purple-900 whitespace-nowrap">
            ${item.price.toFixed(2)}
          </span>
        </div>
        {item.description && (
          <p className="text-xs text-gray-500 truncate mt-0.5">
            {item.description}
          </p>
        )}
        <p className="text-[10px] text-gray-400 mt-0.5">
          {categoryName}
        </p>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation()
          handleImageClick()
        }}
        className="p-1.5 rounded-full bg-purple-50 text-purple-900 hover:bg-purple-100 transition-colors flex-shrink-0"
        aria-label={`Add ${item.name} to cart`}
      >
        <Plus className="h-4 w-4" />
      </button>
    </motion.div>
  )
}

// ========== LIST VIEW FOR DESKTOP ==========
const DesktopListViewItem = ({
  item,
  categoryName,
  onAddToCart,
  onViewDetails,
  index = 0
}: {
  item: Item
  categoryName: string
  onAddToCart: (item: Item) => void
  onViewDetails: (item: Item) => void
  index?: number
}) => {
  const handleImageClick = () => {
    onAddToCart(item)
    toast.success(`Added ${item.name} to cart!`)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.04 }}
      className="flex items-center gap-4 p-3 bg-white rounded-xl shadow-sm border border-purple-100/50 hover:border-purple-300 hover:shadow-md transition-all cursor-pointer group"
      onClick={() => onViewDetails(item)}
    >
      <div 
        className="w-20 h-20 rounded-lg overflow-hidden bg-gradient-to-br from-purple-50 to-purple-100/50 flex-shrink-0 cursor-pointer hover:ring-2 hover:ring-purple-400 transition-all"
        onClick={(e) => {
          e.stopPropagation()
          handleImageClick()
        }}
      >
        {item.imageUrl ? (
          <img
            src={getImageSrc(item.imageUrl)}
            alt={item.name}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/placeholder.svg'
            }}
          />
        ) : (
          <div className="flex items-center justify-center w-full h-full">
            <span className="text-3xl text-purple-300">🍽️</span>
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-base font-medium text-gray-800 truncate">
            {item.name}
          </h3>
          <span className="text-base font-bold text-purple-900 whitespace-nowrap">
            ${item.price.toFixed(2)}
          </span>
        </div>
        {item.description && (
          <p className="text-sm text-gray-500 truncate mt-0.5">
            {item.description}
          </p>
        )}
        <p className="text-xs text-gray-400 mt-1">
          {categoryName}
        </p>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation()
          handleImageClick()
        }}
        className="p-2 rounded-full bg-purple-50 text-purple-900 hover:bg-purple-100 transition-colors flex-shrink-0"
        aria-label={`Add ${item.name} to cart`}
      >
        <Plus className="h-5 w-5" />
      </button>
    </motion.div>
  )
}

// ========== MOBILE PAYMENT FLOW STEPS ==========
type PaymentFlowStep = 'cart' | 'payment' | 'success'

interface MobilePaymentFlowProps {
  isOpen: boolean
  onClose: () => void
  cartItems: CartItem[]
  onRemoveItem: (id: string) => void
  onUpdateQuantity: (id: string, qty: number) => void
  orderType: 'table' | 'delivery' | ''
  onOrderTypeChange: (type: 'table' | 'delivery' | '') => void
  tableNumber: string
  onTableNumberChange: (num: string) => void
  selectedTableData: TableData | null
  onTableSelect: (table: TableData | null) => void
  numberOfGuests: number
  onGuestsChange: (num: number) => void
  specialRequirements: string
  onSpecialRequirementsChange: (req: string) => void
  subtotal: number
  tax: number
  deliveryFee: DeliveryFeeDetails | null
  total: number
  onPlaceOrder: () => void
  isPlacingOrder: boolean
  isUserLoggedIn: boolean
  userData: UserData | null
  tableFromQR: boolean
  onPlaceOrderDirect?: () => void
  onPaymentScreenshotUpload: (file: File) => void
  onPaymentScreenshotRemove: () => void
  paymentScreenshot: PaymentScreenshot
  transactionId: string
  onTransactionIdChange: (id: string) => void
  onFinalizeOrder: () => void
  guestData: GuestUserData | null
  onGuestOrder: (data: GuestUserData) => void
  isQRTable: boolean
}

const MobilePaymentFlow: React.FC<MobilePaymentFlowProps> = ({
  isOpen,
  onClose,
  cartItems,
  onRemoveItem,
  onUpdateQuantity,
  orderType,
  onOrderTypeChange,
  tableNumber,
  onTableNumberChange,
  selectedTableData,
  onTableSelect,
  numberOfGuests,
  onGuestsChange,
  specialRequirements,
  onSpecialRequirementsChange,
  subtotal,
  tax,
  deliveryFee,
  total,
  onPlaceOrder,
  isPlacingOrder,
  isUserLoggedIn,
  userData,
  tableFromQR,
  onPlaceOrderDirect,
  onPaymentScreenshotUpload,
  onPaymentScreenshotRemove,
  paymentScreenshot,
  transactionId,
  onTransactionIdChange,
  onFinalizeOrder,
  guestData,
  onGuestOrder,
  isQRTable
}) => {
  const [currentStep, setCurrentStep] = useState<PaymentFlowStep>('cart')
  const [showGuestForm, setShowGuestForm] = useState(false)
  const [guestFormData, setGuestFormData] = useState<GuestUserData>({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    isGuest: true
  })

  // Reset step when dialog opens
  useEffect(() => {
    if (isOpen) {
      setCurrentStep('cart')
    }
  }, [isOpen])

  // Handle proceed to payment
  const handleProceedToPayment = () => {
    if (cartItems.length === 0) return
    if (!orderType) return
    if (orderType === 'table' && !selectedTableData) return
    
    // If QR table, go directly to success
    if (isQRTable && onPlaceOrderDirect) {
      onPlaceOrderDirect()
      setCurrentStep('success')
      return
    }
    
    // For non-QR table orders, go to payment step
    setCurrentStep('payment')
  }

  // Handle payment submission
  const handlePaymentSubmit = () => {
    if (!paymentScreenshot.uploaded) {
      toast.error('Please upload payment screenshot')
      return
    }
    onFinalizeOrder()
    setCurrentStep('success')
  }

  // Handle back to cart
  const handleBackToCart = () => {
    setCurrentStep('cart')
  }

  // Handle guest form submission
  const handleGuestFormSubmit = () => {
    if (!guestFormData.firstName || !guestFormData.phone) {
      toast.error('Please fill in all required fields')
      return
    }
    onGuestOrder(guestFormData)
    setShowGuestForm(false)
    handleProceedToPayment()
  }

  // Format currency
  const formatCurrency = (value: number | undefined | null): string => {
    if (value === undefined || value === null || isNaN(value)) return '0.00'
    return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  const formattedSubtotal = formatCurrency(subtotal)
  const formattedTax = formatCurrency(tax)
  const formattedTotal = formatCurrency(total)
  const formattedDeliveryFee = formatCurrency(deliveryFee?.fee)

  // Get image source
  const getImageSrc = (imageUrl?: string): string => {
    if (!imageUrl) return '/placeholder.svg'
    if (imageUrl.startsWith('http')) return imageUrl
    if (imageUrl.startsWith('/uploads')) return imageUrl
    return `/uploads/${imageUrl}`
  }

  // Calculate price breakdown
  const calculatePriceBreakdown = (priceWithTax: number, taxRate: number = 0.15) => {
    const originalPrice = priceWithTax / (1 + taxRate)
    const taxAmount = priceWithTax - originalPrice
    return { originalPrice, taxAmount }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence mode="wait">
      {/* Full Screen Overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-white"
      >
        {/* Step 1: Cart Review */}
        {currentStep === 'cart' && (
          <motion.div
            key="cart-step"
            initial={{ x: 0, opacity: 1 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col h-full"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-purple-100 bg-white sticky top-0 z-10">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="h-8 w-8 rounded-full hover:bg-purple-50"
                >
                  <X className="h-4 w-4" />
                </Button>
                <h2 className="text-base font-bold text-purple-900">Review Order</h2>
              </div>
              <Badge className="bg-purple-100 text-purple-900">
                {cartItems.length} items
              </Badge>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 pb-28">
              {/* Cart Items */}
              <div className="space-y-3">
                {cartItems.map((item) => {
                  const { originalPrice } = calculatePriceBreakdown(Number(item.price))
                  return (
                    <div key={item._id} className="flex gap-3 border border-purple-100 rounded-lg bg-white p-3">
                      <div className="h-14 w-14 flex-shrink-0 rounded-lg overflow-hidden bg-purple-50">
                        <img
                          src={getImageSrc(item.imageUrl)}
                          alt={item.name}
                          className="w-full h-full object-cover"
                          onError={(e) => (e.target as HTMLImageElement).src = '/placeholder.svg'}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <h4 className="font-medium text-sm text-gray-800 truncate">{item.name}</h4>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onRemoveItem(item._id)}
                            className="h-6 w-6 rounded-full text-red-400 hover:bg-red-50 hover:text-red-600"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <div className="flex items-center border border-purple-100 rounded-md overflow-hidden">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onUpdateQuantity(item._id, item.quantity - 1)}
                              className="h-6 w-6 p-0 rounded-none hover:bg-purple-50"
                            >
                              <Minus className="h-2.5 w-2.5" />
                            </Button>
                            <span className="w-6 text-center text-xs font-medium text-purple-900">
                              {item.quantity}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onUpdateQuantity(item._id, item.quantity + 1)}
                              className="h-6 w-6 p-0 rounded-none hover:bg-purple-50"
                            >
                              <Plus className="h-2.5 w-2.5" />
                            </Button>
                          </div>
                          <span className="text-sm font-bold text-purple-900">
                            {(originalPrice * item.quantity).toFixed(2)} Birr
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Order Summary */}
              <div className="mt-4 space-y-2 bg-purple-50/50 rounded-lg p-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium">{formattedSubtotal} Birr</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">VAT 15%</span>
                  <span className="font-medium">{formattedTax} Birr</span>
                </div>
                {orderType === 'delivery' && deliveryFee && deliveryFee.fee > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Delivery Fee</span>
                    <span className="font-medium">{formattedDeliveryFee} Birr</span>
                  </div>
                )}
                <div className="border-t border-purple-200 pt-2">
                  <div className="flex justify-between">
                    <span className="font-bold text-gray-800">Total</span>
                    <span className="font-bold text-purple-900 text-lg">{formattedTotal} Birr</span>
                  </div>
                </div>
              </div>

              {/* Order Type Info */}
              <div className="mt-3 bg-white border border-purple-100 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  {orderType === 'table' ? (
                    <Home className="h-4 w-4 text-purple-600" />
                  ) : (
                    <Truck className="h-4 w-4 text-purple-600" />
                  )}
                  <span className="text-sm font-medium">
                    {orderType === 'table' ? 'Dine In' : 'Delivery'}
                  </span>
                  {orderType === 'table' && selectedTableData && (
                    <Badge variant="outline" className="ml-auto">
                      Table {selectedTableData.number}
                    </Badge>
                  )}
                </div>
                {isQRTable && (
                  <div className="mt-1 flex items-center gap-1 text-xs text-green-600">
                    <ScanLine className="h-3 w-3" />
                    QR Table • No payment upload required
                  </div>
                )}
                {!isQRTable && orderType === 'table' && (
                  <div className="mt-1 flex items-center gap-1 text-xs text-amber-600">
                    <CreditCard className="h-3 w-3" />
                    Payment upload required
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-purple-100 p-4">
              <Button
                onClick={handleProceedToPayment}
                className="w-full h-12 text-sm font-bold bg-gradient-to-r from-purple-800 to-purple-900 hover:from-purple-900 hover:to-purple-950 text-white rounded-xl"
                disabled={cartItems.length === 0 || !orderType || (orderType === 'table' && !selectedTableData)}
              >
                {isQRTable ? 'Place Order' : 'Proceed to Payment'}
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        )}

        {/* Step 2: Payment Upload */}
        {currentStep === 'payment' && (
          <motion.div
            key="payment-step"
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 300, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col h-full"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-purple-100 bg-white sticky top-0 z-10">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleBackToCart}
                  className="h-8 w-8 rounded-full hover:bg-purple-50"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <h2 className="text-base font-bold text-purple-900">Payment</h2>
              </div>
              <Badge className="bg-purple-100 text-purple-900">Step 2 of 2</Badge>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 pb-28">
              {/* Order Summary */}
              <div className="bg-gradient-to-r from-purple-50 to-white rounded-lg p-4 border border-purple-100 mb-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Order Summary</h3>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal</span>
                    <span>{formattedSubtotal} Birr</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">VAT 15%</span>
                    <span>{formattedTax} Birr</span>
                  </div>
                  <div className="border-t border-purple-200 pt-1 mt-1">
                    <div className="flex justify-between font-bold">
                      <span>Total</span>
                      <span className="text-purple-900">{formattedTotal} Birr</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Upload */}
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-gray-700">Payment Screenshot</Label>
                  <p className="text-xs text-gray-500 mt-1">Upload a screenshot of your payment confirmation</p>
                </div>

                {paymentScreenshot.uploaded ? (
                  <div className="relative rounded-lg overflow-hidden border-2 border-green-200 bg-green-50 p-3">
                    <img
                      src={paymentScreenshot.previewUrl}
                      alt="Payment screenshot"
                      className="w-full max-h-48 object-contain rounded"
                    />
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={onPaymentScreenshotRemove}
                      className="absolute top-2 right-2 h-8 w-8 rounded-full p-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-purple-200 rounded-lg p-8 text-center hover:border-purple-400 transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) onPaymentScreenshotUpload(file)
                      }}
                      className="hidden"
                      id="payment-upload"
                    />
                    <label htmlFor="payment-upload" className="cursor-pointer block">
                      <Upload className="h-12 w-12 text-purple-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">Tap to upload screenshot</p>
                      <p className="text-xs text-gray-400 mt-1">PNG, JPG, JPEG up to 5MB</p>
                    </label>
                  </div>
                )}

                {/* Transaction ID */}
                <div>
                  <Label className="text-sm font-medium text-gray-700">Transaction ID</Label>
                  <Input
                    placeholder="Enter transaction ID (optional)"
                    value={transactionId}
                    onChange={(e) => onTransactionIdChange(e.target.value)}
                    className="mt-1"
                  />
                </div>

                {/* Guest Info (if not logged in) */}
                {!isUserLoggedIn && !guestData && (
                  <div>
                    <Button
                      variant="outline"
                      onClick={() => setShowGuestForm(!showGuestForm)}
                      className="w-full"
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      {showGuestForm ? 'Hide Guest Info' : 'Add Guest Contact Info'}
                    </Button>
                    
                    {showGuestForm && (
                      <div className="mt-3 space-y-2 p-3 border border-purple-100 rounded-lg">
                        <Input
                          placeholder="First Name *"
                          value={guestFormData.firstName}
                          onChange={(e) => setGuestFormData({ ...guestFormData, firstName: e.target.value })}
                        />
                        <Input
                          placeholder="Last Name"
                          value={guestFormData.lastName}
                          onChange={(e) => setGuestFormData({ ...guestFormData, lastName: e.target.value })}
                        />
                        <Input
                          placeholder="Phone Number *"
                          value={guestFormData.phone}
                          onChange={(e) => setGuestFormData({ ...guestFormData, phone: e.target.value })}
                        />
                        <Input
                          placeholder="Email"
                          value={guestFormData.email}
                          onChange={(e) => setGuestFormData({ ...guestFormData, email: e.target.value })}
                        />
                        <Button
                          onClick={handleGuestFormSubmit}
                          className="w-full bg-purple-600 hover:bg-purple-700"
                        >
                          Save Guest Info
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {/* QR Table indicator */}
                {isQRTable && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
                    <ScanLine className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-green-700">QR Table order - Direct placement</span>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-purple-100 p-4">
              <Button
                onClick={handlePaymentSubmit}
                className="w-full h-12 text-sm font-bold bg-gradient-to-r from-purple-800 to-purple-900 hover:from-purple-900 hover:to-purple-950 text-white rounded-xl"
                disabled={!paymentScreenshot.uploaded || isPlacingOrder}
              >
                {isPlacingOrder ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CreditCard className="mr-2 h-4 w-4" />
                    Confirm Payment & Place Order
                  </>
                )}
              </Button>
              <p className="text-xs text-center text-gray-500 mt-2">
                By placing this order, you agree to our terms and conditions
              </p>
            </div>
          </motion.div>
        )}

        {/* Step 3: Success */}
        {currentStep === 'success' && (
          <motion.div
            key="success-step"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col items-center justify-center h-full p-8 text-center"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full blur-3xl opacity-20" />
              <div className="relative h-24 w-24 rounded-full bg-gradient-to-r from-green-400 to-emerald-500 flex items-center justify-center mx-auto">
                <CheckCircle className="h-12 w-12 text-white" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mt-4">Order Placed Successfully!</h2>
            <p className="text-gray-600 mt-2 max-w-xs">
              Your order has been received and is being prepared
            </p>
            <div className="mt-6 bg-purple-50 rounded-lg p-4 w-full max-w-sm">
              <p className="text-sm text-gray-600">Order Number</p>
              <p className="text-lg font-bold text-purple-900">{`ORD-${Date.now().toString().slice(-6)}`}</p>
            </div>
            <Button
              onClick={() => {
                setCurrentStep('cart')
                onClose()
              }}
              className="mt-6 h-12 px-8 bg-gradient-to-r from-purple-800 to-purple-900 hover:from-purple-900 hover:to-purple-950 text-white rounded-xl"
            >
              Continue Browsing
            </Button>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  )
}

export default function MenuPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { userData, isLoggedIn } = useUserData()
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window !== 'undefined') return window.innerWidth >= 1024
    return false
  })

  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 1024)
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])
  
  // ========== CART STATE WITH LOCALSTORAGE PERSISTENCE ==========
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [cartLoaded, setCartLoaded] = useState(false)
  const [showMobilePaymentFlow, setShowMobilePaymentFlow] = useState(false)

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = loadCartFromLocalStorage()
    if (savedCart && savedCart.length > 0) {
      setCartItems(savedCart)
      console.log('🛒 Restored cart from localStorage:', savedCart.length, 'items')
    }
    setCartLoaded(true)
  }, [])

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    if (cartLoaded) {
      saveCartToLocalStorage(cartItems)
    }
  }, [cartItems, cartLoaded])

  // Cart functions
  const addToCart = useCallback((item: Item, quantity: number = 1, specialInstructions: string = '') => {
    setCartItems(prev => {
      const existingItem = prev.find(cartItem => cartItem._id === item._id)
      if (existingItem) {
        return prev.map(cartItem =>
          cartItem._id === item._id
            ? { ...cartItem, quantity: cartItem.quantity + quantity, specialInstructions: specialInstructions || cartItem.specialInstructions }
            : cartItem
        )
      } else {
        const newItem: CartItem = {
          _id: item._id,
          name: item.name,
          price: item.price,
          imageUrl: item.imageUrl,
          categoryId: item.categoryId,
          quantity: quantity,
          specialInstructions: specialInstructions,
          isFasting: item.isFasting || false,
          preparationTime: item.preparationTime || 0
        }
        return [...prev, newItem]
      }
    })
  }, [])

  const removeFromCart = useCallback((itemId: string) => {
    setCartItems(prev => prev.filter(item => item._id !== itemId))
  }, [])

  const updateQuantity = useCallback((itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(itemId)
      return
    }
    setCartItems(prev =>
      prev.map(item =>
        item._id === itemId ? { ...item, quantity } : item
      )
    )
  }, [removeFromCart])

  const clearCart = useCallback(() => {
    setCartItems([])
    clearCartFromLocalStorage()
  }, [])

  // Cart calculations
  const totalItems = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + item.quantity, 0)
  }, [cartItems])

  const subtotal = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  }, [cartItems])

  // Input validation hook
  const { validateAndSanitize: validateSearch, error: searchError, setError: setSearchError } = useInputValidation()
  const { validateAndSanitize: validateText } = useInputValidation()

  const [categories, setCategories] = useState<Category[]>([])
  const [sortedCategories, setSortedCategories] = useState<Category[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [filteredItems, setFilteredItems] = useState<Item[]>([])
  const [mixedDisplayItems, setMixedDisplayItems] = useState<Item[]>([])
  const [waiters, setWaiters] = useState<Waiter[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [searchInputValue, setSearchInputValue] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadingTimeout, setLoadingTimeout] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [imagesPreloaded, setImagesPreloaded] = useState(false)
  const [dataLoaded, setDataLoaded] = useState(false)

  // ========== TABLE DETECTION STATE ==========
  const [detectedTable, setDetectedTable] = useState<string | null>(null)
  const [tableDetected, setTableDetected] = useState(false)
  const [isQRTable, setIsQRTable] = useState(false)

  // ========== TWO-STEP NAVIGATION STATE ==========
  const [mobileStep, setMobileStep] = useState<'categories' | 'items'>('categories')
  const [selectedCategoryForMobile, setSelectedCategoryForMobile] = useState<Category | null>(null)
  
  // ========== FASTING FILTER STATE ==========
  type FastingFilter = 'all' | 'fasting' | 'non-fasting'
  const [fastingFilter, setFastingFilter] = useState<FastingFilter>('all')
  
  // Desktop
  const [desktopStep, setDesktopStep] = useState<'categories' | 'items'>('categories')
  const [selectedCategoryForDesktop, setSelectedCategoryForDesktop] = useState<Category | null>(null)

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
  
  const [guestUserData, setGuestUserData] = useState<GuestUserData | null>(null)

  const deliveryCalculator = useMemo(() => new EnhancedDeliveryCalculator(), [])
  const abortControllerRef = useRef<AbortController | null>(null)

  // Initialize cache manager
  const cacheManager = MenuCacheManager.getInstance()

  // ========== TABLE DETECTION FROM URL ==========
  useEffect(() => {
    const decodeParam = (param: string | null): string => {
      if (!param) return ''
      let decoded = decodeURIComponent(param)
      decoded = decoded.replace(/\+/g, ' ')
      return decoded
    }

    const tableParam = searchParams.get('table')
    const tableIdParam = searchParams.get('tableId')
    const restaurantIdParam = searchParams.get('restaurantId')
    const floorParam = searchParams.get('floor')
    const restaurantNameParam = searchParams.get('restaurant')
    const capacityParam = searchParams.get('capacity')

    const isQRScan = !!(tableIdParam && restaurantIdParam)

    if (tableParam) {
      const decodedTable = decodeParam(tableParam)
      const sanitizedTable = sanitizeInput(decodedTable)
      let tableNumberDisplay = sanitizedTable
      if (sanitizedTable.startsWith('table-')) {
        tableNumberDisplay = sanitizedTable.replace('table-', '')
      }

      const tableNum = parseInt(tableNumberDisplay)
      if (!isNaN(tableNum) && tableNum > 0) {
        localStorage.setItem('qrcode', isQRScan ? 'true' : 'false')
        localStorage.setItem('detectedTableNumber', tableNumberDisplay)
        localStorage.setItem('tableDetected', 'true')
        localStorage.setItem('isQRTable', isQRScan ? 'true' : 'false')

        setDetectedTable(tableNumberDisplay)
        setTableDetected(true)
        setIsQRTable(isQRScan)
        setTableNumber(tableNumberDisplay)
        setOrderType('table')

        const tableData: TableData = {
          id: sanitizeInput(decodeParam(tableIdParam || '')),
          number: tableNum,
          capacity: parseInt(sanitizeInput(decodeParam(capacityParam || '4'))) || 4,
          restaurantId: sanitizeInput(decodeParam(restaurantIdParam || 'manyazewal1')),
          restaurantName: sanitizeInput(decodeParam(restaurantNameParam || 'Manyazewal Restaurant')),
          floor: sanitizeInput(decodeParam(floorParam || 'Ground Floor'))
        }
        setSelectedTableData(tableData)
        
        console.log('✅ Table detected from URL:', {
          tableNumber: tableNum,
          isQR: isQRScan,
          capacity: tableData.capacity,
          restaurant: tableData.restaurantName
        })
      }
    } else {
      const storedTable = localStorage.getItem('detectedTableNumber')
      const storedDetected = localStorage.getItem('tableDetected')
      const storedIsQR = localStorage.getItem('isQRTable')

      if (storedTable && storedDetected === 'true') {
        const tableNum = parseInt(storedTable)
        if (!isNaN(tableNum) && tableNum > 0) {
          setDetectedTable(storedTable)
          setTableDetected(true)
          setIsQRTable(storedIsQR === 'true')
          setTableNumber(storedTable)
          setOrderType('table')

          const tableData: TableData = {
            number: tableNum,
            capacity: 4,
            restaurantId: 'manyazewal1',
            restaurantName: 'Manyazewal Restaurant',
            floor: 'Ground Floor'
          }
          setSelectedTableData(tableData)
          
          console.log('✅ Table restored from localStorage:', tableNum)
        }
      }
    }
  }, [searchParams])

  const packagingCharge = useMemo(() => {
    return calculatePackagingCharge(cartItems, categories, orderType === 'delivery')
  }, [cartItems, categories, orderType])

  const categoryChargesTotal = useMemo(() => {
    if (orderType !== 'delivery') return 0
    return cartItems.reduce((total, cartItem) => {
      const category = categories.find(c => c._id === cartItem.categoryId)
      const charge = getCategoryAdditionalCharge(category?.name || '', category?.type)
      return total + (charge * (cartItem.quantity || 1))
    }, 0)
  }, [cartItems, categories, orderType])

  const adjustedSubtotal = useMemo(() => {
    if (orderType !== 'delivery') return subtotal
    return subtotal + categoryChargesTotal
  }, [subtotal, categoryChargesTotal, orderType])

  const calculatedTax = useMemo(() => {
    return adjustedSubtotal * 0.15
  }, [adjustedSubtotal])

  // Load from encrypted cache
  const loadFromCache = useCallback(async () => {
    try {
      const { categories: cachedCategories, items: cachedItems, waiters: cachedWaiters, isValid } = await cacheManager.loadMenuData()
      if (isValid && cachedCategories.length > 0 && cachedItems.length > 0) {
        setCategories(cachedCategories)
        setSortedCategories(sortCategoriesByPriority(cachedCategories))
        setItems(cachedItems)
        setFilteredItems(cachedItems)
        if (cachedWaiters.length > 0) setWaiters(cachedWaiters)
        setDataLoaded(true)
        setLoading(false)
        console.log('📦 Loaded from encrypted cache')
        return true
      }
      return false
    } catch (error) {
      console.error('Cache read error:', error)
      return false
    }
  }, [])

  // Save to encrypted cache
  const saveToCache = useCallback(async (categoriesData: Category[], itemsData: Item[], waitersData: Waiter[]) => {
    try {
      await cacheManager.saveMenuData(categoriesData, itemsData, waitersData)
      console.log('💾 Saved to encrypted cache')
    } catch (error) {
      console.error('Cache save error:', error)
    }
  }, [])

  // Fetch menu data
  const fetchMenuData = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    const controller = new AbortController()
    abortControllerRef.current = controller

    try {
      setLoading(true)
      setLoadingTimeout(false)

      const timeoutId = setTimeout(() => {
        setLoadingTimeout(true)
      }, 5000)

      const [categoriesRes, itemsRes, waitersRes] = await Promise.allSettled([
        api.get('/item-category', { signal: controller.signal, timeout: 10000 }),
        api.get('/items', { signal: controller.signal, timeout: 10000 }),
        api.get('/waitress', { signal: controller.signal, timeout: 10000 }).catch(() => ({ data: [] }))
      ])

      clearTimeout(timeoutId)

      let categoriesData: Category[] = []
      let itemsData: Item[] = []
      let waitersData: Waiter[] = []

      if (categoriesRes.status === 'fulfilled') {
        const catData = categoriesRes.value.data as any
        if (Array.isArray(catData)) categoriesData = catData
        else if (catData?.data && Array.isArray(catData.data)) categoriesData = catData.data
        else if (catData?.categories && Array.isArray(catData.categories)) categoriesData = catData.categories
        categoriesData = categoriesData.filter(cat => !shouldHideCategory(cat))
        setCategories(categoriesData)
        setSortedCategories(sortCategoriesByPriority(categoriesData))
      }

      if (itemsRes.status === 'fulfilled') {
        const itemData = itemsRes.value.data as any
        let rawItems: any[] = []
        if (Array.isArray(itemData)) rawItems = itemData
        else if (itemData?.data && Array.isArray(itemData.data)) rawItems = itemData.data
        else if (itemData?.items && Array.isArray(itemData.items)) rawItems = itemData.items

        itemsData = rawItems.map((item: any) => ({
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
          isFasting: item.isFasting !== undefined ? item.isFasting : false,
          tags: item.tags || [],
          createdAt: item.createdAt || '',
          updatedAt: item.updatedAt || ''
        }))
        setItems(itemsData)
        setFilteredItems(itemsData)
      }

      if (waitersRes.status === 'fulfilled') {
        const waiterData = waitersRes.value.data as any
        if (Array.isArray(waiterData)) waitersData = waiterData
        else if (waiterData?.data && Array.isArray(waiterData.data)) waitersData = waiterData.data
        setWaiters(waitersData)
      }

      if (categoriesData.length > 0 && itemsData.length > 0) {
        await saveToCache(categoriesData, itemsData, waitersData)
      }

      setDataLoaded(true)

    } catch (err: any) {
      if (err.name === 'AbortError') return
      console.error('Fetch error:', err.message)
      const cached = await loadFromCache()
      if (!cached) {
        toast.error('Unable to load menu. Please check your connection.')
      }
    } finally {
      setLoading(false)
    }
  }, [loadFromCache, saveToCache])

  // ========== SECURE SEARCH HANDLER ==========
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value
    setSearchInputValue(rawValue)
    if (containsMaliciousCode(rawValue)) {
      setSearchError('Invalid characters detected')
      toast.error('Search contains invalid characters')
      setSearchInputValue('')
      setSearchTerm('')
      return
    }
    const { isValid, sanitized } = validateSearchInput(rawValue)
    if (!isValid) {
      setSearchError('Invalid input')
      toast.error('Invalid characters in search')
      return
    }
    setSearchError(null)
    setSearchTerm(sanitized)
  }, [validateSearchInput, setSearchError])

  // ========== SECURE TEXT INPUT HANDLER ==========
  const handleTextInputChange = useCallback((
    value: string, 
    setter: (value: string) => void,
    fieldName: string = 'Input'
  ) => {
    if (containsMaliciousCode(value)) {
      toast.error(`${fieldName} contains invalid characters`)
      return
    }
    const { isValid, sanitized } = validateTextInput(value)
    if (!isValid) {
      toast.error(`Invalid ${fieldName}`)
      return
    }
    setter(sanitized)
  }, [])

  // Generate mixed display array when items change
  useEffect(() => {
    if (items.length > 0 && categories.length > 0 && !selectedCategory && !searchTerm) {
      const foodItems = getFoodItems(items, categories)
      const juiceItems = getTopPricedJuices(items, categories)
      const otherItems = getOtherItems(items, categories)
      const mixed = createMixedDisplayArray(foodItems, juiceItems, otherItems)
      setMixedDisplayItems(mixed)
    }
  }, [items, categories, selectedCategory, searchTerm])

  // Load guest data
  useEffect(() => {
    const savedGuestData = sessionStorage.getItem('guestOrderData')
    if (savedGuestData) {
      try {
        setGuestUserData(JSON.parse(savedGuestData))
      } catch (e) {
        console.error('Error parsing guest data:', e)
      }
    }
  }, [])

  // Initialize encryption and load data
  useEffect(() => {
    const initialize = async () => {
      try {
        const hasOldCategories = localStorage.getItem('menu_categories') !== null
        const hasOldItems = localStorage.getItem('menu_items') !== null
        if (hasOldCategories || hasOldItems) {
          console.log('🔄 Migrating old data to encrypted format...')
          await cacheManager.migrateOldData()
        }
        const loaded = await loadFromCache()
        if (!loaded) {
          await fetchMenuData()
        }
      } catch (error) {
        console.error('Initialization error:', error)
        await fetchMenuData()
      }
    }
    initialize()
    return () => {
      if (abortControllerRef.current) abortControllerRef.current.abort()
    }
  }, [])

  // Preload images
  useEffect(() => {
    if (items.length > 0 && !imagesPreloaded) {
      const imageUrls = items
        .map(item => getImageSrc(item.imageUrl))
        .filter(url => url && url !== '/placeholder.svg')
        .slice(0, 8)
      if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        (window as any).requestIdleCallback(() => preloadImages(imageUrls))
      } else {
        setTimeout(() => preloadImages(imageUrls), 100)
      }
      setImagesPreloaded(true)
    }
  }, [items, imagesPreloaded])

  // Filter items
  useEffect(() => {
    if (items.length === 0) return
    let result = [...items]
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
    setFilteredItems(result)
  }, [items, categories, selectedCategory, searchTerm])

  // Fetch arrangement ID
  useEffect(() => {
    const fetchArrangementId = async () => {
      try {
        const response = await api.get('/api/tables/arrangement', {
          params: { restaurantId: 'manyazewal1', floor: 'Ground Floor' },
          timeout: 5000
        })
        if (response.data?.data?._id) {
          setArrangementId(response.data.data._id)
        }
      } catch (error: any) {
        if (error.response?.status !== 404) {
          console.debug('Arrangement fetch skipped:', error.message)
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
      setDetectedTable(null)
      setTableDetected(false)
      setIsQRTable(false)
      localStorage.removeItem('detectedTableNumber')
      localStorage.removeItem('tableDetected')
      localStorage.removeItem('qrcode')
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
    setDetectedTable(table.number.toString())
    setTableDetected(true)
    setIsQRTable(false)
    localStorage.setItem('detectedTableNumber', table.number.toString())
    localStorage.setItem('tableDetected', 'true')
    toast.success(`Table ${table.number} selected!`)
    if (table.capacity && table.capacity < numberOfGuests) {
      setNumberOfGuests(table.capacity)
    }
  }, [numberOfGuests])

  const handleGuestOrder = (guestData: GuestUserData) => {
    const sanitizedGuestData: GuestUserData = {
      firstName: validateTextInput(guestData.firstName).sanitized || '',
      lastName: validateTextInput(guestData.lastName).sanitized || '',
      phone: guestData.phone.replace(/[^0-9+]/g, ''),
      email: guestData.email.replace(/[^a-zA-Z0-9@._-]/g, ''),
      isGuest: true
    }
    setGuestUserData(sanitizedGuestData)
    sessionStorage.setItem('guestOrderData', JSON.stringify(sanitizedGuestData))
  }

  // Delivery fee calculation
  useEffect(() => {
    const timer = setTimeout(() => {
      const calculateDeliveryFee = async () => {
        if (orderType === 'delivery' && isLoggedIn && userData && adjustedSubtotal > 0) {
          setIsCalculatingDelivery(true)
          try {
            let feeDetails: DeliveryFeeDetails
            if (userData.location?.coordinates &&
              Array.isArray(userData.location.coordinates) &&
              userData.location.coordinates.length === 2) {
              const [lng, lat] = userData.location.coordinates
              feeDetails = await deliveryCalculator.calculateDeliveryFeeFromCoordinates(
                lat, lng, adjustedSubtotal, new Date().getHours()
              )
            } else if (userData.address) {
              const area = deliveryCalculator.extractAreaFromAddress(userData.address)
              feeDetails = deliveryCalculator.calculateEstimatedDeliveryFee(
                'Addis Ababa', area, adjustedSubtotal
              )
            } else {
              setDeliveryFee(null)
              setIsCalculatingDelivery(false)
              return
            }
            setDeliveryFee(feeDetails)
          } catch (error) {
            setDeliveryFee(null)
          } finally {
            setIsCalculatingDelivery(false)
          }
        } else {
          setDeliveryFee(null)
        }
      }
      calculateDeliveryFee()
    }, 500)
    return () => clearTimeout(timer)
  }, [orderType, isLoggedIn, userData, adjustedSubtotal, deliveryCalculator])

  const finalTotal = useMemo(() => {
    const deliveryFeeAmount = orderType === 'delivery' && isLoggedIn ? deliveryFee?.fee || 0 : 0
    const packagingFeeAmount = orderType === 'delivery' && isLoggedIn ? packagingCharge : 0
    return adjustedSubtotal + calculatedTax + deliveryFeeAmount + packagingFeeAmount
  }, [adjustedSubtotal, calculatedTax, deliveryFee, packagingCharge, orderType, isLoggedIn])

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

  const handleOrderTypeChange = (type: 'table' | 'delivery' | '') => {
    setOrderType(type)
    if (type !== 'delivery') {
      setDeliveryFee(null)
    }
  }

  // ========== PLACE ORDER HANDLERS ==========
  
  // Show payment upload dialog (for non-QR orders)
  const handlePlaceOrder = () => {
    if (cartItems.length === 0) {
      toast.error('Please add items to your cart')
      return
    }
    if (!orderType) {
      toast.error('Please select order type')
      return
    }
    if (orderType === 'table' && !selectedTableData) {
      toast.error('Please select a table')
      return
    }
    
    // On mobile, show the full-screen payment flow
    if (!isDesktop) {
      setShowMobilePaymentFlow(true)
      setIsCartOpen(false)
      return
    }
    
    // On desktop, show the payment upload dialog
    setShowPaymentUpload(true)
  }

  // Direct order for QR table users - no payment screenshot required
  const handleDirectOrder = async () => {
    if (cartItems.length === 0) return
    if (!selectedTableData) return

    setIsPlacingOrder(true)
    const orderToast = toast.loading('Placing your order...')

    try {
      const assignedWaiterId = getAutoAssignedWaiter()
      const assignedWaiterName = waiters.find(w => w._id === assignedWaiterId)?.name || ''

      const orderItems = cartItems.map(cartItem => ({
        itemId: cartItem._id,
        itemName: sanitizeInput(cartItem.name),
        quantity: cartItem.quantity,
        notes: sanitizeInput(cartItem.specialInstructions || ''),
        price: Number(cartItem.price),
        total: Number(cartItem.price) * cartItem.quantity
      }))

      const isGuest = !isLoggedIn
      const customerName = isLoggedIn
        ? sanitizeInput(`${userData?.firstName || ''} ${userData?.lastName || ''}`.trim()) || 'Walk-in'
        : guestUserData
          ? sanitizeInput(`${guestUserData.firstName} ${guestUserData.lastName}`.trim())
          : 'Guest User'
      const customerPhone = isLoggedIn
        ? userData?.phone?.replace(/[^0-9+]/g, '') || ''
        : guestUserData?.phone?.replace(/[^0-9+]/g, '') || ''

      const orderData = {
        orderNumber: sanitizeInput(orderNumber),
        orderType: 'table',
        paymentMethod: 'CASH',
        restaurantId: selectedTableData.restaurantId || 'manyazewal1',
        restaurantName: sanitizeInput(selectedTableData.restaurantName || 'Manyazewal Restaurant'),
        floor: sanitizeInput(selectedTableData.floor || 'Ground Floor'),
        arrangementId: sanitizeInput(arrangementId),
        numberOfGuests,
        items: orderItems,
        discount: 0,
        specialRequirements: sanitizeInput(specialRequirements),
        transactionId: `QR-${Date.now()}`,
        customerId: isLoggedIn ? (userData?.id || userData?._id || 'walk-in') : 'guest',
        customerName,
        customerPhone,
        subtotal,
        adjustedSubtotal,
        tax: calculatedTax,
        totalAmount: adjustedSubtotal + calculatedTax,
        finalAmount: finalTotal,
        isGuestOrder: isGuest,
        tableNumber: sanitizeInput(selectedTableData.number.toString()),
        tableId: sanitizeInput(selectedTableData.id || ''),
        tableCapacity: selectedTableData.capacity,
        waiterId: sanitizeInput(assignedWaiterId),
        waiterName: sanitizeInput(assignedWaiterName),
        inTable: true,
        delivery: false,
        qrOrder: true
      }

      const formData = new FormData()
      formData.append('orderData', JSON.stringify(orderData))

      const response = await fetch('/api/order', { method: 'POST', body: formData })
      const result = await response.json()

      if (!response.ok) throw new Error(result.error || result.message || 'Failed to place order')

      clearCart()
      setOrderNumber(`ORD-${Date.now().toString().slice(-6)}`)
      setOrderType('')
      setTableNumber('')
      setSelectedTableData(null)
      setSpecialRequirements('')
      setIsCartOpen(false)
      setShowMobilePaymentFlow(false)

      toast.success('Order placed successfully!', { id: orderToast, duration: 5000 })

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

  // Handle payment screenshot upload
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
      const sanitizedFileName = sanitizeInput(file.name)
      if (sanitizedFileName !== file.name) {
        toast.error('File name contains invalid characters')
        return
      }
      const previewUrl = URL.createObjectURL(file)
      setPaymentScreenshot({ file, previewUrl, uploaded: true })
      toast.success('Payment screenshot uploaded')
    }
  }

  const handlePaymentScreenshotUpload = (file: File) => {
    const previewUrl = URL.createObjectURL(file)
    setPaymentScreenshot({ file, previewUrl, uploaded: true })
    toast.success('Payment screenshot uploaded')
  }

  const removePaymentScreenshot = () => {
    if (paymentScreenshot.previewUrl) URL.revokeObjectURL(paymentScreenshot.previewUrl)
    setPaymentScreenshot({ file: null, previewUrl: '', uploaded: false })
  }

  // Finalize order with payment
  const handleFinalizeOrder = async () => {
    if (!paymentScreenshot.uploaded || !paymentScreenshot.file) {
      toast.error('Please upload payment screenshot')
      return
    }

    setIsPlacingOrder(true)
    const orderToast = toast.loading('Processing your order...')

    try {
      const deliveryFeeAmount = orderType === 'delivery' && isLoggedIn ? deliveryFee?.fee || 0 : 0
      const packagingFeeAmount = orderType === 'delivery' && isLoggedIn ? packagingCharge : 0
      const assignedWaiterId = orderType === 'table' ? getAutoAssignedWaiter() : ''
      const assignedWaiterName = waiters.find(w => w._id === assignedWaiterId)?.name || ''

      const orderItems = cartItems.map(cartItem => {
        const category = categories.find(c => c._id === cartItem.categoryId)
        const basePrice = Number(cartItem.price)
        const categoryCharge = orderType === 'delivery' && isLoggedIn
          ? getCategoryAdditionalCharge(category?.name || '', category?.type)
          : 0
        const finalItemPrice = basePrice + categoryCharge
        return {
          itemId: cartItem._id,
          itemName: sanitizeInput(cartItem.name),
          quantity: cartItem.quantity,
          notes: sanitizeInput(cartItem.specialInstructions || ''),
          basePrice: basePrice,
          categoryCharge: categoryCharge,
          price: finalItemPrice,
          total: finalItemPrice * cartItem.quantity
        }
      })

      const isGuest = !isLoggedIn && orderType === 'table'
      const customerId = isLoggedIn 
        ? (userData?.id || userData?._id || 'walk-in')
        : (guestUserData ? 'guest' : 'walk-in')
      const customerName = isLoggedIn 
        ? sanitizeInput(`${userData?.firstName || ''} ${userData?.lastName || ''}`.trim()) || 'Walk-in'
        : guestUserData 
          ? sanitizeInput(`${guestUserData.firstName} ${guestUserData.lastName}`.trim())
          : 'Guest User'
      const customerPhone = isLoggedIn 
        ? userData?.phone?.replace(/[^0-9+]/g, '') || ''
        : guestUserData?.phone?.replace(/[^0-9+]/g, '') || ''
      const customerEmail = isLoggedIn 
        ? userData?.email?.replace(/[^a-zA-Z0-9@._-]/g, '') || ''
        : guestUserData?.email?.replace(/[^a-zA-Z0-9@._-]/g, '') || ''

      const orderData = {
        orderNumber: sanitizeInput(orderNumber),
        orderType,
        paymentMethod: 'ONLINE',
        restaurantId: selectedTableData?.restaurantId || 'manyazewal1',
        restaurantName: sanitizeInput(selectedTableData?.restaurantName || 'Manyazewal Restaurant'),
        floor: sanitizeInput(selectedTableData?.floor || 'Ground Floor'),
        arrangementId: sanitizeInput(arrangementId),
        numberOfGuests: orderType === 'table' ? numberOfGuests : 1,
        items: orderItems,
        discount: 0,
        specialRequirements: sanitizeInput(specialRequirements),
        transactionId: sanitizeInput(transactionId) || `TXN-${Date.now()}`,
        customerId: sanitizeInput(customerId),
        customerName,
        customerPhone,
        customerEmail,
        deliveryFee: deliveryFeeAmount,
        packagingCharge: packagingFeeAmount,
        categoryChargesTotal: orderType === 'delivery' && isLoggedIn ? categoryChargesTotal : 0,
        subtotal: subtotal,
        adjustedSubtotal: adjustedSubtotal,
        tax: calculatedTax,
        totalAmount: adjustedSubtotal + calculatedTax,
        finalAmount: finalTotal,
        isGuestOrder: isGuest,
        ...(orderType === 'table' && {
          tableNumber: sanitizeInput(selectedTableData?.number.toString() || tableNumber),
          tableId: sanitizeInput(selectedTableData?.id || ''),
          tableCapacity: selectedTableData?.capacity,
          waiterId: sanitizeInput(assignedWaiterId),
          waiterName: sanitizeInput(assignedWaiterName),
          inTable: true,
          delivery: false
        })
      }

      if (isGuest && guestUserData) {
        ;(orderData as any).guestInfo = {
          firstName: sanitizeInput(guestUserData.firstName),
          lastName: sanitizeInput(guestUserData.lastName),
          phone: guestUserData.phone.replace(/[^0-9+]/g, ''),
          email: guestUserData.email.replace(/[^a-zA-Z0-9@._-]/g, ''),
          isGuest: true
        }
      }

      if (orderType === 'delivery' && isLoggedIn) {
        let locationData = null
        if (userData?.location?.coordinates && Array.isArray(userData.location.coordinates) && userData.location.coordinates.length === 2) {
          const [lng, lat] = userData.location.coordinates
          locationData = { type: "Point", coordinates: [lng, lat] }
        }
        ;(orderData as any).deliveryInfo = {
          fullName: customerName,
          phoneNumber: customerPhone,
          email: customerEmail,
          address: sanitizeInput(userData?.address || ''),
          city: 'Addis Ababa',
          landmark: sanitizeInput(userData?.landmark || ''),
          deliveryInstructions: sanitizeInput(specialRequirements || ''),
          location: locationData
        }
        ;(orderData as any).delivery = true
        ;(orderData as any).inTable = false
      }

      const formData = new FormData()
      formData.append('paymentScreenshot', paymentScreenshot.file)
      formData.append('orderData', JSON.stringify(orderData))

      const endpoint = orderType === 'delivery' ? '/api/delivery' : '/api/order'
      const response = await fetch(endpoint, { method: 'POST', body: formData })
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
      setShowMobilePaymentFlow(false)
      setIsCartOpen(false)
      
      if (isGuest) {
        sessionStorage.removeItem('guestOrderData')
        setGuestUserData(null)
      }

      toast.success('Order placed successfully!', { id: orderToast, duration: 5000 })

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
  
  const handleRefresh = () => {
    setDataLoaded(false)
    fetchMenuData()
  }

  const categoryCounts = useMemo(() => {
    return items.reduce((acc, item) => {
      acc[item.categoryId] = (acc[item.categoryId] || 0) + 1
      return acc
    }, {} as Record<string, number>)
  }, [items])

  const clearFilters = () => {
    setSearchTerm('')
    setSearchInputValue('')
    setSelectedCategory(null)
    setSearchError(null)
    setMobileStep('categories')
    setSelectedCategoryForMobile(null)
    setDesktopStep('categories')
    setSelectedCategoryForDesktop(null)
    setFastingFilter('all')
    toast.success('All filters cleared')
  }

  const hasActiveFilters = searchTerm !== '' || selectedCategory !== null || fastingFilter !== 'all'

  // ========== DESKTOP TWO-STEP NAVIGATION ==========

  // Skeleton for desktop categories
  const renderDesktopCategorySkeleton = () => (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <div className="flex justify-between items-center mb-3">
        <Skeleton className="h-4 w-32 rounded" />
        <Skeleton className="h-3 w-16 rounded" />
      </div>
      {[0, 1].map(row => (
        <div key={row} className="grid grid-cols-3 gap-4">
          {[0, 1, 2].map(col => (
            <div key={col} className="flex flex-col items-center">
              <Skeleton className="w-32 h-32 rounded-xl" />
              <Skeleton className="h-4 w-24 mt-2 rounded" />
            </div>
          ))}
        </div>
      ))}
    </motion.div>
  )

  // Step 1: Categories List - Desktop
  const renderDesktopCategories = () => {
    if (loading || !dataLoaded) return renderDesktopCategorySkeleton()

    const categoriesWithItems = sortedCategories.filter(category => {
      const categoryItems = items.filter(item =>
        item.categoryId === category._id && item.isActive !== false
      )
      return categoryItems.length > 0
    })

    if (categoriesWithItems.length === 0) return renderDesktopCategorySkeleton()

    const groupedCategories = []
    for (let i = 0; i < categoriesWithItems.length; i += 3) {
      groupedCategories.push(categoriesWithItems.slice(i, i + 3))
    }

    return (
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="space-y-4"
      >
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-sm font-medium text-gray-600">Select a Category</h2>
          <span className="text-xs text-gray-400">{categoriesWithItems.length} categories</span>
        </div>
        
        {groupedCategories.map((group, groupIndex) => (
          <div key={groupIndex} className="grid grid-cols-3 gap-4">
            {group.map((category) => {
              const categoryItems = items.filter(item => 
                item.categoryId === category._id && item.isActive !== false
              )
              const itemCount = categoryItems.length
              const representativeItem = categoryItems[0]
              
              return (
                <div
                  key={category._id}
                  onClick={() => {
                    setSelectedCategoryForDesktop(category)
                    setDesktopStep('items')
                    setFastingFilter('all')
                  }}
                  className="flex flex-col items-center cursor-pointer"
                >
                  <div className="w-32 h-32 rounded-xl overflow-hidden">
                    {representativeItem && representativeItem.imageUrl ? (
                      <img
                        src={getImageSrc(representativeItem.imageUrl)}
                        alt={category.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none'
                        }}
                      />
                    ) : (
                      <div className="flex items-center justify-center w-full h-full bg-purple-50">
                        {getCategoryIcon(category.type, "h-12 w-12 text-purple-900/60")}
                      </div>
                    )}
                  </div>
                  <div className="mt-2 text-center">
                    <h3 className="text-base font-medium text-gray-700 truncate max-w-[128px]">
                      {category.name}
                    </h3>
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </motion.div>
    )
  }

  // Step 2: Items for selected category (Desktop)
  const renderDesktopCategoryItems = () => {
    if (!selectedCategoryForDesktop) return null

    let categoryItems = items.filter(item => 
      item.categoryId === selectedCategoryForDesktop._id && item.isActive !== false
    )

    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      categoryItems = categoryItems.filter(item =>
        item.name.toLowerCase().includes(term) ||
        (item.description?.toLowerCase() || '').includes(term)
      )
    }

    if (fastingFilter === 'fasting') {
      categoryItems = categoryItems.filter(item => item.isFasting === true)
    } else if (fastingFilter === 'non-fasting') {
      categoryItems = categoryItems.filter(item => item.isFasting !== true)
    }

    return (
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.3 }}
        className="space-y-4"
      >
        <div className="flex items-center justify-between bg-white/80 backdrop-blur-sm rounded-xl p-3 border border-purple-100 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setDesktopStep('categories')
                setSelectedCategoryForDesktop(null)
                setSearchTerm('')
                setSearchInputValue('')
                setFastingFilter('all')
              }}
              className="p-1.5 hover:bg-purple-50 rounded-lg transition-colors"
              aria-label="Go back to categories"
            >
              <ArrowLeft className="h-4 w-4 text-purple-900" />
            </button>
            <div>
              <h2 className="text-base font-semibold text-gray-800">
                {selectedCategoryForDesktop.name}
              </h2>
              <p className="text-xs text-gray-400">
                {categoryItems.length} {categoryItems.length === 1 ? 'item' : 'items'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-purple-500" size={13} />
              <Input
                type="text"
                placeholder="Search..."
                value={searchInputValue}
                onChange={handleSearchChange}
                className={`pl-8 pr-7 py-1.5 h-8 text-xs bg-white border rounded-lg focus:border-purple-900 focus:ring-2 transition-all shadow-sm w-36 lg:w-48 ${
                  searchError ? 'border-red-500 ring-2 ring-red-200' : 'border-purple-200 focus:ring-purple-200'
                }`}
                maxLength={100}
                autoComplete="off"
                spellCheck={false}
              />
              {searchInputValue && (
                <button 
                  onClick={() => {
                    setSearchInputValue('')
                    setSearchTerm('')
                    setSearchError(null)
                  }} 
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label="Clear search"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Fasting Filter Tabs - Desktop */}
            <div className="flex items-center gap-1 bg-purple-50 rounded-lg p-1 border border-purple-100">
              <button
                onClick={() => setFastingFilter('all')}
                className={`px-2 py-1 text-xs font-medium rounded-md transition-all ${
                  fastingFilter === 'all'
                    ? 'bg-white shadow-sm text-purple-900'
                    : 'text-gray-400 hover:text-purple-600'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFastingFilter('fasting')}
                className={`px-2 py-1 text-xs font-medium rounded-md transition-all ${
                  fastingFilter === 'fasting'
                    ? 'bg-green-100 text-green-700'
                    : 'text-gray-400 hover:text-green-600'
                }`}
              >
                Fasting
              </button>
              <button
                onClick={() => setFastingFilter('non-fasting')}
                className={`px-2 py-1 text-xs font-medium rounded-md transition-all ${
                  fastingFilter === 'non-fasting'
                    ? 'bg-orange-100 text-orange-700'
                    : 'text-gray-400 hover:text-orange-600'
                }`}
              >
                Non-Fasting
              </button>
            </div>

            {/* View Toggle */}
            <div className="flex items-center gap-1 bg-purple-50 rounded-lg p-1 border border-purple-100">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md transition-all ${
                  viewMode === 'grid' 
                    ? 'bg-white shadow-sm text-purple-900' 
                    : 'text-gray-400 hover:text-purple-600'
                }`}
                aria-label="Grid view"
              >
                <Grid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-md transition-all ${
                  viewMode === 'list' 
                    ? 'bg-white shadow-sm text-purple-900' 
                    : 'text-gray-400 hover:text-purple-600'
                }`}
                aria-label="List view"
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {categoryItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 bg-white/50 rounded-2xl border border-purple-100">
            <p className="text-gray-500">No items in this category</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(144px,1fr))] gap-3">
            {categoryItems.map((item, index) => {
              const category = categories.find(c => c._id === item.categoryId)
              const categoryName = category?.name || 'Uncategorized'
              return (
                <MinimalItemCard
                  key={item._id}
                  item={item}
                  categoryName={categoryName}
                  onAddToCart={addToCart}
                  onViewDetails={handleViewDetails}
                  index={index}
                  isDesktop={true}
                />
              )
            })}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {categoryItems.map((item, index) => {
              const category = categories.find(c => c._id === item.categoryId)
              const categoryName = category?.name || 'Uncategorized'
              return (
                <DesktopListViewItem
                  key={item._id}
                  item={item}
                  categoryName={categoryName}
                  onAddToCart={addToCart}
                  onViewDetails={handleViewDetails}
                  index={index}
                />
              )
            })}
          </div>
        )}
      </motion.div>
    )
  }

  // ========== MOBILE TWO-STEP NAVIGATION ==========

  // Skeleton for mobile categories
  const renderMobileCategorySkeleton = () => (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-2.5 bg-white rounded-xl border border-purple-100/50">
          <Skeleton className="w-11 h-11 rounded-lg flex-shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3 w-28 rounded" />
            <Skeleton className="h-2.5 w-16 rounded" />
          </div>
          <Skeleton className="w-4 h-4 rounded flex-shrink-0" />
        </div>
      ))}
    </motion.div>
  )

  // Step 1: Categories List - Mobile
  const renderMobileCategories = () => {
    if (loading || !dataLoaded) return renderMobileCategorySkeleton()

    const categoriesWithItems = sortedCategories.filter(category => {
      const categoryItems = items.filter(item =>
        item.categoryId === category._id && item.isActive !== false
      )
      return categoryItems.length > 0
    })

    if (categoriesWithItems.length === 0) return renderMobileCategorySkeleton()

    return (
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="space-y-2"
      >
        {categoriesWithItems.map((category) => {
          const categoryItems = items.filter(item => 
            item.categoryId === category._id && item.isActive !== false
          )
          const itemCount = categoryItems.length
          const representativeItem = categoryItems[0]
          
          return (
            <motion.div
              key={category._id}
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                setSelectedCategoryForMobile(category)
                setMobileStep('items')
                setFastingFilter('all')
              }}
              className="flex items-center gap-3 p-2.5 bg-white rounded-xl shadow-sm border border-purple-100/50 active:bg-purple-50/50 transition-all cursor-pointer"
            >
              <div className="relative w-11 h-11 rounded-lg overflow-hidden bg-gradient-to-br from-purple-100 to-purple-200 flex-shrink-0">
                {representativeItem && representativeItem.imageUrl ? (
                  <img
                    src={getImageSrc(representativeItem.imageUrl)}
                    alt={category.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none'
                    }}
                  />
                ) : (
                  <div className="flex items-center justify-center w-full h-full">
                    {getCategoryIcon(category.type, "h-4 w-4 text-purple-900")}
                  </div>
                )}
                <div className="absolute -top-1 -right-1 bg-purple-900 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center shadow-lg">
                  {itemCount}
                </div>
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs font-semibold text-gray-800 truncate">
                    {category.name}
                  </h3>
                  <div className="p-0.5 bg-purple-100 rounded">
                    {getCategoryIcon(category.type, "h-2.5 w-2.5 text-purple-900")}
                  </div>
                </div>
                <p className="text-[10px] text-gray-400">
                  {itemCount} {itemCount === 1 ? 'item' : 'items'}
                </p>
              </div>
              
              <ChevronRight className="h-4 w-4 text-gray-300 flex-shrink-0" />
            </motion.div>
          )
        })}
      </motion.div>
    )
  }

  // Step 2: Items for selected category (Mobile)
  const renderMobileCategoryItems = () => {
    if (!selectedCategoryForMobile) return null

    let categoryItems = items.filter(item => 
      item.categoryId === selectedCategoryForMobile._id && item.isActive !== false
    )

    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      categoryItems = categoryItems.filter(item =>
        item.name.toLowerCase().includes(term) ||
        (item.description?.toLowerCase() || '').includes(term)
      )
    }

    if (fastingFilter === 'fasting') {
      categoryItems = categoryItems.filter(item => item.isFasting === true)
    } else if (fastingFilter === 'non-fasting') {
      categoryItems = categoryItems.filter(item => item.isFasting !== true)
    }

    return (
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="space-y-3 pb-4"
      >
        {categoryItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8">
            <p className="text-gray-500 text-sm">
              {fastingFilter === 'all' 
                ? 'No items in this category' 
                : fastingFilter === 'fasting' 
                  ? 'No fasting items available' 
                  : 'No non-fasting items available'}
            </p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 gap-2.5">
            {categoryItems.map((item, index) => {
              return (
                <MinimalItemCard
                  key={item._id}
                  item={item}
                  categoryName={selectedCategoryForMobile.name}
                  onAddToCart={addToCart}
                  onViewDetails={handleViewDetails}
                  index={index}
                  isDesktop={false}
                />
              )
            })}
          </div>
        ) : (
          <div className="space-y-2">
            {categoryItems.map((item, index) => {
              return (
                <ListViewItemCard
                  key={item._id}
                  item={item}
                  categoryName={selectedCategoryForMobile.name}
                  onAddToCart={addToCart}
                  onViewDetails={handleViewDetails}
                  index={index}
                />
              )
            })}
          </div>
        )}
      </motion.div>
    )
  }

  // Top-level loading screen
  if (loading && !dataLoaded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50/50 via-white to-purple-50/30">
        <NavBar />
        <main className="container mx-auto px-3 md:px-4 py-3 md:py-4">
          <div className="md:hidden space-y-2">
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className="flex items-center gap-3 p-2.5 bg-white rounded-xl border border-purple-100/50"
              >
                <Skeleton className="w-11 h-11 rounded-lg flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-28 rounded" />
                  <Skeleton className="h-2.5 w-16 rounded" />
                </div>
                <Skeleton className="w-4 h-4 rounded flex-shrink-0" />
              </motion.div>
            ))}
          </div>
          <div className="hidden md:block space-y-4">
            <div className="flex justify-between items-center mb-3">
              <Skeleton className="h-4 w-32 rounded" />
              <Skeleton className="h-3 w-16 rounded" />
            </div>
            {[0, 1].map(row => (
              <div key={row} className="grid grid-cols-3 gap-4">
                {[0, 1, 2].map(col => (
                  <motion.div
                    key={col}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: (row * 3 + col) * 0.07 }}
                    className="flex flex-col items-center"
                  >
                    <Skeleton className="w-32 h-32 rounded-xl" />
                    <Skeleton className="h-4 w-24 mt-2 rounded" />
                  </motion.div>
                ))}
              </div>
            ))}
          </div>
        </main>
      </div>
    )
  }

  return (
    <>
      <NavBar />
      
      <div className="min-h-screen bg-gradient-to-br from-purple-50/50 via-white to-purple-50/30 pb-20 md:pb-0">
        
        {/* ========== MOBILE HEADER WITH FASTING TABS & VIEW TOGGLE ========== */}
        {mobileStep === 'items' && (
          <div className="md:hidden sticky top-0 z-50 w-full bg-white/95 backdrop-blur-xl shadow-sm border-b border-purple-100">
            <div className="px-3 py-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setMobileStep('categories')
                    setSelectedCategoryForMobile(null)
                    setSearchTerm('')
                    setSearchInputValue('')
                    setFastingFilter('all')
                  }}
                  className="p-1.5 hover:bg-purple-50 rounded-lg transition-colors flex-shrink-0"
                  aria-label="Go back to categories"
                >
                  <ArrowLeft className="h-5 w-5 text-purple-900" />
                </button>

                <div className="flex-1 flex items-center justify-center gap-1 min-w-0">
                  <button
                    onClick={() => setFastingFilter('all')}
                    className={`px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap ${
                      fastingFilter === 'all'
                        ? 'text-purple-900 border-b-2 border-purple-900'
                        : 'text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setFastingFilter('fasting')}
                    className={`px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap ${
                      fastingFilter === 'fasting'
                        ? 'text-green-600 border-b-2 border-green-600'
                        : 'text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    Fasting
                  </button>
                  <button
                    onClick={() => setFastingFilter('non-fasting')}
                    className={`px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap ${
                      fastingFilter === 'non-fasting'
                        ? 'text-orange-600 border-b-2 border-orange-600'
                        : 'text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    Non-Fasting
                  </button>
                </div>

                <div className="flex items-center gap-0.5 bg-purple-50 rounded-lg p-1 border border-purple-100 flex-shrink-0">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-1.5 rounded-md transition-all ${
                      viewMode === 'grid' 
                        ? 'bg-white shadow-sm text-purple-900' 
                        : 'text-gray-400 hover:text-purple-600'
                    }`}
                    aria-label="Grid view"
                  >
                    <Grid className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-1.5 rounded-md transition-all ${
                      viewMode === 'list' 
                        ? 'bg-white shadow-sm text-purple-900' 
                        : 'text-gray-400 hover:text-purple-600'
                    }`}
                    aria-label="List view"
                  >
                    <List className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <main className="container mx-auto px-3 md:px-4 py-3 md:py-4">
          {/* ========== DESKTOP VIEW ========== */}
          <div className="hidden md:block">
            <AnimatePresence mode="wait">
              {desktopStep === 'categories' ? (
                renderDesktopCategories()
              ) : (
                renderDesktopCategoryItems()
              )}
            </AnimatePresence>
          </div>
          
          {/* ========== MOBILE VIEW ========== */}
          <div className="md:hidden">
            <AnimatePresence mode="wait">
              {mobileStep === 'categories' ? (
                <motion.div
                  key="mobile-categories"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  {renderMobileCategories()}
                </motion.div>
              ) : (
                <motion.div
                  key="mobile-items"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  {renderMobileCategoryItems()}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>
      </div>

      {/* Floating Cart Button - Both Desktop and Mobile */}
      <div className="fixed bottom-6 right-4 z-50">
        <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
          <SheetTrigger asChild>
            <motion.button 
              whileHover={{ scale: 1.05 }} 
              whileTap={{ scale: 0.95 }} 
              onClick={() => setIsCartOpen(true)} 
              className="relative bg-gradient-to-r from-purple-800 to-purple-900 text-white rounded-full p-3.5 shadow-lg shadow-purple-500/30"
            >
              <ShoppingCart className="h-5 w-5" />
              {totalItems > 0 && (
                <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full h-5 w-5 flex items-center justify-center shadow-md">
                  {totalItems}
                </motion.span>
              )}
            </motion.button>
          </SheetTrigger>
        </Sheet>
      </div>

      {/* Desktop Full-Screen Cart */}
      {isCartOpen && isDesktop && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsCartOpen(false)} />
          <div className="relative w-[96vw] h-[93vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <CartPanel 
              cart={cartItems} 
              onClose={() => setIsCartOpen(false)} 
              onRemoveItem={removeFromCart} 
              onUpdateQuantity={updateQuantity} 
              orderType={orderType} 
              onOrderTypeChange={handleOrderTypeChange}
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
              onSpecialRequirementsChange={(value) => handleTextInputChange(value, setSpecialRequirements, 'Special requirements')}
              subtotal={adjustedSubtotal} 
              tax={calculatedTax} 
              deliveryFee={deliveryFee} 
              total={finalTotal} 
              orderNumber={orderNumber} 
              onPlaceOrder={handlePlaceOrder} 
              isPlacingOrder={isPlacingOrder} 
              isUserLoggedIn={isLoggedIn}
              onLoginRequired={() => {}}
              userData={userData as UserData | null}
              onNavigateToProfile={handleNavigateToProfile} 
              isCalculatingDelivery={isCalculatingDelivery} 
              restaurantId="manyazewal1" 
              floor="Ground Floor" 
              arrangementId={arrangementId}
              onGuestOrder={handleGuestOrder}
              tableFromQR={isQRTable}
              onPlaceOrderDirect={isQRTable ? handleDirectOrder : undefined}
              onQRDetected={() => setIsQRTable(true)}
              fullScreen
            />
          </div>
        </div>
      )}

      {/* Mobile Cart Sheet */}
      {!isDesktop && (
        <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
          <SheetContent side="right" className="w-full sm:max-w-lg p-0 bg-gradient-to-br from-white to-purple-50/30 border-l-0 shadow-2xl">
            <CartPanel 
              cart={cartItems} 
              onClose={() => setIsCartOpen(false)} 
              onRemoveItem={removeFromCart} 
              onUpdateQuantity={updateQuantity} 
              orderType={orderType} 
              onOrderTypeChange={handleOrderTypeChange}
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
              onSpecialRequirementsChange={(value) => handleTextInputChange(value, setSpecialRequirements, 'Special requirements')}
              subtotal={adjustedSubtotal} 
              tax={calculatedTax} 
              deliveryFee={deliveryFee} 
              total={finalTotal} 
              orderNumber={orderNumber} 
              onPlaceOrder={handlePlaceOrder} 
              isPlacingOrder={isPlacingOrder} 
              isUserLoggedIn={isLoggedIn}
              onLoginRequired={() => {}}
              userData={userData as UserData | null}
              onNavigateToProfile={handleNavigateToProfile} 
              isCalculatingDelivery={isCalculatingDelivery} 
              restaurantId="manyazewal1" 
              floor="Ground Floor" 
              arrangementId={arrangementId}
              onGuestOrder={handleGuestOrder}
              tableFromQR={isQRTable}
              onPlaceOrderDirect={isQRTable ? handleDirectOrder : undefined}
              onQRDetected={() => setIsQRTable(true)}
            />
          </SheetContent>
        </Sheet>
      )}

      {/* Mobile Full-Screen Payment Flow */}
      <MobilePaymentFlow
        isOpen={showMobilePaymentFlow}
        onClose={() => {
          setShowMobilePaymentFlow(false)
          setIsCartOpen(true)
        }}
        cartItems={cartItems}
        onRemoveItem={removeFromCart}
        onUpdateQuantity={updateQuantity}
        orderType={orderType}
        onOrderTypeChange={handleOrderTypeChange}
        tableNumber={tableNumber}
        onTableNumberChange={setTableNumber}
        selectedTableData={selectedTableData}
        onTableSelect={handleTableSelect}
        numberOfGuests={numberOfGuests}
        onGuestsChange={setNumberOfGuests}
        specialRequirements={specialRequirements}
        onSpecialRequirementsChange={(value) => handleTextInputChange(value, setSpecialRequirements, 'Special requirements')}
        subtotal={adjustedSubtotal}
        tax={calculatedTax}
        deliveryFee={deliveryFee}
        total={finalTotal}
        onPlaceOrder={handlePlaceOrder}
        isPlacingOrder={isPlacingOrder}
        isUserLoggedIn={isLoggedIn}
        userData={userData as UserData | null}
        tableFromQR={isQRTable}
        onPlaceOrderDirect={isQRTable ? handleDirectOrder : undefined}
        onPaymentScreenshotUpload={handlePaymentScreenshotUpload}
        onPaymentScreenshotRemove={removePaymentScreenshot}
        paymentScreenshot={paymentScreenshot}
        transactionId={transactionId}
        onTransactionIdChange={(value) => handleTextInputChange(value, setTransactionId, 'Transaction ID')}
        onFinalizeOrder={handleFinalizeOrder}
        guestData={guestUserData}
        onGuestOrder={handleGuestOrder}
        isQRTable={isQRTable}
      />

      {/* Desktop Payment Upload Dialog */}
      <PaymentUploadDialog 
        open={showPaymentUpload} 
        onOpenChange={setShowPaymentUpload} 
        paymentScreenshot={paymentScreenshot} 
        onRemoveScreenshot={removePaymentScreenshot} 
        onFileUpload={handleFileUpload} 
        transactionId={transactionId} 
        onTransactionIdChange={(value) => handleTextInputChange(value, setTransactionId, 'Transaction ID')}
        subtotal={adjustedSubtotal} 
        tax={calculatedTax} 
        orderType={orderType} 
        deliveryFee={orderType === 'delivery' && isLoggedIn ? deliveryFee?.fee || 0 : 0} 
        total={finalTotal} 
        onFinalizeOrder={handleFinalizeOrder} 
        isPlacingOrder={isPlacingOrder}
        isUserLoggedIn={isLoggedIn}
        onGuestOrder={handleGuestOrder}
        guestData={guestUserData}
      />
      
      {/* Item Detail Dialog */}
      {selectedItem && (
        <ItemDetailDialog 
          item={selectedItem} 
          categoryName={categories.find(c => c._id === selectedItem.categoryId)?.name || 'Uncategorized'} 
          isOpen={showItemDetail} 
          onOpenChange={setShowItemDetail} 
          onAddToCart={(item, specialInstructions) => addToCart(item, 1, specialInstructions)} 
          isUserLoggedIn={true}
          onLoginRequired={() => {}}
        />
      )}
      
      {/* Order Progress Indicator */}
      <OrderProgressIndicator progress={orderProgress} orderType={orderType} />
    </>
  )
}