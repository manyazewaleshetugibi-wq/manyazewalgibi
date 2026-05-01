'use client'

import React, { memo, useState } from 'react'
import { 
  ShoppingCart, X, Minus, Plus, MapPin, Home, Users, Receipt,
  Clock, AlertCircle, Navigation, Truck, ChevronRight, Armchair
} from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CartItem, UserData, Waiter, DeliveryFeeDetails } from '@/types'
import { motion, AnimatePresence } from 'framer-motion'
import { TableSelector } from '@/components/menu/TableSelector'

// Table type from database
interface TableData {
  id: string
  number: number
  capacity: number
  status: 'available' | 'occupied' | 'reserved' | 'cleaning' | 'maintenance'
  shape: string
  location?: string
  description?: string
  features?: string[]
  tags?: string[]
}

// Helper function to calculate original price and tax
const calculatePriceBreakdown = (priceWithTax: number, taxRate: number = 0.15) => {
  const originalPrice = priceWithTax / (1 + taxRate)
  const taxAmount = priceWithTax - originalPrice
  return { originalPrice, taxAmount }
}

interface CartPanelProps {
  cart: CartItem[]
  onClose: () => void
  onRemoveItem: (id: string) => void
  onUpdateQuantity: (id: string, qty: number) => void
  onUpdateInstructions?: (id: string, instructions: string) => void
  orderType: 'table' | 'delivery' | ''
  onOrderTypeChange: (type: 'table' | 'delivery' | '') => void
  tableNumber: string
  onTableNumberChange: (num: string) => void
  selectedTableData?: TableData | null
  onTableSelect?: (table: TableData | null) => void
  waiters: Waiter[]
  selectedWaiter: string
  onWaiterChange: (id: string) => void
  numberOfGuests: number
  onGuestsChange: (num: number) => void
  specialRequirements: string
  onSpecialRequirementsChange: (req: string) => void
  subtotal: number
  tax: number
  deliveryFee: DeliveryFeeDetails | null
  total: number
  orderNumber: string
  onPlaceOrder: () => void
  isPlacingOrder: boolean
  isUserLoggedIn: boolean
  onLoginRequired: (message: string) => void
  userData: UserData | null
  onNavigateToProfile?: () => void
  isCalculatingDelivery?: boolean
  restaurantId?: string
  floor?: string
  arrangementId?: string
}

