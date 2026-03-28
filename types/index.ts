export interface NutritionalInfo {
  calories?: number
  protein?: number
  carbohydrates?: number
  fat?: number
}

export interface Item {
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

export interface CartItem extends Item {
  quantity: number
  specialInstructions?: string
  originalPrice?: number  // Price without VAT (calculated from price / 1.15)
  taxAmount?: number      // VAT amount for this item (calculated from price - originalPrice)
}

export interface Category {
  _id: string
  name: string
  description: string
  type: string
  imageUrl: string
}

export interface Waiter {
  _id: string
  name: string
  shift?: string
  avatar?: string
}

export interface UserData {
  _id: string
  id?: string
  firstName: string
  lastName: string
  email: string
  phone: string
  address: string
  location?: {
    type: string
    coordinates: [number, number] // [lng, lat]
  }
  role: string
  registrationSource: string
  locationConsent: boolean
  createdAt: string
  updatedAt: string
  lastLogin: string
  loginAttempts: number
  image?: string
  employeeId?: string
  permissions?: string[]
  status?: string
  requiresPasswordChange?: boolean
  googleId?: string
  emailVerified?: boolean
  specialization?: string
  shift?: string
}

export interface ExtendedUser {
  id: string
  role: string
  name?: string | null
  email?: string | null
  image?: string | null
}

export interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
  hasMore: boolean
}

export interface DeliveryFeeDetails {
  fee: number
  distance: number
  zone: string
  maxDistance: number
  breakdown: {
    baseFee: number
    distanceCharge: number
    freeDeliveryReason?: string
    surgeMultiplier?: number
    externalMultiplier?: number
    totalBeforeSurge?: number
    appliedPromotion?: {
      code: string
      type: string
      value: number
    }
  }
}

export interface PaymentScreenshot {
  file: File | null
  previewUrl: string
  uploaded: boolean
}

export interface OrderItem {
  itemId: string
  quantity: number
  notes?: string
  subtotal?: number
  unitPrice?: number
  itemName?: string
}

export interface DeliveryInfo {
  fullName: string
  phoneNumber: string
  email: string
  address: string
  city: string
  landmark?: string
  deliveryInstructions?: string
  location?: {
    type: string
    coordinates: [number, number]
  }
  latitude?: number
  longitude?: number
}

export interface OrderData {
  orderNumber: string
  paymentMethod: string
  numberOfGuests: number
  items: OrderItem[]
  discount?: number
  specialRequirements?: string
  tableNumber?: string
  waiterId?: string
  inTable?: boolean
  delivery?: boolean
  paymentScreenshotUrl?: string
  transactionId?: string
  customerId?: string
  deliveryInfo?: DeliveryInfo
  deliveryFee?: number
  totalAmount?: number
  subtotal?: number
  tax?: number
  finalAmount?: number
  appliedPromotion?: {
    code: string
    type: string
    value: number
  }
}

export interface ApiResponse<T> {
  data?: T
  message?: string
  error?: string
  success?: boolean
}

export interface LoginResponse {
  user: UserData
  token: string
  refreshToken?: string
}

export interface ErrorResponse {
  error: string
  message: string
  statusCode: number
}