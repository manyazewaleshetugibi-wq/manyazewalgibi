// app/restaurants/page.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Store, Plus, Edit, Trash2, Search, X, Loader2,
  MoreVertical, CheckCircle, XCircle, ArrowLeft,
  Building, MapPin, Phone, Mail, Globe, AlertCircle
} from 'lucide-react'
import { NavBar } from '@/components/NavBar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

// Types
interface Restaurant {
  _id: string
  name: string
  description?: string
  address?: string
  phone?: string
  email?: string
  website?: string
  cuisine?: string[]
  isActive: boolean
  createdAt: string
  updatedAt: string
}

interface RestaurantFormData {
  name: string
  description: string
  address: string
  phone: string
  email: string
  website: string
  cuisine: string
  isActive: boolean
}

const initialFormData: RestaurantFormData = {
  name: '',
  description: '',
  address: '',
  phone: '',
  email: '',
  website: '',
  cuisine: '',
  isActive: true
}

export default function RestaurantsPage() {
  const router = useRouter()
  
  // State
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [filteredRestaurants, setFilteredRestaurants] = useState<Restaurant[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Dialog states
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null)
  
  // Form state
  const [formData, setFormData] = useState<RestaurantFormData>(initialFormData)

  // Fetch restaurants
  const fetchRestaurants = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/restaurants')
      const data = await response.json()
      
      if (data.success) {
        setRestaurants(data.data)
        setFilteredRestaurants(data.data)
      } else {
        toast.error('Failed to fetch restaurants')
      }
    } catch (error) {
      console.error('Error fetching restaurants:', error)
      toast.error('Error loading restaurants')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRestaurants()
  }, [fetchRestaurants])

  // Filter restaurants based on search
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredRestaurants(restaurants)
    } else {
      const term = searchTerm.toLowerCase()
      const filtered = restaurants.filter(r => 
        r.name.toLowerCase().includes(term) ||
        r.description?.toLowerCase().includes(term) ||
        r.address?.toLowerCase().includes(term) ||
        r.email?.toLowerCase().includes(term)
      )
      setFilteredRestaurants(filtered)
    }
  }, [searchTerm, restaurants])

  // Reset form
  const resetForm = () => {
    setFormData(initialFormData)
  }

  // Open edit dialog
  const handleEdit = (restaurant: Restaurant) => {
    setSelectedRestaurant(restaurant)
    setFormData({
      name: restaurant.name || '',
      description: restaurant.description || '',
      address: restaurant.address || '',
      phone: restaurant.phone || '',
      email: restaurant.email || '',
      website: restaurant.website || '',
      cuisine: restaurant.cuisine?.join(', ') || '',
      isActive: restaurant.isActive
    })
    setShowEditDialog(true)
  }

  // Open delete dialog
  const handleDeleteClick = (restaurant: Restaurant) => {
    setSelectedRestaurant(restaurant)
    setShowDeleteDialog(true)
  }

  // Add restaurant
  const handleAdd = async () => {
    if (!formData.name.trim()) {
      toast.error('Restaurant name is required')
      return
    }

    setIsSubmitting(true)
    
    try {
      const response = await fetch('/api/restaurants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          cuisine: formData.cuisine.split(',').map(c => c.trim()).filter(c => c)
        })
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Restaurant added successfully')
        setShowAddDialog(false)
        resetForm()
        fetchRestaurants()
      } else {
        toast.error(data.error || 'Failed to add restaurant')
      }
    } catch (error) {
      console.error('Error adding restaurant:', error)
      toast.error('Error adding restaurant')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Update restaurant
  const handleUpdate = async () => {
    if (!selectedRestaurant) return
    if (!formData.name.trim()) {
      toast.error('Restaurant name is required')
      return
    }

    setIsSubmitting(true)
    
    try {
      const response = await fetch(`/api/restaurants/${selectedRestaurant._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          cuisine: formData.cuisine.split(',').map(c => c.trim()).filter(c => c)
        })
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Restaurant updated successfully')
        setShowEditDialog(false)
        setSelectedRestaurant(null)
        resetForm()
        fetchRestaurants()
      } else {
        toast.error(data.error || 'Failed to update restaurant')
      }
    } catch (error) {
      console.error('Error updating restaurant:', error)
      toast.error('Error updating restaurant')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Delete restaurant
  const handleDelete = async () => {
    if (!selectedRestaurant) return

    setIsSubmitting(true)
    
    try {
      const response = await fetch(`/api/restaurants/${selectedRestaurant._id}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Restaurant deleted successfully')
        setShowDeleteDialog(false)
        setSelectedRestaurant(null)
        fetchRestaurants()
      } else {
        toast.error(data.error || 'Failed to delete restaurant')
      }
    } catch (error) {
      console.error('Error deleting restaurant:', error)
      toast.error('Error deleting restaurant')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Toggle active status
  const handleToggleStatus = async (restaurant: Restaurant) => {
    try {
      const response = await fetch(`/api/restaurants/${restaurant._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !restaurant.isActive })
      })

      const data = await response.json()

      if (data.success) {
        toast.success(`Restaurant ${restaurant.isActive ? 'deactivated' : 'activated'}`)
        fetchRestaurants()
      } else {
        toast.error('Failed to update status')
      }
    } catch (error) {
      console.error('Error toggling status:', error)
      toast.error('Error updating status')
    }
  }

  // Restaurant Form Component
  const RestaurantForm = ({ isEdit = false }: { isEdit?: boolean }) => (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Restaurant Name *</label>
        <Input
          placeholder="Enter restaurant name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        />
      </div>
      
      <div className="space-y-2">
        <label className="text-sm font-medium">Description</label>
        <Input
          placeholder="Brief description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Phone</label>
          <Input
            placeholder="Phone number"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          />
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-medium">Email</label>
          <Input
            type="email"
            placeholder="Email address"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
        </div>
      </div>
      
      <div className="space-y-2">
        <label className="text-sm font-medium">Address</label>
        <Input
          placeholder="Physical address"
          value={formData.address}
          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
        />
      </div>
      
      <div className="space-y-2">
        <label className="text-sm font-medium">Website</label>
        <Input
          placeholder="Website URL"
          value={formData.website}
          onChange={(e) => setFormData({ ...formData, website: e.target.value })}
        />
      </div>
      
      <div className="space-y-2">
        <label className="text-sm font-medium">Cuisine Types</label>
        <Input
          placeholder="e.g., Ethiopian, Italian, Chinese (comma separated)"
          value={formData.cuisine}
          onChange={(e) => setFormData({ ...formData, cuisine: e.target.value })}
        />
      </div>
      
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">Active Status</label>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant={formData.isActive ? "default" : "outline"}
            size="sm"
            onClick={() => setFormData({ ...formData, isActive: true })}
            className={formData.isActive ? "bg-green-600 hover:bg-green-700" : ""}
          >
            <CheckCircle className="h-4 w-4 mr-1" />
            Active
          </Button>
          <Button
            type="button"
            variant={!formData.isActive ? "default" : "outline"}
            size="sm"
            onClick={() => setFormData({ ...formData, isActive: false })}
            className={!formData.isActive ? "bg-gray-600 hover:bg-gray-700" : ""}
          >
            <XCircle className="h-4 w-4 mr-1" />
            Inactive
          </Button>
        </div>
      </div>
    </div>
  )

  // Loading skeleton
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50/50 via-white to-purple-50/30">
        <NavBar />
        <main className="container mx-auto px-4 py-8">
          <div className="space-y-4">
            <Skeleton className="h-12 w-64" />
            <Skeleton className="h-10 w-full" />
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50/50 via-white to-purple-50/30">
      <NavBar />
      
      <main className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                onClick={() => router.back()}
                className="rounded-full"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                  <Store className="h-8 w-8 text-purple-900" />
                  Restaurants
                </h1>
                <p className="text-gray-600 mt-1">
                  Manage your restaurant listings
                </p>
              </div>
            </div>
            
            <Button
              onClick={() => {
                resetForm()
                setShowAddDialog(true)
              }}
              className="bg-gradient-to-r from-purple-800 to-purple-900 hover:from-purple-900 hover:to-purple-950 text-white shadow-lg rounded-full px-6"
            >
              <Plus className="h-5 w-5 mr-2" />
              Add Restaurant
            </Button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Search restaurants..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 py-6 text-lg bg-white border-2 border-purple-200 rounded-2xl focus:border-purple-900"
            />
            {searchTerm && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSearchTerm('')}
                className="absolute right-2 top-1/2 -translate-y-1/2"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Restaurants Table */}
          <Card className="border-0 shadow-xl rounded-3xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-purple-800 to-purple-900 text-white p-6">
              <CardTitle className="text-xl flex items-center gap-2">
                <Building className="h-5 w-5" />
                All Restaurants ({filteredRestaurants.length})
              </CardTitle>
            </CardHeader>
            
            <CardContent className="p-0">
              {filteredRestaurants.length === 0 ? (
                <div className="text-center py-12">
                  <Store className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-700">No restaurants found</h3>
                  <p className="text-gray-500 mt-1">
                    {searchTerm ? 'Try a different search term' : 'Add your first restaurant to get started'}
                  </p>
                  {!searchTerm && (
                    <Button
                      onClick={() => {
                        resetForm()
                        setShowAddDialog(true)
                      }}
                      className="mt-4 bg-purple-100 text-purple-900 hover:bg-purple-200"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Restaurant
                    </Button>
                  )}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Cuisine</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRestaurants.map((restaurant) => (
                      <TableRow key={restaurant._id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{restaurant.name}</p>
                            {restaurant.description && (
                              <p className="text-sm text-gray-500 truncate max-w-xs">
                                {restaurant.description}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {restaurant.email && (
                              <p className="text-sm flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {restaurant.email}
                              </p>
                            )}
                            {restaurant.phone && (
                              <p className="text-sm flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {restaurant.phone}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {restaurant.cuisine?.slice(0, 2).map((c, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">
                                {c}
                              </Badge>
                            ))}
                            {restaurant.cuisine && restaurant.cuisine.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{restaurant.cuisine.length - 2}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleStatus(restaurant)}
                            className={restaurant.isActive ? "text-green-600" : "text-gray-400"}
                          >
                            {restaurant.isActive ? (
                              <CheckCircle className="h-4 w-4" />
                            ) : (
                              <XCircle className="h-4 w-4" />
                            )}
                          </Button>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEdit(restaurant)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleDeleteClick(restaurant)}
                                className="text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Add Dialog */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl flex items-center gap-2">
                <Store className="h-6 w-6 text-purple-900" />
                Add New Restaurant
              </DialogTitle>
              <DialogDescription>
                Fill in the details to add a new restaurant to the system.
              </DialogDescription>
            </DialogHeader>
            
            <RestaurantForm />
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleAdd} 
                disabled={isSubmitting}
                className="bg-gradient-to-r from-purple-800 to-purple-900 text-white"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : (
                  'Add Restaurant'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl flex items-center gap-2">
                <Edit className="h-6 w-6 text-purple-900" />
                Edit Restaurant
              </DialogTitle>
              <DialogDescription>
                Update the restaurant details.
              </DialogDescription>
            </DialogHeader>
            
            <RestaurantForm isEdit />
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleUpdate} 
                disabled={isSubmitting}
                className="bg-gradient-to-r from-purple-800 to-purple-900 text-white"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update Restaurant'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <AlertCircle className="h-6 w-6" />
                Confirm Delete
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to delete <strong>{selectedRestaurant?.name}</strong>? 
                This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleDelete} 
                disabled={isSubmitting}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete Restaurant'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  )
}
