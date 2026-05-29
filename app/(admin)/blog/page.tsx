"use client"

import React, { useState, useMemo } from "react"
import { QueryClient, QueryClientProvider, useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useDebounce } from "use-debounce"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Toaster, toast } from "react-hot-toast"
import { format, isValid } from "date-fns"
import {
  Edit,
  Trash2,
  Search,
  Plus,
  Calendar,
  Tag,
  Eye,
  Play,
  EyeOff,
  Loader2,
  RefreshCw,
  Filter,
  AlertCircle,
  Image as ImageIcon,
  Video,
  Link,
  Upload,
  FileVideo,
  FileImage,
  X,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ExternalLink,
  Download,
  File,
  Maximize2,
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useDropzone } from "react-dropzone"

// Updated Types
type Blog = {
  _id: string
  title: string
  content: string
  category: "NEWS" | "EVENTS" | "COURSE" | "PROMOTION" | "OTHER"
  tags: string[]
  publishedAt: string
  isActive: boolean
  Image: string
  Video: string
  mediaType: "image" | "video" | "none"
  
  // Cloudinary upload fields
  uploadStatus?: "pending" | "uploading" | "processing" | "completed" | "failed"
  uploadProgress?: number
  fileUrl?: string
  thumbnailUrl?: string
  publicId?: string
  format?: string
  fileSize?: number
  originalFileName?: string
  mimeType?: string
  error?: string
  completedAt?: string
}

type BlogFormData = Omit<Blog, "_id"> & { 
  imageBase64?: string
  videoBase64?: string
  videoUrl?: string
  mediaSource: "image" | "video" | "none"
  videoSource: "upload" | "url" | "none"
  videoFile?: File | null
  imageFile?: File | null
}

const ITEMS_PER_PAGE = 9
const CATEGORIES = ["NEWS", "EVENTS", "COURSE", "PROMOTION", "OTHER"] as const
const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp"]
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/ogg", "video/mov", "video/avi"]
const MAX_IMAGE_SIZE = 5 * 1024 * 1024 // 5MB
const MAX_VIDEO_SIZE = 100 * 1024 * 1024 // 100MB (same as training)

// Format file size
const formatFileSize = (bytes?: number) => {
  if (!bytes) return "Unknown size"
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// Format date
const formatDateSafe = (dateString?: string): string => {
  if (!dateString) return "No date"
  
  try {
    const date = new Date(dateString)
    if (!isValid(date)) return "Invalid date"
    return format(date, "PPP")
  } catch {
    return "Invalid date"
  }
}

// Helper to extract embed URL from YouTube/Vimeo links
const getEmbedUrl = (url: string) => {
  if (!url) return null
  
  // YouTube
  const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i
  const youtubeMatch = url.match(youtubeRegex)
  if (youtubeMatch && youtubeMatch[1]) {
    return `https://www.youtube.com/embed/${youtubeMatch[1]}`
  }

  // Vimeo
  const vimeoRegex = /(?:vimeo\.com\/|player\.vimeo\.com\/video\/)([0-9]+)/i
  const vimeoMatch = url.match(vimeoRegex)
  if (vimeoMatch && vimeoMatch[1]) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}`
  }

  return null
}

// Fetch blogs with polling for upload progress
const fetchBlogs = async ({ pageParam = 0, searchTerm = "", category = "" }) => {
  const response = await fetch(`/api/blog?page=${pageParam}&search=${searchTerm}&category=${category}&includeUploads=true`)
  if (!response.ok) throw new Error("Network response was not ok")
  return response.json()
}

// Create blog with FormData for file uploads
const createBlog = async (formData: FormData) => {
  const response = await fetch("/api/blog", {
    method: "POST",
    body: formData,
  })
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: `Upload failed with status ${response.status}` }))
    throw new Error(error.error || error.message || "Failed to create blog")
  }
  return response.json()
}

// Update blog (for JSON data)
const updateBlog = async ({ id, data }: { id: string; data: BlogFormData }) => {
  const response = await fetch(`/api/blog/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: `Update failed with status ${response.status}` }))
    throw new Error(error.error || error.message || "Failed to update blog")
  }
  return response.json()
}

// Delete blog
const deleteBlog = async (id: string) => {
  const response = await fetch(`/api/blog/${id}`, { method: "DELETE" })
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: `Delete failed with status ${response.status}` }))
    throw new Error(error.error || error.message || "Failed to delete blog")
  }
  return response.json()
}

