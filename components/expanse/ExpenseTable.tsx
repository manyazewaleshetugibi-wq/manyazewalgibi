// components/ExpenseTable.tsx

"use client"

import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { ArrowDownIcon, ArrowUpIcon, Edit2, MoreHorizontal, Trash2 } from "lucide-react"
import { CasualExpense, CostFormData, SortConfig } from "@/types/expense.types"
import { formatCurrency } from "@/lib/utils/expense.utils"
import { ExpenseFormModal } from "./ExpenseFormModal"

export function ExpenseTable({
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
}) {
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