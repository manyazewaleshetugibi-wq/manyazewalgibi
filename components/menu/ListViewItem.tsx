// components/menu/ListViewItem.tsx
'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { toast } from 'react-hot-toast'
import { 
  Eye, Clock, ShoppingCart, Sparkles, Flame, Beef, Wheat, Milk,
  CircleCheck, CircleX, Star 
} from 'lucide-react'
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Item } from '@/types'
import { getImageSrc } from '@/lib/menu-utils'
import { getCategoryIcon } from './MenuIcons'

interface ListViewItemProps {
  item: Item
  categoryName: string
  onAddToCart: (item: Item, specialInstructions?: string) => void
  onViewDetails: (item: Item) => void
  isUserLoggedIn: boolean
  onLoginRequired: (message: string) => void
  index?: number
}

export function ListViewItem({
  item,
  categoryName,
  onAddToCart,
  onViewDetails,
  isUserLoggedIn,
  onLoginRequired,
  index = 0
}: ListViewItemProps) {
  const [isHovered, setIsHovered] = useState(false)
  
  const priceWithTax = Number(item.price)
  const nutritionalInfo = item.nutritionalInfo || {
    calories: 0,
    protein: 0,
    carbohydrates: 0,
    fat: 0
  }

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!isUserLoggedIn) {
      onLoginRequired('Please login to add items to your cart')
      return
    }
    if (item.isActive === false) {
      toast.error(`Sorry, ${item.name} is currently unavailable`)
      return
    }
    onAddToCart(item)
    toast.success(`Added ${item.name} to cart`, {
      icon: '🛒',
      style: {
        borderRadius: '10px',
        background: '#4a1d6d',
        color: '#fff',
      },
    })
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      whileHover={{ scale: 1.01, x: 4 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
    >
      <Card className={`relative overflow-hidden border-0 bg-white/90 backdrop-blur-sm shadow-md hover:shadow-xl transition-all duration-500 rounded-2xl ${
        isHovered ? 'border-l-4 border-l-purple-900' : ''
      }`}>
        <div className="flex flex-col md:flex-row">
          {/* Image Section */}
          <div className="relative md:w-48 h-48 md:h-auto overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-900/10 to-transparent z-10 mix-blend-overlay" />
            <img
              src={getImageSrc(item.imageUrl)}
              alt={item.name}
              className="object-cover w-full h-full transition-transform duration-700"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/placeholder.svg'
              }}
            />

            {/* Status Badges */}
            <div className="absolute top-3 left-3 z-20 flex flex-col gap-1.5">
              {item.isFeatured && (
                <Badge className="bg-gradient-to-r from-amber-400 to-orange-500 text-white border-0 shadow-lg">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Featured
                </Badge>
              )}
              {item.isActive === false && (
                <Badge variant="destructive" className="shadow-lg">
                  <CircleX className="h-3 w-3 mr-1" />
                  Unavailable
                </Badge>
              )}
            </div>
          </div>

          {/* Content Section */}
          <div className="flex-1 p-4 md:p-6">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div className="flex-1">
                {/* Header */}
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-xl md:text-2xl font-bold text-gray-800 group-hover:text-purple-900 transition-colors">
                    {item.name}
                  </h3>
                  {item.isActive && (
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 rounded-full text-[10px]">
                      <CircleCheck className="h-3 w-3 mr-1" />
                      Available
                    </Badge>
                  )}
                </div>

                {/* Description */}
                <p className="text-gray-600 mb-3 line-clamp-2 text-sm md:text-base">
                  {item.description || 'No description available'}
                </p>

                {/* Tags and Meta */}
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <Badge variant="secondary" className="bg-purple-50 text-purple-900 border-purple-200 rounded-full px-3 py-1.5">
                    {getCategoryIcon(categoryName, "h-3.5 w-3.5 mr-1")}
                    {categoryName}
                  </Badge>
                  
                  <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200 rounded-full px-3 py-1.5 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {Number(item.preparationTime) || 0} min
                  </Badge>
                  
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 rounded-full px-3 py-1.5 flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                    4.5 (24 reviews)
                  </Badge>
                </div>

                {/* Nutritional Info */}
                <div className="flex flex-wrap gap-2">
                  <div className="flex items-center gap-1 text-xs bg-gray-50 text-gray-600 px-2 py-1 rounded-full">
                    <Flame className="h-3 w-3 text-orange-500" />
                    {nutritionalInfo.calories || 0} cal
                  </div>
                  <div className="flex items-center gap-1 text-xs bg-gray-50 text-gray-600 px-2 py-1 rounded-full">
                    <Beef className="h-3 w-3 text-red-500" />
                    {nutritionalInfo.protein || 0}g protein
                  </div>
                  <div className="flex items-center gap-1 text-xs bg-gray-50 text-gray-600 px-2 py-1 rounded-full">
                    <Wheat className="h-3 w-3 text-amber-600" />
                    {nutritionalInfo.carbohydrates || 0}g carbs
                  </div>
                  <div className="flex items-center gap-1 text-xs bg-gray-50 text-gray-600 px-2 py-1 rounded-full">
                    <Milk className="h-3 w-3 text-blue-500" />
                    {nutritionalInfo.fat || 0}g fat
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-row md:flex-col items-center md:items-end gap-3 md:gap-3 mt-2 md:mt-0">
                <div className="text-right">
                  <div className="text-xl md:text-3xl font-bold text-purple-900">
                    {priceWithTax.toLocaleString()} <span className="text-sm font-normal text-gray-500">ETB</span>
                  </div>
                  <div className="text-[10px] text-gray-500 mt-0.5">incl. VAT</div>
                </div>

                <div className="flex gap-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="icon"
                          variant="outline"
                          className="rounded-full border-gray-200 hover:border-purple-300 hover:bg-purple-50 w-9 h-9"
                          onClick={() => onViewDetails(item)}
                        >
                          <Eye className="h-4 w-4 text-purple-900" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>View details</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="icon"
                          onClick={handleAddToCart}
                          disabled={item.isActive === false}
                          className={`rounded-full w-9 h-9 ${
                            item.isActive === false
                              ? 'bg-gray-200 text-gray-400'
                              : 'bg-gradient-to-r from-purple-800 to-purple-900 text-white hover:from-purple-900 hover:to-purple-950 shadow-md hover:shadow-lg'
                          }`}
                        >
                          <ShoppingCart className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Add to cart</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Hover Effect Overlay */}
        <div className={`absolute inset-0 bg-gradient-to-r from-purple-900/5 to-transparent pointer-events-none transition-opacity duration-500 ${
          isHovered ? 'opacity-100' : 'opacity-0'
        }`} />
      </Card>
    </motion.div>
  )
}