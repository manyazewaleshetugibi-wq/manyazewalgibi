// types/order.ts
export type OrderStatus = "PENDING" | "CONFIRMED" | "PREPARING" | "PICKUP" | "SERVED" | "COMPLETED" | "CANCELLED"

export type StockProcessStatus = "PROCESSED" | "PENDING" | "FAILED"

export type OrderItem = {
  itemId: string
  itemName?: string
  quantity: number
  unitPrice: number
  price?: number
  subtotal: number
  status: string
  isUneditable?: boolean
  uneditableAt?: string
  uneditableBy?: string
  // Check-in (kitchen) user assigned to this specific item
  checkinUserId?: string
  checkinUserName?: string
  // Alternative ingredient selections made by waiter at order time
  // key = default stockId, value = chosen stockId (could be same as default or an alternative)
  selectedAlternatives?: Record<string, { stockId: string; stockName: string; quantity: number }>
}

export type DeliveryInfo = {
  fullName: string
  phoneNumber: string
  address: string
  city: string
}

export type Order = {
  _id: string
  orderNumber: string
  tableNumber: string
  waiterId: string
  numberOfGuests: number
  items: Array<OrderItem>
  orderItems?: Array<OrderItem>
  status: OrderStatus
  totalAmount: number
  discount: number
  tax: number
  finalAmount: number
  paymentMethod: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  inTable?: boolean
  delivery?: boolean
  deliveryInfo?: DeliveryInfo
  paymentScreenshotUrl?: string
  specialRequirements?: string
  notes?: string
  customerName?: string
  isEdited?: boolean
  waiterName?: string
  // Check-in (kitchen) user assigned to the whole order
  checkinUserId?: string
  checkinUserName?: string
  restaurantName?: string
  restaurantId?: string
  markedForDeletion?: boolean
  deletionRequestReason?: string
  deletionRequestedBy?: string
  deletionRequestedAt?: string
  deletedAt?: string
  deletedBy?: string
  deletionReason?: string
  floor?: string
  // Stock processing fields
  stockProcessed?: boolean
  stockProcessedAt?: string
  stockProcessingError?: string
  stockProcessingFailedAt?: string
  stockProcessingNote?: string
  // Partial stock processing — sufficient stocks were deducted, these still need stock
  hasPartialStock?: boolean
  pendingStockItems?: Array<{
    stockId: string
    stockName: string
    requiredQuantity: number
    currentStock: number
    deficit: number
    unit: string
    menuItemName: string
  }>
}

export type Waitress = {
  _id: string
  name: string
  phone: string
  shift: string
  isActive: boolean
}

export type MenuItem = {
  _id: string
  name: string
  description: string
  price: number
  imageUrl: string
  preparationTime: number
  floor?: string
}

export type Restaurant = {
  _id: string
  name: string
  description?: string
  address?: string
  phone?: string
  email?: string
  isActive: boolean
  cuisine?: string[]
  location?: {
    lat: number
    lng: number
    address: string
  }
}