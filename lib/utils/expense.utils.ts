// utils/expense.utils.ts

import { format, subDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, getDaysInMonth, isLeapYear } from "date-fns"
import { CommonExpense, DateFilterType } from "@/types/expense.types"

export const formatCurrency = (amount: number) => {
  if (isNaN(amount)) return "0.00 ETB"
  return new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount) + " ETB"
}

export const formatShortCurrency = (value: number) => {
  if (isNaN(value)) return "0"
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`
  return value.toString()
}

export function getDaysInQuarter(date: Date): number {
  const year = date.getFullYear()
  const month = date.getMonth()
  let quarterStartMonth: number
  let quarterEndMonth: number
  
  if (month < 3) {
    quarterStartMonth = 0
    quarterEndMonth = 2
  } else if (month < 6) {
    quarterStartMonth = 3
    quarterEndMonth = 5
  } else if (month < 9) {
    quarterStartMonth = 6
    quarterEndMonth = 8
  } else {
    quarterStartMonth = 9
    quarterEndMonth = 11
  }
  
  let totalDays = 0
  for (let m = quarterStartMonth; m <= quarterEndMonth; m++) {
    totalDays += new Date(year, m + 1, 0).getDate()
  }
  return totalDays
}

export const getDailyCommonAmount = (expense: CommonExpense, date: Date): number => {
  if (!expense.isActive) return 0
  
  const start = new Date(expense.startDate)
  start.setHours(0, 0, 0, 0)
  if (date < start) return 0
  
  if (expense.endDate) {
    const end = new Date(expense.endDate)
    end.setHours(23, 59, 59, 999)
    if (date > end) return 0
  }

  switch (expense.frequency) {
    case 'daily': 
      return expense.amount
    case 'weekly': 
      return expense.amount / 7
    case 'monthly': 
      const daysInMonth = getDaysInMonth(date)
      return expense.amount / daysInMonth
    case 'quarterly': 
      const quarterDays = getDaysInQuarter(date)
      return expense.amount / quarterDays
    case 'yearly': 
      const daysInYear = isLeapYear(date.getFullYear()) ? 366 : 365
      return expense.amount / daysInYear
    case 'one-time': 
      return isSameDay(date, start) ? expense.amount : 0
    default: 
      return 0
  }
}

export const getDateRange = (type: DateFilterType, customStart?: Date, customEnd?: Date) => {
  const now = new Date()
  switch (type) {
    case 'today':
      return { start: new Date(now.setHours(0, 0, 0, 0)), end: new Date(now.setHours(23, 59, 59, 999)) }
    case 'yesterday':
      const yesterday = subDays(now, 1)
      return { start: new Date(yesterday.setHours(0, 0, 0, 0)), end: new Date(yesterday.setHours(23, 59, 59, 999)) }
    case 'week':
      return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) }
    case 'month':
      return { start: startOfMonth(now), end: endOfMonth(now) }
    case 'custom':
      return { start: customStart || now, end: customEnd || now }
    case '7d':
      return { start: subDays(now, 6), end: now }
    case '14d':
      return { start: subDays(now, 13), end: now }
    case '28d':
      return { start: subDays(now, 27), end: now }
    default:
      return { start: new Date(now.setHours(0, 0, 0, 0)), end: new Date(now.setHours(23, 59, 59, 999)) }
  }
}

export const casualCategories = [
  "Kitchen Equipment Repair", "Dining Area Maintenance", "Emergency Supplies",
  "Marketing Campaign", "Staff Uniforms", "Cleaning Supplies", "Office Supplies",
  "Transportation", "Legal Fees", "Event Expenses", "Miscellaneous", "Other"
]