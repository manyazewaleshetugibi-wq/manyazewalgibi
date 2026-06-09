"use client"

import { useState, useEffect, useMemo } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { format, subDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, parseISO, isSameDay, getDaysInMonth, isLeapYear } from "date-fns"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Calendar } from "@/components/ui/calendar"
import { Checkbox } from "@/components/ui/checkbox"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Toaster, toast } from "react-hot-toast"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CalendarIcon,
  Edit2,
  Filter,
  LayoutGrid,
  LayoutList,
  MoreHorizontal,
  Plus,
  Search,
  Trash2,
  Wallet,
  Package,
  Receipt,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ChevronRight,
} from "lucide-react"
import { Progress } from "@/components/ui/progress"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  AreaChart,
  Area,
  LineChart,
  Line,
} from "recharts"
import { useRouter } from "next/navigation"

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

interface StockItem {
  _id: string
  name: string
  currentStock: number
  minimumStock: number
  unit: string
  category?: string
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

interface OrderReport {
  dailySales: Record<string, number>
  orderCount: number
}

type CostFormData = Omit<CasualExpense, "_id" | "date" | "tags"> & {
  date: Date
  tags: string
}

type SortConfig = {
  key: keyof CasualExpense
  direction: "asc" | "desc"
}

type DateFilterType = 'today' | 'yesterday' | 'week' | 'month' | 'custom' | '7d' | '14d' | '28d'

// ============================================================================
// SCHEMAS
// ============================================================================

const costSchema = z.object({
  title: z.string().min(2, { message: "Title must be at least 2 characters." }),
  description: z.string().min(5, { message: "Description must be at least 5 characters." }),
  amount: z.number().positive({ message: "Amount must be positive." }),
  category: z.string().min(1, { message: "Category is required." }),
  date: z.date(),
  tags: z.string().transform((val) => val.split(",").map((tag) => tag.trim())),
  recurring: z.boolean().default(false),
  frequency: z.string().default("Monthly"),
  notes: z.string(),
  priority: z.enum(["Low", "Medium", "High"]),
  status: z.enum(["Paid", "Pending"]).default("Paid"),
})

// ============================================================================
// API FUNCTIONS
// ============================================================================

const API_BASE_URL = "/api"

// Casual Expenses API
const casualApi = {
  getCosts: () => fetch(`${API_BASE_URL}/expense`).then(res => res.json()).then(data => data.data || []),
  addCost: (cost: any) => fetch(`${API_BASE_URL}/expense`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cost),
  }).then(res => res.json()),
  updateCost: (id: string, cost: any) => fetch(`${API_BASE_URL}/expense/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cost),
  }).then(res => res.json()),
  deleteCost: (id: string) => fetch(`${API_BASE_URL}/expense/${id}`, {
    method: "DELETE",
  }).then(res => res.json()),
}

// Common Expenses API
const commonApi = {
  getExpenses: () => fetch(`${API_BASE_URL}/common-expense`).then(res => res.json()).then(data => data.data || []),
}

// Stock API
const stockApi = {
  getStockItems: () => fetch(`${API_BASE_URL}/stock`).then(res => res.json()).then(data => data.data || []),
  getStockPurchases: () => fetch(`${API_BASE_URL}/stock-purchase`).then(res => res.json()).then(data => {
    const purchases = data.purchases || data.data || []
    return purchases
  }),
}

// Sales API for revenue
const salesApi = {
  getOrderReport: () => fetch(`${API_BASE_URL}/order/report`).then(res => res.json()),
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const formatCurrency = (amount: number) => {
  if (isNaN(amount)) return "0.00 ETB"
  return new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount) + " ETB"
}

const formatShortCurrency = (value: number) => {
  if (isNaN(value)) return "0"
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`
  return value.toString()
}

// Helper function to get days in a quarter
function getDaysInQuarter(date: Date): number {
  const year = date.getFullYear()
  const month = date.getMonth()
  let quarterStartMonth: number
  let quarterEndMonth: number
  
  if (month < 3) { // Q1: Jan-Mar
    quarterStartMonth = 0
    quarterEndMonth = 2
  } else if (month < 6) { // Q2: Apr-Jun
    quarterStartMonth = 3
    quarterEndMonth = 5
  } else if (month < 9) { // Q3: Jul-Sep
    quarterStartMonth = 6
    quarterEndMonth = 8
  } else { // Q4: Oct-Dec
    quarterStartMonth = 9
    quarterEndMonth = 11
  }
  
  let totalDays = 0
  for (let m = quarterStartMonth; m <= quarterEndMonth; m++) {
    totalDays += new Date(year, m + 1, 0).getDate()
  }
  return totalDays
}

// FIXED: Improved daily amount calculation for common expenses
const getDailyCommonAmount = (expense: CommonExpense, date: Date): number => {
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
      // Daily expense: full amount every day
      return expense.amount
      
    case 'weekly': 
      // Weekly expense: spread across 7 days
      return expense.amount / 7
      
    case 'monthly': 
      // Monthly expense: spread across actual days in the month
      const daysInMonth = getDaysInMonth(date)
      return expense.amount / daysInMonth
      
    case 'quarterly': 
      // Quarterly expense: spread across actual days in the quarter
      const quarterDays = getDaysInQuarter(date)
      return expense.amount / quarterDays
      
    case 'yearly': 
      // Yearly expense: spread across 365 or 366 days
      const daysInYear = isLeapYear(date.getFullYear()) ? 366 : 365
      return expense.amount / daysInYear
      
    case 'one-time': 
      // One-time expense: only on the exact start date
      return isSameDay(date, start) ? expense.amount : 0
      
    default: 
      return 0
  }
}