// Get status badge component
const getStatusBadge = (blog: Blog) => {
  if (!blog.uploadStatus) return null
  
  switch (blog.uploadStatus) {
    case "completed":
      return (
        <Badge variant="default" className="bg-green-600 hover:bg-green-600/80 flex items-center gap-1 text-xs">
          <CheckCircle2 className="w-3 h-3" /> Ready
        </Badge>
      )
    case "uploading":
    case "processing":
      return (
        <Badge variant="secondary" className="bg-yellow-500 text-secondary-foreground hover:bg-yellow-500/80 flex items-center gap-1 text-xs">
          <Loader2 className="w-3 h-3 animate-spin" /> {blog.uploadStatus === "uploading" ? "Uploading" : "Processing"}
        </Badge>
      )
    case "failed":
      return (
        <Badge variant="destructive" className="flex items-center gap-1 text-xs">
          <AlertTriangle className="w-3 h-3" /> Failed
          {blog.error && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <AlertCircle className="w-3 h-3 ml-1" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>{blog.error}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </Badge>
      )
    case "pending":
      return (
        <Badge variant="secondary" className="flex items-center gap-1 text-xs">
          <Clock className="w-3 h-3" /> Pending
        </Badge>
      )
    default:
      return null
  }
}

// Get icon by media type
const getMediaIcon = (mediaType: string) => {
  switch (mediaType) {
    case "video":
      return <FileVideo className="w-5 h-5" />
    case "image":
      return <FileImage className="w-5 h-5" />
    default:
      return <File className="w-5 h-5" />
  }
}

function BlogManagement() {
  const [searchTerm, setSearchTerm] = useState("")
  const [debouncedSearchTerm] = useDebounce(searchTerm, 300)
  const [selectedCategory, setSelectedCategory] = useState<string>("")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingBlog, setEditingBlog] = useState<Blog | null>(null)
  const [viewingBlog, setViewingBlog] = useState<Blog | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)

  const queryClient = useQueryClient()

  const { 
    data, 
    fetchNextPage, 
    hasNextPage, 
    isFetchingNextPage, 
    isLoading, 
    isError, 
    refetch,
    error 
  } = useInfiniteQuery({
    queryKey: ["blogs", debouncedSearchTerm, selectedCategory],
    queryFn: ({ pageParam = 0 }) =>
      fetchBlogs({ pageParam, searchTerm: debouncedSearchTerm, category: selectedCategory }),
    getNextPageParam: (lastPage, pages) => 
      lastPage?.data?.length === ITEMS_PER_PAGE ? pages.length : undefined,
    initialPageParam: 0,
    refetchInterval: (data) => {
      // Check if any uploads are in progress
      const hasUploading = data?.pages?.some(page => 
        page?.data?.some((blog: Blog) => 
          blog.uploadStatus === "uploading" || blog.uploadStatus === "processing"
        )
      )
      return hasUploading ? 5000 : false // Poll every 5 seconds if uploads in progress
    },
  })

  const createMutation = useMutation({
    mutationFn: createBlog,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blogs"] })
      toast.success("Blog created successfully")
      setIsCreateDialogOpen(false)
      setIsUploading(false)
      setUploadProgress(0)
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create blog")
      setIsUploading(false)
      setUploadProgress(0)
    },
  })

  const updateMutation = useMutation({
    mutationFn: updateBlog,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blogs"] })
      toast.success("Blog updated successfully")
      setEditingBlog(null)
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update blog")
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteBlog,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blogs"] })
      toast.success("Blog deleted successfully")
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete blog")
    },
  })

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value)
  }

  const handleCategoryChange = (value: string) => {
    setSelectedCategory(value === "all" ? "" : value)
  }

  const handleCreateBlog = async (formData: FormData) => {
    try {
      setIsUploading(true)
      setUploadProgress(10) // Start progress
      createMutation.mutate(formData)
    } catch (error) {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  const handleUpdateBlog = (data: BlogFormData) => {
    if (editingBlog) {
      updateMutation.mutate({ id: editingBlog._id, data })
    }
  }

  const handleDeleteBlog = (id: string) => {
    if (window.confirm("Are you sure you want to delete this blog?")) {
      deleteMutation.mutate(id)
    }
  }

  const BlogForm = ({ initialData, onSubmit }: { initialData?: Blog; onSubmit: (data: any) => void }) => {
    const [formData, setFormData] = useState<BlogFormData>({
      title: initialData?.title || "",
      content: initialData?.content || "",
      category: initialData?.category || "NEWS",
      tags: initialData?.tags || [],
      publishedAt: initialData?.publishedAt || new Date().toISOString(),
      isActive: initialData?.isActive ?? true,
      Image: initialData?.Image || "",
      Video: initialData?.Video || "",
      mediaType: initialData?.mediaType || "none",
      mediaSource: (initialData?.mediaType === "video" || initialData?.mediaType === "image") ? initialData.mediaType : "none",
      videoSource: initialData?.Video && !initialData.Video.startsWith("blob:") && !initialData.Video.startsWith("data:") ? "url" : "upload",
      videoUrl: initialData?.Video && !initialData.Video.startsWith("blob:") && !initialData.Video.startsWith("data:") ? initialData.Video : "",
      imageBase64: "",
      videoBase64: "",
      videoFile: null,
      imageFile: null,
    })
    const [imageError, setImageError] = useState<string | null>(null)
    const [videoError, setVideoError] = useState<string | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null)
    const [selectedVideoFile, setSelectedVideoFile] = useState<File | null>(null)
    const [videoUploadProgress, setVideoUploadProgress] = useState(0)

    // Dropzone for video
    const onDrop = React.useCallback((acceptedFiles: File[]) => {
      const file = acceptedFiles[0]
      if (!file) return
      handleVideoUploadFile(file)
    }, [])

    const { getRootProps, getInputProps: getVideoInputProps, isDragActive: isVideoDragActive } = useDropzone({
      onDrop,
      accept: {
        "video/*": [".mp4", ".webm", ".ogg", ".mov", ".avi"],
      },
      disabled: isSubmitting || isUploading,
      multiple: false,
    })

    // Dropzone for image
    const onImageDrop = React.useCallback((acceptedFiles: File[]) => {
      const file = acceptedFiles[0]
      if (!file) return
      handleImageUploadFile(file)
    }, [])

    const { getRootProps: getImageRootProps, getInputProps: getImageInputProps, isDragActive: isImageDragActive } = useDropzone({
      onDrop: onImageDrop,
      accept: {
        "image/*": [".png", ".jpg", ".jpeg", ".webp"],
      },
      disabled: isSubmitting || isUploading,
      multiple: false,
    })

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { name, value } = e.target
      setFormData((prev) => ({ ...prev, [name]: value }))
    }

    const handleCategoryChange = (value: string) => {
      setFormData((prev) => ({ ...prev, category: value as Blog["category"] }))
    }

    const handleTagChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const tags = e.target.value.split(",").map((tag) => tag.trim()).filter(tag => tag.length > 0)
      setFormData((prev) => ({ ...prev, tags }))
    }

    const handleImageUploadFile = (file: File) => {
      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        setImageError("Invalid file type. Please upload a PNG, JPG, JPEG, or WebP image.")
        return
      }
      if (file.size > MAX_IMAGE_SIZE) {
        setImageError(`File size too large. Maximum size is ${MAX_IMAGE_SIZE / 1024 / 1024}MB.`)
        return
      }
      setImageError(null)
      setSelectedImageFile(file)
      setFormData((prev) => ({ 
        ...prev, 
        mediaSource: "image",
        imageFile: file,
        imageBase64: "",
        Video: "",
        videoUrl: "",
        videoBase64: "",
        videoSource: "none",
        videoFile: null,
      }))
      
      const reader = new FileReader()
      reader.onloadend = () => {
        setFormData((prev) => ({ 
          ...prev, 
          imageBase64: reader.result as string,
          Image: reader.result as string
        }))
      }
      reader.readAsDataURL(file)
    }

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        handleImageUploadFile(file)
      }
    }

    const handleVideoUploadFile = (file: File) => {
      if (!ALLOWED_VIDEO_TYPES.includes(file.type)) {
        setVideoError("Invalid file type. Please upload an MP4, WebM, OGG, MOV, or AVI video.")
        return
      }
      if (file.size > MAX_VIDEO_SIZE) {
        setVideoError(`File size too large. Maximum size is ${MAX_VIDEO_SIZE / 1024 / 1024}MB.`)
        return
      }
      setVideoError(null)
      setSelectedVideoFile(file)
      setFormData((prev) => ({ 
        ...prev, 
        mediaSource: "video",
        videoSource: "upload",
        videoFile: file,
        Video: "",
        videoUrl: "",
        Image: "",
        imageBase64: "",
        imageFile: null,
      }))
      
      const reader = new FileReader()
      reader.onloadend = () => {
        setFormData((prev) => ({ 
          ...prev, 
          videoBase64: reader.result as string,
          Video: reader.result as string
        }))
      }
      reader.readAsDataURL(file)
    }

    const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        handleVideoUploadFile(file)
      }
    }

    const handleVideoUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const url = e.target.value
      setFormData((prev) => ({ 
        ...prev, 
        mediaSource: "video",
        videoSource: "url",
        videoUrl: url,
        Video: url,
        Image: "",
        imageBase64: "",
        imageFile: null,
        videoFile: null,
      }))
    }

    const handleMediaSourceChange = (value: string) => {
      if (value === "none") {
        setFormData((prev) => ({ 
          ...prev, 
          mediaSource: "none",
          Image: "",
          Video: "",
          imageBase64: "",
          videoBase64: "",
          videoUrl: "",
          imageFile: null,
          videoFile: null,
        }))
        setSelectedImageFile(null)
        setSelectedVideoFile(null)
      } else {
        setFormData((prev) => ({ ...prev, mediaSource: value as "image" | "video" }))
      }
    }

    const handleVideoSourceChange = (value: string) => {
      setFormData((prev) => ({ 
        ...prev, 
        videoSource: value as "upload" | "url",
        videoBase64: "",
        videoUrl: "",
        videoFile: null,
      }))
      setSelectedVideoFile(null)
    }

    const validateForm = () => {
      // Basic validation
      if (!formData.title.trim()) {
        toast.error("Title is required")
        return false
      }
      
      if (formData.title.length < 3) {
        toast.error("Title must be at least 3 characters")
        return false
      }
      
      if (!formData.content.trim()) {
        toast.error("Content is required")
        return false
      }
      
      if (formData.content.length < 10) {
        toast.error("Content must be at least 10 characters")
        return false
      }
      
      // Media validation
      if (formData.mediaSource === "video" && formData.videoSource === "url" && formData.videoUrl) {
        if (!formData.videoUrl.startsWith('http')) {
          toast.error("Please enter a valid URL starting with http(s)://")
          return false
        }
      }
      
      if (formData.mediaSource === "image" && selectedImageFile && selectedImageFile.size > MAX_IMAGE_SIZE) {
        toast.error(`Image size must be less than ${formatFileSize(MAX_IMAGE_SIZE)}`)
        return false
      }
      
      if (formData.mediaSource === "video" && formData.videoSource === "upload" && selectedVideoFile && selectedVideoFile.size > MAX_VIDEO_SIZE) {
        toast.error(`Video size must be less than ${formatFileSize(MAX_VIDEO_SIZE)}`)
        return false
      }

      return true
    }

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault()
      
      if (!validateForm()) {
        return
      }

      setIsSubmitting(true)
      setVideoUploadProgress(0)
      
      try {
        if (initialData) {
          // For updates, use JSON (no file upload)
          const submitData = {
            ...formData,
            mediaType: formData.mediaSource === "none" ? "none" : formData.mediaSource
          }
          await onSubmit(submitData)
        } else {
          // For create, use FormData
          const data = new FormData()
          data.append("title", formData.title)
          data.append("content", formData.content)
          data.append("category", formData.category)
          data.append("tags", formData.tags.join(","))
          data.append("publishedAt", formData.publishedAt)
          data.append("isActive", String(formData.isActive))
          data.append("mediaSource", formData.mediaSource)
          data.append("videoSource", formData.videoSource || "none")
          
          if (formData.videoUrl) data.append("videoUrl", formData.videoUrl)
          
          if (formData.mediaSource === "image" && selectedImageFile) {
            data.append("imageFile", selectedImageFile)
          }
          
          if (formData.mediaSource === "video" && formData.videoSource === "upload" && selectedVideoFile) {
            data.append("videoFile", selectedVideoFile)
          }
          
          // Simulate upload progress
          const progressInterval = setInterval(() => {
            setVideoUploadProgress(prev => {
              if (prev >= 90) {
                clearInterval(progressInterval)
                return 90
              }
              return prev + 10
            })
          }, 500)

          await onSubmit(data)
          
          clearInterval(progressInterval)
          setVideoUploadProgress(100)
        }
      } catch (error) {
        setVideoUploadProgress(0)
        throw error
      } finally {
        setIsSubmitting(false)
      }
    }

    const clearImage = () => {
      setFormData((prev) => ({ 
        ...prev, 
        Image: "", 
        imageBase64: "",
        mediaSource: prev.mediaSource === "image" ? "none" : prev.mediaSource,
        imageFile: null,
      }))
      setSelectedImageFile(null)
    }

    const clearVideo = () => {
      setFormData((prev) => ({ 
        ...prev, 
        Video: "", 
        videoBase64: "", 
        videoUrl: "",
        videoSource: "none",
        mediaSource: prev.mediaSource === "video" ? "none" : prev.mediaSource,
        videoFile: null,
      }))
      setSelectedVideoFile(null)
    }

    const isUploadingVideo = isSubmitting && formData.mediaSource === "video" && formData.videoSource === "upload"

    return (
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input 
              id="title" 
              name="title" 
              value={formData.title} 
              onChange={handleChange} 
              placeholder="Enter blog title" 
              required 
              disabled={isSubmitting || isUploading}
              className={formData.title.length > 0 && formData.title.length < 3 ? "border-destructive" : ""}
            />
            {formData.title.length > 0 && formData.title.length < 3 && (
              <p className="text-xs text-destructive">Title must be at least 3 characters</p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="content">Content *</Label>
            <Textarea
              id="content"
              name="content"
              value={formData.content}
              onChange={handleChange}
              placeholder="Write your blog content here..."
              required
              className={`min-h-[200px] ${formData.content.length > 0 && formData.content.length < 10 ? "border-destructive" : ""}`}
              disabled={isSubmitting || isUploading}
            />
            {formData.content.length > 0 && formData.content.length < 10 && (
              <p className="text-xs text-destructive">Content must be at least 10 characters</p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="category">Category *</Label>
            <Select value={formData.category} onValueChange={handleCategoryChange} disabled={isSubmitting || isUploading}>
              <SelectTrigger id="category">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="tags">Tags</Label>
            <Input
              id="tags"
              name="tags"
              value={formData.tags.join(", ")}
              onChange={handleTagChange}
              placeholder="e.g., technology, programming, web development"
              disabled={isSubmitting || isUploading}
            />
            <p className="text-xs text-muted-foreground">Separate tags with commas</p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="publishedAt">Publish Date *</Label>
            <Input
              id="publishedAt"
              name="publishedAt"
              type="datetime-local"
              value={formData.publishedAt.slice(0, 16)}
              onChange={handleChange}
              required
              disabled={isSubmitting || isUploading}
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox
              id="isActive"
              checked={formData.isActive}
              onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, isActive: checked as boolean }))}
              disabled={isSubmitting || isUploading}
            />
            <Label htmlFor="isActive" className="cursor-pointer">Published & Active</Label>
          </div>
        </div>

        {/* Media Selection Section */}
        <div className="space-y-4 border-t pt-6">
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Media Selection</h3>
            <p className="text-sm text-muted-foreground">
              Select a media type (image or video). You can upload to Cloudinary or provide a URL.
            </p>
            
            <RadioGroup 
              value={formData.mediaSource} 
              onValueChange={handleMediaSourceChange}
              className="space-y-3"
              disabled={isSubmitting || isUploading}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="image" id="media-image" />
                <Label htmlFor="media-image" className="cursor-pointer flex items-center">
                  <ImageIcon className="h-4 w-4 mr-2" />
                  Image Upload
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="video" id="media-video" />
                <Label htmlFor="media-video" className="cursor-pointer flex items-center">
                  <Video className="h-4 w-4 mr-2" />
                  Video
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="none" id="media-none" />
                <Label htmlFor="media-none" className="cursor-pointer flex items-center">
                  No Media
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Image Upload Section */}
          {formData.mediaSource === "image" && (
            <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
              <div className="flex items-center justify-between">
                <Label htmlFor="image" className="text-base font-medium">Featured Image</Label>
                {formData.Image && (
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm" 
                    onClick={clearImage} 
                    disabled={isSubmitting || isUploading}
                  >
                    Remove Image
                  </Button>
                )}
              </div>
              
              {!formData.Image ? (
                <div
                  {...getImageRootProps()}
                  className={`
                    border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
                    transition-colors duration-200 min-h-[150px] flex flex-col items-center justify-center
                    ${isImageDragActive ? "border-primary bg-primary/5" : "border-border"}
                    ${isSubmitting || isUploading ? "opacity-50 cursor-not-allowed" : "hover:border-primary/50"}
                  `}
                >
                  <input {...getImageInputProps()} />
                  <FileImage className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    {isImageDragActive ? "Drop the image here" : "Drag and drop your image here or click to browse"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Supported formats: PNG, JPG, JPEG, WebP
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Max file size: {formatFileSize(MAX_IMAGE_SIZE)}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileImage className="w-5 h-5 text-primary" />
                      <p className="font-medium">{selectedImageFile?.name || "Image"}</p>
                    </div>
                    <Badge variant="outline" className="ml-2">
                      {formatFileSize(selectedImageFile?.size)}
                    </Badge>
                  </div>
                  <div className="w-full max-w-sm h-48 border rounded-lg overflow-hidden">
                    <img 
                      src={formData.Image} 
                      alt="Preview" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              )}
              
              {imageError && (
                <Alert variant="destructive" className="mt-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{imageError}</AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Video Upload Section */}
          {formData.mediaSource === "video" && (
            <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium">Video Content</Label>
                {formData.Video && (
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm" 
                    onClick={clearVideo} 
                    disabled={isSubmitting || isUploading}
                  >
                    Remove Video
                  </Button>
                )}
              </div>
              
              <Tabs defaultValue={formData.videoSource} onValueChange={handleVideoSourceChange}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="upload" className="flex items-center" disabled={isSubmitting || isUploading}>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Video
                  </TabsTrigger>
                  <TabsTrigger value="url" className="flex items-center" disabled={isSubmitting || isUploading}>
                    <Link className="h-4 w-4 mr-2" />
                    Video URL
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="upload" className="space-y-3 pt-3">
                  {!selectedVideoFile ? (
                    <div
                      {...getRootProps()}
                      className={`
                        border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
                        transition-colors duration-200 min-h-[150px] flex flex-col items-center justify-center
                        ${isVideoDragActive ? "border-primary bg-primary/5" : "border-border"}
                        ${isSubmitting || isUploading ? "opacity-50 cursor-not-allowed" : "hover:border-primary/50"}
                      `}
                    >
                      <input {...getVideoInputProps()} />
                      <FileVideo className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        {isVideoDragActive ? "Drop the video here" : "Drag and drop your video here or click to browse"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Supported formats: MP4, WebM, OGG, MOV, AVI
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Max file size: {formatFileSize(MAX_VIDEO_SIZE)}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileVideo className="w-5 h-5 text-primary" />
                          <p className="font-medium">{selectedVideoFile.name}</p>
                        </div>
                        <Badge variant="outline" className="ml-2">
                          {formatFileSize(selectedVideoFile.size)}
                        </Badge>
                      </div>
                      
                      <div className="mt-3">
                        {isUploadingVideo && videoUploadProgress > 0 ? (
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Uploading to Cloudinary...</span>
                              <span className="font-medium">{videoUploadProgress}%</span>
                            </div>
                            <Progress value={videoUploadProgress} className="w-full" />
                          </div>
                        ) : (
                          <div className="w-full max-w-sm">
                            <video 
                              src={formData.Video} 
                              controls 
                              className="w-full h-auto rounded border"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="url" className="space-y-3 pt-3">
                  <div className="space-y-2">
                    <Label htmlFor="videoUrl">Video URL</Label>
                    <Input
                      id="videoUrl"
                      name="videoUrl"
                      value={formData.videoUrl}
                      onChange={handleVideoUrlChange}
                      placeholder="https://example.com/video.mp4 or YouTube/Vimeo embed URL"
                      disabled={isSubmitting || isUploading}
                      className={`w-full ${formData.videoUrl && !formData.videoUrl.startsWith('http') ? "border-destructive" : ""}`}
                    />
                    {formData.videoUrl && !formData.videoUrl.startsWith('http') && (
                      <p className="text-xs text-destructive">Please enter a valid URL starting with http(s)://</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Enter direct video URL or embed URL from YouTube, Vimeo, etc.
                    </p>
                  </div>
                </TabsContent>
              </Tabs>
              
              {videoError && (
                <Alert variant="destructive" className="mt-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{videoError}</AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </div>

        <Button 
          type="submit" 
          disabled={
            isSubmitting || 
            isUploading || 
            createMutation.isPending || 
            updateMutation.isPending ||
            !formData.title.trim() ||
            !formData.content.trim() ||
            formData.title.length < 3 ||
            formData.content.length < 10 ||
            (formData.mediaSource === "video" && 
             formData.videoSource === "url" && 
             formData.videoUrl && 
             !formData.videoUrl.startsWith('http')) ||
            (formData.mediaSource === "image" && 
             selectedImageFile && 
             selectedImageFile.size > MAX_IMAGE_SIZE) ||
            (formData.mediaSource === "video" && 
             formData.videoSource === "upload" && 
             selectedVideoFile && 
             selectedVideoFile.size > MAX_VIDEO_SIZE)
          }
          className="w-full"
        >
          {(isSubmitting || isUploading || createMutation.isPending || updateMutation.isPending) ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {isUploadingVideo ? "Uploading to Cloudinary..." : initialData ? "Updating..." : "Creating..."}
            </>
          ) : (
            initialData ? "Update Blog" : "Create Blog"
          )}
        </Button>
      </form>
    )
  }

  const BlogCard = ({ blog }: { blog: Blog }) => {
    const truncatedContent = useMemo(() => {
      const plainText = blog.content.replace(/<[^>]*>/g, "")
      if (plainText.length <= 100) return plainText
      return plainText.substring(0, 100) + "..."
    }, [blog.content])

    const safeDate = useMemo(() => {
      return formatDateSafe(blog.publishedAt)
    }, [blog.publishedAt])

    const getVideoSource = () => {
      // Try fileUrl first (Cloudinary), then Video, then thumbnailUrl
      return blog.fileUrl || blog.Video || blog.thumbnailUrl || "";
    }

    return (
      <motion.div
        key={blog._id}
        layout
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="group"
      >
        <Card className="overflow-hidden transition-all duration-200 hover:shadow-lg h-full flex flex-col">
          <CardHeader className="space-y-4 pb-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-secondary rounded-lg">{getMediaIcon(blog.mediaType)}</div>
                {getStatusBadge(blog)}
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setEditingBlog(blog)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                {blog.uploadStatus === "completed" && (blog.fileUrl || blog.Video) && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => window.open(blog.fileUrl || blog.Video, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                )}
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Delete Blog</DialogTitle>
                      <DialogDescription>
                        This will permanently delete this blog post from Cloudinary and your database.
                        This action cannot be undone.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => {}}>
                        Cancel
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => handleDeleteBlog(blog._id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
            <div className="space-y-2">
              <CardTitle className="text-lg leading-tight">{blog.title}</CardTitle>
              <CardDescription className="line-clamp-2">{truncatedContent}</CardDescription>
            </div>
          </CardHeader>
          
          <CardContent className="flex-grow space-y-4">
            {/* Clickable media placeholder - opens details on click */}
            <div 
              className="relative aspect-video rounded-lg overflow-hidden bg-muted cursor-pointer group-hover:bg-muted/80 transition-colors"
              onClick={() => setViewingBlog(blog)}
            >
              {blog.mediaType === 'video' && blog.thumbnailUrl ? (
                <img 
                  src={blog.thumbnailUrl} 
                  alt={blog.title} 
                  className="w-full h-full object-cover" 
                />
              ) : blog.mediaType === 'video' && (blog.fileUrl || blog.Video) ? (
                getEmbedUrl(blog.fileUrl || blog.Video) ? (
                  <iframe
                    src={getEmbedUrl(blog.fileUrl || blog.Video) || ""}
                    className="w-full h-full object-cover pointer-events-none"
                    title={blog.title}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <video
                    src={blog.fileUrl || blog.Video}
                    className="w-full h-full object-cover"
                    muted
                    playsInline
                    preload="metadata"
                  />
                )
              ) : blog.mediaType === 'image' && blog.Image ? (
                <img 
                  src={blog.Image} 
                  alt={blog.title} 
                  className="w-full h-full object-cover" 
                  onError={(e) => {
                    e.currentTarget.src = "/placeholder.svg"
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  {getMediaIcon(blog.mediaType)}
                </div>
              )}
              <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <Play className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
            
            {/* File info */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Type</span>
                <span className="font-medium capitalize">{blog.mediaType}</span>
              </div>
              {blog.fileSize && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Size</span>
                  <span className="font-medium">{formatFileSize(blog.fileSize)}</span>
                </div>
              )}
              {blog.publishedAt && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Published</span>
                  <span className="font-medium">{safeDate}</span>
                </div>
              )}
            </div>
            
            {/* Upload progress */}
            {(blog.uploadStatus === "uploading" || blog.uploadStatus === "processing") && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground capitalize">{blog.uploadStatus}...</span>
                  <span className="font-medium">{blog.uploadProgress}%</span>
                </div>
                <Progress value={blog.uploadProgress} className="w-full" />
              </div>
            )}
            
            {/* Error message */}
            {blog.uploadStatus === "failed" && blog.error && (
              <div className="p-3 bg-destructive/10 rounded-lg">
                <p className="text-sm text-destructive font-medium">Error: {blog.error}</p>
              </div>
            )}
            
            {blog.tags && blog.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {blog.tags.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="bg-primary/10 text-primary px-2 py-1 rounded-full text-xs flex items-center"
                  >
                    <Tag className="h-3 w-3 mr-1" />
                    {tag}
                  </span>
                ))}
                {blog.tags.length > 3 && (
                  <span className="text-xs text-muted-foreground px-2 py-1">
                    +{blog.tags.length - 3} more
                  </span>
                )}
              </div>
            )}
          </CardContent>
          
          <CardFooter className="pt-4">
            <div className="w-full flex justify-between">
              <Button
                className="flex-1"
                onClick={() => setViewingBlog(blog)}
                disabled={blog.uploadStatus && blog.uploadStatus !== "completed"}
              >
                {blog.uploadStatus === "completed" || !blog.uploadStatus ? "View Content" : "Processing..."}
              </Button>
              {blog.uploadStatus === "completed" && (blog.fileUrl || blog.Video) && (
                <Button
                  variant="outline"
                  size="icon"
                  className="ml-2"
                  onClick={() => {
                    const link = document.createElement('a')
                    link.href = blog.fileUrl || blog.Video
                    link.download = blog.originalFileName || `${blog.title}.${blog.format || blog.mediaType}`
                    link.click()
                  }}
                >
                  <Download className="w-4 h-4" />
                </Button>
              )}
            </div>
          </CardFooter>
        </Card>
      </motion.div>
    )
  }

  const LoadingOverlay = () => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-white p-6 rounded-lg shadow-xl flex flex-col items-center">
        <Loader2 className="h-8 w-8 animate-spin mb-4 text-primary" />
        <p className="text-lg font-semibold">Loading blogs...</p>
        <p className="text-sm text-muted-foreground mt-1">Please wait</p>
      </div>
    </div>
  )

  const EmptyState = () => (
    <div className="text-center py-12">
      <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
        <Search className="h-12 w-12 text-gray-400" />
      </div>
      <h3 className="text-xl font-semibold mb-2">No blogs found</h3>
      <p className="text-muted-foreground mb-4">
        {searchTerm || selectedCategory 
          ? "Try adjusting your search or filter criteria" 
          : "Get started by creating your first blog post"}
      </p>
      {!searchTerm && !selectedCategory && (
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Create Blog
        </Button>
      )}
    </div>
  )

  const ErrorState = () => (
    <Alert variant="destructive" className="my-8">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Error loading blogs</AlertTitle>
      <AlertDescription>
        {error?.message || "Failed to load blogs. Please try again later."}
        <div className="mt-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-3 w-3 mr-1" /> Retry
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  )

  // Flatten all blog data
  const allBlogs = useMemo(() => {
    if (!data?.pages) return []
    return data.pages.flatMap(page => page?.data || [])
  }, [data])

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center">
            <Plus className="h-8 w-8 mr-2" /> Blog Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your blog posts, {allBlogs.length} post{allBlogs.length !== 1 ? 's' : ''} total
          </p>
        </div>
        
        <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search blogs..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="pl-10 w-full md:w-64"
            />
          </div>
          
          <Select value={selectedCategory || "all"} onValueChange={handleCategoryChange}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {CATEGORIES.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button 
            onClick={() => refetch()} 
            variant="outline"
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} /> 
            Refresh
          </Button>
          
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" /> Create Blog
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Blog Post</DialogTitle>
                <DialogDescription>
                  Fill in the details for your new blog post. All fields marked with * are required. 
                  You can upload images or videos to Cloudinary or provide URLs.
                </DialogDescription>
              </DialogHeader>
              <BlogForm onSubmit={handleCreateBlog} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {isLoading ? (
        <LoadingOverlay />
      ) : isError ? (
        <ErrorState />
      ) : allBlogs.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <AnimatePresence mode="wait">
            <motion.div
              key={`${debouncedSearchTerm}-${selectedCategory}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {allBlogs.map((blog: Blog) => (
                <BlogCard key={blog._id} blog={blog} />
              ))}
            </motion.div>
          </AnimatePresence>
          
          {hasNextPage && (
            <div className="mt-10 text-center">
              <Button 
                onClick={() => fetchNextPage()} 
                disabled={isFetchingNextPage || !hasNextPage}
                size="lg"
                className="min-w-[200px]"
              >
                {isFetchingNextPage ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading more...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Load More Posts
                  </>
                )}
              </Button>
              <p className="text-sm text-muted-foreground mt-2">
                Showing {allBlogs.length} of {data?.pages?.[0]?.total || allBlogs.length} posts
              </p>
            </div>
          )}
        </>
      )}

      <Dialog open={!!editingBlog} onOpenChange={(open) => !open && setEditingBlog(null)}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Blog Post</DialogTitle>
            <DialogDescription>
              Update the details of your blog post. All fields marked with * are required.
            </DialogDescription>
          </DialogHeader>
          {editingBlog && <BlogForm initialData={editingBlog} onSubmit={handleUpdateBlog} />}
        </DialogContent>
      </Dialog>

      {/* Enhanced View Blog Dialog with video playback */}
      <Dialog open={!!viewingBlog} onOpenChange={(open) => !open && setViewingBlog(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">{viewingBlog?.title}</DialogTitle>
            <DialogDescription>{viewingBlog?.content.substring(0, 100)}...</DialogDescription>
          </DialogHeader>
          
          {viewingBlog && (
            <Tabs defaultValue="preview" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="preview">Preview</TabsTrigger>
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="info">File Info</TabsTrigger>
              </TabsList>
              
              <TabsContent value="preview" className="space-y-4">
                {viewingBlog.mediaType === "video" && (viewingBlog.fileUrl || viewingBlog.Video) && (
                  <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                    {getEmbedUrl(viewingBlog.fileUrl || viewingBlog.Video) ? (
                      <iframe
                        src={getEmbedUrl(viewingBlog.fileUrl || viewingBlog.Video) || ""}
                        className="w-full h-full"
                        title={viewingBlog.title}
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    ) : (
                      <video
                        src={viewingBlog.fileUrl || viewingBlog.Video}
                        controls
                        autoPlay
                        className="w-full h-full"
                        onPlay={() => setIsPlaying(true)}
                        onPause={() => setIsPlaying(false)}
                      >
                        Your browser does not support the video tag.
                      </video>
                    )}
                  </div>
                )}
                
                {viewingBlog.mediaType === "image" && viewingBlog.Image && (
                  <div className="relative rounded-lg overflow-hidden">
                    <img
                      src={viewingBlog.Image}
                      alt={viewingBlog.title}
                      className="w-full h-auto max-h-[60vh] object-contain"
                    />
                  </div>
                )}
                
                <div className="prose prose-lg max-w-none dark:prose-invert">
                  <div dangerouslySetInnerHTML={{ __html: viewingBlog.content || "" }} />
                </div>
              </TabsContent>
              
              <TabsContent value="details" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Upload Status</Label>
                    <div className="mt-2">{getStatusBadge(viewingBlog)}</div>
                  </div>
                  <div>
                    <Label>Progress</Label>
                    <Progress value={viewingBlog.uploadProgress || 0} className="mt-2" />
                  </div>
                  <div>
                    <Label>Media Type</Label>
                    <p className="mt-2 text-sm capitalize">{viewingBlog.mediaType}</p>
                  </div>
                  <div>
                    <Label>Category</Label>
                    <p className="mt-2 text-sm">{viewingBlog.category}</p>
                  </div>
                </div>
                
                {viewingBlog.error && (
                  <div className="p-3 bg-destructive/10 rounded-lg">
                    <Label className="text-destructive">Error Details</Label>
                    <p className="mt-1 text-sm">{viewingBlog.error}</p>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="info" className="space-y-4">
                <div className="space-y-4">
                  <div>
                    <Label>File Name</Label>
                    <p className="mt-1 text-sm">{viewingBlog.originalFileName || "N/A"}</p>
                  </div>
                  <div>
                    <Label>File Size</Label>
                    <p className="mt-1 text-sm">{formatFileSize(viewingBlog.fileSize)}</p>
                  </div>
                  <div>
                    <Label>Cloudinary Public ID</Label>
                    <p className="mt-1 text-sm font-mono text-muted-foreground break-all">
                      {viewingBlog.publicId || "N/A"}
                    </p>
                  </div>
                  <div>
                    <Label>Published At</Label>
                    <p className="mt-1 text-sm">{formatDateSafe(viewingBlog.publishedAt)}</p>
                  </div>
                  {viewingBlog.completedAt && (
                    <div>
                      <Label>Completed At</Label>
                      <p className="mt-1 text-sm">{formatDateSafe(viewingBlog.completedAt)}</p>
                    </div>
                  )}
                </div>
                
                {(viewingBlog.fileUrl || viewingBlog.Video) && (
                  <div className="space-y-2">
                    <Label>Direct URL</Label>
                    <div className="flex gap-2">
                      <Input
                        value={viewingBlog.fileUrl || viewingBlog.Video || ""}
                        readOnly
                        className="font-mono text-sm"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => navigator.clipboard.writeText(viewingBlog.fileUrl || viewingBlog.Video || "")}
                      >
                        Copy
                      </Button>
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: 'var(--background)',
            color: 'var(--foreground)',
            border: '1px solid var(--border)',
          },
        }}
      />
    </div>
  )
}

function BlogManagementWrapper() {
  const [queryClient] = React.useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5 minutes
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  }))

  return (
    <QueryClientProvider client={queryClient}>
      <BlogManagement />
    </QueryClientProvider>
  )
}

export default BlogManagementWrapper
