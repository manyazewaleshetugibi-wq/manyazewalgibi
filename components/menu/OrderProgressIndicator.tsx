// components/menu/OrderProgressIndicator.tsx
'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Clock, ChefHat } from 'lucide-react'
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"

interface OrderProgressIndicatorProps {
  progress: number
  orderType: 'table' | 'delivery' | ''
}

export function OrderProgressIndicator({ progress, orderType }: OrderProgressIndicatorProps) {
  if (progress <= 0 || progress >= 100) return null

  return (
    <AnimatePresence>
      {progress > 0 && progress < 100 && (
        <motion.div
          className="fixed bottom-6 right-6 z-50"
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.9 }}
        >
          <div className="bg-white/95 backdrop-blur-xl p-5 rounded-2xl shadow-2xl border border-purple-200 w-72">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold flex items-center gap-2 text-gray-800">
                <div className="p-1.5 bg-gradient-to-r from-purple-800 to-purple-900 rounded-lg">
                  <ChefHat className="h-4 w-4 text-white" />
                </div>
                {orderType === 'delivery' ? 'Preparing Delivery' : 'Preparing Order'}
              </h3>
              <Badge className="bg-gradient-to-r from-purple-800 to-purple-900 text-white border-0">
                {progress}%
              </Badge>
            </div>
            <Progress value={progress} className="h-2.5 bg-purple-100 [&>div]:bg-gradient-to-r [&>div]:from-purple-800 [&>div]:to-purple-900" />
            <p className="text-sm text-gray-500 mt-3 flex items-center gap-2">
              <Clock className="h-4 w-4 animate-pulse text-purple-900" />
              {orderType === 'delivery'
                ? 'Your order is being prepared for delivery...'
                : 'Your order is being prepared...'}
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}