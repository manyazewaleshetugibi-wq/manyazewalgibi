'use client'

import React, { memo } from 'react'
import { 
  ShoppingCart, X, Minus, Plus, MapPin, Home, Users, Receipt,
  Clock, AlertCircle, Navigation, Truck, ChevronRight
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
  // Enhanced delivery props - REMOVED PROMO CODE
  isCalculatingDelivery?: boolean
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
  waiters,
  selectedWaiter,
  onWaiterChange,
  numberOfGuests,
  onGuestsChange,
  specialRequirements,
  onSpecialRequirementsChange,
  subtotal,
  tax,
  deliveryFee,
  total,
  orderNumber,
  onPlaceOrder,
  isPlacingOrder,
  isUserLoggedIn,
  onLoginRequired,
  userData,
  onNavigateToProfile,
  isCalculatingDelivery
}: CartPanelProps) => {
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

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-white to-purple-50/30">
      {/* Header with Purple-900 */}
      <div className="flex items-center justify-between p-5 border-b border-purple-100 bg-white/80 backdrop-blur-sm">
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
          <ScrollArea className="flex-1">
            <div className="p-5 space-y-6">
              {/* Cart Items with Purple-900 styling */}
              <AnimatePresence>
                <div className="space-y-3">
                  {cart.map((item, index) => (
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
                        {/* Purple accent on hover */}
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-purple-800 to-purple-900 opacity-0 group-hover:opacity-100 transition-opacity" />
                        
                        {/* Image section */}
                        <div className="relative h-28 w-28 flex-shrink-0 bg-gradient-to-br from-purple-50 to-gray-50">
                          <div className="absolute inset-0 bg-gradient-to-br from-purple-900/10 to-transparent" />
                          <img
                            src={getImageSrc(item.imageUrl)}
                            alt={item.name}
                            className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-110"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = '/placeholder.svg'
                            }}
                          />
                        </div>
                        
                        <div className="flex-1 p-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-bold text-gray-800 line-clamp-1 group-hover:text-purple-900 transition-colors">
                                {item.name}
                              </h4>
                              <p className="text-sm text-purple-900 font-semibold">
                                {Number(item.price).toLocaleString()} ETB
                              </p>
                              {item.preparationTime && (
                                <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                                  <Clock className="h-3 w-3 text-purple-700" />
                                  {item.preparationTime} min
                                </p>
                              )}
                            </div>
                            <motion.div
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                            >
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
                              <motion.div
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                              >
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => onUpdateQuantity(item._id, item.quantity - 1)}
                                  className="h-9 w-9 rounded-none hover:bg-purple-50 hover:text-purple-900"
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                              </motion.div>
                              <span className="w-12 text-center text-sm font-bold text-purple-900">
                                {item.quantity}
                              </span>
                              <motion.div
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                              >
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => onUpdateQuantity(item._id, item.quantity + 1)}
                                  className="h-9 w-9 rounded-none hover:bg-purple-50 hover:text-purple-900"
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </motion.div>
                            </div>
                            
                            <span className="text-lg font-bold text-purple-900">
                              {(Number(item.price) * item.quantity).toLocaleString()} <span className="text-xs font-normal text-gray-500">ETB</span>
                            </span>
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
                  ))}
                </div>
              </AnimatePresence>

              <Separator className="bg-gradient-to-r from-transparent via-purple-200 to-transparent" />

              {/* Order Type Selection with Purple-900 */}
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
                        className="flex flex-col items-center justify-between rounded-2xl border-2 border-purple-200 bg-white p-5 hover:bg-purple-50 hover:border-purple-900 peer-data-[state=checked]:border-purple-900 peer-data-[state=checked]:bg-purple-50 [&:has([data-state=checked])]:border-purple-900 [&:has([data-state=checked])]:bg-purple-50 cursor-pointer transition-all group"
                      >
                        <div className="p-3 bg-purple-100 rounded-full mb-3 group-hover:bg-purple-200 transition-colors">
                          <Home className="h-6 w-6 text-purple-900" />
                        </div>
                        <span className="text-sm font-medium text-gray-700 group-hover:text-purple-900">Dine In</span>
                      </Label>
                    </div>
                    <div className={`flex-1 ${!isUserLoggedIn ? 'opacity-50' : ''}`}>
                      <RadioGroupItem value="delivery" id="delivery" className="peer sr-only" />
                      <Label
                        htmlFor="delivery"
                        className="flex flex-col items-center justify-between rounded-2xl border-2 border-purple-200 bg-white p-5 hover:bg-purple-50 hover:border-purple-900 peer-data-[state=checked]:border-purple-900 peer-data-[state=checked]:bg-purple-50 [&:has([data-state=checked])]:border-purple-900 [&:has([data-state=checked])]:bg-purple-50 cursor-pointer transition-all group"
                      >
                        <div className="p-3 bg-purple-100 rounded-full mb-3 group-hover:bg-purple-200 transition-colors">
                          <Truck className="h-6 w-6 text-purple-900" />
                        </div>
                        <span className="text-sm font-medium text-gray-700 group-hover:text-purple-900">Delivery</span>
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* Table Order Fields with Purple-900 */}
                <AnimatePresence>
                  {orderType === 'table' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-4 overflow-hidden"
                    >
                      <div className="space-y-2">
                        <Label htmlFor="table-number" className="text-sm font-medium text-purple-900 flex items-center gap-2">
                          <span className="p-1 bg-purple-100 rounded-md">🍽️</span>
                          Table Number <span className="text-red-500">*</span>
                        </Label>
                        <Select value={tableNumber} onValueChange={onTableNumberChange}>
                          <SelectTrigger id="table-number" className="border-2 border-purple-200 focus:border-purple-900 focus:ring-2 focus:ring-purple-200 rounded-xl">
                            <SelectValue placeholder="Select Table" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl border-purple-200">
                            {Array.from({ length: 20 }, (_, i) => (
                              <SelectItem key={i} value={`T${i + 1}`} className="hover:bg-purple-50">
                                Table {i + 1}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="waiter" className="text-sm font-medium text-purple-900 flex items-center gap-2">
                          <span className="p-1 bg-purple-100 rounded-md">👨‍🍳</span>
                          Server <span className="text-red-500">*</span>
                        </Label>
                        <Select value={selectedWaiter} onValueChange={onWaiterChange}>
                          <SelectTrigger id="waiter" className="border-2 border-purple-200 focus:border-purple-900 focus:ring-2 focus:ring-purple-200 rounded-xl">
                            <SelectValue placeholder="Select Server" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl border-purple-200">
                            {waiters.map((waiter) => (
                              <SelectItem key={waiter._id} value={waiter._id} className="hover:bg-purple-50">
                                {waiter.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
                            {Array.from({ length: 10 }, (_, i) => (
                              <SelectItem key={i} value={(i + 1).toString()} className="hover:bg-purple-50">
                                {i + 1} {i === 0 ? 'Guest' : 'Guests'}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </motion.div>
                  )}

                  {/* Delivery Order Fields with Purple-900 - REMOVED PROMO CODE */}
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
                            Please complete your profile with phone and address for delivery
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
                            hasCoordinates 
                              ? 'bg-purple-50 border-purple-200' 
                              : 'bg-yellow-50 border-yellow-200'
                          }`}>
                            {hasCoordinates 
                              ? <Navigation className="h-4 w-4 text-purple-900" /> 
                              : <MapPin className="h-4 w-4 text-yellow-600" />
                            }
                            <AlertDescription>
                              <div className="space-y-2">
                                <div className="font-bold flex items-center gap-2 text-gray-800">
                                  {hasCoordinates ? '📍 Precise Location Available' : '📍 Approximate Location'}
                                  {hasCoordinates && (
                                    <Badge variant="outline" className="bg-purple-100 text-purple-900 border-purple-200 rounded-full">
                                      GPS Enabled
                                    </Badge>
                                  )}
                                </div>
                                <div className="bg-white/80 rounded-lg p-3 space-y-1 text-sm">
                                  <p><span className="font-medium text-purple-900">Name:</span> {userFullName}</p>
                                  <p><span className="font-medium text-purple-900">Phone:</span> {userData?.phone}</p>
                                  <p><span className="font-medium text-purple-900">Address:</span> {userData?.address}</p>
                                  {hasCoordinates && (
                                    <p className="text-xs text-purple-700 flex items-center gap-1 mt-2">
                                      <Navigation className="h-3 w-3" />
                                      Coordinates: {userData.location?.coordinates[1]}, {userData.location?.coordinates[0]}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </AlertDescription>
                          </Alert>

                          {/* REMOVED PROMOTIONS SECTION */}

                          {/* Delivery Fee Status with Purple-900 */}
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
                                <Badge className={deliveryFee.fee === 0 
                                  ? "bg-green-100 text-green-700 border-green-200" 
                                  : "bg-purple-900 text-white"
                                }>
                                  {deliveryFee.fee === 0 ? 'FREE' : `${deliveryFee.fee} ETB`}
                                </Badge>
                              </div>
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between items-center">
                                  <span className="text-gray-600">Distance:</span>
                                  <span className="font-semibold text-purple-900">{deliveryFee.distance} km</span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-gray-600">Zone:</span>
                                  <span className="font-semibold text-purple-900">{deliveryFee.zone}</span>
                                </div>
                                {deliveryFee.breakdown.surgeMultiplier && (
                                  <div className="flex justify-between items-center text-orange-600">
                                    <span>Surge pricing:</span>
                                    <span className="font-semibold">{deliveryFee.breakdown.surgeMultiplier}x</span>
                                  </div>
                                )}
                                {deliveryFee.breakdown.externalMultiplier && deliveryFee.breakdown.externalMultiplier > 1 && (
                                  <div className="flex justify-between items-center text-orange-600">
                                    <span>Weather/Traffic:</span>
                                    <span className="font-semibold">+{Math.round((deliveryFee.breakdown.externalMultiplier - 1) * 100)}%</span>
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          )}

                          {/* REMOVED APPLIED PROMOTION SECTION */}
                        </>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Special Requirements with Purple-900 */}
                <div className="space-y-2">
                  <Label htmlFor="special-requirements" className="text-sm font-medium text-purple-900 flex items-center gap-2">
                    <span className="p-1 bg-purple-100 rounded-md">📝</span>
                    Special Requirements
                  </Label>
                  <Textarea
                    id="special-requirements"
                    placeholder="Any special requests or notes..."
                    value={specialRequirements}
                    onChange={(e) => onSpecialRequirementsChange(e.target.value)}
                    rows={3}
                    className="resize-none border-2 border-purple-200 focus:border-purple-900 focus:ring-2 focus:ring-purple-200 rounded-xl"
                  />
                </div>
              </div>
            </div>
          </ScrollArea>

          {/* Order Summary with Purple-900 */}
          <div className="border-t-2 border-purple-100 p-5 space-y-4 bg-gradient-to-b from-white to-purple-50/50">
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-semibold text-purple-900">{subtotal.toLocaleString()} ETB</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Tax (15%):</span>
                <span className="font-semibold text-purple-900">{tax.toLocaleString()} ETB</span>
              </div>
              {orderType === 'delivery' && deliveryFee && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Delivery Fee:</span>
                  <span className="font-semibold text-purple-900">{deliveryFee.fee.toLocaleString()} ETB</span>
                </div>
              )}
              {/* REMOVED PROMOTION DISPLAY */}
              <Separator className="my-3 bg-gradient-to-r from-transparent via-purple-200 to-transparent" />
              <div className="flex justify-between font-bold text-xl">
                <span className="text-gray-800">Total:</span>
                <span className="bg-gradient-to-r from-purple-900 to-purple-700 bg-clip-text text-transparent">
                  {total.toLocaleString()} ETB
                </span>
              </div>
            </div>

            <div className="text-xs text-center">
              <Badge variant="outline" className="bg-purple-50 text-purple-900 border-purple-200 rounded-full px-3 py-1">
                Order #: <span className="font-mono font-bold">{orderNumber}</span>
              </Badge>
            </div>
            
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button 
                onClick={handlePlaceOrder} 
                className="w-full h-14 text-base font-bold bg-gradient-to-r from-purple-800 to-purple-900 hover:from-purple-900 hover:to-purple-950 text-white border-0 rounded-xl shadow-lg hover:shadow-xl transition-all"
                disabled={
                  cart.length === 0 || 
                  !orderType || 
                  isPlacingOrder ||
                  (orderType === 'table' && (!tableNumber || !selectedWaiter)) ||
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
        // Empty Cart State with Purple-900
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
            {!isUserLoggedIn 
              ? 'Please login to add items to your cart and place orders.'
              : 'Add some delicious items from the menu to get started.'
            }
          </p>
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button 
              variant="outline" 
              onClick={onClose} 
              size="lg"
              className="rounded-full px-8 py-6 text-lg border-2 border-purple-200 hover:border-purple-900 hover:bg-purple-50"
            >
              Browse Menu
            </Button>
          </motion.div>
        </motion.div>
      )}
    </div>
  )
})

CartPanel.displayName = 'CartPanel'