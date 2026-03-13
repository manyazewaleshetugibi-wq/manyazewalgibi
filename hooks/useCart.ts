import { useState, useCallback, useMemo } from 'react'
import { CartItem, Item } from '@/types'
import { toast } from 'react-hot-toast'

export function useCart() {
  const [cart, setCart] = useState<CartItem[]>([])

  const addToCart = useCallback((item: Item) => {
    setCart(prev => {
      const existing = prev.find(i => i._id === item._id)
      if (existing) {
        return prev.map(i => 
          i._id === item._id ? { ...i, quantity: i.quantity + 1 } : i
        )
      }
      return [...prev, { ...item, quantity: 1 }]
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

  const subtotal = useMemo(() => 
    cart.reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0), 
    [cart]
  )

  const tax = useMemo(() => subtotal * 0.15, [subtotal])

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
    subtotal,
    tax,
    totalItems,
    isEmpty: cart.length === 0
  }
}