"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Plus, Trash2, RefreshCcw, Edit, Calendar } from "lucide-react"
import { format, isValid } from "date-fns"
import { Skeleton } from "@/components/ui/skeleton"
import { ScrollArea } from "@/components/ui/scroll-area"

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
  tags: string[] | string // Updated to accept both array and string
  priority: 'High' | 'Medium' | 'Low'
  notes?: string
  createdBy: string
  createdAt: string
}

interface ExpenseListProps {
  expenses: CommonExpense[]
  isLoading: boolean
  onAdd: (expense: any) => Promise<void>
  onEdit: (id: string, expense: any) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onRefresh: () => void
  onGenerateNow?: () => Promise<void>
}

const CATEGORY_OPTIONS = [
  'salary', 'house rent', 'electricity & water', 'staff food', 'internet', 
  'phone', 'supplies', 'maintenance', 'Rent', 'Utilities', 'Salaries', 
  'Ingredients', 'Equipment', 'Marketing', 'Insurance', 'Licenses', 
  'Transportation', 'Packaging', 'Cleaning', 'Software', 'Training', 'Other'
]

const FREQUENCY_OPTIONS = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
  { value: 'one-time', label: 'One Time' },
]

const PRIORITY_OPTIONS = ['High', 'Medium', 'Low']

// Helper function to safely format tags
const formatTags = (tags: string[] | string | undefined): string => {
  if (!tags) return ''
  
  // If it's already an array, join it
  if (Array.isArray(tags)) {
    return tags.join(', ')
  }
  
  // If it's a string, return it as is (or split and join if needed)
  return tags
}

// Helper function to parse tags from string to array
const parseTags = (tagsString: string): string[] => {
  if (!tagsString) return []
  return tagsString.split(',').map(tag => tag.trim()).filter(tag => tag !== '')
}

