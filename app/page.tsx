// app/menu/page.tsx - COMPLETE FIXED VERSION WITH SECURITY VALIDATION

'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Eye, Clock, Sparkles, Layers, ShoppingCart, RefreshCw,
  ChevronUp, ChevronDown, Grid, List, Star, Search,
  Filter, ArrowUpDown, X, TrendingUp, Flame, Crown
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
  DeliveryFeeDetails, PaymentScreenshot
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
    totalItems,
    isLoaded: cartLoaded,
  } = useCart()

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
  const [searchInputValue, setSearchInputValue] = useState('') // Raw input value
  const [loading, setLoading] = useState(true)
  const [loadingTimeout, setLoadingTimeout] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [imagesPreloaded, setImagesPreloaded] = useState(false)
  const [dataLoaded, setDataLoaded] = useState(false)

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

  const packagingCharge = useMemo(() => {
    return calculatePackagingCharge(cart, categories, orderType === 'delivery')
  }, [cart, categories, orderType])

  const categoryChargesTotal = useMemo(() => {
    if (orderType !== 'delivery') return 0
    
    return cart.reduce((total, cartItem) => {
      const category = categories.find(c => c._id === cartItem.categoryId)
      const charge = getCategoryAdditionalCharge(category?.name || '', category?.type)
      return total + (charge * (cartItem.quantity || 1))
    }, 0)
  }, [cart, categories, orderType])

  const adjustedSubtotal = useMemo(() => {
    if (orderType !== 'delivery') return baseSubtotal
    return baseSubtotal + categoryChargesTotal
  }, [baseSubtotal, categoryChargesTotal, orderType])

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
    
    // Store raw value for display
    setSearchInputValue(rawValue)
    
    // Check for malicious code
    if (containsMaliciousCode(rawValue)) {
      setSearchError('Invalid characters detected')
      toast.error('Search contains invalid characters')
      // Clear the input
      setSearchInputValue('')
      setSearchTerm('')
      return
    }
    
    // Validate and sanitize
    const { isValid, sanitized } = validateSearchInput(rawValue)
    
    if (!isValid) {
      setSearchError('Invalid input')
      toast.error('Invalid characters in search')
      return
    }
    
    // Clear any previous errors
    setSearchError(null)
    
    // Set the sanitized search term
    setSearchTerm(sanitized)
  }, [validateSearchInput, setSearchError])

  // ========== SECURE TEXT INPUT HANDLER ==========
  const handleTextInputChange = useCallback((
    value: string, 
    setter: (value: string) => void,
    fieldName: string = 'Input'
  ) => {
    // Check for malicious code
    if (containsMaliciousCode(value)) {
      toast.error(`${fieldName} contains invalid characters`)
      return
    }
    
    // Validate and sanitize
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
        // Check for old plain text data and migrate
        const hasOldCategories = localStorage.getItem('menu_categories') !== null
        const hasOldItems = localStorage.getItem('menu_items') !== null
        
        if (hasOldCategories || hasOldItems) {
          console.log('🔄 Migrating old data to encrypted format...')
          await cacheManager.migrateOldData()
        }
        
        // Load from cache
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
    
    toast.success(`Table ${table.number} selected!`)
    
    if (table.capacity && table.capacity < numberOfGuests) {
      setNumberOfGuests(table.capacity)
    }
  }, [numberOfGuests])

  const handleGuestOrder = (guestData: GuestUserData) => {
    // Sanitize guest data
    const sanitizedGuestData: GuestUserData = {
      firstName: validateTextInput(guestData.firstName).sanitized || '',
      lastName: validateTextInput(guestData.lastName).sanitized || '',
      phone: guestData.phone.replace(/[^0-9+]/g, ''), // Only allow digits and +
      email: guestData.email.replace(/[^a-zA-Z0-9@._-]/g, ''), // Only allow valid email chars
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

  const handleLoginRequired = (message: string) => {
    toast.error(message || 'Please login to continue')
    router.push('/login')
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

  const handleOrderTypeChange = (type: 'table' | 'delivery') => {
    if (type === 'delivery' && !isLoggedIn) {
      toast.error('Please login to use delivery service')
      router.push('/login')
      return
    }
    setOrderType(type)
    if (type !== 'delivery') {
      setDeliveryFee(null)
    }
  }

  const handlePlaceOrder = () => {
    if (cart.length === 0) {
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
    if (orderType === 'delivery' && !isLoggedIn) {
      toast.error('Please login to place delivery order')
      router.push('/login')
      return
    }
    setShowPaymentUpload(true)
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please upload an image file')
        return
      }
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB')
        return
      }
      // Validate file name for malicious content
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

    if (orderType === 'delivery' && !isLoggedIn) {
      toast.error('Please login to place delivery order')
      setShowPaymentUpload(false)
      router.push('/login')
      return
    }

    setIsPlacingOrder(true)
    const orderToast = toast.loading('Processing your order...')

    try {
      const deliveryFeeAmount = orderType === 'delivery' && isLoggedIn ? deliveryFee?.fee || 0 : 0
      const packagingFeeAmount = orderType === 'delivery' && isLoggedIn ? packagingCharge : 0
      const assignedWaiterId = orderType === 'table' ? getAutoAssignedWaiter() : ''
      const assignedWaiterName = waiters.find(w => w._id === assignedWaiterId)?.name || ''

      const orderItems = cart.map(cartItem => {
        const category = categories.find(c => c._id === cartItem.categoryId)
        const basePrice = Number(cartItem.price)
        const categoryCharge = orderType === 'delivery' && isLoggedIn
          ? getCategoryAdditionalCharge(category?.name || '', category?.type)
          : 0
        const finalItemPrice = basePrice + categoryCharge
        
        return {
          itemId: cartItem._id,
          itemName: sanitizeInput(cartItem.name), // Sanitize item name
          quantity: cartItem.quantity,
          notes: sanitizeInput(cartItem.specialInstructions || ''), // Sanitize notes
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
        subtotal: baseSubtotal,
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
    toast.success('All filters cleared')
  }

  const hasActiveFilters = searchTerm !== '' || selectedCategory !== null

  const getDisplayItems = (): Item[] => {
    if (selectedCategory || searchTerm) {
      return filteredItems
    }
    if (mixedDisplayItems.length > 0) {
      return mixedDisplayItems
    }
    return filteredItems
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
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-5">
            {[...Array(8)].map((_, i) => (
              <Card key={i} className="overflow-hidden rounded-xl md:rounded-2xl border-0 shadow-md">
                <Skeleton className="h-36 md:h-56 w-full" />
                <CardContent className="p-2 md:p-4 space-y-2 md:space-y-3">
                  <Skeleton className="h-4 md:h-5 w-3/4 rounded" />
                  <Skeleton className="h-3 md:h-4 w-full rounded" />
                  <Skeleton className="h-3 md:h-4 w-2/3 rounded" />
                  <div className="flex justify-between pt-2">
                    <Skeleton className="h-6 md:h-8 w-16 md:w-20 rounded" />
                    <Skeleton className="h-7 md:h-9 w-7 md:w-9 rounded-full" />
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
    <>
      <NavBar />
      
      <div className="min-h-screen bg-gradient-to-br from-purple-50/50 via-white to-purple-50/30 pb-20 md:pb-0">
        
        {/* Desktop Header */}
        <div className="hidden md:block sticky top-0 z-50 w-full bg-white/95 backdrop-blur-xl shadow-lg border-b border-purple-100">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center gap-3 flex-wrap">
              {/* Search Bar - SECURE VERSION */}
              <div className="relative flex-1 max-w-[320px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-500" size={15} />
                <Input
                  type="text"
                  placeholder="Search menu items..."
                  value={searchInputValue}
                  onChange={handleSearchChange}
                  onPaste={(e) => {
                    // Prevent pasting potentially malicious content
                    const pastedText = e.clipboardData.getData('text')
                    if (containsMaliciousCode(pastedText)) {
                      e.preventDefault()
                      toast.error('Pasted content contains invalid characters')
                    }
                  }}
                  onDrop={(e) => {
                    // Prevent dropping potentially malicious content
                    const droppedText = e.dataTransfer.getData('text')
                    if (containsMaliciousCode(droppedText)) {
                      e.preventDefault()
                      toast.error('Dropped content contains invalid characters')
                    }
                  }}
                  className={`pl-9 pr-8 py-2 h-9 text-sm bg-white border rounded-xl focus:border-purple-900 focus:ring-2 transition-all shadow-sm ${
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
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    aria-label="Clear search"
                  >
                    <X size={14} />
                  </button>
                )}
                {searchError && (
                  <div className="absolute left-0 right-0 -bottom-6 text-xs text-red-500 animate-fadeIn">
                    {searchError}
                  </div>
                )}
              </div>

              {/* Category Filter */}
              <div className="w-[220px]">
                <Select value={selectedCategory || 'all'} onValueChange={(value) => setSelectedCategory(value === 'all' ? null : value)}>
                  <SelectTrigger className="h-9 text-sm bg-white border border-purple-200 rounded-xl shadow-sm">
                    <div className="flex items-center gap-2 truncate">
                      <Filter size={14} className="text-purple-500 shrink-0" />
                      <span className="truncate">
                        {selectedCategory ? categories.find(c => c._id === selectedCategory)?.name : 'All Categories'}
                      </span>
                    </div>
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border border-purple-200 shadow-xl max-h-[300px]">
                    <SelectItem value="all" className="text-sm py-2">
                      <div className="flex items-center gap-2">
                        <Layers className="h-3.5 w-3.5 text-purple-900" />
                        All Categories
                      </div>
                    </SelectItem>
                    {sortedCategories.map((category) => (
                      <SelectItem key={category._id} value={category._id} className="text-sm py-2">
                        <div className="flex items-center gap-2">
                          <div className="p-1 bg-purple-100 rounded-md">
                            {getCategoryIcon(category.type, "h-3 w-3 text-purple-900")}
                          </div>
                          <span className="flex-1 truncate">{category.name}</span>
                          <Badge variant="secondary" className="bg-purple-100 text-purple-900 rounded-full text-xs px-1.5 ml-1">
                            {categoryCounts[category._id] || 0}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 gap-1 text-sm text-purple-700 hover:text-purple-900 hover:bg-purple-50 rounded-xl">
                  <X size={14} />
                  Clear
                </Button>
              )}

              {/* View Mode Toggle */}
              <div className="flex gap-1 bg-white p-1 rounded-xl border border-purple-200 shadow-sm">
                <Button variant={viewMode === 'grid' ? 'default' : 'ghost'} size="icon" onClick={() => setViewMode('grid')} className={`rounded-lg h-8 w-8 transition-all ${viewMode === 'grid' ? 'bg-gradient-to-r from-purple-800 to-purple-900 text-white shadow-md' : 'hover:bg-purple-50 text-gray-600'}`}>
                  <Grid size={16} />
                </Button>
                <Button variant={viewMode === 'list' ? 'default' : 'ghost'} size="icon" onClick={() => setViewMode('list')} className={`rounded-lg h-8 w-8 transition-all ${viewMode === 'list' ? 'bg-gradient-to-r from-purple-800 to-purple-900 text-white shadow-md' : 'hover:bg-purple-50 text-gray-600'}`}>
                  <List size={16} />
                </Button>
              </div>

              {/* Cart Button */}
              <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
                <SheetTrigger asChild>
                  <Button variant="default" className="relative shadow-md bg-gradient-to-r from-purple-800 to-purple-900 hover:from-purple-900 hover:to-purple-950 text-white rounded-xl px-4 py-2 h-9 text-sm gap-2">
                    <ShoppingCart className="h-4 w-4" />
                    Cart
                    {totalItems > 0 && (
                      <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center shadow-md">
                        {totalItems}
                      </motion.span>
                    )}
                  </Button>
                </SheetTrigger>
              </Sheet>
            </div>

            {hasActiveFilters && (
              <div className="flex flex-wrap items-center gap-2 mt-3 pt-2 border-t border-purple-100">
                <span className="text-xs text-gray-500">Active filters:</span>
                {searchTerm && (
                  <Badge variant="secondary" className="bg-purple-100 text-purple-800 rounded-full text-xs px-2 py-0.5 gap-1">
                    Search: "{searchTerm}"
                    <button onClick={() => {
                      setSearchTerm('')
                      setSearchInputValue('')
                      setSearchError(null)
                    }} className="ml-1 hover:text-purple-900"><X size={12} /></button>
                  </Badge>
                )}
                {selectedCategory && (
                  <Badge variant="secondary" className="bg-purple-100 text-purple-800 rounded-full text-xs px-2 py-0.5 gap-1">
                    Category: {categories.find(c => c._id === selectedCategory)?.name}
                    <button onClick={() => setSelectedCategory(null)} className="ml-1 hover:text-purple-900"><X size={12} /></button>
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Mobile Header - SECURE VERSION */}
        <div className="md:hidden sticky top-0 z-50 w-full bg-white/95 backdrop-blur-xl shadow-sm border-b border-purple-100">
          <div className="px-3 py-2">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-purple-500" size={13} />
                <Input 
                  type="text" 
                  placeholder="Search..." 
                  value={searchInputValue} 
                  onChange={handleSearchChange}
                  onPaste={(e) => {
                    const pastedText = e.clipboardData.getData('text')
                    if (containsMaliciousCode(pastedText)) {
                      e.preventDefault()
                      toast.error('Invalid characters')
                    }
                  }}
                  onDrop={(e) => {
                    const droppedText = e.dataTransfer.getData('text')
                    if (containsMaliciousCode(droppedText)) {
                      e.preventDefault()
                      toast.error('Invalid characters')
                    }
                  }}
                  className={`pl-8 pr-6 py-1.5 h-8 text-xs bg-white border rounded-lg focus:border-purple-900 focus:ring-2 transition-all w-full ${
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
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400"
                  >
                    <X size={11} />
                  </button>
                )}
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 gap-1 border-purple-200 bg-white rounded-lg text-xs shrink-0 px-2.5">
                    <Filter size={12} />
                    <span className="text-xs">Filter</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="rounded-xl border-purple-200 shadow-lg w-[260px]">
                  <div className="p-2 border-b border-purple-100">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Categories</span>
                      {selectedCategory && <button onClick={clearFilters} className="text-xs text-purple-600">Clear</button>}
                    </div>
                  </div>
                  <div className="max-h-[300px] overflow-y-auto">
                    <DropdownMenuItem onClick={() => setSelectedCategory(null)} className={`cursor-pointer ${!selectedCategory ? 'bg-purple-50 text-purple-900' : ''}`}>
                      <div className="flex items-center gap-2 w-full">
                        <Layers className="h-3.5 w-3.5 text-purple-900" />
                        <span className="flex-1 text-sm">All Categories</span>
                      </div>
                    </DropdownMenuItem>
                    {sortedCategories.map((category) => (
                      <DropdownMenuItem key={category._id} onClick={() => setSelectedCategory(category._id)} className={`cursor-pointer ${selectedCategory === category._id ? 'bg-purple-50 text-purple-900' : ''}`}>
                        <div className="flex items-center gap-2 w-full">
                          <div className="p-0.5 bg-purple-100 rounded">{getCategoryIcon(category.type, "h-3 w-3 text-purple-900")}</div>
                          <span className="flex-1 text-sm truncate">{category.name}</span>
                          <Badge variant="secondary" className="bg-purple-100 text-purple-900 rounded-full text-xs px-1.5">{categoryCounts[category._id] || 0}</Badge>
                        </div>
                      </DropdownMenuItem>
                    ))}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>

              <div className="flex gap-0.5 bg-white p-0.5 rounded-lg border border-purple-200 shadow-sm shrink-0">
                <Button variant={viewMode === 'grid' ? 'default' : 'ghost'} size="icon" onClick={() => setViewMode('grid')} className={`rounded-md h-7 w-7 transition-all ${viewMode === 'grid' ? 'bg-gradient-to-r from-purple-800 to-purple-900 text-white shadow-md' : 'hover:bg-purple-50 text-gray-600'}`}>
                  <Grid size={13} />
                </Button>
                <Button variant={viewMode === 'list' ? 'default' : 'ghost'} size="icon" onClick={() => setViewMode('list')} className={`rounded-md h-7 w-7 transition-all ${viewMode === 'list' ? 'bg-gradient-to-r from-purple-800 to-purple-900 text-white shadow-md' : 'hover:bg-purple-50 text-gray-600'}`}>
                  <List size={13} />
                </Button>
              </div>
            </div>

            {hasActiveFilters && (
              <div className="flex flex-wrap items-center gap-1.5 mt-2 pt-1.5 border-t border-purple-100">
                {searchTerm && (
                  <Badge variant="secondary" className="bg-purple-100 text-purple-800 rounded-full text-[10px] px-1.5 py-0.5 gap-0.5">
                    "{searchTerm.substring(0, 12)}"
                    <button onClick={() => {
                      setSearchTerm('')
                      setSearchInputValue('')
                      setSearchError(null)
                    }}><X size={9} /></button>
                  </Badge>
                )}
                {selectedCategory && (
                  <Badge variant="secondary" className="bg-purple-100 text-purple-800 rounded-full text-[10px] px-1.5 py-0.5 gap-0.5">
                    {categories.find(c => c._id === selectedCategory)?.name?.substring(0, 15)}
                    <button onClick={() => setSelectedCategory(null)}><X size={9} /></button>
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <main className="container mx-auto px-3 md:px-4 py-4 md:py-6">
          {getDisplayItems().length > 0 && (
            <div className="flex justify-between items-center mb-3 md:mb-4 px-1">
              <p className="text-[11px] md:text-sm text-gray-500">
                Found <span className="font-semibold text-purple-900">{getDisplayItems().length}</span> items
              </p>
              <div className="flex items-center gap-1.5 md:gap-2">
                <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[9px] md:text-xs text-gray-400">Ready to order</span>
              </div>
            </div>
          )}

          <AnimatePresence mode="wait">
            {getDisplayItems().length === 0 ? (
              <EmptyMenuState searchTerm={searchTerm} selectedCategory={selectedCategory} itemsLength={items.length} onClearFilters={clearFilters} onRefresh={handleRefresh} />
            ) : (
              <motion.div key="menu-items" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className={`grid gap-3 md:gap-5 ${viewMode === 'grid' ? 'grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1'}`}>
                {getDisplayItems().map((item, index) => {
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
            )}
          </AnimatePresence>

          {getDisplayItems().length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="text-center mt-6 md:mt-8 pb-8">
              <Badge variant="outline" className="bg-white/80 backdrop-blur-sm px-2.5 py-1 md:px-4 md:py-2 rounded-full text-[9px] md:text-xs border border-purple-200 shadow-sm">
                <Eye className="h-2 w-2 md:h-3 md:w-3 mr-1 md:mr-1.5 text-purple-900" />
                Showing {getDisplayItems().length} of {items.length} items
              </Badge>
            </motion.div>
          )}
        </main>
      </div>

      {/* Floating Cart Button - Mobile */}
      <div className="md:hidden fixed bottom-6 right-4 z-50">
        <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
          <SheetTrigger asChild>
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setIsCartOpen(true)} className="relative bg-gradient-to-r from-purple-800 to-purple-900 text-white rounded-full p-3.5 shadow-lg shadow-purple-500/30">
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
            cart={cart} 
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
            onLoginRequired={handleLoginRequired}
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
          isUserLoggedIn={isLoggedIn} 
          onLoginRequired={handleLoginRequired} 
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