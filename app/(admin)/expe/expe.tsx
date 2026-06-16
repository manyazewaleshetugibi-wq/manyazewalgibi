"use client"

import { useState, useEffect, useMemo } from "react"
import { format, subDays, startOfMonth, eachDayOfInterval, isWithinInterval } from "date-fns"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Landmark,
  Receipt,
  Wallet,
  CalendarIcon,
  ChevronRight
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// Import the ExpenseList component from your profit page
import { ExpenseList } from "@/components/CommonExpenses/ExpenseList"

// ============================================================================
// TYPES
// ============================================================================

type DateFilterType = 'today' | 'yesterday' | '7d' | '14d' | '28d' | 'month'

interface CommonExpense {
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
  createdBy: string
  createdAt: string
}

interface CasualExpense {
  _id: string
  title: string
  description: string
  amount: number
  category: string
  date: string
  priority: "Low" | "Medium" | "High"
  status: "Paid" | "Pending"
}

interface DailyCashEntry {
  _id: string
  date: string
  cashAmount: number
  bankAmount: number
  zedAmount: number
  totalAmount: number
  notes?: string
  createdAt: string
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

async function fetchCommonExpenses(): Promise<CommonExpense[]> {
  const response = await fetch("/api/common-expense")
  if (!response.ok) throw new Error("Failed to fetch common expenses")
  const data = await response.json()
  return data.data || []
}

async function createCommonExpense(expense: any): Promise<CommonExpense> {
  const response = await fetch('/api/common-expense', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(expense),
  })
  if (!response.ok) throw new Error("Failed to create expense")
  const data = await response.json()
  return data.data
}

async function updateCommonExpense(id: string, expense: any): Promise<CommonExpense> {
  const response = await fetch(`/api/common-expense/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(expense),
  })
  if (!response.ok) throw new Error("Failed to update expense")
  const data = await response.json()
  return data.data
}

async function deleteCommonExpense(id: string): Promise<boolean> {
  const response = await fetch(`/api/common-expense?id=${id}`, { method: 'DELETE' })
  return response.ok
}

async function fetchCasualExpenses(): Promise<CasualExpense[]> {
  const response = await fetch("/api/expense")
  if (!response.ok) throw new Error("Failed to fetch casual expenses")
  const data = await response.json()
  return data.data || []
}

async function createCasualExpense(expense: any): Promise<CasualExpense> {
  const response = await fetch('/api/expense', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(expense),
  })
  if (!response.ok) throw new Error("Failed to create expense")
  const data = await response.json()
  return data.data
}

async function updateCasualExpense(id: string, expense: any): Promise<CasualExpense> {
  const response = await fetch(`/api/expense/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(expense),
  })
  if (!response.ok) throw new Error("Failed to update expense")
  const data = await response.json()
  return data.data
}

async function deleteCasualExpense(id: string): Promise<boolean> {
  const response = await fetch(`/api/expense?id=${id}`, { method: 'DELETE' })
  return response.ok
}

async function fetchDailyCash(): Promise<DailyCashEntry[]> {
  const response = await fetch("/api/daily-cash")
  if (!response.ok) throw new Error("Failed to fetch daily cash")
  const data = await response.json()
  return data.data || []
}

async function createDailyCash(entry: any): Promise<DailyCashEntry> {
  const response = await fetch('/api/daily-cash', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entry),
  })
  if (!response.ok) throw new Error("Failed to create daily cash entry")
  const data = await response.json()
  return data.data
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { 
    style: 'currency', 
    currency: 'ETB', 
    minimumFractionDigits: 2 
  }).format(amount)
}

