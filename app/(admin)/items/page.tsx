"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useForm, useFieldArray, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Toaster, toast } from "react-hot-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, Plus, Edit, Trash2, Clock, Utensils, Star, Save, X, Tag, Loader2, Eye, ChefHat, Menu, ArrowUpDown, Filter, Coffee, Upload, XCircle } from 'lucide-react'
import { useDebouncedCallback } from "use-debounce"
import { api } from "@/utils/api"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"

// Define MenuItem as a frontend type that includes the necessary properties for the component
interface MenuItem {
  _id?: string;
  id?: string;
  name: string;
  description: string;
  price: number;
  cost?: number;
  categoryId: string;
  category?: string;
  imageUrl?: string;
  cloudinaryData?: {
    publicId: string;
    url: string;
    format: string;
    bytes: number;
    width?: number;
    height?: number;
  };
  requiredStock?: {
    stockId: string;
    quantity: number;
  }[];
  nutritionalInfo?: {
    calories: number;
    protein: number;
    carbohydrates: number;
    fat: number;
  };
  preparationTime?: number;
  isActive?: boolean;
  isFeatured?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// Validation schema for form
const ItemSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().min(1, "Description is required"),
  categoryId: z.string().min(1, "Category is required"),
  price: z.number().min(0, "Price must be positive"),
  imageUrl: z.string().nullable().optional(),
  image: z.any().optional(),
  requiredStock: z.array(
    z.object({
      stockId: z.string(),
      quantity: z.number().min(0, "Quantity must be positive"),
    }),
  ).optional(),
  nutritionalInfo: z.object({
    calories: z.number().min(0),
    protein: z.number().min(0),
    carbohydrates: z.number().min(0),
    fat: z.number().min(0),
  }).optional(),
  preparationTime: z.number().min(0).optional(),
  isActive: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
})

type ItemCategory = {
  _id: string
  name: string
}

type Stock = {
  _id: string
  name: string
}

// Helper function to safely get values with defaults
const getSafeValue = <T,>(value: T | undefined | null, defaultValue: T): T => {
  return value !== undefined && value !== null ? value : defaultValue;
};

// Default values for nutritional info
const DEFAULT_NUTRITIONAL_INFO = {
  calories: 0,
  protein: 0,
  carbohydrates: 0,
  fat: 0
};

// Default values for required stock
const DEFAULT_REQUIRED_STOCK: { stockId: string; quantity: number }[] = [];

