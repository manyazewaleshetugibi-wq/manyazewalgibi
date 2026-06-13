// app/menu/page.tsx - COMPLETE VERSION WITH GUEST ORDER SUPPORT

'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Eye, Clock, Sparkles, Layers, ShoppingCart, RefreshCw,
  ChevronUp, ChevronDown, Grid, List, Star, Search,
  Filter, ArrowUpDown, X
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

// Cache keys
const CACHE_KEYS = {
  CATEGORIES: 'menu_categories',
  ITEMS: 'menu_items',
  WAITERS: 'menu_waiters',
  TIMESTAMP: 'menu_timestamp'
}

const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

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
  
  // Guest user data state
  const [guestUserData, setGuestUserData] = useState<GuestUserData | null>(null)

  const deliveryCalculator = useMemo(() => new EnhancedDeliveryCalculator(), [])
  const abortControllerRef = useRef<AbortController | null>(null)

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

  // Load cached data
  const loadFromCache = useCallback(() => {
    try {
      const timestamp = localStorage.getItem(CACHE_KEYS.TIMESTAMP)
      if (timestamp && Date.now() - parseInt(timestamp) < CACHE_DURATION) {
        const cachedCategories = localStorage.getItem(CACHE_KEYS.CATEGORIES)
        const cachedItems = localStorage.getItem(CACHE_KEYS.ITEMS)
        const cachedWaiters = localStorage.getItem(CACHE_KEYS.WAITERS)

        if (cachedCategories && cachedItems) {
          setCategories(JSON.parse(cachedCategories))
          setItems(JSON.parse(cachedItems))
          setFilteredItems(JSON.parse(cachedItems))
          if (cachedWaiters) setWaiters(JSON.parse(cachedWaiters))
          setDataLoaded(true)
          setLoading(false)
          return true
        }
      }
    } catch (error) {
      console.error('Cache read error:', error)
    }
    return false
  }, [])

  // Save to cache
  const saveToCache = useCallback((categoriesData: Category[], itemsData: Item[], waitersData: Waiter[]) => {
    try {
      localStorage.setItem(CACHE_KEYS.CATEGORIES, JSON.stringify(categoriesData))
      localStorage.setItem(CACHE_KEYS.ITEMS, JSON.stringify(itemsData))
      localStorage.setItem(CACHE_KEYS.WAITERS, JSON.stringify(waitersData))
      localStorage.setItem(CACHE_KEYS.TIMESTAMP, Date.now().toString())
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
        saveToCache(categoriesData, itemsData, waitersData)
      }

      setDataLoaded(true)

    } catch (err: any) {
      if (err.name === 'AbortError') return
      console.error('Fetch error:', err.message)
      
      const cached = loadFromCache()
      if (!cached) {
        toast.error('Unable to load menu. Please check your connection.')
      }
    } finally {
      setLoading(false)
    }
  }, [loadFromCache, saveToCache])

  // Load guest data from session storage on mount
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

  // Initial load
  useEffect(() => {
    const cached = loadFromCache()
    if (!cached) {
      fetchMenuData()
    }
    
    return () => {
      if (abortControllerRef.current) abortControllerRef.current.abort()
    }
  }, [loadFromCache, fetchMenuData])

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

  // Filter and sort items
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
    
    toast.success(`Table ${table.number} selected! Capacity: ${table.capacity} seats`)
    
    if (table.capacity && table.capacity < numberOfGuests) {
      setNumberOfGuests(table.capacity)
    }
  }, [numberOfGuests])

  // Handle guest order data from CartPanel
  const handleGuestOrder = (guestData: GuestUserData) => {
    setGuestUserData(guestData)
    // Store guest data in sessionStorage for order processing
    sessionStorage.setItem('guestOrderData', JSON.stringify(guestData))
  }

  // Delivery fee calculation - ONLY for logged-in users
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

  const handleSort = (field: 'name' | 'price' | 'preparationTime') => {
    if (field === sortField) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  // Handle login required - direct navigation to login
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

  // Handle order type selection - Prevent delivery for non-logged-in users
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
    // For delivery orders, ensure user is logged in
    if (orderType === 'delivery' && !isLoggedIn) {
      toast.error('Please login to place delivery order')
      router.push('/login')
      return
    }
    // For table orders without login, guest data will be collected in CartPanel
    if (orderType === 'table' && !isLoggedIn && !guestUserData) {
      // Guest data will be collected via the dialog in CartPanel
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
          itemName: cartItem.name,
          quantity: cartItem.quantity,
          notes: cartItem.specialInstructions || '',
          basePrice: basePrice,
          categoryCharge: categoryCharge,
          price: finalItemPrice,
          total: finalItemPrice * cartItem.quantity
        }
      })

      // Determine customer information based on login status and guest data
      const isGuest = !isLoggedIn && orderType === 'table'
      const customerId = isLoggedIn 
        ? (userData?.id || userData?._id || 'walk-in')
        : (guestUserData ? 'guest' : 'walk-in')
        
      const customerName = isLoggedIn 
        ? `${userData?.firstName || ''} ${userData?.lastName || ''}`.trim() || 'Walk-in'
        : guestUserData 
          ? `${guestUserData.firstName} ${guestUserData.lastName}`.trim()
          : 'Guest User'
          
      const customerPhone = isLoggedIn 
        ? userData?.phone || ''
        : guestUserData?.phone || ''
        
      const customerEmail = isLoggedIn 
        ? userData?.email || ''
        : guestUserData?.email || ''

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
        customerId,
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
          tableNumber: selectedTableData?.number.toString() || tableNumber,
          tableId: selectedTableData?.id,
          tableCapacity: selectedTableData?.capacity,
          waiterId: assignedWaiterId,
          waiterName: assignedWaiterName,
          inTable: true,
          delivery: false
        })
      }

      // Add guest info if applicable
      if (isGuest && guestUserData) {
        ;(orderData as any).guestInfo = guestUserData
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
          address: userData?.address || '',
          city: 'Addis Ababa',
          landmark: '',
          deliveryInstructions: specialRequirements || '',
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
      
      // Clear cart and reset states
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
      
      // Clear guest data after successful order
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

  const getSortLabel = () => {
    const field = sortField === 'preparationTime' ? 'Prep Time' : sortField.charAt(0).toUpperCase() + sortField.slice(1)
    const direction = sortDirection === 'asc' ? '↑' : '↓'
    return `${field} ${direction}`
  }

  const categoryCounts = useMemo(() => {
    return items.reduce((acc, item) => {
      acc[item.categoryId] = (acc[item.categoryId] || 0) + 1
      return acc
    }, {} as Record<string, number>)
  }, [items])

  const clearFilters = () => {
    setSearchTerm('')
    setSelectedCategory(null)
    setSortField('name')
    setSortDirection('asc')
    toast.success('All filters cleared')
  }

  const hasActiveFilters = searchTerm !== '' || selectedCategory !== null

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
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9 gap-1.5 border-purple-200 bg-white rounded-xl text-sm shadow-sm">
                    <ArrowUpDown size={14} />
                    {getSortLabel()}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="rounded-xl border-purple-200 shadow-lg">
                  <DropdownMenuItem onClick={() => handleSort('name')} className="gap-2 text-sm cursor-pointer">
                    Name
                    {sortField === 'name' && (sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleSort('price')} className="gap-2 text-sm cursor-pointer">
                    Price
                    {sortField === 'price' && (sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleSort('preparationTime')} className="gap-2 text-sm cursor-pointer">
                    Prep Time
                    {sortField === 'preparationTime' && (sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <div className="relative flex-1 max-w-[320px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-500" size={15} />
                <Input
                  type="text"
                  placeholder="Search menu items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-8 py-2 h-9 text-sm bg-white border border-purple-200 rounded-xl focus:border-purple-900 focus:ring-2 focus:ring-purple-200 transition-all shadow-sm"
                />
                {searchTerm && (
                  <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <X size={14} />
                  </button>
                )}
              </div>

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
                    {categories.map((category) => (
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

              <div className="flex gap-1 bg-white p-1 rounded-xl border border-purple-200 shadow-sm">
                <Button variant={viewMode === 'grid' ? 'default' : 'ghost'} size="icon" onClick={() => setViewMode('grid')} className={`rounded-lg h-8 w-8 transition-all ${viewMode === 'grid' ? 'bg-gradient-to-r from-purple-800 to-purple-900 text-white shadow-md' : 'hover:bg-purple-50 text-gray-600'}`}>
                  <Grid size={16} />
                </Button>
                <Button variant={viewMode === 'list' ? 'default' : 'ghost'} size="icon" onClick={() => setViewMode('list')} className={`rounded-lg h-8 w-8 transition-all ${viewMode === 'list' ? 'bg-gradient-to-r from-purple-800 to-purple-900 text-white shadow-md' : 'hover:bg-purple-50 text-gray-600'}`}>
                  <List size={16} />
                </Button>
              </div>

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
                    <button onClick={() => setSearchTerm('')} className="ml-1 hover:text-purple-900"><X size={12} /></button>
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

        {/* Mobile Header */}
        <div className="md:hidden sticky top-0 z-50 w-full bg-white/95 backdrop-blur-xl shadow-sm border-b border-purple-100">
          <div className="px-3 py-2">
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 gap-1 border-purple-200 bg-white rounded-lg text-xs shrink-0 px-2.5">
                    <ArrowUpDown size={12} />
                    <span className="text-xs">Sort</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="rounded-xl border-purple-200 shadow-lg">
                  <DropdownMenuItem onClick={() => handleSort('name')} className="gap-2 text-sm cursor-pointer">
                    Name {sortField === 'name' && (sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleSort('price')} className="gap-2 text-sm cursor-pointer">
                    Price {sortField === 'price' && (sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleSort('preparationTime')} className="gap-2 text-sm cursor-pointer">
                    Prep Time {sortField === 'preparationTime' && (sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-purple-500" size={13} />
                <Input type="text" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-8 pr-6 py-1.5 h-8 text-xs bg-white border border-purple-200 rounded-lg focus:border-purple-900 focus:ring-2 focus:ring-purple-200 transition-all w-full" />
                {searchTerm && <button onClick={() => setSearchTerm('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400"><X size={11} /></button>}
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
                    {categories.map((category) => (
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
                {searchTerm && <Badge variant="secondary" className="bg-purple-100 text-purple-800 rounded-full text-[10px] px-1.5 py-0.5 gap-0.5">"{searchTerm.substring(0, 12)}"<button onClick={() => setSearchTerm('')}><X size={9} /></button></Badge>}
                {selectedCategory && <Badge variant="secondary" className="bg-purple-100 text-purple-800 rounded-full text-[10px] px-1.5 py-0.5 gap-0.5">{categories.find(c => c._id === selectedCategory)?.name?.substring(0, 15)}<button onClick={() => setSelectedCategory(null)}><X size={9} /></button></Badge>}
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <main className="container mx-auto px-3 md:px-4 py-4 md:py-6">
          {filteredItems.length > 0 && (
            <div className="flex justify-between items-center mb-3 md:mb-4 px-1">
              <p className="text-[11px] md:text-sm text-gray-500">Found <span className="font-semibold text-purple-900">{filteredItems.length}</span> items</p>
              <div className="flex items-center gap-1.5 md:gap-2">
                <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[9px] md:text-xs text-gray-400">Ready to order</span>
              </div>
            </div>
          )}

          <AnimatePresence mode="wait">
            {filteredItems.length === 0 ? (
              <EmptyMenuState searchTerm={searchTerm} selectedCategory={selectedCategory} itemsLength={items.length} onClearFilters={clearFilters} onRefresh={handleRefresh} />
            ) : (
              <>
                <motion.div key="menu-items" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className={`grid gap-3 md:gap-5 ${viewMode === 'grid' ? 'grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1'}`}>
                  {filteredItems.map((item, index) => {
                    const category = categories.find(c => c._id === item.categoryId)
                    const categoryName = category?.name || 'Uncategorized'
                    return viewMode === 'grid' ? (
                      <ItemCard key={item._id} item={item} categoryName={categoryName} onAddToCart={addToCart} onViewDetails={handleViewDetails} isUserLoggedIn={isLoggedIn} onLoginRequired={handleLoginRequired} index={index} />
                    ) : (
                      <ListViewItem key={item._id} item={item} categoryName={categoryName} onAddToCart={addToCart} onViewDetails={handleViewDetails} isUserLoggedIn={isLoggedIn} onLoginRequired={handleLoginRequired} index={index} />
                    )
                  })}
                </motion.div>
                {filteredItems.length > 0 && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="text-center mt-6 md:mt-8 pb-8">
                    <Badge variant="outline" className="bg-white/80 backdrop-blur-sm px-2.5 py-1 md:px-4 md:py-2 rounded-full text-[9px] md:text-xs border border-purple-200 shadow-sm">
                      <Eye className="h-2 w-2 md:h-3 md:w-3 mr-1 md:mr-1.5 text-purple-900" />
                      Showing {filteredItems.length} of {items.length} items
                    </Badge>
                  </motion.div>
                )}
              </>
            )}
          </AnimatePresence>
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
            onSpecialRequirementsChange={setSpecialRequirements} 
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
        onTransactionIdChange={setTransactionId} 
        subtotal={adjustedSubtotal} 
        tax={calculatedTax} 
        orderType={orderType} 
        deliveryFee={orderType === 'delivery' && isLoggedIn ? deliveryFee?.fee || 0 : 0} 
        packagingCharge={orderType === 'delivery' && isLoggedIn ? packagingCharge : 0} 
        total={finalTotal} 
        onFinalizeOrder={handleFinalizeOrder} 
        isPlacingOrder={isPlacingOrder} 
      />
      
      {/* Order Progress Indicator */}
      <OrderProgressIndicator progress={orderProgress} orderType={orderType} />
    </>
  )
}