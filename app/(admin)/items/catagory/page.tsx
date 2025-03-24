"use client"

import { useState, useEffect, useMemo } from "react"
import Image from "next/image"
import { Toaster, toast } from "react-hot-toast"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Plus, Grid, List, Search, Edit, Trash2, ChevronLeft, ChevronRight, Coffee, Pizza, 
  Package, Filter, ArrowUpDown, Eye, EyeOff, RefreshCw, Download, Loader2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, 
  DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel 
} from "@/components/ui/dropdown-menu"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
import { 
  Select, 
  SelectContent, 
  SelectGroup, 
  SelectItem, 
  SelectLabel, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
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
  imageBase64?: string
}

const typeIcons = {
  FOOD: Pizza,
  DRINK: Coffee,
  OTHER: Package,
}

const typeColors = {
  FOOD: "bg-amber-100 text-amber-800 border-amber-200",
  DRINK: "bg-blue-100 text-blue-800 border-blue-200",
  OTHER: "bg-purple-100 text-purple-800 border-purple-200",
}

export default function ItemCategoryPage() {
  const [categories, setCategories] = useState<ItemCategory[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(8)
  const [totalItems, setTotalItems] = useState(0)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [currentCategory, setCurrentCategory] = useState<ItemCategory | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [sortBy, setSortBy] = useState<"name" | "createdAt" | "updatedAt">("createdAt")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [filterType, setFilterType] = useState<"ALL" | "FOOD" | "DRINK" | "OTHER">("ALL")
  const [filterActive, setFilterActive] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL")
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [bulkActionOpen, setBulkActionOpen] = useState(false)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    food: 0,
    drink: 0,
    other: 0,
  })

  const [newCategory, setNewCategory] = useState({
    name: "",
    description: "",
    type: "FOOD" as "FOOD" | "DRINK" | "OTHER",
    imageBase64: "",
    isActive: true,
  })

  // Load preferences from localStorage
  useEffect(() => {
    const savedViewMode = localStorage.getItem("categoryViewMode");
    const savedItemsPerPage = localStorage.getItem("categoryItemsPerPage");
    
    if (savedViewMode === "grid" || savedViewMode === "list") {
      setViewMode(savedViewMode);
    }
    
    if (savedItemsPerPage) {
      setItemsPerPage(parseInt(savedItemsPerPage));
    }
  }, []);

  // Save preferences to localStorage
  useEffect(() => {
    localStorage.setItem("categoryViewMode", viewMode);
    localStorage.setItem("categoryItemsPerPage", itemsPerPage.toString());
  }, [viewMode, itemsPerPage]);

  useEffect(() => {
    fetchCategories()
  }, [currentPage, itemsPerPage, sortBy, sortOrder, filterType, filterActive])

  // Reset page when search term changes
  useEffect(() => {
    setCurrentPage(1);
    const handler = setTimeout(() => {
      fetchCategories();
    }, 300);
    
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Calculate stats whenever categories change
  useEffect(() => {
    if (categories.length > 0) {
      const newStats = {
        total: categories.length,
        active: categories.filter(c => c.isActive).length,
        inactive: categories.filter(c => !c.isActive).length,
        food: categories.filter(c => c.type === "FOOD").length,
        drink: categories.filter(c => c.type === "DRINK").length,
        other: categories.filter(c => c.type === "OTHER").length,
      };
      setStats(newStats);
    }
  }, [categories]);

  const fetchCategories = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(
        `/api/item-category?page=${currentPage}&limit=${itemsPerPage}&search=${searchTerm}&sort=${sortBy}&order=${sortOrder}&type=${filterType}&active=${filterActive}`
      )
      const data = await response.json()
      console.log("Full API response:", data)
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

  const refreshData = async () => {
    setIsRefreshing(true);
    await fetchCategories();
    setIsRefreshing(false);
  };

  const exportData = () => {
    const dataToExport = categories.map(({ name, description, type, isActive, createdAt, updatedAt }) => ({
      name, description, type, isActive, createdAt, updatedAt
    }));
    
    const jsonString = JSON.stringify(dataToExport, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `item-categories-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success("Data exported successfully");
  };

  const handleBulkDelete = async () => {
    if (selectedCategories.length === 0) return;
    
    try {
      // This would need to be implemented in the API
      const response = await fetch("/api/item-category/bulk", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedCategories }),
      });
      
      const data = await response.json();
      if (data.success) {
        toast.success(`Successfully deleted ${selectedCategories.length} categories`);
        setSelectedCategories([]);
        fetchCategories();
      } else {
        toast.error(data.message || "Failed to delete categories");
      }
    } catch (error) {
      console.error("Error performing bulk delete:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setBulkActionOpen(false);
    }
  };

  const handleBulkToggleActive = async (setActive: boolean) => {
    if (selectedCategories.length === 0) return;
    
    try {
      // This would need to be implemented in the API
      const response = await fetch("/api/item-category/bulk", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          ids: selectedCategories,
          update: { isActive: setActive }
        }),
      });
      
      const data = await response.json();
      if (data.success) {
        toast.success(`Successfully updated ${selectedCategories.length} categories`);
        setSelectedCategories([]);
        fetchCategories();
      } else {
        toast.error(data.message || "Failed to update categories");
      }
    } catch (error) {
      console.error("Error performing bulk update:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setBulkActionOpen(false);
    }
  };

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
        // Reset form
        setNewCategory({
          name: "",
          description: "",
          type: "FOOD",
          imageBase64: "",
          isActive: true,
        })
      } else {
        toast.error(data.message || "Failed to add category")
      }
    } catch (error) {
      console.error("Error adding category:", error)
      toast.error("An unexpected error occurred")
    }
  }

  // Filtered categories based on search term, type, and active status
  const filteredCategories = useMemo(() => {
    return categories;
  }, [categories]);

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

  const toggleSelectCategory = (id: string) => {
    setSelectedCategories(prev => {
      if (prev.includes(id)) {
        return prev.filter(categoryId => categoryId !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const toggleSelectAll = () => {
    if (selectedCategories.length === categories.length) {
      setSelectedCategories([]);
    } else {
      setSelectedCategories(categories.map(c => c._id));
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const handlePageSizeChange = (value: string) => {
    setItemsPerPage(parseInt(value));
    setCurrentPage(1); // Reset to page 1 when changing page size
  };

  const handleSortChange = (value: string) => {
    // Parse sort string like "name-asc" or "createdAt-desc"
    const [field, order] = value.split('-');
    setSortBy(field as "name" | "createdAt" | "updatedAt");
    setSortOrder(order as "asc" | "desc");
  };

  const renderDetailView = () => {
    if (!currentCategory) return null;
    
    return (
      <div className="space-y-4">
        <div className="relative w-full h-64 mx-auto overflow-hidden rounded-lg mb-4">
          <Image
            src={currentCategory.imageUrl || "/placeholder.svg"}
            alt={currentCategory.name}
            fill
            className="object-cover"
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="text-sm font-medium text-gray-500">Name</h3>
            <p className="text-lg font-semibold">{currentCategory.name}</p>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-500">Type</h3>
            <div className="flex items-center mt-1">
              {React.createElement(typeIcons[currentCategory.type], { className: "w-5 h-5 mr-2" })}
              <Badge className={typeColors[currentCategory.type]}>{currentCategory.type}</Badge>
            </div>
          </div>
          
          <div className="md:col-span-2">
            <h3 className="text-sm font-medium text-gray-500">Description</h3>
            <p className="text-base">{currentCategory.description}</p>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-500">Status</h3>
            <Badge variant={currentCategory.isActive ? "default" : "outline"}>{currentCategory.isActive ? "Active" : "Inactive"}</Badge>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-500">ID</h3>
            <p className="text-sm font-mono">{currentCategory._id}</p>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-500">Created At</h3>
            <p className="text-sm">{formatDate(currentCategory.createdAt)}</p>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-500">Updated At</h3>
            <p className="text-sm">{formatDate(currentCategory.updatedAt)}</p>
          </div>
        </div>
        
        <div className="flex space-x-2 justify-end mt-4">
          <Button
            variant="outline"
            onClick={() => {
              setIsDetailDialogOpen(false);
              setIsEditDialogOpen(true);
            }}
          >
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Button>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
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
                <AlertDialogAction onClick={() => {
                  handleDeleteCategory(currentCategory._id);
                  setIsDetailDialogOpen(false);
                }}>
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    );
  };

  const renderGridView = () => (
    <motion.div
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <AnimatePresence>
        {filteredCategories.map((category) => (
          <motion.div
            key={category._id}
            layout
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.3 }}
            className="group"
          >
            <Card className={`flex flex-col justify-between h-full transition-all duration-300 ${
              selectedCategories.includes(category._id) 
                ? "ring-2 ring-primary ring-offset-2" 
                : "hover:shadow-lg"
            }`}>
              <CardHeader className="pb-2 flex items-start justify-between">
                <div className="flex items-center space-x-2">
                  <input 
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    checked={selectedCategories.includes(category._id)}
                    onChange={() => toggleSelectCategory(category._id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <CardTitle className="flex items-center">
                    <span className="truncate max-w-[150px]">{category.name}</span>
                  </CardTitle>
                </div>
                <Badge className={typeColors[category.type]}>
                  {React.createElement(typeIcons[category.type], { className: "w-3 h-3 mr-1 inline" })}
                  {category.type}
                </Badge>
              </CardHeader>
              <CardContent className="pb-2 relative group">
                <div 
                  className="relative w-full h-40 mb-2 cursor-pointer overflow-hidden rounded-md"
                  onClick={() => {
                    setCurrentCategory(category);
                    setIsDetailDialogOpen(true);
                  }}
                >
                  <Image
                    src={category.imageUrl || "/placeholder.svg"}
                    alt={category.name}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-10 transition-opacity duration-300" />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <Eye className="w-8 h-8 text-white drop-shadow-md" />
                  </div>
                </div>
                <p className="text-sm text-gray-600 line-clamp-2">{category.description}</p>
                <div className="flex justify-between items-center mt-2">
                  <Badge variant={category.isActive ? "default" : "outline"}>
                    {category.isActive ? "Active" : "Inactive"}
                  </Badge>
                  <p className="text-xs text-gray-500">{new Date(category.updatedAt).toLocaleDateString()}</p>
                </div>
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
      <div className="bg-white rounded-md overflow-hidden shadow">
        <div className="grid grid-cols-12 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-500">
          <div className="col-span-1 flex items-center">
            <input 
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              checked={selectedCategories.length === categories.length && categories.length > 0}
              onChange={toggleSelectAll}
            />
          </div>
          <div className="col-span-3">Name</div>
          <div className="col-span-3">Description</div>
          <div className="col-span-1">Type</div>
          <div className="col-span-1">Status</div>
          <div className="col-span-1">Updated</div>
          <div className="col-span-2 text-right">Actions</div>
        </div>
        
        <AnimatePresence>
          {filteredCategories.map((category) => (
            <motion.div
              key={category._id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className={`grid grid-cols-12 px-4 py-3 border-b border-gray-100 items-center ${
                selectedCategories.includes(category._id) ? "bg-primary-50" : "hover:bg-gray-50"
              }`}
            >
              <div className="col-span-1">
                <input 
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  checked={selectedCategories.includes(category._id)}
                  onChange={() => toggleSelectCategory(category._id)}
                />
              </div>
              <div className="col-span-3 flex items-center space-x-3">
                <div className="relative h-10 w-10 rounded-md overflow-hidden flex-shrink-0">
                  <Image
                    src={category.imageUrl || "/placeholder.svg"}
                    alt={category.name}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="truncate font-medium">{category.name}</div>
              </div>
              <div className="col-span-3 text-sm text-gray-600 truncate">{category.description}</div>
              <div className="col-span-1">
                <Badge className={typeColors[category.type]}>
                  {React.createElement(typeIcons[category.type], { className: "w-3 h-3 mr-1 inline" })}
                  {category.type}
                </Badge>
              </div>
              <div className="col-span-1">
                <Badge variant={category.isActive ? "default" : "outline"}>
                  {category.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
              <div className="col-span-1 text-xs text-gray-500">
                {new Date(category.updatedAt).toLocaleDateString()}
              </div>
              <div className="col-span-2 flex justify-end space-x-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost" 
                        size="icon"
                        onClick={() => {
                          setCurrentCategory(category);
                          setIsDetailDialogOpen(true);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>View Details</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost" 
                        size="icon"
                        onClick={() => {
                          setCurrentCategory(category);
                          setIsEditDialogOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Edit</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                
                <AlertDialog>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </AlertDialogTrigger>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Delete</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the category.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDeleteCategory(category._id)}>
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  )

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <Toaster position="top-right" />
      <motion.h1
        className="text-4xl font-bold mb-6 text-center text-primary"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        Item Category Management
      </motion.h1>
      
      {/* Stats Cards */}
      <motion.div 
        className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Total Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <span className="text-3xl font-bold">{stats.total}</span>
              <div className="p-2 rounded-full bg-primary/10">
                <Package className="w-5 h-5 text-primary" />
              </div>
            </div>
            <div className="mt-2 flex gap-2 text-xs">
              <Badge className={typeColors.FOOD}>{stats.food} Food</Badge>
              <Badge className={typeColors.DRINK}>{stats.drink} Drink</Badge>
              <Badge className={typeColors.OTHER}>{stats.other} Other</Badge>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Active Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <span className="text-3xl font-bold">{stats.active}</span>
              <div className="p-2 rounded-full bg-green-100">
                <Eye className="w-5 h-5 text-green-600" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-xs text-gray-500">
                {stats.total > 0 
                  ? `${Math.round((stats.active / stats.total) * 100)}% of total categories`
                  : "No categories"}
              </span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Inactive Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <span className="text-3xl font-bold">{stats.inactive}</span>
              <div className="p-2 rounded-full bg-gray-100">
                <EyeOff className="w-5 h-5 text-gray-600" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-xs text-gray-500">
                {stats.total > 0 
                  ? `${Math.round((stats.inactive / stats.total) * 100)}% of total categories` 
                  : "No categories"}
              </span>
            </div>
          </CardContent>
        </Card>
      </motion.div>
      
      <motion.div
        className="flex flex-col space-y-4 mb-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <Tabs defaultValue="browse" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="browse">Browse Categories</TabsTrigger>
            <TabsTrigger value="actions">Bulk Actions {selectedCategories.length > 0 && 
              <Badge variant="outline" className="ml-2">{selectedCategories.length}</Badge>}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="browse" className="space-y-4">
            <div className="flex flex-col md:flex-row justify-between gap-4">
              <div className="flex flex-col sm:flex-row gap-2 w-full">
                {/* Search */}
                <div className="relative w-full md:w-64">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Search categories..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-full"
                  />
                </div>
                
                {/* Filter & Sort */}
                <div className="flex gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="flex items-center">
                        <Filter className="w-4 h-4 mr-2" />
                        Filter
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuLabel>Category Type</DropdownMenuLabel>
                      <DropdownMenuItem 
                        className={filterType === 'ALL' ? 'bg-primary/10' : ''} 
                        onClick={() => setFilterType('ALL')}
                      >
                        All Types
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className={filterType === 'FOOD' ? 'bg-primary/10' : ''} 
                        onClick={() => setFilterType('FOOD')}
                      >
                        <Pizza className="w-4 h-4 mr-2" /> Food
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className={filterType === 'DRINK' ? 'bg-primary/10' : ''} 
                        onClick={() => setFilterType('DRINK')}
                      >
                        <Coffee className="w-4 h-4 mr-2" /> Drink
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className={filterType === 'OTHER' ? 'bg-primary/10' : ''} 
                        onClick={() => setFilterType('OTHER')}
                      >
                        <Package className="w-4 h-4 mr-2" /> Other
                      </DropdownMenuItem>
                      
                      <DropdownMenuSeparator />
                      
                      <DropdownMenuLabel>Status</DropdownMenuLabel>
                      <DropdownMenuItem 
                        className={filterActive === 'ALL' ? 'bg-primary/10' : ''} 
                        onClick={() => setFilterActive('ALL')}
                      >
                        All Status
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className={filterActive === 'ACTIVE' ? 'bg-primary/10' : ''} 
                        onClick={() => setFilterActive('ACTIVE')}
                      >
                        <Eye className="w-4 h-4 mr-2" /> Active
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className={filterActive === 'INACTIVE' ? 'bg-primary/10' : ''} 
                        onClick={() => setFilterActive('INACTIVE')}
                      >
                        <EyeOff className="w-4 h-4 mr-2" /> Inactive
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="flex items-center">
                        <ArrowUpDown className="w-4 h-4 mr-2" />
                        Sort
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem 
                        className={sortBy === 'name' && sortOrder === 'asc' ? 'bg-primary/10' : ''}
                        onClick={() => handleSortChange('name-asc')}
                      >
                        Name (A-Z)
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className={sortBy === 'name' && sortOrder === 'desc' ? 'bg-primary/10' : ''}
                        onClick={() => handleSortChange('name-desc')}
                      >
                        Name (Z-A)
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className={sortBy === 'createdAt' && sortOrder === 'desc' ? 'bg-primary/10' : ''}
                        onClick={() => handleSortChange('createdAt-desc')}
                      >
                        Newest First
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className={sortBy === 'createdAt' && sortOrder === 'asc' ? 'bg-primary/10' : ''}
                        onClick={() => handleSortChange('createdAt-asc')}
                      >
                        Oldest First
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className={sortBy === 'updatedAt' && sortOrder === 'desc' ? 'bg-primary/10' : ''}
                        onClick={() => handleSortChange('updatedAt-desc')}
                      >
                        Recently Updated
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="flex items-center">
                        {viewMode === "grid" ? <Grid className="w-4 h-4 mr-2" /> : <List className="w-4 h-4 mr-2" />}
                        View
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem 
                        className={viewMode === 'grid' ? 'bg-primary/10' : ''}
                        onClick={() => setViewMode("grid")}
                      >
                        <Grid className="w-4 h-4 mr-2" /> Grid View
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className={viewMode === 'list' ? 'bg-primary/10' : ''}
                        onClick={() => setViewMode("list")}
                      >
                        <List className="w-4 h-4 mr-2" /> List View
                      </DropdownMenuItem>
                      
                      <DropdownMenuSeparator />
                      
                      <DropdownMenuLabel>Items per page</DropdownMenuLabel>
                      {[8, 12, 24, 48].map(size => (
                        <DropdownMenuItem 
                          key={size}
                          className={itemsPerPage === size ? 'bg-primary/10' : ''}
                          onClick={() => handlePageSizeChange(size.toString())}
                        >
                          {size} items
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Button variant="outline" className="whitespace-nowrap" onClick={refreshData} disabled={isRefreshing}>
                  {isRefreshing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                  Refresh
                </Button>
                
                <Button variant="outline" className="whitespace-nowrap" onClick={exportData}>
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
                
                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Category
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                      <DialogTitle>Add New Category</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
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
                        <Textarea
                          id="description"
                          value={newCategory.description}
                          onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                          className="min-h-24"
                        />
                      </div>
                      <div>
                        <Label>Type</Label>
                        <RadioGroup
                          value={newCategory.type}
                          onValueChange={(value) =>
                            setNewCategory({ ...newCategory, type: value as "FOOD" | "DRINK" | "OTHER" })
                          }
                          className="flex flex-col space-y-2 mt-2"
                        >
                          <div className="flex items-center space-x-2 p-2 rounded-md hover:bg-gray-50">
                            <RadioGroupItem value="FOOD" id="food" />
                            <Label htmlFor="food" className="flex items-center cursor-pointer">
                              <Pizza className="w-4 h-4 mr-2 text-amber-600" /> 
                              <span>Food</span>
                              <Badge className={`${typeColors.FOOD} ml-2`}>FOOD</Badge>
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2 p-2 rounded-md hover:bg-gray-50">
                            <RadioGroupItem value="DRINK" id="drink" />
                            <Label htmlFor="drink" className="flex items-center cursor-pointer">
                              <Coffee className="w-4 h-4 mr-2 text-blue-600" /> 
                              <span>Drink</span>
                              <Badge className={`${typeColors.DRINK} ml-2`}>DRINK</Badge>
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2 p-2 rounded-md hover:bg-gray-50">
                            <RadioGroupItem value="OTHER" id="other" />
                            <Label htmlFor="other" className="flex items-center cursor-pointer">
                              <Package className="w-4 h-4 mr-2 text-purple-600" /> 
                              <span>Other</span>
                              <Badge className={`${typeColors.OTHER} ml-2`}>OTHER</Badge>
                            </Label>
                          </div>
                        </RadioGroup>
                      </div>
                      <div>
                        <Label htmlFor="image">Image</Label>
                        <div className="mt-2">
                          <Input 
                            id="image" 
                            type="file" 
                            accept="image/*" 
                            onChange={(e) => handleImageUpload(e, false)} 
                          />
                          {newCategory.imageBase64 && (
                            <div className="mt-2 relative w-full h-32 rounded-md overflow-hidden">
                              <Image 
                                src={newCategory.imageBase64} 
                                alt="Preview" 
                                fill 
                                className="object-cover" 
                              />
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 p-3 rounded-md bg-gray-50">
                        <Switch
                          id="isActive"
                          checked={newCategory.isActive}
                          onCheckedChange={(checked) => setNewCategory({ ...newCategory, isActive: checked })}
                        />
                        <Label htmlFor="isActive" className="flex items-center cursor-pointer">
                          {newCategory.isActive ? (
                            <>
                              <Eye className="w-4 h-4 mr-2 text-green-600" /> Active
                            </>
                          ) : (
                            <>
                              <EyeOff className="w-4 h-4 mr-2 text-gray-600" /> Inactive
                            </>
                          )}
                        </Label>
                      </div>
                    </div>
                    <DialogFooter className="mt-4">
                      <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                      <Button onClick={handleAddCategory}>Add Category</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
            
            {/* Applied filters */}
            {(filterType !== 'ALL' || filterActive !== 'ALL' || searchTerm) && (
              <div className="flex flex-wrap gap-2 mt-2">
                {searchTerm && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Search className="w-3 h-3" />
                    Search: {searchTerm}
                    <button 
                      className="ml-1 rounded-full hover:bg-gray-200 p-0.5" 
                      onClick={() => setSearchTerm('')}
                    >
                      ×
                    </button>
                  </Badge>
                )}
                
                {filterType !== 'ALL' && (
                  <Badge variant="secondary" className={`flex items-center gap-1 ${typeColors[filterType].split(' ')[0]}`}>
                    {React.createElement(typeIcons[filterType], { className: "w-3 h-3" })}
                    Type: {filterType}
                    <button 
                      className="ml-1 rounded-full hover:bg-gray-200 p-0.5" 
                      onClick={() => setFilterType('ALL')}
                    >
                      ×
                    </button>
                  </Badge>
                )}
                
                {filterActive !== 'ALL' && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    {filterActive === 'ACTIVE' ? (
                      <Eye className="w-3 h-3" />
                    ) : (
                      <EyeOff className="w-3 h-3" />
                    )}
                    Status: {filterActive}
                    <button 
                      className="ml-1 rounded-full hover:bg-gray-200 p-0.5" 
                      onClick={() => setFilterActive('ALL')}
                    >
                      ×
                    </button>
                  </Badge>
                )}
                
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => {
                    setFilterType('ALL');
                    setFilterActive('ALL');
                    setSearchTerm('');
                  }}
                  className="h-6 text-xs"
                >
                  Clear All
                </Button>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="actions" className="space-y-4">
            <div className="flex space-x-2">
              <Button variant="outline" onClick={handleBulkDelete}>
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Selected
              </Button>
              <Button variant="outline" onClick={() => setBulkActionOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Toggle Active
              </Button>
            </div>
            <Dialog open={bulkActionOpen} onOpenChange={setBulkActionOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Bulk Action</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="bulk-active">Set all selected categories to</Label>
                    <RadioGroup
                      value={selectedCategories.length > 0 ? (selectedCategories.every(id => categories.find(c => c._id === id)?.isActive) ? "ACTIVE" : "INACTIVE") : "ALL"}
                      onValueChange={(value) => {
                        if (value === "ALL") {
                          setSelectedCategories([]);
                        } else {
                          setSelectedCategories(categories.filter(c => c.isActive === (value === "ACTIVE")).map(c => c._id));
                        }
                      }}
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="ALL" id="all" />
                        <Label htmlFor="all">All</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="ACTIVE" id="active" />
                        <Label htmlFor="active">Active</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="INACTIVE" id="inactive" />
                        <Label htmlFor="inactive">Inactive</Label>
                      </div>
                    </RadioGroup>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setBulkActionOpen(false)}>Cancel</Button>
                  <Button onClick={() => {
                    handleBulkToggleActive(selectedCategories.length > 0 ? (selectedCategories.every(id => categories.find(c => c._id === id)?.isActive) ? true : false) : true);
                    setBulkActionOpen(false);
                  }}>Confirm</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>
        </Tabs>
      </motion.div>
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(itemsPerPage)].map((_, index) => (
            <Card key={index} className="flex flex-col justify-between h-full group">
              <CardHeader className="pb-2">
                <div className="flex justify-between">
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-6 w-16" />
                </div>
              </CardHeader>
              <CardContent className="pb-2">
                <Skeleton className="h-40 w-full mb-2 rounded-md" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-2/3 mb-2" />
                <div className="flex justify-between mt-2">
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-4 w-20" />
                </div>
              </CardContent>
              <CardFooter className="flex justify-between pt-2">
                <Skeleton className="h-9 w-20" />
                <Skeleton className="h-9 w-20" />
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : filteredCategories.length > 0 ? (
        <>
          {viewMode === "grid" ? renderGridView() : renderListView()}
          
          <motion.div
            className="mt-8 flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <div className="text-sm text-gray-500">
              Showing {(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} categories
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              
              <div className="flex items-center space-x-1">
                {Array.from({ length: Math.min(5, Math.ceil(totalItems / itemsPerPage)) }, (_, i) => {
                  // Calculate the page number to render
                  let pageNum;
                  const totalPages = Math.ceil(totalItems / itemsPerPage);
                  
                  if (totalPages <= 5) {
                    // If we have 5 or fewer pages, just show them all
                    pageNum = i + 1;
                  } else {
                    // Otherwise, show a window around the current page
                    if (currentPage <= 3) {
                      // Near the start
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      // Near the end
                      pageNum = totalPages - 4 + i;
                    } else {
                      // In the middle
                      pageNum = currentPage - 2 + i;
                    }
                  }
                  
                  return (
                    <Button
                      key={i}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="sm"
                      className="w-9 h-9 p-0"
                      onClick={() => setCurrentPage(pageNum)}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => prev + 1)}
                disabled={currentPage >= Math.ceil(totalItems / itemsPerPage)}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.ceil(totalItems / itemsPerPage))}
                disabled={currentPage >= Math.ceil(totalItems / itemsPerPage)}
              >
                <ChevronRight className="w-4 h-4" />
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </motion.div>
        </>
      ) : (
        <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
          <div className="p-4 rounded-full bg-gray-100">
            <Package className="w-10 h-10 text-gray-400" />
          </div>
          <h3 className="text-xl font-medium">No categories found</h3>
          <p className="text-gray-500 max-w-md">
            {searchTerm || filterType !== 'ALL' || filterActive !== 'ALL'
              ? "Try adjusting your search or filter to find what you're looking for."
              : "Get started by adding a new category to your menu."}
          </p>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Category
          </Button>
        </div>
      )}
      
      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
          </DialogHeader>
          {currentCategory && (
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
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
                <Textarea
                  id="edit-description"
                  value={currentCategory.description}
                  onChange={(e) => setCurrentCategory({ ...currentCategory, description: e.target.value })}
                  className="min-h-24"
                />
              </div>
              <div>
                <Label>Type</Label>
                <RadioGroup
                  value={currentCategory.type}
                  onValueChange={(value) =>
                    setCurrentCategory({ ...currentCategory, type: value as "FOOD" | "DRINK" | "OTHER" })
                  }
                  className="flex flex-col space-y-2 mt-2"
                >
                  <div className="flex items-center space-x-2 p-2 rounded-md hover:bg-gray-50">
                    <RadioGroupItem value="FOOD" id="edit-food" />
                    <Label htmlFor="edit-food" className="flex items-center cursor-pointer">
                      <Pizza className="w-4 h-4 mr-2 text-amber-600" />
                      <span>Food</span>
                      <Badge className={`${typeColors.FOOD} ml-2`}>FOOD</Badge>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 p-2 rounded-md hover:bg-gray-50">
                    <RadioGroupItem value="DRINK" id="edit-drink" />
                    <Label htmlFor="edit-drink" className="flex items-center cursor-pointer">
                      <Coffee className="w-4 h-4 mr-2 text-blue-600" />
                      <span>Drink</span>
                      <Badge className={`${typeColors.DRINK} ml-2`}>DRINK</Badge>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 p-2 rounded-md hover:bg-gray-50">
                    <RadioGroupItem value="OTHER" id="edit-other" />
                    <Label htmlFor="edit-other" className="flex items-center cursor-pointer">
                      <Package className="w-4 h-4 mr-2 text-purple-600" />
                      <span>Other</span>
                      <Badge className={`${typeColors.OTHER} ml-2`}>OTHER</Badge>
                    </Label>
                  </div>
                </RadioGroup>
              </div>
              <div>
                <Label htmlFor="edit-image">Image</Label>
                <div className="mt-2">
                  <Input 
                    id="edit-image" 
                    type="file" 
                    accept="image/*" 
                    onChange={(e) => handleImageUpload(e, true)} 
                  />
                  <div className="mt-4 relative w-full h-40 rounded-md overflow-hidden">
                    <Image
                      src={currentCategory.imageBase64 || currentCategory.imageUrl || "/placeholder.svg"}
                      alt={currentCategory.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2 p-3 rounded-md bg-gray-50">
                <Switch
                  id="edit-isActive"
                  checked={currentCategory.isActive}
                  onCheckedChange={(checked) => setCurrentCategory({ ...currentCategory, isActive: checked })}
                />
                <Label htmlFor="edit-isActive" className="flex items-center cursor-pointer">
                  {currentCategory.isActive ? (
                    <>
                      <Eye className="w-4 h-4 mr-2 text-green-600" /> Active
                    </>
                  ) : (
                    <>
                      <EyeOff className="w-4 h-4 mr-2 text-gray-600" /> Inactive
                    </>
                  )}
                </Label>
              </div>
            </div>
          )}
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleEditCategory}>Update Category</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* View Details Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Category Details</DialogTitle>
          </DialogHeader>
          {renderDetailView()}
        </DialogContent>
      </Dialog>
    </div>
  )
}

