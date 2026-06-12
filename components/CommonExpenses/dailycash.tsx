"use client"
import React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  Wallet, 
  Save, 
  RefreshCcw, 
  CalendarIcon, 
  DollarSign,
  Trash2,
  Edit,
  Plus,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Info,
  Receipt,
  ArrowRightLeft
} from "lucide-react"
import { format, parseISO } from "date-fns"
import { useToast } from "@/hooks/use-toast"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface DailyCashEntry {
  _id: string
  date: string
  cashAmount: number
  transferAmount: number
  totalAmount: number
  zReportNumber?: string
  notes?: string
  createdBy?: string
  createdAt?: string
  updatedAt?: string
}

export default function DailyCash() {
  // Form state
  const [cashAmount, setCashAmount] = useState<string>("")
  const [transferAmount, setTransferAmount] = useState<string>("")
  const [zReportNumber, setZReportNumber] = useState<string>("")
  const [notes, setNotes] = useState<string>("")
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null)
  
  // UI state
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [isSaving, setIsSaving] = useState<boolean>(false)
  const [entries, setEntries] = useState<DailyCashEntry[]>([])
  const [filteredEntries, setFilteredEntries] = useState<DailyCashEntry[]>([])
  const [searchTerm, setSearchTerm] = useState<string>("")
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [entriesPerPage] = useState<number>(10)
  const [existingDates, setExistingDates] = useState<Set<string>>(new Set())
  const [duplicateError, setDuplicateError] = useState<string | null>(null)
  
  // Dialog state
  const [showDeleteDialog, setShowDeleteDialog] = useState<boolean>(false)
  const [showEditDialog, setShowEditDialog] = useState<boolean>(false)
  const [showAddDialog, setShowAddDialog] = useState<boolean>(false)
  const [showViewDialog, setShowViewDialog] = useState<boolean>(false)
  const [selectedEntry, setSelectedEntry] = useState<DailyCashEntry | null>(null)
  
  const { toast } = useToast()

  const today = format(new Date(), 'yyyy-MM-dd')
  const formattedToday = format(new Date(), 'PPPP')

  // Fetch all entries on component mount
  useEffect(() => {
    fetchEntries()
  }, [])

  // Update existing dates when entries change
  useEffect(() => {
    const dates = new Set(entries.map(entry => entry.date))
    setExistingDates(dates)
  }, [entries])

  // Filter entries based on search term
  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredEntries(entries)
    } else {
      const filtered = entries.filter(entry => 
        entry.date.includes(searchTerm) ||
        entry.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.cashAmount.toString().includes(searchTerm) ||
        entry.transferAmount.toString().includes(searchTerm) ||
        entry.totalAmount.toString().includes(searchTerm) ||
        entry.zReportNumber?.toLowerCase().includes(searchTerm.toLowerCase())
      )
      setFilteredEntries(filtered)
    }
    setCurrentPage(1)
  }, [searchTerm, entries])

  const fetchEntries = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/daily-cash')
      const data = await response.json()
      
      if (data.success) {
        setEntries(data.data)
        setFilteredEntries(data.data)
      } else {
        throw new Error(data.error || "Failed to fetch entries")
      }
    } catch (error) {
      console.error("Error fetching entries:", error)
      toast({
        title: "Error",
        description: "Failed to fetch daily cash entries",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const checkExistingEntry = (date: string): boolean => {
    return existingDates.has(date)
  }

  const handleSubmit = async (e: React.FormEvent, isEdit: boolean = false) => {
    e.preventDefault()
    setDuplicateError(null)
    
    // Validate inputs
    if (!cashAmount || parseFloat(cashAmount) < 0) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid cash amount",
        variant: "destructive",
      })
      return
    }

    if (!transferAmount || parseFloat(transferAmount) < 0) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid transfer amount",
        variant: "destructive",
      })
      return
    }

    const dateStr = format(selectedDate, 'yyyy-MM-dd')
    
    // Check for duplicate date (only for new entries)
    if (!isEdit && checkExistingEntry(dateStr)) {
      setDuplicateError(dateStr)
      toast({
        title: "Duplicate Entry",
        description: "You've already added daily cash for this date. You can edit or delete the existing entry instead.",
        variant: "destructive",
      })
      return
    }

    setIsSaving(true)

    try {
      const cashValue = parseFloat(cashAmount) || 0
      const transferValue = parseFloat(transferAmount) || 0
      const totalValue = cashValue + transferValue

      const entryData = {
        date: dateStr,
        cashAmount: cashValue,
        transferAmount: transferValue,
        totalAmount: totalValue,
        zReportNumber: zReportNumber || undefined,
        notes: notes || "",
      }

      let response
      if (isEdit && selectedEntryId) {
        // Update existing entry
        response = await fetch(`/api/daily-cash?id=${selectedEntryId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(entryData),
        })
      } else {
        // Create new entry
        response = await fetch('/api/daily-cash', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(entryData),
        })
      }

      const data = await response.json()

      if (data.success) {
        toast({
          title: "Success",
          description: isEdit 
            ? "Daily cash entry updated successfully" 
            : "Daily cash entry saved successfully",
          variant: "default",
        })
        
        // Refresh entries
        await fetchEntries()
        
        // Close dialogs
        if (isEdit) {
          setShowEditDialog(false)
        } else {
          setShowAddDialog(false)
        }
        
        // Reset form
        resetForm()
      } else {
        if (response.status === 409) {
          setDuplicateError(dateStr)
          toast({
            title: "Duplicate Entry",
            description: "This date already has an entry. Please edit the existing one.",
            variant: "destructive",
          })
        } else {
          throw new Error(data.error || "Failed to save")
        }
      }
    } catch (error) {
      console.error("Error saving daily cash:", error)
      toast({
        title: "Error",
        description: "Failed to save daily cash entry",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/daily-cash?id=${id}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "Success",
          description: "Entry deleted successfully",
          variant: "default",
        })
        
        // Refresh entries
        await fetchEntries()
        setShowDeleteDialog(false)
        setSelectedEntry(null)
      } else {
        throw new Error(data.error || "Failed to delete")
      }
    } catch (error) {
      console.error("Error deleting entry:", error)
      toast({
        title: "Error",
        description: "Failed to delete entry",
        variant: "destructive",
      })
    }
  }

  const handleEdit = (entry: DailyCashEntry) => {
    setSelectedEntryId(entry._id)
    setSelectedDate(parseISO(entry.date))
    setCashAmount(entry.cashAmount.toString())
    setTransferAmount(entry.transferAmount?.toString() || "0")
    setZReportNumber(entry.zReportNumber || "")
    setNotes(entry.notes || "")
    setDuplicateError(null)
    setShowEditDialog(true)
  }

  const handleView = (entry: DailyCashEntry) => {
    setSelectedEntry(entry)
    setShowViewDialog(true)
  }

  const handleAddNew = () => {
    resetForm()
    setDuplicateError(null)
    setShowAddDialog(true)
  }

  const resetForm = () => {
    setCashAmount("")
    setTransferAmount("")
    setZReportNumber("")
    setNotes("")
    setSelectedDate(new Date())
    setSelectedEntryId(null)
    setDuplicateError(null)
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'ETB',
      minimumFractionDigits: 2
    }).format(value)
  }

  // Pagination
  const indexOfLastEntry = currentPage * entriesPerPage
  const indexOfFirstEntry = indexOfLastEntry - entriesPerPage
  const currentEntries = filteredEntries.slice(indexOfFirstEntry, indexOfLastEntry)
  const totalPages = Math.ceil(filteredEntries.length / entriesPerPage)

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber)

  // Check if a date is disabled (already has an entry)
  const isDateDisabled = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    return existingDates.has(dateStr)
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="manage" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="manage">Manage Entries</TabsTrigger>
          <TabsTrigger value="view">View All Entries</TabsTrigger>
        </TabsList>

        {/* Manage Tab - Add/Edit Entries */}
        <TabsContent value="manage" className="space-y-4">
          {/* Today's Date Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-lg font-semibold text-gray-700">
              <CalendarIcon className="h-5 w-5 text-blue-600" />
              <span>{formattedToday}</span>
            </div>
            <Button onClick={handleAddNew} size="sm">
              <Plus className="mr-2 h-4 w-4" />
              New Entry
            </Button>
          </div>

          {/* Check if today's entry exists */}
          {checkExistingEntry(today) && (
            <Alert className="bg-amber-50 border-amber-200">
              <Info className="h-4 w-4 text-amber-600" />
              <AlertTitle className="text-amber-800">Daily Cash Already Added!</AlertTitle>
              <AlertDescription className="text-amber-700">
                You've already added daily cash for today. You can edit or delete the existing entry in the "View All Entries" tab.
              </AlertDescription>
            </Alert>
          )}

          {/* Today's Entry Form Card */}
          <Card className="border-2 border-blue-200">
            <CardHeader className="bg-blue-50/50">
              <CardTitle className="flex items-center gap-2 text-blue-700">
                <Wallet className="h-5 w-5" />
                Today's Daily Cash Entry
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Cash Amount Card */}
                  <Card className="border-2 border-blue-200">
                    <CardHeader className="bg-blue-50/50 pb-2">
                      <CardTitle className="flex items-center gap-2 text-blue-700">
                        <Wallet className="h-5 w-5" />
                        Cash Amount
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <div className="space-y-2">
                        <Label htmlFor="cashAmount">Enter Cash Amount (ETB)</Label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                          <Input
                            id="cashAmount"
                            type="number"
                            step="0.01"
                            min="0"
                            value={cashAmount}
                            onChange={(e) => setCashAmount(e.target.value)}
                            className="pl-10"
                            placeholder="0.00"
                            required
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Transfer Amount Card */}
                  <Card className="border-2 border-purple-200">
                    <CardHeader className="bg-purple-50/50 pb-2">
                      <CardTitle className="flex items-center gap-2 text-purple-700">
                        <ArrowRightLeft className="h-5 w-5" />
                        Transfer Amount
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <div className="space-y-2">
                        <Label htmlFor="transferAmount">Enter Transfer Amount (ETB)</Label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                          <Input
                            id="transferAmount"
                            type="number"
                            step="0.01"
                            min="0"
                            value={transferAmount}
                            onChange={(e) => setTransferAmount(e.target.value)}
                            className="pl-10"
                            placeholder="0.00"
                            required
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Z-Report Section - Simple like other registers */}
                <Card className="border-2 border-orange-200">
                  <CardHeader className="bg-orange-50/50">
                    <CardTitle className="flex items-center gap-2 text-orange-700">
                      <Receipt className="h-5 w-5" />
                      Z-Report Number
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="zReportNumber">Enter Z-Report Number</Label>
                      <Input
                        id="zReportNumber"
                        value={zReportNumber}
                        onChange={(e) => setZReportNumber(e.target.value)}
                        placeholder="e.g., Z-001, 12345, or leave empty"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Total Summary Card */}
                <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-semibold text-purple-800">Total Daily Cash:</span>
                      <span className="text-3xl font-bold text-purple-600">
                        {formatCurrency((parseFloat(cashAmount) || 0) + (parseFloat(transferAmount) || 0))}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* Notes Field */}
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Input
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add any additional notes..."
                  />
                </div>

                {/* Duplicate Warning */}
                {checkExistingEntry(today) && (
                  <Alert variant="destructive" className="bg-red-50 border-red-200">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <AlertTitle className="text-red-800">Cannot Add Duplicate!</AlertTitle>
                    <AlertDescription className="text-red-700">
                      You already have an entry for today. Please go to the "View All Entries" tab to edit or delete the existing entry.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <Button 
                    type="submit" 
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                    disabled={isSaving || checkExistingEntry(today)}
                  >
                    <Save className="mr-2 h-4 w-4" />
                    {isSaving ? "Saving..." : "Save Today's Entry"}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={resetForm}
                    disabled={isSaving}
                  >
                    <RefreshCcw className="mr-2 h-4 w-4" />
                    Reset
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* View Tab - All Entries with CRUD */}
        <TabsContent value="view" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <CardTitle>All Daily Cash Entries</CardTitle>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="relative flex-1 sm:flex-initial">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search entries..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8 w-full sm:w-[250px]"
                    />
                    {searchTerm && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1.5 h-6 w-6"
                        onClick={() => setSearchTerm("")}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <Button onClick={handleAddNew} size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    New Entry
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Cash Amount</TableHead>
                      <TableHead className="text-right">Transfer Amount</TableHead>
                      <TableHead className="text-right">Total Amount</TableHead>
                      <TableHead>Z-Report #</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentEntries.length > 0 ? (
                      currentEntries.map((entry) => (
                        <TableRow key={entry._id} className="cursor-pointer hover:bg-gray-50" onClick={() => handleView(entry)}>
                          <TableCell className="font-medium">
                            {format(parseISO(entry.date), 'PPP')}
                            {entry.date === today && (
                              <Badge className="ml-2 bg-blue-100 text-blue-800">Today</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right text-blue-600">
                            {formatCurrency(entry.cashAmount)}
                          </TableCell>
                          <TableCell className="text-right text-purple-600">
                            {formatCurrency(entry.transferAmount || 0)}
                          </TableCell>
                          <TableCell className="text-right font-bold text-orange-600">
                            {formatCurrency(entry.totalAmount)}
                          </TableCell>
                          <TableCell>
                            {entry.zReportNumber ? (
                              <Badge variant="outline" className="bg-orange-50">
                                {entry.zReportNumber}
                              </Badge>
                            ) : '-'}
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            {entry.notes || '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => handleEdit(entry)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => {
                                  setSelectedEntry(entry)
                                  setShowDeleteDialog(true)
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          {searchTerm ? "No entries found matching your search" : "No entries found"}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {filteredEntries.length > entriesPerPage && (
                <div className="flex items-center justify-between space-x-2 py-4">
                  <div className="text-sm text-muted-foreground">
                    Showing {indexOfFirstEntry + 1} to {Math.min(indexOfLastEntry, filteredEntries.length)} of {filteredEntries.length} entries
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => paginate(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => paginate(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Entry Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Add New Daily Cash Entry
            </DialogTitle>
            <DialogDescription>
              Create a new daily cash entry for any date
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => handleSubmit(e, false)}>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="entryDate">Select Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDate ? format(selectedDate, "PPP") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => {
                        if (date) {
                          setSelectedDate(date)
                          setDuplicateError(null)
                        }
                      }}
                      disabled={isDateDisabled}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                {duplicateError && (
                  <p className="text-sm text-red-500 mt-1">
                    Entry for {format(parseISO(duplicateError), 'PPP')} already exists. Please edit or delete the existing entry.
                  </p>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="addCashAmount">Cash Amount (ETB)</Label>
                  <Input
                    id="addCashAmount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={cashAmount}
                    onChange={(e) => setCashAmount(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="addTransferAmount">Transfer Amount (ETB)</Label>
                  <Input
                    id="addTransferAmount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                    required
                  />
                </div>
              </div>
              
              {/* Simple Z-Report field */}
              <div className="space-y-2">
                <Label htmlFor="addZReportNumber">Z-Report Number (Optional)</Label>
                <Input
                  id="addZReportNumber"
                  value={zReportNumber}
                  onChange={(e) => setZReportNumber(e.target.value)}
                  placeholder="Enter Z-Report number"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="addNotes">Notes (Optional)</Label>
                <Input
                  id="addNotes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any additional notes..."
                />
              </div>
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-3 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="font-semibold">Total:</span>
                  <span className="text-xl font-bold text-purple-600">
                    {formatCurrency((parseFloat(cashAmount) || 0) + (parseFloat(transferAmount) || 0))}
                  </span>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving || (selectedDate && isDateDisabled(selectedDate))}>
                {isSaving ? "Saving..." : "Save Entry"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Entry Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5" />
              Edit Daily Cash Entry
            </DialogTitle>
            <DialogDescription>
              Update the daily cash entry
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => handleSubmit(e, true)}>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="editDate">Date</Label>
                <div className="p-2 bg-gray-50 rounded border">
                  {format(selectedDate, 'PPPP')}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="editCashAmount">Cash Amount (ETB)</Label>
                  <Input
                    id="editCashAmount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={cashAmount}
                    onChange={(e) => setCashAmount(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editTransferAmount">Transfer Amount (ETB)</Label>
                  <Input
                    id="editTransferAmount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                    required
                  />
                </div>
              </div>
              
              {/* Simple Z-Report field */}
              <div className="space-y-2">
                <Label htmlFor="editZReportNumber">Z-Report Number (Optional)</Label>
                <Input
                  id="editZReportNumber"
                  value={zReportNumber}
                  onChange={(e) => setZReportNumber(e.target.value)}
                  placeholder="Enter Z-Report number"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="editNotes">Notes (Optional)</Label>
                <Input
                  id="editNotes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any additional notes..."
                />
              </div>
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-3 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="font-semibold">Total:</span>
                  <span className="text-xl font-bold text-purple-600">
                    {formatCurrency((parseFloat(cashAmount) || 0) + (parseFloat(transferAmount) || 0))}
                  </span>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowEditDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Updating..." : "Update Entry"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Entry Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Daily Cash Entry Details
            </DialogTitle>
          </DialogHeader>
          {selectedEntry && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-gray-500">Date</Label>
                  <p className="font-medium">{format(parseISO(selectedEntry.date), 'PPPP')}</p>
                </div>
                <div>
                  <Label className="text-sm text-gray-500">Entry ID</Label>
                  <p className="font-medium text-sm">{selectedEntry._id}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="border-blue-200">
                  <CardHeader className="bg-blue-50/50 py-2">
                    <CardTitle className="text-sm flex items-center gap-1 text-blue-700">
                      <Wallet className="h-4 w-4" />
                      Cash
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-2">
                    <p className="text-xl font-bold text-blue-600">{formatCurrency(selectedEntry.cashAmount)}</p>
                  </CardContent>
                </Card>

                <Card className="border-purple-200">
                  <CardHeader className="bg-purple-50/50 py-2">
                    <CardTitle className="text-sm flex items-center gap-1 text-purple-700">
                      <ArrowRightLeft className="h-4 w-4" />
                      Transfer
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-2">
                    <p className="text-xl font-bold text-purple-600">{formatCurrency(selectedEntry.transferAmount || 0)}</p>
                  </CardContent>
                </Card>
              </div>

              <Card className="bg-gradient-to-r from-orange-50 to-yellow-50 border-orange-200">
                <CardContent className="pt-4">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">Total Amount:</span>
                    <span className="text-2xl font-bold text-orange-600">
                      {formatCurrency(selectedEntry.totalAmount)}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Simple Z-Report display */}
              {selectedEntry.zReportNumber && (
                <div>
                  <Label className="text-sm text-gray-500">Z-Report Number</Label>
                  <p className="p-2 bg-orange-50 rounded border border-orange-200 font-medium">
                    {selectedEntry.zReportNumber}
                  </p>
                </div>
              )}

              {selectedEntry.notes && (
                <div>
                  <Label className="text-sm text-gray-500">Notes</Label>
                  <p className="p-2 bg-gray-50 rounded border">{selectedEntry.notes}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 text-sm text-gray-500">
                <div>
                  <p>Created: {selectedEntry.createdAt ? format(parseISO(selectedEntry.createdAt), 'PPp') : 'N/A'}</p>
                </div>
                <div>
                  <p>Updated: {selectedEntry.updatedAt ? format(parseISO(selectedEntry.updatedAt), 'PPp') : 'N/A'}</p>
                </div>
              </div>

              <DialogFooter className="gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    handleEdit(selectedEntry)
                    setShowViewDialog(false)
                  }}
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={() => {
                    setShowViewDialog(false)
                    setSelectedEntry(selectedEntry)
                    setShowDeleteDialog(true)
                  }}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
                <Button onClick={() => setShowViewDialog(false)}>
                  Close
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              Confirm Deletion
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this daily cash entry for{' '}
              <span className="font-bold">
                {selectedEntry && format(parseISO(selectedEntry.date), 'PPPP')}
              </span>?
              <br />
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => selectedEntry && handleDelete(selectedEntry._id)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
        
      </AlertDialog>
    </div>
  )
}