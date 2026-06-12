// types/stock.ts (create this file)
export type StockConsumption = {
  _id: string
  stockId: string
  quantity: number
  reason: 'sale' | 'wastage' | 'transfer' | 'damage'
  consumedDate: string
  notes?: string
  createdAt: string
  updatedAt: string
}