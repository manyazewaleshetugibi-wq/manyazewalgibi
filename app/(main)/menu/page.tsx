'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, X, ChevronDown, ChevronUp, Clock, DollarSign, Tag, Utensils, Grid, List } from 'lucide-react'
import { NavBar } from '@/components/NavBar'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"

interface Category {
  _id: string
  name: string
  description: string
  type: string
  imageUrl: string
}

interface NutritionalInfo {
  calories: number
  protein: number
  carbohydrates: number
  fat: number
}

interface Item {
  _id: string
  name: string
  description: string
  categoryId: string
  price: number
  imageUrl: string
  preparationTime: number
  nutritionalInfo: NutritionalInfo
  isActive: boolean
  isFeatured: boolean
}

export default function ItemMenu() {
  const [categories, setCategories] = useState<Category[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [filteredItems, setFilteredItems] = useState<Item[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortField, setSortField] = useState<keyof Item>('name')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [categoriesRes, itemsRes] = await Promise.all([
          fetch('/api/item-category'),
          fetch('/api/items')
        ])

        if (!categoriesRes.ok || !itemsRes.ok) {
          throw new Error('Failed to fetch data')
        }

        const categoriesData = await categoriesRes.json()
        const itemsData = await itemsRes.json()

        setCategories(categoriesData.data)
        setItems(itemsData.items)
        setFilteredItems(itemsData.items)
        setLoading(false)
      } catch (err) {
        setError('An error occurred while fetching data')
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  useEffect(() => {
    let result = items

    if (selectedCategory) {
      result = result.filter(item => item.categoryId === selectedCategory)
    }

    if (searchTerm) {
      result = result.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    result.sort((a, b) => {
      if (a[sortField] < b[sortField]) return sortDirection === 'asc' ? -1 : 1
      if (a[sortField] > b[sortField]) return sortDirection === 'asc' ? 1 : -1
      return 0
    })

    setFilteredItems(result)
  }, [items, selectedCategory, searchTerm, sortField, sortDirection])

  const handleSort = (field: keyof Item) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const ItemCard = ({ item }: { item: Item }) => (
    <Card className={`h-full transition-all duration-300 hover:shadow-lg ${viewMode === 'list' ? 'flex' : ''}`}>
      <CardHeader className={`p-0 ${viewMode === 'list' ? 'w-1/3' : ''}`}>
        <Image
          src={item.imageUrl || "/placeholder.svg"}
          alt={item.name}
          width={400}
          height={300}
          className={`w-full object-cover ${viewMode === 'grid' ? 'h-48 rounded-t-lg' : 'h-full rounded-l-lg'}`}
        />
      </CardHeader>
      <div className={`flex flex-col ${viewMode === 'list' ? 'w-2/3' : ''}`}>
        <CardContent className="p-4 flex-grow">
          <CardTitle className="text-xl mb-2">{item.name}</CardTitle>
          <CardDescription className="text-sm text-gray-600 mb-4 line-clamp-2">{item.description}</CardDescription>
          <div className="flex justify-between items-center">
            <Badge variant="secondary" className="text-lg font-semibold">
              {item.price.toLocaleString()} ETB
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {item.preparationTime} mins
            </Badge>
          </div>
        </CardContent>
        <CardFooter className="p-4 pt-0">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full">View Details</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px]">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold">{item.name}</DialogTitle>
                <DialogDescription>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Image
                      src={item.imageUrl || "/placeholder.svg"}
                      alt={item.name}
                      width={600}
                      height={400}
                      className="w-full h-64 object-cover rounded-lg"
                    />
                    <div>
                      <p className="text-gray-600 mb-4">{item.description}</p>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center gap-2">
                          <DollarSign className="w-5 h-5 text-green-500" />
                          <span className="font-semibold">{item.price.toLocaleString()} ETB</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-5 h-5 text-blue-500" />
                          <span>{item.preparationTime} mins</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Tag className="w-5 h-5 text-purple-500" />
                          <span>{categories.find(c => c._id === item.categoryId)?.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Utensils className="w-5 h-5 text-orange-500" />
                          <span>Serves 1</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <Tabs defaultValue="nutrition" className="w-full mt-6">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="nutrition">Nutrition</TabsTrigger>
                      <TabsTrigger value="reviews">Reviews</TabsTrigger>
                    </TabsList>
                    <TabsContent value="nutrition" className="mt-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center justify-between">
                          <span>Calories:</span>
                          <span className="font-semibold">{item.nutritionalInfo.calories}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Protein:</span>
                          <span className="font-semibold">{item.nutritionalInfo.protein}g</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Carbohydrates:</span>
                          <span className="font-semibold">{item.nutritionalInfo.carbohydrates}g</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Fat:</span>
                          <span className="font-semibold">{item.nutritionalInfo.fat}g</span>
                        </div>
                      </div>
                    </TabsContent>
                    <TabsContent value="reviews" className="mt-4">
                      <p>Customer reviews coming soon...</p>
                    </TabsContent>
                  </Tabs>
                </DialogDescription>
              </DialogHeader>
            </DialogContent>
          </Dialog>
        </CardFooter>
      </div>
    </Card>
  )

  return (
    <div className="min-h-screen bg-gray-100">
      <NavBar />
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8 text-center">Item Menu</h1>
        
        <div className="sticky top-0 z-10 bg-gray-100 py-4 mb-8 space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-3 text-gray-400" size={20} />
              <Input
                type="text"
                placeholder="Search items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select onValueChange={(value) => setSelectedCategory(value === 'all' ? null : value)}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="All Categories" />
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
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSort('name')}
              className="flex items-center gap-1"
            >
              Name
              {sortField === 'name' && (sortDirection === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />)}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSort('price')}
              className="flex items-center gap-1"
            >
              Price
              {sortField === 'price' && (sortDirection === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />)}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSort('preparationTime')}
              className="flex items-center gap-1"
            >
              Preparation Time
              {sortField === 'preparationTime' && (sortDirection === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />)}
            </Button>
            <div className="ml-auto flex gap-2">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                <Grid size={20} />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <List size={20} />
              </Button>
            </div>
          </div>
        </div>

        <ScrollArea className="h-[calc(100vh-300px)]">
          {loading ? (
            <div className={`grid gap-8 ${viewMode === 'grid' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1'}`}>
              {[...Array(8)].map((_, index) => (
                <Card key={index} className={`h-full ${viewMode === 'list' ? 'flex' : ''}`}>
                  <CardHeader className={`p-0 ${viewMode === 'list' ? 'w-1/3' : ''}`}>
                    <Skeleton className={`w-full ${viewMode === 'grid' ? 'h-48 rounded-t-lg' : 'h-full rounded-l-lg'}`} />
                  </CardHeader>
                  <div className={`flex flex-col ${viewMode === 'list' ? 'w-2/3' : ''}`}>
                    <CardContent className="p-4">
                      <Skeleton className="h-6 w-3/4 mb-2" />
                      <Skeleton className="h-4 w-full mb-4" />
                      <Skeleton className="h-4 w-full" />
                    </CardContent>
                    <CardFooter className="p-4 pt-0">
                      <Skeleton className="h-10 w-full" />
                    </CardFooter>
                  </div>
                </Card>
              ))}
            </div>
          ) : error ? (
            <div className="text-center text-red-500">{error}</div>
          ) : (
            <motion.div
              layout
              className={`grid gap-8 ${viewMode === 'grid' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1'}`}
            >
              <AnimatePresence>
                {filteredItems.map((item) => (
                  <motion.div
                    key={item._id}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <ItemCard item={item} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </ScrollArea>
      </main>
    </div>
  )
}