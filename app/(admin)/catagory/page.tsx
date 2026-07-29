"use client"

import { useState, useEffect } from "react"
import { Toaster, toast } from "react-hot-toast"
import { Plus, Search, Edit, Trash2, ChevronLeft, ChevronRight, Loader2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
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

interface ItemCategory {
  _id: string
  name: string
  description: string
  type: "FOOD" | "DRINK" | "OTHER"
  station?: "BARISTA" | "COFFEE_MAKER" | "ALL"
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export default function ItemCategoryPage() {
  const [categories, setCategories] = useState<ItemCategory[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  const [totalItems, setTotalItems] = useState(0)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editCategory, setEditCategory] = useState<ItemCategory | null>(null)
  const [newName, setNewName] = useState("")
  const [newDescription, setNewDescription] = useState("")
  const [newStation, setNewStation] = useState<"BARISTA" | "COFFEE_MAKER" | "ALL">("ALL")

  useEffect(() => {
    fetchCategories()
  }, [currentPage, searchTerm])

  const fetchCategories = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(
        `/api/item-category?page=${currentPage}&limit=${itemsPerPage}&search=${searchTerm}`
      )
      const data = await response.json()
      if (data.success) {
        setCategories(data.data)
        setTotalItems(data.total)
      } else {
        toast.error(data.message || "Failed to fetch categories")
      }
    } catch (error) {
      console.error("Error fetching categories:", error)
      toast.error("An unexpected error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddCategory = async () => {
    if (!newName.trim()) {
      toast.error("Category name is required")
      return
    }

    try {
      const response = await fetch("/api/item-category", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName, description: newDescription, type: "OTHER", station: newStation, isActive: true }),
      })
      const data = await response.json()

      if (data.success) {
        toast.success("Category added successfully")
        setIsAddDialogOpen(false)
        setNewName("")
        setNewDescription("")
        setNewStation("ALL")
        fetchCategories()
      } else {
        toast.error(data.message || "Failed to add category")
      }
    } catch (error) {
      console.error("Add category error:", error)
      toast.error("An unexpected error occurred")
    }
  }

  const handleEditCategory = async () => {
    if (!editCategory) return
    if (!editCategory.name.trim()) {
      toast.error("Category name is required")
      return
    }

    try {
      const response = await fetch(`/api/item-category/${editCategory._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editCategory.name,
          description: editCategory.description,
          type: editCategory.type || "OTHER",
          station: editCategory.station || "ALL",
          isActive: editCategory.isActive,
          createdAt: editCategory.createdAt,
        }),
      })
      const data = await response.json()

      if (data.success) {
        toast.success("Category updated successfully")
        setIsEditDialogOpen(false)
        setEditCategory(null)
        fetchCategories()
      } else {
        toast.error(data.message || "Failed to update category")
      }
    } catch (error) {
      console.error("Edit category error:", error)
      toast.error("An unexpected error occurred")
    }
  }

  const handleDeleteCategory = async (id: string) => {
    try {
      const response = await fetch(`/api/item-category/${id}`, {
        method: "DELETE",
      })
      const data = await response.json()
      if (data.success) {
        toast.success("Category deleted successfully")
        fetchCategories()
      } else {
        toast.error(data.message || "Failed to delete category")
      }
    } catch (error) {
      console.error("Error deleting category:", error)
      toast.error("An unexpected error occurred")
    }
  }

  const totalPages = Math.ceil(totalItems / itemsPerPage)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Toaster position="top-right" />

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Categories</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {totalItems} total categories
            </p>
          </div>

          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Add Category
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add New Category</DialogTitle>
                <DialogDescription>Create a new item category for your menu.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div>
                  <Label htmlFor="add-name">Name</Label>
                  <Input
                    id="add-name"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Enter category name"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="add-desc">Description</Label>
                  <Textarea
                    id="add-desc"
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="Enter category description"
                    className="mt-1.5 resize-none h-20"
                  />
                </div>
                <div>
                  <Label htmlFor="add-station">Station</Label>
                  <select
                    id="add-station"
                    value={newStation}
                    onChange={(e) => setNewStation(e.target.value as "BARISTA" | "COFFEE_MAKER" | "ALL")}
                    className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="ALL">All Stations</option>
                    <option value="BARISTA">Barista (Hot Drinks, Juice, Mocktails)</option>
                    <option value="COFFEE_MAKER">Coffee Maker</option>
                  </select>
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button onClick={handleAddCategory}>Create</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search categories..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value)
              setCurrentPage(1)
            }}
            className="pl-10 pr-9"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : categories.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                {searchTerm ? "No categories match your search" : "No categories yet"}
              </p>
              {!searchTerm && (
                <Button size="sm" onClick={() => setIsAddDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-1" />
                  Add Category
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
                    <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider px-6 py-3">
                      Name
                    </th>
                    <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider px-6 py-3">
                      Description
                    </th>
                    <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider px-6 py-3">
                      Status
                    </th>
                    <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider px-6 py-3">
                      Station
                    </th>
                    <th className="text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider px-6 py-3">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {categories.map((category) => (
                    <tr
                      key={category._id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <span className="font-medium text-gray-900 dark:text-white">
                          {category.name}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-500 dark:text-gray-400 line-clamp-1 max-w-xs block">
                          {category.description || "-"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <Badge
                          variant={category.isActive ? "default" : "outline"}
                          className={
                            category.isActive
                              ? "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800"
                              : ""
                          }
                        >
                          {category.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="outline" className={
                          category.station === "BARISTA"
                            ? "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800"
                            : category.station === "COFFEE_MAKER"
                            ? "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800"
                            : "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700"
                        }>
                          {category.station === "BARISTA" ? "Barista" : category.station === "COFFEE_MAKER" ? "Coffee Maker" : "All"}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => {
                              setEditCategory(category)
                              setIsEditDialogOpen(true)
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete category?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently delete &quot;{category.name}&quot;. This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteCategory(category._id)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Page {currentPage} of {totalPages}
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="w-3 h-3" />
                <ChevronLeft className="w-3 h-3 -ml-1" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number
                if (totalPages <= 5) {
                  pageNum = i + 1
                } else if (currentPage <= 3) {
                  pageNum = i + 1
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i
                } else {
                  pageNum = currentPage - 2 + i
                }
                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? "default" : "outline"}
                    size="icon"
                    className="h-8 w-8 text-sm"
                    onClick={() => setCurrentPage(pageNum)}
                  >
                    {pageNum}
                  </Button>
                )
              })}
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                disabled={currentPage >= totalPages}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage >= totalPages}
              >
                <ChevronRight className="w-3 h-3" />
                <ChevronRight className="w-3 h-3 -ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
            <DialogDescription>Update the category details below.</DialogDescription>
          </DialogHeader>
          {editCategory && (
            <div className="space-y-4 py-2">
              <div>
                <Label htmlFor="edit-name">Name</Label>
                <Input
                  id="edit-name"
                  value={editCategory.name}
                  onChange={(e) =>
                    setEditCategory({ ...editCategory, name: e.target.value })
                  }
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="edit-desc">Description</Label>
                <Textarea
                  id="edit-desc"
                  value={editCategory.description}
                  onChange={(e) =>
                    setEditCategory({ ...editCategory, description: e.target.value })
                  }
                  className="mt-1.5 resize-none h-20"
                />
              </div>
              <div>
                <Label htmlFor="edit-station">Station</Label>
                <select
                  id="edit-station"
                  value={editCategory.station || "ALL"}
                  onChange={(e) =>
                    setEditCategory({ ...editCategory, station: e.target.value as "BARISTA" | "COFFEE_MAKER" | "ALL" })
                  }
                  className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="ALL">All Stations</option>
                  <option value="BARISTA">Barista (Hot Drinks, Juice, Mocktails)</option>
                  <option value="COFFEE_MAKER">Coffee Maker</option>
                </select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditCategory}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
