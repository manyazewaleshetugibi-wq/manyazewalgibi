// types/index.ts - shared frontend types barrel

export interface NutritionalInfo {
  calories?: number
  protein?: number
  carbohydrates?: number
  carbs?: number
  fat?: number
}

export interface Item {
  _id: string
  name: string
  description?: string
  categoryId: string
  categoryName?: string
  price: number
  cost?: number
  imageUrl?: string
  cloudinaryData?: {
    publicId?: string
    url?: string
    format?: string
    bytes?: number
    width?: number
    height?: number
  } | null
  requiredStock?: Array<{
    stockId: string
    quantity: number
    alternatives?: Array<{ stockId: string; quantity: number; label?: string }>
  }>
  nutritionalInfo?: NutritionalInfo
  preparationTime?: number
  isActive?: boolean
  isFeatured?: boolean
  isFasting?: boolean
  tags?: string[]
  quantity?: number
  createdAt?: string | Date
  updatedAt?: string | Date
  [key: string]: any
}

export interface CartItem {
  _id: string
  name: string
  description?: string
  categoryId?: string
  price: number
  imageUrl?: string
  quantity: number
  specialInstructions?: string
  preparationTime?: number
  nutritionalInfo?: NutritionalInfo
  isActive?: boolean
  isFeatured?: boolean
  tags?: string[]
  [key: string]: any
}

export interface Category {
  _id: string
  name: string
  type?: string
  description?: string
  isActive?: boolean
  sortOrder?: number
  createdAt?: string | Date
  updatedAt?: string | Date
  [key: string]: any
}

export interface Waiter {
  _id: string
  name: string
  phone?: string
  shift?: string
  isActive?: boolean
  email?: string
  role?: string
  userId?: string
  createdAt?: string | Date
  updatedAt?: string | Date
  [key: string]: any
}

export interface UserData {
  _id: string
  id?: string
  firstName: string
  lastName: string
  email: string
  phone: string
  address: string
  landmark?: string
  location: { lat: number; lng: number; label?: string; address?: string; coordinates?: number[] } | null
  role: string
  registrationSource?: string
  locationConsent?: boolean
  createdAt?: string
  updatedAt?: string
  lastLogin?: string
  loginAttempts?: number
  permissions?: string[]
  employeeId?: string
  requiresPasswordChange?: boolean
  name?: string
  image?: string | null
  status?: string
}

export interface ExtendedUser {
  id: string
  role: string
  name?: string | null
  email?: string | null
  image?: string | null
  employeeId?: string
  permissions?: string[]
  requiresPasswordChange?: boolean
  status?: string
  [key: string]: any
}

export interface DeliveryFeeDetails {
  fee: number
  distance: number
  zone: string
  maxDistance: number
  breakdown: {
    baseFee?: number
    distanceCharge?: number
    freeDeliveryReason?: string
    totalBeforeSurge?: number
    surgeMultiplier?: number
    externalMultiplier?: number
    appliedPromotion?: { code: string; type: string; value: number }
  }
}

export interface PaymentScreenshot {
  file: File | null
  previewUrl: string
  uploaded: boolean
}
