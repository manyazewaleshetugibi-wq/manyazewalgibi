// components/menu/MenuIcons.tsx
'use client'

import { 
  Utensils, Coffee, Sparkles, Salad, Pizza, Layers,
  Cake, Beer, Wine, Milk, Apple, Beef, Fish, Egg,
  Soup, Sandwich, IceCream, Martini, Grape, Cherry,
  Wheat, Flame, Heart, Star, Clock, ChefHat, ShoppingBag
} from 'lucide-react'

interface CategoryIconProps {
  type?: string
  className?: string
  fallback?: React.ReactNode
}

/**
 * Get the appropriate icon for a category based on its type or name
 * @param type - The category type or name
 * @param className - Optional className for styling
 * @returns JSX.Element - The icon component
 */
export function getCategoryIcon(type?: string, className?: string): JSX.Element {
  const iconClassName = className || "h-4 w-4"
  
  // Handle undefined, null, or empty string
  if (!type || typeof type !== 'string') {
    return <Layers className={iconClassName} />
  }

  const normalizedType = type.toLowerCase().trim()
  
  // Food categories
  const foodKeywords = ['food', 'main', 'entree', 'meal', 'dish', 'plate', 'burger', 'sandwich', 'pizza', 'pasta', 'noodle', 'rice']
  if (foodKeywords.some(keyword => normalizedType.includes(keyword))) {
    return <Utensils className={iconClassName} />
  }

  // Drink categories
  const drinkKeywords = ['drink', 'beverage', 'coffee', 'tea', 'soda', 'juice', 'smoothie', 'milkshake', 'water', 'cocktail', 'mocktail']
  if (drinkKeywords.some(keyword => normalizedType.includes(keyword))) {
    return <Coffee className={iconClassName} />
  }

  // Dessert categories
  const dessertKeywords = ['dessert', 'cake', 'pastry', 'ice cream', 'sweet', 'chocolate', 'cookie', 'brownie', 'pie']
  if (dessertKeywords.some(keyword => normalizedType.includes(keyword))) {
    return <Sparkles className={iconClassName} />
  }

  // Appetizer categories
  const appetizerKeywords = ['appetizer', 'starter', 'snack', 'finger food', 'tapas', 'small plate', 'side', 'side dish']
  if (appetizerKeywords.some(keyword => normalizedType.includes(keyword))) {
    return <Salad className={iconClassName} />
  }

  // Main Course categories
  const mainKeywords = ['main course', 'entree', 'main dish', 'entrée', 'platter']
  if (mainKeywords.some(keyword => normalizedType.includes(keyword))) {
    return <Pizza className={iconClassName} />
  }

  // Specific food types
  const specificFoodMap: Record<string, JSX.Element> = {
    'meat': <Beef className={iconClassName} />,
    'chicken': <Egg className={iconClassName} />,
    'seafood': <Fish className={iconClassName} />,
    'fish': <Fish className={iconClassName} />,
    'soup': <Soup className={iconClassName} />,
    'salad': <Salad className={iconClassName} />,
    'sandwich': <Sandwich className={iconClassName} />,
    'pizza': <Pizza className={iconClassName} />,
    'pasta': <Utensils className={iconClassName} />,
    'breakfast': <Egg className={iconClassName} />,
    'cake': <Cake className={iconClassName} />,
    'pastry': <Cake className={iconClassName} />,
    'ice cream': <IceCream className={iconClassName} />,
    'juice': <Grape className={iconClassName} />,
    'smoothie': <Apple className={iconClassName} />,
    'milkshake': <Milk className={iconClassName} />,
    'milk': <Milk className={iconClassName} />,
    'tea': <Coffee className={iconClassName} />,
    'coffee': <Coffee className={iconClassName} />,
    'alcohol': <Martini className={iconClassName} />,
    'wine': <Wine className={iconClassName} />,
    'beer': <Beer className={iconClassName} />,
    'cocktail': <Martini className={iconClassName} />,
    'fruit': <Apple className={iconClassName} />,
    'vegetable': <Salad className={iconClassName} />,
    'healthy': <Apple className={iconClassName} />,
    'vegan': <Apple className={iconClassName} />,
    'vegetarian': <Salad className={iconClassName} />,
    'gluten free': <Wheat className={iconClassName} />,
    'keto': <Beef className={iconClassName} />,
    'protein': <Beef className={iconClassName} />,
    'carbs': <Wheat className={iconClassName} />,
    'fat': <Flame className={iconClassName} />,
    'calories': <Flame className={iconClassName} />,
  }

  // Check for specific food types
  for (const [key, icon] of Object.entries(specificFoodMap)) {
    if (normalizedType.includes(key)) {
      return icon
    }
  }

  // Default fallback
  return <Layers className={iconClassName} />
}

/**
 * Get icon for category with better handling of null/undefined
 * This is a safer wrapper for the main function
 */
export function getCategoryIconSafe(
  type?: string | null, 
  className?: string
): JSX.Element {
  // If type is null, undefined, or empty string, return default icon
  if (!type || type.trim() === '') {
    return <Layers className={className || "h-4 w-4"} />
  }
  
  try {
    return getCategoryIcon(type, className)
  } catch (error) {
    console.warn('Failed to get category icon for:', type, error)
    return <Layers className={className || "h-4 w-4"} />
  }
}

/**
 * Get icon based on category object
 */
export function getCategoryIconFromCategory(
  category: { type?: string; name?: string } | null | undefined,
  className?: string
): JSX.Element {
  if (!category) {
    return <Layers className={className || "h-4 w-4"} />
  }

  // First try by type
  if (category.type) {
    const icon = getCategoryIcon(category.type, className)
    // Check if it returned the default icon
    if (icon.type !== Layers) {
      return icon
    }
  }
  
  // Then try by name
  if (category.name) {
    return getCategoryIcon(category.name, className)
  }
  
  // Default fallback
  return <Layers className={className || "h-4 w-4"} />
}

// Export individual icons for direct use
export {
  Utensils,
  Coffee,
  Sparkles,
  Salad,
  Pizza,
  Layers,
  Cake,
  Beer,
  Wine,
  Milk,
  Apple,
  Beef,
  Fish,
  Egg,
  Soup,
  Sandwich,
  IceCream,
  Martini,
  Grape,
  Cherry,
  Wheat,
  Flame,
  Heart,
  Star,
  Clock,
  ChefHat,
  ShoppingBag
}