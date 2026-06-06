// app/restaurants/page.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { motion } from 'framer-motion'
import {
  Store, Plus, Edit, Trash2, Search, X, Loader2,
  CheckCircle, XCircle, ArrowLeft,
  MapPin, Phone, Mail, Globe, AlertCircle,
  Save, Navigation, MoreHorizontal,
  Building2, Clock
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
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
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

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
  location?: {
    lat: number
    lng: number
    address: string
    capturedAt?: string
    updatedAt?: string
  }
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
  locationLat: string
  locationLng: string
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
  locationLat: '',
  locationLng: '',
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
  const [isGettingLocation, setIsGettingLocation] = useState(false)
  
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
        r.email?.toLowerCase().includes(term) ||
        r.phone?.includes(term)
      )
      setFilteredRestaurants(filtered)
    }
  }, [searchTerm, restaurants])

  // Get current location with better error handling
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser')
      return
    }

    setIsGettingLocation(true)
    
    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        setFormData({
          ...formData,
          locationLat: latitude.toFixed(6),
          locationLng: longitude.toFixed(6)
        })
        toast.success(`Location captured: ${latitude.toFixed(4)}°, ${longitude.toFixed(4)}°`)
        setIsGettingLocation(false)
      },
      (error) => {
        console.error('Error getting location:', error)
        let errorMessage = 'Unable to get location. '
        
        switch(error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access denied. Please enable location permissions in your browser settings.'
            break
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information is unavailable. Please check your GPS signal.'
            break
          case error.TIMEOUT:
            errorMessage = 'Location request timed out. Please try again.'
            break
          default:
            errorMessage = 'Unknown location error occurred.'
        }
        
        toast.error(errorMessage)
        setIsGettingLocation(false)
      },
      options
    )
  }

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
      locationLat: restaurant.location?.lat?.toString() || '',
      locationLng: restaurant.location?.lng?.toString() || '',
      isActive: restaurant.isActive
    })
    setShowEditDialog(true)
  }

  // Open delete dialog
  const handleDeleteClick = (restaurant: Restaurant) => {
    setSelectedRestaurant(restaurant)
    setShowDeleteDialog(true)
  }

  // Add restaurant with location
  const handleAdd = async () => {
    if (!formData.name.trim()) {
      toast.error('Restaurant name is required')
      return
    }

    setIsSubmitting(true)
    
    try {
      // Prepare location data
      let locationData = null
      if (formData.locationLat && formData.locationLng) {
        locationData = {
          lat: parseFloat(formData.locationLat),
          lng: parseFloat(formData.locationLng),
          address: formData.address || '',
          capturedAt: new Date().toISOString()
        }
      }

      const response = await fetch('/api/restaurants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          address: formData.address,
          phone: formData.phone,
          email: formData.email,
          website: formData.website,
          cuisine: formData.cuisine.split(',').map(c => c.trim()).filter(c => c),
          location: locationData,
          isActive: formData.isActive
        })
      })

      const data = await response.json()

      if (data.success) {
        toast.success(locationData ? 'Restaurant added with location!' : 'Restaurant added successfully')
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

  // Update restaurant with location
  const handleUpdate = async () => {
    if (!selectedRestaurant) return
    if (!formData.name.trim()) {
      toast.error('Restaurant name is required')
      return
    }

    setIsSubmitting(true)
    
    try {
      // Prepare location data
      let locationData = null
      if (formData.locationLat && formData.locationLng) {
        locationData = {
          lat: parseFloat(formData.locationLat),
          lng: parseFloat(formData.locationLng),
          address: formData.address || '',
          updatedAt: new Date().toISOString()
        }
      }

      const response = await fetch(`/api/restaurants/${selectedRestaurant._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          address: formData.address,
          phone: formData.phone,
          email: formData.email,
          website: formData.website,
          cuisine: formData.cuisine.split(',').map(c => c.trim()).filter(c => c),
          location: locationData,
          isActive: formData.isActive
        })
      })

      const data = await response.json()

      if (data.success) {
        toast.success(locationData ? 'Restaurant updated with location!' : 'Restaurant updated successfully')
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

  // Restaurant Form Component - Improved with better location UX
  const RestaurantForm = ({ isEdit = false }: { isEdit?: boolean }) => (
    <div className="space-y-4">
      {/* Restaurant Name */}
      <div className="space-y-2">
        <Label htmlFor="name" className="text-sm font-medium flex items-center gap-2">
          <Store className="h-4 w-4" />
          Restaurant Name *
        </Label>
        <Input
          id="name"
          placeholder="e.g., Manyazewal Eshetu Gibi"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="focus:ring-2 focus:ring-purple-500"
          autoFocus
        />
      </div>
      
      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description" className="text-sm font-medium">Description</Label>
        <Textarea
          id="description"
          placeholder="Brief description of the restaurant..."
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={3}
          className="focus:ring-2 focus:ring-purple-500 resize-none"
        />
      </div>
      
      {/* Contact Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="phone" className="text-sm font-medium flex items-center gap-2">
            <Phone className="h-4 w-4" />
            Phone Number
          </Label>
          <Input
            id="phone"
            type="tel"
            placeholder="+251 123 456 789"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className="focus:ring-2 focus:ring-purple-500"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm font-medium flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Email Address
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="restaurant@example.com"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="focus:ring-2 focus:ring-purple-500"
          />
        </div>
      </div>
      
      {/* Address with Location Capture */}
      <div className="space-y-2">
        <Label htmlFor="address" className="text-sm font-medium flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          Address
        </Label>
        <div className="flex gap-2">
          <Input
            id="address"
            placeholder="Physical address"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            className="flex-1 focus:ring-2 focus:ring-purple-500"
          />
          <Button
            type="button"
            variant="outline"
            onClick={getCurrentLocation}
            disabled={isGettingLocation}
            className="shrink-0 gap-2"
            title="Get current location"
          >
            {isGettingLocation ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="hidden sm:inline text-xs">Getting...</span>
              </>
            ) : (
              <>
                <Navigation className="h-4 w-4" />
                <span className="hidden sm:inline text-xs">Get Location</span>
              </>
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Click the location button to automatically capture your current coordinates
        </p>
      </div>

      {/* Location Coordinates - Show only if captured */}
      {(formData.locationLat || formData.locationLng) && (
        <div className="bg-purple-50 rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Navigation className="h-4 w-4 text-purple-600" />
              Location Coordinates
            </Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setFormData({ ...formData, locationLat: '', locationLng: '' })}
              className="h-6 w-6 p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Latitude</Label>
              <Input
                value={formData.locationLat}
                onChange={(e) => setFormData({ ...formData, locationLat: e.target.value })}
                placeholder="0.000000"
                className="mt-1 text-sm font-mono"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Longitude</Label>
              <Input
                value={formData.locationLng}
                onChange={(e) => setFormData({ ...formData, locationLng: e.target.value })}
                placeholder="0.000000"
                className="mt-1 text-sm font-mono"
              />
            </div>
          </div>
          <p className="text-xs text-purple-600 mt-1">
            ✓ Location captured. You can edit coordinates manually if needed.
          </p>
        </div>
      )}
      
      {/* Website and Cuisine */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="website" className="text-sm font-medium flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Website
          </Label>
          <Input
            id="website"
            type="url"
            placeholder="https://example.com"
            value={formData.website}
            onChange={(e) => setFormData({ ...formData, website: e.target.value })}
            className="focus:ring-2 focus:ring-purple-500"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="cuisine" className="text-sm font-medium">Cuisine Types</Label>
          <Input
            id="cuisine"
            placeholder="Ethiopian, Italian, Chinese"
            value={formData.cuisine}
            onChange={(e) => setFormData({ ...formData, cuisine: e.target.value })}
            className="focus:ring-2 focus:ring-purple-500"
          />
          <p className="text-xs text-muted-foreground">Separate multiple cuisines with commas</p>
        </div>
      </div>
      
      {/* Active Status Toggle */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Status</Label>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setFormData({ ...formData, isActive: true })}
            className={`flex-1 px-4 py-2 rounded-lg border-2 transition-all ${
              formData.isActive 
                ? 'border-green-500 bg-green-50 text-green-700' 
                : 'border-gray-200 bg-white text-gray-500 hover:border-green-200'
            }`}
          >
            <CheckCircle className="h-4 w-4 inline mr-2" />
            Active
          </button>
          <button
            type="button"
            onClick={() => setFormData({ ...formData, isActive: false })}
            className={`flex-1 px-4 py-2 rounded-lg border-2 transition-all ${
              !formData.isActive 
                ? 'border-red-500 bg-red-50 text-red-700' 
                : 'border-gray-200 bg-white text-gray-500 hover:border-red-200'
            }`}
          >
            <XCircle className="h-4 w-4 inline mr-2" />
            Inactive
          </button>
        </div>
      </div>
    </div>
  )

  // Loading skeleton
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50">
        <main className="container mx-auto px-4 py-8">
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <Skeleton className="h-10 w-48" />
              <Skeleton className="h-10 w-36" />
            </div>
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-96 w-full" />
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50">
      <main className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                onClick={() => router.back()}
                className="rounded-full hover:bg-purple-100"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 flex items-center gap-2">
                  <Store className="h-7 w-7 text-purple-600" />
                  Restaurants
                </h1>
                <p className="text-sm text-gray-500 mt-0.5">
                  Manage your restaurant listings with location tracking
                </p>
              </div>
            </div>
            
            <Button
              onClick={() => {
                resetForm()
                setShowAddDialog(true)
              }}
              className="bg-purple-600 hover:bg-purple-700 text-white shadow-lg rounded-full px-5 py-2"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Restaurant
            </Button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search by name, address, phone or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-10 py-5 bg-white border border-gray-200 rounded-xl focus:border-purple-300 focus:ring-2 focus:ring-purple-200"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Restaurants Table */}
          <Card className="border-0 shadow-lg rounded-2xl overflow-hidden">
            <CardHeader className="bg-white border-b border-gray-100 p-5">
              <CardTitle className="text-base font-semibold text-gray-700 flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                All Restaurants ({filteredRestaurants.length})
              </CardTitle>
            </CardHeader>
            
            <CardContent className="p-0">
              {filteredRestaurants.length === 0 ? (
                <div className="text-center py-16">
                  <Store className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <h3 className="text-base font-medium text-gray-600">No restaurants found</h3>
                  <p className="text-sm text-gray-400 mt-1">
                    {searchTerm ? 'Try a different search term' : 'Add your first restaurant'}
                  </p>
                  {!searchTerm && (
                    <Button
                      onClick={() => {
                        resetForm()
                        setShowAddDialog(true)
                      }}
                      variant="ghost"
                      className="mt-4 text-purple-600 hover:text-purple-700"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Restaurant
                    </Button>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="font-semibold">Name</TableHead>
                        <TableHead className="font-semibold">Contact</TableHead>
                        <TableHead className="font-semibold">Address</TableHead>
                        <TableHead className="font-semibold">Location</TableHead>
                        <TableHead className="font-semibold">Cuisine</TableHead>
                        <TableHead className="font-semibold text-center">Status</TableHead>
                        <TableHead className="font-semibold text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRestaurants.map((restaurant) => (
                        <TableRow key={restaurant._id} className="hover:bg-gray-50">
                          <TableCell className="font-medium">
                            <div>
                              <p>{restaurant.name}</p>
                              {restaurant.description && (
                                <p className="text-xs text-gray-500 truncate max-w-[200px]">
                                  {restaurant.description}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-0.5 text-sm">
                              {restaurant.phone && (
                                <p className="flex items-center gap-1">
                                  <Phone className="h-3 w-3 text-gray-400" />
                                  <span className="text-xs">{restaurant.phone}</span>
                                </p>
                              )}
                              {restaurant.email && (
                                <p className="flex items-center gap-1">
                                  <Mail className="h-3 w-3 text-gray-400" />
                                  <span className="text-xs truncate max-w-[150px]">{restaurant.email}</span>
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <p className="text-sm flex items-start gap-1">
                              <MapPin className="h-3 w-3 text-gray-400 mt-0.5 shrink-0" />
                              <span className="line-clamp-2 max-w-[200px]">{restaurant.address || '-'}</span>
                            </p>
                          </TableCell>
                          <TableCell>
                            {restaurant.location?.lat && restaurant.location?.lng ? (
                              <div className="text-xs text-muted-foreground">
                                <p className="font-mono">{restaurant.location.lat.toFixed(4)}°</p>
                                <p className="font-mono">{restaurant.location.lng.toFixed(4)}°</p>
                                {restaurant.location.capturedAt && (
                                  <div className="flex items-center gap-1 mt-1">
                                    <Clock className="h-2 w-2" />
                                    <span className="text-[10px]">
                                      {new Date(restaurant.location.capturedAt).toLocaleDateString()}
                                    </span>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <Badge variant="outline" className="text-xs">
                                No location
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {restaurant.cuisine?.slice(0, 2).map((c, i) => (
                                <Badge key={i} variant="secondary" className="text-xs font-normal">
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
                          <TableCell className="text-center">
                            <button
                              onClick={() => handleToggleStatus(restaurant)}
                              className="transition-transform hover:scale-105"
                            >
                              {restaurant.isActive ? (
                                <CheckCircle className="h-5 w-5 text-green-500" />
                              ) : (
                                <XCircle className="h-5 w-5 text-gray-400" />
                              )}
                            </button>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-32">
                                <DropdownMenuItem onClick={() => handleEdit(restaurant)} className="cursor-pointer">
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleDeleteClick(restaurant)}
                                  className="text-red-600 cursor-pointer"
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
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Add Dialog */}
        <Dialog open={showAddDialog} onOpenChange={(open) => {
          setShowAddDialog(open)
          if (!open) resetForm()
        }}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto p-0">
            <div className="p-6">
              <DialogHeader className="mb-4">
                <DialogTitle className="text-xl flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center">
                    <Plus className="h-4 w-4 text-purple-600" />
                  </div>
                  Add New Restaurant
                </DialogTitle>
                <DialogDescription>
                  Fill in the details to add a new restaurant. You can capture the location automatically.
                </DialogDescription>
              </DialogHeader>
              
              <RestaurantForm />
              
              <DialogFooter className="mt-6 gap-2">
                <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleAdd} 
                  disabled={isSubmitting}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Add Restaurant
                    </>
                  )}
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={showEditDialog} onOpenChange={(open) => {
          setShowEditDialog(open)
          if (!open) resetForm()
        }}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto p-0">
            <div className="p-6">
              <DialogHeader className="mb-4">
                <DialogTitle className="text-xl flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center">
                    <Edit className="h-4 w-4 text-purple-600" />
                  </div>
                  Edit Restaurant
                </DialogTitle>
                <DialogDescription>
                  Update the restaurant information. You can update the location as well.
                </DialogDescription>
              </DialogHeader>
              
              <RestaurantForm isEdit />
              
              <DialogFooter className="mt-6 gap-2">
                <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleUpdate} 
                  disabled={isSubmitting}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Update Restaurant
                    </>
                  )}
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                </div>
                <DialogTitle className="text-lg">Delete Restaurant</DialogTitle>
              </div>
              <DialogDescription className="pt-2">
                Are you sure you want to delete <strong className="text-red-600">{selectedRestaurant?.name}</strong>? 
                This action cannot be undone and will remove all associated data including location information.
              </DialogDescription>
            </DialogHeader>
            
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleDelete} 
                disabled={isSubmitting}
                variant="destructive"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Restaurant
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  )
}