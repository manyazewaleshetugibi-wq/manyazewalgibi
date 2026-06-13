// components/menu/EmptyMenuState.tsx
'use client'

import { motion } from 'framer-motion'
import { Button } from "@/components/ui/button"
import { RefreshCw } from 'lucide-react'

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
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="text-center py-20"
    >
      <div className="relative inline-block">
        <div className="text-8xl mb-6 animate-float">🍽️</div>
        <div className="absolute inset-0 bg-gradient-to-r from-purple-700 to-purple-900 rounded-full blur-3xl opacity-20" />
      </div>
      <h3 className="text-3xl font-bold text-gray-800 mb-3">No items found</h3>
      <p className="text-gray-600 text-lg mb-8 max-w-md mx-auto">
        {searchTerm
          ? `No items matching "${searchTerm}"`
          : selectedCategory
            ? 'No items in this category'
            : itemsLength === 0
              ? 'No items available. Please check back later.'
              : 'No items match your filters'}
      </p>
      {(searchTerm || selectedCategory) && (
        <Button
          variant="outline"
          onClick={onClearFilters}
          className="rounded-full px-8 py-6 text-lg border-2 border-purple-200 hover:border-purple-900 hover:bg-purple-50"
        >
          Clear Filters
        </Button>
      )}
      {itemsLength === 0 && !searchTerm && !selectedCategory && (
        <Button
          variant="outline"
          onClick={onRefresh}
          className="rounded-full px-8 py-6 text-lg border-2 border-purple-200 hover:border-purple-900 hover:bg-purple-50"
        >
          <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
          Refresh
        </Button>
      )}
    </motion.div>
  )
}