function getDateRange(filterType: DateFilterType): { start: Date; end: Date } {
  const now = new Date()
  const end = new Date(now)
  end.setHours(23, 59, 59, 999)
  
  switch (filterType) {
    case 'today':
      const todayStart = new Date(now)
      todayStart.setHours(0, 0, 0, 0)
      return { start: todayStart, end }
    case 'yesterday':
      const yesterday = subDays(now, 1)
      const yesterdayStart = new Date(yesterday)
      yesterdayStart.setHours(0, 0, 0, 0)
      const yesterdayEnd = new Date(yesterday)
      yesterdayEnd.setHours(23, 59, 59, 999)
      return { start: yesterdayStart, end: yesterdayEnd }
    case '7d':
      return { start: subDays(now, 6), end }
    case '14d':
      return { start: subDays(now, 13), end }
    case '28d':
      return { start: subDays(now, 27), end }
    case 'month':
      return { start: startOfMonth(now), end }
    default:
      return { start: startOfMonth(now), end }
  }
}

// ============================================================================
// DATE FILTER COMPONENT
// ============================================================================

function DateFilter({ filterType, onFilterChange }: { 
  filterType: DateFilterType
  onFilterChange: (filter: DateFilterType) => void 
}) {
  return (
    <Card className="rounded-2xl border-0 shadow-lg">
      <CardContent className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            {['today', 'yesterday', '7d', '14d', '28d', 'month'].map((filter) => (
              <Button
                key={filter}
                variant={filterType === filter ? "default" : "outline"}
                size="sm"
                onClick={() => onFilterChange(filter as DateFilterType)}
                className="rounded-full px-4"
              >
                {filter === 'today' ? 'Today' : filter === 'yesterday' ? 'Yesterday' : filter === '7d' ? '7 Days' : filter === '14d' ? '14 Days' : filter === '28d' ? '28 Days' : 'Month'}
              </Button>
            ))}
          </div>
          <Badge variant="secondary" className="rounded-full px-4 py-2">
            <CalendarIcon className="h-3 w-3 mr-1" />
            {filterType === 'today' ? 'Today' : filterType === 'yesterday' ? 'Yesterday' : filterType === '7d' ? 'Last 7 Days' : filterType === '14d' ? 'Last 14 Days' : filterType === '28d' ? 'Last 28 Days' : 'This Month'}
          </Badge>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// MODULE CARD BUTTON COMPONENT
// ============================================================================

function ModuleCard({ 
  title, 
  value, 
  subtitle,
  icon: Icon, 
  color, 
  isActive, 
  onClick 
}: { 
  title: string
  value: string | number
  subtitle?: string
  icon: any
  color: string
  isActive: boolean
  onClick: () => void
}) {
  const colorStyles = {
    blue: "from-blue-500/10 to-blue-600/5",
    green: "from-green-500/10 to-green-600/5",
    purple: "from-purple-500/10 to-purple-600/5",
  }
  
  const iconStyles = {
    blue: "bg-blue-100 dark:bg-blue-900/30",
    green: "bg-green-100 dark:bg-green-900/30",
    purple: "bg-purple-100 dark:bg-purple-900/30",
  }
  
  const textStyles = {
    blue: "text-blue-600",
    green: "text-green-600",
    purple: "text-purple-600",
  }

  return (
    <div className="cursor-pointer transition-all hover:scale-105" onClick={onClick}>
      <Card className={`rounded-2xl border-0 shadow-lg bg-gradient-to-br ${colorStyles[color as keyof typeof colorStyles]} hover:shadow-xl transition-all ${isActive ? 'ring-2 ring-offset-2 ring-blue-500' : ''}`}>
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className={`p-3 rounded-2xl ${iconStyles[color as keyof typeof iconStyles]}`}>
              <Icon className={`h-6 w-6 ${textStyles[color as keyof typeof textStyles]}`} />
            </div>
            <ChevronRight className={`h-5 w-5 ${textStyles[color as keyof typeof textStyles]} opacity-60`} />
          </div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className={`text-3xl font-bold ${textStyles[color as keyof typeof textStyles]} mt-1`}>{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground mt-2">{subtitle}</p>}
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================================================
// CASUAL EXPENSE MANAGER COMPONENT
// ============================================================================

function CasualExpenseManager({ onRefresh }: { onRefresh?: () => void }) {
  const [expenses, setExpenses] = useState<CasualExpense[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingExpense, setEditingExpense] = useState<CasualExpense | null>(null)
  const [deletingExpense, setDeletingExpense] = useState<CasualExpense | null>(null)
  const [dateFilterType, setDateFilterType] = useState<DateFilterType>('today')
  const [searchTerm, setSearchTerm] = useState("")
  const [filterCategory, setFilterCategory] = useState("all")
  const [filterStatus, setFilterStatus] = useState("all")
  const [formData, setFormData] = useState({
    title: "",
    amount: "",
    category: "",
    date: new Date().toISOString().split('T')[0],
    priority: "Medium",
    status: "Pending",
    description: ""
  })

  const loadData = async () => {
    setIsLoading(true)
    try {
      const data = await fetchCasualExpenses()
      setExpenses(data)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  const filteredExpenses = useMemo(() => {
    const { start, end } = getDateRange(dateFilterType)
    
    return expenses.filter(e => {
      const expenseDate = new Date(e.date)
      const matchDate = isWithinInterval(expenseDate, { start, end })
      const matchSearch = searchTerm === "" || e.title.toLowerCase().includes(searchTerm.toLowerCase())
      const matchCategory = filterCategory === "all" || e.category === filterCategory
      const matchStatus = filterStatus === "all" || e.status === filterStatus
      
      return matchDate && matchSearch && matchCategory && matchStatus
    })
  }, [expenses, dateFilterType, searchTerm, filterCategory, filterStatus])

  const totals = useMemo(() => {
    const total = filteredExpenses.reduce((sum, e) => sum + e.amount, 0)
    const pending = filteredExpenses.filter(e => e.status === "Pending").reduce((sum, e) => sum + e.amount, 0)
    const paid = filteredExpenses.filter(e => e.status === "Paid").reduce((sum, e) => sum + e.amount, 0)
    return { total, pending, paid, count: filteredExpenses.length }
  }, [filteredExpenses])

  const handleAdd = () => {
    setEditingExpense(null)
    setFormData({
      title: "",
      amount: "",
      category: "",
      date: new Date().toISOString().split('T')[0],
      priority: "Medium",
      status: "Pending",
      description: ""
    })
    setShowForm(true)
  }

  const handleEdit = (expense: CasualExpense) => {
    setEditingExpense(expense)
    setFormData({
      title: expense.title,
      amount: expense.amount.toString(),
      category: expense.category,
      date: expense.date.split('T')[0],
      priority: expense.priority,
      status: expense.status,
      description: expense.description
    })
    setShowForm(true)
  }

  const handleDelete = async () => {
    if (!deletingExpense) return
    try {
      await deleteCasualExpense(deletingExpense._id)
      await loadData()
      if (onRefresh) onRefresh()
      setDeletingExpense(null)
    } catch (error) {
      console.error("Error deleting expense:", error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const payload = {
        title: formData.title,
        amount: parseFloat(formData.amount),
        category: formData.category,
        date: formData.date,
        priority: formData.priority,
        status: formData.status,
        description: formData.description
      }
      
      if (editingExpense) {
        await updateCasualExpense(editingExpense._id, payload)
      } else {
        await createCasualExpense(payload)
      }
      await loadData()
      if (onRefresh) onRefresh()
      setShowForm(false)
      setEditingExpense(null)
    } catch (error) {
      console.error("Error saving expense:", error)
    }
  }

  if (isLoading) return <div className="p-8"><Skeleton className="h-[400px] w-full" /></div>

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <h3 className="text-xl font-semibold">Casual Expenses</h3>
        <Button onClick={handleAdd} className="bg-green-600 hover:bg-green-700">
          <Receipt className="mr-2 h-4 w-4" />
          Add Casual Expense
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="rounded-xl">
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Total Expenses</p>
            <p className="text-xl font-bold text-red-600">{formatCurrency(totals.total)}</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl">
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Pending</p>
            <p className="text-xl font-bold text-yellow-600">{formatCurrency(totals.pending)}</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl">
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Paid</p>
            <p className="text-xl font-bold text-green-600">{formatCurrency(totals.paid)}</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl">
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Transactions</p>
            <p className="text-xl font-bold text-blue-600">{totals.count}</p>
          </CardContent>
        </Card>
      </div>

      {/* Date Filter */}
      <DateFilter filterType={dateFilterType} onFilterChange={setDateFilterType} />

      {/* Filters Bar */}
      <Card className="rounded-xl">
        <CardContent className="pt-4">
          <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
            <div>
              <Label className="text-xs text-muted-foreground">Search</Label>
              <Input
                placeholder="Search by title..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-9"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Category</Label>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="Food">Food</SelectItem>
                  <SelectItem value="Transport">Transport</SelectItem>
                  <SelectItem value="Utilities">Utilities</SelectItem>
                  <SelectItem value="Entertainment">Entertainment</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="Paid">Paid</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="rounded-2xl border-0 shadow-lg">
        <CardContent className="pt-6">
          <div className="rounded-md border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr className="border-b">
                  <th className="text-left p-3">Title</th>
                  <th className="text-right p-3">Amount</th>
                  <th className="text-left p-3">Category</th>
                  <th className="text-left p-3">Date</th>
                  <th className="text-left p-3">Priority</th>
                  <th className="text-left p-3">Status</th>
                  <th className="text-right p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredExpenses.map((expense) => (
                  <tr key={expense._id} className="border-b hover:bg-muted/50">
                    <td className="p-3 font-medium">{expense.title}</td>
                    <td className="text-right p-3">{formatCurrency(expense.amount)}</td>
                    <td className="p-3">
                      <span className="px-2 py-1 rounded-full bg-gray-100 text-xs">
                        {expense.category}
                      </span>
                    </td>
                    <td className="p-3">{new Date(expense.date).toLocaleDateString()}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded text-xs ${
                        expense.priority === 'High' ? 'bg-red-100 text-red-700' :
                        expense.priority === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {expense.priority}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded text-xs ${
                        expense.status === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {expense.status}
                      </span>
                    </td>
                    <td className="text-right p-3 space-x-1">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(expense)}>
                        Edit
                      </Button>
                      <Button variant="ghost" size="sm" className="text-red-600" onClick={() => setDeletingExpense(expense)}>
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredExpenses.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No casual expenses found for selected period
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingExpense ? "Edit Casual Expense" : "Add Casual Expense"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Title *</Label>
              <Input
                required
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
              />
            </div>
            <div>
              <Label>Amount *</Label>
              <Input
                type="number"
                step="0.01"
                required
                value={formData.amount}
                onChange={(e) => setFormData({...formData, amount: e.target.value})}
              />
            </div>
            <div>
              <Label>Category</Label>
              <Input
                value={formData.category}
                onChange={(e) => setFormData({...formData, category: e.target.value})}
              />
            </div>
            <div>
              <Label>Date</Label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({...formData, date: e.target.value})}
              />
            </div>
            <div>
              <Label>Priority</Label>
              <Select value={formData.priority} onValueChange={(v) => setFormData({...formData, priority: v as any})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Low">Low</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData({...formData, status: v as any})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Paid">Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="submit" className="flex-1">
                {editingExpense ? "Update" : "Create"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deletingExpense} onOpenChange={() => setDeletingExpense(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
          </DialogHeader>
          <p>Are you sure you want to delete "{deletingExpense?.title}"?</p>
          <div className="flex gap-3 pt-4">
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
            <Button variant="outline" onClick={() => setDeletingExpense(null)}>Cancel</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ============================================================================
// DAILY CASH MANAGER COMPONENT
// ============================================================================

function DailyCashManager({ onRefresh }: { onRefresh?: () => void }) {
  const [entries, setEntries] = useState<DailyCashEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [dateFilterType, setDateFilterType] = useState<DateFilterType>('today')
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    cashAmount: "",
    bankAmount: "",
    zedAmount: "",
    notes: "",
  })

  const loadData = async () => {
    setIsLoading(true)
    try {
      const data = await fetchDailyCash()
      setEntries(data)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  const filteredEntries = useMemo(() => {
    const { start, end } = getDateRange(dateFilterType)
    return entries
      .filter(e => {
        const entryDate = new Date(e.date)
        return isWithinInterval(entryDate, { start, end })
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [entries, dateFilterType])

  const totals = useMemo(() => {
    const totalCash = filteredEntries.reduce((sum, e) => sum + e.cashAmount, 0)
    const totalBank = filteredEntries.reduce((sum, e) => sum + e.bankAmount, 0)
    const totalZed = filteredEntries.reduce((sum, e) => sum + e.zedAmount, 0)
    return { totalCash, totalBank, totalZed, count: filteredEntries.length }
  }, [filteredEntries])

  const handleSubmit = async () => {
    if (!formData.zedAmount) return
    try {
      await createDailyCash({
        date: formData.date,
        cashAmount: parseFloat(formData.cashAmount) || 0,
        bankAmount: parseFloat(formData.bankAmount) || 0,
        zedAmount: parseFloat(formData.zedAmount) || 0,
        totalAmount: (parseFloat(formData.cashAmount) || 0) + (parseFloat(formData.bankAmount) || 0),
        notes: formData.notes,
      })
      await loadData()
      if (onRefresh) onRefresh()
      setShowForm(false)
      setFormData({ date: new Date().toISOString().split('T')[0], cashAmount: "", bankAmount: "", zedAmount: "", notes: "" })
    } catch (error) {
      console.error("Error saving:", error)
    }
  }

  if (isLoading) return <div className="p-8"><Skeleton className="h-[400px] w-full" /></div>

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <h3 className="text-xl font-semibold">Daily Cash & Z-Reports</h3>
        <Button onClick={() => setShowForm(true)} className="bg-purple-600 hover:bg-purple-700">
          <Wallet className="mr-2 h-4 w-4" />
          New Z-Report
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="rounded-xl">
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Total Cash</p>
            <p className="text-xl font-bold text-green-600">{formatCurrency(totals.totalCash)}</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl">
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Total Bank</p>
            <p className="text-xl font-bold text-blue-600">{formatCurrency(totals.totalBank)}</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl">
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Total Z-Report</p>
            <p className="text-xl font-bold text-purple-600">{formatCurrency(totals.totalZed)}</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl">
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Reports</p>
            <p className="text-xl font-bold text-gray-600">{totals.count}</p>
          </CardContent>
        </Card>
      </div>

      {/* Date Filter */}
      <DateFilter filterType={dateFilterType} onFilterChange={setDateFilterType} />

      {/* Table */}
      <Card className="rounded-2xl border-0 shadow-lg">
        <CardContent className="pt-6">
          <div className="rounded-md border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr className="border-b">
                  <th className="text-left p-3">Date</th>
                  <th className="text-right p-3">Cash</th>
                  <th className="text-right p-3">Bank</th>
                  <th className="text-right p-3">Zed Amount</th>
                  <th className="text-right p-3">Total</th>
                  <th className="text-left p-3">Notes</th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.map((entry) => (
                  <tr key={entry._id} className="border-b hover:bg-muted/50">
                    <td className="p-3 font-medium">{new Date(entry.date).toLocaleDateString()}</td>
                    <td className="text-right p-3 text-green-600">{formatCurrency(entry.cashAmount)}</td>
                    <td className="text-right p-3 text-blue-600">{formatCurrency(entry.bankAmount)}</td>
                    <td className="text-right p-3 text-purple-600 font-bold">{formatCurrency(entry.zedAmount)}</td>
                    <td className="text-right p-3 font-bold">{formatCurrency(entry.totalAmount)}</td>
                    <td className="p-3 max-w-[200px] truncate">{entry.notes || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredEntries.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No Z-Reports found for the selected period
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Z-Report Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Daily Cash & Z-Report</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Date</Label>
              <Input type="date" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} />
            </div>
            <div>
              <Label>Cash Amount</Label>
              <Input type="number" placeholder="0.00" value={formData.cashAmount} onChange={(e) => setFormData({...formData, cashAmount: e.target.value})} />
            </div>
            <div>
              <Label>Bank Amount</Label>
              <Input type="number" placeholder="0.00" value={formData.bankAmount} onChange={(e) => setFormData({...formData, bankAmount: e.target.value})} />
            </div>
            <div>
              <Label>Zed Amount (Cash in Drawer) *</Label>
              <Input type="number" placeholder="0.00" required value={formData.zedAmount} onChange={(e) => setFormData({...formData, zedAmount: e.target.value})} />
            </div>
            <div>
              <Label>Notes</Label>
              <Input type="text" value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} />
            </div>
            <Button onClick={handleSubmit} className="w-full bg-purple-600 hover:bg-purple-700">Save Z-Report</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function FinancialManagementPage() {
  const [activeModule, setActiveModule] = useState<'common' | 'casual' | 'cash'>('common')
  const [commonExpenses, setCommonExpenses] = useState<CommonExpense[]>([])
  const [showCommonManager, setShowCommonManager] = useState(false)
  const [commonDateFilterType, setCommonDateFilterType] = useState<DateFilterType>('today')
  const [metrics, setMetrics] = useState({
    commonCount: 0,
    activeCommon: 0,
    casualCount: 0,
    pendingCasualTotal: 0,
    paidCasualTotal: 0,
    lastCash: 0,
    totalZedAmount: 0,
  })

  const loadMetrics = async () => {
    try {
      const [common, casual, cash] = await Promise.all([
        fetchCommonExpenses(),
        fetchCasualExpenses(),
        fetchDailyCash(),
      ])
      setCommonExpenses(common)
      setMetrics({
        commonCount: common.length,
        activeCommon: common.filter((e: any) => e.isActive).length,
        casualCount: casual.length,
        pendingCasualTotal: casual.filter((e: any) => e.status === "Pending").reduce((s: number, e: any) => s + e.amount, 0),
        paidCasualTotal: casual.filter((e: any) => e.status === "Paid").reduce((s: number, e: any) => s + e.amount, 0),
        lastCash: cash[0]?.zedAmount || 0,
        totalZedAmount: cash.reduce((s: number, e: any) => s + e.zedAmount, 0),
      })
    } catch (error) {
      console.error("Error loading metrics:", error)
    }
  }

  useEffect(() => {
    loadMetrics()
  }, [])

  const filteredCommonExpenses = useMemo(() => {
    const { start, end } = getDateRange(commonDateFilterType)
    return commonExpenses.filter(e => {
      const expenseDate = new Date(e.startDate)
      return isWithinInterval(expenseDate, { start, end })
    })
  }, [commonExpenses, commonDateFilterType])

  const commonTotals = useMemo(() => {
    const total = filteredCommonExpenses.reduce((sum, e) => sum + e.amount, 0)
    const active = filteredCommonExpenses.filter(e => e.isActive).reduce((sum, e) => sum + e.amount, 0)
    return { total, active, count: filteredCommonExpenses.length }
  }, [filteredCommonExpenses])

  const handleAddCommonExpense = async (formData: any) => {
    try {
      await createCommonExpense(formData)
      await loadMetrics()
      setShowCommonManager(false)
    } catch (error) {
      console.error("Error adding expense:", error)
    }
  }

  const handleEditCommonExpense = async (id: string, formData: any) => {
    try {
      await updateCommonExpense(id, formData)
      await loadMetrics()
    } catch (error) {
      console.error("Error updating expense:", error)
    }
  }

  const handleDeleteCommonExpense = async (id: string) => {
    if (confirm('Are you sure you want to delete this expense?')) {
      try {
        await deleteCommonExpense(id)
        await loadMetrics()
      } catch (error) {
        console.error("Error deleting expense:", error)
      }
    }
  }

  const modules = [
    {
      id: 'common' as const,
      title: 'Common Expenses',
      value: metrics.commonCount,
      subtitle: `${metrics.activeCommon} active`,
      icon: Landmark,
      color: 'blue',
    },
    {
      id: 'casual' as const,
      title: 'Casual Expenses',
      value: formatCurrency(metrics.pendingCasualTotal + metrics.paidCasualTotal),
      subtitle: `${metrics.casualCount} total transactions`,
      icon: Receipt,
      color: 'green',
    },
    {
      id: 'cash' as const,
      title: 'Z-Reports',
      value: formatCurrency(metrics.totalZedAmount),
      subtitle: `Latest: ${formatCurrency(metrics.lastCash)}`,
      icon: Wallet,
      color: 'purple',
    },
  ]

  return (
    <div className="flex-1 space-y-6 p-8 pt-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Financial Management</h2>
        <p className="text-muted-foreground mt-1">Manage common expenses, casual transactions, and daily Z-reports</p>
      </div>

      {/* Card-style Module Buttons */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {modules.map((module) => (
          <ModuleCard
            key={module.id}
            {...module}
            isActive={activeModule === module.id}
            onClick={() => setActiveModule(module.id)}
          />
        ))}
      </div>

      {/* Common Expense Module */}
      {activeModule === 'common' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center flex-wrap gap-3">
            <h3 className="text-xl font-semibold">Common Expenses Management</h3>
            <Button onClick={() => setShowCommonManager(true)} className="bg-blue-600 hover:bg-blue-700">
              <Landmark className="mr-2 h-4 w-4" />
              Manage Common Expenses
            </Button>
          </div>

          {/* Summary Cards for Common Expenses */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="rounded-xl">
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">Total Common Expenses</p>
                <p className="text-xl font-bold text-blue-600">{formatCurrency(commonTotals.total)}</p>
              </CardContent>
            </Card>
            <Card className="rounded-xl">
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">Active Expenses</p>
                <p className="text-xl font-bold text-green-600">{formatCurrency(commonTotals.active)}</p>
              </CardContent>
            </Card>
            <Card className="rounded-xl">
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">Total Records</p>
                <p className="text-xl font-bold text-gray-600">{commonTotals.count}</p>
              </CardContent>
            </Card>
          </div>

          {/* Date Filter for Common Expenses */}
          <DateFilter filterType={commonDateFilterType} onFilterChange={setCommonDateFilterType} />

          {/* Common Expenses Table */}
          <Card className="rounded-2xl border-0 shadow-lg">
            <CardContent className="pt-6">
              <div className="rounded-md border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr className="border-b">
                      <th className="text-left p-3">Title</th>
                      <th className="text-right p-3">Amount</th>
                      <th className="text-left p-3">Category</th>
                      <th className="text-left p-3">Frequency</th>
                      <th className="text-left p-3">Start Date</th>
                      <th className="text-left p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCommonExpenses.map((expense) => (
                      <tr key={expense._id} className="border-b hover:bg-muted/50">
                        <td className="p-3 font-medium">{expense.title}</td>
                        <td className="text-right p-3">{formatCurrency(expense.amount)}</td>
                        <td className="p-3">
                          <span className="px-2 py-1 rounded-full bg-gray-100 text-xs">
                            {expense.category}
                          </span>
                        </td>
                        <td className="p-3 capitalize">{expense.frequency}</td>
                        <td className="p-3">{new Date(expense.startDate).toLocaleDateString()}</td>
                        <td className="p-3">
                          <span className={`px-2 py-1 rounded text-xs ${
                            expense.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                          }`}>
                            {expense.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                       </tr>
                    ))}
                  </tbody>
                </table>
                {filteredCommonExpenses.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No common expenses found for selected period
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* ExpenseList Dialog */}
          <Dialog open={showCommonManager} onOpenChange={setShowCommonManager}>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Manage Common Expenses</DialogTitle>
              </DialogHeader>
              <ExpenseList
                expenses={commonExpenses}
                isLoading={false}
                onAdd={handleAddCommonExpense}
                onEdit={handleEditCommonExpense}
                onDelete={handleDeleteCommonExpense}
                onRefresh={loadMetrics}
              />
            </DialogContent>
          </Dialog>
        </div>
      )}

      {/* Casual Expense Module */}
      {activeModule === 'casual' && (
        <CasualExpenseManager onRefresh={loadMetrics} />
      )}

      {/* Daily Cash Module */}
      {activeModule === 'cash' && (
        <DailyCashManager onRefresh={loadMetrics} />
      )}
    </div>
  )
}