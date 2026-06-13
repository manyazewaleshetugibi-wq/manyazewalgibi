"use client"

import { useRouter } from "next/navigation"
import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { 
  DollarSign, 
  Download, 
  Filter, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  Wallet,
  Calculator,
  FileSpreadsheet,
  Calendar,
  Package,
  Receipt,
  TrendingDown,
  Landmark
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
} from "recharts"
import * as XLSX from "xlsx";
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, parseISO, setDay, eachDayOfInterval } from "date-fns"
import { ArrowDown, ArrowUp, CalendarIcon } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// ============================================================================
// TYPES
// ============================================================================

interface CasualExpense {
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

interface CommonExpense {
  _id: string
  title: string
  amount: number
  category: string
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'one-time'
  startDate: string
  endDate?: string | null
  isActive: boolean
  tags?: string[]
}

interface StockPurchase {
  _id: string
  stockId: string
  stockName?: string
  purchaseDate: string
  quantity: number
  unitPrice: number
  totalAmount: number
  supplier: string
}

interface DailyCashEntry {
  _id: string
  date: string
  cashAmount: number
  bankAmount: number
  totalAmount: number
  notes?: string
  createdBy?: string
}

interface DailyBalance {
  date: string
  formattedDate: string
  cashAmount: number
  bankAmount: number
  totalCash: number
  paidExpenses: number
  pendingExpenses: number
  balance: number
  remainingPending: number
  expenseCount: number
  paidCount: number
  pendingCount: number
  commonExpenses: number
  stockPurchases: number
  casualExpenses: number
  totalExpenses: number
  cardSales: number
  cashSales: number
  totalSales: number
}

type DateFilterType = 'today' | 'yesterday' | 'week' | 'month' | 'year' | 'custom' | 'all' | 'dayOfWeek'

const DAYS_OF_WEEK = [
  { value: "monday", label: "Monday", dayIndex: 1 },
  { value: "tuesday", label: "Tuesday", dayIndex: 2 },
  { value: "wednesday", label: "Wednesday", dayIndex: 3 },
  { value: "thursday", label: "Thursday", dayIndex: 4 },
  { value: "friday", label: "Friday", dayIndex: 5 },
  { value: "saturday", label: "Saturday", dayIndex: 6 },
  { value: "sunday", label: "Sunday", dayIndex: 0 },
]

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82CA9D", "#FF6B6B", "#4ECDC4"]

const EXPENSE_COLORS = {
  Common: "#8b5cf6",
  Stock: "#10b981",
  Casual: "#f59e0b"
}

// ============================================================================
// MOCK DATA (for development when APIs are not available)
// ============================================================================

const getMockCasualExpenses = (): CasualExpense[] => {
  return [
    {
      _id: "1",
      title: "Kitchen Equipment Repair",
      description: "Fixed broken refrigerator",
      amount: 5000,
      category: "Kitchen Equipment Repair",
      date: new Date().toISOString(),
      tags: ["repair", "kitchen"],
      recurring: false,
      frequency: "",
      notes: "Urgent repair",
      priority: "High",
      status: "Paid"
    },
    {
      _id: "2",
      title: "Marketing Campaign",
      description: "Social media ads",
      amount: 3000,
      category: "Marketing Campaign",
      date: subDays(new Date(), 2).toISOString(),
      tags: ["marketing", "ads"],
      recurring: false,
      frequency: "",
      notes: "Facebook ads",
      priority: "Medium",
      status: "Pending"
    },
    {
      _id: "3",
      title: "Cleaning Supplies",
      description: "Monthly cleaning products",
      amount: 1500,
      category: "Cleaning Supplies",
      date: subDays(new Date(), 5).toISOString(),
      tags: ["cleaning", "supplies"],
      recurring: true,
      frequency: "Monthly",
      notes: "",
      priority: "Low",
      status: "Paid"
    }
  ]
}

const getMockCommonExpenses = (): CommonExpense[] => {
  return [
    {
      _id: "1",
      title: "Rent",
      amount: 50000,
      category: "Rent",
      frequency: "monthly",
      startDate: startOfMonth(new Date()).toISOString(),
      isActive: true
    },
    {
      _id: "2",
      title: "Electricity Bill",
      amount: 8000,
      category: "Utilities",
      frequency: "monthly",
      startDate: startOfMonth(new Date()).toISOString(),
      isActive: true
    },
    {
      _id: "3",
      title: "Staff Salaries",
      amount: 120000,
      category: "Salaries",
      frequency: "monthly",
      startDate: startOfMonth(new Date()).toISOString(),
      isActive: true
    }
  ]
}

const getMockStockPurchases = (): StockPurchase[] => {
  return [
    {
      _id: "1",
      stockId: "1",
      stockName: "Coffee Beans",
      purchaseDate: new Date().toISOString(),
      quantity: 50,
      unitPrice: 800,
      totalAmount: 40000,
      supplier: "Ethiopian Coffee Export"
    },
    {
      _id: "2",
      stockId: "2",
      stockName: "Milk",
      purchaseDate: subDays(new Date(), 3).toISOString(),
      quantity: 100,
      unitPrice: 120,
      totalAmount: 12000,
      supplier: "Local Dairy Farm"
    }
  ]
}

const getMockDailyCash = (): DailyCashEntry[] => {
  return [
    {
      _id: "1",
      date: new Date().toISOString().split('T')[0],
      cashAmount: 15000,
      bankAmount: 250000,
      totalAmount: 265000,
      notes: "Opening balance"
    },
    {
      _id: "2",
      date: subDays(new Date(), 1).toISOString().split('T')[0],
      cashAmount: 12000,
      bankAmount: 245000,
      totalAmount: 257000,
      notes: ""
    }
  ]
}

const getMockDailySales = (): Record<string, number> => {
  const sales: Record<string, number> = {}
  for (let i = 0; i < 7; i++) {
    const date = subDays(new Date(), i).toISOString().split('T')[0]
    sales[date] = Math.floor(Math.random() * 50000) + 20000
  }
  return sales
}

// ============================================================================
// API FUNCTIONS with fallbacks
// ============================================================================

const API_BASE_URL = "/api"

async function fetchWithFallback<T>(url: string, fallback: () => T): Promise<T> {
  try {
    const response = await fetch(url)
    if (!response.ok) {
      console.warn(`API ${url} returned ${response.status}, using fallback data`)
      return fallback()
    }
    const data = await response.json()
    // Check if data has the expected structure
    if (data && (data.data || Array.isArray(data))) {
      return (data.data || data) as T
    }
    return fallback()
  } catch (error) {
    console.warn(`Failed to fetch ${url}, using fallback data:`, error)
    return fallback()
  }
}

async function fetchExpenses(): Promise<CasualExpense[]> {
  return fetchWithFallback(`${API_BASE_URL}/expense`, getMockCasualExpenses)
}

async function fetchCommonExpenses(): Promise<CommonExpense[]> {
  return fetchWithFallback(`${API_BASE_URL}/common-expense`, getMockCommonExpenses)
}

async function fetchStockPurchases(): Promise<StockPurchase[]> {
  const stocks = await fetchWithFallback(`${API_BASE_URL}/stock`, () => [])
  const purchases = await fetchWithFallback(`${API_BASE_URL}/stock-purchase`, getMockStockPurchases)
  
  const stockMap = new Map(stocks.map((s: any) => [s._id, s.name]))
  return purchases.map((p: any) => ({
    ...p,
    stockName: stockMap.get(p.stockId) || p.stockName || "Unknown",
    totalAmount: (p.quantity || 0) * (p.unitPrice || 0)
  }))
}

async function fetchDailyCash(): Promise<DailyCashEntry[]> {
  return fetchWithFallback(`${API_BASE_URL}/daily-cash`, getMockDailyCash)
}

async function fetchOrderReport() {
  return fetchWithFallback(`${API_BASE_URL}/order/report`, () => ({ dailySales: getMockDailySales() }))
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function getDaysInMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
}

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0)
}