// Helper function to safely format numbers
const formatCurrency = (value: number | undefined | null): string => {
  if (value === undefined || value === null || isNaN(value)) {
    return '0.00'
  }
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

export const CartPanel = memo(({
  cart,
  onClose,
  onRemoveItem,
  onUpdateQuantity,
  onUpdateInstructions,
  orderType,
  onOrderTypeChange,
  tableNumber,
  onTableNumberChange,
  selectedTableData = null,
  onTableSelect,
  waiters,
  selectedWaiter,
  onWaiterChange,
  numberOfGuests,
  onGuestsChange,
  specialRequirements,
  onSpecialRequirementsChange,
  subtotal = 0,
  tax = 0,
  deliveryFee,
  total = 0,
  orderNumber,
  onPlaceOrder,
  isPlacingOrder = false,
  isUserLoggedIn = false,
  onLoginRequired,
  userData,
  onNavigateToProfile,
  isCalculatingDelivery = false,
  restaurantId = 'manyazewal1',
  floor = 'Ground Floor',
  arrangementId,
}: CartPanelProps) => {
  const [showTableSelector, setShowTableSelector] = useState(false)

  const handlePlaceOrder = () => {
    if (!isUserLoggedIn) {
      onLoginRequired('Please login to place an order')
      return
    }
    onPlaceOrder()
  }

  const userFullName = userData ? `${userData.firstName} ${userData.lastName}`.trim() : ''
  const hasCompleteProfile = userData?.phone && userData?.address
  const hasCoordinates = userData?.location?.coordinates && userData.location.coordinates.length === 2

  const getImageSrc = (imageUrl?: string): string => {
    if (!imageUrl) return '/placeholder.svg'
    if (imageUrl.startsWith('http')) return imageUrl
    if (imageUrl.startsWith('/uploads')) return imageUrl
    return `/uploads/${imageUrl}`
  }

  // Format all values safely
  const formattedSubtotal = formatCurrency(subtotal)
  const formattedTax = formatCurrency(tax)
  const formattedTotal = formatCurrency(total)
  const formattedDeliveryFee = formatCurrency(deliveryFee?.fee)

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-white to-purple-50/30">
      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b border-purple-100 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <motion.h3 
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="font-bold flex items-center gap-2 text-xl"
        >
          <div className="p-2 bg-gradient-to-r from-purple-800 to-purple-900 rounded-xl shadow-lg">
            <ShoppingCart className="h-5 w-5 text-white" />
          </div>
          <span className="bg-gradient-to-r from-purple-900 to-purple-700 bg-clip-text text-transparent">
            Your Order
          </span>
          <Badge variant="outline" className="ml-2 bg-purple-50 text-purple-900 border-purple-200 rounded-full">
            {cart.length} {cart.length === 1 ? 'item' : 'items'}
          </Badge>
        </motion.h3>
        <motion.div
          whileHover={{ rotate: 90 }}
          whileTap={{ scale: 0.9 }}
        >
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onClose}
            className="h-9 w-9 rounded-full hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </Button>
        </motion.div>
      </div>

      {cart.length > 0 ? (
        <>
          <div className="flex-1 overflow-y-auto">
            <div className="p-5 space-y-6 pb-32">
              {/* Cart Items */}
              <AnimatePresence>
                <div className="space-y-3">
                  {cart.map((item, index) => {
                    const { originalPrice, taxAmount } = calculatePriceBreakdown(Number(item.price))
                    const itemTotalOriginal = originalPrice * item.quantity
                    const itemTotalTax = taxAmount * item.quantity
                    
                    return (
                      <motion.div
                        key={item._id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ delay: index * 0.05 }}
                        whileHover={{ scale: 1.02 }}
                        className="group relative"
                      >
                        <div className="flex border-2 border-purple-100 rounded-2xl overflow-hidden bg-white hover:shadow-xl transition-all duration-300 hover:border-purple-300">
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-purple-800 to-purple-900 opacity-0 group-hover:opacity-100 transition-opacity" />
                          
                          <div className="relative h-28 w-28 flex-shrink-0 bg-gradient-to-br from-purple-50 to-gray-50">
                            <img
                              src={getImageSrc(item.imageUrl)}
                              alt={item.name}
                              className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-110"
                              onError={(e) => (e.target as HTMLImageElement).src = '/placeholder.svg'}
                            />
                          </div>
                          
                          <div className="flex-1 p-4">
                            <div className="flex items-start justify-between">
                              <div>
                                <h4 className="font-bold text-gray-800 line-clamp-1 group-hover:text-purple-900">
                                  {item.name}
                                </h4>
                                <div className="flex flex-col mt-1">
                                  <p className="text-sm text-purple-900 font-semibold">
                                    {originalPrice.toFixed(2)} ETB <span className="text-xs text-gray-500 font-normal">(excl. VAT)</span>
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    + VAT: {taxAmount.toFixed(2)} ETB
                                  </p>
                                </div>
                                {item.preparationTime && (
                                  <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                                    <Clock className="h-3 w-3 text-purple-700" />
                                    {item.preparationTime} min
                                  </p>
                                )}
                              </div>
                              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => onRemoveItem(item._id)}
                                  className="h-8 w-8 rounded-full text-red-500 hover:bg-red-50 hover:text-red-600"
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </motion.div>
                            </div>
                            
                            <div className="mt-3 flex items-center justify-between">
                              <div className="flex items-center border-2 border-purple-100 rounded-xl overflow-hidden bg-white">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => onUpdateQuantity(item._id, item.quantity - 1)}
                                  className="h-9 w-9 rounded-none hover:bg-purple-50 hover:text-purple-900"
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <span className="w-12 text-center text-sm font-bold text-purple-900">
                                  {item.quantity}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => onUpdateQuantity(item._id, item.quantity + 1)}
                                  className="h-9 w-9 rounded-none hover:bg-purple-50 hover:text-purple-900"
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </div>
                              
                              <div className="text-right">
                                <span className="text-lg font-bold text-purple-900">
                                  {itemTotalOriginal.toFixed(2)} ETB
                                </span>
                                <p className="text-xs text-gray-500">
                                  + VAT: {itemTotalTax.toFixed(2)} ETB
                                </p>
                              </div>
                            </div>

                            {onUpdateInstructions && (
                              <div className="mt-3">
                                <Textarea
                                  placeholder="Special instructions..."
                                  value={item.specialInstructions || ''}
                                  onChange={(e) => onUpdateInstructions(item._id, e.target.value)}
                                  className="text-xs h-20 resize-none border-2 border-purple-100 focus:border-purple-900 focus:ring-2 focus:ring-purple-200 rounded-xl"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              </AnimatePresence>

              <Separator className="bg-gradient-to-r from-transparent via-purple-200 to-transparent" />

              {/* Order Type Selection */}
              <div className="space-y-5">
                <div className="space-y-4">
                  <Label className="text-base font-bold flex items-center gap-2 text-purple-900">
                    <div className="p-1.5 bg-purple-100 rounded-lg">
                      <ChevronRight className="h-4 w-4 text-purple-900" />
                    </div>
                    Order Type
                  </Label>
                  <RadioGroup
                    value={orderType}
                    onValueChange={(value: 'table' | 'delivery') => {
                      if (!isUserLoggedIn) {
                        onLoginRequired('Please login to select order type')
                        return
                      }
                      onOrderTypeChange(value)
                    }}
                    className="flex gap-4"
                  >
                    <div className={`flex-1 ${!isUserLoggedIn ? 'opacity-50' : ''}`}>
                      <RadioGroupItem value="table" id="table" className="peer sr-only" />
                      <Label
                        htmlFor="table"
                        className="flex flex-col items-center justify-between rounded-2xl border-2 border-purple-200 bg-white p-5 hover:bg-purple-50 hover:border-purple-900 peer-data-[state=checked]:border-purple-900 peer-data-[state=checked]:bg-purple-50 cursor-pointer transition-all group"
                      >
                        <div className="p-3 bg-purple-100 rounded-full mb-3 group-hover:bg-purple-200">
                          <Home className="h-6 w-6 text-purple-900" />
                        </div>
                        <span className="text-sm font-medium text-gray-700 group-hover:text-purple-900">Dine In</span>
                      </Label>
                    </div>
                    <div className={`flex-1 ${!isUserLoggedIn ? 'opacity-50' : ''}`}>
                      <RadioGroupItem value="delivery" id="delivery" className="peer sr-only" />
                      <Label
                        htmlFor="delivery"
                        className="flex flex-col items-center justify-between rounded-2xl border-2 border-purple-200 bg-white p-5 hover:bg-purple-50 hover:border-purple-900 peer-data-[state=checked]:border-purple-900 peer-data-[state=checked]:bg-purple-50 cursor-pointer transition-all group"
                      >
                        <div className="p-3 bg-purple-100 rounded-full mb-3 group-hover:bg-purple-200">
                          <Truck className="h-6 w-6 text-purple-900" />
                        </div>
                        <span className="text-sm font-medium text-gray-700 group-hover:text-purple-900">Delivery</span>
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* Table Order Fields */}
                <AnimatePresence>
                  {orderType === 'table' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-4 overflow-hidden"
                    >
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-purple-900 flex items-center gap-2">
                          <span className="p-1 bg-purple-100 rounded-md">🍽️</span>
                          Table Number <span className="text-red-500">*</span>
                        </Label>
                        
                        {/* Selected Table Display */}
                        {selectedTableData ? (
                          <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Armchair className="w-5 h-5 text-purple-600" />
                                <div>
                                  <div className="font-bold text-purple-900">Table {selectedTableData.number}</div>
                                  <div className="text-sm text-gray-600">
                                    {selectedTableData.capacity} seats
                                    {selectedTableData.location && ` • ${selectedTableData.location}`}
                                  </div>
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowTableSelector(true)}
                              >
                                Change
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <Button
                            variant="outline"
                            className="w-full border-2 border-purple-200 hover:border-purple-900 hover:bg-purple-50 rounded-xl h-12"
                            onClick={() => setShowTableSelector(true)}
                          >
                            <Armchair className="w-4 h-4 mr-2" />
                            Select a Table
                          </Button>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="guests" className="text-sm font-medium text-purple-900 flex items-center gap-2">
                          <Users className="h-4 w-4 text-purple-700" />
                          Number of Guests <span className="text-red-500">*</span>
                        </Label>
                        <Select 
                          value={numberOfGuests.toString()} 
                          onValueChange={(v) => onGuestsChange(parseInt(v))}
                        >
                          <SelectTrigger id="guests" className="border-2 border-purple-200 focus:border-purple-900 focus:ring-2 focus:ring-purple-200 rounded-xl">
                            <SelectValue placeholder="Select guests" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl border-purple-200">
                            {Array.from({ length: Math.min(20, selectedTableData?.capacity || 10) }, (_, i) => (
                              <SelectItem key={i} value={(i + 1).toString()} className="hover:bg-purple-50">
                                {i + 1} {i === 0 ? 'Guest' : 'Guests'}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {selectedTableData && numberOfGuests > selectedTableData.capacity && (
                          <p className="text-xs text-red-500 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            Guests exceed table capacity ({selectedTableData.capacity})
                          </p>
                        )}
                      </div>
                    </motion.div>
                  )}

                  {/* Delivery Fields */}
                  {orderType === 'delivery' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-4 overflow-hidden"
                    >
                      {!hasCompleteProfile ? (
                        <Alert variant="destructive" className="rounded-xl border-red-200 bg-red-50">
                          <AlertCircle className="h-4 w-4 text-red-600" />
                          <AlertDescription className="text-red-700">
                            Please complete your profile with phone and address
                            {onNavigateToProfile && (
                              <Button
                                variant="link"
                                className="p-0 h-auto text-red-700 underline font-semibold ml-2"
                                onClick={onNavigateToProfile}
                              >
                                Update Profile
                              </Button>
                            )}
                          </AlertDescription>
                        </Alert>
                      ) : (
                        <>
                          <Alert className={`rounded-xl border-2 ${
                            hasCoordinates ? 'bg-purple-50 border-purple-200' : 'bg-yellow-50 border-yellow-200'
                          }`}>
                            {hasCoordinates ? <Navigation className="h-4 w-4 text-purple-900" /> : <MapPin className="h-4 w-4 text-yellow-600" />}
                            <AlertDescription>
                              <div className="space-y-2">
                                <div className="bg-white/80 rounded-lg p-3 space-y-1 text-sm">
                                  <p><span className="font-medium text-purple-900">Name:</span> {userFullName}</p>
                                  <p><span className="font-medium text-purple-900">Phone:</span> {userData?.phone}</p>
                                  <p><span className="font-medium text-purple-900">Address:</span> {userData?.address}</p>
                                </div>
                              </div>
                            </AlertDescription>
                          </Alert>

                          {isCalculatingDelivery ? (
                            <div className="flex items-center justify-center py-6 bg-purple-50 rounded-xl border-2 border-purple-200">
                              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-900 mr-3"></div>
                              <span className="text-sm text-purple-900 font-medium">Calculating delivery fee...</span>
                            </div>
                          ) : deliveryFee && (
                            <motion.div
                              initial={{ scale: 0.95 }}
                              animate={{ scale: 1 }}
                              className="bg-gradient-to-br from-purple-50 to-white border-2 border-purple-200 rounded-xl p-4 shadow-lg"
                            >
                              <div className="flex items-center justify-between mb-3">
                                <span className="text-sm font-bold text-purple-900 flex items-center gap-2">
                                  <Truck className="h-4 w-4" />
                                  Delivery Fee
                                </span>
                                <Badge className={deliveryFee.fee === 0 ? "bg-green-100 text-green-700" : "bg-purple-900 text-white"}>
                                  {deliveryFee.fee === 0 ? 'FREE' : `${formattedDeliveryFee} ETB`}
                                </Badge>
                              </div>
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Distance:</span>
                                  <span className="font-semibold text-purple-900">{deliveryFee.distance} km</span>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Special Requirements */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-purple-900 flex items-center gap-2">
                    <span className="p-1 bg-purple-100 rounded-md">📝</span>
                    Special Requirements
                  </Label>
                  <Textarea
                    placeholder="Any special requests or notes..."
                    value={specialRequirements}
                    onChange={(e) => onSpecialRequirementsChange(e.target.value)}
                    rows={3}
                    className="resize-none border-2 border-purple-200 focus:border-purple-900 focus:ring-2 focus:ring-purple-200 rounded-xl"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Fixed Bottom Order Summary */}
          <div className="sticky bottom-0 border-t-2 border-purple-100 p-5 space-y-4 bg-gradient-to-b from-white/95 to-purple-50/95 backdrop-blur-md shadow-lg">
            {/* Selected Table Summary */}
            {orderType === 'table' && selectedTableData && (
              <div className="bg-purple-50 rounded-lg p-2 text-center">
                <span className="text-sm text-purple-900">
                  <span className="font-bold">Table {selectedTableData.number}</span> • {selectedTableData.capacity} seats
                </span>
              </div>
            )}
            
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal (excl. VAT):</span>
                <span className="font-semibold text-purple-900">{formattedSubtotal} ETB</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">VAT (15%):</span>
                <span className="font-semibold text-purple-900">{formattedTax} ETB</span>
              </div>
              {orderType === 'delivery' && deliveryFee && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Delivery Fee:</span>
                  <span className="font-semibold text-purple-900">{formattedDeliveryFee} ETB</span>
                </div>
              )}
              <Separator className="my-3 bg-gradient-to-r from-transparent via-purple-200 to-transparent" />
              <div className="flex justify-between font-bold text-xl">
                <span className="text-gray-800">Total (incl. VAT):</span>
                <span className="bg-gradient-to-r from-purple-900 to-purple-700 bg-clip-text text-transparent">
                  {formattedTotal} ETB
                </span>
              </div>
            </div>

            <div className="text-xs text-center">
              <Badge variant="outline" className="bg-purple-50 text-purple-900 border-purple-200 rounded-full px-3 py-1">
                Order #: <span className="font-mono font-bold">{orderNumber}</span>
                {orderType === 'table' && selectedTableData && (
                  <span className="ml-2">| Table: {selectedTableData.number}</span>
                )}
              </Badge>
            </div>
            
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button 
                onClick={handlePlaceOrder} 
                className="w-full h-14 text-base font-bold bg-gradient-to-r from-purple-800 to-purple-900 hover:from-purple-900 hover:to-purple-950 text-white border-0 rounded-xl shadow-lg hover:shadow-xl transition-all"
                disabled={
                  cart.length === 0 || 
                  !orderType || 
                  isPlacingOrder ||
                  (orderType === 'table' && !selectedTableData) ||
                  (orderType === 'delivery' && (!hasCompleteProfile || isCalculatingDelivery))
                }
              >
                {isPlacingOrder ? (
                  <>
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent mr-3" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Receipt className="mr-2 h-5 w-5" />
                    Proceed to Payment
                  </>
                )}
              </Button>
            </motion.div>
          </div>
        </>
      ) : (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex-1 flex flex-col items-center justify-center p-8 text-center"
        >
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-700 to-purple-900 rounded-full blur-3xl opacity-20" />
            <div className="relative h-32 w-32 rounded-full bg-gradient-to-br from-purple-100 to-purple-50 flex items-center justify-center mb-6 shadow-xl">
              <ShoppingCart className="h-16 w-16 text-purple-900" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-gray-800 mb-3">Your cart is empty</h3>
          <p className="text-gray-600 max-w-md mb-8">
            {!isUserLoggedIn ? 'Please login to add items to your cart.' : 'Add items from the menu to get started.'}
          </p>
          <Button variant="outline" onClick={onClose} size="lg" className="rounded-full px-8 py-6 text-lg border-2 border-purple-200 hover:border-purple-900 hover:bg-purple-50">
            Browse Menu
          </Button>
        </motion.div>
      )}

      {/* Table Selector Dialog - FIXED: Handle null table (unselect) */}
      <TableSelector
        open={showTableSelector}
        onOpenChange={setShowTableSelector}
        restaurantId={restaurantId}
        floor={floor}
        onTableSelect={(table, _restaurantId, _floor) => {
          // FIXED: Handle null case (when user unselects a table)
          if (!table || table === null) {
            // Unselect case
            onTableSelect?.(null)
            onTableNumberChange('')
          } else {
            // Select case
            onTableSelect?.(table)
            onTableNumberChange(table.number.toString())
          }
          setShowTableSelector(false)
        }}
        selectedTable={selectedTableData}
        isUserLoggedIn={isUserLoggedIn}
        onLoginRequired={() => onLoginRequired('Please login to select a table')}
        arrangementId={arrangementId}
        allowUnselect={true}
      />
    </div>
  )
})

CartPanel.displayName = 'CartPanel'

export default CartPanel