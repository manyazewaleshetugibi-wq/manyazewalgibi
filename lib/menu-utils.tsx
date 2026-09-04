// lib/menu-utils.ts
import axios from 'axios'
import { Category, Waiter } from '@/types'

declare module 'axios' {
  interface InternalAxiosRequestConfig {
    retryCount?: number
  }
}

export const API_TIMEOUT = 30000 // Increased from 15000 to 30000 (30 seconds)

export const api = axios.create({
  baseURL: '/api',
  timeout: API_TIMEOUT,
  headers: { 'Content-Type': 'application/json' }
})

// Add request interceptor for better error handling
api.interceptors.request.use(
  (config) => {
    // Add timestamp to prevent caching
    config.params = { ...config.params, _t: Date.now() }
    return config
  },
  (error) => Promise.reject(error)
)

// Add response interceptor with retry logic for timeouts
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, code } = error
    
    // Retry failed requests up to 2 times on timeout
    const shouldRetry = code === 'ECONNABORTED' && 
                        config?.retryCount !== undefined && 
                        config.retryCount < 2
    
    if (shouldRetry) {
      config.retryCount = (config.retryCount || 0) + 1
      
      // Wait 1 second before retrying
      await new Promise(resolve => setTimeout(resolve, 1000))
      return api(config)
    }
    
    if (error.code === 'ECONNABORTED') {
      console.error('Request timeout after', API_TIMEOUT, 'ms:', error.message)
    }
    return Promise.reject(error)
  }
)

// Initialize retry counter for requests
api.interceptors.request.use(
  (config) => {
    if (config.retryCount === undefined) {
      config.retryCount = 0
    }
    return config
  },
  (error) => Promise.reject(error)
)

export const getImageSrc = (imageUrl?: string): string => {
  if (!imageUrl) return '/placeholder.svg'
  if (imageUrl.startsWith('http')) return imageUrl
  if (imageUrl.startsWith('/uploads')) return imageUrl
  return `/uploads/${imageUrl}`
}

export const preloadImages = (urls: string[]) => {
  urls.forEach(url => {
    if (url && url !== '/placeholder.svg') {
      const img = new Image()
      img.loading = 'eager'
      img.src = url
    }
  })
}

export const autoAssignWaiter = (tableNumber: string, waiters: Waiter[]): string => {
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

export const shouldHideCategory = (category: Category): boolean => {
  const name = category.name?.toLowerCase() || ''
  const type = category.type?.toLowerCase() || ''
  return name.includes('packaging') || 
         type === 'packaging' || 
         name.includes('packing') || 
         name.includes('package') ||
         name.includes('staff food') ||
         name.includes('staff meal') ||
         name === 'staff'
}

export const getCategoryAdditionalCharge = (categoryName: string, categoryType?: string): number => {
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

export const isFoodItem = (category: Category | undefined): boolean => {
  if (!category) return false
  const name = category.name?.toLowerCase() || ''
  const type = category.type?.toLowerCase() || ''
  return name.includes('food') || type === 'food' || 
         name.includes('main course') || name.includes('appetizer')
}

// Classification helpers - used to match ordered items to the correct packaging pack
export type ItemPackType = 'food' | 'juice' | 'hotdrink'

export const getItemPackType = (category: Category | undefined, itemName?: string): ItemPackType | null => {
  const name = category?.name?.toLowerCase() || ''
  const type = category?.type?.toLowerCase() || ''
  const itemLower = itemName?.toLowerCase() || ''

  // Primary: match by category name/type
  if (name.includes('food') || type === 'food' || name.includes('main course') || name.includes('appetizer') || name.includes('pizza') || name.includes('burger') || name.includes('pasta') || name.includes('rice')) {
    return 'food'
  }
  if (name.includes('juice') || type === 'juice' || name.includes('smoothie')) {
    return 'juice'
  }
  if (name.includes('hot drink') || name.includes('coffee') || name.includes('tea') || name.includes('mocktail') || type === 'hot drink' || type === 'hotdrink' || type === 'mocktail') {
    return 'hotdrink'
  }

  // Fallback: match by item name keywords
  if (itemLower) {
    if (['pizza', 'burger', 'pasta', 'rice', 'sandwich', 'wrap'].some(k => itemLower.includes(k))) return 'food'
    if (['juice', 'smoothie', 'lemonade'].some(k => itemLower.includes(k))) return 'juice'
    if (['coffee', 'espresso', 'cappuccino', 'latte', 'mocha', 'americano', 'macchiato', 'tea', 'chai', 'hot chocolate', 'mocktail'].some(k => itemLower.includes(k))) return 'hotdrink'
  }

  return null
}

// Match the pack item in the DB by its name keyword
const findPackItem = (allItems: any[], keyword: string): any | undefined => {
  return allItems.find(it => {
    const name = (it?.name || '').toLowerCase()
    return name.includes(keyword)
  })
}

export interface PackagingLine {
  itemId: string
  itemName: string
  unitPrice: number
  quantity: number
  subtotal: number
  isPackaging: boolean
}

export interface PackagingResult {
  lines: PackagingLine[]
  categoryChargesTotal: number
  packagingCharge: number
}

export const calculatePackagingDetails = (
  cartItems: any[],
  categories: Category[],
  allItems: any[],
  isDelivery: boolean
): PackagingResult => {
  const empty = { lines: [], categoryChargesTotal: 0, packagingCharge: 0 }
  if (!isDelivery) return empty

  // Count how many items fall into each pack type
  let foodCount = 0
  let juiceCount = 0
  let hotDrinkCount = 0
  let totalQuantity = 0

  cartItems.forEach(item => {
    const qty = Number(item.quantity) || 0
    if (qty <= 0) return
    totalQuantity += qty
    const category = categories.find(c => c._id === item.categoryId)
    const packType = getItemPackType(category, item.name)
    if (packType === 'food') foodCount += qty
    else if (packType === 'juice') juiceCount += qty
    else if (packType === 'hotdrink') hotDrinkCount += qty
  })

  const buildLine = (
    keyword: string,
    fallbackName: string,
    count: number,
    fallbackPrice: number
  ): PackagingLine | null => {
    if (count <= 0) return null
    const packItem = findPackItem(allItems, keyword)
    const unitPrice = packItem ? (Number(packItem.price) || 0) : fallbackPrice
    const itemId = packItem?._id || packItem?.id || ''
    if (unitPrice <= 0) return null
    return {
      itemId,
      itemName: packItem?.name || fallbackName,
      unitPrice,
      quantity: count,
      subtotal: unitPrice * count,
      isPackaging: true
    }
  }

  const lines: PackagingLine[] = []
  // Order: detailed packs first, then bag
  const foodLine = buildLine('food pack', 'Food Pack', foodCount, 60)
  const juiceLine = buildLine('juice pack', 'Juice Pack', juiceCount, 30)
  const hotDrinkLine = buildLine('hot drink pack', 'Hot Drink Pack', hotDrinkCount, 30)
  if (foodLine) lines.push(foodLine)
  if (juiceLine) lines.push(juiceLine)
  if (hotDrinkLine) lines.push(hotDrinkLine)

  // Bag: one bag for every group of 4 items (ceil of total quantity / 4)
  const bagCount = Math.ceil(totalQuantity / 4)
  const bagLine = buildLine('bag', 'Bag', bagCount, 100)
  if (bagLine) lines.push(bagLine)

  const categoryChargesTotal = (foodLine?.subtotal || 0) + (juiceLine?.subtotal || 0) + (hotDrinkLine?.subtotal || 0)
  const packagingCharge = bagLine?.subtotal || 0

  return { lines, categoryChargesTotal, packagingCharge }
}