const getDateRange = (type: DateFilterType, customStart?: Date, customEnd?: Date) => {
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

// ============================================================================
// EXPENSE FORM MODAL (Casual Expenses)
// ============================================================================

const ExpenseFormModal = ({
  defaultValues,
  onSubmit,
  mode = "create",
  onClose,
  loading = false,
}: {
  defaultValues?: Partial<CostFormData>
  onSubmit: (data: CostFormData) => Promise<void>
  mode?: "create" | "edit"
  onClose: () => void
  loading?: boolean
}) => {
  const form = useForm<CostFormData>({
    resolver: zodResolver(costSchema),
    defaultValues: {
      title: "",
      description: "",
      amount: 0,
      category: "",
      date: new Date(),
      tags: "",
      recurring: false,
      frequency: "Monthly",
      notes: "",
      priority: "Medium",
      status: "Paid",
      ...defaultValues,
    },
  })

  const handleSubmit = async (data: CostFormData) => {
    await onSubmit(data)
    onClose()
  }

  const casualCategories = [
    "Kitchen Equipment Repair", "Dining Area Maintenance", "Emergency Supplies",
    "Marketing Campaign", "Staff Uniforms", "Cleaning Supplies", "Office Supplies",
    "Transportation", "Legal Fees", "Event Expenses", "Miscellaneous", "Other"
  ]

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto pr-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input placeholder="Enter expense title" {...field} disabled={loading} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea placeholder="Enter description" {...field} disabled={loading} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Amount (ETB)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Enter amount"
                    {...field}
                    onChange={(e) => field.onChange(Number.parseFloat(e.target.value))}
                    disabled={loading}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={loading}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {casualCategories.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                        disabled={loading}
                      >
                        {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="priority"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Priority</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={loading}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="tags"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tags</FormLabel>
              <FormControl>
                <Input placeholder="Enter tags, separated by commas" {...field} disabled={loading} />
              </FormControl>
              <FormDescription>Enter tags separated by commas (e.g., "office, rent, monthly")</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="recurring"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} disabled={loading} />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Recurring Expense</FormLabel>
                  <FormDescription>This expense repeats regularly</FormDescription>
                </div>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={loading}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Paid">Paid</SelectItem>
                    <SelectItem value="Pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea placeholder="Additional notes" {...field} disabled={loading} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? (
            <>
              <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
              {mode === "create" ? "Adding..." : "Updating..."}
            </>
          ) : (
            mode === "create" ? "Add Expense" : "Update Expense"
          )}
        </Button>
      </form>
    </Form>
  )
}

// ============================================================================
// EXPENSE CARD COMPONENT (Casual Expenses)
// ============================================================================

