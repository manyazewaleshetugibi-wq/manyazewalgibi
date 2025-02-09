'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RainbowButton } from "@/components/magicui/rainbow-button"
import { useToast } from "@/hooks/use-toast"
import { CreditCard, Truck, ShoppingBag } from 'lucide-react'

interface CheckoutModalProps {
  isOpen: boolean
  onClose: () => void
  cartItems: CartItem[]
  total: number
}

interface CartItem {
  _id: string
  title: string
  price: number
  quantity: number
}

export function CheckoutModal({ isOpen, onClose, cartItems, total }: CheckoutModalProps) {
  const [promoCode, setPromoCode] = useState('')
  const [notes, setNotes] = useState('')
  const { toast } = useToast()

  const handleCheckout = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8000/api/delivery', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderItems: cartItems.map(item => ({
            foodId: item._id,
            quantity: item.quantity
          })),
          promoCode,
          discountAmount: 0, // You can implement discount logic here
          notes
        }),
      })
      
      if (response.ok) {
        onClose()
        toast({
          title: "Order Placed Successfully",
          description: "Thank you for your order!",
        })
      } else {
        throw new Error('Failed to place order')
      }
    } catch (error) {
      console.error('Error placing order:', error)
      toast({
        title: "Error",
        description: "Failed to place order. Please try again.",
        variant: "destructive",
      })
    }
  }

  const modalVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { 
      opacity: 1, 
      scale: 1, 
      transition: { 
        duration: 0.5, 
        type: 'spring', 
        stiffness: 300, 
        damping: 30 
      } 
    },
    exit: { 
      opacity: 0, 
      scale: 0.8, 
      transition: { 
        duration: 0.3 
      } 
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <motion.div
          variants={modalVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          <DialogHeader>
            <DialogTitle className="text-3xl font-bold text-center">
              Checkout
            </DialogTitle>
          </DialogHeader>
          <div className="mt-6 space-y-6">
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center">
                <ShoppingBag className="w-5 h-5 mr-2" />
                Order Summary
              </h3>
              {cartItems.map(item => (
                <div key={item._id} className="flex justify-between">
                  <span>{item.title} x {item.quantity}</span>
                  <span>ETB {(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
              <div className="flex justify-between font-bold">
                <span>Total</span>
                <span>ETB {total.toFixed(2)}</span>
              </div>
            </div>
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center">
                <CreditCard className="w-5 h-5 mr-2" />
                Payment Details
              </h3>
              <div className="space-y-2">
                <Label htmlFor="promoCode">Promo Code</Label>
                <Input
                  id="promoCode"
                  placeholder="Enter promo code"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center">
                <Truck className="w-5 h-5 mr-2" />
                Delivery Information
              </h3>
              <div className="space-y-2">
                <Label htmlFor="notes">Delivery Notes</Label>
                <Input
                  id="notes"
                  placeholder="Any special instructions?"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>
            <RainbowButton onClick={handleCheckout} className="w-full">
              Place Order
            </RainbowButton>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  )
}

