"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Toaster, toast } from "react-hot-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Search, Plus, Edit, Trash2, Loader2, Eye, Tag, BookOpen, X, AlertCircle, Package, BarChart3, Calendar, TrendingUp } from 'lucide-react'

interface BookItem {
  _id?: string
  title: string
  price: number
  category: string
  quantity: number
  imageUrl?: string
  cloudinaryData?: {
    publicId: string
    url: string
    format: string
    bytes: number
    width?: number
    height?: number
  }
  createdAt?: string
  updatedAt?: string
}

const BookSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title must be less than 200 characters"),
  price: z.number().min(0, "Price must be positive").max(999999, "Price is too high"),
  category: z.string().min(1, "Category is required").max(100, "Category must be less than 100 characters"),
  quantity: z.number().min(0, "Quantity must be 0 or more").max(99999, "Quantity is too high"),
})

type FormData = z.infer<typeof BookSchema>

const MAX_IMAGE_SIZE = 10 * 1024 * 1024
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']

export default function BookManagement() {
  const [books, setBooks] = useState<BookItem[]>([])
  const [filteredBooks, setFilteredBooks] = useState<BookItem[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isViewDetailsOpen, setIsViewDetailsOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [bookToDelete, setBookToDelete] = useState<string | null>(null)
  const [selectedBook, setSelectedBook] = useState<BookItem | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(8)
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [isImageRemoved, setIsImageRemoved] = useState(false)

  // Sales report state
  const [activeTab, setActiveTab] = useState<"books" | "sales">("books")
  const [salesData, setSalesData] = useState<any>(null)
  const [salesLoading, setSalesLoading] = useState(false)
  const [salesDateFilter, setSalesDateFilter] = useState<"today" | "yesterday" | "last7days" | "thisMonth" | "lastMonth" | "all">("today")
  const [salesStartDate, setSalesStartDate] = useState("")
  const [salesEndDate, setSalesEndDate] = useState("")

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(BookSchema),
    defaultValues: { title: "", price: 0, category: "", quantity: 0 },
  })

  const fetchBooks = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/books")
      if (!response.ok) throw new Error("Failed to fetch books")
      const data = await response.json()
      const bookList = data.books || data.data || []
      setBooks(bookList)
      setFilteredBooks(bookList)
    } catch (error: any) {
      console.error("Failed to fetch books:", error)
      toast.error("Failed to load books")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { fetchBooks() }, [])

  const getDateRange = () => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1)
    const last7 = new Date(today); last7.setDate(last7.getDate() - 7)
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)

    switch (salesDateFilter) {
      case "today": return { start: today, end: new Date(today.getTime() + 86400000 - 1) }
      case "yesterday": return { start: yesterday, end: new Date(yesterday.getTime() + 86400000 - 1) }
      case "last7days": return { start: last7, end: now }
      case "thisMonth": return { start: thisMonthStart, end: now }
      case "lastMonth": return { start: lastMonthStart, end: lastMonthEnd }
      case "all": return { start: new Date("2020-01-01"), end: now }
      default:
        if (salesStartDate && salesEndDate) {
          return { start: new Date(salesStartDate), end: new Date(salesEndDate + "T23:59:59") }
        }
        return { start: today, end: new Date(today.getTime() + 86400000 - 1) }
    }
  }

  const fetchSalesData = async () => {
    setSalesLoading(true)
    try {
      const range = getDateRange()
      const params = new URLSearchParams({
        startDate: range.start.toISOString(),
        endDate: range.end.toISOString(),
      })
      const response = await fetch(`/api/books/sold?${params.toString()}`)
      if (!response.ok) throw new Error("Failed to fetch sales data")
      const data = await response.json()
      setSalesData(data)
    } catch (error: any) {
      console.error("Failed to fetch sales data:", error)
      toast.error("Failed to load sales data")
    } finally {
      setSalesLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === "sales") {
      fetchSalesData()
    }
  }, [activeTab, salesDateFilter, salesStartDate, salesEndDate])

  useEffect(() => {
    const filtered = books.filter((book) =>
      book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      book.category.toLowerCase().includes(searchTerm.toLowerCase())
    )
    setFilteredBooks(filtered)
    setCurrentPage(1)
  }, [searchTerm, books])

  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentItems = filteredBooks.slice(indexOfFirstItem, indexOfLastItem)
  const totalPages = Math.ceil(filteredBooks.length / itemsPerPage)

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber)

  const validateImage = (file: File): { valid: boolean; error?: string } => {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return { valid: false, error: `Invalid type. Allowed: ${ALLOWED_IMAGE_EXTENSIONS.join(', ')}` }
    }
    if (file.size > MAX_IMAGE_SIZE) {
      return { valid: false, error: `Image must be less than ${MAX_IMAGE_SIZE / (1024 * 1024)}MB` }
    }
    return { valid: true }
  }

  const ALLOWED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp']

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const validation = validateImage(file)
    if (!validation.valid) {
      toast.error(validation.error!)
      e.target.value = ''
      return
    }

    setSelectedImage(file)
    setIsImageRemoved(false)

    const reader = new FileReader()
    reader.onloadend = () => {
      setImagePreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const removeImage = () => {
    setSelectedImage(null)
    setImagePreview(null)
    setIsImageRemoved(true)
  }

  const onSubmit = async (data: FormData) => {
    if (!selectedBook?._id && !selectedImage) {
      toast.error("Image is required for new books")
      return
    }

    setIsSubmitting(true)
    setIsUploading(true)
    setUploadProgress(0)

    try {
      const formData = new FormData()
      formData.append("title", data.title)
      formData.append("price", data.price.toString())
      formData.append("category", data.category)
      formData.append("quantity", data.quantity.toString())

      if (selectedBook && selectedBook._id) {
        formData.append("_id", selectedBook._id)
        if (selectedImage) {
          formData.append("image", selectedImage)
        } else if (isImageRemoved) {
          formData.append("removeImage", "true")
        } else if (selectedBook.imageUrl) {
          formData.append("imageUrl", selectedBook.imageUrl)
        }
      } else {
        if (selectedImage) {
          formData.append("image", selectedImage)
        }
      }

      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) { clearInterval(progressInterval); return 90 }
          return prev + 10
        })
      }, 300)

      const isUpdate = selectedBook && selectedBook._id
      const url = isUpdate ? `/api/books` : "/api/books"
      const method = isUpdate ? "PUT" : "POST"

      const response = await fetch(url, { method, body: formData })
      clearInterval(progressInterval)
      setUploadProgress(100)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || "Operation failed")
      }

      toast.success(isUpdate ? "Book updated successfully" : "Book created successfully")
      await new Promise(resolve => setTimeout(resolve, 500))
      await fetchBooks()
      resetForm()
    } catch (error: any) {
      console.error("Error saving book:", error)
      toast.error(error.message || "Failed to save book")
    } finally {
      setIsSubmitting(false)
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  const resetForm = () => {
    reset({ title: "", price: 0, category: "", quantity: 0 })
    setSelectedImage(null)
    setImagePreview(null)
    setIsImageRemoved(false)
    setSelectedBook(null)
    setIsDialogOpen(false)
  }

  const handleEdit = (book: BookItem) => {
    setSelectedBook(book)
    setImagePreview(book.cloudinaryData?.url || book.imageUrl || null)
    setSelectedImage(null)
    setIsImageRemoved(false)
    reset({
      title: book.title,
      price: book.price,
      category: book.category,
      quantity: book.quantity,
    })
    setIsDialogOpen(true)
  }

  const handleViewDetails = (book: BookItem) => {
    setSelectedBook(book)
    setIsViewDetailsOpen(true)
  }

  const handleDelete = (id: string) => {
    setBookToDelete(id)
    setIsDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!bookToDelete) return
    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/books`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: bookToDelete }),
      })
      if (!response.ok) throw new Error("Failed to delete book")
      toast.success("Book deleted successfully")
      await fetchBooks()
      setIsDeleteDialogOpen(false)
      setBookToDelete(null)
    } catch (error: any) {
      console.error("Error deleting book:", error)
      toast.error(error.message || "Failed to delete book")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleNewItem = () => {
    setSelectedBook(null)
    setImagePreview(null)
    setSelectedImage(null)
    setIsImageRemoved(false)
    reset({ title: "", price: 0, category: "", quantity: 0 })
    setIsDialogOpen(true)
  }

  const getBookImage = (book: BookItem) => {
    return book.cloudinaryData?.url || book.imageUrl || "/placeholder.svg"
  }

  if (isLoading && books.length === 0) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-gray-50">
        <div className="relative w-20 h-20">
          <div className="absolute inset-0 flex items-center justify-center">
            <BookOpen className="h-8 w-8 text-indigo-600" />
          </div>
          <div className="absolute inset-0 border-4 border-t-indigo-600 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
        </div>
        <p className="mt-4 text-indigo-800 font-medium">Loading books...</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4 space-y-8">
      <Toaster position="top-right" />

      <div className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 p-6 rounded-lg shadow-sm mb-8">
        <h1 className="text-4xl font-bold flex items-center text-gray-800">
          <BookOpen className="mr-3 text-indigo-600" size={32} />
          Book Management
        </h1>
        <p className="text-gray-600 mt-2 max-w-2xl">
          Register and manage your books. Add new books with images, prices, and categories.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab("books")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "books"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          <BookOpen className="inline mr-1.5 h-4 w-4" />
          Books ({books.length})
        </button>
        <button
          onClick={() => setActiveTab("sales")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "sales"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          <BarChart3 className="inline mr-1.5 h-4 w-4" />
          Sales Report
        </button>
      </div>

      {/* Sales Report Tab */}
      {activeTab === "sales" && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <BarChart3 className="mr-2 h-5 w-5 text-indigo-600" />
              Book Sales Report
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Date Filter */}
            <div className="flex flex-wrap gap-2 items-center">
              <Calendar className="h-4 w-4 text-gray-500" />
              {(["today", "yesterday", "last7days", "thisMonth", "lastMonth", "all"] as const).map((filter) => (
                <Button
                  key={filter}
                  variant={salesDateFilter === filter ? "default" : "outline"}
                  size="sm"
                  onClick={() => { setSalesDateFilter(filter); setSalesStartDate(""); setSalesEndDate("") }}
                  className={salesDateFilter === filter ? "bg-indigo-600 hover:bg-indigo-700" : ""}
                >
                  {filter === "last7days" ? "Last 7 Days" : filter === "thisMonth" ? "This Month" : filter === "lastMonth" ? "Last Month" : filter.charAt(0).toUpperCase() + filter.slice(1)}
                </Button>
              ))}
              <div className="flex items-center gap-2 ml-2">
                <Input
                  type="date"
                  value={salesStartDate}
                  onChange={(e) => { setSalesStartDate(e.target.value); setSalesDateFilter("custom" as any) }}
                  className="w-36"
                />
                <span className="text-gray-400">to</span>
                <Input
                  type="date"
                  value={salesEndDate}
                  onChange={(e) => { setSalesEndDate(e.target.value); setSalesDateFilter("custom" as any) }}
                  className="w-36"
                />
              </div>
            </div>

            {/* Summary Cards */}
            {salesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
                <span className="ml-2 text-gray-600">Loading sales data...</span>
              </div>
            ) : salesData ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-green-600 font-medium">Total Revenue</p>
                          <p className="text-2xl font-bold text-green-800">{salesData.summary?.totalRevenue?.toLocaleString() || 0} ETB</p>
                        </div>
                        <TrendingUp className="h-8 w-8 text-green-400" />
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-blue-600 font-medium">Books Sold</p>
                          <p className="text-2xl font-bold text-blue-800">{salesData.summary?.totalSold || 0}</p>
                        </div>
                        <Package className="h-8 w-8 text-blue-400" />
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200">
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-purple-600 font-medium">Total Orders</p>
                          <p className="text-2xl font-bold text-purple-800">{salesData.summary?.totalOrders || 0}</p>
                        </div>
                        <BarChart3 className="h-8 w-8 text-purple-400" />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Sold Books Table */}
                {salesData.soldBooks?.length > 0 ? (
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Book</th>
                          <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Category</th>
                          <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Price</th>
                          <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Qty Sold</th>
                          <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Revenue</th>
                          <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Orders</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {salesData.soldBooks.map((book: any) => (
                          <tr key={book.bookId} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                {book.imageUrl && (
                                  <img src={book.imageUrl} alt={book.title} className="w-8 h-8 rounded object-cover" />
                                )}
                                <span className="font-medium text-sm">{book.title}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">{book.category}</td>
                            <td className="px-4 py-3 text-right text-sm">{book.price.toLocaleString()} ETB</td>
                            <td className="px-4 py-3 text-right text-sm font-medium">{book.totalQuantity}</td>
                            <td className="px-4 py-3 text-right text-sm font-medium text-green-700">{book.totalRevenue.toLocaleString()} ETB</td>
                            <td className="px-4 py-3 text-right text-sm text-gray-600">{book.orderCount}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-gray-50 font-medium">
                        <tr>
                          <td className="px-4 py-3 text-sm" colSpan={3}>Total</td>
                          <td className="px-4 py-3 text-right text-sm">{salesData.summary?.totalSold || 0}</td>
                          <td className="px-4 py-3 text-right text-sm text-green-700">{salesData.summary?.totalRevenue?.toLocaleString() || 0} ETB</td>
                          <td className="px-4 py-3 text-right text-sm">{salesData.summary?.totalOrders || 0}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <BarChart3 className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p>No book sales found for the selected period</p>
                  </div>
                )}

                {/* Daily Sales Breakdown */}
                {salesData.dailySales?.length > 0 && (
                  <div className="mt-4">
                    <h3 className="text-sm font-medium text-gray-700 mb-3">Daily Breakdown</h3>
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase">Date</th>
                            <th className="text-right px-4 py-2 text-xs font-medium text-gray-500 uppercase">Qty</th>
                            <th className="text-right px-4 py-2 text-xs font-medium text-gray-500 uppercase">Revenue</th>
                            <th className="text-right px-4 py-2 text-xs font-medium text-gray-500 uppercase">Orders</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {salesData.dailySales.map((day: any) => (
                            <tr key={day.date} className="hover:bg-gray-50">
                              <td className="px-4 py-2 text-sm">{new Date(day.date).toLocaleDateString()}</td>
                              <td className="px-4 py-2 text-right text-sm">{day.quantity}</td>
                              <td className="px-4 py-2 text-right text-sm text-green-700">{day.revenue.toLocaleString()} ETB</td>
                              <td className="px-4 py-2 text-right text-sm text-gray-600">{day.orders}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <BarChart3 className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>Select a date range to view sales data</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Books Tab */}
      {activeTab === "books" && (
      <>
      <Card className="mb-8">
        <CardContent className="pt-6">
          <div className="flex flex-wrap justify-between items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                type="text"
                placeholder="Search books..."
                className="pl-10 w-64"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button
              onClick={handleNewItem}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
              disabled={isSubmitting}
            >
              <Plus className="mr-2 h-4 w-4" /> Add New Book
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {currentItems.length > 0 ? (
          currentItems.map((book) => (
            <Card key={book._id} className="overflow-hidden hover:shadow-lg transition-shadow duration-300 group border border-indigo-200">
              <div className="relative">
                <CardHeader className="p-0">
                  <img
                    src={getBookImage(book)}
                    alt={book.title}
                    className="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-105"
                    onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg" }}
                  />
                </CardHeader>
              </div>
              <CardContent className="p-4">
                <CardTitle className="text-lg font-semibold mb-2 line-clamp-1">
                  {book.title}
                </CardTitle>
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <span className="flex items-center text-sm font-medium text-gray-900">
                      <Tag className="mr-1.5 text-green-600" size={14} />
                      {book.price} ETB
                    </span>
                  </div>
                  <div className="flex items-center text-xs text-gray-500">
                    <BookOpen className="mr-1.5 text-indigo-500" size={14} />
                    {book.category || "Uncategorized"}
                  </div>
                  <div className={`flex items-center text-xs font-medium ${book.quantity === 0 ? 'text-red-600' : book.quantity <= 5 ? 'text-amber-600' : 'text-gray-500'}`}>
                    <Package className="mr-1.5" size={14} />
                    {book.quantity === 0 ? 'Out of stock' : `${book.quantity} in stock`}
                  </div>
                </div>
              </CardContent>
              <Separator />
              <CardFooter className="flex justify-between p-3 bg-gray-50">
                <Button variant="ghost" size="sm" onClick={() => handleViewDetails(book)} className="flex-1 mr-1" disabled={isSubmitting}>
                  <Eye className="mr-1.5 h-4 w-4" /> View
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleEdit(book)} className="flex-1 mr-1" disabled={isSubmitting}>
                  <Edit className="mr-1.5 h-4 w-4" /> Edit
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(book._id!)} className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50" disabled={isSubmitting}>
                  <Trash2 className="mr-1.5 h-4 w-4" /> Delete
                </Button>
              </CardFooter>
            </Card>
          ))
        ) : (
          <div className="col-span-full text-center py-12">
            <BookOpen className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg mb-2">No books found</p>
            <p className="text-gray-400 text-sm mb-4">
              {searchTerm ? "Try a different search term" : "Get started by adding your first book"}
            </p>
            {!searchTerm && (
              <Button onClick={handleNewItem} className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700">
                <Plus className="mr-2 h-4 w-4" /> Add Book
              </Button>
            )}
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center mt-8">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => paginate(Math.max(1, currentPage - 1))}
                  className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                let pageNumber: number
                if (totalPages <= 5) {
                  pageNumber = i + 1
                } else if (currentPage <= 3) {
                  pageNumber = i + 1
                } else if (currentPage >= totalPages - 2) {
                  pageNumber = totalPages - 4 + i
                } else {
                  pageNumber = currentPage - 2 + i
                }
                return (
                  <PaginationItem key={pageNumber}>
                    <PaginationLink
                      onClick={() => paginate(pageNumber)}
                      isActive={currentPage === pageNumber}
                      className="cursor-pointer"
                    >
                      {pageNumber}
                    </PaginationLink>
                  </PaginationItem>
                )
              })}
              <PaginationItem>
                <PaginationNext
                  onClick={() => paginate(Math.min(totalPages, currentPage + 1))}
                  className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
      </>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{selectedBook?._id ? "Edit Book" : "Register New Book"}</DialogTitle>
            <DialogDescription>
              {selectedBook?._id ? "Update the book details below." : "Fill in the details to register a new book."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 overflow-y-auto flex-1 pr-1">
            <div className="space-y-1.5">
              <Label htmlFor="title" className="text-sm">Title *</Label>
              <Input
                id="title"
                {...register("title")}
                placeholder="Enter book title"
                disabled={isSubmitting}
                className="h-9"
              />
              {errors.title && <p className="text-xs text-red-500">{errors.title.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="price" className="text-sm">Price (ETB) *</Label>
                <Input
                  id="price"
                  type="number"
                  step="any"
                  min="0"
                  {...register("price", { valueAsNumber: true })}
                  placeholder="Price"
                  disabled={isSubmitting}
                  className="h-9"
                />
                {errors.price && <p className="text-xs text-red-500">{errors.price.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="quantity" className="text-sm">Quantity *</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="0"
                  {...register("quantity", { valueAsNumber: true })}
                  placeholder="Stock"
                  disabled={isSubmitting}
                  className="h-9"
                />
                {errors.quantity && <p className="text-xs text-red-500">{errors.quantity.message}</p>}
              </div>
            </div>
            {selectedBook?._id && (
              <p className="text-xs text-amber-600 -mt-1">Only admin can change quantity after registration</p>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="category" className="text-sm">Category *</Label>
              <Input
                id="category"
                {...register("category")}
                placeholder="Enter book category"
                disabled={isSubmitting}
                className="h-9"
              />
              {errors.category && <p className="text-xs text-red-500">{errors.category.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">Book Image *</Label>
              {!imagePreview ? (
                <div className="border-2 border-dashed border-gray-300 rounded-lg py-4 text-center hover:border-indigo-400 transition-colors">
                  <input
                    type="file"
                    accept={ALLOWED_IMAGE_TYPES.join(",")}
                    onChange={handleImageChange}
                    className="hidden"
                    id="image-upload"
                    disabled={isSubmitting}
                  />
                  <label htmlFor="image-upload" className="cursor-pointer">
                    <BookOpen className="h-8 w-8 text-gray-400 mx-auto mb-1" />
                    <p className="text-xs text-gray-500">Click to upload book image</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">JPG, PNG, GIF, WebP (max 10MB)</p>
                  </label>
                </div>
              ) : (
                <div className="relative">
                  <img src={imagePreview} alt="Preview" className="w-full h-32 object-cover rounded-lg" />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-1.5 right-1.5 h-6 w-6"
                    onClick={removeImage}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
              {!selectedBook?._id && !imagePreview && (
                <p className="text-xs text-red-500">Image is required for new books</p>
              )}
            </div>

            {isUploading && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Uploading to Cloudinary...</span>
                  <span className="font-medium">{uploadProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div
                    className="bg-indigo-600 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              </div>
            )}

            <DialogFooter className="sticky bottom-0 bg-white pt-2 border-t">
              <Button type="button" variant="outline" onClick={resetForm} disabled={isSubmitting} size="sm">
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || isUploading} size="sm">
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    {isUploading ? "Uploading..." : "Saving..."}
                  </>
                ) : (
                  selectedBook?._id ? "Update Book" : "Register Book"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isViewDetailsOpen} onOpenChange={setIsViewDetailsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Book Details</DialogTitle>
          </DialogHeader>
          {selectedBook && (
            <div className="space-y-4">
              <img
                src={getBookImage(selectedBook)}
                alt={selectedBook.title}
                className="w-full h-64 object-cover rounded-lg"
                onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg" }}
              />
              <div className="space-y-2">
                <h3 className="text-xl font-bold">{selectedBook.title}</h3>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span className="flex items-center">
                    <Tag className="mr-1.5 text-green-600" size={14} />
                    {selectedBook.price} ETB
                  </span>
                  <span className="flex items-center">
                    <BookOpen className="mr-1.5 text-indigo-500" size={14} />
                    {selectedBook.category}
                  </span>
                  <span className={`flex items-center ${selectedBook.quantity === 0 ? 'text-red-600' : selectedBook.quantity <= 5 ? 'text-amber-600' : 'text-gray-600'}`}>
                    <Package className="mr-1.5" size={14} />
                    {selectedBook.quantity === 0 ? 'Out of stock' : `${selectedBook.quantity} in stock`}
                  </span>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDetailsOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this book from the database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={isSubmitting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
