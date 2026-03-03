export interface Prize {
  _id?: string
  id?: string
  name: string
  value: number
  icon: string // Store icon name as string
  color: string
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  probability: number
  description: string
  gradient: string
  textColor: string
  isActive: boolean
  createdAt?: Date
  updatedAt?: Date
  createdBy?: string
  totalWon?: number
  lastWonAt?: Date
}

export interface PrizeWithIcon extends Omit<Prize, 'icon'> {
  icon: any // For client-side with actual icon component
}

export const RARITIES = ['common', 'rare', 'epic', 'legendary'] as const

export const DEFAULT_GRADIENTS = {
  common: 'linear-gradient(135deg, #94a3b8 0%, #64748b 100%)',
  rare: 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)',
  epic: 'linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%)',
  legendary: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)'
}

export const DEFAULT_COLORS = {
  common: 'from-gray-400 to-gray-600',
  rare: 'from-blue-400 to-blue-600',
  epic: 'from-purple-400 to-purple-600',
  legendary: 'from-yellow-400 to-orange-500'
}