export function ExpenseList({ 
  expenses, 
  isLoading, 
  onAdd, 
  onEdit, 
  onDelete, 
  onRefresh,
  onGenerateNow 
}: ExpenseListProps) {
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editingExpense, setEditingExpense] = useState<CommonExpense | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    amount: '',
    category: 'Other',
    frequency: 'monthly',
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: '',
    isActive: true,
    tags: '',
    priority: 'Medium',
    notes: '',
    createdBy: 'admin',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Parse tags from comma-separated string to array before submitting
    const expenseData = {
      ...formData,
      amount: parseFloat(formData.amount),
      tags: parseTags(formData.tags),
      startDate: new Date(formData.startDate),
      endDate: formData.endDate ? new Date(formData.endDate) : null,
    }
    
    await onAdd(expenseData)
    setShowAddDialog(false)
    resetForm()
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (editingExpense) {
      // Parse tags from comma-separated string to array before submitting
      const expenseData = {
        ...formData,
        amount: parseFloat(formData.amount),
        tags: parseTags(formData.tags),
        startDate: new Date(formData.startDate),
        endDate: formData.endDate ? new Date(formData.endDate) : null,
      }
      
      await onEdit(editingExpense._id, expenseData)
      setShowEditDialog(false)
      setEditingExpense(null)
      resetForm()
    }
  }

  const handleEdit = (expense: CommonExpense) => {
    if (!expense) return
    
    setEditingExpense(expense)
    setFormData({
      title: expense.title || '',
      description: expense.description || '',
      amount: expense.amount?.toString() || '0',
      category: expense.category || 'Other',
      frequency: expense.frequency || 'monthly',
      startDate: expense.startDate ? format(new Date(expense.startDate), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
      endDate: expense.endDate ? format(new Date(expense.endDate), 'yyyy-MM-dd') : '',
      isActive: expense.isActive ?? true,
      // Safely handle tags whether they're array or string
      tags: formatTags(expense.tags),
      priority: expense.priority || 'Medium',
      notes: expense.notes || '',
      createdBy: expense.createdBy || 'admin',
    })
    setShowEditDialog(true)
  }

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      amount: '',
      category: 'Other',
      frequency: 'monthly',
      startDate: format(new Date(), 'yyyy-MM-dd'),
      endDate: '',
      isActive: true,
      tags: '',
      priority: 'Medium',
      notes: '',
      createdBy: 'admin',
    })
  }

  const getFrequencyBadge = (frequency: string) => {
    const colors: Record<string, string> = {
      daily: 'bg-blue-100 text-blue-800',
      weekly: 'bg-green-100 text-green-800',
      monthly: 'bg-purple-100 text-purple-800',
      quarterly: 'bg-yellow-100 text-yellow-800',
      yearly: 'bg-orange-100 text-orange-800',
      'one-time': 'bg-gray-100 text-gray-800',
    }
    return colors[frequency] || 'bg-gray-100 text-gray-800'
  }

  // Filter out any invalid expenses before rendering
  const validExpenses = expenses.filter(expense => 
    expense && 
    expense._id && 
    expense.title !== undefined && 
    expense.title !== null
  )

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Common Expenses</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <CardTitle>Common Expenses</CardTitle>
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {onGenerateNow && (
              <Button onClick={onGenerateNow} variant="outline" size="sm" className="flex-1 sm:flex-none">
                <Calendar className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Generate Today</span>
                <span className="inline sm:hidden">Generate</span>
              </Button>
            )}
            <Button onClick={() => setShowAddDialog(true)} size="sm" className="flex-1 sm:flex-none">
              <Plus className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Add Expense</span>
              <span className="inline sm:hidden">Add</span>
            </Button>
            <Button onClick={onRefresh} variant="outline" size="icon">
              <RefreshCcw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Frequency</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>End Date</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {validExpenses.map((expense) => (
                <TableRow key={expense._id}>
                  <TableCell className="font-medium">
                    {expense.title || 'Untitled Expense'}
                  </TableCell>
                  <TableCell>
                    {expense.amount ? expense.amount.toFixed(2) : '0.00'} ETB
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{expense.category || 'Uncategorized'}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={getFrequencyBadge(expense.frequency || 'monthly')}>
                      {expense.frequency || 'monthly'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {expense.startDate && isValid(new Date(expense.startDate)) 
                      ? format(new Date(expense.startDate), 'PP') 
                      : 'No date'}
                  </TableCell>
                  <TableCell>
                    {expense.endDate && isValid(new Date(expense.endDate)) 
                      ? format(new Date(expense.endDate), 'PP') 
                      : 'No end date'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={
                      expense.priority === 'High' ? 'destructive' :
                      expense.priority === 'Medium' ? 'default' : 'secondary'
                    }>
                      {expense.priority || 'Medium'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={expense.isActive ? 'default' : 'secondary'}>
                      {expense.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleEdit(expense)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => onDelete(expense._id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {validExpenses.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    No expenses found. Click "Add Expense" to create one.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Add Dialog */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Add Common Expense</DialogTitle>
              <DialogDescription>
                Create a recurring expense that will be automatically added to daily expenses.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <ScrollArea className="h-[60vh] pr-4">
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Title *</Label>
                      <Input
                        id="title"
                        value={formData.title}
                        onChange={(e) => setFormData({...formData, title: e.target.value})}
                        placeholder="e.g., Monthly Rent"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="amount">Amount (ETB) *</Label>
                      <Input
                        id="amount"
                        type="number"
                        step="0.01"
                        value={formData.amount}
                        onChange={(e) => setFormData({...formData, amount: e.target.value})}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="category">Category *</Label>
                      <Select
                        value={formData.category}
                        onValueChange={(value) => setFormData({...formData, category: value})}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORY_OPTIONS.map(cat => (
                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="frequency">Frequency *</Label>
                      <Select
                        value={formData.frequency}
                        onValueChange={(value) => setFormData({...formData, frequency: value})}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FREQUENCY_OPTIONS.map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="startDate">Start Date *</Label>
                      <Input
                        id="startDate"
                        type="date"
                        value={formData.startDate}
                        onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="endDate">End Date (Optional)</Label>
                      <Input
                        id="endDate"
                        type="date"
                        value={formData.endDate}
                        onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="priority">Priority</Label>
                      <Select
                        value={formData.priority}
                        onValueChange={(value) => setFormData({...formData, priority: value})}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PRIORITY_OPTIONS.map(opt => (
                            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tags">Tags (comma separated)</Label>
                      <Input
                        id="tags"
                        value={formData.tags}
                        onChange={(e) => setFormData({...formData, tags: e.target.value})}
                        placeholder="rent, utilities, fixed"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({...formData, notes: e.target.value})}
                      rows={2}
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="isActive"
                      checked={formData.isActive}
                      onCheckedChange={(checked) => setFormData({...formData, isActive: checked})}
                    />
                    <Label htmlFor="isActive">Active</Label>
                  </div>
                </div>
              </ScrollArea>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  Add Expense
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Edit Common Expense</DialogTitle>
              <DialogDescription>
                Update the recurring expense details.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleEditSubmit}>
              <ScrollArea className="h-[60vh] pr-4">
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-title">Title *</Label>
                      <Input
                        id="edit-title"
                        value={formData.title}
                        onChange={(e) => setFormData({...formData, title: e.target.value})}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-amount">Amount (ETB) *</Label>
                      <Input
                        id="edit-amount"
                        type="number"
                        step="0.01"
                        value={formData.amount}
                        onChange={(e) => setFormData({...formData, amount: e.target.value})}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-category">Category *</Label>
                      <Select
                        value={formData.category}
                        onValueChange={(value) => setFormData({...formData, category: value})}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORY_OPTIONS.map(cat => (
                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-frequency">Frequency *</Label>
                      <Select
                        value={formData.frequency}
                        onValueChange={(value) => setFormData({...formData, frequency: value})}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FREQUENCY_OPTIONS.map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-startDate">Start Date *</Label>
                      <Input
                        id="edit-startDate"
                        type="date"
                        value={formData.startDate}
                        onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-endDate">End Date (Optional)</Label>
                      <Input
                        id="edit-endDate"
                        type="date"
                        value={formData.endDate}
                        onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-priority">Priority</Label>
                      <Select
                        value={formData.priority}
                        onValueChange={(value) => setFormData({...formData, priority: value})}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PRIORITY_OPTIONS.map(opt => (
                            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-tags">Tags (comma separated)</Label>
                      <Input
                        id="edit-tags"
                        value={formData.tags}
                        onChange={(e) => setFormData({...formData, tags: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-description">Description</Label>
                    <Textarea
                      id="edit-description"
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-notes">Notes</Label>
                    <Textarea
                      id="edit-notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({...formData, notes: e.target.value})}
                      rows={2}
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="edit-isActive"
                      checked={formData.isActive}
                      onCheckedChange={(checked) => setFormData({...formData, isActive: checked})}
                    />
                    <Label htmlFor="edit-isActive">Active</Label>
                  </div>
                </div>
              </ScrollArea>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowEditDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  Update Expense
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}
