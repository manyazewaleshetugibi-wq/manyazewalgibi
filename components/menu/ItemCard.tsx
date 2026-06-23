// components/menu/ItemCard.tsx
'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { toast } from 'react-hot-toast'
import { Eye, Clock, ShoppingCart, Sparkles, Flame, Beef, Wheat, Milk } from 'lucide-react'
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Item } from '@/types'
import { getImageSrc } from '@/lib/menu-utils'
import { getCategoryIcon } from './MenuIcons'

interface ItemCardProps {
  item: Item
  categoryName: string
  onAddToCart: (item: Item) => void
  onViewDetails: (item: Item) => void
  isUserLoggedIn: boolean
  onLoginRequired?: (message: string) => void
  index?: number
}

export function ItemCard({
  item,
  categoryName,
  onAddToCart,
  onViewDetails,
  isUserLoggedIn,
  onLoginRequired,
  index = 0
}: ItemCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [isImageLoaded, setIsImageLoaded] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  
  const priceWithTax = Number(item.price)

  // Nutritional data – replace with real data from your backend
  const nutritionalInfo = {
    calories: item.nutritionalInfo?.calories || Math.floor(Math.random() * (800 - 200 + 1) + 200),
    protein: item.nutritionalInfo?.protein || Math.floor(Math.random() * (40 - 5 + 1) + 5),
    carbs: item.nutritionalInfo?.carbs || Math.floor(Math.random() * (80 - 10 + 1) + 10),
    fat: item.nutritionalInfo?.fat || Math.floor(Math.random() * (30 - 3 + 1) + 3),
  }

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation()
    
    if (item.isActive === false) {
      toast.error(`Sorry, ${item.name} is currently unavailable`)
      return
    }
    
    onAddToCart(item)
    
    if (!isUserLoggedIn) {
      toast.success(`Added ${item.name} to cart as guest`, {
        icon: '🛒',
        duration: 2500,
        style: {
          borderRadius: '12px',
          background: '#1a1a1a',
          color: '#fff',
          fontSize: '12px',
        },
      })
    } else {
      toast.success(`Added ${item.name} to cart`, {
        icon: '🛒',
        duration: 2000,
        style: {
          borderRadius: '12px',
          background: '#1a1a1a',
          color: '#fff',
          fontSize: '12px',
        },
      })
    }
  }

  const DesktopNutritionalList = () => (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Flame className="h-2.5 w-2.5 text-orange-500" />
          <span className="text-[9px] font-medium text-gray-600">Calories</span>
        </div>
        <span className="text-[10px] font-semibold text-gray-800">
          {nutritionalInfo.calories} <span className="text-[7px] font-normal text-gray-400">kcal</span>
        </span>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Beef className="h-2.5 w-2.5 text-red-500" />
          <span className="text-[9px] font-medium text-gray-600">Protein</span>
        </div>
        <span className="text-[10px] font-semibold text-gray-800">
          {nutritionalInfo.protein} <span className="text-[7px] font-normal text-gray-400">g</span>
        </span>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Wheat className="h-2.5 w-2.5 text-amber-600" />
          <span className="text-[9px] font-medium text-gray-600">Carbs</span>
        </div>
        <span className="text-[10px] font-semibold text-gray-800">
          {nutritionalInfo.carbs} <span className="text-[7px] font-normal text-gray-400">g</span>
        </span>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Milk className="h-2.5 w-2.5 text-blue-500" />
          <span className="text-[9px] font-medium text-gray-600">Fat</span>
        </div>
        <span className="text-[10px] font-semibold text-gray-800">
          {nutritionalInfo.fat} <span className="text-[7px] font-normal text-gray-400">g</span>
        </span>
      </div>
    </div>
  )

  const MobileNutritionalList = () => (
    <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
      <div className="flex items-center justify-between bg-gray-50/80 rounded px-1.5 py-0.5">
        <div className="flex items-center gap-1">
          <Flame className="h-2.5 w-2.5 text-orange-500" />
          <span className="text-[8px] font-medium text-gray-600">Cal</span>
        </div>
        <span className="text-[9px] font-bold text-gray-800">
          {nutritionalInfo.calories}
        </span>
      </div>
      <div className="flex items-center justify-between bg-gray-50/80 rounded px-1.5 py-0.5">
        <div className="flex items-center gap-1">
          <Beef className="h-2.5 w-2.5 text-red-500" />
          <span className="text-[8px] font-medium text-gray-600">Protein</span>
        </div>
        <span className="text-[9px] font-bold text-gray-800">
          {nutritionalInfo.protein}g
        </span>
      </div>
      <div className="flex items-center justify-between bg-gray-50/80 rounded px-1.5 py-0.5">
        <div className="flex items-center gap-1">
          <Wheat className="h-2.5 w-2.5 text-amber-600" />
          <span className="text-[8px] font-medium text-gray-600">Carbs</span>
        </div>
        <span className="text-[9px] font-bold text-gray-800">
          {nutritionalInfo.carbs}g
        </span>
      </div>
      <div className="flex items-center justify-between bg-gray-50/80 rounded px-1.5 py-0.5">
        <div className="flex items-center gap-1">
          <Milk className="h-2.5 w-2.5 text-blue-500" />
          <span className="text-[8px] font-medium text-gray-600">Fat</span>
        </div>
        <span className="text-[9px] font-bold text-gray-800">
          {nutritionalInfo.fat}g
        </span>
      </div>
    </div>
  )

  const renderAddToCartButton = (isMobileVersion: boolean = false) => {
    const buttonContent = isMobileVersion ? (
      <>
        <ShoppingCart className="h-3 w-3" />
        <span>Add</span>
      </>
    ) : (
      <>
        <ShoppingCart className="h-2.5 w-2.5 mr-0.5" />
        Add
      </>
    )

    if (isMobileVersion) {
      return (
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleAddToCart}
          disabled={item.isActive === false}
          className={`flex items-center justify-center gap-1 rounded-full px-2 py-1 text-[9px] font-medium transition-all active:scale-95 ${
            item.isActive === false
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-purple-700 to-purple-800 text-white shadow-sm'
          }`}
        >
          {buttonContent}
        </motion.button>
      )
    }

    return (
      <Button
        onClick={handleAddToCart}
        disabled={item.isActive === false}
        className={`rounded-full px-2 py-0 text-[9px] font-medium transition-all h-6 ${
          item.isActive === false
            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
            : 'bg-gradient-to-r from-purple-700 to-purple-800 text-white shadow-sm hover:shadow-md hover:scale-105'
        }`}
      >
        {buttonContent}
      </Button>
    )
  }

  // MOBILE VERSION
  if (isMobile) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: index * 0.05 }}
        className="touch-manipulation"
      >
        <div className="overflow-hidden bg-white shadow-sm rounded-xl active:scale-[0.98] transition-transform duration-150">
          <div className="relative h-20 overflow-hidden bg-white">
            {!isImageLoaded && (
              <div className="absolute inset-0 bg-gradient-to-r from-gray-100 via-purple-50 to-gray-100 animate-pulse" />
            )}
            <img
              src={getImageSrc(item.imageUrl)}
              alt={item.name}
              className={`object-contain w-full h-full transition-opacity duration-300 scale-105 ${
                isImageLoaded ? 'opacity-100' : 'opacity-0'
              }`}
              onLoad={() => setIsImageLoaded(true)}
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/placeholder.svg'
                setIsImageLoaded(true)
              }}
            />
            {item.isFeatured && (
              <div className="absolute top-1 left-1 z-10">
                <div className="bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[6px] font-semibold px-1.5 py-0.5 rounded-full shadow-lg flex items-center gap-0.5 backdrop-blur-sm">
                  <Sparkles className="h-2 w-2" />
                  <span>Featured</span>
                </div>
              </div>
            )}
            {item.isActive === false && (
              <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-20">
                <span className="bg-white/90 text-gray-800 text-[8px] font-semibold px-2 py-1 rounded-full">
                  Unavailable
                </span>
              </div>
            )}
          </div>

          <div className="p-2">
            <div className="flex items-start justify-between gap-1">
              <div className="flex-1 min-w-0">
                <h3 className="text-[11px] font-semibold text-gray-800 line-clamp-1 leading-tight">
                  {item.name}
                </h3>
              </div>
              <button
                onClick={() => onViewDetails(item)}
                className="p-1 rounded-full bg-gray-50 active:bg-gray-100 transition-colors"
                aria-label="View details"
              >
                <Eye className="h-3 w-3 text-gray-600" />
              </button>
            </div>

            <div className="mt-1.5">
              <MobileNutritionalList />
            </div>

            <div className="flex items-center justify-between gap-1 pt-1.5 border-t border-gray-100 mt-1.5">
              <div className="flex items-baseline gap-1">
                <span className="text-[11px] font-bold text-purple-900">
                  {priceWithTax.toLocaleString()}
                </span>
                <span className="text-[7px] text-gray-400">ETB</span>
              </div>
              {renderAddToCartButton(true)}
            </div>
          </div>
        </div>
      </motion.div>
    )
  }

  // DESKTOP VERSION
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      whileHover={{ y: -2 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
    >
      <div className="group relative overflow-hidden border border-gray-100 bg-white shadow-sm hover:shadow-md transition-all duration-300 rounded-xl h-[180px]">
        <div className="flex h-full">
          <div className="relative w-[55%] overflow-hidden bg-white">
            {!isImageLoaded && (
              <div className="absolute inset-0 bg-gradient-to-r from-gray-100 via-purple-50 to-gray-100 animate-pulse" />
            )}
            <img
              src={getImageSrc(item.imageUrl)}
              alt={item.name}
              className={`object-contain w-full h-full transition-transform duration-500 ${
                isHovered ? 'scale-110' : 'scale-105'
              } ${isImageLoaded ? 'opacity-100' : 'opacity-0'}`}
              onLoad={() => setIsImageLoaded(true)}
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/placeholder.svg'
                setIsImageLoaded(true)
              }}
            />
            {item.isFeatured && (
              <div className="absolute top-2 left-2 z-10">
                <div className="bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[8px] font-semibold px-1.5 py-0.5 rounded-full shadow-lg flex items-center gap-0.5 backdrop-blur-sm">
                  <Sparkles className="h-2 w-2" />
                  <span>Featured</span>
                </div>
              </div>
            )}
            {item.isActive === false && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-20">
                <span className="bg-white text-gray-800 text-[10px] font-semibold px-2 py-1 rounded-full shadow-lg">
                  Unavailable
                </span>
              </div>
            )}
          </div>

          <div className="w-[45%] flex flex-col p-2">
            <div className="flex items-start justify-between gap-1">
              <div className="flex-1 min-w-0">
                <h3 className="text-xs font-semibold text-gray-800 mb-0.5 line-clamp-1 group-hover:text-purple-900 transition-colors">
                  {item.name}
                </h3>
                <div className="flex items-center gap-1">
                  <Badge variant="secondary" className="bg-purple-50 text-purple-900 border-0 rounded-full px-1.5 py-0 text-[8px] font-medium">
                    {getCategoryIcon(categoryName, "h-2 w-2 mr-0.5")}
                    {categoryName}
                  </Badge>
                  <div className="flex items-center gap-0.5 text-[8px] text-gray-500">
                    <Clock className="h-2 w-2" />
                    <span>{Number(item.preparationTime) || 0} min</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="icon"
                        variant="secondary"
                        className="rounded-full bg-white hover:bg-white shadow-sm hover:shadow-md hover:scale-105 transition-all w-5 h-5"
                        onClick={(e) => {
                          e.stopPropagation()
                          onViewDetails(item)
                        }}
                      >
                        <Eye className="h-2.5 w-2.5 text-purple-900" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="left">
                      <p className="text-xs">Quick view</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>

            <div className="mt-1 mb-0.5">
              <DesktopNutritionalList />
            </div>

            <div className="flex items-center justify-between mt-0.5">
              <div className="flex items-baseline gap-0.5">
                <span className="text-[11px] font-bold text-purple-900">
                  {priceWithTax.toLocaleString()}
                </span>
                <span className="text-[7px] text-gray-500">ETB</span>
              </div>
              {renderAddToCartButton(false)}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}