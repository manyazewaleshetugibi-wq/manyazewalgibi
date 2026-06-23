"use client"

<<<<<<< HEAD
import { useState, useEffect, useMemo } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { format, subDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, parseISO, isSameDay, getDaysInMonth, isLeapYear } from "date-fns"
=======
import { useState, useEffect, useMemo, useCallback } from "react"
import { format, subDays, startOfMonth, eachDayOfInterval, startOfDay, endOfDay } from "date-fns"
>>>>>>> 25883f75145db3982c304fa73e3ddbe5091f04c6
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
<<<<<<< HEAD
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
=======
import { Skeleton } from "@/components/ui/skeleton"
import { Toaster } from "react-hot-toast"
import { CalendarIcon, Package, Receipt, Wallet, ChevronRight, TrendingUp, TrendingDown, Sparkles, ArrowUpRight, ArrowDownRight, Loader2, AlertCircle, RefreshCw } from "lucide-react"
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend } from "recharts"
import { CasualExpenses } from "@/components/expanse/CasualExpenses"
import { CommonExpenses } from "@/components/expanse/CommonExpenses"
import { StockPurchases } from "@/components/expanse/StockPurchases"
import { commonApi, stockApi, casualApi, salesApi } from "@/services/expense.service"
import { CommonExpense, StockPurchase, CasualExpense, OrderReport, DateFilterType } from "@/types/expense.types"
import { formatCurrency, formatShortCurrency, getDailyCommonAmount, getDateRange } from "@/lib/utils/expense.utils"

const CHART_COLORS = {
  common: "#818CF8",
  stock: "#34D399",
  casual: "#FBBF24",
}

// Skeleton Card for loading state
const SkeletonCard = () => (
  <Card className="rounded-2xl border-0 shadow-lg bg-gradient-to-br from-gray-100/50 to-gray-200/30 dark:from-gray-800/30 dark:to-gray-700/20">
    <CardContent className="p-4 sm:p-6">
      <div className="flex items-start justify-between mb-3">
        <Skeleton className="h-12 w-12 rounded-xl" />
        <Skeleton className="h-5 w-5 rounded-full" />
      </div>
      <Skeleton className="h-4 w-24 mb-2" />
      <Skeleton className="h-8 w-32 mb-2" />
      <Skeleton className="h-3 w-28" />
    </CardContent>
  </Card>
)

