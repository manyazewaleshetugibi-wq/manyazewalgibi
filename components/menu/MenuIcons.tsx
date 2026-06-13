// components/menu/MenuIcons.tsx
'use client'

import { Utensils, Coffee, Sparkles, Salad, Pizza, Layers } from 'lucide-react'

export function getCategoryIcon(type: string, className?: string) {
  const iconClassName = className || "h-4 w-4"
  
  switch (type?.toLowerCase()) {
    case 'food':
      return <Utensils className={iconClassName} />
    case 'drink':
      return <Coffee className={iconClassName} />
    case 'dessert':
      return <Sparkles className={iconClassName} />
    case 'appetizer':
      return <Salad className={iconClassName} />
    case 'main course':
      return <Pizza className={iconClassName} />
    default:
      return <Layers className={iconClassName} />
  }
}