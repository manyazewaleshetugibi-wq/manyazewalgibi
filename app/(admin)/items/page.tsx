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
import { Search, Plus, Edit, Trash2, Clock, Star, Save, X, Tag, Loader2, Eye, ChefHat, Menu, Filter, Coffee, XCircle, AlertCircle, Package, Check, Moon, Sun } from 'lucide-react'
import { useDebouncedCallback } from "use-debounce"
import { api } from "@/types/utils/api"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

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
    quantity: number; // Now accepts any decimal number
  }[];
  nutritionalInfo?: {
    calories: number;
    protein: number; // Now accepts any decimal number
    carbohydrates: number; // Now accepts any decimal number
    fat: number; // Now accepts any decimal number
  };
  preparationTime?: number;
  isActive?: boolean;
  isFeatured?: boolean;
  isFasting?: boolean; // Added fasting field
  createdAt?: string;
  updatedAt?: string;
}

// Custom error types
class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NetworkError';
  }
}

// Validation schema for form - updated to accept any decimal number
const ItemSchema = z.object({
  _id: z.string().optional(),
  name: z.string().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  description: z.string().min(1, "Description is required").max(500, "Description must be less than 500 characters"),
  categoryId: z.string().min(1, "Category is required"),
  price: z.number()
    .min(0, "Price must be positive")
    .max(999999, "Price is too high"),
  imageUrl: z.string().nullable().optional(),
  requiredStock: z.array(
    z.object({
      stockId: z.string(),
      quantity: z.number()
        .min(0, "Quantity must be positive"),
    }),
  ).optional(),
  nutritionalInfo: z.object({
    calories: z.number()
      .min(0, "Calories must be positive")
      .max(10000, "Calories too high"),
    protein: z.number()
      .min(0, "Protein must be positive")
      .max(1000, "Protein too high"),
    carbohydrates: z.number()
      .min(0, "Carbohydrates must be positive")
      .max(1000, "Carbohydrates too high"),
    fat: z.number()
      .min(0, "Fat must be positive")
      .max(1000, "Fat too high"),
  }).optional(),
  preparationTime: z.number()
    .min(0, "Preparation time must be positive")
    .max(1440, "Preparation time cannot exceed 24 hours")
    .optional(),
  isActive: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  isFasting: z.boolean().optional(), // Added fasting field
});

type FormData = z.infer<typeof ItemSchema> & {
  image?: File;
};

type ItemCategory = {
  _id: string
  name: string
}

