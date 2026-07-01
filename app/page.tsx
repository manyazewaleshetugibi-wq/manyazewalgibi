// app/menu/page.tsx - COMPLETE TWO-STEP NAVIGATION WITH VIEW TOGGLE & FASTING TABS & TABLE DETECTION & CART PERSISTENCE

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
  User, Users, MapPin, Phone, Mail, CheckCircle
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
 * Removes HTML tags, scripts, and dangerous characters
 */
const sanitizeInput = (input: string): string => {
  if (!input) return ''
  
  // Remove HTML tags
  let sanitized = input.replace(/<[^>]*>/g, '')
  
  // Remove script tags and their content
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
  
  // Remove javascript: protocol
  sanitized = sanitized.replace(/javascript:/gi, '')
  
  // Remove on* event handlers
  sanitized = sanitized.replace(/\son\w+\s*=/gi, '')
  
  // Remove eval, alert, confirm, prompt
  sanitized = sanitized.replace(/\b(alert|confirm|prompt|eval|function)\s*\(/gi, '')
  
  // Remove special characters that could be used for injection
  sanitized = sanitized.replace(/[<>{}()\[\]\\;'"`]/g, '')
  
  // Trim extra spaces
  sanitized = sanitized.trim()
  
  return sanitized
}

/**
 * Validate search input - only allow alphanumeric, spaces, and basic punctuation
 */
const validateSearchInput = (input: string): { isValid: boolean; sanitized: string } => {
  if (!input) return { isValid: true, sanitized: '' }
  
  // First sanitize
  const sanitized = sanitizeInput(input)
  
  // Allow: letters (including accented), numbers, spaces, hyphens, apostrophes, periods, commas
  const validPattern = /^[a-zA-Z0-9\s\-'.,\u00C0-\u017F]*$/
  
  if (!validPattern.test(sanitized)) {
    // Remove any remaining invalid characters
    const cleaned = sanitized.replace(/[^a-zA-Z0-9\s\-'.,\u00C0-\u017F]/g, '')
    return { isValid: true, sanitized: cleaned }
  }
  
  return { isValid: true, sanitized }
}

/**
 * Validate text input for general use (comments, notes, etc.)
 * Less restrictive than search but still secure
 */
const validateTextInput = (input: string): { isValid: boolean; sanitized: string } => {
  if (!input) return { isValid: true, sanitized: '' }
  
  // First sanitize
  let sanitized = sanitizeInput(input)
  
  // Allow more characters for general text
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
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /alert\s*\(/i,
    /confirm\s*\(/i,
    /prompt\s*\(/i,
    /eval\s*\(/i,
    /document\./i,
    /window\./i,
    /<iframe/i,
    /<object/i,
    /<embed/i,
    /<link/i,
    /<meta/i,
    /<style/i,
    /<base/i,
    /<form/i,
    /<input/i,
    /<button/i,
    /<textarea/i,
    /<select/i,
    /<option/i,
    /<svg/i,
    /<math/i,
    /&#/i, // HTML entities
    /%3C/i, // URL encoded <
    /%3E/i, // URL encoded >
    /%22/i, // URL encoded "
    /%27/i, // URL encoded '
    /%3B/i, // URL encoded ;
    /%2F/i, // URL encoded /
    /%5C/i, // URL encoded \
    /%3D/i, // URL encoded =
  ]
  
  return maliciousPatterns.some(pattern => pattern.test(input))
}

/**
 * Input validation hook for form fields
 */
const useInputValidation = () => {
  const [error, setError] = useState<string | null>(null)
  
  const validateAndSanitize = (value: string, type: 'search' | 'text' | 'number' = 'text'): string => {
    setError(null)
    
    // Check for malicious code first
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
        // For numbers, only allow digits and decimal points
        const numSanitized = value.replace(/[^0-9.]/g, '')
        return numSanitized
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

// Category type detection
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
// Ultra-minimal card: image (w-36 for desktop) + name + dot menu (opens details directly)
// Name and three dots fit within image width
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

  // Handle image click - ADD TO CART
  const handleImageClick = () => {
    onAddToCart(item)
    toast.success(`Added ${item.name} to cart!`)
  }

  // Handle three dots click - OPEN DETAILS DIRECTLY
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
      {/* Image - Click to add to cart */}
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
        
        {/* Add to cart overlay on hover */}
        <div className={`
          absolute inset-0 bg-purple-900/60 flex items-center justify-center 
          transition-opacity duration-200 rounded-lg
          ${isHovered ? 'opacity-100' : 'opacity-0'}
        `}>
          <ShoppingCart className="h-5 w-5 text-white" />
        </div>
      </div>

      {/* Name and Dot Menu - fits within image width, no extra padding */}
      <div className="w-full flex items-center justify-between mt-1 px-0.5">
        <h3 className="text-xs font-medium text-gray-700 truncate flex-1 min-w-0">
          {item.name}
        </h3>
        
        {/* Three Dots - Click to open details directly */}
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

// ========== LIST VIEW ITEM CARD (MOBILE) ==========
// Image on left (w-16 h-16), Name + Price + Description on right (vertical, description 1 line)
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
      {/* Image - w-16 h-16, clickable to add to cart */}
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

      {/* Right side: Name, Price, Description (vertical, description 1 line) */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1">
          <h3 className="text-sm font-medium text-gray-800 truncate flex-1">
            {item.name}
          </h3>
          <span className="text-sm font-bold text-purple-900 whitespace-nowrap">
            ${item.price.toFixed(2)}
          </span>
        </div>
        
        {/* Description - one line only */}
        {item.description && (
          <p className="text-xs text-gray-500 truncate mt-0.5">
            {item.description}
          </p>
        )}
        
        {/* Category name - small */}
        <p className="text-[10px] text-gray-400 mt-0.5">
          {categoryName}
        </p>
      </div>

      {/* Quick add button */}
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

// ========== LIST VIEW FOR DESKTOP (2 cards per row) ==========
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
      {/* Image - w-20 h-20 */}
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

      {/* Right side content */}
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

      {/* Quick add button */}
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

export default function MenuPage() {
  const router = useRouter()
  const searchParams = useSearchParams() // Get search params from URL
  const { userData, isLoggedIn } = useUserData()
  
  // ========== CART STATE WITH LOCALSTORAGE PERSISTENCE ==========
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [cartLoaded, setCartLoaded] = useState(false)

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
        // Update quantity if item already exists
        return prev.map(cartItem =>
          cartItem._id === item._id
            ? { 
                ...cartItem, 
                quantity: cartItem.quantity + quantity,
                specialInstructions: specialInstructions || cartItem.specialInstructions
              }
            : cartItem
        )
      } else {
        // Add new item
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
        item._id === itemId
          ? { ...item, quantity }
          : item
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

  // Use the cart functions from useCart hook if available, otherwise use our local ones
  // This allows compatibility with other components that might use the hook
  const cartContext = useCart()
  
  // Sync our local cart with the hook's cart if needed
  useEffect(() => {
    if (cartContext && cartContext.isLoaded && cartContext.cart.length > 0 && cartItems.length === 0) {
      // If the hook has items but we don't, use them
      setCartItems(cartContext.cart)
    }
  }, [cartContext, cartItems])

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

  // ========== TWO-STEP NAVIGATION STATE ==========
  // Mobile
  const [mobileStep, setMobileStep] = useState<'categories' | 'items'>('categories')
  const [selectedCategoryForMobile, setSelectedCategoryForMobile] = useState<Category | null>(null)
  
  // ========== FASTING FILTER STATE (MOBILE ONLY) ==========
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
    // Get the table parameter from URL
    const tableParam = searchParams.get('table')
    
    if (tableParam) {
      // Sanitize the table parameter
      const sanitizedTable = sanitizeInput(tableParam)
      
      // Extract just the table number from "table-7" format
      let tableNumberDisplay = sanitizedTable
      if (sanitizedTable.startsWith('table-')) {
        tableNumberDisplay = sanitizedTable.replace('table-', '')
      }
      
      // Validate that it's a valid table number
      const tableNum = parseInt(tableNumberDisplay)
      if (!isNaN(tableNum) && tableNum > 0) {
        // Store in localStorage for persistence
        localStorage.setItem('detectedTableNumber', tableNumberDisplay)
        localStorage.setItem('tableDetected', 'true')
        
        setDetectedTable(tableNumberDisplay)
        setTableDetected(true)
        
        // Set the table number in state
        setTableNumber(tableNumberDisplay)
        setOrderType('table')
        
        // Create a table data object
        const tableData: TableData = {
          number: tableNum,
          capacity: 4, // Default capacity, can be adjusted
          restaurantId: 'manyazewal1',
          restaurantName: 'Manyazewal Restaurant',
          floor: 'Ground Floor'
        }
        setSelectedTableData(tableData)
        
        // NO TOAST - Silent detection
      }
    } else {
      // Check if we have a stored table number from before
      const storedTable = localStorage.getItem('detectedTableNumber')
      const storedDetected = localStorage.getItem('tableDetected')
      
      if (storedTable && storedDetected === 'true') {
        const tableNum = parseInt(storedTable)
        if (!isNaN(tableNum) && tableNum > 0) {
          setDetectedTable(storedTable)
          setTableDetected(true)
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
      const { 
        categories: cachedCategories, 
        items: cachedItems, 
        waiters: cachedWaiters, 
        isValid 
      } = await cacheManager.loadMenuData()

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
          params: { 
            restaurantId: 'manyazewal1', 
            floor: 'Ground Floor' 
          },
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
      // Remove from localStorage
      localStorage.removeItem('detectedTableNumber')
      localStorage.removeItem('tableDetected')
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
    
    // Save to localStorage
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

  const handleOrderTypeChange = (type: 'table' | 'delivery') => {
    setOrderType(type)
    if (type !== 'delivery') {
      setDeliveryFee(null)
    }
  }

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

  const removePaymentScreenshot = () => {
    if (paymentScreenshot.previewUrl) URL.revokeObjectURL(paymentScreenshot.previewUrl)
    setPaymentScreenshot({ file: null, previewUrl: '', uploaded: false })
  }

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
      
      // Clear cart and localStorage
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
  
  // Step 1: Categories List - COMPLETELY CLEAN (No card, no background, no hover)
  const renderDesktopCategories = () => {
    const categoriesWithItems = sortedCategories.filter(category => {
      const categoryItems = items.filter(item => 
        item.categoryId === category._id && item.isActive !== false
      )
      return categoryItems.length > 0
    })

    if (categoriesWithItems.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="p-4 bg-purple-50 rounded-full mb-4">
            <Layers className="h-8 w-8 text-purple-900" />
          </div>
          <p className="text-gray-500">No categories available</p>
        </div>
      )
    }

    // Group categories into rows of 3
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
                    setFastingFilter('all') // Reset fasting filter when selecting category
                  }}
                  className="flex flex-col items-center cursor-pointer"
                >
                  {/* Category Image - w-32 h-32, NO background, NO card */}
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
                  
                  {/* Category Name - 16px text */}
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

  // Step 2: Items for selected category (Desktop) - WITH VIEW TOGGLE
  const renderDesktopCategoryItems = () => {
    if (!selectedCategoryForDesktop) return null

    // Filter items by category, search term, and fasting filter
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

    // Apply fasting filter
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
        {/* Category Header with View Toggle */}
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
            {/* Search bar - small */}
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

            {/* View Toggle - Grid/List */}
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

        {/* Items Display - Grid or List */}
        {categoryItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 bg-white/50 rounded-2xl border border-purple-100">
            <p className="text-gray-500">No items in this category</p>
          </div>
        ) : viewMode === 'grid' ? (
          // GRID VIEW: w-36 cards with auto-fit
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
          // LIST VIEW: 2 cards per row
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
  
  // Step 1: Categories List - MINIMIZED CARDS FOR MOBILE
  const renderMobileCategories = () => {
    const categoriesWithItems = sortedCategories.filter(category => {
      const categoryItems = items.filter(item => 
        item.categoryId === category._id && item.isActive !== false
      )
      return categoryItems.length > 0
    })

    if (categoriesWithItems.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-8">
          <div className="p-3 bg-purple-50 rounded-full mb-3">
            <Layers className="h-6 w-6 text-purple-900" />
          </div>
          <p className="text-gray-500 text-sm">No categories available</p>
        </div>
      )
    }

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
                setFastingFilter('all') // Reset fasting filter when selecting category
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

  // Step 2: Items for selected category (Mobile) - WITH FASTING FILTER APPLIED
  const renderMobileCategoryItems = () => {
    if (!selectedCategoryForMobile) return null

    // Filter items by category and search term
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

    // Apply fasting filter
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

  // Loading skeleton
  if (loading && !dataLoaded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50/50 via-white to-purple-50/30">
        <NavBar />
        <main className="container mx-auto px-4 py-8">
          {loadingTimeout && (
            <Alert className="bg-gradient-to-r from-purple-100 to-purple-200 border-purple-300 rounded-2xl shadow-lg mb-6">
              <Clock className="h-5 w-5 text-purple-900" />
              <AlertDescription className="text-purple-900 font-medium">
                Loading menu...
              </AlertDescription>
            </Alert>
          )}
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="flex flex-col items-center">
                <Skeleton className="w-full aspect-square rounded-lg" />
                <Skeleton className="h-3 w-3/4 mt-1.5 rounded" />
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
        
        {/* ========== TABLE DETECTION BANNER - REMOVED ========== */}
        {/* No banner - table detection happens silently */}
        
        {/* ========== MOBILE HEADER WITH FASTING TABS & VIEW TOGGLE ========== */}
        {/* Only show header when in items step - STICKY AT TOP */}
        {mobileStep === 'items' && (
          <div className="md:hidden sticky top-0 z-50 w-full bg-white/95 backdrop-blur-xl shadow-sm border-b border-purple-100">
            <div className="px-3 py-2">
              {/* Flex inline header: Back | Tabs | View Toggle */}
              <div className="flex items-center gap-2">
                {/* Back Button - Left */}
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

                {/* Fasting Tabs - Center (plain text with underline) */}
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

                {/* View Toggle - Grid/List - Right */}
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

        {/* Main Content - Natural page scroll */}
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

      {/* Cart Sheet */}
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
            onLoginRequired={() => {}} // No-op since we removed login requirement
            userData={userData as UserData | null}
            onNavigateToProfile={handleNavigateToProfile} 
            isCalculatingDelivery={isCalculatingDelivery} 
            restaurantId="manyazewal1" 
            floor="Ground Floor" 
            arrangementId={arrangementId}
            onGuestOrder={handleGuestOrder}
          />
        </SheetContent>
      </Sheet>

      {/* Item Detail Dialog */}
      {selectedItem && (
        <ItemDetailDialog 
          item={selectedItem} 
          categoryName={categories.find(c => c._id === selectedItem.categoryId)?.name || 'Uncategorized'} 
          isOpen={showItemDetail} 
          onOpenChange={setShowItemDetail} 
          onAddToCart={addToCart} 
          isUserLoggedIn={true} // Always true to bypass login checks in dialog
          onLoginRequired={() => {}} // No-op
        />
      )}
      
      {/* Payment Upload Dialog */}
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
      />
      
      {/* Order Progress Indicator */}
      <OrderProgressIndicator progress={orderProgress} orderType={orderType} />
    </>
  )
}