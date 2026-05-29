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
import {MealPlanner} from './components/MealPlanner'
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
import { Search, Plus, Edit, Trash2, Clock, Star, Save, X, Tag, Loader2, Eye, Filter, Coffee, XCircle, AlertCircle, Package, Check, Heart } from 'lucide-react'
import { useDebouncedCallback } from "use-debounce"
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

interface HealthyMenuItem {
    _id?: string;
    name: string;
    description: string;
    price: number;
    cost?: number;
    categoryId: string;
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
    healthLabels?: string[];
    dietaryInfo?: {
        isGlutenFree?: boolean;
        isVegan?: boolean;
        isVegetarian?: boolean;
        isDairyFree?: boolean;
        isLowCarb?: boolean;
    };
    createdAt?: string;
    updatedAt?: string;
}

interface ItemCategory {
    _id: string
    name: string
    type?: string
    isActive?: boolean
}

interface Stock {
    _id: string
    name: string
    unit?: string
    currentStock?: number
}

// Validation schema
const HealthyMenuItemSchema = z.object({
    _id: z.string().optional(),
    name: z.string().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
    description: z.string().min(1, "Description is required").max(500, "Description must be less than 500 characters"),
    categoryId: z.string().min(1, "Category is required"),
    price: z.number().min(0, "Price must be positive").max(999999, "Price is too high"),
    imageUrl: z.string().nullable().optional(),
    requiredStock: z.array(z.object({
        stockId: z.string(),
        quantity: z.number().min(0, "Quantity must be positive"),
    })).optional(),
    nutritionalInfo: z.object({
        calories: z.number().min(0, "Calories must be positive").max(10000, "Calories too high"),
        protein: z.number().min(0, "Protein must be positive").max(1000, "Protein too high"),
        carbohydrates: z.number().min(0, "Carbohydrates must be positive").max(1000, "Carbohydrates too high"),
        fat: z.number().min(0, "Fat must be positive").max(1000, "Fat too high"),
    }).optional(),
    preparationTime: z.number().min(0, "Preparation time must be positive").max(1440, "Preparation time cannot exceed 24 hours").optional(),
    isActive: z.boolean().optional(),
    isFeatured: z.boolean().optional(),
    healthLabels: z.array(z.string()).optional(),
    dietaryInfo: z.object({
        isGlutenFree: z.boolean().optional(),
        isVegan: z.boolean().optional(),
        isVegetarian: z.boolean().optional(),
        isDairyFree: z.boolean().optional(),
        isLowCarb: z.boolean().optional(),
    }).optional(),
});

type FormData = z.infer<typeof HealthyMenuItemSchema> & {
    image?: File;
};

// Searchable Stock Select Component
const SearchableStockSelect: React.FC<{
    value: string;
    onChange: (value: string) => void;
    stocks: Stock[];
    disabled?: boolean;
    placeholder?: string;
}> = ({ value, onChange, stocks, disabled = false, placeholder = "Select ingredient..." }) => {
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

                        <ScrollArea className="max-h-[300px] overflow-y-auto p-1">
                            {stocks.length === 0 ? (
                                <div className="text-center py-8 px-4">
                                    <Package className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                                    <p className="text-sm text-gray-500">No ingredients available</p>
                                    <p className="text-xs text-gray-400 mt-1">Add ingredients from stock management</p>
                                </div>
                            ) : (
                                <div className="space-y-1">
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
                                                setSearchQuery("");
                                            }}
                                        >
                                            <Check className={cn("mr-2 h-4 w-4 shrink-0", value === stock._id ? "opacity-100" : "opacity-0")} />
                                            <div className="flex flex-col min-w-0 flex-1">
                                                <span className="font-medium truncate">{stock.name}</span>
                                                <span className="text-xs text-gray-500">
                                                    Unit: {stock.unit || 'N/A'} | In Stock: {stock.currentStock?.toString() || '0'}
                                                </span>
                                            </div>
                                        </Button>
                                    ))}

                                    {searchQuery && filteredStocks.length === 0 && (
                                        <div className="text-center py-8 px-4">
                                            <Package className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                                            <p className="text-sm text-gray-500">No ingredients found</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </ScrollArea>

                        <div className="border-t p-2 flex justify-between items-center">
                            <span className="text-xs text-gray-500">{stocks.length} total ingredients</span>
                            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setIsOpen(false)}>
                                Cancel
                            </Button>
                        </div>
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    );
};

