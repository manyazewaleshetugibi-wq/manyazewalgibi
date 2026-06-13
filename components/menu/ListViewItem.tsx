// components/menu/ListViewItem.tsx
'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { toast } from 'react-hot-toast'
import { Eye, Clock, Star, ShoppingCart, Sparkles } from 'lucide-react'
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
  onAddToCart: (item: Item) => void
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
      whileHover={{ scale: 1.02, x: 4 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
    >
      <Card className={`relative overflow-hidden border-0 bg-white/90 backdrop-blur-sm shadow-md hover:shadow-xl transition-all duration-500 rounded-2xl ${
        isHovered ? 'border-l-4 border-l-purple-900' : ''
      }`}>
        <div className="flex flex-col md:flex-row">
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

            {item.isFeatured && (
              <div className="absolute top-3 left-3 z-20">
                <Badge className="bg-gradient-to-r from-purple-800 to-purple-900 text-white border-0 shadow-lg">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Featured
                </Badge>
              </div>
            )}
          </div>

          <div className="flex-1 p-6">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-2xl font-bold text-gray-800 group-hover:text-purple-900 transition-colors">
                    {item.name}
                  </h3>
                  {item.isActive === false && (
                    <Badge variant="destructive" className="rounded-full">
                      Unavailable
                    </Badge>
                  )}
                </div>

                <p className="text-gray-600 mb-4 line-clamp-2">
                  {item.description || 'No description available'}
                </p>

                <div className="flex flex-wrap items-center gap-3 mb-4">
                  <Badge variant="secondary" className="bg-purple-50 text-purple-900 border-purple-200 rounded-full px-3 py-1.5">
                    {getCategoryIcon(categoryName, "h-3.5 w-3.5 mr-1")}
                    {categoryName}
                  </Badge>
                  <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200 rounded-full px-3 py-1.5 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {Number(item.preparationTime) || 0} min
                  </Badge>
                  <Badge variant="outline" className="bg-purple-50 text-purple-900 border-purple-200 rounded-full px-3 py-1.5 flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 fill-purple-900 text-purple-900" />
                    4.5 (24 reviews)
                  </Badge>
                </div>

                <div className="flex flex-wrap gap-2">
                  <div className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                    🔥 {item.nutritionalInfo?.calories || 0} cal
                  </div>
                  <div className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                    💪 {item.nutritionalInfo?.protein || 0}g protein
                  </div>
                  <div className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                    🥑 {item.nutritionalInfo?.fat || 0}g fat
                  </div>
                </div>
              </div>

              <div className="flex flex-row md:flex-col items-center md:items-end gap-4 md:gap-3">
                <div className="text-right">
                  <div className="text-3xl font-bold text-purple-900">
                    {priceWithTax.toLocaleString()} <span className="text-sm font-normal text-gray-500">ETB</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">incl. VAT</div>
                </div>

                <div className="flex gap-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="icon"
                          variant="outline"
                          className="rounded-full border-gray-200 hover:border-purple-300 hover:bg-purple-50"
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
                          className={`rounded-full ${
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

        <div className={`absolute inset-0 bg-gradient-to-r from-purple-900/5 to-transparent pointer-events-none transition-opacity duration-500 ${
          isHovered ? 'opacity-100' : 'opacity-0'
        }`} />
      </Card>
    </motion.div>
  )
}