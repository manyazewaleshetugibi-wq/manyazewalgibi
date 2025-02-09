"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Toaster, toast } from "react-hot-toast"
import { motion, AnimatePresence } from "framer-motion"
import { Plus, Grid, List, Search, Edit, Trash2, ChevronLeft, ChevronRight, Coffee, Pizza, Package } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
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
import React from "react"

interface ItemCategory {
  _id: string
  name: string
  description: string
  type: "FOOD" | "DRINK" | "OTHER"
  imageUrl: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

const typeIcons = {
  FOOD: Pizza,
  DRINK: Coffee,
  OTHER: Package,
}

export default function ItemCategoryPage() {
  const [categories, setCategories] = useState<ItemCategory[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(8)
  const [totalItems, setTotalItems] = useState(0)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [currentCategory, setCurrentCategory] = useState<ItemCategory | null>(null)

  const [newCategory, setNewCategory] = useState({
    name: "",
    description: "",
    type: "FOOD",
    imageBase64: "",
    isActive: true,
  })

  useEffect(() => {
    fetchCategories()
  }, [currentPage, searchTerm])

  const fetchCategories = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/item-category?page=${currentPage}&limit=${itemsPerPage}&search=${searchTerm}`)
      const data = await response.json()
      console.log("Full API response:", data) // Log the full response
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
    try {
      const response = await fetch("/api/item-category", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCategory),
      })
      const data = await response.json()
      console.log("Add category response:", data) // Log the response
      if (data.success) {
        toast.success("Category added successfully")
        setIsAddDialogOpen(false)
        fetchCategories()
      } else {
        toast.error(data.message || "Failed to add category")
      }
    } catch (error) {
      console.error("Error adding category:", error)
      toast.error("An unexpected error occurred")
    }
  }

  const handleEditCategory = async () => {
    if (!currentCategory) return
    try {
      // Create a new object with only the fields we want to update
      const updateData = {
        name: currentCategory.name,
        description: currentCategory.description,
        type: currentCategory.type,
        isActive: currentCategory.isActive,
        ...(currentCategory.imageBase64 ? { imageBase64: currentCategory.imageBase64 } : {}),
      }

      const response = await fetch(`/api/item-category/${currentCategory._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      })
      const data = await response.json()
      console.log("Edit category response:", data)
      if (data.success) {
        toast.success("Category updated successfully")
        setIsEditDialogOpen(false)
        fetchCategories()
      } else {
        toast.error(data.message || "Failed to update category")
      }
    } catch (error) {
      console.error("Error updating category:", error)
      toast.error("An unexpected error occurred")
    }
  }

  const handleDeleteCategory = async (id: string) => {
    try {
      const response = await fetch(`/api/item-category/${id}`, {
        method: "DELETE",
      })
      const data = await response.json()
      console.log("Delete category response:", data)
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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, isEdit: boolean) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        const base64String = reader.result as string
        if (isEdit && currentCategory) {
          setCurrentCategory({ ...currentCategory, imageBase64: base64String })
        } else {
          setNewCategory({ ...newCategory, imageBase64: base64String })
        }
      }
      reader.readAsDataURL(file)
    }
  }

  const renderGridView = () => (
    <motion.div
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <AnimatePresence>
        {categories.map((category) => (
          <motion.div
            key={category._id}
            layout
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="flex flex-col justify-between h-full hover:shadow-lg transition-shadow duration-300">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between">
                  <span className="truncate">{category.name}</span>
                  {React.createElement(typeIcons[category.type], { className: "w-5 h-5 text-primary" })}
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-2">
                <div className="relative w-full h-40 mb-2">
                  <Image
                    src={category.imageUrl || "/placeholder.svg"}
                    alt={category.name}
                    fill
                    className="object-cover rounded-md"
                  />
                </div>
                <p className="text-sm text-gray-600 line-clamp-2">{category.description}</p>
                <p className="text-sm font-semibold mt-2">{category.type}</p>
              </CardContent>
              <CardFooter className="flex justify-between pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setCurrentCategory(category)
                    setIsEditDialogOpen(true)
                  }}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm">
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the category.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDeleteCategory(category._id)}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardFooter>
            </Card>
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  )

  const renderListView = () => (
    <motion.div className="space-y-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <AnimatePresence>
        {categories.map((category) => (
          <motion.div
            key={category._id}
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="hover:shadow-md transition-shadow duration-300">
              <CardContent className="flex items-center p-4">
                <div className="relative w-24 h-24 mr-4">
                  <Image
                    src={category.imageUrl || "/placeholder.svg"}
                    alt={category.name}
                    fill
                    className="object-cover rounded-md"
                  />
                </div>
                <div className="flex-grow">
                  <h3 className="text-lg font-semibold flex items-center">
                    {category.name}
                    {React.createElement(typeIcons[category.type], { className: "w-5 h-5 text-primary ml-2" })}
                  </h3>
                  <p className="text-sm text-gray-600 line-clamp-2">{category.description}</p>
                  <p className="text-sm font-semibold mt-1">{category.type}</p>
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setCurrentCategory(category)
                      setIsEditDialogOpen(true)
                    }}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete the category.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDeleteCategory(category._id)}>Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  )

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <Toaster position="top-right" />
      <motion.h1
        className="text-4xl font-bold mb-8 text-center text-primary"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        Item Category Management
      </motion.h1>
      <motion.div
        className="flex flex-col sm:flex-row justify-between items-center mb-6 space-y-4 sm:space-y-0"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <div className="flex items-center space-x-4 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <Input
              type="text"
              placeholder="Search categories..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full"
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                {viewMode === "grid" ? <Grid className="w-4 h-4 mr-2" /> : <List className="w-4 h-4 mr-2" />}
                View
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setViewMode("grid")}>
                <Grid className="w-4 h-4 mr-2" /> Grid View
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setViewMode("list")}>
                <List className="w-4 h-4 mr-2" /> List View
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Category
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Category</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={newCategory.name}
                  onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={newCategory.description}
                  onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                />
              </div>
              <div>
                <Label>Type</Label>
                <RadioGroup
                  value={newCategory.type}
                  onValueChange={(value) =>
                    setNewCategory({ ...newCategory, type: value as "FOOD" | "DRINK" | "OTHER" })
                  }
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="FOOD" id="food" />
                    <Label htmlFor="food" className="flex items-center">
                      <Pizza className="w-4 h-4 mr-2" /> Food
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="DRINK" id="drink" />
                    <Label htmlFor="drink" className="flex items-center">
                      <Coffee className="w-4 h-4 mr-2" /> Drink
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="OTHER" id="other" />
                    <Label htmlFor="other" className="flex items-center">
                      <Package className="w-4 h-4 mr-2" /> Other
                    </Label>
                  </div>
                </RadioGroup>
              </div>
              <div>
                <Label htmlFor="image">Image</Label>
                <Input id="image" type="file" accept="image/*" onChange={(e) => handleImageUpload(e, false)} />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="isActive"
                  checked={newCategory.isActive}
                  onCheckedChange={(checked) => setNewCategory({ ...newCategory, isActive: checked })}
                />
                <Label htmlFor="isActive">Active</Label>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleAddCategory}>Add Category</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </motion.div>
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, index) => (
            <Card key={index} className="flex flex-col justify-between h-full">
              <CardHeader className="pb-2">
                <Skeleton className="h-6 w-3/4" />
              </CardHeader>
              <CardContent className="pb-2">
                <Skeleton className="h-40 w-full mb-2" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
              <CardFooter className="flex justify-between pt-2">
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-8 w-20" />
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : viewMode === "grid" ? (
        renderGridView()
      ) : (
        renderListView()
      )}
      <motion.div
        className="mt-8 flex justify-center items-center space-x-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <Button
          variant="outline"
          onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
          disabled={currentPage === 1}
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          Previous
        </Button>
        <span className="text-sm">
          Page {currentPage} of {Math.ceil(totalItems / itemsPerPage)}
        </span>
        <Button
          variant="outline"
          onClick={() => setCurrentPage((prev) => prev + 1)}
          disabled={currentPage >= Math.ceil(totalItems / itemsPerPage)}
        >
          Next
          <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
      </motion.div>
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
          </DialogHeader>
          {currentCategory && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-name">Name</Label>
                <Input
                  id="edit-name"
                  value={currentCategory.name}
                  onChange={(e) => setCurrentCategory({ ...currentCategory, name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-description">Description</Label>
                <Input
                  id="edit-description"
                  value={currentCategory.description}
                  onChange={(e) => setCurrentCategory({ ...currentCategory, description: e.target.value })}
                />
              </div>
              <div>
                <Label>Type</Label>
                <RadioGroup
                  value={currentCategory.type}
                  onValueChange={(value) =>
                    setCurrentCategory({ ...currentCategory, type: value as "FOOD" | "DRINK" | "OTHER" })
                  }
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="FOOD" id="edit-food" />
                    <Label htmlFor="edit-food" className="flex items-center">
                      <Pizza className="w-4 h-4 mr-2" /> Food
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="DRINK" id="edit-drink" />
                    <Label htmlFor="edit-drink" className="flex items-center">
                      <Coffee className="w-4 h-4 mr-2" /> Drink
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="OTHER" id="edit-other" />
                    <Label htmlFor="edit-other" className="flex items-center">
                      <Package className="w-4 h-4 mr-2" /> Other
                    </Label>
                  </div>
                </RadioGroup>
              </div>
              <div>
                <Label htmlFor="edit-image">Image</Label>
                <Input id="edit-image" type="file" accept="image/*" onChange={(e) => handleImageUpload(e, true)} />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="edit-isActive"
                  checked={currentCategory.isActive}
                  onCheckedChange={(checked) => setCurrentCategory({ ...currentCategory, isActive: checked })}
                />
                <Label htmlFor="edit-isActive">Active</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={handleEditCategory}>Update Category</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

