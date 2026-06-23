// hooks/useCart.ts

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'react-hot-toast'
import { CartItem } from '@/types'

const CART_STORAGE_KEY = 'cart_items'

export function useCart() {
  const [cart, setCart] = useState<CartItem[]>([])
  const [subtotal, setSubtotal] = useState(0)
  const [totalItems, setTotalItems] = useState(0)
  const [isLoaded, setIsLoaded] = useState(false)

  // Load cart from localStorage on mount
  useEffect(() => {
    const loadCartFromStorage = () => {
      try {
        const storedCart = localStorage.getItem(CART_STORAGE_KEY)
        console.log('🔍 Loading cart from localStorage:', storedCart)
        
        if (storedCart) {
          const parsedCart = JSON.parse(storedCart)
          if (Array.isArray(parsedCart) && parsedCart.length > 0) {
            // Ensure all items have quantity and valid structure
            const validatedCart = parsedCart.map((item: any) => ({
              _id: item._id || '',
              name: item.name || 'Unnamed Item',
              description: item.description || '',
              categoryId: item.categoryId || '',
              price: Number(item.price) || 0,
              imageUrl: item.imageUrl || '',
              quantity: Number(item.quantity) || 1,
              specialInstructions: item.specialInstructions || '',
              preparationTime: Number(item.preparationTime) || 0,
              nutritionalInfo: item.nutritionalInfo || { calories: 0, protein: 0, carbohydrates: 0, fat: 0 },
              isActive: item.isActive !== undefined ? item.isActive : true,
              isFeatured: item.isFeatured || false,
              tags: item.tags || []
            }))
            setCart(validatedCart)
            console.log('✅ Cart loaded successfully:', validatedCart.length, 'items')
            console.log('📦 Cart items:', validatedCart.map(i => `${i.name} x${i.quantity}`))
          } else {
            console.log('📭 Cart is empty in localStorage')
            setCart([])
            // Clear empty cart from localStorage
            localStorage.removeItem(CART_STORAGE_KEY)
          }
        } else {
          console.log('📭 No cart found in localStorage')
          setCart([])
        }
      } catch (error) {
        console.error('❌ Error loading cart from localStorage:', error)
        setCart([])
        // If there's an error, clear the corrupted data
        localStorage.removeItem(CART_STORAGE_KEY)
      } finally {
        setIsLoaded(true)
      }
    }

    loadCartFromStorage()
  }, [])

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    if (!isLoaded) {
      console.log('⏳ Skipping save - cart not loaded yet')
      return
    }
    
    try {
      if (cart.length > 0) {
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart))
        console.log('💾 Cart saved to localStorage:', cart.length, 'items')
        console.log('📦 Saved items:', cart.map(i => `${i.name} x${i.quantity}`))
        
        // Debug: Verify save worked
        const verify = localStorage.getItem(CART_STORAGE_KEY)
        if (verify) {
          const parsed = JSON.parse(verify)
          console.log('✅ Cart save verified:', parsed.length, 'items')
        }
      } else {
        localStorage.removeItem(CART_STORAGE_KEY)
        console.log('🗑️ Cart cleared from localStorage')
      }
      
      // Update totals
      const newSubtotal = cart.reduce((sum, item) => {
        const price = Number(item.price) || 0
        const quantity = Number(item.quantity) || 0
        return sum + (price * quantity)
      }, 0)
      setSubtotal(newSubtotal)
      
      const newTotalItems = cart.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)
      setTotalItems(newTotalItems)
      
      console.log('💰 Subtotal:', newSubtotal)
      console.log('🔢 Total items:', newTotalItems)
    } catch (error) {
      console.error('❌ Error saving cart to localStorage:', error)
    }
  }, [cart, isLoaded])

  const addToCart = useCallback((item: CartItem | any) => {
    // Ensure we have all required fields
    if (!item || !item._id) {
      console.error('❌ Invalid item:', item)
      toast.error('Invalid item')
      return
    }

    setCart(prevCart => {
      const existingItemIndex = prevCart.findIndex(cartItem => cartItem._id === item._id)
      
      if (existingItemIndex > -1) {
        // Update existing item
        const updatedCart = [...prevCart]
        const currentQuantity = Number(updatedCart[existingItemIndex].quantity) || 0
        const addQuantity = Number(item.quantity) || 1
        
        updatedCart[existingItemIndex] = {
          ...updatedCart[existingItemIndex],
          quantity: currentQuantity + addQuantity,
          specialInstructions: item.specialInstructions || updatedCart[existingItemIndex].specialInstructions
        }
        toast.success(`Updated ${item.name} in cart!`)
        console.log(`🔄 Updated ${item.name} quantity to ${currentQuantity + addQuantity}`)
        return updatedCart
      } else {
        // Add new item - ensure it's a valid CartItem
        const newItem: CartItem = {
          _id: item._id,
          name: item.name || 'Unnamed Item',
          description: item.description || '',
          categoryId: item.categoryId || '',
          price: Number(item.price) || 0,
          imageUrl: item.imageUrl || '',
          quantity: Number(item.quantity) || 1,
          specialInstructions: item.specialInstructions || '',
          preparationTime: item.preparationTime || 0,
          nutritionalInfo: item.nutritionalInfo || { calories: 0, protein: 0, carbohydrates: 0, fat: 0 },
          isActive: item.isActive !== undefined ? item.isActive : true,
          isFeatured: item.isFeatured || false,
          tags: item.tags || []
        }
        
        toast.success(`Added ${newItem.name} to cart!`)
        console.log(`➕ Added ${newItem.name} to cart`)
        return [...prevCart, newItem]
      }
    })
  }, [])

  const removeFromCart = useCallback((itemId: string) => {
    if (!itemId) {
      console.error('❌ Invalid itemId')
      return
    }
    
    setCart(prevCart => {
      const item = prevCart.find(cartItem => cartItem._id === itemId)
      const newCart = prevCart.filter(cartItem => cartItem._id !== itemId)
      if (item) {
        toast.success(`Removed ${item.name} from cart`)
        console.log(`🗑️ Removed ${item.name} from cart`)
      }
      return newCart
    })
  }, [])

  const updateQuantity = useCallback((itemId: string, newQuantity: number) => {
    if (!itemId) {
      console.error('❌ Invalid itemId')
      return
    }
    
    if (newQuantity <= 0) {
      removeFromCart(itemId)
      return
    }

    setCart(prevCart => {
      return prevCart.map(cartItem => 
        cartItem._id === itemId 
          ? { ...cartItem, quantity: newQuantity }
          : cartItem
      )
    })
    console.log(`📦 Updated quantity for item ${itemId} to ${newQuantity}`)
  }, [removeFromCart])

  const clearCart = useCallback(() => {
    setCart([])
    try {
      localStorage.removeItem(CART_STORAGE_KEY)
      console.log('🗑️ Cart cleared from state and localStorage')
    } catch (error) {
      console.error('❌ Error clearing cart from localStorage:', error)
    }
    toast.success('Cart cleared')
  }, [])

  // Debug function to check localStorage
  const checkLocalStorage = useCallback(() => {
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY)
      console.log('🔍 Current localStorage:', stored)
      return stored ? JSON.parse(stored) : null
    } catch (error) {
      console.error('❌ Error checking localStorage:', error)
      return null
    }
  }, [])

  return {
    cart,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    subtotal,
    totalItems,
    isLoaded,
    checkLocalStorage // Expose for debugging
  }
}