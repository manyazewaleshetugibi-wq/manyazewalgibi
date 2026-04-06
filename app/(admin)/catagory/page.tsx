"use client"

import { useState, useEffect, useMemo } from "react"
import Image from "next/image"
import { Toaster, toast } from "react-hot-toast"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Plus, Grid, List, Search, Edit, Trash2, ChevronLeft, ChevronRight, Coffee, Pizza, 
  Package, Filter, ArrowUpDown, Eye, EyeOff, RefreshCw, Download, Loader2, X
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog"
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
  FOOD: "bg-amber-100/80 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800",
  DRINK: "bg-blue-100/80 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800",
  OTHER: "bg-purple-100/80 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800",
}

const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'dnqsoezfo';
const CLOUDINARY_PHOTO_UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'photoupload';
const CLOUDINARY_PHOTO_FOLDER = process.env.NEXT_PUBLIC_CLOUDINARY_PHOTO_FOLDER || 'photoss';



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

  const [imageFile, setImageFile] = useState<File | null>(null);
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

  const uploadToCloudinary = async (file: File): Promise<string | null> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_PHOTO_UPLOAD_PRESET);
    formData.append('folder', CLOUDINARY_PHOTO_FOLDER);

    try {
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Cloudinary response error:', errorText);
        toast.error(`Cloudinary upload failed: ${errorText}`);
        return null;
      }

      const data = await response.json();
      console.log('Cloudinary upload success:', data);
      return data.secure_url;
    } catch (error: any) {
      console.error('Cloudinary upload error:', error);
      toast.error(`Failed to upload to Cloudinary: ${error.message}`);
      return null;
    }
  };

  const handleAddCategory = async () => {
    const startTime = performance.now();
    const requestId = Math.random().toString(36).substring(2, 10);
    
    try {
      let imageUrl = "";
      if (imageFile) {
        toast.loading("Uploading image to Cloudinary...");
        const uploadedUrl = await uploadToCloudinary(imageFile);
        toast.dismiss();
        if (uploadedUrl) {
          imageUrl = uploadedUrl;
        } else {
          toast.error("Image upload failed. Category not created.");
          return;
        }
      }

      console.group(`%c[ADD CATEGORY REQUEST ${requestId}]`, 'color: #0070f3; font-weight: bold;');
      console.log(`%c[Request] Initiated at ${new Date().toISOString()}`, 'color: #0070f3');
      console.log(`[Request Data]`, { 
        name: newCategory.name,
        description: newCategory.description?.substring(0, 20) + (newCategory.description?.length > 20 ? '...' : ''),
        type: newCategory.type,
        isActive: newCategory.isActive,
        hasImage: !!imageUrl,
        imageSize: imageFile ? `${(imageFile.size / 1024).toFixed(2)}KB` : 'None'
      });
      
      const response = await fetch("/api/item-category", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newCategory, imageUrl, imageBase64: undefined }),
      });
      
      const data = await response.json();
      const requestDuration = ((performance.now() - startTime) / 1000).toFixed(2);
      
      console.log(`%c[Response] Received after ${requestDuration}s`, 'color: #00a3bf');
      console.log(`[Response Status]`, { success: data.success, statusCode: response.status });
      
      // Detailed S3 response logging
      if (data.s3Upload) {
        console.group('%c[S3 UPLOAD DETAILS]', 'color: #8e44ad; font-weight: bold;');
        console.table({
          status: data.s3Upload.status || 'Unknown',
          url: data.s3Upload.url || 'N/A',
          key: data.s3Upload.key || 'N/A',
          bucket: data.s3Upload.bucket || 'N/A',
          region: data.s3Upload.region || 'N/A',
          etag: data.s3Upload.etag || 'N/A',
          contentType: data.s3Upload.contentType || 'N/A',
          size: data.s3Upload.size ? `${(data.s3Upload.size / 1024).toFixed(2)}KB` : 'Unknown'
        });
        
        // Log S3 metadata if available
        if (data.s3Upload.metadata) {
          console.log('%c[S3 Metadata]', 'color: #8e44ad');
          console.table(data.s3Upload.metadata);
        }
        
        // Log any S3 upload errors
        if (data.s3Upload.error) {
          console.error('%c[S3 Upload Error]', 'color: #e74c3c; font-weight: bold;', data.s3Upload.error);
          if (data.s3Upload.errorDetails) {
            console.error('[S3 Error Details]', data.s3Upload.errorDetails);
          }
        }
        console.groupEnd();
      } else if (newCategory.imageBase64) {
        console.log('%c[S3 Upload Info] No S3 upload details returned despite image being provided', 'color: #e67e22');
      }
      
      if (data.success) {
        console.log(`%c[Success] Category added with ID: ${data.data?._id}`, 'color: #2ecc71; font-weight: bold;');
        toast.success("Category added successfully");
        setIsAddDialogOpen(false);
        fetchCategories();
        // Reset form
        setNewCategory({
          name: "",
          description: "",
          type: "FOOD",
          imageBase64: "",
          isActive: true,
        });
        setImageFile(null);
      } else {
        console.error(`%c[Error] ${data.message || "Unknown error"}`, 'color: #e74c3c; font-weight: bold;');
        console.error('[Error Details]', data.error || data.errors || 'No detailed error information');
        toast.error(data.message || "Failed to add category");
      }
      console.groupEnd();
    } catch (error) {
      const requestDuration = ((performance.now() - startTime) / 1000).toFixed(2);
      console.error(`%c[ADD CATEGORY EXCEPTION] after ${requestDuration}s`, 'color: #e74c3c; font-weight: bold;');
      console.error('[Exception Details]', error);
      toast.error("An unexpected error occurred");
      console.groupEnd();
    }
  };

  // Filtered categories based on search term, type, and active status
  const filteredCategories = useMemo(() => {
    return categories;
  }, [categories]);

  const handleEditCategory = async () => {
    if (!currentCategory) return;
    
    const startTime = performance.now();
    const requestId = Math.random().toString(36).substring(2, 10);
    
    try {
      let imageUrl = currentCategory.imageUrl;

      if (imageFile) {
        toast.loading("Uploading new image to Cloudinary...");
        const uploadedUrl = await uploadToCloudinary(imageFile);
        toast.dismiss();
        if (uploadedUrl) {
          imageUrl = uploadedUrl;
        } else {
          toast.error("Image upload failed. Category not updated.");
          return;
        }
      }

      console.group(`%c[EDIT CATEGORY REQUEST ${requestId}]`, 'color: #0070f3; font-weight: bold;');
      console.log(`%c[Request] Initiated at ${new Date().toISOString()}`, 'color: #0070f3');
      
      // Create a new object with only the fields we want to update
      const updateData = {
        name: currentCategory.name,
        description: currentCategory.description, 
        type: currentCategory.type,
        isActive: currentCategory.isActive,
        imageUrl: imageUrl,
        imageBase64: undefined // Ensure base64 is not sent
      };

      console.log(`[Request Data]`, { 
        id: currentCategory._id,
        name: updateData.name,
        description: updateData.description?.substring(0, 20) + (updateData.description?.length > 20 ? '...' : ''),
        type: updateData.type,
        isActive: updateData.isActive,
        hasImage: !!updateData.imageUrl,
        imageSize: imageFile ? `${(imageFile.size / 1024).toFixed(2)}KB` : 'Not changed',
        isImageUpdate: !!imageFile
      });

      const response = await fetch(`/api/item-category/${currentCategory._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });
      
      const data = await response.json();
      const requestDuration = ((performance.now() - startTime) / 1000).toFixed(2);
      
      console.log(`%c[Response] Received after ${requestDuration}s`, 'color: #00a3bf');
      console.log(`[Response Status]`, { success: data.success, statusCode: response.status });
      
      // Detailed S3 response logging
      if (data.s3Upload) {
        console.group('%c[S3 UPLOAD DETAILS]', 'color: #8e44ad; font-weight: bold;');
        console.table({
          status: data.s3Upload.status || 'Unknown',
          url: data.s3Upload.url || 'N/A',
          key: data.s3Upload.key || 'N/A',
          bucket: data.s3Upload.bucket || 'N/A',
          region: data.s3Upload.region || 'N/A',
          etag: data.s3Upload.etag || 'N/A',
          contentType: data.s3Upload.contentType || 'N/A',
          size: data.s3Upload.size ? `${(data.s3Upload.size / 1024).toFixed(2)}KB` : 'Unknown'
        });
        
        // Log S3 metadata if available
        if (data.s3Upload.metadata) {
          console.log('%c[S3 Metadata]', 'color: #8e44ad');
          console.table(data.s3Upload.metadata);
        }
        
        // Log any S3 upload errors
        if (data.s3Upload.error) {
          console.error('%c[S3 Upload Error]', 'color: #e74c3c; font-weight: bold;', data.s3Upload.error);
          if (data.s3Upload.errorDetails) {
            console.error('[S3 Error Details]', data.s3Upload.errorDetails);
          }
        }
        console.groupEnd();
      } else if (updateData.imageBase64) {
        console.log('%c[S3 Upload Info] No S3 upload details returned despite image being provided', 'color: #e67e22');
      }
      
      if (data.success) {
        console.log(`%c[Success] Category updated successfully`, 'color: #2ecc71; font-weight: bold;');
        toast.success("Category updated successfully");
        setIsEditDialogOpen(false);
        setImageFile(null);
        fetchCategories();
      } else {
        console.error(`%c[Error] ${data.message || "Unknown error"}`, 'color: #e74c3c; font-weight: bold;');
        console.error('[Error Details]', data.error || data.errors || 'No detailed error information');
        toast.error(data.message || "Failed to update category");
      }

      console.groupEnd();
    } catch (error) {
      const requestDuration = ((performance.now() - startTime) / 1000).toFixed(2);
      console.error(`%c[EDIT CATEGORY EXCEPTION] after ${requestDuration}s`, 'color: #e74c3c; font-weight: bold;');
      console.error('[Exception Details]', error);
      toast.error("An unexpected error occurred");
      console.groupEnd();
    }
  };

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

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      // Create a preview URL for the UI
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        isEditDialogOpen ? setCurrentCategory(cat => cat ? { ...cat, imageBase64: base64String } : null) : setNewCategory(cat => ({ ...cat, imageBase64: base64String }));
      };
      reader.readAsDataURL(file);
    }
  };

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
      <div className="space-y-6 max-h-[75vh] overflow-y-auto pr-4 -mr-4">
        <div className="relative w-full h-72 mx-auto overflow-hidden rounded-lg mb-4 group">
          <Image
            src={currentCategory.imageUrl || "/placeholder.svg"}
            alt={currentCategory.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-70" />
          <div className="absolute bottom-4 left-4 right-4">
            <h2 className="text-2xl font-bold text-white mb-1 drop-shadow-md">{currentCategory.name}</h2>
            <div className="flex items-center space-x-2">
              <Badge className={`${typeColors[currentCategory.type]} shadow-md`}>
                {React.createElement(typeIcons[currentCategory.type], { className: "w-3.5 h-3.5 mr-1.5" })}
                {currentCategory.type}
              </Badge>
              <Badge variant={currentCategory.isActive ? "default" : "outline"} className="shadow-md">
                {currentCategory.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg shadow-sm">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Description</h3>
              <p className="text-base">{currentCategory.description || "No description provided."}</p>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg shadow-sm">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">ID</h3>
              <p className="text-sm font-mono bg-white dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-700 overflow-x-auto">{currentCategory._id}</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg shadow-sm">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Created At</h3>
                <p className="text-sm">{formatDate(currentCategory.createdAt)}</p>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg shadow-sm">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Updated At</h3>
                <p className="text-sm">{formatDate(currentCategory.updatedAt)}</p>
              </div>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg shadow-sm">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Usage Statistics</h3>
              <div className="flex items-center justify-center h-24">
                <p className="text-gray-400 dark:text-gray-500 text-sm italic">Statistics not available</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex space-x-3 justify-end mt-6">
          <Button
            variant="outline"
            className="group"
            onClick={() => {
              setIsDetailDialogOpen(false);
              setIsEditDialogOpen(true);
            }}
          >
            <Edit className="w-4 h-4 mr-2 group-hover:text-primary transition-colors" />
            Edit
          </Button>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="bg-red-50 border-red-200 text-red-600 hover:bg-red-100 hover:text-red-700 dark:bg-red-950/30 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/50">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="max-w-md">
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the category.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={() => {
                    handleDeleteCategory(currentCategory._id);
                    setIsDetailDialogOpen(false);
                  }}
                  className="bg-red-600 hover:bg-red-700"
                >
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
      className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <AnimatePresence>
        {filteredCategories.map((category, index) => (
          <motion.div
            key={category._id}
            layout
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ 
              opacity: 1, 
              scale: 1, 
              y: 0,
              transition: { 
                delay: index * 0.05,
                duration: 0.3,
                ease: [0.22, 1, 0.36, 1]
              }
            }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
            className="group"
          >
            <Card className={`flex flex-col justify-between h-full transition-all duration-300 ${
              selectedCategories.includes(category._id) 
                ? "ring-2 ring-primary ring-offset-2 dark:ring-offset-gray-950" 
                : "hover:shadow-xl dark:hover:shadow-primary/5 hover:translate-y-[-2px]"
            }`}>
              <CardHeader className="pb-2 flex items-start justify-between">
                <div className="flex items-center space-x-2">
                  <div className="relative">
                    <input 
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary peer opacity-70 z-10"
                      checked={selectedCategories.includes(category._id)}
                      onChange={() => toggleSelectCategory(category._id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="absolute inset-0 bg-primary/10 rounded-full scale-0 peer-checked:scale-110 transition-all duration-200" />
                  </div>
                  <CardTitle className="flex items-center">
                    <span className="truncate max-w-[150px]">{category.name}</span>
                  </CardTitle>
                </div>
                <Badge className={`${typeColors[category.type]} shadow-sm`}>
                  {React.createElement(typeIcons[category.type], { className: "w-3 h-3 mr-1 inline" })}
                  {category.type}
                </Badge>
              </CardHeader>
              <CardContent className="pb-2 relative group">
                <div 
                  className="relative w-full h-40 mb-2 cursor-pointer overflow-hidden rounded-lg"
                  onClick={() => {
                    setCurrentCategory(category);
                    setIsDetailDialogOpen(true);
                  }}
                >
                  <Image
                    src={category.imageUrl || "/placeholder.svg"}
                    alt={category.name}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-30 group-hover:opacity-50 transition-opacity duration-300" />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                    <div className="p-3 bg-white/90 dark:bg-gray-800/90 rounded-full shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                      <Eye className="w-5 h-5 text-primary" />
                    </div>
                  </div>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">{category.description}</p>
                <div className="flex justify-between items-center mt-3">
                  <Badge variant={category.isActive ? "default" : "outline"} className="shadow-sm">
                    {category.isActive ? "Active" : "Inactive"}
                  </Badge>
                  <p className="text-xs text-gray-500">{new Date(category.updatedAt).toLocaleDateString()}</p>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="group/edit hover:bg-primary/5"
                  onClick={() => {
                    setCurrentCategory(category)
                    setIsEditDialogOpen(true)
                  }}
                >
                  <Edit className="w-4 h-4 mr-2 group-hover/edit:text-primary transition-colors" />
                  Edit
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="group/delete hover:bg-red-50 hover:text-red-600 hover:border-red-200 dark:hover:bg-red-950/50">
                      <Trash2 className="w-4 h-4 mr-2 group-hover/delete:text-red-500 transition-colors" />
                      Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="max-w-md">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the category.
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
              </CardFooter>
            </Card>
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  )

  const renderListView = () => (
    <motion.div className="space-y-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow border border-gray-100 dark:border-gray-700">
        <div className="grid grid-cols-12 bg-gray-50 dark:bg-gray-800/80 px-4 py-3 text-sm font-medium text-gray-500 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
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
          {filteredCategories.map((category, index) => (
            <motion.div
              key={category._id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ 
                opacity: 1, 
                y: 0,
                transition: { 
                  delay: index * 0.03,
                  duration: 0.25,
                  ease: "easeOut"
                }
              }}
              exit={{ opacity: 0, y: -10, transition: { duration: 0.15 } }}
              className={`grid grid-cols-12 px-4 py-3 border-b border-gray-100 dark:border-gray-700 items-center ${
                selectedCategories.includes(category._id) 
                  ? "bg-primary/5 dark:bg-primary/10" 
                  : "hover:bg-gray-50 dark:hover:bg-gray-800/70"
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
                <div className="relative h-10 w-10 rounded-md overflow-hidden flex-shrink-0 ring-1 ring-gray-200 dark:ring-gray-700">
                  <Image
                    src={category.imageUrl || "/placeholder.svg"}
                    alt={category.name}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="truncate font-medium">{category.name}</div>
              </div>
              <div className="col-span-3 text-sm text-gray-600 dark:text-gray-300 truncate">{category.description}</div>
              <div className="col-span-1">
                <Badge className={`${typeColors[category.type]} shadow-sm`}>
                  {React.createElement(typeIcons[category.type], { className: "w-3 h-3 mr-1 inline" })}
                  {category.type}
                </Badge>
              </div>
              <div className="col-span-1">
                <Badge 
                  variant={category.isActive ? "default" : "outline"}
                  className={category.isActive ? "bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300" : ""}
                >
                  {category.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
              <div className="col-span-1 text-xs text-gray-500 dark:text-gray-400">
                {new Date(category.updatedAt).toLocaleDateString()}
              </div>
              <div className="col-span-2 flex justify-end space-x-1">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost" 
                        size="icon"
                        className="h-8 w-8 rounded-full hover:bg-primary/10"
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
                        className="h-8 w-8 rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/20"
                        onClick={() => {
                          setCurrentCategory(category);
                          setIsEditDialogOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4 text-blue-500" />
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
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="h-8 w-8 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20"
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </AlertDialogTrigger>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Delete</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <AlertDialogContent className="max-w-md">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the category.
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
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  )

  return (
    <div className="container mx-auto py-4 sm:py-6 md:py-8 px-3 sm:px-4 md:px-6 lg:px-8 bg-gradient-to-b from-white to-gray-50 dark:from-gray-900 dark:to-gray-950 min-h-screen">
      <Toaster position="top-right" />
      <motion.h1
        className="text-4xl font-bold mb-8 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent dark:from-primary dark:to-blue-400 text-center"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        Item Category Management
      </motion.h1>
      
      {/* Stats Cards */}
      <motion.div 
        className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 mb-6 md:mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <Card className="overflow-hidden border border-gray-100 dark:border-gray-800 hover:shadow-md transition-all duration-300 hover:border-primary/20">
          <CardHeader className="pb-2 bg-gradient-to-r from-primary/5 to-transparent dark:from-primary/10">
            <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <span className="text-3xl font-bold">{stats.total}</span>
              <div className="p-2 rounded-full bg-primary/10 backdrop-blur-sm">
                <Package className="w-5 h-5 text-primary" />
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <Badge className={`${typeColors.FOOD} shadow-sm`}>{stats.food} Food</Badge>
              <Badge className={`${typeColors.DRINK} shadow-sm`}>{stats.drink} Drink</Badge>
              <Badge className={`${typeColors.OTHER} shadow-sm`}>{stats.other} Other</Badge>
            </div>
          </CardContent>
        </Card>
        
        <Card className="overflow-hidden border border-gray-100 dark:border-gray-800 hover:shadow-md transition-all duration-300 hover:border-green-200 dark:hover:border-green-900">
          <CardHeader className="pb-2 bg-gradient-to-r from-green-100/50 to-transparent dark:from-green-900/20">
            <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">Active Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <span className="text-3xl font-bold">{stats.active}</span>
              <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/30">
                <Eye className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <div className="mt-3">
              {stats.total > 0 && (
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mb-1 overflow-hidden">
                  <div 
                    className="bg-green-500 dark:bg-green-500/80 h-2.5 rounded-full transition-all duration-500" 
                    style={{ width: `${Math.round((stats.active / stats.total) * 100)}%` }}
                  />
                </div>
              )}
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {stats.total > 0 
                  ? `${Math.round((stats.active / stats.total) * 100)}% of total categories`
                  : "No categories"}
              </span>
            </div>
          </CardContent>
        </Card>
        
        <Card className="overflow-hidden border border-gray-100 dark:border-gray-800 hover:shadow-md transition-all duration-300 hover:border-gray-200 dark:hover:border-gray-700">
          <CardHeader className="pb-2 bg-gradient-to-r from-gray-100/80 to-transparent dark:from-gray-800/50">
            <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">Inactive Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <span className="text-3xl font-bold">{stats.inactive}</span>
              <div className="p-2 rounded-full bg-gray-100 dark:bg-gray-800/80">
                <EyeOff className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </div>
            </div>
            <div className="mt-3">
              {stats.total > 0 && (
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mb-1 overflow-hidden">
                  <div 
                    className="bg-gray-500 dark:bg-gray-500/80 h-2.5 rounded-full transition-all duration-500" 
                    style={{ width: `${Math.round((stats.inactive / stats.total) * 100)}%` }}
                  />
                </div>
              )}
              <span className="text-xs text-gray-500 dark:text-gray-400">
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
          <TabsList className="grid w-full grid-cols-2 mb-6 shadow-sm bg-white dark:bg-gray-800 rounded-lg p-1">
            <TabsTrigger value="browse" className="data-[state=active]:shadow-md data-[state=active]:bg-primary data-[state=active]:text-white">
              <Package className="w-4 h-4 mr-2" />
              Browse Categories
            </TabsTrigger>
            <TabsTrigger value="actions" className="data-[state=active]:shadow-md data-[state=active]:bg-primary data-[state=active]:text-white">
              <ArrowUpDown className="w-4 h-4 mr-2" />
              Bulk Actions {selectedCategories.length > 0 && 
                <Badge variant="secondary" className="ml-2 bg-white text-primary">{selectedCategories.length}</Badge>}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="browse" className="space-y-4">
            <div className="flex flex-col md:flex-row justify-between gap-4">
              <div className="flex flex-col sm:flex-row gap-2 w-full">
                {/* Search */}
                <div className="relative w-full md:w-64">
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                    <Search className="w-4 h-4" />
                  </div>
                  <Input
                    type="text"
                    placeholder="Search categories..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-full bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:ring-primary focus:border-primary"
                  />
                  {searchTerm && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                      onClick={() => setSearchTerm('')}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                    </Button>
                  )}
                </div>
                
                {/* Filter & Sort */}
                <div className="flex flex-wrap gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="flex items-center gap-2 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-primary/50">
                        <Filter className="w-4 h-4" />
                        <span>Filter</span>
                        {(filterType !== 'ALL' || filterActive !== 'ALL') && (
                          <Badge variant="secondary" className="ml-1 bg-primary/10 text-primary border-none">
                            {(filterType !== 'ALL' ? 1 : 0) + (filterActive !== 'ALL' ? 1 : 0)}
                          </Badge>
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 border border-gray-100 dark:border-gray-700 shadow-lg rounded-xl p-2">
                      <DropdownMenuLabel className="text-xs font-medium text-gray-500 dark:text-gray-400 px-2">Category Type</DropdownMenuLabel>
                      <DropdownMenuItem 
                        className={`mb-1 rounded-lg gap-2 ${filterType === 'ALL' ? 'bg-primary/10 text-primary font-medium' : ''}`} 
                        onClick={() => setFilterType('ALL')}
                      >
                        <Package className="w-4 h-4" />
                        All Types
                        {filterType === 'ALL' && <Badge className="ml-auto bg-primary/20 text-primary border-none">Selected</Badge>}
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className={`mb-1 rounded-lg gap-2 ${filterType === 'FOOD' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 text-amber-900 dark:text-amber-400 font-medium' : ''}`} 
                        onClick={() => setFilterType('FOOD')}
                      >
                        <Pizza className="w-4 h-4 text-amber-600" /> 
                        Food
                        {filterType === 'FOOD' && <Badge className="ml-auto bg-amber-200 text-amber-800 border-none dark:bg-amber-900/60 dark:text-amber-300">Selected</Badge>}
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className={`mb-1 rounded-lg gap-2 ${filterType === 'DRINK' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 text-blue-900 dark:text-blue-400 font-medium' : ''}`} 
                        onClick={() => setFilterType('DRINK')}
                      >
                        <Coffee className="w-4 h-4 text-blue-600" /> 
                        Drink
                        {filterType === 'DRINK' && <Badge className="ml-auto bg-blue-200 text-blue-800 border-none dark:bg-blue-900/60 dark:text-blue-300">Selected</Badge>}
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className={`mb-1 rounded-lg gap-2 ${filterType === 'OTHER' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 text-purple-900 dark:text-purple-400 font-medium' : ''}`} 
                        onClick={() => setFilterType('OTHER')}
                      >
                        <Package className="w-4 h-4 text-purple-600" /> 
                        Other
                        {filterType === 'OTHER' && <Badge className="ml-auto bg-purple-200 text-purple-800 border-none dark:bg-purple-900/60 dark:text-purple-300">Selected</Badge>}
                      </DropdownMenuItem>
                      
                      <DropdownMenuSeparator className="my-2" />
                      
                      <DropdownMenuLabel className="text-xs font-medium text-gray-500 dark:text-gray-400 px-2">Status</DropdownMenuLabel>
                      <DropdownMenuItem 
                        className={`mb-1 rounded-lg gap-2 ${filterActive === 'ALL' ? 'bg-primary/10 text-primary font-medium' : ''}`} 
                        onClick={() => setFilterActive('ALL')}
                      >
                        <Package className="w-4 h-4" />
                        All Status
                        {filterActive === 'ALL' && <Badge className="ml-auto bg-primary/20 text-primary border-none">Selected</Badge>}
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className={`mb-1 rounded-lg gap-2 ${filterActive === 'ACTIVE' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 text-green-900 dark:text-green-400 font-medium' : ''}`} 
                        onClick={() => setFilterActive('ACTIVE')}
                      >
                        <Eye className="w-4 h-4 text-green-600" /> 
                        Active
                        {filterActive === 'ACTIVE' && <Badge className="ml-auto bg-green-200 text-green-800 border-none dark:bg-green-900/60 dark:text-green-300">Selected</Badge>}
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className={`mb-1 rounded-lg gap-2 ${filterActive === 'INACTIVE' ? 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300 font-medium' : ''}`} 
                        onClick={() => setFilterActive('INACTIVE')}
                      >
                        <EyeOff className="w-4 h-4 text-gray-600" /> 
                        Inactive
                        {filterActive === 'INACTIVE' && <Badge className="ml-auto bg-gray-200 text-gray-800 border-none dark:bg-gray-800 dark:text-gray-300">Selected</Badge>}
                      </DropdownMenuItem>
                      
                      {(filterType !== 'ALL' || filterActive !== 'ALL') && (
                        <>
                          <DropdownMenuSeparator className="my-2" />
                          <DropdownMenuItem 
                            className="rounded-lg text-red-600 dark:text-red-400 font-medium"
                            onClick={() => {
                              setFilterType('ALL');
                              setFilterActive('ALL');
                            }}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                              <line x1="18" y1="6" x2="6" y2="18"></line>
                              <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                            Clear All Filters
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="flex items-center gap-2 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-primary/50">
                        <ArrowUpDown className="w-4 h-4" />
                        <span>Sort</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 border border-gray-100 dark:border-gray-700 shadow-lg rounded-xl p-2">
                      <DropdownMenuItem 
                        className={`mb-1 rounded-lg ${sortBy === 'name' && sortOrder === 'asc' ? 'bg-primary/10 text-primary font-medium' : ''}`}
                        onClick={() => handleSortChange('name-asc')}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                          <line x1="4" y1="9" x2="20" y2="9" />
                          <line x1="4" y1="15" x2="14" y2="15" />
                          <line x1="4" y1="21" x2="9" y2="21" />
                        </svg>
                        Name (A-Z)
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className={`mb-1 rounded-lg ${sortBy === 'name' && sortOrder === 'desc' ? 'bg-primary/10 text-primary font-medium' : ''}`}
                        onClick={() => handleSortChange('name-desc')}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                          <line x1="4" y1="9" x2="9" y2="9" />
                          <line x1="4" y1="15" x2="14" y2="15" />
                          <line x1="4" y1="21" x2="20" y2="21" />
                        </svg>
                        Name (Z-A)
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="my-1" />
                      <DropdownMenuItem 
                        className={`mb-1 rounded-lg ${sortBy === 'createdAt' && sortOrder === 'desc' ? 'bg-primary/10 text-primary font-medium' : ''}`}
                        onClick={() => handleSortChange('createdAt-desc')}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                          <circle cx="12" cy="12" r="10" />
                          <polyline points="12 6 12 12 16 14" />
                        </svg>
                        Newest First
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className={`mb-1 rounded-lg ${sortBy === 'createdAt' && sortOrder === 'asc' ? 'bg-primary/10 text-primary font-medium' : ''}`}
                        onClick={() => handleSortChange('createdAt-asc')}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                          <circle cx="12" cy="12" r="10" />
                          <polyline points="12 6 12 12 9 10" />
                        </svg>
                        Oldest First
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className={`mb-1 rounded-lg ${sortBy === 'updatedAt' && sortOrder === 'desc' ? 'bg-primary/10 text-primary font-medium' : ''}`}
                        onClick={() => handleSortChange('updatedAt-desc')}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                          <line x1="16" y1="2" x2="16" y2="6" />
                          <line x1="8" y1="2" x2="8" y2="6" />
                          <line x1="3" y1="10" x2="21" y2="10" />
                          <path d="M8 14h.01" />
                          <path d="M12 14h.01" />
                          <path d="M16 14h.01" />
                          <path d="M8 18h.01" />
                          <path d="M12 18h.01" />
                          <path d="M16 18h.01" />
                        </svg>
                        Recently Updated
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="flex items-center gap-2 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-primary/50">
                        {viewMode === "grid" ? <Grid className="w-4 h-4" /> : <List className="w-4 h-4" />}
                        <span>View</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="border border-gray-100 dark:border-gray-700 shadow-lg rounded-xl p-2">
                      <DropdownMenuItem 
                        className={`mb-1 rounded-lg gap-2 ${viewMode === 'grid' ? 'bg-primary/10 text-primary font-medium' : ''}`}
                        onClick={() => setViewMode("grid")}
                      >
                        <Grid className="w-4 h-4" /> Grid View
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className={`mb-1 rounded-lg gap-2 ${viewMode === 'list' ? 'bg-primary/10 text-primary font-medium' : ''}`}
                        onClick={() => setViewMode("list")}
                      >
                        <List className="w-4 h-4" /> List View
                      </DropdownMenuItem>
                      
                      <DropdownMenuSeparator className="my-1" />
                      
                      <DropdownMenuLabel className="text-xs font-medium text-gray-500 dark:text-gray-400 px-2">Items per page</DropdownMenuLabel>
                      {[8, 12, 24, 48].map(size => (
                        <DropdownMenuItem 
                          key={size}
                          className={`rounded-lg ${itemsPerPage === size ? 'bg-primary/10 text-primary font-medium' : ''}`}
                          onClick={() => handlePageSizeChange(size.toString())}
                        >
                          {size} items
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              
              <div className="flex flex-wrap items-center gap-2 mt-3 md:mt-0">
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
                    <Button className="whitespace-nowrap gap-2 shadow-md hover:shadow-lg bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary transition-all duration-300">
                      <Plus className="w-4 h-4" />
                      <span>Add Category</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden max-h-[85vh] w-[95vw] sm:w-auto">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-primary/20 to-primary/5 dark:from-primary/10 dark:to-transparent p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                      <DialogTitle>Add New Category</DialogTitle>
                      <DialogClose className="rounded-full opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
                        <X className="h-4 w-4" />
                        <span className="sr-only">Close</span>
                      </DialogClose>
                    </div>
                    
                    {/* Content */}
                    <div className="px-4 py-5 sm:p-6 overflow-y-auto max-h-[calc(85vh-142px)]">
                      <div className="space-y-6">
                        {/* Image Upload */}
                        <div className="border border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-4 text-center">
                          {newCategory.imageBase64 ? (
                            <div className="relative w-40 h-40 mx-auto overflow-hidden rounded-lg group">
                              <Image 
                                src={newCategory.imageBase64} 
                                alt="Preview" 
                                fill 
                                className="object-cover transition-all duration-300 group-hover:scale-105" 
                              />
                              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <Label 
                                  htmlFor="image-upload" 
                                  className="px-3 py-2 bg-white/90 dark:bg-gray-800/90 rounded-md text-xs shadow cursor-pointer"
                                >
                                  Change Image
                                </Label>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center py-5">
                              <div className="h-20 w-20 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                                <Package className="w-10 h-10 text-gray-400" />
                              </div>
                              <Label 
                                htmlFor="image-upload" 
                                className="px-4 py-2 bg-primary/10 dark:bg-primary/20 text-primary rounded-md cursor-pointer hover:bg-primary/20 dark:hover:bg-primary/30 transition-colors"
                              >
                                Upload Image
                              </Label>
                              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Recommended: Square image</p>
                            </div>
                          )}
                          <Input
                            id="image-upload"
                            type="file"
                            accept="image/*"
                            onChange={handleImageChange}
                            className="hidden"
                          />
                        </div>

                        {/* Basic Info */}
                        <div className="grid grid-cols-1 gap-5">
                          <div>
                            <Label htmlFor="name" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              Category Name
                            </Label>
                            <Input
                              id="name"
                              value={newCategory.name}
                              onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                              className="mt-1.5 bg-white dark:bg-gray-800"
                              placeholder="Enter category name"
                            />
                          </div>
                          
                          <div>
                            <Label htmlFor="description" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              Description
                            </Label>
                            <Textarea
                              id="description"
                              value={newCategory.description}
                              onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                              className="mt-1.5 bg-white dark:bg-gray-800 resize-none h-24"
                              placeholder="Enter category description"
                            />
                          </div>
                        </div>
                        
                        {/* Category Type */}
                        <div>
                          <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                            Category Type
                          </Label>
                          <div className="grid grid-cols-3 gap-3">
                            <div
                              className={`border rounded-lg p-4 cursor-pointer transition-all ${
                                newCategory.type === 'FOOD'
                                  ? 'border-amber-200 bg-amber-50/50 dark:bg-amber-900/20 dark:border-amber-800/50'
                                  : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                              }`}
                              onClick={() => setNewCategory({ ...newCategory, type: 'FOOD' })}
                            >
                              <div className="flex flex-col items-center text-center">
                                <Pizza className={`h-8 w-8 mb-2 ${
                                  newCategory.type === 'FOOD' ? 'text-amber-600 dark:text-amber-500' : 'text-gray-400'
                                }`} />
                                <span className={`text-sm font-medium ${
                                  newCategory.type === 'FOOD' ? 'text-amber-800 dark:text-amber-400' : 'text-gray-700 dark:text-gray-300'
                                }`}>Food</span>
                              </div>
                            </div>
                            
                            <div
                              className={`border rounded-lg p-4 cursor-pointer transition-all ${
                                newCategory.type === 'DRINK'
                                  ? 'border-blue-200 bg-blue-50/50 dark:bg-blue-900/20 dark:border-blue-800/50'
                                  : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                              }`}
                              onClick={() => setNewCategory({ ...newCategory, type: 'DRINK' })}
                            >
                              <div className="flex flex-col items-center text-center">
                                <Coffee className={`h-8 w-8 mb-2 ${
                                  newCategory.type === 'DRINK' ? 'text-blue-600 dark:text-blue-500' : 'text-gray-400'
                                }`} />
                                <span className={`text-sm font-medium ${
                                  newCategory.type === 'DRINK' ? 'text-blue-800 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'
                                }`}>Drink</span>
                              </div>
                            </div>
                            
                            <div
                              className={`border rounded-lg p-4 cursor-pointer transition-all ${
                                newCategory.type === 'OTHER'
                                  ? 'border-purple-200 bg-purple-50/50 dark:bg-purple-900/20 dark:border-purple-800/50'
                                  : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                              }`}
                              onClick={() => setNewCategory({ ...newCategory, type: 'OTHER' })}
                            >
                              <div className="flex flex-col items-center text-center">
                                <Package className={`h-8 w-8 mb-2 ${
                                  newCategory.type === 'OTHER' ? 'text-purple-600 dark:text-purple-500' : 'text-gray-400'
                                }`} />
                                <span className={`text-sm font-medium ${
                                  newCategory.type === 'OTHER' ? 'text-purple-800 dark:text-purple-400' : 'text-gray-700 dark:text-gray-300'
                                }`}>Other</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Category Status */}
                        <div className="flex justify-between items-center border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800/70">
                          <div>
                            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Category Status</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {newCategory.isActive ? 'Category will be visible to customers' : 'Category will be hidden from customers'}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={`text-sm ${newCategory.isActive ? 'text-green-600 dark:text-green-400' : 'text-gray-500'}`}>
                              {newCategory.isActive ? 'Active' : 'Inactive'}
                            </span>
                            <Switch
                              id="isActive"
                              checked={newCategory.isActive}
                              onCheckedChange={(checked) => setNewCategory({ ...newCategory, isActive: checked })}
                              className="data-[state=checked]:bg-green-600"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Footer */}
                    <DialogFooter className="p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsAddDialogOpen(false);
                          setNewCategory({
                            name: "",
                            description: "",
                            type: "FOOD",
                            imageBase64: "",
                            isActive: true,
                          });
                        }}
                        className="mr-2"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleAddCategory}
                        className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary"
                      >
                        Create Category
                      </Button>
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
            <Card key={index} className="flex flex-col justify-between h-full group backdrop-blur-sm overflow-hidden border border-gray-200 dark:border-gray-800">
              <CardHeader className="pb-2">
                <div className="flex justify-between">
                  <Skeleton className="h-6 w-32 bg-gray-200 dark:bg-gray-700" />
                  <Skeleton className="h-6 w-16 bg-gray-200 dark:bg-gray-700" />
                </div>
              </CardHeader>
              <CardContent className="pb-2">
                <Skeleton className="h-40 w-full mb-2 rounded-md bg-gray-200 dark:bg-gray-700" />
                <Skeleton className="h-4 w-full mb-2 bg-gray-200 dark:bg-gray-700" />
                <Skeleton className="h-4 w-2/3 mb-2 bg-gray-200 dark:bg-gray-700" />
                <div className="flex justify-between mt-2">
                  <Skeleton className="h-6 w-16 bg-gray-200 dark:bg-gray-700" />
                  <Skeleton className="h-4 w-20 bg-gray-200 dark:bg-gray-700" />
                </div>
              </CardContent>
              <CardFooter className="flex justify-between pt-2">
                <Skeleton className="h-9 w-20 bg-gray-200 dark:bg-gray-700" />
                <Skeleton className="h-9 w-20 bg-gray-200 dark:bg-gray-700" />
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : filteredCategories.length > 0 ? (
        <>
          {viewMode === "grid" ? renderGridView() : renderListView()}
          
          <motion.div
            className="mt-6 md:mt-8 flex flex-col sm:flex-row justify-between items-center space-y-3 sm:space-y-0"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <div className="text-sm text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 px-4 py-2 rounded-md shadow-sm border border-gray-100 dark:border-gray-700">
              Showing <span className="font-medium text-primary">{(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, totalItems)}</span> of <span className="font-medium text-primary">{totalItems}</span> categories
            </div>
            
            <div className="flex items-center space-x-2 bg-white dark:bg-gray-800 px-3 py-1.5 rounded-md shadow-sm border border-gray-100 dark:border-gray-700">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="w-3 h-3 mr-[-3px]" />
                <ChevronLeft className="w-3 h-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
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
                      variant={currentPage === pageNum ? "default" : "ghost"}
                      size="icon"
                      className={`w-8 h-8 rounded-full text-sm ${
                        currentPage === pageNum 
                          ? "shadow-sm" 
                          : "hover:bg-gray-100 dark:hover:bg-gray-700"
                      }`}
                      onClick={() => setCurrentPage(pageNum)}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>
              
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                onClick={() => setCurrentPage((prev) => prev + 1)}
                disabled={currentPage >= Math.ceil(totalItems / itemsPerPage)}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                onClick={() => setCurrentPage(Math.ceil(totalItems / itemsPerPage))}
                disabled={currentPage >= Math.ceil(totalItems / itemsPerPage)}
              >
                <ChevronRight className="w-3 h-3" />
                <ChevronRight className="w-3 h-3 ml-[-3px]" />
              </Button>
            </div>
          </motion.div>
        </>
      ) : (
        <motion.div 
          className="py-16 flex flex-col items-center justify-center text-center space-y-6"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <motion.div 
            className="p-6 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 shadow-md"
            whileHover={{ scale: 1.05, rotate: 5 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <Package className="w-16 h-16 text-gray-400 dark:text-gray-500" />
          </motion.div>
          <h3 className="text-2xl font-bold bg-gradient-to-r from-gray-700 to-gray-500 dark:from-gray-200 dark:to-gray-400 bg-clip-text text-transparent">No categories found</h3>
          <p className="text-gray-500 dark:text-gray-400 max-w-md">
            {searchTerm || filterType !== 'ALL' || filterActive !== 'ALL'
              ? "Try adjusting your search or filter to find what you're looking for."
              : "Get started by adding a new category to your menu."}
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 mt-4">
            {(searchTerm || filterType !== 'ALL' || filterActive !== 'ALL') && (
              <Button variant="outline" onClick={() => {
                setSearchTerm('');
                setFilterType('ALL');
                setFilterActive('ALL');
              }}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Clear Filters
              </Button>
            )}
            
            <Button 
              onClick={() => setIsAddDialogOpen(true)}
              className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-md hover:shadow-lg transition-all duration-300"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add First Category
            </Button>
          </div>
          
          <motion.div 
            className="w-full max-w-md h-[1px] bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-700 to-transparent my-8"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.3, duration: 0.7 }}
          />
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full max-w-2xl">
            <div className="flex flex-col items-center p-6 rounded-lg bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700">
              <Pizza className="w-8 h-8 text-amber-500 mb-2" />
              <h4 className="font-medium text-gray-900 dark:text-gray-100">Food Categories</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center mt-1">Organize your food menu with categories</p>
            </div>
            
            <div className="flex flex-col items-center p-6 rounded-lg bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700">
              <Coffee className="w-8 h-8 text-blue-500 mb-2" />
              <h4 className="font-medium text-gray-900 dark:text-gray-100">Drink Categories</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center mt-1">Group your beverages by type</p>
            </div>
            
            <div className="flex flex-col items-center p-6 rounded-lg bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700">
              <Package className="w-8 h-8 text-purple-500 mb-2" />
              <h4 className="font-medium text-gray-900 dark:text-gray-100">Other Items</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center mt-1">Create categories for merchandise and more</p>
            </div>
          </div>
        </motion.div>
      )}
      
      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden">
          <div className="flex flex-col md:flex-row">
            <div className="md:w-2/5 relative bg-gradient-to-br from-primary/10 to-transparent dark:from-primary/5">
              {currentCategory && (
                <div className="absolute inset-0 p-6 flex flex-col justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-primary">Edit Category</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Update category details</p>
                  </div>
                  
                  {currentCategory.imageBase64 || currentCategory.imageUrl ? (
                    <div className="relative w-full aspect-square rounded-lg overflow-hidden shadow-lg border-2 border-white dark:border-gray-800 mt-4">
                      <Image
                        src={currentCategory.imageBase64 || currentCategory.imageUrl}
                        alt={currentCategory.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center justify-center w-full aspect-square bg-gray-100 dark:bg-gray-800 rounded-lg mt-4">
                      <Package className="w-16 h-16 text-gray-300 dark:text-gray-600" />
                    </div>
                  )}
                  
                  <div className="space-y-2 mt-4">
                    <Badge className={`${typeColors[currentCategory?.type || "FOOD"]} shadow-sm`}>
                      {React.createElement(typeIcons[currentCategory?.type || "FOOD"], { className: "w-3.5 h-3.5 mr-1.5" })}
                      {currentCategory?.type}
                    </Badge>
                    <Badge 
                      variant={currentCategory?.isActive ? "default" : "outline"}
                      className={currentCategory?.isActive ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 shadow-sm" : "shadow-sm"}
                    >
                      {currentCategory?.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
              )}
            </div>
            
            <div className="md:w-3/5 p-6">
              <DialogHeader className="mb-4">
                <DialogTitle>Edit Category</DialogTitle>
              </DialogHeader>
              
              {currentCategory && (
                <div className="space-y-5 max-h-[60vh] overflow-y-auto pr-1 fancy-scrollbar">
                  <div>
                    <Label htmlFor="edit-name" className="text-gray-700 dark:text-gray-300">Name</Label>
                    <Input
                      id="edit-name"
                      value={currentCategory.name}
                      onChange={(e) => setCurrentCategory({ ...currentCategory, name: e.target.value })}
                      className="mt-1.5"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="edit-description" className="text-gray-700 dark:text-gray-300">Description</Label>
                    <Textarea
                      id="edit-description"
                      value={currentCategory.description}
                      onChange={(e) => setCurrentCategory({ ...currentCategory, description: e.target.value })}
                      className="min-h-24 mt-1.5"
                    />
                  </div>
                  
                  <div>
                    <Label className="text-gray-700 dark:text-gray-300">Type</Label>
                    <RadioGroup
                      value={currentCategory.type}
                      onValueChange={(value) =>
                        setCurrentCategory({ ...currentCategory, type: value as "FOOD" | "DRINK" | "OTHER" })
                      }
                      className="flex flex-col space-y-2 mt-2"
                    >
                      <div className="flex items-center space-x-2 p-2 rounded-md bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30">
                        <RadioGroupItem value="FOOD" id="edit-food" className="text-amber-600" />
                        <Label htmlFor="edit-food" className="flex items-center cursor-pointer">
                          <Pizza className="w-4 h-4 mr-2 text-amber-600" />
                          <span>Food</span>
                          <Badge className={`${typeColors.FOOD} ml-2 shadow-sm`}>FOOD</Badge>
                        </Label>
                      </div>
                      
                      <div className="flex items-center space-x-2 p-2 rounded-md bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30">
                        <RadioGroupItem value="DRINK" id="edit-drink" className="text-blue-600" />
                        <Label htmlFor="edit-drink" className="flex items-center cursor-pointer">
                          <Coffee className="w-4 h-4 mr-2 text-blue-600" />
                          <span>Drink</span>
                          <Badge className={`${typeColors.DRINK} ml-2 shadow-sm`}>DRINK</Badge>
                        </Label>
                      </div>
                      
                      <div className="flex items-center space-x-2 p-2 rounded-md bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/30">
                        <RadioGroupItem value="OTHER" id="edit-other" className="text-purple-600" />
                        <Label htmlFor="edit-other" className="flex items-center cursor-pointer">
                          <Package className="w-4 h-4 mr-2 text-purple-600" />
                          <span>Other</span>
                          <Badge className={`${typeColors.OTHER} ml-2 shadow-sm`}>OTHER</Badge>
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                  
                  <div>
                    <Label htmlFor="edit-image" className="text-gray-700 dark:text-gray-300">Image</Label>
                    <div className="mt-2">
                      <Input 
                        id="edit-image" 
                        type="file" 
                        accept="image/*" 
                        onChange={handleImageChange}
                        className="bg-white dark:bg-gray-800"
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 rounded-md bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700">
                    <Label htmlFor="edit-isActive" className="flex items-center cursor-pointer">
                      {currentCategory.isActive ? (
                        <>
                          <Eye className="w-4 h-4 mr-2 text-green-600 dark:text-green-500" /> 
                          <span>Active Status</span>
                        </>
                      ) : (
                        <>
                          <EyeOff className="w-4 h-4 mr-2 text-gray-600 dark:text-gray-400" /> 
                          <span>Inactive Status</span>
                        </>
                      )}
                    </Label>
                    <Switch
                      id="edit-isActive"
                      checked={currentCategory.isActive}
                      onCheckedChange={(checked) => setCurrentCategory({ ...currentCategory, isActive: checked })}
                      className="data-[state=checked]:bg-green-600"
                    />
                  </div>
                </div>
              )}
              
              <DialogFooter className="mt-6 gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setIsEditDialogOpen(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleEditCategory}
                  className="flex-1 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary"
                >
                  Update Category
                </Button>
              </DialogFooter>
            </div>
          </div>
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
