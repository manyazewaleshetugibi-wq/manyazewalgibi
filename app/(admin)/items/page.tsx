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
import { Search, Plus, Edit, Trash2, Clock, Utensils, Star, Save, X, Tag, Loader2, Eye } from 'lucide-react'
import { useDebouncedCallback } from "use-debounce"
import { api } from "@/utils/api"

// Types and Schemas
const ItemSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().min(1, "Description is required"),
  categoryId: z.string().min(1, "Category is required"),
  price: z.number().min(0, "Price must be positive"),
  imageUrl: z.string().optional(),
  requiredStock: z.array(
    z.object({
      stockId: z.string(),
      quantity: z.number().min(0, "Quantity must be positive"),
    }),
  ),
  nutritionalInfo: z.object({
    calories: z.number().min(0),
    protein: z.number().min(0),
    carbohydrates: z.number().min(0),
    fat: z.number().min(0),
  }),
  preparationTime: z.number().min(0),
  isActive: z.boolean(),
  isFeatured: z.boolean(),
})

type MenuItem = z.infer<typeof ItemSchema>

type ItemCategory = {
  _id: string
  name: string
}

type Stock = {
  _id: string
  name: string
}

// Main component
export default function RestaurantMenuManagement() {
  const [categories, setCategories] = useState<ItemCategory[]>([])
  const [stocks, setStocks] = useState<Stock[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [filteredItems, setFilteredItems] = useState<MenuItem[]>([])
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isViewDetailsOpen, setIsViewDetailsOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(8)
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all") // Updated initial state
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<MenuItem>({
    resolver: zodResolver(ItemSchema),
    defaultValues: {
      requiredStock: [{ stockId: "", quantity: 0 }],
      nutritionalInfo: { calories: 0, protein: 0, carbohydrates: 0, fat: 0 },
      isActive: true,
      isFeatured: false,
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
        setCategories(categoriesData.data)
        setStocks(stocksData.data)
        setMenuItems(menuItemsData.items)
        setFilteredItems(menuItemsData.items)
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
      const matchesSearch = searchTerm === "" || item.name.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesCategory = categoryFilter === "all" || item.categoryId === categoryFilter // Updated filter condition
      const matchesPrice = item.price >= priceRange[0] && item.price <= priceRange[1]
      return matchesSearch && matchesCategory && matchesPrice
    })
    setFilteredItems(filtered)
    setCurrentPage(1)
  }, [searchTerm, categoryFilter, priceRange, menuItems])

  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentItems = filteredItems.slice(indexOfFirstItem, indexOfLastItem)

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber)

  const handleCreateOrUpdate = async (data: MenuItem) => {
    setIsLoading(true)
    setError(null)
    try {
      if (selectedItem) {
        await api.updateMenuItem(selectedItem._id!, data)
        toast.success("Item updated successfully")
      } else {
        await api.createMenuItem(data)
        toast.success("Item created successfully")
      }
      const updatedItems = await api.fetchMenuItems()
      setMenuItems(updatedItems.items)
      setIsDialogOpen(false)
      reset()
    } catch (error) {
      console.error("Error saving item:", error)
      setError("Failed to save item. Please try again.")
      toast.error("An error occurred while saving the item")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this item?")) {
      setIsLoading(true)
      setError(null)
      try {
        await api.deleteMenuItem(id)
        const updatedItems = await api.fetchMenuItems()
        setMenuItems(updatedItems.items)
        toast.success("Item deleted successfully")
      } catch (error) {
        console.error("Error deleting item:", error)
        setError("Failed to delete item. Please try again.")
        toast.error("An error occurred while deleting the item")
      } finally {
        setIsLoading(false)
      }
    }
  }

  const handleEdit = (item: MenuItem) => {
    setSelectedItem(item)
    reset(item)
    setIsDialogOpen(true)
  }

  const handleViewDetails = (item: MenuItem) => {
    setSelectedItem(item)
    setIsViewDetailsOpen(true)
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setValue("imageUrl", reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const watchedImage = watch("imageUrl")

  if (isLoading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>
  }

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center h-screen">
        <p className="text-red-500 mb-4">{error}</p>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4 space-y-8">
      <Toaster position="top-right" />
      <h1 className="text-4xl font-bold mb-6 flex items-center">
        <Utensils className="mr-2" /> Restaurant Menu Management
      </h1>

      <div className="flex flex-wrap justify-between items-center gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <Input
              type="text"
              placeholder="Search items..."
              className="pl-10 w-64"
              onChange={(e) => debouncedSearch(e.target.value)}
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}> {/* Updated Select component */}
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem> {/* Updated to "all" */}
              {categories.map((category) => (
                <SelectItem key={category._id} value={category._id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium">Price Range (ETB):</span>
            <Slider
              min={0}
              max={1000}
              step={10}
              value={priceRange}
              onValueChange={debouncedPriceRange}
              className="w-[200px]"
            />
            <span className="text-sm">
              {priceRange[0]} - {priceRange[1]} ETB
            </span>
          </div>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={() => {
                setSelectedItem(null)
                reset()
              }}
            >
              <Plus className="mr-2" /> Add New Item
            </Button>
          </DialogTrigger>
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
                      <TabsTrigger value="basic">Basic Info</TabsTrigger>
                      <TabsTrigger value="stock">Required Stock</TabsTrigger>
                      <TabsTrigger value="nutrition">Nutrition</TabsTrigger>
                    </TabsList>
                    <TabsContent value="basic">
                      <div className="space-y-4">
                        <div>
                          <Input {...register("name")} placeholder="Item Name" />
                          {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>}
                        </div>
                        <div>
                          <Controller
                            name="categoryId"
                            control={control}
                            render={({ field }) => (
                              <Select onValueChange={field.onChange} value={field.value || undefined}>
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
                          {errors.categoryId && (
                            <p className="text-red-500 text-sm mt-1">{errors.categoryId.message}</p>
                          )}
                        </div>
                        <div>
                          <Textarea {...register("description")} placeholder="Description" />
                          {errors.description && (
                            <p className="text-red-500 text-sm mt-1">{errors.description.message}</p>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Input
                              {...register("price", { valueAsNumber: true })}
                              type="number"
                              step="0.01"
                              placeholder="Price (ETB)"
                            />
                            {errors.price && <p className="text-red-500 text-sm mt-1">{errors.price.message}</p>}
                          </div>
                          <div>
                            <Input
                              {...register("preparationTime", { valueAsNumber: true })}
                              type="number"
                              placeholder="Preparation Time (minutes)"
                            />
                            {errors.preparationTime && (
                              <p className="text-red-500 text-sm mt-1">{errors.preparationTime.message}</p>
                            )}
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Image</label>
                          <div className="flex items-center space-x-2">
                            <Input type="file" accept="image/*" onChange={handleImageUpload} />
                            {watchedImage && (
                              <img
                                src={watchedImage || "/placeholder.svg"}
                                alt="Item Preview"
                                className="w-12 h-12 object-cover rounded"
                              />
                            )}
                          </div>
                        </div>
                        
                      </div>
                    </TabsContent>
                    <TabsContent value="stock">
                      <div className="space-y-4">
                        <label className="block text-sm font-medium text-gray-700">Required Stock</label>
                        {fields.map((field, index) => (
                          <div key={field.id} className="flex items-center space-x-2">
                            <Controller
                              name={`requiredStock.${index}.stockId`}
                              control={control}
                              render={({ field }) => (
                                <Select onValueChange={field.onChange} value={field.value || undefined}>
                                  <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select Stock" />
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
                            <Input
                              {...register(`requiredStock.${index}.quantity` as const, { valueAsNumber: true })}
                              type="number"
                              placeholder="Quantity"
                              className="w-1/3"
                            />
                            <Button type="button" variant="outline" size="icon" onClick={() => remove(index)}>
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => append({ stockId: "", quantity: 0 })}
                        >
                          <Plus className="mr-2 h-4 w-4" /> Add Stock
                        </Button>
                      </div>
                    </TabsContent>
                    <TabsContent value="nutrition">
                      <div className="space-y-4">
                        <Input
                          {...register("nutritionalInfo.calories", { valueAsNumber: true })}
                          type="number"
                          placeholder="Calories"
                        />
                        <Input
                          {...register("nutritionalInfo.protein", { valueAsNumber: true })}
                          type="number"
                          placeholder="Protein (g)"
                        />
                        <Input
                          {...register("nutritionalInfo.carbohydrates", { valueAsNumber: true })}
                          type="number"
                          placeholder="Carbohydrates (g)"
                        />
                        <Input
                          {...register("nutritionalInfo.fat", { valueAsNumber: true })}
                          type="number"
                          placeholder="Fat (g)"
                        />
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
              </ScrollArea>
              <DialogFooter>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  {selectedItem ? "Update Item" : "Create Item"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {currentItems.map((item) => (
          <Card key={item._id} className="overflow-hidden">
            <CardHeader className="p-0">
              <img src={item.imageUrl || "/placeholder.svg"} alt={item.name} className="w-full h-48 object-cover" />
            </CardHeader>
            <CardContent className="p-4">
              <CardTitle className="flex justify-between items-center mb-2">
                <span>{item.name}</span>
                {item.isFeatured && <Star className="text-yellow-400" />}
              </CardTitle>
              <p className="text-sm text-gray-600 mb-2 line-clamp-2">{item.description}</p>
              <div className="flex justify-between items-center mb-2">
                <span className="flex items-center">
                  <Tag className="mr-1" size={16} />
                  {item.price.toFixed(2)} ETB
                </span>
                <span className="flex items-center">
                  <Clock className="mr-1" size={16} />
                  {item.preparationTime} min
                </span>
              </div>
              <div className="flex items-center text-sm text-gray-500">
                <Utensils className="mr-1" size={16} />
                {categories.find((c) => c._id === item.categoryId)?.name}
              </div>
              <div className="mt-2">
                <Badge variant={item.isActive ? "default" : "secondary"}>{item.isActive ? "Active" : "Inactive"}</Badge>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between p-4">
              <Button variant="outline" onClick={() => handleViewDetails(item)}>
                <Eye className="mr-2" size={16} />
                
              </Button>
              <Button variant="outline" onClick={() => handleEdit(item)}>
                <Edit className="mr-2" size={16} />
                
              </Button>
              <Button variant="destructive" onClick={() => handleDelete(item._id!)}>
                <Trash2 className="mr-2" size={16} />
                
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      <div className="mt-6 flex justify-center">
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious onClick={() => paginate(currentPage - 1)} disabled={currentPage === 1} />
            </PaginationItem>
            {Array.from({ length: Math.ceil(filteredItems.length / itemsPerPage) }).map((_, index) => (
              <PaginationItem key={index}>
                <PaginationLink onClick={() => paginate(index + 1)} isActive={currentPage === index + 1}>
                  {index + 1}
                </PaginationLink>
              </PaginationItem>
            ))}
            <PaginationItem>
              <PaginationNext
                onClick={() => paginate(currentPage + 1)}
                disabled={currentPage === Math.ceil(filteredItems.length / itemsPerPage)}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>

      <Dialog open={isViewDetailsOpen} onOpenChange={setIsViewDetailsOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Item Details</DialogTitle>
          </DialogHeader>
          {selectedItem && (
            <div className="space-y-4">
              <img
                src={selectedItem.imageUrl || "/placeholder.svg"}
                alt={selectedItem.name}
                className="w-full h-48 object-cover rounded-md"
              />
              <h2 className="text-2xl font-bold">{selectedItem.name}</h2>
              <p className="text-gray-600">{selectedItem.description}</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold">Price</h3>
                  <p>{selectedItem.price.toFixed(2)} ETB</p>
                </div>
                <div>
                  <h3 className="font-semibold">Preparation Time</h3>
                  <p>{selectedItem.preparationTime} minutes</p>
                </div>
                <div>
                  <h3 className="font-semibold">Category</h3>
                  <p>{categories.find((c) => c._id === selectedItem.categoryId)?.name}</p>
                </div>
                <div>
                  <h3 className="font-semibold">Status</h3>
                  <Badge variant={selectedItem.isActive ? "default" : "secondary"}>
                    {selectedItem.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>
              <div>
                <h3 className="font-semibold">Nutritional Information</h3>
                <ul className="list-disc list-inside">
                  <li>Calories: {selectedItem.nutritionalInfo.calories}</li>
                  <li>Protein: {selectedItem.nutritionalInfo.protein}g</li>
                  <li>Carbohydrates: {selectedItem.nutritionalInfo.carbohydrates}g</li>
                  <li>Fat: {selectedItem.nutritionalInfo.fat}g</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold">Required Stock</h3>
                <ul className="list-disc list-inside">
                  {selectedItem.requiredStock.map((stock, index) => (
                    <li key={index}>
                      {stocks.find((s) => s._id === stock.stockId)?.name}: {stock.quantity}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
