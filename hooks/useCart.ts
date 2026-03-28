import { useState, useCallback, useMemo } from 'react'
import { CartItem, Item } from '@/types'
import { toast } from 'react-hot-toast'

// Helper function to calculate original price and tax from price that includes VAT
const calculatePriceBreakdown = (priceWithTax: number, taxRate: number = 0.15) => {
  // Original price = priceWithTax / (1 + taxRate)
  const originalPrice = priceWithTax / (1 + taxRate)
  // Tax amount = priceWithTax - originalPrice
  const taxAmount = priceWithTax - originalPrice
  return { originalPrice, taxAmount }
}

export function useCart() {
  const [cart, setCart] = useState<CartItem[]>([])

  const addToCart = useCallback((item: Item) => {
    setCart(prev => {
      const existing = prev.find(i => i._id === item._id)
      // Calculate original price and tax amount from the price (which includes tax)
      const { originalPrice, taxAmount } = calculatePriceBreakdown(Number(item.price))
      
      if (existing) {
        return prev.map(i => 
          i._id === item._id ? { 
            ...i, 
            quantity: i.quantity + 1,
            originalPrice: originalPrice,
            taxAmount: taxAmount
          } : i
        )
      }
      
      return [...prev, { 
        ...item, 
        quantity: 1,
        originalPrice: originalPrice,  // Store original price without tax
        taxAmount: taxAmount            // Store tax amount for this item
      }]
    })
    
    toast.success(`Added ${item.name} to cart`, {
      icon: '🛒',
      duration: 2000,
    })
  }, [])

  const removeFromCart = useCallback((itemId: string) => {
    setCart(prev => prev.filter(item => item._id !== itemId))
    toast.success('Item removed from cart')
  }, [])

  const updateQuantity = useCallback((itemId: string, newQuantity: number) => {
    if (newQuantity < 1) {
      removeFromCart(itemId)
      return
    }
    setCart(prev => prev.map(item => 
      item._id === itemId ? { ...item, quantity: newQuantity } : item
    ))
  }, [removeFromCart])

  const clearCart = useCallback(() => {
    setCart([])
  }, [])

  const updateItemInstructions = useCallback((itemId: string, instructions: string) => {
    setCart(prev => prev.map(item => 
      item._id === itemId ? { ...item, specialInstructions: instructions } : item
    ))
  }, [])

  // Calculate subtotal (original prices without tax)
  // This is the SUM of all item prices BEFORE tax
  const subtotal = useMemo(() => 
    cart.reduce((sum, item) => {
      // Use stored originalPrice or calculate it
      const originalPrice = item.originalPrice || (Number(item.price) / 1.15)
      return sum + originalPrice * item.quantity
    }, 0), 
    [cart]
  )

  // Calculate total tax (15% of subtotal)
  // This is the tax amount that should be collected
  const tax = useMemo(() => subtotal * 0.15, [subtotal])

  // Calculate total payment (original prices + tax + delivery)
  // This is what customer pays
  const totalPayment = useMemo(() => subtotal + tax, [subtotal, tax])

  // Calculate total items count
  const totalItems = useMemo(() => 
    cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart]
  )

  return {
    cart,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    updateItemInstructions,
    subtotal,        // Original price total (excl. VAT) - e.g., 782.61 for 9 items of 100 ETB
    tax,             // Total VAT amount (15% of subtotal) - e.g., 117.39
    totalPayment,    // Total with VAT - e.g., 900.00
    totalItems,
    isEmpty: cart.length === 0
  }
}