// Main Component
export default function HealthyMenuManagement() {
    const [categories, setCategories] = useState<ItemCategory[]>([])
    const [stocks, setStocks] = useState<Stock[]>([])
    const [menuItems, setMenuItems] = useState<HealthyMenuItem[]>([])
    const [filteredItems, setFilteredItems] = useState<HealthyMenuItem[]>([])
    const [selectedItem, setSelectedItem] = useState<HealthyMenuItem | null>(null)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [isViewDetailsOpen, setIsViewDetailsOpen] = useState(false)
    const [currentPage, setCurrentPage] = useState(1)
    const [itemsPerPage] = useState(8)
    const [searchTerm, setSearchTerm] = useState("")
    const [categoryFilter, setCategoryFilter] = useState("all")
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
    const [networkStatus, setNetworkStatus] = useState<'online' | 'offline'>(navigator.onLine ? 'online' : 'offline')
    const [stocksError, setStocksError] = useState<string | null>(null)
    const [isMealPlannerOpen, setIsMealPlannerOpen] = useState(false)

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
        formState: { errors },
    } = useForm<FormData>({
        resolver: zodResolver(HealthyMenuItemSchema),
        defaultValues: {
            requiredStock: [],
            nutritionalInfo: { calories: 0, protein: 0, carbohydrates: 0, fat: 0 },
            isActive: true,
            isFeatured: false,
            preparationTime: 10,
            price: 0,
            healthLabels: [],
            dietaryInfo: {
                isGlutenFree: false,
                isVegan: false,
                isVegetarian: false,
                isDairyFree: false,
                isLowCarb: false,
            },
        },
    })

    const { fields, append, remove } = useFieldArray({
        control,
        name: "requiredStock",
    })

    const debouncedSearch = useDebouncedCallback((value) => setSearchTerm(value), 300)
    const debouncedPriceRange = useDebouncedCallback((value) => setPriceRange(value), 300)

    // Fetch categories
    const fetchCategories = async () => {
        try {
            const response = await fetch("/api/item-category?page=1&limit=100")
            const data = await response.json()
            if (data.success) {
                setCategories(data.data || [])
            } else {
                console.error("Failed to fetch categories:", data.message)
                setCategories([])
            }
        } catch (error) {
            console.error("Error fetching categories:", error)
            setCategories([])
        }
    }

    // Fetch stocks with error handling
    const fetchStocks = async () => {
        try {
            setStocksError(null)
            const response = await fetch("/api/stock")

            if (!response.ok) {
                if (response.status === 404) {
                    setStocksError("Stocks API not found. Ingredient tracking is disabled.")
                    setStocks([])
                    return
                }
                throw new Error(`HTTP ${response.status}`)
            }

            const data = await response.json()

            if (data.success) {
                setStocks(data.data || data.stocks || [])
            } else {
                setStocks([])
            }
        } catch (error) {
            console.error("Error fetching stocks:", error)
            setStocksError("Unable to load ingredients. Stock tracking may be unavailable.")
            setStocks([])
        }
    }

    // Fetch healthy menu items
    const fetchHealthyMenuItems = async () => {
        try {
            const response = await fetch("/api/healthy-menu")

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`)
            }

            const data = await response.json()

            if (data.success) {
                const items = data.items || []
                setMenuItems(items)
                setFilteredItems(items)
                return true
            } else {
                throw new Error(data.message || "Failed to fetch items")
            }
        } catch (error: any) {
            console.error("Error fetching healthy menu items:", error)
            throw error
        }
    }

    const fetchData = async () => {
        setIsLoading(true)
        setError(null)

        try {
            await Promise.all([
                fetchCategories(),
                fetchStocks(),
                fetchHealthyMenuItems()
            ])
        } catch (error: any) {
            console.error("Failed to fetch data:", error)
            setError(error.message || "Failed to load data. Please try again.")
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [])

    useEffect(() => {
        const filtered = menuItems.filter((item) => {
            const matchesSearch = searchTerm === "" || item.name?.toLowerCase().includes(searchTerm.toLowerCase())
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
    const totalPages = Math.ceil(filteredItems.length / itemsPerPage)

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setFieldErrors(prev => {
            const newErrors = { ...prev }
            delete newErrors.image
            return newErrors
        })

        setSelectedImage(file)
        setIsImageRemoved(false)

        const reader = new FileReader()
        reader.onloadend = () => setImagePreview(reader.result as string)
        reader.readAsDataURL(file)
    }

    const removeImage = () => {
        setSelectedImage(null)
        setImagePreview(null)
        setValue("imageUrl", null)
        setIsImageRemoved(true)
    }

    const onSubmit = async (data: FormData) => {
        setIsSubmitting(true)
        setIsUploading(true)
        setUploadProgress(0)
        setError(null)

        try {
            const formData = new FormData()

            formData.append("name", data.name || "")
            formData.append("description", data.description || "")
            formData.append("categoryId", data.categoryId || "")
            formData.append("price", data.price?.toString() || "0")
            formData.append("preparationTime", data.preparationTime?.toString() || "10")
            formData.append("isActive", (data.isActive ?? true).toString())
            formData.append("isFeatured", (data.isFeatured ?? false).toString())

            if (data.nutritionalInfo) {
                formData.append("nutritionalInfo", JSON.stringify(data.nutritionalInfo))
            }

            if (data.dietaryInfo) {
                formData.append("dietaryInfo", JSON.stringify(data.dietaryInfo))
            }

            const validRequiredStock = (data.requiredStock || [])
                .filter(stock => stock.stockId && stock.quantity > 0)
                .map(stock => ({ stockId: stock.stockId, quantity: stock.quantity }))
            formData.append("requiredStock", JSON.stringify(validRequiredStock))

            if (selectedItem && selectedItem._id) {
                if (selectedImage) {
                    formData.append('image', selectedImage)
                } else if (isImageRemoved) {
                    formData.append("removeImage", "true")
                } else if (data.imageUrl && data.imageUrl.startsWith('http')) {
                    formData.append("imageUrl", data.imageUrl)
                } else if (selectedItem.cloudinaryData?.url) {
                    formData.append("imageUrl", selectedItem.cloudinaryData.url)
                }
            } else {
                if (selectedImage) {
                    formData.append('image', selectedImage)
                }
            }

            const progressInterval = setInterval(() => {
                setUploadProgress(prev => prev >= 90 ? 90 : prev + 10)
            }, 300)

            let url = "/api/healthy-menu"
            let method = "POST"

            if (selectedItem && selectedItem._id) {
                url = `/api/healthy-menu/${selectedItem._id}`
                method = "PUT"
            }

            const response = await fetch(url, {
                method: method,
                body: formData,
            })

            clearInterval(progressInterval)
            setUploadProgress(100)

            if (!response.ok) {
                const text = await response.text()
                throw new Error(`Server responded with ${response.status}: ${text.substring(0, 100)}`)
            }

            const result = await response.json()

            if (result.success) {
                toast.success(selectedItem ? "Item updated successfully" : "Item created successfully")
                await fetchData()
                reset()
                setSelectedImage(null)
                setImagePreview(null)
                setIsImageRemoved(false)
                setSelectedItem(null)
                setIsDialogOpen(false)
            } else {
                throw new Error(result.message || "Operation failed")
            }

        } catch (error: any) {
            console.error("Error saving item:", error)
            const errorMessage = error.message || "Failed to save item"
            setError(errorMessage)
            toast.error(errorMessage)
        } finally {
            setIsSubmitting(false)
            setIsUploading(false)
            setUploadProgress(0)
        }
    }

    const handleDelete = async (id: string) => {
        try {
            const response = await fetch(`/api/healthy-menu/${id}`, { method: "DELETE" })

            if (!response.ok) {
                throw new Error(`Server responded with ${response.status}`)
            }

            const result = await response.json()

            if (result.success) {
                toast.success("Item deleted successfully")
                await fetchData()
            } else {
                throw new Error(result.message || "Failed to delete")
            }
        } catch (error: any) {
            console.error("Error deleting item:", error)
            toast.error(error.message || "Failed to delete item")
        }
    }

    const handleEdit = (item: HealthyMenuItem) => {
        setSelectedItem(item)
        setImagePreview(item.cloudinaryData?.url || item.imageUrl || null)
        setSelectedImage(null)
        setIsImageRemoved(false)
        setFieldErrors({})
        setError(null)

        reset({
            ...item,
            requiredStock: item.requiredStock || [],
            nutritionalInfo: item.nutritionalInfo || { calories: 0, protein: 0, carbohydrates: 0, fat: 0 },
            preparationTime: item.preparationTime || 10,
            isActive: item.isActive ?? true,
            isFeatured: item.isFeatured ?? false,
            imageUrl: item.cloudinaryData?.url || item.imageUrl,
            dietaryInfo: item.dietaryInfo || {
                isGlutenFree: false,
                isVegan: false,
                isVegetarian: false,
                isDairyFree: false,
                isLowCarb: false,
            },
        })
        setIsDialogOpen(true)
    }

    const handleViewDetails = (item: HealthyMenuItem) => {
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
            requiredStock: [],
            nutritionalInfo: { calories: 0, protein: 0, carbohydrates: 0, fat: 0 },
            isActive: true,
            isFeatured: false,
            price: 0,
            preparationTime: 10,
            name: "",
            description: "",
            categoryId: "",
            healthLabels: [],
            dietaryInfo: {
                isGlutenFree: false,
                isVegan: false,
                isVegetarian: false,
                isDairyFree: false,
                isLowCarb: false,
            },
        })
        setIsDialogOpen(true)
    }

    const getItemImage = (item: HealthyMenuItem) => {
        return item.cloudinaryData?.url || item.imageUrl || "/placeholder.svg"
    }

    if (isLoading && menuItems.length === 0) {
        return (
            <div className="flex flex-col justify-center items-center h-screen bg-gray-50">
                <div className="relative w-20 h-20">
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Heart className="h-8 w-8 text-green-600" />
                    </div>
                    <div className="absolute inset-0 border-4 border-t-green-600 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
                </div>
                <p className="mt-4 text-green-800 font-medium">Loading healthy menu items...</p>
            </div>
        )
    }

    return (
        <div className="container mx-auto p-4 space-y-8">
            <Toaster position="top-right" />

            {networkStatus === 'offline' && (
                <Alert variant="destructive" className="mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Offline</AlertTitle>
                    <AlertDescription>You are currently offline. Some features may be unavailable.</AlertDescription>
                </Alert>
            )}

            {stocksError && (
                <Alert className="mb-4 border-yellow-500 bg-yellow-50">
                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                    <AlertTitle className="text-yellow-800">Note</AlertTitle>
                    <AlertDescription className="text-yellow-700">{stocksError}</AlertDescription>
                </Alert>
            )}

            <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 p-6 rounded-lg shadow-sm mb-8">
                <h1 className="text-4xl font-bold flex items-center text-gray-800">
                    <Heart className="mr-3 text-green-600" size={32} />
                    Healthy Menu Management
                </h1>
                <p className="text-gray-600 mt-2 max-w-2xl">
                    Manage your healthy menu items, add nutritious dishes, and organize health-conscious offerings.
                </p>
            </div>

            {error && (
                <Alert variant="destructive" className="mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

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
                                    placeholder="Search healthy items..."
                                    className="pl-10 w-64"
                                    onChange={(e) => debouncedSearch(e.target.value)}
                                />
                            </div>
                            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
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
                                        step={1}
                                        value={priceRange}
                                        onValueChange={debouncedPriceRange}
                                        className="w-[200px]"
                                    />
                                    <span className="text-sm font-medium bg-gray-100 px-2 py-1 rounded-md min-w-[90px] text-center">
                                        {priceRange[0]} - {priceRange[1]} ETB
                                    </span>
                                </div>
                            </div>
                        </div>

                        <Button
                            onClick={handleNewItem}
                            className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                        >
                            <Plus className="mr-2 h-4 w-4" /> Add Healthy Item
                        </Button>

                        <Button
                            onClick={() => setIsMealPlannerOpen(true)}
                            variant="outline"
                            className="border-green-600 text-green-600 hover:bg-green-50"
                        >
                            Plan a Meal
                        </Button>


                    </div>
                </CardContent>





            </Card>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {currentItems.length > 0 ? (
                    currentItems.map((item) => (
                        <Card key={item._id} className="overflow-hidden hover:shadow-lg transition-shadow duration-300 group border border-gray-200">
                            <div className="relative">
                                <CardHeader className="p-0">
                                    <img
                                        src={getItemImage(item)}
                                        alt={item.name}
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

                                <div className="absolute bottom-2 left-2 flex gap-1 flex-wrap">
                                    {item.dietaryInfo?.isVegan && (
                                        <Badge className="bg-green-600 text-white text-xs">Vegan</Badge>
                                    )}
                                    {item.dietaryInfo?.isVegetarian && (
                                        <Badge className="bg-green-500 text-white text-xs">Vegetarian</Badge>
                                    )}
                                    {item.dietaryInfo?.isGlutenFree && (
                                        <Badge className="bg-yellow-600 text-white text-xs">Gluten Free</Badge>
                                    )}
                                </div>
                            </div>
                            <CardContent className="p-4">
                                <CardTitle className="text-lg font-semibold mb-2 line-clamp-1">
                                    {item.name}
                                </CardTitle>
                                <p className="text-sm text-gray-600 mb-3 line-clamp-2 h-10">
                                    {item.description || "No description available"}
                                </p>
                                <div className="flex flex-col gap-2">
                                    <div className="flex justify-between items-center">
                                        <span className="flex items-center text-sm font-medium text-gray-900">
                                            <Tag className="mr-1.5 text-green-600" size={14} />
                                            {item.price} ETB
                                        </span>
                                        <span className="flex items-center text-sm text-gray-500">
                                            <Clock className="mr-1.5 text-orange-500" size={14} />
                                            {item.preparationTime} min
                                        </span>
                                    </div>
                                    <div className="flex items-center text-xs text-gray-500 pt-1">
                                        <Coffee className="mr-1.5 text-green-500" size={14} />
                                        {categories.find((c) => c._id === item.categoryId)?.name || "Uncategorized"}
                                    </div>
                                </div>
                            </CardContent>
                            <Separator />
                            <CardFooter className="flex justify-between p-3 bg-gray-50">
                                <Button variant="ghost" size="sm" onClick={() => handleViewDetails(item)} className="flex-1 mr-1">
                                    <Eye className="mr-1.5 h-4 w-4" />
                                    View
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => handleEdit(item)} className="flex-1 mr-1">
                                    <Edit className="mr-1.5 h-4 w-4" />
                                    Edit
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => item._id && handleDelete(item._id)}
                                    className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                    <Trash2 className="mr-1.5 h-4 w-4" />
                                    Delete
                                </Button>
                            </CardFooter>
                        </Card>
                    ))
                ) : (
                    <div className="col-span-full flex flex-col items-center justify-center p-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                        <Heart className="h-12 w-12 text-gray-400 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900">No healthy items found</h3>
                        <p className="text-sm text-gray-500 mt-1">Click "Add Healthy Item" to create one</p>
                    </div>
                )}
            </div>

            {totalPages > 1 && (
                <div className="mt-6 flex justify-center">
                    <Pagination>
                        <PaginationContent>
                            <PaginationItem>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="h-9 w-9"
                                >
                                    <PaginationPrevious className="h-4 w-4" />
                                </Button>
                            </PaginationItem>
                            {Array.from({ length: Math.min(totalPages, 5) }).map((_, index) => {
                                let pageNum = index + 1
                                if (totalPages > 5 && currentPage > 3) {
                                    pageNum = currentPage - 2 + index
                                    if (pageNum > totalPages) return null
                                }
                                return (
                                    <PaginationItem key={pageNum}>
                                        <PaginationLink
                                            onClick={() => setCurrentPage(pageNum)}
                                            isActive={currentPage === pageNum}
                                        >
                                            {pageNum}
                                        </PaginationLink>
                                    </PaginationItem>
                                )
                            })}
                            {totalPages > 5 && currentPage < totalPages - 2 && (
                                <PaginationItem>
                                    <span className="px-2">...</span>
                                </PaginationItem>
                            )}
                            <PaginationItem>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    className="h-9 w-9"
                                >
                                    <PaginationNext className="h-4 w-4" />
                                </Button>
                            </PaginationItem>
                        </PaginationContent>
                    </Pagination>
                </div>
            )}

            {/* Add/Edit Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-[600px] max-h-[90vh]">
                    <DialogHeader>
                        <DialogTitle>{selectedItem ? "Edit Healthy Item" : "Add New Healthy Item"}</DialogTitle>
                        <DialogDescription>
                            {selectedItem ? "Edit the details of the healthy menu item." : "Add a new healthy item to your menu."}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit(onSubmit)}>
                        <ScrollArea className="h-[60vh] pr-4">
                            <div className="space-y-4 py-4">
                                <Tabs defaultValue="basic" className="w-full">
                                    <TabsList className="grid w-full grid-cols-4">
                                        <TabsTrigger value="basic">Basic Info</TabsTrigger>
                                        <TabsTrigger value="stock">Stock</TabsTrigger>
                                        <TabsTrigger value="nutrition">Nutrition</TabsTrigger>
                                        <TabsTrigger value="dietary">Dietary</TabsTrigger>
                                    </TabsList>

                                    <TabsContent value="basic">
                                        <div className="space-y-4 pt-3">
                                            <div className="grid gap-2">
                                                <Label>Name *</Label>
                                                <Input {...register("name")} placeholder="e.g., Quinoa Bowl" />
                                                {errors.name && <p className="text-red-500 text-sm">{errors.name.message}</p>}
                                            </div>
                                            <div className="grid gap-2">
                                                <Label>Category *</Label>
                                                <Controller
                                                    name="categoryId"
                                                    control={control}
                                                    render={({ field }) => (
                                                        <Select onValueChange={field.onChange} value={field.value}>
                                                            <SelectTrigger>
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
                                                <Label>Description *</Label>
                                                <Textarea {...register("description")} placeholder="Describe the healthy item..." className="min-h-[100px]" />
                                                {errors.description && <p className="text-red-500 text-sm">{errors.description.message}</p>}
                                            </div>
                                            <div className="grid gap-2">
                                                <Label>Price (ETB) *</Label>
                                                <Input
                                                    type="number"
                                                    step="any"
                                                    placeholder="0.00"
                                                    {...register("price", { valueAsNumber: true })}
                                                />
                                                {errors.price && <p className="text-red-500 text-sm">{errors.price.message}</p>}
                                            </div>
                                            <div className="grid gap-2">
                                                <Label>Preparation Time (min)</Label>
                                                <Input
                                                    type="number"
                                                    step="any"
                                                    placeholder="10"
                                                    {...register("preparationTime", { valueAsNumber: true })}
                                                />
                                            </div>
                                            <div className="grid gap-2">
                                                <Label>Image</Label>
                                                <Input type="file" accept="image/*" onChange={handleImageChange} />
                                                {fieldErrors.image && <p className="text-red-500 text-sm">{fieldErrors.image}</p>}
                                            </div>

                                            {imagePreview && (
                                                <div className="relative w-full max-w-xs">
                                                    <img src={imagePreview} alt="Preview" className="w-full h-48 object-cover rounded-md border" />
                                                    <Button type="button" variant="destructive" size="icon" className="absolute top-2 right-2 h-8 w-8" onClick={removeImage}>
                                                        <XCircle className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            )}

                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="flex items-center space-x-2">
                                                    <Controller name="isActive" control={control} render={({ field }) => (
                                                        <Switch checked={field.value ?? true} onCheckedChange={field.onChange} />
                                                    )} />
                                                    <Label>Active</Label>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <Controller name="isFeatured" control={control} render={({ field }) => (
                                                        <Switch checked={field.value ?? false} onCheckedChange={field.onChange} />
                                                    )} />
                                                    <Label>Featured</Label>
                                                </div>
                                            </div>
                                        </div>
                                    </TabsContent>

                                    <TabsContent value="stock">
                                        <div className="space-y-4 pt-3">
                                            {stocksError && (
                                                <div className="text-sm text-yellow-600 bg-yellow-50 p-2 rounded">
                                                    {stocksError}
                                                </div>
                                            )}
                                            {fields.map((field, index) => (
                                                <div key={field.id} className="flex items-center space-x-2 bg-gray-50 p-3 rounded-md">
                                                    <div className="flex-1">
                                                        <Controller
                                                            name={`requiredStock.${index}.stockId`}
                                                            control={control}
                                                            render={({ field }) => (
                                                                <SearchableStockSelect
                                                                    value={field.value || ""}
                                                                    onChange={field.onChange}
                                                                    stocks={stocks}
                                                                    disabled={stocks.length === 0}
                                                                    placeholder={stocks.length === 0 ? "No ingredients available" : "Select ingredient..."}
                                                                />
                                                            )}
                                                        />
                                                    </div>
                                                    <div className="w-1/4">
                                                        <Input
                                                            type="number"
                                                            step="any"
                                                            placeholder="Quantity"
                                                            {...register(`requiredStock.${index}.quantity`, { valueAsNumber: true })}
                                                        />
                                                    </div>
                                                    <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            ))}
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => append({ stockId: "", quantity: 0 })}
                                                className="w-full"
                                                disabled={stocks.length === 0}
                                            >
                                                <Plus className="mr-2 h-4 w-4" /> Add Ingredient
                                            </Button>
                                            {stocks.length === 0 && (
                                                <p className="text-xs text-gray-500 text-center">
                                                    No ingredients available. Add ingredients from stock management first.
                                                </p>
                                            )}
                                        </div>
                                    </TabsContent>

                                    <TabsContent value="nutrition">
                                        <div className="space-y-4 pt-3">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <Label>Calories</Label>
                                                    <Input type="number" step="any" {...register("nutritionalInfo.calories", { valueAsNumber: true })} />
                                                </div>
                                                <div>
                                                    <Label>Protein (g)</Label>
                                                    <Input type="number" step="any" {...register("nutritionalInfo.protein", { valueAsNumber: true })} />
                                                </div>
                                                <div>
                                                    <Label>Carbs (g)</Label>
                                                    <Input type="number" step="any" {...register("nutritionalInfo.carbohydrates", { valueAsNumber: true })} />
                                                </div>
                                                <div>
                                                    <Label>Fat (g)</Label>
                                                    <Input type="number" step="any" {...register("nutritionalInfo.fat", { valueAsNumber: true })} />
                                                </div>
                                            </div>
                                        </div>
                                    </TabsContent>

                                    <TabsContent value="dietary">
                                        <div className="space-y-4 pt-3">
                                            <div className="space-y-3">
                                                <div className="flex items-center space-x-2">
                                                    <Controller name="dietaryInfo.isVegan" control={control} render={({ field }) => (
                                                        <Switch checked={field.value ?? false} onCheckedChange={field.onChange} />
                                                    )} />
                                                    <Label>Vegan</Label>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <Controller name="dietaryInfo.isVegetarian" control={control} render={({ field }) => (
                                                        <Switch checked={field.value ?? false} onCheckedChange={field.onChange} />
                                                    )} />
                                                    <Label>Vegetarian</Label>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <Controller name="dietaryInfo.isGlutenFree" control={control} render={({ field }) => (
                                                        <Switch checked={field.value ?? false} onCheckedChange={field.onChange} />
                                                    )} />
                                                    <Label>Gluten Free</Label>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <Controller name="dietaryInfo.isDairyFree" control={control} render={({ field }) => (
                                                        <Switch checked={field.value ?? false} onCheckedChange={field.onChange} />
                                                    )} />
                                                    <Label>Dairy Free</Label>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <Controller name="dietaryInfo.isLowCarb" control={control} render={({ field }) => (
                                                        <Switch checked={field.value ?? false} onCheckedChange={field.onChange} />
                                                    )} />
                                                    <Label>Low Carb</Label>
                                                </div>
                                            </div>
                                        </div>
                                    </TabsContent>
                                </Tabs>
                            </div>
                        </ScrollArea>
                        <DialogFooter>
                            <Button type="submit" disabled={isSubmitting || isUploading}>
                                {isSubmitting || isUploading ? (
                                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
                                ) : (
                                    <><Save className="mr-2 h-4 w-4" /> {selectedItem ? "Update" : "Create"}</>
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
                        <DialogTitle>Healthy Item Details</DialogTitle>
                    </DialogHeader>
                    {selectedItem && (
                        <ScrollArea className="max-h-[70vh] pr-4">
                            <div className="space-y-6">
                                <img
                                    src={getItemImage(selectedItem)}
                                    alt={selectedItem.name}
                                    className="w-full h-52 object-cover rounded-lg"
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).src = "/placeholder.svg"
                                    }}
                                />

                                <div>
                                    <h2 className="text-2xl font-bold">{selectedItem.name}</h2>
                                    <p className="text-gray-500">{categories.find(c => c._id === selectedItem.categoryId)?.name || "Unknown Category"}</p>
                                </div>

                                <div>
                                    <h3 className="font-semibold">Description</h3>
                                    <p className="text-gray-600">{selectedItem.description}</p>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-sm text-gray-500">Price</p>
                                        <p className="text-xl font-bold">{selectedItem.price} ETB</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">Preparation Time</p>
                                        <p className="text-xl font-bold">{selectedItem.preparationTime} min</p>
                                    </div>
                                </div>

                                {selectedItem.nutritionalInfo && (
                                    <div>
                                        <h3 className="font-semibold mb-2">Nutritional Info</h3>
                                        <div className="grid grid-cols-4 gap-2">
                                            <div className="text-center p-2 bg-gray-50 rounded">
                                                <p className="font-bold">{selectedItem.nutritionalInfo.calories}</p>
                                                <p className="text-xs text-gray-500">Calories</p>
                                            </div>
                                            <div className="text-center p-2 bg-gray-50 rounded">
                                                <p className="font-bold">{selectedItem.nutritionalInfo.protein}g</p>
                                                <p className="text-xs text-gray-500">Protein</p>
                                            </div>
                                            <div className="text-center p-2 bg-gray-50 rounded">
                                                <p className="font-bold">{selectedItem.nutritionalInfo.carbohydrates}g</p>
                                                <p className="text-xs text-gray-500">Carbs</p>
                                            </div>
                                            <div className="text-center p-2 bg-gray-50 rounded">
                                                <p className="font-bold">{selectedItem.nutritionalInfo.fat}g</p>
                                                <p className="text-xs text-gray-500">Fat</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {selectedItem.dietaryInfo && Object.values(selectedItem.dietaryInfo).some(v => v === true) && (
                                    <div>
                                        <h3 className="font-semibold mb-2">Dietary Information</h3>
                                        <div className="flex flex-wrap gap-2">
                                            {selectedItem.dietaryInfo.isVegan && <Badge className="bg-green-600">Vegan</Badge>}
                                            {selectedItem.dietaryInfo.isVegetarian && <Badge className="bg-green-500">Vegetarian</Badge>}
                                            {selectedItem.dietaryInfo.isGlutenFree && <Badge className="bg-yellow-600">Gluten Free</Badge>}
                                            {selectedItem.dietaryInfo.isDairyFree && <Badge className="bg-blue-600">Dairy Free</Badge>}
                                            {selectedItem.dietaryInfo.isLowCarb && <Badge className="bg-purple-600">Low Carb</Badge>}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </ScrollArea>
                    )}

                    
                </DialogContent>
                
            </Dialog>
            <MealPlanner
            isOpen={isMealPlannerOpen}
            onClose={() => setIsMealPlannerOpen(false)}
            menuItems={menuItems}
            categories={categories}
            />
        </div>
    )
}
