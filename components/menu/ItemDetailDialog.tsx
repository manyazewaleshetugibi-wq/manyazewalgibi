// components/menu/ItemDetailDialog.tsx
'use client'

import { toast } from 'react-hot-toast'
import { Info, Clock, DollarSign, Tag, Sparkles, ShoppingCart, ChefHat } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
  const nutritionalInfo = item.nutritionalInfo || {
    calories: 0,
    protein: 0,
    carbohydrates: 0,
    fat: 0
  }
  
  const priceWithTax = Number(item.price)

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

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto p-0 bg-gradient-to-br from-white to-purple-50/30 border-0 shadow-2xl rounded-3xl">
        <div className="relative">
          <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-purple-900/20 to-transparent rounded-t-3xl" />

          <DialogHeader className="p-6 pb-0 relative">
            <DialogTitle className="text-3xl font-bold flex items-center gap-3 text-gray-800">
              <div className="p-3 bg-gradient-to-br from-purple-800 to-purple-900 rounded-2xl shadow-lg">
                <Info className="h-6 w-6 text-white" />
              </div>
              {item.name}
            </DialogTitle>
            <DialogDescription className="sr-only">
              Detailed information about {item.name} including description, price, preparation time, and nutritional facts
            </DialogDescription>
          </DialogHeader>

          <div className="p-6 space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="relative group">
                <div className="absolute -inset-2 bg-gradient-to-r from-purple-700 to-purple-900 rounded-3xl blur-lg opacity-50 group-hover:opacity-75 transition-opacity" />
                <div className="relative h-80 rounded-2xl overflow-hidden shadow-xl">
                  <img
                    src={getImageSrc(item.imageUrl)}
                    alt={item.name}
                    className="object-cover w-full h-full transition-transform duration-700 group-hover:scale-110"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/placeholder.svg'
                    }}
                  />
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-purple-100">
                  <h3 className="text-xl font-semibold mb-3 flex items-center gap-2 text-gray-800">
                    <ChefHat className="h-5 w-5 text-purple-900" />
                    Description
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    {item.description || 'No description available'}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gradient-to-br from-purple-50 to-white p-5 rounded-xl shadow-md border border-purple-100">
                    <div className="flex items-center gap-2 text-purple-900 mb-2">
                      <DollarSign className="h-5 w-5" />
                      <span className="font-medium">Price (incl. VAT)</span>
                    </div>
                    <p className="text-3xl font-bold text-purple-900">
                      {priceWithTax.toFixed(2)} <span className="text-sm font-normal text-gray-500">ETB</span>
                    </p>
                  </div>

                  <div className="bg-gradient-to-br from-blue-50 to-white p-5 rounded-xl shadow-md border border-blue-100">
                    <div className="flex items-center gap-2 text-blue-700 mb-2">
                      <Clock className="h-5 w-5" />
                      <span className="font-medium">Prep Time</span>
                    </div>
                    <p className="text-3xl font-bold text-blue-600">
                      {Number(item.preparationTime) || 0} <span className="text-sm font-normal text-gray-500">min</span>
                    </p>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-white p-5 rounded-xl shadow-md border border-purple-100">
                  <h4 className="font-medium text-purple-900 mb-3 flex items-center gap-2">
                    <Tag className="h-4 w-4" />
                    Category
                  </h4>
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      {getCategoryIcon(categoryName, "h-5 w-5 text-purple-900")}
                    </div>
                    <span className="text-lg font-medium text-gray-700">{categoryName}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-purple-100">
              <h3 className="text-xl font-semibold mb-6 flex items-center gap-2 text-gray-800">
                <Sparkles className="h-5 w-5 text-purple-900" />
                Nutritional Information
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-gradient-to-br from-green-50 to-white rounded-xl shadow-sm border border-green-100">
                  <p className="text-3xl font-bold text-green-600 mb-1">{Number(nutritionalInfo.calories) || 0}</p>
                  <p className="text-sm text-gray-600 flex items-center justify-center gap-1">
                    <span>🔥</span> Calories
                  </p>
                </div>
                <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-white rounded-xl shadow-sm border border-blue-100">
                  <p className="text-3xl font-bold text-blue-600 mb-1">{Number(nutritionalInfo.protein) || 0}g</p>
                  <p className="text-sm text-gray-600 flex items-center justify-center gap-1">
                    <span>💪</span> Protein
                  </p>
                </div>
                <div className="text-center p-4 bg-gradient-to-br from-yellow-50 to-white rounded-xl shadow-sm border border-yellow-100">
                  <p className="text-3xl font-bold text-yellow-600 mb-1">{Number(nutritionalInfo.carbohydrates) || 0}g</p>
                  <p className="text-sm text-gray-600 flex items-center justify-center gap-1">
                    <span>🌾</span> Carbs
                  </p>
                </div>
                <div className="text-center p-4 bg-gradient-to-br from-red-50 to-white rounded-xl shadow-sm border border-red-100">
                  <p className="text-3xl font-bold text-red-600 mb-1">{Number(nutritionalInfo.fat) || 0}g</p>
                  <p className="text-sm text-gray-600 flex items-center justify-center gap-1">
                    <span>🥑</span> Fat
                  </p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="p-6 pt-0 gap-3">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="rounded-full px-6 border-2 border-gray-200 hover:border-purple-300 hover:bg-purple-50"
            >
              Close
            </Button>
            <Button
              onClick={handleAddToCartClick}
              className="rounded-full px-8 bg-gradient-to-r from-purple-800 to-purple-900 hover:from-purple-900 hover:to-purple-950 text-white border-0 shadow-lg hover:shadow-xl transition-all"
            >
              <ShoppingCart className="mr-2 h-5 w-5" />
              Add to Cart
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}