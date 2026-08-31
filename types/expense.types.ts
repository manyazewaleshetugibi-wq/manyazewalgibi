// types/expense.types.ts

export interface CasualExpense {
  _id: string
  title: string
  description: string
  amount: number
  category: string
  date: string
  tags: string[]
  recurring: boolean
  frequency: string
  notes: string
  priority: "Low" | "Medium" | "High"
  status: "Paid" | "Pending"
}

export interface CommonExpense {
  _id: string
  title: string
  description?: string
  amount: number
  category: string
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'one-time'
  startDate: string
  endDate?: string | null
  isActive: boolean
  tags?: string[]
  notes?: string
  priority?: string
}

export interface StockItem {
  _id: string
  name: string
  currentStock: number
  minimumStock: number
  unit: string
  category?: string
}

export interface StockPurchase {
  _id: string
  stockId: string
  stockName?: string
  purchaseDate: string
  quantity: number
  unitPrice: number
  totalAmount: number
  supplier: string
}

export interface OrderReport {
  dailySales: Record<string, number>
  orderCount: number
}

export type CostFormData = Omit<CasualExpense, "_id" | "date" | "tags"> & {
  date: Date
  tags: string
}

export type SortConfig = {
  key: keyof CasualExpense
  direction: "asc" | "desc"
}

export type DateFilterType = 'today' | 'yesterday' | 'week' | 'month' | 'custom' | '7d' | '14d' | '28d'