// components/ExpenseCard.tsx

"use client"

import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Edit2, MoreHorizontal, Trash2 } from "lucide-react"
import { CasualExpense, CostFormData } from "@/types/expense.types"
import { formatCurrency } from "@/lib/utils/expense.utils"
import { ExpenseFormModal } from "./ExpenseFormModal"

export function ExpenseCard({
  expense,
  onUpdate,
  onDelete,
  isUpdating,
}: {
  expense: CasualExpense
  onUpdate: (id: string, data: CostFormData) => void
  onDelete: (id: string) => void
  isUpdating: boolean
}) {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">{expense.title || expense.description || "Untitled expense"}</CardTitle>
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