// components/menu/MenuHeader.tsx
'use client'

import { motion } from 'framer-motion'
import { Search, ShoppingCart, Grid, List, ChevronUp, ChevronDown, Layers, Filter } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Category } from '@/types'
import { getCategoryIcon } from './MenuIcons'

interface MenuHeaderProps {
  searchTerm: string
  onSearchChange: (value: string) => void
  selectedCategory: string | null
  onCategoryChange: (value: string | null) => void
  categories: Category[]
  categoryCounts: Record<string, number>
  sortField: 'name' | 'price' | 'preparationTime'
  sortDirection: 'asc' | 'desc'
  onSort: (field: 'name' | 'price' | 'preparationTime') => void
  viewMode: 'grid' | 'list'
  onViewModeChange: (mode: 'grid' | 'list') => void
  totalItems: number
  isCartOpen: boolean
  onCartOpenChange: (open: boolean) => void
  onCartClick: () => void
}

export function MenuHeader({
  searchTerm,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  categories,
  categoryCounts,
  sortField,
  sortDirection,
  onSort,
  viewMode,
  onViewModeChange,
  totalItems,
  isCartOpen,
  onCartOpenChange,
  onCartClick
}: MenuHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="sticky top-0 z-20 bg-gradient-to-b from-purple-50/80 via-white/80 to-transparent backdrop-blur-xl pt-3 pb-2"
    >
      <div className="flex flex-wrap items-center gap-3">
        {/* Sort Buttons - Name, Price, Prep Time */}
        <div className="flex items-center gap-1.5 bg-white/90 backdrop-blur-sm p-1.5 rounded-2xl border border-purple-200 shadow-md">
          <span className="text-xs text-gray-500 px-2 font-medium">Sort by:</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onSort('name')}
            className={`rounded-xl px-3 py-1.5 h-8 text-sm transition-all ${
              sortField === 'name'
                ? 'bg-gradient-to-r from-purple-800 to-purple-900 text-white shadow-md'
                : 'hover:bg-purple-50 text-gray-600'
            }`}
          >
            <span className="flex items-center gap-1">
              Name
              {sortField === 'name' && (
                sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
              )}
            </span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onSort('price')}
            className={`rounded-xl px-3 py-1.5 h-8 text-sm transition-all ${
              sortField === 'price'
                ? 'bg-gradient-to-r from-purple-800 to-purple-900 text-white shadow-md'
                : 'hover:bg-purple-50 text-gray-600'
            }`}
          >
            <span className="flex items-center gap-1">
              Price
              {sortField === 'price' && (
                sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
              )}
            </span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onSort('preparationTime')}
            className={`rounded-xl px-3 py-1.5 h-8 text-sm transition-all ${
              sortField === 'preparationTime'
                ? 'bg-gradient-to-r from-purple-800 to-purple-900 text-white shadow-md'
                : 'hover:bg-purple-50 text-gray-600'
            }`}
          >
            <span className="flex items-center gap-1">
              Prep Time
              {sortField === 'preparationTime' && (
                sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
              )}
            </span>
          </Button>
        </div>

        {/* Search Input - Smaller and compact */}
        <div className="relative flex-1 min-w-[200px] max-w-[280px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-500" size={16} />
          <Input
            type="text"
            placeholder="Search menu..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 pr-3 py-2 h-9 text-sm bg-white/90 backdrop-blur-sm border border-purple-200 rounded-xl focus:border-purple-900 focus:ring-2 focus:ring-purple-200 transition-all shadow-sm"
          />
        </div>

        {/* Category Filter */}
        <div className="w-[220px]">
          <Select
            value={selectedCategory || 'all'}
            onValueChange={(value) => onCategoryChange(value === 'all' ? null : value)}
          >
            <SelectTrigger className="h-9 text-sm bg-white/90 backdrop-blur-sm border border-purple-200 rounded-xl focus:border-purple-900 focus:ring-2 focus:ring-purple-200 shadow-sm">
              <div className="flex items-center gap-2">
                <Filter size={14} className="text-purple-500" />
                <SelectValue placeholder="All Categories" />
              </div>
            </SelectTrigger>
            <SelectContent className="rounded-xl border border-purple-200 shadow-xl max-h-[300px]">
              <SelectItem value="all" className="text-sm py-2">
                <div className="flex items-center gap-2">
                  <Layers className="h-3.5 w-3.5 text-purple-900" />
                  All Categories
                </div>
              </SelectItem>
              {categories.map((category) => (
                <SelectItem key={category._id} value={category._id} className="text-sm py-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1 bg-purple-100 rounded-md">
                      {getCategoryIcon(category.type, "h-3 w-3 text-purple-900")}
                    </div>
                    <span className="flex-1">{category.name}</span>
                    <Badge variant="secondary" className="bg-purple-100 text-purple-900 rounded-full text-xs px-1.5">
                      {categoryCounts[category._id] || 0}
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* View Mode Toggle */}
        <div className="flex gap-1 bg-white/90 backdrop-blur-sm p-1 rounded-xl border border-purple-200 shadow-sm">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="icon"
                  onClick={() => onViewModeChange('grid')}
                  className={`rounded-lg h-8 w-8 transition-all ${
                    viewMode === 'grid'
                      ? 'bg-gradient-to-r from-purple-800 to-purple-900 text-white shadow-md'
                      : 'hover:bg-purple-50 text-gray-600'
                  }`}
                >
                  <Grid size={16} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Grid view</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="icon"
                  onClick={() => onViewModeChange('list')}
                  className={`rounded-lg h-8 w-8 transition-all ${
                    viewMode === 'list'
                      ? 'bg-gradient-to-r from-purple-800 to-purple-900 text-white shadow-md'
                      : 'hover:bg-purple-50 text-gray-600'
                  }`}
                >
                  <List size={16} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>List view</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Cart Button */}
        <Sheet open={isCartOpen} onOpenChange={onCartOpenChange}>
          <SheetTrigger asChild>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                variant="default"
                onClick={onCartClick}
                className="relative shadow-md bg-gradient-to-r from-purple-800 to-purple-900 hover:from-purple-900 hover:to-purple-950 text-white rounded-xl px-4 py-2 h-9 text-sm gap-2"
              >
                <ShoppingCart className="h-4 w-4" />
                Cart
                {totalItems > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center shadow-md"
                  >
                    {totalItems}
                  </motion.span>
                )}
              </Button>
            </motion.div>
          </SheetTrigger>
        </Sheet>
      </div>
    </motion.div>
  )
}