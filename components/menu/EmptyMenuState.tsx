// components/menu/EmptyMenuState.tsx
'use client'

import { motion } from 'framer-motion'
import { Button } from "@/components/ui/button"
import { RefreshCw, Search, Filter } from 'lucide-react'

interface EmptyMenuStateProps {
  searchTerm: string
  selectedCategory: string | null
  itemsLength: number
  onClearFilters: () => void
  onRefresh: () => void
}

export function EmptyMenuState({
  searchTerm,
  selectedCategory,
  itemsLength,
  onClearFilters,
  onRefresh
}: EmptyMenuStateProps) {
  // Determine the appropriate message based on state
  const getMessage = () => {
    if (searchTerm) {
      return `No items matching "${searchTerm}"`
    }
    if (selectedCategory) {
      return 'No items in this category'
    }
    if (itemsLength === 0) {
      return 'No items available. Please check back later.'
    }
    return 'No items match your filters'
  }

  // Determine the appropriate icon
  const getIcon = () => {
    if (searchTerm) return '🔍'
    if (selectedCategory) return '📂'
    return '🍽️'
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="text-center py-16 md:py-24"
    >
      <div className="relative inline-block">
        <div className="text-7xl md:text-8xl mb-4 md:mb-6 animate-float">
          {getIcon()}
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-purple-700 to-purple-900 rounded-full blur-3xl opacity-10" />
      </div>
      
      <h3 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2 md:mb-3">
        No items found
      </h3>
      
      <p className="text-gray-600 text-base md:text-lg mb-6 md:mb-8 max-w-md mx-auto px-4">
        {getMessage()}
      </p>
      
      <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
        {(searchTerm || selectedCategory) && (
          <Button
            variant="outline"
            onClick={onClearFilters}
            className="rounded-full px-6 md:px-8 py-3 md:py-6 text-sm md:text-lg border-2 border-purple-200 hover:border-purple-900 hover:bg-purple-50 transition-all duration-300"
          >
            <Filter className="mr-2 h-4 w-4 md:h-5 md:w-5" />
            Clear Filters
          </Button>
        )}
        
        {itemsLength === 0 && !searchTerm && !selectedCategory && (
          <Button
            variant="outline"
            onClick={onRefresh}
            className="rounded-full px-6 md:px-8 py-3 md:py-6 text-sm md:text-lg border-2 border-purple-200 hover:border-purple-900 hover:bg-purple-50 transition-all duration-300"
          >
            <RefreshCw className="mr-2 h-4 w-4 md:h-5 md:w-5 animate-spin" />
            Refresh Menu
          </Button>
        )}
      </div>
      
      {/* Helpful hint */}
      {(searchTerm || selectedCategory) && (
        <p className="mt-6 text-sm text-gray-400">
          Try adjusting your search or filter criteria
        </p>
      )}
    </motion.div>
  )
}