const ExpenseCard = ({
  expense,
  onUpdate,
  onDelete,
  isUpdating,
}: {
  expense: CasualExpense
  onUpdate: (id: string, data: CostFormData) => void
  onDelete: (id: string) => void
  isUpdating: boolean
}) => {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">{expense.title}</CardTitle>
            <CardDescription>{expense.category}</CardDescription>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" disabled={isUpdating}>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <Dialog>
                <DialogTrigger asChild>
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    <Edit2 className="mr-2 h-4 w-4" /> Edit
                  </DropdownMenuItem>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Edit Expense</DialogTitle>
                    <DialogDescription>Make changes to this expense</DialogDescription>
                  </DialogHeader>
                  <ExpenseFormModal
                    mode="edit"
                    defaultValues={{
                      ...expense,
                      date: new Date(expense.date),
                      tags: expense.tags.join(", "),
                    }}
                    onSubmit={async (data) => onUpdate(expense._id, data)}
                    onClose={() => {}}
                    loading={isUpdating}
                  />
                </DialogContent>
              </Dialog>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive">
                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                  </DropdownMenuItem>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete the expense.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => onDelete(expense._id)} className="bg-destructive">
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Amount</span>
            <span className="text-xl font-bold text-amber-600">{formatCurrency(expense.amount)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Date</span>
            <span>{format(new Date(expense.date), "PP")}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Status</span>
            <Badge variant={expense.status === "Paid" ? "default" : "secondary"}>
              {expense.status}
            </Badge>
          </div>
          {expense.tags && expense.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {expense.tags.slice(0, 3).map((tag, idx) => (
                <Badge key={idx} variant="outline" className="text-xs">{tag}</Badge>
              ))}
              {expense.tags.length > 3 && <Badge variant="outline" className="text-xs">+{expense.tags.length - 3}</Badge>}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// EXPENSE TABLE COMPONENT (Casual Expenses)
// ============================================================================

const ExpenseTable = ({
  expenses,
  sortConfig,
  onSort,
  onUpdate,
  onDelete,
  updatingId,
}: {
  expenses: CasualExpense[]
  sortConfig: SortConfig
  onSort: (key: keyof CasualExpense) => void
  onUpdate: (id: string, data: CostFormData) => void
  onDelete: (id: string) => void
  updatingId: string | null
}) => {
  return (
    <div className="relative overflow-x-auto rounded-md border">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead onClick={() => onSort("title")} className="cursor-pointer">
              Title{" "}
              {sortConfig.key === "title" &&
                (sortConfig.direction === "asc" ? <ArrowUpIcon className="ml-1 inline h-4 w-4" /> : <ArrowDownIcon className="ml-1 inline h-4 w-4" />)}
            </TableHead>
            <TableHead onClick={() => onSort("amount")} className="cursor-pointer">
              Amount{" "}
              {sortConfig.key === "amount" &&
                (sortConfig.direction === "asc" ? <ArrowUpIcon className="ml-1 inline h-4 w-4" /> : <ArrowDownIcon className="ml-1 inline h-4 w-4" />)}
            </TableHead>
            <TableHead onClick={() => onSort("category")} className="cursor-pointer">
              Category{" "}
              {sortConfig.key === "category" &&
                (sortConfig.direction === "asc" ? <ArrowUpIcon className="ml-1 inline h-4 w-4" /> : <ArrowDownIcon className="ml-1 inline h-4 w-4" />)}
            </TableHead>
            <TableHead onClick={() => onSort("date")} className="cursor-pointer">
              Date{" "}
              {sortConfig.key === "date" &&
                (sortConfig.direction === "asc" ? <ArrowUpIcon className="ml-1 inline h-4 w-4" /> : <ArrowDownIcon className="ml-1 inline h-4 w-4" />)}
            </TableHead>
            <TableHead onClick={() => onSort("status")} className="cursor-pointer">
              Status{" "}
              {sortConfig.key === "status" &&
                (sortConfig.direction === "asc" ? <ArrowUpIcon className="ml-1 inline h-4 w-4" /> : <ArrowDownIcon className="ml-1 inline h-4 w-4" />)}
            </TableHead>
            <TableHead className="w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {expenses.map((expense) => (
            <TableRow key={expense._id} className="hover:bg-muted/30">
              <TableCell className="font-medium">{expense.title}</TableCell>
              <TableCell className="font-semibold text-amber-600">{formatCurrency(expense.amount)}</TableCell>
              <TableCell>
                <Badge variant="secondary" className="rounded-full">{expense.category}</Badge>
              </TableCell>
              <TableCell>{format(new Date(expense.date), "PP")}</TableCell>
              <TableCell>
                <Badge variant={expense.status === "Paid" ? "default" : "secondary"} className="rounded-full">
                  {expense.status}
                </Badge>
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" disabled={updatingId === expense._id}>
                      {updatingId === expense._id ? (
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      ) : (
                        <MoreHorizontal className="h-4 w-4" />
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <Dialog>
                      <DialogTrigger asChild>
                        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                          <Edit2 className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[650px] bg-white p-6 rounded-lg shadow-lg z-50">
                        <DialogHeader>
                          <DialogTitle>Edit Expense</DialogTitle>
                          <DialogDescription>Make changes to this expense</DialogDescription>
                        </DialogHeader>
                        <ExpenseFormModal
                          mode="edit"
                          defaultValues={{
                            ...expense,
                            date: new Date(expense.date),
                            tags: expense.tags.join(", "),
                          }}
                          onSubmit={async (data) => onUpdate(expense._id, data)}
                          onClose={() => {}}
                          loading={updatingId === expense._id}
                        />
                      </DialogContent>
                    </Dialog>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive">
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the expense.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => onDelete(expense._id)} className="bg-destructive">
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
          {expenses.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                No expenses found. Click "Add Expense" to create one.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}

// ============================================================================
// CASUAL EXPENSES PAGE (with Chart and Date Filter)
// ============================================================================

function CasualExpensesPage() {
  const [expenses, setExpenses] = useState<CasualExpense[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [isUpdating, setIsUpdating] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterCategory, setFilterCategory] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<CasualExpense["status"] | null>(null)
  const [viewMode, setViewMode] = useState<"table" | "grid">("table")
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: "date", direction: "desc" })
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [dateFilterType, setDateFilterType] = useState<DateFilterType>('today')
  const [customStartDate, setCustomStartDate] = useState<Date | null>(null)
  const [customEndDate, setCustomEndDate] = useState<Date | null>(null)
  const [chartView, setChartView] = useState<'bar' | 'area' | 'line'>('bar')

  const fetchExpenses = async () => {
    setIsLoading(true)
    try {
      const data = await casualApi.getCosts()
      setExpenses(data)
    } catch (error) {
      console.error("Error fetching expenses:", error)
      toast.error("Failed to load expenses")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchExpenses()
  }, [])

  // Get filtered expenses based on date range
  const getFilteredExpensesByDate = useMemo(() => {
    const { start, end } = getDateRange(dateFilterType, customStartDate || undefined, customEndDate || undefined)
    return expenses.filter(expense => {
      const expenseDate = new Date(expense.date)
      return expenseDate >= start && expenseDate <= end
    })
  }, [expenses, dateFilterType, customStartDate, customEndDate])

  // Chart data for casual expenses
  const chartData = useMemo(() => {
    const { start, end } = getDateRange(dateFilterType, customStartDate || undefined, customEndDate || undefined)
    const dates = eachDayOfInterval({ start, end })
    
    return dates.map(date => {
      const dateStr = format(date, 'yyyy-MM-dd')
      const dailyTotal = getFilteredExpensesByDate
        .filter(e => e.date && e.date.startsWith(dateStr) && e.status === 'Paid')
        .reduce((sum, e) => sum + e.amount, 0)
      
      return {
        date: format(date, 'MMM dd'),
        fullDate: dateStr,
        Amount: dailyTotal,
      }
    })
  }, [getFilteredExpensesByDate, dateFilterType, customStartDate, customEndDate])

  const filteredExpenses = useMemo(() => {
    return getFilteredExpensesByDate
      .filter((expense) =>
        expense.title?.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .filter((expense) => !filterCategory || expense.category === filterCategory)
      .filter((expense) => !filterStatus || expense.status === filterStatus)
      .sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === "asc" ? -1 : 1
        if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === "asc" ? 1 : -1
        return 0
      })
  }, [getFilteredExpensesByDate, searchTerm, filterCategory, filterStatus, sortConfig])

  const totalAmount = filteredExpenses.reduce((sum, e) => sum + e.amount, 0)
  const uniqueCategories = useMemo(() => [...new Set(expenses.map(e => e.category))], [expenses])

  const handleAddExpense = async (formData: CostFormData) => {
    setIsAdding(true)
    try {
      const expenseData = {
        ...formData,
        date: formData.date.toISOString(),
        tags: typeof formData.tags === "string" ? formData.tags.split(",").map((tag) => tag.trim()) : formData.tags,
      }
      const response = await casualApi.addCost(expenseData)
      if (response.success || response.data) {
        const newExpense = response.data || response
        setExpenses((prev) => [newExpense, ...prev])
        toast.success("Expense added successfully!")
        setIsDialogOpen(false)
      }
    } catch (error) {
      toast.error("Failed to add expense")
    } finally {
      setIsAdding(false)
    }
  }

  const handleUpdateExpense = async (id: string, formData: CostFormData) => {
    setIsUpdating(id)
    try {
      const expenseData = {
        ...formData,
        date: formData.date.toISOString(),
        tags: typeof formData.tags === "string" ? formData.tags.split(",").map((tag) => tag.trim()) : formData.tags,
      }
      const response = await casualApi.updateCost(id, expenseData)
      if (response.success || response.data) {
        const updatedExpense = response.data || response
        setExpenses((prev) => prev.map((exp) => exp._id === id ? updatedExpense : exp))
        toast.success("Expense updated successfully!")
      }
    } catch (error) {
      toast.error("Failed to update expense")
    } finally {
      setIsUpdating(null)
    }
  }

  const handleDeleteExpense = async (id: string) => {
    try {
      await casualApi.deleteCost(id)
      setExpenses((prev) => prev.filter((exp) => exp._id !== id))
      toast.success("Expense deleted successfully!")
    } catch (error) {
      toast.error("Failed to delete expense")
    }
  }

  const handleSort = (key: keyof CasualExpense) => {
    setSortConfig((current) => ({
      key,
      direction: current.key === key && current.direction === "asc" ? "desc" : "asc",
    }))
  }

  const getDateDisplayText = () => {
    const { start, end } = getDateRange(dateFilterType, customStartDate || undefined, customEndDate || undefined)
    switch (dateFilterType) {
      case 'today': return 'Today'
      case 'yesterday': return 'Yesterday'
      case 'week': return `Week of ${format(start, 'MMM dd')}`
      case 'month': return format(start, 'MMMM yyyy')
      case 'custom': return `${format(start, 'MMM dd')} - ${format(end, 'MMM dd, yyyy')}`
      default: return 'Today'
    }
  }

  const renderChart = () => {
    switch (chartView) {
      case 'bar':
        return (
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="date" />
            <YAxis tickFormatter={(v) => formatShortCurrency(v)} />
            <RechartsTooltip formatter={(value: number) => formatCurrency(value)} />
            <Bar dataKey="Amount" fill="#f59e0b" radius={[4, 4, 0, 0]} />
          </BarChart>
        )
      case 'area':
        return (
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="casualGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.1}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="date" />
            <YAxis tickFormatter={(v) => formatShortCurrency(v)} />
            <RechartsTooltip formatter={(value: number) => formatCurrency(value)} />
            <Area type="monotone" dataKey="Amount" stroke="#f59e0b" fill="url(#casualGradient)" />
          </AreaChart>
        )
      case 'line':
        return (
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="date" />
            <YAxis tickFormatter={(v) => formatShortCurrency(v)} />
            <RechartsTooltip formatter={(value: number) => formatCurrency(value)} />
            <Line type="monotone" dataKey="Amount" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} />
          </LineChart>
        )
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Casual Expenses</h2>
          <p className="text-muted-foreground">One-time and unexpected expenses</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search expenses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 w-[200px]"
            />
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <Filter className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[200px]">
              <DropdownMenuLabel>Filter Expenses</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setFilterCategory(null)}>All Categories</DropdownMenuItem>
              {uniqueCategories.map((category) => (
                <DropdownMenuItem key={category} onClick={() => setFilterCategory(category)}>
                  {category}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setFilterStatus(null)}>All Statuses</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterStatus("Paid")}>Paid</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterStatus("Pending")}>Pending</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <div className="flex border rounded-md overflow-hidden">
            <Button
              variant={viewMode === 'table' ? 'default' : 'ghost'}
              size="sm"
              className="rounded-none px-3"
              onClick={() => setViewMode('table')}
            >
              <LayoutList className="h-4 w-4 mr-2" />
              Table
            </Button>
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              className="rounded-none px-3"
              onClick={() => setViewMode('grid')}
            >
              <LayoutGrid className="h-4 w-4 mr-2" />
              Grid
            </Button>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button disabled={isAdding}>
                <Plus className="mr-2 h-4 w-4" /> Add Expense
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[650px] bg-white p-6 rounded-lg shadow-lg z-50">
              <DialogHeader>
                <DialogTitle>Add New Casual Expense</DialogTitle>
                <DialogDescription>Fill in the details below to add a new expense.</DialogDescription>
              </DialogHeader>
              <ExpenseFormModal onSubmit={handleAddExpense} onClose={() => setIsDialogOpen(false)} loading={isAdding} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Date Filter Bar */}
      <Card className="rounded-2xl border-0 shadow-lg">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap gap-2">
              {['today', 'yesterday', 'week', 'month'].map((filter) => (
                <Button
                  key={filter}
                  variant={dateFilterType === filter ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setDateFilterType(filter as DateFilterType)
                    setCustomStartDate(null)
                    setCustomEndDate(null)
                  }}
                  className="rounded-full px-4 capitalize"
                >
                  {filter === 'today' ? 'Today' : filter === 'yesterday' ? 'Yesterday' : filter === 'week' ? 'This Week' : 'This Month'}
                </Button>
              ))}
              <Button
                variant={dateFilterType === 'custom' ? "default" : "outline"}
                size="sm"
                onClick={() => setDateFilterType('custom')}
                className="rounded-full px-4"
              >
                Custom
              </Button>
            </div>
            <Badge variant="secondary" className="rounded-full px-4 py-2">
              <CalendarIcon className="h-3 w-3 mr-1" />
              {getDateDisplayText()}
            </Badge>
          </div>
          
          {dateFilterType === 'custom' && (
            <div className="flex gap-4 mt-4">
              <div>
                <label className="text-sm font-medium">Start Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="ml-2">
                      {customStartDate ? format(customStartDate, "PPP") : "Select"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent>
                    <Calendar mode="single" selected={customStartDate || undefined} onSelect={setCustomStartDate} />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <label className="text-sm font-medium">End Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="ml-2">
                      {customEndDate ? format(customEndDate, "PPP") : "Select"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent>
                    <Calendar mode="single" selected={customEndDate || undefined} onSelect={setCustomEndDate} />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Chart Section */}
      <Card className="rounded-2xl border-0 shadow-lg overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Expense Trends</CardTitle>
            <CardDescription>Daily casual expenses over time</CardDescription>
          </div>
          <div className="flex gap-1">
            <Button variant={chartView === 'bar' ? "default" : "outline"} size="sm" onClick={() => setChartView('bar')}>
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button variant={chartView === 'area' ? "default" : "outline"} size="sm" onClick={() => setChartView('area')}>
              <TrendingUp className="h-4 w-4" />
            </Button>
            <Button variant={chartView === 'line' ? "default" : "outline"} size="sm" onClick={() => setChartView('line')}>
              <TrendingUp className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            {renderChart()}
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Filter Chips */}
      {(filterCategory || filterStatus) && (
        <div className="flex flex-wrap gap-2">
          <span className="text-sm text-muted-foreground">Active filters:</span>
          {filterCategory && (
            <Badge variant="secondary" className="gap-1">
              Category: {filterCategory}
              <XCircle className="h-3 w-3 ml-1 cursor-pointer" onClick={() => setFilterCategory(null)} />
            </Badge>
          )}
          {filterStatus && (
            <Badge variant="secondary" className="gap-1">
              Status: {filterStatus}
              <XCircle className="h-3 w-3 ml-1 cursor-pointer" onClick={() => setFilterStatus(null)} />
            </Badge>
          )}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-amber-50 to-amber-100">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Expenses</p>
            <p className="text-2xl font-bold text-amber-600">{filteredExpenses.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-50 to-green-100">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Amount</p>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(totalAmount)}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Paid Expenses</p>
            <p className="text-2xl font-bold text-blue-600">{getFilteredExpensesByDate.filter(e => e.status === 'Paid').length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Expenses Display */}
      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, index) => (
                <Skeleton key={index} className="h-20 w-full" />
              ))}
            </div>
          ) : filteredExpenses.length === 0 ? (
            <div className="flex h-[200px] items-center justify-center">
              <p className="text-muted-foreground">No expenses found.</p>
            </div>
          ) : viewMode === "table" ? (
            <ExpenseTable
              expenses={filteredExpenses}
              sortConfig={sortConfig}
              onSort={handleSort}
              onUpdate={handleUpdateExpense}
              onDelete={handleDeleteExpense}
              updatingId={isUpdating}
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredExpenses.map((expense) => (
                <ExpenseCard 
                  key={expense._id} 
                  expense={expense} 
                  onUpdate={handleUpdateExpense} 
                  onDelete={handleDeleteExpense}
                  isUpdating={isUpdating === expense._id}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================================================
// COMMON EXPENSES PAGE (with Chart and Date Filter) - FIXED
// ============================================================================

function CommonExpensesPage() {
  const [expenses, setExpenses] = useState<CommonExpense[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [dateFilterType, setDateFilterType] = useState<DateFilterType>('month')
  const [customStartDate, setCustomStartDate] = useState<Date | null>(null)
  const [customEndDate, setCustomEndDate] = useState<Date | null>(null)
  const [chartView, setChartView] = useState<'bar' | 'area' | 'line'>('bar')

  useEffect(() => {
    fetchCommonExpenses()
  }, [])

  const fetchCommonExpenses = async () => {
    setIsLoading(true)
    try {
      const data = await commonApi.getExpenses()
      setExpenses(data)
    } catch (error) {
      console.error("Error fetching common expenses:", error)
      toast.error("Failed to load common expenses")
    } finally {
      setIsLoading(false)
    }
  }

  // FIXED: Calculate daily common expenses based on date range with proper daily amounts
  const chartData = useMemo(() => {
    const { start, end } = getDateRange(dateFilterType, customStartDate || undefined, customEndDate || undefined)
    const dates = eachDayOfInterval({ start, end })
    
    return dates.map(date => {
      let dailyTotal = 0
      expenses.forEach(expense => {
        dailyTotal += getDailyCommonAmount(expense, date)
      })
      
      return {
        date: format(date, 'MMM dd'),
        fullDate: date,
        Amount: dailyTotal,
      }
    })
  }, [expenses, dateFilterType, customStartDate, customEndDate])

  // Calculate summary statistics
  const totalForPeriod = chartData.reduce((sum, day) => sum + day.Amount, 0)
  const averageDaily = chartData.length > 0 ? totalForPeriod / chartData.length : 0
  const monthlyProjected = averageDaily * 30

  const activeExpenses = expenses.filter(e => e.isActive)
  const totalMonthlyAmount = activeExpenses.reduce((sum, e) => {
    if (e.frequency === 'monthly') return sum + e.amount
    if (e.frequency === 'daily') return sum + (e.amount * 30)
    if (e.frequency === 'weekly') return sum + (e.amount * 4.33)
    if (e.frequency === 'yearly') return sum + (e.amount / 12)
    return sum + e.amount
  }, 0)

  const getFrequencyLabel = (freq: string) => {
    const labels: Record<string, string> = {
      daily: "Daily", weekly: "Weekly", monthly: "Monthly",
      quarterly: "Quarterly", yearly: "Yearly", "one-time": "One Time"
    }
    return labels[freq] || freq
  }

  const getDateDisplayText = () => {
    const { start, end } = getDateRange(dateFilterType, customStartDate || undefined, customEndDate || undefined)
    switch (dateFilterType) {
      case 'today': return 'Today'
      case 'yesterday': return 'Yesterday'
      case 'week': return `Week of ${format(start, 'MMM dd')}`
      case 'month': return format(start, 'MMMM yyyy')
      case 'custom': return `${format(start, 'MMM dd')} - ${format(end, 'MMM dd, yyyy')}`
      default: return format(start, 'MMMM yyyy')
    }
  }

  const renderChart = () => {
    switch (chartView) {
      case 'bar':
        return (
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="date" />
            <YAxis tickFormatter={(v) => formatShortCurrency(v)} />
            <RechartsTooltip 
              formatter={(value: number) => [formatCurrency(value), 'Daily Amount']}
              labelFormatter={(label) => `Date: ${label}`}
            />
            <Bar dataKey="Amount" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Daily Common Expenses" />
          </BarChart>
        )
      case 'area':
        return (
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="commonGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.1}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="date" />
            <YAxis tickFormatter={(v) => formatShortCurrency(v)} />
            <RechartsTooltip 
              formatter={(value: number) => [formatCurrency(value), 'Daily Amount']}
              labelFormatter={(label) => `Date: ${label}`}
            />
            <Area type="monotone" dataKey="Amount" stroke="#8b5cf6" fill="url(#commonGradient)" name="Daily Common Expenses" />
          </AreaChart>
        )
      case 'line':
        return (
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="date" />
            <YAxis tickFormatter={(v) => formatShortCurrency(v)} />
            <RechartsTooltip 
              formatter={(value: number) => [formatCurrency(value), 'Daily Amount']}
              labelFormatter={(label) => `Date: ${label}`}
            />
            <Line type="monotone" dataKey="Amount" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 4 }} name="Daily Common Expenses" />
          </LineChart>
        )
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Common Expenses</h2>
          <p className="text-muted-foreground">Recurring operational expenses (daily, weekly, monthly, etc.)</p>
        </div>
        <Button variant="outline" onClick={fetchCommonExpenses}>
          Refresh
        </Button>
      </div>

      {/* Date Filter Bar */}
      <Card className="rounded-2xl border-0 shadow-lg">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap gap-2">
              {['today', 'yesterday', 'week', 'month'].map((filter) => (
                <Button
                  key={filter}
                  variant={dateFilterType === filter ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setDateFilterType(filter as DateFilterType)
                    setCustomStartDate(null)
                    setCustomEndDate(null)
                  }}
                  className="rounded-full px-4 capitalize"
                >
                  {filter === 'today' ? 'Today' : filter === 'yesterday' ? 'Yesterday' : filter === 'week' ? 'This Week' : 'This Month'}
                </Button>
              ))}
              <Button
                variant={dateFilterType === 'custom' ? "default" : "outline"}
                size="sm"
                onClick={() => setDateFilterType('custom')}
                className="rounded-full px-4"
              >
                Custom
              </Button>
            </div>
            <Badge variant="secondary" className="rounded-full px-4 py-2">
              <CalendarIcon className="h-3 w-3 mr-1" />
              {getDateDisplayText()}
            </Badge>
          </div>
          
          {dateFilterType === 'custom' && (
            <div className="flex gap-4 mt-4">
              <div>
                <label className="text-sm font-medium">Start Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="ml-2">
                      {customStartDate ? format(customStartDate, "PPP") : "Select"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent>
                    <Calendar mode="single" selected={customStartDate || undefined} onSelect={setCustomStartDate} />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <label className="text-sm font-medium">End Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="ml-2">
                      {customEndDate ? format(customEndDate, "PPP") : "Select"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent>
                    <Calendar mode="single" selected={customEndDate || undefined} onSelect={setCustomEndDate} />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Chart Section */}
      <Card className="rounded-2xl border-0 shadow-lg overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Daily Common Expense Trends</CardTitle>
            <CardDescription>Daily breakdown of recurring expenses over time</CardDescription>
          </div>
          <div className="flex gap-1">
            <Button variant={chartView === 'bar' ? "default" : "outline"} size="sm" onClick={() => setChartView('bar')}>
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button variant={chartView === 'area' ? "default" : "outline"} size="sm" onClick={() => setChartView('area')}>
              <TrendingUp className="h-4 w-4" />
            </Button>
            <Button variant={chartView === 'line' ? "default" : "outline"} size="sm" onClick={() => setChartView('line')}>
              <TrendingUp className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            {renderChart()}
          </ResponsiveContainer>
          <div className="mt-4 text-center text-sm text-muted-foreground">
            Each bar represents the daily common expense amount (e.g., 50 ETB daily + 100 ETB from monthly = 150 ETB per day)
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Active Expenses</p>
            <p className="text-2xl font-bold text-purple-600">{activeExpenses.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total for Period</p>
            <p className="text-2xl font-bold text-blue-600">{formatCurrency(totalForPeriod)}</p>
            <p className="text-xs text-muted-foreground">Over {chartData.length} days</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Average Daily</p>
            <p className="text-2xl font-bold text-emerald-600">{formatCurrency(averageDaily)}</p>
            <p className="text-xs text-muted-foreground">Per day</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-50 to-amber-100">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Monthly Projected</p>
            <p className="text-2xl font-bold text-amber-600">{formatCurrency(monthlyProjected)}</p>
            <p className="text-xs text-muted-foreground">Based on 30-day month</p>
          </CardContent>
        </Card>
      </div>

      {/* Expenses Table with Frequency Explanation */}
      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : expenses.length === 0 ? (
            <div className="text-center py-12">
              <Wallet className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No common expenses found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Frequency</TableHead>
                    <TableHead className="text-right">Daily Equivalent</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.map((expense) => {
                    let dailyEquivalent = 0
                    switch (expense.frequency) {
                      case 'daily': dailyEquivalent = expense.amount; break
                      case 'weekly': dailyEquivalent = expense.amount / 7; break
                      case 'monthly': dailyEquivalent = expense.amount / 30; break
                      case 'quarterly': dailyEquivalent = expense.amount / 91.25; break
                      case 'yearly': dailyEquivalent = expense.amount / 365; break
                      case 'one-time': dailyEquivalent = 0; break
                    }
                    return (
                      <TableRow key={expense._id}>
                        <TableCell className="font-medium">{expense.title}</TableCell>
                        <TableCell>{expense.category}</TableCell>
                        <TableCell className="text-right font-semibold text-purple-600">
                          {formatCurrency(expense.amount)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="rounded-full">
                            {getFrequencyLabel(expense.frequency)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-emerald-600">
                          {dailyEquivalent > 0 ? formatCurrency(dailyEquivalent) : '-'}
                        </TableCell>
                        <TableCell>{format(parseISO(expense.startDate), 'PP')}</TableCell>
                        <TableCell>
                          <Badge className={expense.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}>
                            {expense.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Explanation Card */}
      <Card className="bg-gradient-to-r from-indigo-50 to-purple-50">
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">
            <strong>💡 How it works:</strong> Common expenses are recurring costs that are spread across days.
            For example, a 3,000 ETB monthly expense adds 100 ETB to each day (3,000 ÷ 30 days),
            while a 50 ETB daily expense adds 50 ETB to each day. Total daily common expenses = 150 ETB.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================================================
// STOCK PURCHASES PAGE (with Chart and Date Filter)
// ============================================================================

function StockPurchasesPage() {
  const [purchases, setPurchases] = useState<StockPurchase[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [dateFilterType, setDateFilterType] = useState<DateFilterType>('today')
  const [customStartDate, setCustomStartDate] = useState<Date | null>(null)
  const [customEndDate, setCustomEndDate] = useState<Date | null>(null)
  const [chartView, setChartView] = useState<'bar' | 'area' | 'line'>('bar')

  useEffect(() => {
    fetchStockPurchases()
  }, [])

  const fetchStockPurchases = async () => {
    setIsLoading(true)
    try {
      const purchasesData = await stockApi.getStockPurchases()
      const stocks = await stockApi.getStockItems()
      const stockMap = new Map(stocks.map(s => [s._id, s.name]))
      
      const enrichedPurchases = purchasesData.map((p: any) => ({
        ...p,
        stockName: stockMap.get(p.stockId) || "Unknown",
        totalAmount: (p.quantity || 0) * (p.unitPrice || 0)
      }))
      
      setPurchases(enrichedPurchases)
    } catch (error) {
      console.error("Error fetching stock purchases:", error)
      toast.error("Failed to load stock purchases")
    } finally {
      setIsLoading(false)
    }
  }

  // Get filtered purchases based on date range
  const getFilteredPurchasesByDate = useMemo(() => {
    const { start, end } = getDateRange(dateFilterType, customStartDate || undefined, customEndDate || undefined)
    return purchases.filter(purchase => {
      const purchaseDate = new Date(purchase.purchaseDate)
      return purchaseDate >= start && purchaseDate <= end
    })
  }, [purchases, dateFilterType, customStartDate, customEndDate])

  // Chart data for stock purchases
  const chartData = useMemo(() => {
    const { start, end } = getDateRange(dateFilterType, customStartDate || undefined, customEndDate || undefined)
    const dates = eachDayOfInterval({ start, end })
    
    return dates.map(date => {
      const dateStr = format(date, 'yyyy-MM-dd')
      const dailyTotal = getFilteredPurchasesByDate
        .filter(p => p.purchaseDate.startsWith(dateStr))
        .reduce((sum, p) => sum + p.totalAmount, 0)
      
      return {
        date: format(date, 'MMM dd'),
        Amount: dailyTotal,
      }
    })
  }, [getFilteredPurchasesByDate, dateFilterType, customStartDate, customEndDate])

  const filteredPurchases = useMemo(() => {
    return getFilteredPurchasesByDate.filter(p => 
      p.stockName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.supplier?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [getFilteredPurchasesByDate, searchTerm])

  const totalAmount = filteredPurchases.reduce((sum, p) => sum + p.totalAmount, 0)

  const getDateDisplayText = () => {
    const { start, end } = getDateRange(dateFilterType, customStartDate || undefined, customEndDate || undefined)
    switch (dateFilterType) {
      case 'today': return 'Today'
      case 'yesterday': return 'Yesterday'
      case 'week': return `Week of ${format(start, 'MMM dd')}`
      case 'month': return format(start, 'MMMM yyyy')
      case 'custom': return `${format(start, 'MMM dd')} - ${format(end, 'MMM dd, yyyy')}`
      default: return 'Today'
    }
  }

  const renderChart = () => {
    switch (chartView) {
      case 'bar':
        return (
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="date" />
            <YAxis tickFormatter={(v) => formatShortCurrency(v)} />
            <RechartsTooltip formatter={(value: number) => formatCurrency(value)} />
            <Bar dataKey="Amount" fill="#10b981" radius={[4, 4, 0, 0]} />
          </BarChart>
        )
      case 'area':
        return (
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="stockGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="date" />
            <YAxis tickFormatter={(v) => formatShortCurrency(v)} />
            <RechartsTooltip formatter={(value: number) => formatCurrency(value)} />
            <Area type="monotone" dataKey="Amount" stroke="#10b981" fill="url(#stockGradient)" />
          </AreaChart>
        )
      case 'line':
        return (
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="date" />
            <YAxis tickFormatter={(v) => formatShortCurrency(v)} />
            <RechartsTooltip formatter={(value: number) => formatCurrency(value)} />
            <Line type="monotone" dataKey="Amount" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
          </LineChart>
        )
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Stock Purchases</h2>
          <p className="text-muted-foreground">Track inventory and raw material purchases</p>
        </div>
        <Button variant="outline" onClick={fetchStockPurchases}>
          Refresh
        </Button>
      </div>

      {/* Date Filter Bar */}
      <Card className="rounded-2xl border-0 shadow-lg">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap gap-2">
              {['today', 'yesterday', 'week', 'month'].map((filter) => (
                <Button
                  key={filter}
                  variant={dateFilterType === filter ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setDateFilterType(filter as DateFilterType)
                    setCustomStartDate(null)
                    setCustomEndDate(null)
                  }}
                  className="rounded-full px-4 capitalize"
                >
                  {filter === 'today' ? 'Today' : filter === 'yesterday' ? 'Yesterday' : filter === 'week' ? 'This Week' : 'This Month'}
                </Button>
              ))}
              <Button
                variant={dateFilterType === 'custom' ? "default" : "outline"}
                size="sm"
                onClick={() => setDateFilterType('custom')}
                className="rounded-full px-4"
              >
                Custom
              </Button>
            </div>
            <Badge variant="secondary" className="rounded-full px-4 py-2">
              <CalendarIcon className="h-3 w-3 mr-1" />
              {getDateDisplayText()}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Chart Section */}
      <Card className="rounded-2xl border-0 shadow-lg overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Purchase Trends</CardTitle>
            <CardDescription>Daily stock purchase amounts over time</CardDescription>
          </div>
          <div className="flex gap-1">
            <Button variant={chartView === 'bar' ? "default" : "outline"} size="sm" onClick={() => setChartView('bar')}>
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button variant={chartView === 'area' ? "default" : "outline"} size="sm" onClick={() => setChartView('area')}>
              <TrendingUp className="h-4 w-4" />
            </Button>
            <Button variant={chartView === 'line' ? "default" : "outline"} size="sm" onClick={() => setChartView('line')}>
              <TrendingUp className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            {renderChart()}
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by item or supplier..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Purchases</p>
            <p className="text-2xl font-bold text-emerald-600">{filteredPurchases.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Amount</p>
            <p className="text-2xl font-bold text-blue-600">{formatCurrency(totalAmount)}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Unique Suppliers</p>
            <p className="text-2xl font-bold text-purple-600">
              {new Set(filteredPurchases.map(p => p.supplier)).size}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Purchases Table */}
      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredPurchases.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No stock purchases found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item Name</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Total Amount</TableHead>
                    <TableHead>Purchase Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPurchases.map((purchase) => (
                    <TableRow key={purchase._id}>
                      <TableCell className="font-medium">{purchase.stockName}</TableCell>
                      <TableCell>{purchase.supplier}</TableCell>
                      <TableCell className="text-right">{purchase.quantity}</TableCell>
                      <TableCell className="text-right">{formatCurrency(purchase.unitPrice)}</TableCell>
                      <TableCell className="text-right font-semibold text-emerald-600">
                        {formatCurrency(purchase.totalAmount)}
                      </TableCell>
                      <TableCell>{format(parseISO(purchase.purchaseDate), 'PP')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================================================
// CLICKABLE CARD COMPONENT
// ============================================================================

const ClickableCard = ({ title, value, icon, description, color, onClick }: {
  title: string
  value: string
  icon: React.ReactNode
  description: string
  color: string
  onClick: () => void
}) => {
  const colorStyles = {
    purple: "from-purple-500/10 to-purple-600/5",
    emerald: "from-emerald-500/10 to-emerald-600/5",
    amber: "from-amber-500/10 to-amber-600/5",
  }
  
  const iconStyles = {
    purple: "bg-purple-100 dark:bg-purple-900/30",
    emerald: "bg-emerald-100 dark:bg-emerald-900/30",
    amber: "bg-amber-100 dark:bg-amber-900/30",
  }
  
  const textStyles = {
    purple: "text-purple-600",
    emerald: "text-emerald-600",
    amber: "text-amber-600",
  }

  return (
    <div className="cursor-pointer transition-all hover:scale-105" onClick={onClick}>
      <Card className={`rounded-2xl border-0 shadow-lg bg-gradient-to-br ${colorStyles[color as keyof typeof colorStyles]} hover:shadow-xl transition-all`}>
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className={`p-3 rounded-2xl ${iconStyles[color as keyof typeof iconStyles]}`}>
              {icon}
            </div>
            <ChevronRight className={`h-5 w-5 ${textStyles[color as keyof typeof textStyles]} opacity-60`} />
          </div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className={`text-3xl font-bold ${textStyles[color as keyof typeof textStyles]} mt-1`}>{value}</p>
          <p className="text-xs text-muted-foreground mt-2">{description}</p>
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================================================
// MAIN ENHANCED EXPENSE PAGE
// ============================================================================

const CHART_COLORS = {
  common: "#8884D8",
  stock: "#00C49F",
  casual: "#FFBB28",
}

export default function EnhancedExpensePage() {
  const [commonExpenses, setCommonExpenses] = useState<CommonExpense[]>([])
  const [stockPurchases, setStockPurchases] = useState<StockPurchase[]>([])
  const [casualExpenses, setCasualExpenses] = useState<CasualExpense[]>([])
  const [orderReport, setOrderReport] = useState<OrderReport | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [dateFilterType, setDateFilterType] = useState<DateFilterType>('month')
  const [activePage, setActivePage] = useState<'dashboard' | 'casual' | 'common' | 'stock'>('dashboard')

  const fetchAllData = async () => {
    setIsLoading(true)
    try {
      const [common, purchases, casual, sales] = await Promise.all([
        commonApi.getExpenses(),
        stockApi.getStockPurchases(),
        casualApi.getCosts(),
        salesApi.getOrderReport(),
      ])
      
      setCommonExpenses(common)
      
      const stocks = await stockApi.getStockItems()
      const stockMap = new Map(stocks.map(s => [s._id, s.name]))
      const enrichedPurchases = purchases.map((p: any) => ({
        ...p,
        stockName: stockMap.get(p.stockId) || "Unknown",
        totalAmount: (p.quantity || 0) * (p.unitPrice || 0)
      }))
      setStockPurchases(enrichedPurchases)
      setCasualExpenses(casual)
      setOrderReport(sales)
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchAllData()
  }, [])

  const getDateRangeForDashboard = useMemo(() => {
    const now = new Date()
    switch (dateFilterType) {
      case '7d': return { start: subDays(now, 6), end: now }
      case '14d': return { start: subDays(now, 13), end: now }
      case '28d': return { start: subDays(now, 27), end: now }
      case 'today': return { start: new Date(now.setHours(0,0,0,0)), end: new Date(now.setHours(23,59,59,999)) }
      case 'yesterday': 
        const yesterday = subDays(now, 1)
        return { start: new Date(yesterday.setHours(0,0,0,0)), end: new Date(yesterday.setHours(23,59,59,999)) }
      case 'month': return { start: startOfMonth(now), end: now }
      default: return { start: startOfMonth(now), end: now }
    }
  }, [dateFilterType])

  const dailyExpenseData = useMemo(() => {
    const { start, end } = getDateRangeForDashboard
    const dates = eachDayOfInterval({ start, end })
    
    return dates.map(date => {
      const dateStr = format(date, 'yyyy-MM-dd')
      
      let commonTotal = 0
      commonExpenses.forEach(expense => {
        commonTotal += getDailyCommonAmount(expense, date)
      })
      
      const stockTotal = stockPurchases
        .filter(p => p.purchaseDate.startsWith(dateStr))
        .reduce((sum, p) => sum + p.totalAmount, 0)
      
      const casualTotal = casualExpenses
        .filter(e => e.date && e.date.startsWith(dateStr))
        .reduce((sum, e) => sum + e.amount, 0)
      
      return {
        date: format(date, 'MMM dd'),
        Common: commonTotal,
        Stock: stockTotal,
        Casual: casualTotal,
        Total: commonTotal + stockTotal + casualTotal,
      }
    })
  }, [commonExpenses, stockPurchases, casualExpenses, getDateRangeForDashboard])

  const totals = useMemo(() => {
    const totalCommon = dailyExpenseData.reduce((sum, d) => sum + d.Common, 0)
    const totalStock = dailyExpenseData.reduce((sum, d) => sum + d.Stock, 0)
    const totalCasual = dailyExpenseData.reduce((sum, d) => sum + d.Casual, 0)
    const totalExpenses = dailyExpenseData.reduce((sum, d) => sum + d.Total, 0)
    
    let totalRevenue = 0
    if (orderReport) {
      Object.entries(orderReport.dailySales).forEach(([date, sales]) => {
        const salesDate = new Date(date)
        const { start, end } = getDateRangeForDashboard
        if (salesDate >= start && salesDate <= end) {
          totalRevenue += sales
        }
      })
    }
    
    const totalProfit = totalRevenue - totalExpenses
    const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0
    
    return { 
      totalCommon, 
      totalStock, 
      totalCasual,
      totalExpenses, 
      totalRevenue, 
      totalProfit, 
      profitMargin 
    }
  }, [dailyExpenseData, casualExpenses, orderReport, getDateRangeForDashboard])

  const handleCasualClick = () => setActivePage('casual')
  const handleCommonClick = () => setActivePage('common')
  const handleStockClick = () => setActivePage('stock')
  const handleBackToDashboard = () => setActivePage('dashboard')

  if (activePage === 'casual') {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto py-6 px-4">
          <Button variant="ghost" onClick={handleBackToDashboard} className="mb-6 gap-2">
            ← Back to Dashboard
          </Button>
          <CasualExpensesPage />
        </main>
        <Toaster position="top-right" />
      </div>
    )
  }

  if (activePage === 'common') {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto py-6 px-4">
          <Button variant="ghost" onClick={handleBackToDashboard} className="mb-6 gap-2">
            ← Back to Dashboard
          </Button>
          <CommonExpensesPage />
        </main>
        <Toaster position="top-right" />
      </div>
    )
  }

  if (activePage === 'stock') {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto py-6 px-4">
          <Button variant="ghost" onClick={handleBackToDashboard} className="mb-6 gap-2">
            ← Back to Dashboard
          </Button>
          <StockPurchasesPage />
        </main>
        <Toaster position="top-right" />
      </div>
    )
  }

  // Dashboard View
  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto py-6 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Expense Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Track common expenses, stock purchases & casual expenses
          </p>
        </div>

        {/* Date Filter */}
        <Card className="mb-8 rounded-2xl border-0 shadow-lg">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap gap-2">
                {['today', 'yesterday', '7d', '14d', '28d', 'month'].map((filter) => (
                  <Button
                    key={filter}
                    variant={dateFilterType === filter ? "default" : "outline"}
                    size="sm"
                    onClick={() => setDateFilterType(filter as DateFilterType)}
                    className="rounded-full px-4"
                  >
                    {filter === 'today' ? 'Today' : filter === 'yesterday' ? 'Yesterday' : filter === '7d' ? '7 Days' : filter === '14d' ? '14 Days' : filter === '28d' ? '28 Days' : 'Month'}
                  </Button>
                ))}
              </div>
              <Badge variant="secondary" className="rounded-full px-4 py-2">
                <CalendarIcon className="h-3 w-3 mr-1" />
                {dateFilterType === 'today' ? 'Today' : dateFilterType === 'yesterday' ? 'Yesterday' : dateFilterType === '7d' ? 'Last 7 Days' : dateFilterType === '14d' ? 'Last 14 Days' : dateFilterType === '28d' ? 'Last 28 Days' : 'This Month'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* 3 Clickable Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <ClickableCard
            title="Common Expenses"
            value={formatCurrency(totals.totalCommon)}
            icon={<Wallet className="h-6 w-6 text-purple-600" />}
            description="Recurring operational costs"
            color="purple"
            onClick={handleCommonClick}
          />
          
          <ClickableCard
            title="Stock Purchases"
            value={formatCurrency(totals.totalStock)}
            icon={<Package className="h-6 w-6 text-emerald-600" />}
            description="Inventory & raw materials"
            color="emerald"
            onClick={handleStockClick}
          />
          
          <ClickableCard
            title="Casual Expenses"
            value={formatCurrency(totals.totalCasual)}
            icon={<Receipt className="h-6 w-6 text-amber-600" />}
            description="One-time & unexpected costs"
            color="amber"
            onClick={handleCasualClick}
          />
        </div>

        {/* Profit Summary Card */}
        <Card className="mb-8 rounded-2xl border-0 shadow-lg bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-purple-500/10">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center md:text-left">
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(totals.totalRevenue)}</p>
              </div>
              <div className="text-center md:text-left">
                <p className="text-sm text-muted-foreground">Total Expenses</p>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(totals.totalExpenses)}</p>
              </div>
              <div className="text-center md:text-left">
                <p className="text-sm text-muted-foreground">Net Profit</p>
                <p className={`text-2xl font-bold ${totals.totalProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {formatCurrency(totals.totalProfit)}
                </p>
              </div>
              <div className="text-center md:text-left">
                <p className="text-sm text-muted-foreground">Profit Margin</p>
                <p className={`text-2xl font-bold ${totals.profitMargin >= 20 ? 'text-emerald-600' : totals.profitMargin >= 0 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {totals.profitMargin.toFixed(1)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Expense Trends Bar Chart */}
        <Card className="rounded-2xl border-0 shadow-lg overflow-hidden">
          <CardHeader>
            <CardTitle>Expense Trends</CardTitle>
            <CardDescription>Daily breakdown of all expense types</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={dailyExpenseData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="date" />
                <YAxis tickFormatter={(v) => formatShortCurrency(v)} />
                <RechartsTooltip 
                  formatter={(value: number, name: string) => [formatCurrency(value), name]}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend />
                <Bar dataKey="Common" stackId="expenses" fill={CHART_COLORS.common} radius={[4, 4, 0, 0]} name="Common Expenses" />
                <Bar dataKey="Stock" stackId="expenses" fill={CHART_COLORS.stock} radius={[4, 4, 0, 0]} name="Stock Purchases" />
                <Bar dataKey="Casual" stackId="expenses" fill={CHART_COLORS.casual} radius={[4, 4, 0, 0]} name="Casual Expenses" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </main>
      <Toaster position="top-right" />
    </div>
  )
}

// XCircle component for filter chips
function XCircle(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  )
}