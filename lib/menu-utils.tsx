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

export const calculatePackagingCharge = (cartItems: any[], categories: Category[], isDelivery: boolean): number => {
  if (!isDelivery) return 0
  
  const foodItemCount = cartItems.reduce((count, item) => {
    const category = categories.find(c => c._id === item.categoryId)
    if (isFoodItem(category)) {
      return count + (item.quantity || 1)
    }
    return count
  }, 0)
  
  if (foodItemCount === 0) return 0
  
  const groupsOfFour = Math.ceil(foodItemCount / 4)
  return groupsOfFour * 100
}