// Enhanced Clickable Card with micro-interactions
const ClickableCard = ({ title, value, icon, description, color, onClick, trend, trendValue, isLoading }: {
>>>>>>> 25883f75145db3982c304fa73e3ddbe5091f04c6
  title: string
  value: string
  icon: React.ReactNode
  description: string
  color: string
  onClick: () => void
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
  isLoading?: boolean
}) => {
  const colorMap = {
    purple: { bg: "from-indigo-500/10 to-purple-500/5", icon: "bg-indigo-100 dark:bg-indigo-900/30", text: "text-indigo-600 dark:text-indigo-400", border: "hover:border-indigo-200 dark:hover:border-indigo-800", glow: "shadow-indigo-500/20" },
    emerald: { bg: "from-emerald-500/10 to-teal-500/5", icon: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-600 dark:text-emerald-400", border: "hover:border-emerald-200 dark:hover:border-emerald-800", glow: "shadow-emerald-500/20" },
    amber: { bg: "from-amber-500/10 to-yellow-500/5", icon: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-600 dark:text-amber-400", border: "hover:border-amber-200 dark:hover:border-amber-800", glow: "shadow-amber-500/20" },
  }

  const styles = colorMap[color as keyof typeof colorMap]

  if (isLoading) {
    return <SkeletonCard />
  }

  return (
    <div 
      className="cursor-pointer transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] group"
      onClick={onClick}
    >
      <Card className={`rounded-2xl border-2 border-transparent shadow-lg bg-gradient-to-br ${styles.bg} hover:shadow-xl ${styles.border} transition-all hover:${styles.glow}`}>
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-start justify-between mb-3">
            <div className={`p-2.5 rounded-xl ${styles.icon} transition-all group-hover:scale-110`}>
              {icon}
            </div>
            <ChevronRight className={`h-5 w-5 ${styles.text} opacity-40 group-hover:opacity-100 transition-all group-hover:translate-x-1`} />
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground font-medium">{title}</p>
          <div className="flex items-end justify-between mt-1">
            <p className={`text-2xl sm:text-3xl font-bold ${styles.text}`}>{value}</p>
            {trend && trendValue && (
              <div className={`flex items-center gap-0.5 text-xs font-medium ${trend === 'up' ? 'text-emerald-600' : trend === 'down' ? 'text-red-600' : 'text-gray-500'}`}>
                {trend === 'up' ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                {trendValue}
              </div>
            )}
          </div>
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-2 opacity-70">{description}</p>
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
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dateFilterType, setDateFilterType] = useState<DateFilterType>('today')
  const [activePage, setActivePage] = useState<'dashboard' | 'casual' | 'common' | 'stock'>('dashboard')

  const fetchAllData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
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
      setError("Failed to load expense data. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }, [])

  const refreshData = useCallback(async () => {
    setIsRefreshing(true)
    setError(null)
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
      console.error("Error refreshing data:", error)
      setError("Failed to refresh data. Please try again.")
    } finally {
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchAllData()
  }, [fetchAllData])

  const getDateRangeForDashboard = useMemo(() => {
    const now = new Date()
    switch (dateFilterType) {
      case 'today': 
        return { start: startOfDay(now), end: endOfDay(now) }
      case 'yesterday': 
        const yesterday = subDays(now, 1)
        return { start: startOfDay(yesterday), end: endOfDay(yesterday) }
      case '7d': return { start: subDays(now, 6), end: now }
      case '14d': return { start: subDays(now, 13), end: now }
      case '28d': return { start: subDays(now, 27), end: now }
      case 'month': return { start: startOfMonth(now), end: now }
      default: return { start: startOfDay(now), end: endOfDay(now) }
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
    
    return { 
      totalCommon, 
      totalStock, 
      totalCasual,
      totalExpenses, 
    }
  }, [dailyExpenseData])

  const filterButtons = [
    { value: 'today', label: '📅 Today' },
    { value: 'yesterday', label: '📆 Yesterday' },
    { value: '7d', label: '7 Days' },
    { value: '14d', label: '14 Days' },
    { value: '28d', label: '28 Days' },
    { value: 'month', label: '📈 Month' },
  ]

  const handleCasualClick = () => setActivePage('casual')
  const handleCommonClick = () => setActivePage('common')
  const handleStockClick = () => setActivePage('stock')
  const handleBackToDashboard = () => setActivePage('dashboard')

  if (activePage === 'casual') {
    return (
<<<<<<< HEAD
      <div className="min-h-screen bg-background">
        <main className="container mx-auto py-6 px-4">
          <Button variant="ghost" onClick={handleBackToDashboard} className="mb-6 gap-2">
            ← Back to Dashboard
          </Button>
          <CasualExpensesPage />
        </main>
        <Toaster position="top-right" />
=======
      <div className="min-h-screen bg-background p-4 sm:p-6">
        <Button variant="ghost" onClick={handleBackToDashboard} className="mb-4 gap-2 text-sm hover:bg-primary/10 transition-colors">
          ← Back to Dashboard
        </Button>
        <CasualExpenses />
>>>>>>> 25883f75145db3982c304fa73e3ddbe5091f04c6
      </div>
    )
  }

  if (activePage === 'common') {
    return (
<<<<<<< HEAD
      <div className="min-h-screen bg-background">
        <main className="container mx-auto py-6 px-4">
          <Button variant="ghost" onClick={handleBackToDashboard} className="mb-6 gap-2">
            ← Back to Dashboard
          </Button>
          <CommonExpensesPage />
        </main>
        <Toaster position="top-right" />
=======
      <div className="min-h-screen bg-background p-4 sm:p-6">
        <Button variant="ghost" onClick={handleBackToDashboard} className="mb-4 gap-2 text-sm hover:bg-primary/10 transition-colors">
          ← Back to Dashboard
        </Button>
        <CommonExpenses />
>>>>>>> 25883f75145db3982c304fa73e3ddbe5091f04c6
      </div>
    )
  }

  if (activePage === 'stock') {
    return (
<<<<<<< HEAD
      <div className="min-h-screen bg-background">
        <main className="container mx-auto py-6 px-4">
          <Button variant="ghost" onClick={handleBackToDashboard} className="mb-6 gap-2">
            ← Back to Dashboard
          </Button>
          <StockPurchasesPage />
        </main>
        <Toaster position="top-right" />
=======
      <div className="min-h-screen bg-background p-4 sm:p-6">
        <Button variant="ghost" onClick={handleBackToDashboard} className="mb-4 gap-2 text-sm hover:bg-primary/10 transition-colors">
          ← Back to Dashboard
        </Button>
        <StockPurchases />
      </div>
    )
  }

  // Loading State with Skeleton Cards
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-background/95 p-4 sm:p-6">
        <div className="container max-w-7xl mx-auto">
          {/* Header Skeleton */}
          <div className="mb-6 sm:mb-8">
            <div className="flex items-center gap-2 mb-1">
              <Skeleton className="h-5 w-5 rounded-full" />
              <Skeleton className="h-8 w-48" />
            </div>
            <Skeleton className="h-4 w-64" />
          </div>

          {/* Filter Skeleton */}
          <div className="mb-6 sm:mb-8">
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-9 w-20 rounded-full" />
              ))}
              <Skeleton className="h-9 w-32 rounded-full" />
            </div>
          </div>

          {/* Cards Skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6 mb-6 sm:mb-8">
            {[1, 2, 3].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>

          {/* Chart Skeleton */}
          <Card className="rounded-2xl border-0 shadow-lg overflow-hidden">
            <CardHeader className="pb-2 sm:pb-4">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-56" />
            </CardHeader>
            <CardContent className="p-2 sm:p-6">
              <div className="w-full h-[250px] sm:h-[350px] flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Error State
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-background/95 p-4 sm:p-6 flex items-center justify-center">
        <Card className="max-w-md w-full rounded-2xl border-0 shadow-lg bg-gradient-to-br from-red-50/50 to-red-100/30 dark:from-red-950/20 dark:to-red-900/10">
          <CardContent className="p-6 text-center">
            <div className="p-4 rounded-full bg-red-100 dark:bg-red-900/30 mx-auto w-fit mb-4">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Error Loading Data</h3>
            <p className="text-muted-foreground text-sm mb-4">{error}</p>
            <Button onClick={fetchAllData} className="rounded-full">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
>>>>>>> 25883f75145db3982c304fa73e3ddbe5091f04c6
      </div>
    )
  }

  // Dashboard View
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-background/95">
      <main className="container max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-8">
        {/* Header with animated gradient */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="h-5 w-5 text-primary animate-pulse" />
                <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
                  Expense Dashboard
                </h1>
              </div>
              <p className="text-sm sm:text-base text-muted-foreground">
                Real-time expense tracking & analytics
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={refreshData}
              disabled={isRefreshing}
              className="rounded-full border-2 hover:border-primary/50 transition-all"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>
        </div>

        {/* Date Filter - Horizontal scroll for mobile */}
        <div className="mb-6 sm:mb-8 overflow-x-auto pb-2 -mx-3 px-3 sm:mx-0 sm:px-0">
          <div className="flex gap-1.5 sm:gap-2 min-w-max">
            {filterButtons.map((filter) => (
              <Button
                key={filter.value}
                variant={dateFilterType === filter.value ? "default" : "outline"}
                size="sm"
                onClick={() => setDateFilterType(filter.value as DateFilterType)}
                className={`rounded-full px-3 sm:px-4 text-xs sm:text-sm transition-all ${
                  dateFilterType === filter.value 
                    ? 'shadow-lg shadow-primary/20 bg-gradient-to-r from-primary to-primary/80' 
                    : 'hover:shadow-md hover:border-primary/30'
                }`}
              >
                {filter.label}
              </Button>
            ))}
            <Badge variant="secondary" className="rounded-full px-3 py-1.5 text-xs whitespace-nowrap ml-1 bg-gradient-to-r from-primary/10 to-primary/5">
              <CalendarIcon className="h-3 w-3 mr-1" />
              {format(getDateRangeForDashboard.start, 'MMM d')} - {format(getDateRangeForDashboard.end, 'MMM d')}
            </Badge>
          </div>
        </div>

        {/* 3 Clickable Cards - Responsive grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6 mb-6 sm:mb-8">
          <ClickableCard
            title="Common Expenses"
            value={formatCurrency(totals.totalCommon)}
            icon={<Wallet className="h-5 w-5 text-indigo-600" />}
            description="Recurring operational costs"
            color="purple"
            onClick={handleCommonClick}
            trend={totals.totalCommon > 0 ? 'up' : 'neutral'}
            trendValue={totals.totalCommon > 0 ? 'active' : 'none'}
          />
          
          <ClickableCard
            title="Stock Purchases"
            value={formatCurrency(totals.totalStock)}
            icon={<Package className="h-5 w-5 text-emerald-600" />}
            description="Inventory & raw materials"
            color="emerald"
            onClick={handleStockClick}
            trend={totals.totalStock > 0 ? 'up' : 'neutral'}
            trendValue={totals.totalStock > 0 ? 'active' : 'none'}
          />
          
          <ClickableCard
            title="Casual Expenses"
            value={formatCurrency(totals.totalCasual)}
            icon={<Receipt className="h-5 w-5 text-amber-600" />}
            description="One-time & unexpected costs"
            color="amber"
            onClick={handleCasualClick}
            trend={totals.totalCasual > 0 ? 'up' : 'neutral'}
            trendValue={totals.totalCasual > 0 ? 'active' : 'none'}
          />
        </div>

        {/* Total Expenses Summary Card */}
        <Card className="mb-6 sm:mb-8 rounded-2xl border-0 shadow-lg bg-gradient-to-r from-primary/5 via-primary/5 to-primary/5 backdrop-blur-sm hover:shadow-xl transition-shadow">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">Total Expenses</p>
                <p className="text-3xl sm:text-4xl font-bold text-primary">{formatCurrency(totals.totalExpenses)}</p>
              </div>
              <div className="p-3 rounded-full bg-primary/10">
                <Wallet className="h-8 w-8 text-primary" />
              </div>
            </div>
            <div className="mt-4 flex gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Common: </span>
                <span className="font-semibold text-indigo-600">{formatCurrency(totals.totalCommon)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Stock: </span>
                <span className="font-semibold text-emerald-600">{formatCurrency(totals.totalStock)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Casual: </span>
                <span className="font-semibold text-amber-600">{formatCurrency(totals.totalCasual)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Expense Trends Chart */}
        <Card className="rounded-2xl border-0 shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
          <CardHeader className="pb-2 sm:pb-4">
            <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Expense Trends
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Daily breakdown of all expense types
            </CardDescription>
          </CardHeader>
          <CardContent className="p-2 sm:p-6">
            {dailyExpenseData.length === 0 ? (
              <div className="w-full h-[250px] sm:h-[350px] flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No data available for this period</p>
                </div>
              </div>
            ) : (
              <div className="w-full h-[250px] sm:h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailyExpenseData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: window.innerWidth < 640 ? 10 : 12 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis 
                      tickFormatter={(v) => formatShortCurrency(v)}
                      tick={{ fontSize: window.innerWidth < 640 ? 10 : 12 }}
                      tickLine={false}
                      axisLine={false}
                      width={window.innerWidth < 640 ? 40 : 60}
                    />
                    <RechartsTooltip 
                      formatter={(value: number, name: string) => [formatCurrency(value), name]}
                      contentStyle={{ 
                        borderRadius: '12px', 
                        border: 'none', 
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                        fontSize: window.innerWidth < 640 ? '12px' : '14px',
                        padding: window.innerWidth < 640 ? '8px 12px' : '12px 16px',
                      }}
                      cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                    />
                    <Legend 
                      wrapperStyle={{ fontSize: window.innerWidth < 640 ? '10px' : '12px', paddingTop: '10px' }}
                      iconSize={window.innerWidth < 640 ? 8 : 10}
                    />
                    <Bar 
                      dataKey="Common" 
                      stackId="expenses" 
                      fill={CHART_COLORS.common} 
                      radius={[4, 4, 0, 0]} 
                      name="Common" 
                      animationDuration={800}
                      animationBegin={200}
                    />
                    <Bar 
                      dataKey="Stock" 
                      stackId="expenses" 
                      fill={CHART_COLORS.stock} 
                      radius={[4, 4, 0, 0]} 
                      name="Stock" 
                      animationDuration={800}
                      animationBegin={400}
                    />
                    <Bar 
                      dataKey="Casual" 
                      stackId="expenses" 
                      fill={CHART_COLORS.casual} 
                      radius={[4, 4, 0, 0]} 
                      name="Casual" 
                      animationDuration={800}
                      animationBegin={600}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
      <Toaster 
        position="top-right" 
        toastOptions={{
          style: {
            borderRadius: '12px',
            padding: '12px 16px',
            fontSize: '14px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          },
          success: {
            iconTheme: {
              primary: '#10B981',
              secondary: 'white',
            },
          },
          error: {
            iconTheme: {
              primary: '#EF4444',
              secondary: 'white',
            },
          },
        }}
      />
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