type Stock = {
  _id: string
  name: string
  unit?: string
  currentStock?: number
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

// Image validation constants
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

// Searchable Stock Select Component
interface SearchableStockSelectProps {
  value: string;
  onChange: (value: string) => void;
  stocks: Stock[];
  disabled?: boolean;
  placeholder?: string;
}

const SearchableStockSelect: React.FC<SearchableStockSelectProps> = ({
  value,
  onChange,
  stocks,
  disabled = false,
  placeholder = "Select ingredient..."
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  const selectedStock = stocks.find(stock => stock._id === value);
  
  const filteredStocks = stocks.filter(stock =>
    stock.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (stock.unit && stock.unit.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="relative">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={isOpen}
            className="w-full justify-between"
            disabled={disabled}
          >
            {selectedStock ? (
              <span className="flex items-center gap-2">
                <Package className="h-4 w-4 text-gray-500" />
                {selectedStock.name}
                {selectedStock.unit && (
                  <span className="text-xs text-gray-500">({selectedStock.unit})</span>
                )}
              </span>
            ) : (
              <span className="text-gray-500">{placeholder}</span>
            )}
            <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0" align="start">
          <div className="flex flex-col">
            {/* Search input */}
            <div className="flex items-center border-b px-3">
              <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
              <Input
                placeholder="Search ingredients..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-10"
                autoFocus
              />
            </div>
            
            {/* Stock list - always visible */}
            <ScrollArea className="max-h-[300px] overflow-y-auto p-1">
              {stocks.length === 0 ? (
                <div className="text-center py-8 px-4">
                  <Package className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No ingredients available</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {/* Show filtered results if there's a search query, otherwise show all stocks */}
                  {(searchQuery ? filteredStocks : stocks).map((stock) => (
                    <Button
                      key={stock._id}
                      variant="ghost"
                      className={cn(
                        "w-full justify-start text-left font-normal h-auto py-2 px-3",
                        value === stock._id && "bg-accent text-accent-foreground"
                      )}
                      onClick={() => {
                        onChange(stock._id);
                        setIsOpen(false);
                        setSearchQuery(""); // Clear search after selection
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4 shrink-0",
                          value === stock._id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="font-medium truncate">{stock.name}</span>
                        <span className="text-xs text-gray-500">
                          Unit: {stock.unit || 'N/A'} | In Stock: {stock.currentStock?.toString() || '0'}
                        </span>
                      </div>
                    </Button>
                  ))}
                  
                  {/* Show message when search has no results */}
                  {searchQuery && filteredStocks.length === 0 && (
                    <div className="text-center py-8 px-4">
                      <Package className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">No ingredients found</p>
                      <p className="text-xs text-gray-400 mt-1">Try a different search term</p>
                    </div>
                  )}
                </div>
              )}
            </ScrollArea>
            
            {/* Quick actions footer */}
            <div className="border-t p-2 flex justify-between items-center">
              <span className="text-xs text-gray-500">
                {stocks.length} total ingredients
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => {
                  setIsOpen(false);
                  setSearchQuery("");
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

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
  const [fastingFilter, setFastingFilter] = useState<"all" | "fasting" | "non-fasting">("all") // Added fasting filter
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000])
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [isImageRemoved, setIsImageRemoved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [retryCount, setRetryCount] = useState(0)
  const [networkStatus, setNetworkStatus] = useState<'online' | 'offline'>(navigator.onLine ? 'online' : 'offline')

  // Monitor network status
  useEffect(() => {
    const handleOnline = () => setNetworkStatus('online')
    const handleOffline = () => setNetworkStatus('offline')

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(ItemSchema),
    defaultValues: {
      requiredStock: DEFAULT_REQUIRED_STOCK,
      nutritionalInfo: DEFAULT_NUTRITIONAL_INFO,
      isActive: true,
      isFeatured: false,
      isFasting: false, // Added default
      preparationTime: 10,
      price: 0,
    },
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: "requiredStock",
  })

  const debouncedSearch = useDebouncedCallback((value) => {
    setSearchTerm(value)
  }, 300)

  const debouncedPriceRange = useDebouncedCallback((value) => {
    setPriceRange(value)
  }, 300)

  // Fetch data with retry logic
  const fetchData = async (retryAttempt = 0) => {
    setIsLoading(true)
    setError(null)
    setFieldErrors({})
    
    try {
      // Check network status
      if (!navigator.onLine) {
        throw new NetworkError('You are offline. Please check your internet connection.')
      }

      const [categoriesData, stocksData, menuItemsData] = await Promise.all([
        api.fetchItemCategories().catch(err => {
          console.error('Failed to fetch categories:', err)
          throw new Error('Failed to load categories')
        }),
        api.fetchStocks().catch(err => {
          console.error('Failed to fetch stocks:', err)
          throw new Error('Failed to load stock items')
        }),
        api.fetchMenuItems().catch(err => {
          console.error('Failed to fetch menu items:', err)
          throw new Error('Failed to load menu items check your connection')
        }),
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
        isFasting: getSafeValue(item.isFasting, false), // Added default
        price: getSafeValue(item.price, 0),
      }))
      setMenuItems(normalizedItems)
      setFilteredItems(normalizedItems)
      setRetryCount(0) // Reset retry count on success
      
    } catch (error: any) {
      console.error("Failed to fetch data:", error)
      
      // Handle specific error types
      let errorMessage = "Failed to load data. "
      
      if (error instanceof NetworkError) {
        errorMessage = error.message
      } else if (error.message?.includes('NetworkError') || error.message?.includes('Failed to fetch')) {
        errorMessage = "Network error. Please check your internet connection."
      } else if (error.message?.includes('500')) {
        errorMessage = "Server error. Please try again later."
      } else if (error.message?.includes('404')) {
        errorMessage = "API endpoint not found. Please check your API configuration."
      } else if (error.message) {
        errorMessage += error.message
      } else {
        errorMessage += "Please try again later."
      }
      
      setError(errorMessage)
      
      // Implement retry logic
      if (retryAttempt < 3) {
        setTimeout(() => {
          setRetryCount(prev => prev + 1)
          fetchData(retryAttempt + 1)
        }, 2000 * (retryAttempt + 1)) // Exponential backoff
      } else {
        toast.error('Failed to load data after multiple attempts. Please refresh the page.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    const filtered = menuItems.filter((item) => {
      const matchesSearch = searchTerm === "" || (item.name?.toLowerCase() || '').includes(searchTerm.toLowerCase())
      const matchesCategory = categoryFilter === "all" || item.categoryId === categoryFilter
      const matchesPrice = (item.price || 0) >= priceRange[0] && (item.price || 0) <= priceRange[1]
      // Added fasting filter
      const matchesFasting = fastingFilter === "all" || 
        (fastingFilter === "fasting" && item.isFasting === true) ||
        (fastingFilter === "non-fasting" && item.isFasting === false)
      return matchesSearch && matchesCategory && matchesPrice && matchesFasting
    })
    setFilteredItems(filtered)
    setCurrentPage(1)
  }, [searchTerm, categoryFilter, priceRange, fastingFilter, menuItems])

  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentItems = filteredItems.slice(indexOfFirstItem, indexOfLastItem)

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber)

  const validateImage = (file: File): { valid: boolean; error?: string } => {
    // Check file type
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return { 
        valid: false, 
        error: `Invalid file type. Allowed types: ${ALLOWED_IMAGE_EXTENSIONS.join(', ')}` 
      }
    }

    // Check file size
    if (file.size > MAX_IMAGE_SIZE) {
      return { 
        valid: false, 
        error: `Image size should be less than ${MAX_IMAGE_SIZE / (1024 * 1024)}MB` 
      }
    }

    // Check if file is actually an image (additional validation)
    if (!file.type.startsWith('image/')) {
      return { valid: false, error: 'File must be an image' }
    }

    return { valid: true }
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Clear previous image errors
    setFieldErrors(prev => {
      const newErrors = { ...prev }
      delete newErrors.image
      return newErrors
    })

    // Validate image
    const validation = validateImage(file)
    if (!validation.valid) {
      setFieldErrors(prev => ({ ...prev, image: validation.error! }))
      toast.error(validation.error!)
      e.target.value = '' // Clear the input
      return
    }

    setSelectedImage(file)
    setIsImageRemoved(false) // User is adding a new image, so not removed
    
    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setImagePreview(reader.result as string)
    }
    reader.onerror = () => {
      setFieldErrors(prev => ({ ...prev, image: 'Failed to read image file' }))
      toast.error('Failed to read image file')
    }
    reader.readAsDataURL(file)
  }

  const removeImage = () => {
    setSelectedImage(null)
    setImagePreview(null)
    setValue("imageUrl", null)
    setIsImageRemoved(true) // Mark that image was removed
    // Clear any image errors
    setFieldErrors(prev => {
      const newErrors = { ...prev }
      delete newErrors.image
      return newErrors
    })
  }

  const validateForm = (data: FormData): boolean => {
    const errors: Record<string, string> = {}
    
    // Validate required fields
    if (!data.name?.trim()) errors.name = 'Name is required'
    if (!data.description?.trim()) errors.description = 'Description is required'
    if (!data.categoryId) errors.categoryId = 'Category is required'
    
    // Validate price
    if (data.price === undefined || data.price === null || data.price < 0) {
      errors.price = 'Price must be a positive number'
    }
    
    // Validate image for new items
    if (!selectedItem?._id && !selectedImage && !data.imageUrl) {
      errors.image = 'Image is required for new menu items'
    }
    
    // Validate required stock items - no decimal place restrictions
    if (data.requiredStock) {
      data.requiredStock.forEach((stock, index) => {
        if (stock.stockId && stock.quantity <= 0) {
          errors[`requiredStock.${index}.quantity`] = 'Quantity must be greater than 0'
        }
      })
    }
    
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const onSubmit = async (data: FormData) => {
    // Validate form first
    if (!validateForm(data)) {
      toast.error('Please fix the validation errors')
      return
    }

    setIsSubmitting(true)
    setIsUploading(true)
    setUploadProgress(0)
    setError(null)
    setFieldErrors({})
    
    try {
      // Check network status
      if (!navigator.onLine) {
        throw new NetworkError('You are offline. Please check your internet connection.')
      }

      // Create FormData for file upload
      const formData = new FormData()
      
      // Add basic fields with null checks - preserve full precision
      formData.append("name", data.name || "")
      formData.append("description", data.description || "")
      formData.append("categoryId", data.categoryId || "")
      formData.append("price", data.price?.toString() || "0")
      formData.append("preparationTime", data.preparationTime?.toString() || "10")
      formData.append("isActive", (data.isActive ?? true).toString())
      formData.append("isFeatured", (data.isFeatured ?? false).toString())
      formData.append("isFasting", (data.isFasting ?? false).toString()) // Added fasting field
      
      // Add nutritional info with defaults - preserve full precision
      const nutritionalInfo = data.nutritionalInfo || DEFAULT_NUTRITIONAL_INFO
      const formattedNutritionalInfo = {
        calories: nutritionalInfo.calories,
        protein: nutritionalInfo.protein,
        carbohydrates: nutritionalInfo.carbohydrates,
        fat: nutritionalInfo.fat
      }
      formData.append("nutritionalInfo", JSON.stringify(formattedNutritionalInfo))
      
      // Add required stock with defaults - preserve full precision
      const validRequiredStock = (data.requiredStock || DEFAULT_REQUIRED_STOCK)
        .filter(stock => stock.stockId && stock.quantity > 0)
        .map(stock => ({
          stockId: stock.stockId,
          quantity: stock.quantity // Keep original value without rounding
        }))
      formData.append("requiredStock", JSON.stringify(validRequiredStock))
      
      // 🔥 FIXED IMAGE HANDLING FOR EDIT MODE 🔥
      if (selectedItem && selectedItem._id) {
        // EDIT MODE
        formData.append("_id", selectedItem._id)
        
        if (selectedImage) {
          // Case 1: User selected a new image - upload it to Cloudinary
          console.log("📸 Uploading new image for edit...")
          formData.append('image', selectedImage);
          // Don't send old imageUrl - let backend handle it
        } else if (isImageRemoved) {
          // Case 2: User removed the image
          console.log("🗑️ Image removed during edit")
          formData.append("removeImage", "true")
        } else if (data.imageUrl && data.imageUrl.startsWith('http')) {
          // Case 3: Keep existing Cloudinary image (URL, not base64)
          console.log("🖼️ Keeping existing Cloudinary image")
          formData.append("imageUrl", data.imageUrl)
        } else if (selectedItem.cloudinaryData?.url) {
          // Case 4: Use cloudinaryData.url from existing item
          console.log("🖼️ Using cloudinaryData.url from existing item")
          formData.append("imageUrl", selectedItem.cloudinaryData.url)
        }
        // If none of the above, no image field is sent - backend should keep existing
      } else {
        // CREATE MODE
        if (selectedImage) {
          formData.append('image', selectedImage);
        } else if (data.imageUrl && typeof data.imageUrl === 'string') {
          formData.append('imageUrl', data.imageUrl);
        }
      }
      
      console.log("Sending data to API...")
      
      let response
      const isUpdate = selectedItem && selectedItem._id
      
      // Simulate upload progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 10
        })
      }, 300)
      
      try {
        if (isUpdate) {
          // Update existing item
          response = await api.updateMenuItem(selectedItem!._id!, formData)
        } else {
          // Create new item
          response = await api.createMenuItem(formData)
        }
        
        clearInterval(progressInterval)
        setUploadProgress(100)
        
        // Check response
        if (!response) {
          throw new Error('No response from server')
        }
        
        if (response.success === false) {
          throw new Error(response.message || 'Operation failed')
        }
        
        // Success message
        toast.success(isUpdate ? "Item updated successfully" : "Item created successfully")
        
        // Wait a bit to show completion
        await new Promise(resolve => setTimeout(resolve, 500))
        
        // Refresh menu items
        await fetchData()
        
        // Reset form state and close dialog
        reset()
        setSelectedImage(null)
        setImagePreview(null)
        setIsImageRemoved(false)
        setSelectedItem(null)
        setIsDialogOpen(false)
        setFieldErrors({})
        
      } catch (apiError: any) {
        clearInterval(progressInterval)
        
        // Handle specific API errors
        if (apiError.message?.includes('413')) {
          throw new Error('Image file is too large. Maximum size is 10MB.')
        } else if (apiError.message?.includes('400')) {
          // Try to parse validation errors from response
          try {
            const errorData = JSON.parse(apiError.message)
            if (errorData.errors) {
              setFieldErrors(errorData.errors)
              throw new ValidationError('Please check the form for errors')
            }
          } catch {
            // If parsing fails, use generic message
          }
          throw new Error('Invalid data. Please check your inputs.')
        } else if (apiError.message?.includes('401')) {
          throw new Error('You are not authorized. Please log in again.')
        } else if (apiError.message?.includes('403')) {
          throw new Error('You do not have permission to perform this action.')
        } else if (apiError.message?.includes('404')) {
          throw new Error('API endpoint not found. Please check your configuration.')
        } else if (apiError.message?.includes('500')) {
          throw new Error('Server error. Please try again later.')
        } else {
          throw apiError
        }
      }
      
    } catch (error: any) {
      console.error("Error saving item:", error)
      
      // Extract meaningful error message
      let errorMessage = "Failed to save item. "
      
      if (error instanceof NetworkError) {
        errorMessage = error.message
      } else if (error instanceof ValidationError) {
        errorMessage = error.message
      } else if (error.message) {
        errorMessage += error.message
      } else {
        errorMessage += "Please try again."
      }
      
      setError(errorMessage)
      toast.error(errorMessage)
      
      // If it's a network error, offer retry
      if (error instanceof NetworkError || error.message?.includes('network')) {
        toast((t) => (
          <div className="flex flex-col gap-2">
            <span>Network error. Would you like to retry?</span>
            <div className="flex gap-2">
              <Button 
                size="sm" 
                onClick={() => {
                  toast.dismiss(t.id)
                  const currentData = getValues()
                  onSubmit(currentData)
                }}
              >
                Retry
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => toast.dismiss(t.id)}
              >
                Cancel
              </Button>
            </div>
          </div>
        ), { duration: 10000 })
      }
    } finally {
      setIsSubmitting(false)
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
    
    setIsSubmitting(true)
    setError(null)
    
    try {
      if (!navigator.onLine) {
        throw new NetworkError('You are offline. Please check your internet connection.')
      }

      await api.deleteMenuItem(itemToDelete)
      await fetchData() // Refresh the list
      toast.success("Item deleted successfully")
      setIsDeleteDialogOpen(false)
      setItemToDelete(null)
      
    } catch (error: any) {
      console.error("Error deleting item:", error)
      
      let errorMessage = "Failed to delete item. "
      if (error instanceof NetworkError) {
        errorMessage = error.message
      } else if (error.message?.includes('401')) {
        errorMessage += "You are not authorized."
      } else if (error.message?.includes('403')) {
        errorMessage += "You do not have permission."
      } else if (error.message?.includes('404')) {
        errorMessage += "Item not found."
      } else if (error.message) {
        errorMessage += error.message
      } else {
        errorMessage += "Please try again."
      }
      
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = (item: MenuItem) => {
    setSelectedItem(item)
    // Use cloudinaryData.url if available, otherwise fallback to imageUrl
    setImagePreview(item.cloudinaryData?.url || item.imageUrl || null)
    setSelectedImage(null)
    setIsImageRemoved(false)
    setFieldErrors({})
    setError(null)
    
    // Ensure all fields have defaults
    const itemToEdit = {
      ...item,
      requiredStock: item.requiredStock || DEFAULT_REQUIRED_STOCK,
      nutritionalInfo: item.nutritionalInfo || DEFAULT_NUTRITIONAL_INFO,
      preparationTime: getSafeValue(item.preparationTime, 10),
      isActive: getSafeValue(item.isActive, true),
      isFeatured: getSafeValue(item.isFeatured, false),
      isFasting: getSafeValue(item.isFasting, false), // Added default
      price: getSafeValue(item.price, 0),
      // Use cloudinaryData.url for imageUrl in the form
      imageUrl: item.cloudinaryData?.url || item.imageUrl,
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
    setIsImageRemoved(false)
    setFieldErrors({})
    setError(null)
    reset({
      requiredStock: DEFAULT_REQUIRED_STOCK,
      nutritionalInfo: DEFAULT_NUTRITIONAL_INFO,
      isActive: true,
      isFeatured: false,
      isFasting: false, // Added default
      price: 0,
      preparationTime: 10,
      name: "",
      description: "",
      categoryId: "",
    })
    setIsDialogOpen(true)
  }

  const getItemImage = (item: MenuItem) => {
    // Prefer cloudinaryData.url over imageUrl
    return item.cloudinaryData?.url || item.imageUrl || "/placeholder.svg"
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
        {retryCount > 0 && (
          <p className="mt-2 text-sm text-gray-500">Retry attempt {retryCount}/3...</p>
        )}
      </div>
    )
  }

  if (error && menuItems.length === 0) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-red-50 p-4">
        <div className="max-w-md w-full p-8 bg-white rounded-lg shadow-lg">
          <div className="flex items-center justify-center bg-red-100 h-16 w-16 rounded-full mb-4 mx-auto">
            <AlertCircle className="h-8 w-8 text-red-600" />
          </div>
          <h2 className="text-center text-2xl font-bold text-red-700 mb-2">Error Loading Data</h2>
          <p className="text-center text-gray-700 mb-6">{error}</p>
          {networkStatus === 'offline' && (
            <p className="text-center text-orange-600 mb-4">
              You are currently offline. Please check your internet connection.
            </p>
          )}
          <div className="space-y-3">
            <Button 
              onClick={() => fetchData()} 
              className="w-full bg-red-600 hover:bg-red-700"
              disabled={networkStatus === 'offline'}
            >
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Try Again
            </Button>
            <Button 
              onClick={() => window.location.reload()} 
              variant="outline"
              className="w-full"
            >
              Refresh Page
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4 space-y-8">
      <Toaster position="top-right" />
      
      {/* Network Status Alert */}
      {networkStatus === 'offline' && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Offline</AlertTitle>
          <AlertDescription>
            You are currently offline. Some features may be unavailable.
          </AlertDescription>
        </Alert>
      )}
      
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

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

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
                  disabled={isLoading || networkStatus === 'offline'}
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter} disabled={isLoading || networkStatus === 'offline'}>
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
              
              {/* Fasting Filter */}
              <Select value={fastingFilter} onValueChange={(value: "all" | "fasting" | "non-fasting") => setFastingFilter(value)} disabled={isLoading || networkStatus === 'offline'}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by fasting" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Items</SelectItem>
                  <SelectItem value="fasting">
                    <span className="flex items-center gap-2">
                      <Moon className="h-4 w-4 text-purple-600" />
                      Fasting
                    </span>
                  </SelectItem>
                  <SelectItem value="non-fasting">
                    <span className="flex items-center gap-2">
                      <Sun className="h-4 w-4 text-orange-500" />
                      Non-Fasting
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
              
              <div className="flex flex-col space-y-1">
                <Label className="text-sm font-medium">Price Range (ETB)</Label>
                <div className="flex items-center space-x-2">
                  <Slider
                    min={0}
                    max={1000}
                    step={1}
                    value={priceRange}
                    onValueChange={debouncedPriceRange}
                    className="w-[200px]"
                    disabled={isLoading || networkStatus === 'offline'}
                  />
                  <span className="text-sm font-medium bg-gray-100 px-2 py-1 rounded-md min-w-[90px] text-center">
                    {priceRange[0].toFixed(2)} - {priceRange[1].toFixed(2)} ETB
                  </span>
                </div>
              </div>
            </div>
            
            <Button
              onClick={handleNewItem}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
              disabled={isLoading || isSubmitting || networkStatus === 'offline'}
            >
              <Plus className="mr-2 h-4 w-4" /> Add New Item
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {currentItems.length > 0 ? (
          currentItems.map((item) => (
            <Card key={item._id || item.id} className={`overflow-hidden hover:shadow-lg transition-shadow duration-300 group border ${
              item.isFasting ? 'border-purple-200' : 'border-orange-200'
            }`}>
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
                {/* Fasting Badge */}
                <Badge 
                  variant={item.isFasting ? "default" : "secondary"}
                  className={`absolute bottom-2 left-2 ${
                    item.isFasting 
                      ? 'bg-purple-600 hover:bg-purple-700' 
                      : 'bg-orange-500 hover:bg-orange-600'
                  }`}
                >
                  <span className="flex items-center gap-1">
                    {item.isFasting ? (
                      <>
                        <Moon className="h-3 w-3" />
                        Fasting
                      </>
                    ) : (
                      <>
                        <Sun className="h-3 w-3" />
                        Non-Fasting
                      </>
                    )}
                  </span>
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
                      {item.price?.toString() || "0"} ETB
                    </span>
                    <span className="flex items-center text-sm text-gray-500">
                      <Clock className="mr-1.5 text-orange-500" size={14} />
                      {item.preparationTime?.toString() || "0"} min
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
                  disabled={isSubmitting}
                >
                  <Eye className="mr-1.5 h-4 w-4" />
                  View
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleEdit(item)} 
                  className="flex-1 mr-1"
                  disabled={isSubmitting}
                >
                  <Edit className="mr-1.5 h-4 w-4" />
                  Edit
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => item._id && handleDelete(item._id)} 
                  className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                  disabled={isSubmitting}
                >
                  <Trash2 className="mr-1.5 h-4 w-4" />
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
                disabled={currentPage === 1 || isLoading || isSubmitting}
                className="h-9 w-9"
              >
                <PaginationPrevious className="h-4 w-4" />
              </Button>
            </PaginationItem>
            {Array.from({ length: Math.ceil(filteredItems.length / itemsPerPage) }).map((_, index) => (
              <PaginationItem key={index}>
                <PaginationLink 
                  onClick={() => !isLoading && !isSubmitting && paginate(index + 1)} 
                  isActive={currentPage === index + 1}
                  className={isLoading || isSubmitting ? "pointer-events-none opacity-50" : "cursor-pointer"}
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
                disabled={currentPage === Math.ceil(filteredItems.length / itemsPerPage) || isLoading || isSubmitting}
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
          setIsImageRemoved(false)
          setUploadProgress(0)
          setFieldErrors({})
          setError(null)
          setSelectedItem(null)
          reset()
        }
      }}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{selectedItem ? "Edit Menu Item" : "Add New Menu Item"}</DialogTitle>
            <DialogDescription>
              {selectedItem ? "Edit the details of the menu item." : "Add a new item to your menu. Image is required for new items."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)}>
            <ScrollArea className="h-[60vh] pr-4">
              <div className="space-y-4 py-4">
                {/* Display form errors */}
                {Object.keys(fieldErrors).length > 0 && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Validation Errors</AlertTitle>
                    <AlertDescription>
                      <ul className="list-disc pl-4 mt-2">
                        {Object.entries(fieldErrors).map(([field, message]) => (
                          <li key={field} className="text-sm">{message}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

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
                        <Label htmlFor="name" className="flex items-center">
                          Item Name <span className="text-red-500 ml-1">*</span>
                        </Label>
                        <Input 
                          id="name" 
                          {...register("name")} 
                          placeholder="e.g., Spicy Chicken Burger" 
                          disabled={isSubmitting || isUploading}
                          className={fieldErrors.name ? "border-red-500" : ""}
                        />
                        {errors.name && <p className="text-red-500 text-sm">{errors.name.message}</p>}
                        {fieldErrors.name && <p className="text-red-500 text-sm">{fieldErrors.name}</p>}
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="category" className="flex items-center">
                          Category <span className="text-red-500 ml-1">*</span>
                        </Label>
                        <Controller
                          name="categoryId"
                          control={control}
                          render={({ field }) => (
                            <Select 
                              onValueChange={field.onChange} 
                              value={field.value || undefined}
                              disabled={isSubmitting || isUploading}
                            >
                              <SelectTrigger id="category" className={fieldErrors.categoryId ? "border-red-500" : ""}>
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
                        {fieldErrors.categoryId && <p className="text-red-500 text-sm">{fieldErrors.categoryId}</p>}
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="description" className="flex items-center">
                          Description <span className="text-red-500 ml-1">*</span>
                        </Label>
                        <Textarea 
                          id="description" 
                          {...register("description")} 
                          placeholder="Describe the item, its ingredients, flavors, etc." 
                          className={`min-h-[100px] ${fieldErrors.description ? "border-red-500" : ""}`}
                          disabled={isSubmitting || isUploading}
                        />
                        {errors.description && <p className="text-red-500 text-sm">{errors.description.message}</p>}
                        {fieldErrors.description && <p className="text-red-500 text-sm">{fieldErrors.description}</p>}
                      </div>
                      <div className="grid grid-cols-1 gap-4">
                        <div className="grid gap-2">
                          <Label htmlFor="price" className="flex items-center">
                            Price (ETB) <span className="text-red-500 ml-1">*</span>
                          </Label>
                          <Input
                            id="price"
                            type="number"
                            step="any"
                            min="0"
                            placeholder="0.00"
                            disabled={isSubmitting || isUploading}
                            className={fieldErrors.price ? "border-red-500" : ""}
                            {...register("price", { 
                              valueAsNumber: true,
                              setValueAs: (v) => v === '' ? 0 : parseFloat(v)
                            })}
                          />
                          {errors.price && <p className="text-red-500 text-sm">{errors.price.message}</p>}
                          {fieldErrors.price && <p className="text-red-500 text-sm">{fieldErrors.price}</p>}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label htmlFor="prepTime">Preparation Time (min)</Label>
                          <Input
                            id="prepTime"
                            type="number"
                            step="any"
                            min="0"
                            max="1440"
                            placeholder="10.5"
                            disabled={isSubmitting || isUploading}
                            {...register("preparationTime", { 
                              valueAsNumber: true,
                              setValueAs: (v) => v === '' ? 10 : parseFloat(v)
                            })}
                          />
                          {errors.preparationTime && (
                            <p className="text-red-500 text-sm">{errors.preparationTime.message}</p>
                          )}
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="image" className="flex items-center">
                            Item Image {!selectedItem && <span className="text-red-500 ml-1">*</span>}
                          </Label>
                          <Input
                            id="image"
                            type="file"
                            accept={ALLOWED_IMAGE_TYPES.join(',')}
                            onChange={handleImageChange}
                            disabled={isSubmitting || isUploading}
                            className={fieldErrors.image ? "border-red-500" : ""}
                          />
                          <p className="text-xs text-gray-500">
                            Max size: 10MB. Allowed: {ALLOWED_IMAGE_EXTENSIONS.join(', ')}
                          </p>
                          {fieldErrors.image && <p className="text-red-500 text-sm">{fieldErrors.image}</p>}
                        </div>
                      </div>
                      
                      {/* Fasting Toggle */}
                      <div className="grid gap-2 pt-2">
                        <Label className="text-sm font-medium">Fasting Status</Label>
                        <div className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                          <Controller
                            name="isFasting"
                            control={control}
                            render={({ field }) => (
                              <div className="flex items-center space-x-4">
                                <div className="flex items-center space-x-2">
                                  <Switch
                                    id="isFasting"
                                    checked={field.value ?? false}
                                    onCheckedChange={field.onChange}
                                    disabled={isSubmitting || isUploading}
                                    className={field.value ? 'bg-purple-600' : 'bg-orange-500'}
                                  />
                                  <Label htmlFor="isFasting" className="cursor-pointer flex items-center gap-2">
                                    {field.value ? (
                                      <>
                                        <Moon className="h-4 w-4 text-purple-600" />
                                        <span className="text-purple-700 font-medium">Fasting</span>
                                      </>
                                    ) : (
                                      <>
                                        <Sun className="h-4 w-4 text-orange-500" />
                                        <span className="text-orange-600 font-medium">Non-Fasting</span>
                                      </>
                                    )}
                                  </Label>
                                </div>
                                <span className="text-xs text-gray-500">
                                  {field.value 
                                    ? 'This item is suitable for fasting periods' 
                                    : 'This item is not suitable for fasting periods'}
                                </span>
                              </div>
                            )}
                          />
                        </div>
                      </div>
                      
                      {/* Image Preview */}
                      {(imagePreview || selectedItem?.imageUrl) && (
                        <div className="mt-2">
                          <Label className="text-sm font-medium mb-2 block">Image Preview</Label>
                          <div className="relative w-full max-w-xs">
                            <img
                              src={imagePreview || selectedItem?.cloudinaryData?.url || selectedItem?.imageUrl}
                              alt="Preview"
                              className="w-full h-48 object-cover rounded-md border"
                            />
                            <Button
                              type="button"
                              variant="destructive"
                              size="icon"
                              className="absolute top-2 right-2 h-8 w-8"
                              onClick={removeImage}
                              disabled={isSubmitting || isUploading}
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
                                  disabled={isSubmitting || isUploading}
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
                                  disabled={isSubmitting || isUploading}
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
                                <SearchableStockSelect
                                  value={field.value || ""}
                                  onChange={field.onChange}
                                  stocks={stocks}
                                  disabled={isSubmitting || isUploading}
                                  placeholder="Select ingredient..."
                                />
                              )}
                            />
                          </div>
                          <div className="w-1/4">
                            <Label htmlFor={`quantity-${index}`} className="text-xs mb-1 block">Qty</Label>
                            <Input
                              id={`quantity-${index}`}
                              type="number"
                              step="any"
                              min="0"
                              placeholder="0.0000373463489"
                              className={`w-full ${fieldErrors[`requiredStock.${index}.quantity`] ? "border-red-500" : ""}`}
                              disabled={isSubmitting || isUploading}
                              {...register(`requiredStock.${index}.quantity` as const, { 
                                valueAsNumber: true,
                                setValueAs: (v) => v === '' ? 0 : parseFloat(v)
                              })}
                            />
                            <p className="text-xs text-gray-400 mt-1">Accepts any decimal value</p>
                          </div>
                          <div className="flex items-end pb-1">
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => remove(index)} 
                              className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                              disabled={isSubmitting || isUploading}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => append({ stockId: "", quantity: 0 })}
                        className="text-xs h-9 w-full border-dashed mt-2"
                        disabled={isSubmitting || isUploading}
                      >
                        <Plus className="mr-2 h-4 w-4" /> Add Ingredient
                      </Button>
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
                            type="number"
                            step="any"
                            min="0"
                            placeholder="0.5"
                            disabled={isSubmitting || isUploading}
                            {...register("nutritionalInfo.calories", { 
                              valueAsNumber: true,
                              setValueAs: (v) => v === '' ? 0 : parseFloat(v)
                            })}
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="protein">Protein (g)</Label>
                          <Input
                            id="protein"
                            type="number"
                            step="any"
                            min="0"
                            placeholder="0.5"
                            disabled={isSubmitting || isUploading}
                            {...register("nutritionalInfo.protein", { 
                              valueAsNumber: true,
                              setValueAs: (v) => v === '' ? 0 : parseFloat(v)
                            })}
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="carbs">Carbohydrates (g)</Label>
                          <Input
                            id="carbs"
                            type="number"
                            step="any"
                            min="0"
                            placeholder="0.5"
                            disabled={isSubmitting || isUploading}
                            {...register("nutritionalInfo.carbohydrates", { 
                              valueAsNumber: true,
                              setValueAs: (v) => v === '' ? 0 : parseFloat(v)
                            })}
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="fat">Fat (g)</Label>
                          <Input
                            id="fat"
                            type="number"
                            step="any"
                            min="0"
                            placeholder="0.5"
                            disabled={isSubmitting || isUploading}
                            {...register("nutritionalInfo.fat", { 
                              valueAsNumber: true,
                              setValueAs: (v) => v === '' ? 0 : parseFloat(v)
                            })}
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
                disabled={isSubmitting || isUploading || networkStatus === 'offline'}
              >
                {isSubmitting || isUploading ? (
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
                  <div className="absolute top-2 right-2 flex gap-2">
                    {selectedItem.isFeatured && (
                      <Badge className="bg-yellow-400 text-white border-none">
                        <Star className="mr-1 h-3 w-3" /> Featured
                      </Badge>
                    )}
                    <Badge className={`${selectedItem.isFasting ? 'bg-purple-600' : 'bg-orange-500'} text-white border-none`}>
                      <span className="flex items-center gap-1">
                        {selectedItem.isFasting ? (
                          <>
                            <Moon className="h-3 w-3" />
                            Fasting
                          </>
                        ) : (
                          <>
                            <Sun className="h-3 w-3" />
                            Non-Fasting
                          </>
                        )}
                      </span>
                    </Badge>
                  </div>
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
                      <p className="text-2xl font-bold">{selectedItem.price?.toString() || "0"} <span className="text-sm font-normal">ETB</span></p>
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
                      <p className="text-2xl font-bold">{selectedItem.preparationTime?.toString() || "0"} <span className="text-sm font-normal">minutes</span></p>
                    </CardContent>
                  </Card>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold mb-2">Nutritional Information</h3>
                  <div className="grid grid-cols-4 gap-3">
                    <Card className="text-center p-3">
                      <p className="text-lg font-bold">{getNutritionalInfo(selectedItem).calories.toString()}</p>
                      <p className="text-xs text-gray-500">Calories</p>
                    </Card>
                    <Card className="text-center p-3">
                      <p className="text-lg font-bold">{getNutritionalInfo(selectedItem).protein.toString()}g</p>
                      <p className="text-xs text-gray-500">Protein</p>
                    </Card>
                    <Card className="text-center p-3">
                      <p className="text-lg font-bold">{getNutritionalInfo(selectedItem).carbohydrates.toString()}g</p>
                      <p className="text-xs text-gray-500">Carbs</p>
                    </Card>
                    <Card className="text-center p-3">
                      <p className="text-lg font-bold">{getNutritionalInfo(selectedItem).fat.toString()}g</p>
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
                              <td className="text-right py-2">{stock.quantity.toString()}</td>
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
            <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={isSubmitting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}