// Main component
export default function RestaurantMenuManagement() {
  const [categories, setCategories] = useState<ItemCategory[]>([])
  const [stocks, setStocks] = useState<Stock[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [filteredItems, setFilteredItems] = useState<MenuItem[]>([])
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isViewDetailsOpen, setIsViewDetailsOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(8)
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000])
  const [isLoading, setIsLoading] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<MenuItem & { image?: File }>({
    resolver: zodResolver(ItemSchema),
    defaultValues: {
      requiredStock: DEFAULT_REQUIRED_STOCK,
      nutritionalInfo: DEFAULT_NUTRITIONAL_INFO,
      isActive: true,
      isFeatured: false,
      preparationTime: 10,
      price: 0,
    },
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: "requiredStock" as any,
  })

  const debouncedSearch = useDebouncedCallback((value) => {
    setSearchTerm(value)
  }, 300)

  const debouncedPriceRange = useDebouncedCallback((value) => {
    setPriceRange(value)
  }, 300)

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const [categoriesData, stocksData, menuItemsData] = await Promise.all([
          api.fetchItemCategories(),
          api.fetchStocks(),
          api.fetchMenuItems(),
        ])
        setCategories(categoriesData.data || categoriesData.categories || [])
        setStocks(stocksData.data || stocksData.stocks || [])
        const items = menuItemsData.items || menuItemsData.data || []
        // Ensure all items have proper defaults
        const normalizedItems = items.map((item: MenuItem) => ({
          ...item,
          requiredStock: item.requiredStock || DEFAULT_REQUIRED_STOCK,
          nutritionalInfo: item.nutritionalInfo || DEFAULT_NUTRITIONAL_INFO,
          preparationTime: getSafeValue(item.preparationTime, 10),
          isActive: getSafeValue(item.isActive, true),
          isFeatured: getSafeValue(item.isFeatured, false),
          price: getSafeValue(item.price, 0),
        }))
        setMenuItems(normalizedItems)
        setFilteredItems(normalizedItems)
      } catch (error) {
        console.error("Failed to fetch data:", error)
        setError("Failed to load data. Please try again later.")
        toast.error("Failed to fetch data")
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [])

  useEffect(() => {
    const filtered = menuItems.filter((item) => {
      const matchesSearch = searchTerm === "" || (item.name?.toLowerCase() || '').includes(searchTerm.toLowerCase())
      const matchesCategory = categoryFilter === "all" || item.categoryId === categoryFilter
      const matchesPrice = (item.price || 0) >= priceRange[0] && (item.price || 0) <= priceRange[1]
      return matchesSearch && matchesCategory && matchesPrice
    })
    setFilteredItems(filtered)
    setCurrentPage(1)
  }, [searchTerm, categoryFilter, priceRange, menuItems])

  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentItems = filteredItems.slice(indexOfFirstItem, indexOfLastItem)

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber)

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    if (!validTypes.includes(file.type)) {
      toast.error('Please upload a valid image file (JPEG, PNG, GIF, WebP)')
      return
    }

    // Validate file size (max 10MB to match API)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      toast.error('Image size should be less than 10MB')
      return
    }

    setSelectedImage(file)
    
    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setImagePreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const removeImage = () => {
    setSelectedImage(null)
    setImagePreview(null)
    setValue("imageUrl", null)
  }

  const handleCreateOrUpdate = async (data: MenuItem & { image?: File }) => {
    setIsLoading(true)
    setIsUploading(true)
    setUploadProgress(0)
    setError(null)
    
    try {
      // Create FormData for file upload
      const formData = new FormData()
      
      // Add basic fields with null checks
      formData.append("name", data.name || "")
      formData.append("description", data.description || "")
      formData.append("categoryId", data.categoryId || "")
      formData.append("price", (data.price || 0).toString())
      formData.append("preparationTime", (data.preparationTime || 10).toString())
      formData.append("isActive", (data.isActive ?? true).toString())
      formData.append("isFeatured", (data.isFeatured ?? false).toString())
      
      // Add nutritional info with defaults
      const nutritionalInfo = data.nutritionalInfo || DEFAULT_NUTRITIONAL_INFO
      formData.append("nutritionalInfo", JSON.stringify(nutritionalInfo))
      
      // Add required stock with defaults
      const validRequiredStock = (data.requiredStock || DEFAULT_REQUIRED_STOCK).filter(stock => stock.stockId && stock.quantity > 0)
      formData.append("requiredStock", JSON.stringify(validRequiredStock))
      
      // Handle image logic
      if (selectedImage) {
        formData.append('image', selectedImage);
      } else if (data.imageUrl) { // if it's a string (URL), keep it
        formData.append('imageUrl', data.imageUrl);
      } else if (selectedItem && selectedItem.imageUrl) {
        // This means an existing image was removed (data.imageUrl is null/undefined/empty)
        formData.append("removeImage", "true")
      }
      
      console.log("Sending data to API...")
      
      let response
      const isUpdate = selectedItem && selectedItem._id
      
      if (isUpdate) {
        // Simulate upload progress
        const progressInterval = setInterval(() => {
          setUploadProgress(prev => {
            if (prev >= 90) {
              clearInterval(progressInterval)
              return 90
            }
            return prev + 10
          })
        }, 300)
        
        // Update existing item
        response = await api.updateMenuItem(selectedItem!._id!, formData)
        
        clearInterval(progressInterval)
        setUploadProgress(100)
        
        if (response && response.success) {
          toast.success("Item updated successfully")
        } else {
          throw new Error(response?.message || "Failed to update item")
        }
      } else {
        // Simulate upload progress
        const progressInterval = setInterval(() => {
          setUploadProgress(prev => {
            if (prev >= 90) {
              clearInterval(progressInterval)
              return 90
            }
            return prev + 10
          })
        }, 300)
        
        // Create new item
        response = await api.createMenuItem(formData)
        
        clearInterval(progressInterval)
        setUploadProgress(100)
        
        if (response && response.success) {
          toast.success("Item created successfully")
        } else {
          throw new Error(response?.message || "Failed to create item")
        }
      }
      
      // Wait a bit to show completion
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Refresh menu items
      const updatedItems = await api.fetchMenuItems()
      const items = updatedItems.items || updatedItems.data || []
      // Ensure all items have proper defaults
      const normalizedItems = items.map((item: MenuItem) => ({
        ...item,
        requiredStock: item.requiredStock || DEFAULT_REQUIRED_STOCK,
        nutritionalInfo: item.nutritionalInfo || DEFAULT_NUTRITIONAL_INFO,
        preparationTime: getSafeValue(item.preparationTime, 10),
        isActive: getSafeValue(item.isActive, true),
        isFeatured: getSafeValue(item.isFeatured, false),
        price: getSafeValue(item.price, 0),
      }))
      setMenuItems(normalizedItems)
      setFilteredItems(normalizedItems)
      
      // Reset form state
      reset()
      setSelectedImage(null)
      setImagePreview(null)
      setSelectedItem(null)
      setIsDialogOpen(false)
      
    } catch (error: any) {
      console.error("Error saving item:", error)
      
      // Extract meaningful error message
      let errorMessage = "Failed to save item. Please try again."
      
      if (error.message && error.message.includes("500")) {
        errorMessage = "Server error occurred. Please check your API endpoint."
      } else if (error.message && error.message.includes("400")) {
        errorMessage = "Invalid data sent to server. Please check your inputs."
      } else if (error.message && error.message.includes("404")) {
        errorMessage = "API endpoint not found. Please check your API configuration."
      } else if (error.message) {
        errorMessage = error.message
      }
      
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  const handleDelete = async (id: string) => {
    setItemToDelete(id)
    setIsDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!itemToDelete) return
    
    setIsLoading(true)
    setError(null)
    try {
      await api.deleteMenuItem(itemToDelete)
      const updatedItems = await api.fetchMenuItems()
      const items = updatedItems.items || updatedItems.data || []
      // Ensure all items have proper defaults
      const normalizedItems = items.map((item: MenuItem) => ({
        ...item,
        requiredStock: item.requiredStock || DEFAULT_REQUIRED_STOCK,
        nutritionalInfo: item.nutritionalInfo || DEFAULT_NUTRITIONAL_INFO,
        preparationTime: getSafeValue(item.preparationTime, 10),
        isActive: getSafeValue(item.isActive, true),
        isFeatured: getSafeValue(item.isFeatured, false),
        price: getSafeValue(item.price, 0),
      }))
      setMenuItems(normalizedItems)
      setFilteredItems(normalizedItems)
      toast.success("Item deleted successfully")
    } catch (error) {
      console.error("Error deleting item:", error)
      setError("Failed to delete item. Please try again.")
      toast.error("An error occurred while deleting the item")
    } finally {
      setIsLoading(false)
      setIsDeleteDialogOpen(false)
      setItemToDelete(null)
    }
  }

  const handleEdit = (item: MenuItem) => {
    setSelectedItem(item)
    setImagePreview(item.imageUrl || null)
    setSelectedImage(null)
    
    // Ensure all fields have defaults
    const itemToEdit = {
      ...item,
      requiredStock: item.requiredStock || DEFAULT_REQUIRED_STOCK,
      nutritionalInfo: item.nutritionalInfo || DEFAULT_NUTRITIONAL_INFO,
      preparationTime: getSafeValue(item.preparationTime, 10),
      isActive: getSafeValue(item.isActive, true),
      isFeatured: getSafeValue(item.isFeatured, false),
      price: getSafeValue(item.price, 0),
    }
    reset(itemToEdit)
    setIsDialogOpen(true)
  }

  const handleViewDetails = (item: MenuItem) => {
    setSelectedItem(item)
    setIsViewDetailsOpen(true)
  }

  const handleNewItem = () => {
    setSelectedItem(null)
    setImagePreview(null)
    setSelectedImage(null)
    reset({
      requiredStock: DEFAULT_REQUIRED_STOCK,
      nutritionalInfo: DEFAULT_NUTRITIONAL_INFO,
      isActive: true,
      isFeatured: false,
      price: 0,
      preparationTime: 10,
      name: "",
      description: "",
      categoryId: "",
    })
    setIsDialogOpen(true)
  }

  const getItemImage = (item: MenuItem) => {
    return item.imageUrl || "/placeholder.svg"
  }

  // Helper function to get nutritional info safely
  const getNutritionalInfo = (item: MenuItem | null) => {
    if (!item || !item.nutritionalInfo) return DEFAULT_NUTRITIONAL_INFO
    return {
      calories: getSafeValue(item.nutritionalInfo.calories, 0),
      protein: getSafeValue(item.nutritionalInfo.protein, 0),
      carbohydrates: getSafeValue(item.nutritionalInfo.carbohydrates, 0),
      fat: getSafeValue(item.nutritionalInfo.fat, 0)
    }
  }

  // Helper function to get required stock safely
  const getRequiredStock = (item: MenuItem | null) => {
    if (!item || !item.requiredStock) return DEFAULT_REQUIRED_STOCK
    return item.requiredStock
  }

  if (isLoading && menuItems.length === 0) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-gray-50">
        <div className="relative w-20 h-20">
          <div className="absolute inset-0 flex items-center justify-center">
            <ChefHat className="h-8 w-8 text-indigo-600" />
          </div>
          <div className="absolute inset-0 border-4 border-t-indigo-600 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
        </div>
        <p className="mt-4 text-indigo-800 font-medium">Loading menu items...</p>
      </div>
    )
  }

  if (error && menuItems.length === 0) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-red-50">
        <div className="max-w-md w-full p-8 bg-white rounded-lg shadow-lg">
          <div className="flex items-center justify-center bg-red-100 h-16 w-16 rounded-full mb-4 mx-auto">
            <X className="h-8 w-8 text-red-600" />
          </div>
          <h2 className="text-center text-2xl font-bold text-red-700 mb-2">Error Loading Data</h2>
          <p className="text-center text-gray-700 mb-6">{error}</p>
          <Button 
            onClick={() => window.location.reload()} 
            className="w-full bg-red-600 hover:bg-red-700"
          >
            <Loader2 className="mr-2 h-4 w-4" /> Try Again
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4 space-y-8">
      <Toaster position="top-right" />
      
      {/* Enhanced header with background and shadow */}
      <div className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 p-6 rounded-lg shadow-sm mb-8">
        <h1 className="text-4xl font-bold flex items-center text-gray-800">
          <ChefHat className="mr-3 text-indigo-600" size={32} />
          Restaurant Menu Management
        </h1>
        <p className="text-gray-600 mt-2 max-w-2xl">
          Manage your menu items, add new dishes, update prices, and organize your restaurant's offerings.
        </p>
      </div>

      {/* Enhanced filter section with card */}
      <Card className="mb-8">
        <CardHeader className="pb-2">
          <CardTitle className="text-xl flex items-center">
            <Filter className="mr-2" size={18} />
            Filter & Search Options
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap justify-between items-center gap-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search items..."
                  className="pl-10 w-64"
                  onChange={(e) => debouncedSearch(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter} disabled={isLoading}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category._id} value={category._id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <div className="flex flex-col space-y-1">
                <Label className="text-sm font-medium">Price Range (ETB)</Label>
                <div className="flex items-center space-x-2">
                  <Slider
                    min={0}
                    max={1000}
                    step={10}
                    value={priceRange}
                    onValueChange={debouncedPriceRange}
                    className="w-[200px]"
                    disabled={isLoading}
                  />
                  <span className="text-sm font-medium bg-gray-100 px-2 py-1 rounded-md min-w-[90px] text-center">
                    {priceRange[0]} - {priceRange[1]} ETB
                  </span>
                </div>
              </div>
            </div>
            
            <Button
              onClick={handleNewItem}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
              disabled={isLoading}
            >
              <Plus className="mr-2" /> Add New Item
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {currentItems.length > 0 ? (
          currentItems.map((item) => (
            <Card key={item._id || item.id} className="overflow-hidden hover:shadow-lg transition-shadow duration-300 group border border-gray-200">
              <div className="relative">
                <CardHeader className="p-0">
                  <img 
                    src={getItemImage(item)} 
                    alt={item.name || "Menu Item"} 
                    className="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-105" 
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.src = "/placeholder.svg"
                    }}
                  />
                </CardHeader>
                {item.isFeatured && (
                  <div className="absolute top-2 right-2 bg-yellow-400 text-white p-1.5 rounded-full">
                    <Star className="h-4 w-4" />
                  </div>
                )}
                <Badge 
                  variant={item.isActive ? "default" : "secondary"} 
                  className="absolute top-2 left-2"
                >
                  {item.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
              <CardContent className="p-4">
                <CardTitle className="text-lg font-semibold mb-2 line-clamp-1">
                  {item.name || "Unnamed Item"}
                </CardTitle>
                <p className="text-sm text-gray-600 mb-3 line-clamp-2 h-10">
                  {item.description || "No description available"}
                </p>
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <span className="flex items-center text-sm font-medium text-gray-900">
                      <Tag className="mr-1.5 text-green-600" size={14} />
                      {item.price?.toFixed(2) || "0.00"} ETB
                    </span>
                    <span className="flex items-center text-sm text-gray-500">
                      <Clock className="mr-1.5 text-orange-500" size={14} />
                      {item.preparationTime || 0} min
                    </span>
                  </div>
                  <div className="flex items-center text-xs text-gray-500 pt-1">
                    <Coffee className="mr-1.5 text-indigo-500" size={14} />
                    {categories.find((c) => c._id === item.categoryId)?.name || "Uncategorized"}
                  </div>
                </div>
              </CardContent>
              <Separator />
              <CardFooter className="flex justify-between p-3 bg-gray-50">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleViewDetails(item)} 
                  className="flex-1 mr-1"
                  disabled={isLoading}
                >
                  <Eye className="mr-1.5" size={15} />
                  View
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleEdit(item)} 
                  className="flex-1 mr-1"
                  disabled={isLoading}
                >
                  <Edit className="mr-1.5" size={15} />
                  Edit
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => item._id && handleDelete(item._id)} 
                  className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                  disabled={isLoading}
                >
                  <Trash2 className="mr-1.5" size={15} />
                  Delete
                </Button>
              </CardFooter>
            </Card>
          ))
        ) : (
          <div className="col-span-full flex flex-col items-center justify-center p-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <Menu className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900">No items found</h3>
            <p className="text-sm text-gray-500 mt-1">Try adjusting your search or filter criteria</p>
          </div>
        )}
      </div>

      <div className="mt-6 flex justify-center">
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <Button
                variant="outline"
                size="icon"
                onClick={() => currentPage > 1 && paginate(currentPage - 1)}
                disabled={currentPage === 1 || isLoading}
                className="h-9 w-9"
              >
                <PaginationPrevious className="h-4 w-4" />
              </Button>
            </PaginationItem>
            {Array.from({ length: Math.ceil(filteredItems.length / itemsPerPage) }).map((_, index) => (
              <PaginationItem key={index}>
                <PaginationLink 
                  onClick={() => !isLoading && paginate(index + 1)} 
                  isActive={currentPage === index + 1}
                  className={isLoading ? "pointer-events-none opacity-50" : "cursor-pointer"}
                >
                  {index + 1}
                </PaginationLink>
              </PaginationItem>
            ))}
            <PaginationItem>
              <Button
                variant="outline"
                size="icon"
                onClick={() => currentPage < Math.ceil(filteredItems.length / itemsPerPage) && paginate(currentPage + 1)}
                disabled={currentPage === Math.ceil(filteredItems.length / itemsPerPage) || isLoading}
                className="h-9 w-9"
              >
                <PaginationNext className="h-4 w-4" />
              </Button>
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        if (!open && isUploading) {
          toast.error("Please wait for the upload to complete")
          return
        }
        setIsDialogOpen(open)
        if (!open) {
          setSelectedImage(null)
          setImagePreview(null)
          setUploadProgress(0)
        }
      }}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{selectedItem ? "Edit Menu Item" : "Add New Menu Item"}</DialogTitle>
            <DialogDescription>
              {selectedItem ? "Edit the details of the menu item." : "Add a new item to your menu."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(handleCreateOrUpdate)}>
            <ScrollArea className="h-[60vh] pr-4">
              <div className="space-y-4 py-4">
                <Tabs defaultValue="basic" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="basic" className="flex items-center gap-1">
                      <Menu className="h-4 w-4" />
                      Basic Info
                    </TabsTrigger>
                    <TabsTrigger value="stock" className="flex items-center gap-1">
                      <Tag className="h-4 w-4" />
                      Stock
                    </TabsTrigger>
                    <TabsTrigger value="nutrition" className="flex items-center gap-1">
                      <Coffee className="h-4 w-4" />
                      Nutrition
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="basic">
                    <div className="space-y-4 pt-3">
                      <div className="grid gap-2">
                        <Label htmlFor="name">Item Name</Label>
                        <Input 
                          id="name" 
                          {...register("name")} 
                          placeholder="e.g., Spicy Chicken Burger" 
                          disabled={isLoading || isUploading}
                        />
                        {errors.name && <p className="text-red-500 text-sm">{errors.name.message}</p>}
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="category">Category</Label>
                        <Controller
                          name="categoryId"
                          control={control}
                          render={({ field }) => (
                            <Select 
                              onValueChange={field.onChange} 
                              value={field.value || undefined}
                              disabled={isLoading || isUploading}
                            >
                              <SelectTrigger id="category">
                                <SelectValue placeholder="Select Category" />
                              </SelectTrigger>
                              <SelectContent>
                                {categories.map((category) => (
                                  <SelectItem key={category._id} value={category._id}>
                                    {category.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        />
                        {errors.categoryId && <p className="text-red-500 text-sm">{errors.categoryId.message}</p>}
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea 
                          id="description" 
                          {...register("description")} 
                          placeholder="Describe the item, its ingredients, flavors, etc." 
                          className="min-h-[100px]" 
                          disabled={isLoading || isUploading}
                        />
                        {errors.description && <p className="text-red-500 text-sm">{errors.description.message}</p>}
                      </div>
                      <div className="grid grid-cols-1 gap-4">
                        <div className="grid gap-2">
                          <Label htmlFor="price">Price (ETB)</Label>
                          <Input
                            id="price"
                            {...register("price", { valueAsNumber: true })}
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            disabled={isLoading || isUploading}
                          />
                          {errors.price && <p className="text-red-500 text-sm">{errors.price.message}</p>}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label htmlFor="prepTime">Preparation Time (min)</Label>
                          <Input
                            id="prepTime"
                            {...register("preparationTime", { valueAsNumber: true })}
                            type="number"
                            placeholder="10"
                            disabled={isLoading || isUploading}
                          />
                          {errors.preparationTime && (
                            <p className="text-red-500 text-sm">{errors.preparationTime.message}</p>
                          )}
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="image">Item Image</Label>
                          <Input
                            id="image"
                            type="file"
                            accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                            onChange={handleImageChange}
                            disabled={isLoading || isUploading}
                          />
                        </div>
                      </div>
                      
                      {/* Image Preview */}
                      {(imagePreview || selectedItem?.imageUrl) && (
                        <div className="mt-2">
                          <Label className="text-sm font-medium mb-2 block">Image Preview</Label>
                          <div className="relative w-full max-w-xs">
                            <img
                              src={imagePreview || selectedItem?.imageUrl}
                              alt="Preview"
                              className="w-full h-48 object-cover rounded-md border"
                            />
                            <Button
                              type="button"
                              variant="destructive"
                              size="icon"
                              className="absolute top-2 right-2 h-8 w-8"
                              onClick={removeImage}
                              disabled={isLoading || isUploading}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            {selectedImage ? `${selectedImage.name} (${(selectedImage.size / 1024).toFixed(1)} KB)` : 'Current image'}
                          </p>
                        </div>
                      )}

                      {isUploading && (
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Uploading image...</span>
                            <span>{uploadProgress}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div 
                              className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300"
                              style={{ width: `${uploadProgress}%` }}
                            />
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-4 pt-2">
                        <div className="flex items-center space-x-2">
                          <Controller
                            name="isActive"
                            control={control}
                            render={({ field }) => (
                              <div className="flex items-center space-x-2">
                                <Switch
                                  id="isActive"
                                  checked={field.value ?? true}
                                  onCheckedChange={field.onChange}
                                  disabled={isLoading || isUploading}
                                />
                                <Label htmlFor="isActive" className="cursor-pointer">Active Item</Label>
                              </div>
                            )}
                          />
                        </div>
                        <div className="flex items-center space-x-2">
                          <Controller
                            name="isFeatured"
                            control={control}
                            render={({ field }) => (
                              <div className="flex items-center space-x-2">
                                <Switch
                                  id="isFeatured"
                                  checked={field.value ?? false}
                                  onCheckedChange={field.onChange}
                                  disabled={isLoading || isUploading}
                                />
                                <Label htmlFor="isFeatured" className="cursor-pointer">Featured Item</Label>
                              </div>
                            )}
                          />
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                  <TabsContent value="stock">
                    <div className="space-y-4 pt-3">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium">Required Stock Items</h3>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => append({ stockId: "", quantity: 0 })}
                          className="text-xs h-8"
                          disabled={isLoading || isUploading}
                        >
                          <Plus className="mr-1 h-3 w-3" /> Add Ingredient
                        </Button>
                      </div>
                      {fields.length === 0 && (
                        <div className="text-center py-4 bg-gray-50 rounded-md">
                          <p className="text-gray-500 text-sm">No ingredients added yet</p>
                          <p className="text-gray-400 text-xs mt-1">Click the button above to add ingredients</p>
                        </div>
                      )}
                      {fields.map((field, index) => (
                        <div key={field.id} className="flex items-center space-x-2 bg-gray-50 p-3 rounded-md">
                          <div className="flex-1">
                            <Label htmlFor={`stock-${index}`} className="text-xs mb-1 block">Ingredient</Label>
                            <Controller
                              name={`requiredStock.${index}.stockId`}
                              control={control}
                              render={({ field }) => (
                                <Select 
                                  onValueChange={field.onChange} 
                                  value={field.value || undefined}
                                  disabled={isLoading || isUploading}
                                >
                                  <SelectTrigger id={`stock-${index}`} className="w-full">
                                    <SelectValue placeholder="Select Ingredient" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {stocks.map((stock) => (
                                      <SelectItem key={stock._id} value={stock._id}>
                                        {stock.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                            />
                          </div>
                          <div className="w-1/4">
                            <Label htmlFor={`quantity-${index}`} className="text-xs mb-1 block">Qty</Label>
                            <Input
                              id={`quantity-${index}`}
                              {...register(`requiredStock.${index}.quantity` as const, { valueAsNumber: true })}
                              type="number"
                              placeholder="0"
                              className="w-full"
                              disabled={isLoading || isUploading}
                            />
                          </div>
                          <div className="flex items-end pb-1">
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => remove(index)} 
                              className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                              disabled={isLoading || isUploading}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                  <TabsContent value="nutrition">
                    <div className="space-y-4 pt-3">
                      <h3 className="text-sm font-medium">Nutritional Information</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label htmlFor="calories">Calories</Label>
                          <Input
                            id="calories"
                            {...register("nutritionalInfo.calories", { valueAsNumber: true })}
                            type="number"
                            placeholder="0"
                            disabled={isLoading || isUploading}
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="protein">Protein (g)</Label>
                          <Input
                            id="protein"
                            {...register("nutritionalInfo.protein", { valueAsNumber: true })}
                            type="number"
                            placeholder="0"
                            disabled={isLoading || isUploading}
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="carbs">Carbohydrates (g)</Label>
                          <Input
                            id="carbs"
                            {...register("nutritionalInfo.carbohydrates", { valueAsNumber: true })}
                            type="number"
                            placeholder="0"
                            disabled={isLoading || isUploading}
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="fat">Fat (g)</Label>
                          <Input
                            id="fat"
                            {...register("nutritionalInfo.fat", { valueAsNumber: true })}
                            type="number"
                            placeholder="0"
                            disabled={isLoading || isUploading}
                          />
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </ScrollArea>
            <DialogFooter className="pt-2">
              <Button 
                type="submit" 
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700" 
                disabled={isLoading || isUploading}
              >
                {isLoading || isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isUploading ? 'Uploading...' : 'Saving...'}
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    {selectedItem ? "Update Item" : "Create Item"}
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Details Dialog */}
      <Dialog open={isViewDetailsOpen} onOpenChange={setIsViewDetailsOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="text-2xl">Item Details</DialogTitle>
            <DialogDescription>
              Detailed information about the selected menu item
            </DialogDescription>
          </DialogHeader>
          {selectedItem && (
            <ScrollArea className="max-h-[70vh] pr-4">
              <div className="space-y-6">
                <div className="relative">
                  <img
                    src={getItemImage(selectedItem)}
                    alt={selectedItem.name || "Menu Item"}
                    className="w-full h-52 object-cover rounded-lg"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.src = "/placeholder.svg"
                    }}
                  />
                  {selectedItem.isFeatured && (
                    <Badge className="absolute top-2 right-2 bg-yellow-400 text-white border-none">
                      <Star className="mr-1 h-3 w-3" /> Featured
                    </Badge>
                  )}
                </div>
                
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold">{selectedItem.name || "Unnamed Item"}</h2>
                    <Badge variant={selectedItem.isActive ? "default" : "secondary"} className="ml-2">
                      {selectedItem.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <p className="text-gray-500 text-sm">
                    {categories.find((c) => c._id === selectedItem.categoryId)?.name || "Uncategorized"}
                  </p>
                </div>
                
                <Separator />
                
                <div>
                  <h3 className="text-lg font-semibold mb-2">Description</h3>
                  <p className="text-gray-600">{selectedItem.description || "No description available"}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-6">
                  <Card className="bg-gradient-to-b from-green-50 to-white">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center text-green-700">
                        <Tag className="mr-2 h-4 w-4" />
                        Price
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">{(selectedItem.price || 0).toFixed(2)} <span className="text-sm font-normal">ETB</span></p>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-gradient-to-b from-orange-50 to-white">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center text-orange-700">
                        <Clock className="mr-2 h-4 w-4" />
                        Preparation Time
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">{selectedItem.preparationTime || 0} <span className="text-sm font-normal">minutes</span></p>
                    </CardContent>
                  </Card>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold mb-2">Nutritional Information</h3>
                  <div className="grid grid-cols-4 gap-3">
                    <Card className="text-center p-3">
                      <p className="text-lg font-bold">{getNutritionalInfo(selectedItem).calories}</p>
                      <p className="text-xs text-gray-500">Calories</p>
                    </Card>
                    <Card className="text-center p-3">
                      <p className="text-lg font-bold">{getNutritionalInfo(selectedItem).protein}g</p>
                      <p className="text-xs text-gray-500">Protein</p>
                    </Card>
                    <Card className="text-center p-3">
                      <p className="text-lg font-bold">{getNutritionalInfo(selectedItem).carbohydrates}g</p>
                      <p className="text-xs text-gray-500">Carbs</p>
                    </Card>
                    <Card className="text-center p-3">
                      <p className="text-lg font-bold">{getNutritionalInfo(selectedItem).fat}g</p>
                      <p className="text-xs text-gray-500">Fat</p>
                    </Card>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold mb-2">Required Stock</h3>
                  {getRequiredStock(selectedItem).length > 0 ? (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="text-left pb-2">Ingredient</th>
                            <th className="text-right pb-2">Quantity</th>
                          </tr>
                        </thead>
                        <tbody>
                          {getRequiredStock(selectedItem).map((stock, index) => (
                            <tr key={index} className="border-b border-gray-100 last:border-0">
                              <td className="py-2">{stocks.find((s) => s._id === stock.stockId)?.name || "Unknown"}</td>
                              <td className="text-right py-2">{stock.quantity}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-gray-500 italic">No stock requirements defined</p>
                  )}
                </div>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the menu item
              and remove it from all orders and inventory records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={isLoading}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}