function getDaysInQuarter(date: Date): number {
  const year = date.getFullYear()
  const month = date.getMonth()
  let quarterStartMonth: number, quarterEndMonth: number
  
  if (month < 3) { quarterStartMonth = 0; quarterEndMonth = 2 }
  else if (month < 6) { quarterStartMonth = 3; quarterEndMonth = 5 }
  else if (month < 9) { quarterStartMonth = 6; quarterEndMonth = 8 }
  else { quarterStartMonth = 9; quarterEndMonth = 11 }
  
  let totalDays = 0
  for (let m = quarterStartMonth; m <= quarterEndMonth; m++) {
    totalDays += new Date(year, m + 1, 0).getDate()
  }
  return totalDays
}

function getDailyCommonAmount(expense: CommonExpense, date: Date): number {
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
    case 'daily': return expense.amount
    case 'weekly': return expense.amount / 7
    case 'monthly': return expense.amount / getDaysInMonth(date)
    case 'quarterly': return expense.amount / getDaysInQuarter(date)
    case 'yearly': return expense.amount / (isLeapYear(date.getFullYear()) ? 366 : 365)
    case 'one-time': return isSameDay(date, start) ? expense.amount : 0
    default: return 0
  }
}

function isSameDay(date1: Date, date2: Date): boolean {
  return date1.getFullYear() === date2.getFullYear() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getDate() === date2.getDate()
}

function formatCurrency(amount: number): string {
  if (isNaN(amount)) return "0.00 ETB"
  return new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount) + " ETB"
}

