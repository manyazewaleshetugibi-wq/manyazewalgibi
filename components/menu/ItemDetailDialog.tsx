// components/menu/ItemDetailDialog.tsx
'use client'

import { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import { Info, Clock, DollarSign, Tag, Sparkles, ShoppingCart, ChefHat, X, Flame, Beef, Wheat, Milk } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Item } from '@/types'
import { getImageSrc } from '@/lib/menu-utils'
import { getCategoryIcon } from './MenuIcons'

interface ItemDetailDialogProps {
  item: Item
  categoryName: string
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onAddToCart: (item: Item) => void
  isUserLoggedIn: boolean
  onLoginRequired: (message: string) => void
}

export function ItemDetailDialog({
  item,
  categoryName,
  isOpen,
  onOpenChange,
  onAddToCart,
  isUserLoggedIn,
  onLoginRequired
}: ItemDetailDialogProps) {
  const [isMobile, setIsMobile] = useState(false)
  
  const nutritionalInfo = item.nutritionalInfo || {
    calories: 0,
    protein: 0,
    carbohydrates: 0,
    fat: 0
  }
  
  const priceWithTax = Number(item.price)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const handleAddToCartClick = () => {
    if (!isUserLoggedIn) {
      onLoginRequired('Please login to add items to your cart')
      return
    }
    onAddToCart(item)
    onOpenChange(false)
    toast.success(`Added ${item.name} to cart`, {
      icon: '🛒',
      style: {
        borderRadius: '10px',
        background: '#4a1d6d',
        color: '#fff',
      },
    })
  }

  // MOBILE VERSION - Full Screen with Smooth Scroll
  if (isMobile) {
    return (
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-4xl max-h-screen h-screen w-screen p-0 m-0 bg-white border-0 rounded-none overflow-y-auto scroll-smooth">
          <DialogTitle className="sr-only">
            {item.name} - Item Details
          </DialogTitle>
          <DialogDescription className="sr-only">
            Detailed information about {item.name} including description, price, preparation time, and nutritional facts
          </DialogDescription>
          
          <div className="relative min-h-screen bg-gradient-to-b from-purple-50/50 to-white">
            <button
              onClick={() => onOpenChange(false)}
              className="absolute top-4 right-4 z-50 p-2 bg-black/20 backdrop-blur-md rounded-full hover:bg-black/30 transition-all shadow-lg"
            >
              <X className="h-4 w-4 text-white" />
            </button>

            <div className="relative h-[40vh] w-full bg-gradient-to-b from-purple-900 to-purple-700">
              <img
                src={getImageSrc(item.imageUrl)}
                alt={item.name}
                className="object-cover w-full h-full"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/placeholder.svg'
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              
              <div className="absolute bottom-4 left-4 right-4">
                <h1 className="text-lg font-bold text-white mb-1.5 leading-tight">
                  {item.name}
                </h1>
                {item.isFeatured && (
                  <div className="inline-flex bg-gradient-to-r from-amber-400 to-orange-500 rounded-full px-2.5 py-0.5 shadow-lg">
                    <span className="text-white text-[8px] font-semibold flex items-center gap-0.5">
                      <Sparkles className="h-2.5 w-2.5" />
                      Featured
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="px-4 py-4 space-y-3">
              <div className="flex items-center gap-2">
                <Tag className="h-3.5 w-3.5 text-purple-600" />
                <span className="text-xs text-gray-600">Category:</span>
                <span className="text-xs font-medium text-gray-800">{categoryName}</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gradient-to-br from-purple-50 to-white rounded-xl p-3 border border-purple-100/50">
                  <div className="flex items-center gap-1.5 text-purple-700 mb-0.5">
                    <DollarSign className="h-3.5 w-3.5" />
                    <span className="text-[10px] font-medium">Price</span>
                  </div>
                  <p className="text-lg font-bold text-purple-900">
                    {priceWithTax.toFixed(2)} <span className="text-[10px] font-normal text-gray-400">ETB</span>
                  </p>
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-white rounded-xl p-3 border border-blue-100/50">
                  <div className="flex items-center gap-1.5 text-blue-700 mb-0.5">
                    <Clock className="h-3.5 w-3.5" />
                    <span className="text-[10px] font-medium">Prep Time</span>
                  </div>
                  <p className="text-lg font-bold text-blue-600">
                    {Number(item.preparationTime) || 0} <span className="text-[10px] font-normal text-gray-400">min</span>
                  </p>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-gray-700">
                  <ChefHat className="h-4 w-4 text-purple-600" />
                  <h3 className="text-sm font-semibold text-gray-800">Description</h3>
                </div>
                <p className="text-gray-600 leading-relaxed text-sm pl-6">
                  {item.description || 'No description available'}
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-gray-700">
                  <Sparkles className="h-4 w-4 text-emerald-600" />
                  <h3 className="text-sm font-semibold text-gray-800">Nutrition</h3>
                </div>
                <div className="grid grid-cols-2 gap-2 pl-6">
                  <div className="flex items-center justify-between bg-gray-50/80 rounded-lg px-2.5 py-1.5 border border-gray-100">
                    <div className="flex items-center gap-1.5">
                      <Flame className="h-3 w-3 text-orange-500" />
                      <span className="text-[9px] text-gray-600">Cal</span>
                    </div>
                    <span className="text-xs font-semibold text-gray-800">{Number(nutritionalInfo.calories) || 0}</span>
                  </div>
                  <div className="flex items-center justify-between bg-gray-50/80 rounded-lg px-2.5 py-1.5 border border-gray-100">
                    <div className="flex items-center gap-1.5">
                      <Beef className="h-3 w-3 text-red-500" />
                      <span className="text-[9px] text-gray-600">Protein</span>
                    </div>
                    <span className="text-xs font-semibold text-gray-800">{Number(nutritionalInfo.protein) || 0}g</span>
                  </div>
                  <div className="flex items-center justify-between bg-gray-50/80 rounded-lg px-2.5 py-1.5 border border-gray-100">
                    <div className="flex items-center gap-1.5">
                      <Wheat className="h-3 w-3 text-amber-600" />
                      <span className="text-[9px] text-gray-600">Carbs</span>
                    </div>
                    <span className="text-xs font-semibold text-gray-800">{Number(nutritionalInfo.carbohydrates) || 0}g</span>
                  </div>
                  <div className="flex items-center justify-between bg-gray-50/80 rounded-lg px-2.5 py-1.5 border border-gray-100">
                    <div className="flex items-center gap-1.5">
                      <Milk className="h-3 w-3 text-blue-500" />
                      <span className="text-[9px] text-gray-600">Fat</span>
                    </div>
                    <span className="text-xs font-semibold text-gray-800">{Number(nutritionalInfo.fat) || 0}g</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-3">
                <Button
                  onClick={handleAddToCartClick}
                  className="flex-1 rounded-lg py-2.5 px-3 bg-gradient-to-r from-purple-700 to-purple-900 hover:from-purple-800 hover:to-purple-950 text-white border-0 shadow-md hover:shadow-lg transition-all text-xs font-semibold"
                >
                  <ShoppingCart className="mr-1.5 h-3.5 w-3.5" />
                  Add
                </Button>
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="flex-1 rounded-lg py-2.5 px-3 border-2 border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition-all text-xs font-medium"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  // DESKTOP VERSION - Minimized with compact cards (No close icon)
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto p-0 bg-white border shadow-xl rounded-2xl">
        <DialogTitle className="sr-only">
          {item.name} - Item Details
        </DialogTitle>
        <DialogDescription className="sr-only">
          Detailed information about {item.name} including description, price, preparation time, and nutritional facts
        </DialogDescription>
        
        <div className="p-6">
          <DialogHeader className="mb-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-xl">
                  <Info className="h-5 w-5 text-purple-700" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-800">{item.name}</h2>
                  {item.isFeatured && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full mt-0.5">
                      <Sparkles className="h-3 w-3" />
                      Featured
                    </span>
                  )}
                </div>
              </div>
              {/* Close icon removed */}
            </div>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Image - Smaller */}
            <div className="relative h-48 rounded-xl overflow-hidden bg-gray-100">
              <img
                src={getImageSrc(item.imageUrl)}
                alt={item.name}
                className="object-cover w-full h-full"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/placeholder.svg'
                }}
              />
            </div>

            {/* Details - Compact */}
            <div className="space-y-3">
              {/* Description - Compact */}
              <div className="bg-gray-50 rounded-xl p-3">
                <div className="flex items-center gap-1.5 text-gray-600 mb-1">
                  <ChefHat className="h-3.5 w-3.5 text-purple-600" />
                  <span className="text-xs font-medium">Description</span>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {item.description || 'No description available'}
                </p>
              </div>

              {/* Price & Prep Time - Compact Cards */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-purple-50 rounded-xl p-2.5">
                  <div className="flex items-center gap-1 text-purple-700 mb-0.5">
                    <DollarSign className="h-3.5 w-3.5" />
                    <span className="text-[10px] font-medium">Price</span>
                  </div>
                  <p className="text-base font-bold text-purple-900">
                    {priceWithTax.toFixed(2)} <span className="text-[10px] font-normal text-gray-400">ETB</span>
                  </p>
                </div>
                <div className="bg-blue-50 rounded-xl p-2.5">
                  <div className="flex items-center gap-1 text-blue-700 mb-0.5">
                    <Clock className="h-3.5 w-3.5" />
                    <span className="text-[10px] font-medium">Prep Time</span>
                  </div>
                  <p className="text-base font-bold text-blue-600">
                    {Number(item.preparationTime) || 0} <span className="text-[10px] font-normal text-gray-400">min</span>
                  </p>
                </div>
              </div>

              {/* Category - Compact */}
              <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
                <Tag className="h-3.5 w-3.5 text-purple-600" />
                <span className="text-xs text-gray-600">Category:</span>
                <div className="flex items-center gap-1.5">
                  {getCategoryIcon(categoryName, "h-3.5 w-3.5 text-purple-700")}
                  <span className="text-xs font-medium text-gray-800">{categoryName}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Nutritional Information - Compact Grid */}
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center gap-2 text-gray-700 mb-2.5">
              <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
              <h3 className="text-xs font-semibold text-gray-800">Nutritional Information</h3>
            </div>
            <div className="grid grid-cols-4 gap-2">
              <div className="bg-green-50 rounded-lg p-2 text-center">
                <p className="text-sm font-bold text-green-600">{Number(nutritionalInfo.calories) || 0}</p>
                <p className="text-[9px] text-gray-500">Calories</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-2 text-center">
                <p className="text-sm font-bold text-blue-600">{Number(nutritionalInfo.protein) || 0}g</p>
                <p className="text-[9px] text-gray-500">Protein</p>
              </div>
              <div className="bg-yellow-50 rounded-lg p-2 text-center">
                <p className="text-sm font-bold text-yellow-600">{Number(nutritionalInfo.carbohydrates) || 0}g</p>
                <p className="text-[9px] text-gray-500">Carbs</p>
              </div>
              <div className="bg-red-50 rounded-lg p-2 text-center">
                <p className="text-sm font-bold text-red-600">{Number(nutritionalInfo.fat) || 0}g</p>
                <p className="text-[9px] text-gray-500">Fat</p>
              </div>
            </div>
          </div>

          {/* Action Buttons - Compact */}
          <div className="flex items-center gap-3 mt-4 pt-4 border-t border-gray-100">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 rounded-lg py-2 text-sm border-2 border-gray-200 hover:border-purple-300 hover:bg-purple-50"
            >
              Close
            </Button>
            <Button
              onClick={handleAddToCartClick}
              className="flex-[2] rounded-lg py-2 text-sm bg-gradient-to-r from-purple-700 to-purple-900 hover:from-purple-800 hover:to-purple-950 text-white border-0 shadow-md hover:shadow-lg"
            >
              <ShoppingCart className="mr-1.5 h-4 w-4" />
              Add to Cart
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}