function formatShortCurrency(value: number): string {
  if (isNaN(value)) return "0"
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`
  return value.toString()
}

function getDateRange(type: DateFilterType, customStart?: Date, customEnd?: Date, selectedDayOfWeek?: number) {
  const now = new Date()
  let start: Date, end: Date

  switch (type) {
    case 'today':
      start = new Date(now.setHours(0, 0, 0, 0))
      end = new Date(now.setHours(23, 59, 59, 999))
      break
    case 'yesterday':
      const yesterday = subDays(now, 1)
      start = new Date(yesterday.setHours(0, 0, 0, 0))
      end = new Date(yesterday.setHours(23, 59, 59, 999))
      break
    case 'week':
      start = startOfWeek(now, { weekStartsOn: 1 })
      end = endOfWeek(now, { weekStartsOn: 1 })
      break
    case 'month':
      start = startOfMonth(now)
      end = endOfMonth(now)
      break
    case 'year':
      start = startOfYear(now)
      end = endOfYear(now)
      break
    case 'dayOfWeek':
      if (selectedDayOfWeek !== undefined) {
        const targetDate = setDay(now, selectedDayOfWeek)
        if (targetDate > now) targetDate.setDate(targetDate.getDate() - 7)
        start = new Date(targetDate.setHours(0, 0, 0, 0))
        end = new Date(targetDate.setHours(23, 59, 59, 999))
      } else {
        start = new Date(now.setHours(0, 0, 0, 0))
        end = new Date(now.setHours(23, 59, 59, 999))
      }
      break
    case 'custom':
      start = customStart || new Date(now.setHours(0, 0, 0, 0))
      end = customEnd || new Date(now.setHours(23, 59, 59, 999))
      break
    case 'all':
    default:
      start = new Date('1970-01-01')
      end = new Date('2100-12-31')
      break
  }
  return { start, end }
}

function exportToExcel(data: any[], filename: string) {
  const worksheet = XLSX.utils.json_to_sheet(data)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, "Data")
  XLSX.writeFile(workbook, `${filename}.xlsx`)
}

// ============================================================================
// DAILY CASH DIALOG COMPONENT
// ============================================================================

function DailyCashDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [activeTab, setActiveTab] = useState<'cash' | 'transfer' | 'zreport'>('cash')
  const [cashAmount, setCashAmount] = useState("")
  const [bankAmount, setBankAmount] = useState("")
  const [notes, setNotes] = useState("")
  const [transferAmount, setTransferAmount] = useState("")
  const [transferFrom, setTransferFrom] = useState<'cash' | 'bank'>('cash')
  const [transferTo, setTransferTo] = useState<'cash' | 'bank'>('bank')
  const [transferReason, setTransferReason] = useState("")
  const [zReportDate, setZReportDate] = useState<Date>(new Date())
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmitCash = async () => {
    setIsLoading(true)
    try {
      // Mock API call - replace with actual API
      console.log("Saving daily cash:", { cashAmount, bankAmount, notes })
      await new Promise(resolve => setTimeout(resolve, 500))
      setCashAmount("")
      setBankAmount("")
      setNotes("")
      onOpenChange(false)
      window.location.reload()
    } catch (error) {
      console.error("Error saving daily cash:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmitTransfer = async () => {
    setIsLoading(true)
    try {
      console.log("Processing transfer:", { transferFrom, transferTo, transferAmount, transferReason })
      await new Promise(resolve => setTimeout(resolve, 500))
      setTransferAmount("")
      setTransferReason("")
      onOpenChange(false)
    } catch (error) {
      console.error("Error saving transfer:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmitZReport = async () => {
    setIsLoading(true)
    try {
      console.log("Generating Z-report:", { zReportDate })
      await new Promise(resolve => setTimeout(resolve, 500))
      onOpenChange(false)
    } catch (error) {
      console.error("Error generating Z-report:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Daily Cash Management
          </DialogTitle>
          <DialogDescription>
            Manage daily cash entries, transfers, and Z-reports
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="cash">Daily Cash</TabsTrigger>
            <TabsTrigger value="transfer">Transfer</TabsTrigger>
            <TabsTrigger value="zreport">Z-Report</TabsTrigger>
          </TabsList>

          <TabsContent value="cash" className="space-y-4 mt-4">
            <div className="grid gap-4">
              <div>
                <Label>Cash Amount (ETB)</Label>
                <Input
                  type="number"
                  placeholder="Enter cash amount"
                  value={cashAmount}
                  onChange={(e) => setCashAmount(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Bank Amount (ETB)</Label>
                <Input
                  type="number"
                  placeholder="Enter bank amount"
                  value={bankAmount}
                  onChange={(e) => setBankAmount(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Notes (Optional)</Label>
                <Input
                  placeholder="Add notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="mt-1"
                />
              </div>
              <Button onClick={handleSubmitCash} disabled={isLoading} className="bg-blue-600">
                {isLoading ? "Saving..." : "Save Daily Cash"}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="transfer" className="space-y-4 mt-4">
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>From Account</Label>
                  <Select value={transferFrom} onValueChange={(v) => setTransferFrom(v as any)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="bank">Bank</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>To Account</Label>
                  <Select value={transferTo} onValueChange={(v) => setTransferTo(v as any)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="bank">Bank</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Amount (ETB)</Label>
                <Input
                  type="number"
                  placeholder="Enter amount"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Reason</Label>
                <Input
                  placeholder="Reason for transfer"
                  value={transferReason}
                  onChange={(e) => setTransferReason(e.target.value)}
                  className="mt-1"
                />
              </div>
              <Button onClick={handleSubmitTransfer} disabled={isLoading} className="bg-purple-600">
                {isLoading ? "Processing..." : "Process Transfer"}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="zreport" className="space-y-4 mt-4">
            <div className="grid gap-4">
              <div>
                <Label>Report Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full mt-1">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(zReportDate, "PPP")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent>
                    <CalendarComponent mode="single" selected={zReportDate} onSelect={(d) => d && setZReportDate(d)} />
                  </PopoverContent>
                </Popover>
              </div>
              <Button onClick={handleSubmitZReport} disabled={isLoading} className="bg-green-600">
                {isLoading ? "Generating..." : "Generate Z-Report"}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function ExpensesPage() {
  const router = useRouter()
  
  // State for all data types
  const [casualExpenses, setCasualExpenses] = useState<CasualExpense[]>([])
  const [commonExpenses, setCommonExpenses] = useState<CommonExpense[]>([])
  const [stockPurchases, setStockPurchases] = useState<StockPurchase[]>([])
  const [dailyCashEntries, setDailyCashEntries] = useState<DailyCashEntry[]>([])
  const [dailySales, setDailySales] = useState<Record<string, number>>({})
  
  const [isLoading, setIsLoading] = useState(true)
  const [showDailyCash, setShowDailyCash] = useState(false)
  
  // Filter states
  const [filterCategory, setFilterCategory] = useState("all")
  const [filterPriority, setFilterPriority] = useState("all")
  const [filterStatus, setFilterStatus] = useState("all")
  const [dateFilterType, setDateFilterType] = useState<DateFilterType>('all')
  const [selectedDayOfWeek, setSelectedDayOfWeek] = useState<string>('')
  const [customStartDate, setCustomStartDate] = useState<Date | null>(null)
  const [customEndDate, setCustomEndDate] = useState<Date | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState<keyof CasualExpense>("date")
  const [sortOrder, setSortOrder] = useState("desc")
  
  // Chart view state
  const [expenseChartView, setExpenseChartView] = useState<'bar' | 'area' | 'line'>('bar')

  // Fetch all data
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      try {
        const [casual, common, stock, cash, sales] = await Promise.all([
          fetchExpenses(),
          fetchCommonExpenses(),
          fetchStockPurchases(),
          fetchDailyCash(),
          fetchOrderReport()
        ])
        setCasualExpenses(casual)
        setCommonExpenses(common)
        setStockPurchases(stock)
        setDailyCashEntries(cash)
        setDailySales(sales.dailySales || {})
      } catch (error) {
        console.error("Error loading data:", error)
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [])

  // Get date range for filtering
  const getCurrentDateRange = useMemo(() => {
    if (dateFilterType === 'dayOfWeek' && selectedDayOfWeek) {
      const dayConfig = DAYS_OF_WEEK.find(d => d.value === selectedDayOfWeek)
      return getDateRange('dayOfWeek', undefined, undefined, dayConfig?.dayIndex)
    }
    return getDateRange(dateFilterType, customStartDate || undefined, customEndDate || undefined)
  }, [dateFilterType, customStartDate, customEndDate, selectedDayOfWeek])

  // Calculate daily balances with all expense types
  const dailyBalances = useMemo(() => {
    const { start, end } = getCurrentDateRange
    const dates = eachDayOfInterval({ start, end })
    
    return dates.map(date => {
      const dateStr = format(date, 'yyyy-MM-dd')
      
      // Get cash entries
      const cashEntry = dailyCashEntries.find(entry => entry.date === dateStr)
      const cashAmount = cashEntry?.cashAmount || 0
      const bankAmount = cashEntry?.bankAmount || 0
      const totalCash = cashAmount + bankAmount
      
      // Calculate common expenses for the day
      let commonTotal = 0
      commonExpenses.forEach(expense => {
        commonTotal += getDailyCommonAmount(expense, date)
      })
      
      // Calculate stock purchases for the day
      const stockTotal = stockPurchases
        .filter(p => p.purchaseDate && p.purchaseDate.startsWith(dateStr))
        .reduce((sum, p) => sum + p.totalAmount, 0)
      
      // Calculate casual expenses for the day (only paid ones)
      const casualTotal = casualExpenses
        .filter(e => e.date && e.date.startsWith(dateStr) && e.status === 'Paid')
        .reduce((sum, e) => sum + e.amount, 0)
      
      const totalExpenses = commonTotal + stockTotal + casualTotal
      const paidExpenses = totalExpenses
      const pendingExpenses = casualExpenses
        .filter(e => e.date && e.date.startsWith(dateStr) && e.status === 'Pending')
        .reduce((sum, e) => sum + e.amount, 0)
      
      // Get sales for the day
      const cardSales = dailySales[dateStr] || 0
      const cashSales = 0
      const totalSales = cardSales + cashSales
      
      return {
        date: dateStr,
        formattedDate: format(date, 'PPP'),
        cashAmount,
        bankAmount,
        totalCash,
        commonExpenses: commonTotal,
        stockPurchases: stockTotal,
        casualExpenses: casualTotal,
        paidExpenses,
        pendingExpenses,
        totalExpenses,
        balance: totalCash - paidExpenses,
        remainingPending: pendingExpenses,
        expenseCount: casualExpenses.filter(e => e.date && e.date.startsWith(dateStr)).length,
        paidCount: casualExpenses.filter(e => e.date && e.date.startsWith(dateStr) && e.status === 'Paid').length,
        pendingCount: casualExpenses.filter(e => e.date && e.date.startsWith(dateStr) && e.status === 'Pending').length,
        cardSales,
        cashSales,
        totalSales,
        profit: totalSales - totalExpenses
      }
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [commonExpenses, stockPurchases, casualExpenses, dailyCashEntries, dailySales, getCurrentDateRange])

  // Filter casual expenses
  const filteredCasualExpenses = useMemo(() => {
    const { start, end } = getCurrentDateRange
    
    return casualExpenses.filter((expense) => {
      const expenseDate = new Date(expense.date)
      const matchesDate = dateFilterType === 'all' || (expenseDate >= start && expenseDate <= end)
      const matchesCategory = filterCategory === "all" || expense.category === filterCategory
      const matchesPriority = filterPriority === "all" || expense.priority === filterPriority
      const matchesStatus = filterStatus === "all" || expense.status === filterStatus
      const matchesSearch = searchTerm === "" || 
        expense.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        expense.description.toLowerCase().includes(searchTerm.toLowerCase())

      return matchesDate && matchesCategory && matchesPriority && matchesStatus && matchesSearch
    }).sort((a, b) => {
      if (a[sortBy] < b[sortBy]) return sortOrder === "asc" ? -1 : 1
      if (a[sortBy] > b[sortBy]) return sortOrder === "asc" ? 1 : -1
      return 0
    })
  }, [casualExpenses, filterCategory, filterPriority, filterStatus, dateFilterType, customStartDate, customEndDate, searchTerm, sortBy, sortOrder, selectedDayOfWeek])

  // Calculate metrics
  const metrics = useMemo(() => {
    const totalExpenses = dailyBalances.reduce((sum, d) => sum + d.totalExpenses, 0)
    const totalCommon = dailyBalances.reduce((sum, d) => sum + d.commonExpenses, 0)
    const totalStock = dailyBalances.reduce((sum, d) => sum + d.stockPurchases, 0)
    const totalCasual = dailyBalances.reduce((sum, d) => sum + d.casualExpenses, 0)
    const totalCash = dailyBalances.reduce((sum, d) => sum + d.totalCash, 0)
    const totalBalance = dailyBalances.reduce((sum, d) => sum + d.balance, 0)
    const totalSales = dailyBalances.reduce((sum, d) => sum + d.totalSales, 0)
    const totalProfit = dailyBalances.reduce((sum, d) => sum + d.profit, 0)
    const profitMargin = totalSales > 0 ? (totalProfit / totalSales) * 100 : 0
    
    return {
      totalExpenses,
      totalCommon,
      totalStock,
      totalCasual,
      totalCash,
      totalBalance,
      totalSales,
      totalProfit,
      profitMargin,
      expenseCount: filteredCasualExpenses.length,
      pendingCount: filteredCasualExpenses.filter(e => e.status === 'Pending').length,
      paidCount: filteredCasualExpenses.filter(e => e.status === 'Paid').length,
      pendingAmount: filteredCasualExpenses.filter(e => e.status === 'Pending').reduce((s, e) => s + e.amount, 0),
      paidAmount: filteredCasualExpenses.filter(e => e.status === 'Paid').reduce((s, e) => s + e.amount, 0),
    }
  }, [dailyBalances, filteredCasualExpenses])

  // Chart data for expense trends
  const expenseTrendData = useMemo(() => {
    return dailyBalances.slice(0, 14).map(d => ({
      date: format(parseISO(d.date), 'MMM dd'),
      Common: d.commonExpenses,
      Stock: d.stockPurchases,
      Casual: d.casualExpenses,
      Total: d.totalExpenses,
      Sales: d.totalSales,
      Profit: d.profit
    })).reverse()
  }, [dailyBalances])

  // Category data for casual expenses
  const categoryData = useMemo(() => {
    const data: Record<string, number> = {}
    filteredCasualExpenses.forEach(e => {
      data[e.category] = (data[e.category] || 0) + e.amount
    })
    return Object.entries(data).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 8)
  }, [filteredCasualExpenses])

  // Status breakdown
  const statusData = useMemo(() => {
    const paid = filteredCasualExpenses.filter(e => e.status === 'Paid').reduce((s, e) => s + e.amount, 0)
    const pending = filteredCasualExpenses.filter(e => e.status === 'Pending').reduce((s, e) => s + e.amount, 0)
    return [
      { name: "Paid", value: paid, color: "#10b981" },
      { name: "Pending", value: pending, color: "#f59e0b" }
    ]
  }, [filteredCasualExpenses])

  const handleDateFilterChange = (type: DateFilterType) => {
    setDateFilterType(type)
    if (type === 'custom') {
      if (!customStartDate || !customEndDate) {
        const now = new Date()
        setCustomStartDate(new Date(now.setHours(0, 0, 0, 0)))
        setCustomEndDate(new Date(now.setHours(23, 59, 59, 999)))
      }
    } else if (type !== 'dayOfWeek') {
      setSelectedDayOfWeek('')
    }
  }

  const getDateRangeDisplayText = () => {
    const { start, end } = getCurrentDateRange
    if (dateFilterType === 'dayOfWeek' && selectedDayOfWeek) {
      const dayConfig = DAYS_OF_WEEK.find(d => d.value === selectedDayOfWeek)
      return `${dayConfig?.label} - ${format(start, 'PPP')}`
    }
    if (dateFilterType === 'custom' && customStartDate && customEndDate) {
      return `${format(customStartDate, 'PPP')} - ${format(customEndDate, 'PPP')}`
    }
    if (dateFilterType === 'today') return format(new Date(), 'PPP')
    if (dateFilterType === 'yesterday') return format(subDays(new Date(), 1), 'PPP')
    if (dateFilterType === 'week') return `Week of ${format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'MMM dd')}`
    if (dateFilterType === 'month') return format(new Date(), 'MMMM yyyy')
    if (dateFilterType === 'year') return format(new Date(), 'yyyy')
    return 'All Time'
  }

  const handleExportAll = () => {
    const exportData = dailyBalances.map(d => ({
      'Date': d.formattedDate,
      'Cash Amount': d.cashAmount,
      'Bank Amount': d.bankAmount,
      'Total Cash': d.totalCash,
      'Common Expenses': d.commonExpenses,
      'Stock Purchases': d.stockPurchases,
      'Casual Expenses': d.casualExpenses,
      'Total Expenses': d.totalExpenses,
      'Balance': d.balance,
      'Pending Expenses': d.pendingExpenses,
      'Card Sales': d.cardSales,
      'Total Sales': d.totalSales,
      'Profit': d.profit
    }))
    exportToExcel(exportData, `financial_report_${format(new Date(), 'yyyy-MM-dd')}`)
  }

  const renderExpenseChart = () => {
    switch (expenseChartView) {
      case 'bar':
        return (
          <BarChart data={expenseTrendData}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="date" />
            <YAxis tickFormatter={(v) => formatShortCurrency(v)} />
            <Tooltip formatter={(value: number) => formatCurrency(value)} />
            <Legend />
            <Bar dataKey="Common" stackId="expenses" fill={EXPENSE_COLORS.Common} name="Common Expenses" />
            <Bar dataKey="Stock" stackId="expenses" fill={EXPENSE_COLORS.Stock} name="Stock Purchases" />
            <Bar dataKey="Casual" stackId="expenses" fill={EXPENSE_COLORS.Casual} name="Casual Expenses" />
          </BarChart>
        )
      case 'area':
        return (
          <AreaChart data={expenseTrendData}>
            <defs>
              <linearGradient id="commonGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={EXPENSE_COLORS.Common} stopOpacity={0.8}/>
                <stop offset="95%" stopColor={EXPENSE_COLORS.Common} stopOpacity={0.1}/>
              </linearGradient>
              <linearGradient id="stockGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={EXPENSE_COLORS.Stock} stopOpacity={0.8}/>
                <stop offset="95%" stopColor={EXPENSE_COLORS.Stock} stopOpacity={0.1}/>
              </linearGradient>
              <linearGradient id="casualGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={EXPENSE_COLORS.Casual} stopOpacity={0.8}/>
                <stop offset="95%" stopColor={EXPENSE_COLORS.Casual} stopOpacity={0.1}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="date" />
            <YAxis tickFormatter={(v) => formatShortCurrency(v)} />
            <Tooltip formatter={(value: number) => formatCurrency(value)} />
            <Legend />
            <Area type="monotone" dataKey="Common" stackId="1" stroke={EXPENSE_COLORS.Common} fill="url(#commonGrad)" name="Common Expenses" />
            <Area type="monotone" dataKey="Stock" stackId="1" stroke={EXPENSE_COLORS.Stock} fill="url(#stockGrad)" name="Stock Purchases" />
            <Area type="monotone" dataKey="Casual" stackId="1" stroke={EXPENSE_COLORS.Casual} fill="url(#casualGrad)" name="Casual Expenses" />
          </AreaChart>
        )
      case 'line':
        return (
          <LineChart data={expenseTrendData}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="date" />
            <YAxis tickFormatter={(v) => formatShortCurrency(v)} />
            <Tooltip formatter={(value: number) => formatCurrency(value)} />
            <Legend />
            <Line type="monotone" dataKey="Common" stroke={EXPENSE_COLORS.Common} name="Common Expenses" strokeWidth={2} />
            <Line type="monotone" dataKey="Stock" stroke={EXPENSE_COLORS.Stock} name="Stock Purchases" strokeWidth={2} />
            <Line type="monotone" dataKey="Casual" stroke={EXPENSE_COLORS.Casual} name="Casual Expenses" strokeWidth={2} />
            <Line type="monotone" dataKey="Total" stroke="#ef4444" name="Total Expenses" strokeWidth={3} />
          </LineChart>
        )
    }
  }

  if (isLoading) {
    return (
      <div className="flex-1 space-y-4 p-8 pt-6">
        <Skeleton className="w-[250px] h-[36px]" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (<Skeleton key={i} className="h-[125px] w-full" />))}
        </div>
        <Skeleton className="h-[350px] w-full" />
      </div>
    )
  }

  return (
    <div className="flex-col md:flex">
      <div className="flex-1 space-y-4 p-8 pt-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Financial Dashboard
            </h2>
            <p className="text-muted-foreground mt-1">
              Track expenses, cash flow, and sales in one place
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button onClick={() => router.push("/expe/expenses")} variant="default" className="bg-blue-600 hover:bg-blue-700">
              <Receipt className="mr-2 h-4 w-4" />
              Daily Expenses
            </Button>
            <Button onClick={() => setShowDailyCash(true)} variant="default" className="bg-green-600 hover:bg-green-700">
              <Wallet className="mr-2 h-4 w-4" />
              Daily Cash
            </Button>
            <Button onClick={handleExportAll} variant="outline">
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Export Report
            </Button>
          </div>
        </div>

        {/* Date Filter Section */}
        <Card className="rounded-2xl border-0 shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Date Range Filter
              </CardTitle>
              <div className="text-sm text-muted-foreground">
                {getDateRangeDisplayText()} • {dailyBalances.length} days
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Button variant={dateFilterType === 'all' ? "default" : "outline"} size="sm" onClick={() => handleDateFilterChange('all')}>All Time</Button>
                <Button variant={dateFilterType === 'today' ? "default" : "outline"} size="sm" onClick={() => handleDateFilterChange('today')}>Today</Button>
                <Button variant={dateFilterType === 'yesterday' ? "default" : "outline"} size="sm" onClick={() => handleDateFilterChange('yesterday')}>Yesterday</Button>
                <Button variant={dateFilterType === 'week' ? "default" : "outline"} size="sm" onClick={() => handleDateFilterChange('week')}>This Week</Button>
                <Button variant={dateFilterType === 'month' ? "default" : "outline"} size="sm" onClick={() => handleDateFilterChange('month')}>This Month</Button>
                <Button variant={dateFilterType === 'year' ? "default" : "outline"} size="sm" onClick={() => handleDateFilterChange('year')}>This Year</Button>
                
                <Select value={selectedDayOfWeek} onValueChange={(v) => { setSelectedDayOfWeek(v); setDateFilterType('dayOfWeek') }}>
                  <SelectTrigger className="w-[140px]">
                    <Calendar className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Select Day" />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS_OF_WEEK.map((day) => (<SelectItem key={day.value} value={day.value}>{day.label}</SelectItem>))}
                  </SelectContent>
                </Select>
                
                <Button variant={dateFilterType === 'custom' ? "default" : "outline"} size="sm" onClick={() => handleDateFilterChange('custom')}>Custom Range</Button>
              </div>

              {dateFilterType === 'custom' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                  <div>
                    <Label>Start Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full mt-1">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {customStartDate ? format(customStartDate, "PPP") : "Select start date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent><CalendarComponent mode="single" selected={customStartDate || undefined} onSelect={setCustomStartDate} /></PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <Label>End Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full mt-1">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {customEndDate ? format(customEndDate, "PPP") : "Select end date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent><CalendarComponent mode="single" selected={customEndDate || undefined} onSelect={setCustomEndDate} /></PopoverContent>
                    </Popover>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Filter Section */}
        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <Label>Search</Label>
                <Input placeholder="Search expenses..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>Category</Label>
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="All Categories" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {Array.from(new Set(casualExpenses.map((e) => e.category))).map((cat) => (<SelectItem key={cat} value={cat}>{cat}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Priority</Label>
                <Select value={filterPriority} onValueChange={setFilterPriority}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="All Priorities" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priorities</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="Low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="All Statuses" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="Paid">Paid</SelectItem>
                    <SelectItem value="Pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Sort By</Label>
                <div className="flex gap-2 mt-1">
                  <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="date">Date</SelectItem>
                      <SelectItem value="amount">Amount</SelectItem>
                      <SelectItem value="title">Title</SelectItem>
                      <SelectItem value="priority">Priority</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="icon" onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}>
                    {sortOrder === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPI Cards */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Total Cash</p>
              <p className="text-2xl font-bold text-purple-600">{formatCurrency(metrics.totalCash)}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-50 to-green-100">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Total Expenses</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(metrics.totalExpenses)}</p>
              <div className="flex gap-2 mt-1 text-xs">
                <span className="text-purple-600">Common: {formatShortCurrency(metrics.totalCommon)}</span>
                <span className="text-emerald-600">Stock: {formatShortCurrency(metrics.totalStock)}</span>
                <span className="text-amber-600">Casual: {formatShortCurrency(metrics.totalCasual)}</span>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Total Sales</p>
              <p className="text-2xl font-bold text-blue-600">{formatCurrency(metrics.totalSales)}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Net Profit</p>
              <p className={`text-2xl font-bold ${metrics.totalProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {formatCurrency(metrics.totalProfit)}
              </p>
              <p className="text-xs">Margin: {metrics.profitMargin.toFixed(1)}%</p>
            </CardContent>
          </Card>
        </div>

        {/* Expense Breakdown Cards */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
          <Card className="border-l-4 border-l-purple-500">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Common Expenses</p>
                  <p className="text-xl font-bold text-purple-600">{formatCurrency(metrics.totalCommon)}</p>
                  <p className="text-xs text-muted-foreground">Recurring operational costs</p>
                </div>
                <Landmark className="h-8 w-8 text-purple-400" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-emerald-500">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Stock Purchases</p>
                  <p className="text-xl font-bold text-emerald-600">{formatCurrency(metrics.totalStock)}</p>
                  <p className="text-xs text-muted-foreground">Inventory & raw materials</p>
                </div>
                <Package className="h-8 w-8 text-emerald-400" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-amber-500">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Casual Expenses</p>
                  <p className="text-xl font-bold text-amber-600">{formatCurrency(metrics.totalCasual)}</p>
                  <p className="text-xs text-muted-foreground">One-time & unexpected</p>
                </div>
                <Receipt className="h-8 w-8 text-amber-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Expense Trends Chart */}
        <Card className="rounded-2xl border-0 shadow-lg overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Expense Trends</CardTitle>
              <CardDescription>Daily breakdown of all expense types</CardDescription>
            </div>
            <div className="flex gap-1">
              <Button variant={expenseChartView === 'bar' ? "default" : "outline"} size="sm" onClick={() => setExpenseChartView('bar')}>Bar</Button>
              <Button variant={expenseChartView === 'area' ? "default" : "outline"} size="sm" onClick={() => setExpenseChartView('area')}>Area</Button>
              <Button variant={expenseChartView === 'line' ? "default" : "outline"} size="sm" onClick={() => setExpenseChartView('line')}>Line</Button>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              {renderExpenseChart()}
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Sales vs Expenses Chart */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Sales vs Expenses</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={expenseTrendData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="date" />
                  <YAxis tickFormatter={(v) => formatShortCurrency(v)} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Legend />
                  <Line type="monotone" dataKey="Sales" stroke="#3b82f6" name="Sales" strokeWidth={2} />
                  <Line type="monotone" dataKey="Total" stroke="#ef4444" name="Expenses" strokeWidth={2} />
                  <Line type="monotone" dataKey="Profit" stroke="#10b981" name="Profit" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Expense Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={[
                    { name: "Common", value: metrics.totalCommon, color: EXPENSE_COLORS.Common },
                    { name: "Stock", value: metrics.totalStock, color: EXPENSE_COLORS.Stock },
                    { name: "Casual", value: metrics.totalCasual, color: EXPENSE_COLORS.Casual }
                  ]} cx="50%" cy="50%" labelLine={false} label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`} outerRadius={80} dataKey="value">
                    {[
                      { name: "Common", value: metrics.totalCommon, color: EXPENSE_COLORS.Common },
                      { name: "Stock", value: metrics.totalStock, color: EXPENSE_COLORS.Stock },
                      { name: "Casual", value: metrics.totalCasual, color: EXPENSE_COLORS.Casual }
                    ].map((entry, idx) => (<Cell key={`cell-${idx}`} fill={entry.color} />))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Category Breakdown */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4" />
                Expenses by Category
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={categoryData} cx="50%" cy="50%" labelLine={false} label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`} outerRadius={80} dataKey="value">
                    {categoryData.map((_, idx) => (<Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                Paid vs Pending
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" labelLine={false} label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`} outerRadius={80} dataKey="value">
                    <Cell fill="#10b981" />
                    <Cell fill="#f59e0b" />
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Pending Expenses Section */}
        {filteredCasualExpenses.filter(e => e.status === 'Pending').length > 0 && (
          <Card className="border-yellow-200">
            <CardHeader className="bg-yellow-50/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-yellow-600" />
                  <CardTitle className="text-yellow-600">Pending Expenses ({metrics.pendingCount})</CardTitle>
                </div>
                <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
                  Total: {formatCurrency(metrics.pendingAmount)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="pending-list">
                  <AccordionTrigger>View Pending Expenses</AccordionTrigger>
                  <AccordionContent>
                    <div className="rounded-md border mt-2 overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Title</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Priority</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredCasualExpenses.filter(e => e.status === 'Pending').map((expense) => (
                            <TableRow key={expense._id} className="hover:bg-yellow-50/50">
                              <TableCell className="font-medium">{expense.title}</TableCell>
                              <TableCell className="text-right">{formatCurrency(expense.amount)}</TableCell>
                              <TableCell>{expense.category}</TableCell>
                              <TableCell>{format(new Date(expense.date), "PP")}</TableCell>
                              <TableCell><Badge variant={expense.priority === "High" ? "destructive" : expense.priority === "Medium" ? "default" : "secondary"}>{expense.priority}</Badge></TableCell>
                              <TableCell><Badge variant="outline" className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" />Pending</Badge></TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        )}

        {/* Daily Balance Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle>Daily Financial Summary</CardTitle>
              <Button onClick={handleExportAll} variant="outline" size="sm">
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Export
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Cash</TableHead>
                    <TableHead className="text-right">Bank</TableHead>
                    <TableHead className="text-right">Total Cash</TableHead>
                    <TableHead className="text-right">Common</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                    <TableHead className="text-right">Casual</TableHead>
                    <TableHead className="text-right">Total Expenses</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead className="text-right">Sales</TableHead>
                    <TableHead className="text-right">Profit</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dailyBalances.slice(0, 15).map((balance) => (
                    <TableRow key={balance.date}>
                      <TableCell className="font-medium">{balance.formattedDate}</TableCell>
                      <TableCell className="text-right text-blue-600">{formatCurrency(balance.cashAmount)}</TableCell>
                      <TableCell className="text-right text-blue-600">{formatCurrency(balance.bankAmount)}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(balance.totalCash)}</TableCell>
                      <TableCell className="text-right text-purple-600">{formatCurrency(balance.commonExpenses)}</TableCell>
                      <TableCell className="text-right text-emerald-600">{formatCurrency(balance.stockPurchases)}</TableCell>
                      <TableCell className="text-right text-amber-600">{formatCurrency(balance.casualExpenses)}</TableCell>
                      <TableCell className="text-right text-red-600">{formatCurrency(balance.totalExpenses)}</TableCell>
                      <TableCell className={`text-right font-bold ${balance.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(balance.balance)}
                      </TableCell>
                      <TableCell className="text-right text-blue-600">{formatCurrency(balance.totalSales)}</TableCell>
                      <TableCell className={`text-right ${balance.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(balance.profit)}
                      </TableCell>
                      <TableCell className="text-center">
                        {balance.pendingCount > 0 ? (
                          <Badge variant="outline" className="bg-yellow-100 text-yellow-800">{balance.pendingCount} Pending</Badge>
                        ) : (
                          <Badge variant="outline" className="bg-green-100 text-green-800">Clear</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {dailyBalances.length > 15 && (
              <div className="mt-4 text-center text-sm text-muted-foreground">Showing 15 of {dailyBalances.length} days</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Daily Cash Dialog */}
      <DailyCashDialog open={showDailyCash} onOpenChange={setShowDailyCash} />
    </div>
    
  )
}