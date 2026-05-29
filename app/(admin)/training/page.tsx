"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
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
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { toast } from "sonner"
import { useDropzone } from "react-dropzone"
import { motion, AnimatePresence } from "framer-motion"
import {
  FileVideo,
  FileIcon as FilePdf,
  FileAudio,
  FileText,
  Image as ImageIcon,
  Upload,
  Edit,
  Search,
  Trash2,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  Grid,
  List,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Download,
  File,
  ExternalLink,
} from "lucide-react"
import ReactPlayer from "react-player"

// Updated Types to match Cloudinary response
interface Training {
  _id: string
  title: string
  description: string
  type: "video" | "pdf" | "audio" | "text" | "image"
  fileUrl?: string
  publicId?: string
  thumbnailUrl?: string
  format?: string
  fileSize?: number
  originalFileName?: string
  mimeType?: string
  uploadStatus: "pending" | "uploading" | "processing" | "completed" | "failed"
  uploadProgress: number
  createdAt?: string
  completedAt?: string
  error?: string
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

export default function TrainingPage() {
  const [trainings, setTrainings] = useState<Training[]>([])
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [sortBy, setSortBy] = useState<string>("createdAt")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [selectedTraining, setSelectedTraining] = useState<Training | null>(null)
  const [editingTraining, setEditingTraining] = useState<Training | null>(null)
  const [newTraining, setNewTraining] = useState({
    title: "", 
    description: "",
    type: "video" as const,
    linkUrl: "", // New field for manual link input
  })
  const [isCreating, setIsCreating] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const playerRef = useRef<ReactPlayer>(null)

  // Fetch trainings
  const fetchTrainings = useCallback(async () => {
    try {
      const response = await fetch("/api/training")
      if (!response.ok) throw new Error("Failed to fetch")
      
      const data = await response.json()
      if (data.success) {
        setTrainings(data.data || data.trainings || [])
      } else {
        throw new Error(data.error || "Failed to fetch trainings")
      }
    } catch (error) {
      console.error("Fetch error:", error)
      toast.error("Failed to fetch trainings")
    }
  }, [])

  useEffect(() => {
    fetchTrainings()
    
    // Set up polling for upload progress
    const interval = setInterval(() => {
      fetchTrainings()
    }, 5000) // Poll every 5 seconds
    
    return () => clearInterval(interval)
  }, [fetchTrainings])

  // File upload handling with Cloudinary
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return
    setUploadedFile(file)
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "video/*": [".mp4", ".webm", ".mov", ".avi"],
      "audio/*": [".mp3", ".wav", ".ogg", ".m4a"],
      "application/pdf": [".pdf"],
      "text/*": [".txt", ".md", ".json", ".html"],
      "image/*": [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"],
    },
    disabled: isUploading,
  })

  // Format file size
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "Unknown size"
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  // Validation helper function
  const validateFileUpload = () => {
    if (!newTraining.title.trim()) {
      toast.error("Title is required")
      return false
    }
    
    if (newTraining.title.length < 3) {
      toast.error("Title must be at least 3 characters")
      return false
    }
    
    if (!newTraining.description.trim()) {
      toast.error("Description is required")
      return false
    }
    
    if (newTraining.description.length < 10) {
      toast.error("Description must be at least 10 characters")
      return false
    }
    
    if (!uploadedFile && !newTraining.linkUrl.trim()) {
      toast.error("Please select a file to upload or provide a link")
      return false
    }
    
    // Only validate file size if a file is actually present
    if (uploadedFile) {
      const maxSize = 100 * 1024 * 1024 // 100MB
      if (uploadedFile.size > maxSize) {
        toast.error(`File size must be less than ${formatFileSize(maxSize)}`)
        return false
      }
    }

    return true
  }

  const handleSubmit = async () => {
    if (!validateFileUpload()) {
      return
    }

    // If editing, call handleUpdate instead
    if (editingTraining) {
      await handleUpdate()
      return
    }

    setIsUploading(true)
    setUploadProgress(0)

    const formData = new FormData();
    formData.append("title", newTraining.title);
    formData.append("description", newTraining.description);
    formData.append("type", newTraining.type);

    if (uploadedFile) {
      formData.append("file", uploadedFile);
    } else if (newTraining.linkUrl.trim()) {
      formData.append("linkUrl", newTraining.linkUrl.trim());
    }

    console.log("Submitting training data:", {
      title: newTraining.title,
      description: newTraining.description,
      type: newTraining.type,
      fileName: uploadedFile?.name,
      fileSize: uploadedFile?.size,
      fileType: uploadedFile?.type,
    })

    try {
      const response = await fetch("/api/training", {
        method: "POST",
        body: formData,
      })

      console.log("Response status:", response.status, response.statusText)

      let data
      try {
        data = await response.json()
        console.log("Response data:", data)
      } catch (jsonError) {
        console.error("Failed to parse JSON response:", jsonError)
        throw new Error(`Server returned invalid response: ${response.status}`)
      }

      if (!response.ok) {
        console.error("Server error response:", data)
        throw new Error(
          data.error || 
          data.message || 
          data.details || 
          `Upload failed with status ${response.status}: ${response.statusText}`
        )
      }

      if (data.success) {
        toast.success("Training upload started successfully!")
        setIsCreating(false)
        setNewTraining({ title: "", description: "", type: "video", linkUrl: "" })
        setUploadedFile(null)
        fetchTrainings()
      } else {
        throw new Error(data.error || data.message || "Upload failed")
      }
    } catch (error: any) {
      console.error("Upload error details:", error)
      
      // More specific error messages
      if (error.name === "TypeError" && error.message.includes("fetch")) {
        toast.error("Network error. Please check your connection and try again.")
      } else if (error.message.includes("413")) {
        toast.error("File too large. Please upload a smaller file.")
      } else if (error.message.includes("415")) {
        toast.error("Unsupported file type. Please check the file format.")
      } else if (error.message.includes("500")) {
        toast.error("Server error. Please try again later.")
      } else {
        toast.error(error.message || "Failed to upload training. Please check your inputs.")
      }
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  // Update training
  const handleUpdate = async () => {
    if (!editingTraining) return

    try {
      const response = await fetch(`/api/training/${editingTraining._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTraining.title,
          description: newTraining.description,
          type: newTraining.type,
          linkUrl: newTraining.linkUrl
        }),
      })

      if (!response.ok) throw new Error("Failed to update training")
      
      toast.success("Training updated successfully")
      setEditingTraining(null)
      setIsCreating(false)
      resetForm()
      fetchTrainings()
    } catch (error) {
      toast.error("Failed to update training")
    }
  }

  const resetForm = () => {
    setNewTraining({ title: "", description: "", type: "video", linkUrl: "" })
    setUploadedFile(null)
    setEditingTraining(null)
  }

  const handleEditClick = (training: Training) => {
    setEditingTraining(training)
    setNewTraining({
      title: training.title,
      description: training.description,
      type: training.type,
      linkUrl: training.publicId ? "" : (training.fileUrl || "")
    })
    setIsCreating(true)
  }

  // Delete training
  const deleteTraining = async (id: string) => {
    try {
      const response = await fetch(`/api/training/${id}`, {
        method: "DELETE",
      })
      
      const data = await response.json()
      
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Delete failed")
      }
      
      toast.success("Training deleted successfully")
      fetchTrainings()
    } catch (error: any) {
      toast.error(error.message || "Failed to delete training")
    }
  }

  // Filter and sort trainings
  const filteredTrainings = trainings
    .filter(
      (training) =>
        training.title.toLowerCase().includes(search.toLowerCase()) &&
        (typeFilter === "all" || training.type === typeFilter),
    )
    .sort((a, b) => {
      switch (sortBy) {
        case "title":
          return a.title.localeCompare(b.title)
        case "status":
          return a.uploadStatus.localeCompare(b.uploadStatus)
        case "progress":
          return b.uploadProgress - a.uploadProgress
        case "createdAt":
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
        default:
          return 0
      }
    })

  // Get icon by type
  const getIcon = (type: string) => {
    switch (type) {
      case "video":
        return <FileVideo className="w-5 h-5" />
      case "pdf":
        return <FilePdf className="w-5 h-5" />
      case "audio":
        return <FileAudio className="w-5 h-5" />
      case "text":
        return <FileText className="w-5 h-5" />
      case "image":
        return <ImageIcon className="w-5 h-5" />
      default:
        return <File className="w-5 h-5" />
    }
  }

  // Get status badge
  const getStatusBadge = (training: Training) => {
    switch (training.uploadStatus) {
      case "completed":
        return (
          <Badge variant="default" className="bg-green-600 hover:bg-green-600/80 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Completed
          </Badge>
        )
      case "uploading":
      case "processing":
        return (
          <Badge variant="secondary" className="bg-yellow-500 text-secondary-foreground hover:bg-yellow-500/80 flex items-center gap-1">
            <Loader2 className="w-3 h-3 animate-spin" /> {training.uploadStatus === "uploading" ? "Uploading" : "Processing"}
          </Badge>
        )
      case "failed":
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <XCircle className="w-3 h-3" /> Failed
            {training.error && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <AlertCircle className="w-3 h-3 ml-1" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{training.error}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </Badge>
        )
      case "pending":
        return (
          <Badge variant="secondary" className="flex items-center gap-1">
            <Clock className="w-3 h-3" /> Pending
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> Unknown
          </Badge>
        )
    }
  }

  // Format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return "Unknown date"
    return new Date(dateString).toLocaleDateString()
  }

  // Get Cloudinary video thumbnail
  const getVideoThumbnail = (publicId?: string) => {
    if (!publicId) return "/placeholder.svg"
    return `https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/video/upload/w_300,h_200,c_fill/${publicId}.jpg`
  }

  // Get max file size
  const getMaxFileSize = () => {
    return 100 * 1024 * 1024 // 100MB
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Training Management</h1>
          <p className="text-muted-foreground mt-1">Create and manage training materials with Cloudinary</p>
        </div>
      

<Dialog open={isCreating} onOpenChange={(open) => {
  setIsCreating(open)
  if (!open) resetForm()
}}>
  <DialogTrigger asChild>
    <Button>
      <Upload className="w-4 h-4 mr-2" />
      Create Training
    </Button>
  </DialogTrigger>
  <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden">
    <DialogHeader className="px-1">
      <DialogTitle>{editingTraining ? "Edit Training" : "Create New Training"}</DialogTitle>
      <DialogDescription>
        {editingTraining ? "Update the training details below" : "Fill in the training details and upload your content to Cloudinary"}
      </DialogDescription>
    </DialogHeader>
    
    {/* Add scrollable container */}
    <div className="overflow-y-auto max-h-[calc(90vh-180px)] px-1">
      <div className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              placeholder="Enter training title"
              value={newTraining.title}
              onChange={(e) => setNewTraining((prev) => ({ ...prev, title: e.target.value }))}
              disabled={isUploading}
              className={newTraining.title.length > 0 && newTraining.title.length < 3 ? "border-destructive" : ""}
            />
            {newTraining.title.length > 0 && newTraining.title.length < 3 && (
              <p className="text-xs text-destructive">Title must be at least 3 characters</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              placeholder="Enter training description"
              value={newTraining.description}
              onChange={(e) => setNewTraining((prev) => ({ ...prev, description: e.target.value }))}
              className={`min-h-[100px] ${newTraining.description.length > 0 && newTraining.description.length < 10 ? "border-destructive" : ""}`}
              disabled={isUploading}
            />
            {newTraining.description.length > 0 && newTraining.description.length < 10 && (
              <p className="text-xs text-destructive">Description must be at least 10 characters</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Type *</Label>
            <Select
              value={newTraining.type}
              onValueChange={(value: "video" | "pdf" | "audio" | "text" | "image") =>
                setNewTraining((prev) => ({ ...prev, type: value }))
              }
              disabled={isUploading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="video">Video</SelectItem>
                <SelectItem value="image">Image</SelectItem>
                <SelectItem value="pdf">PDF</SelectItem>
                <SelectItem value="audio">Audio</SelectItem>
                <SelectItem value="text">Text</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="linkUrl">Direct Link (Optional)</Label>
            <Input
              id="linkUrl"
              placeholder="Enter a direct link (e.g., YouTube, PDF URL)"
              value={newTraining.linkUrl}
              onChange={(e) => setNewTraining((prev) => ({ ...prev, linkUrl: e.target.value }))}
              disabled={isUploading || !!uploadedFile} // Disable if file is selected or uploading
              className={newTraining.linkUrl.trim() && !newTraining.linkUrl.startsWith('http') ? "border-destructive" : ""}
            />
            {newTraining.linkUrl.trim() && !newTraining.linkUrl.startsWith('http') && (
              <p className="text-xs text-destructive">Please enter a valid URL starting with http(s)://</p>
            )}
          </div>
        </div>
        
        <div className="space-y-4">
          <Label>File Upload *</Label>
          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
              transition-colors duration-200 min-h-[200px] flex flex-col items-center justify-center
              ${isDragActive ? "border-primary bg-primary/5" : "border-border"} ${newTraining.linkUrl.trim() ? "opacity-50 cursor-not-allowed" : ""}
              ${isUploading ? "opacity-50 cursor-not-allowed" : "hover:border-primary/50"}
              ${uploadedFile && uploadedFile.size > getMaxFileSize() ? "border-destructive bg-destructive/5" : ""}
            `}
          >
            <input {...getInputProps()} />
            {uploadedFile ? (
              <div className="space-y-2">
                <File className="w-12 h-12 mx-auto mb-2 text-primary" />
                <p className="font-medium">{uploadedFile.name}</p>
                <p className="text-sm text-muted-foreground">
                  {formatFileSize(uploadedFile.size)} • {uploadedFile.type}
                </p>
                {uploadedFile.size > getMaxFileSize() && (
                  <p className="text-sm text-destructive font-medium">
                    File too large! Max {formatFileSize(getMaxFileSize())}
                  </p>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    setUploadedFile(null)
                  }}
                  disabled={!!isUploading}
                >
                  Remove File
                </Button>
              </div>
            ) : (
              <>
                <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {isDragActive ? "Drop the file here" : "Drag and drop your file here or click to browse"}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Supported formats: Video, Image, Audio, PDF, Text
                </p>
                <p className="text-xs text-muted-foreground"> (Max file size: {formatFileSize(getMaxFileSize())})
                  Max file size: {formatFileSize(getMaxFileSize())}
                </p>
              </>
            )}
          </div>
          
          {uploadedFile && (
            <div className="flex items-center justify-between text-sm">
              <div>
                <span className="text-muted-foreground">Ready to upload • </span>
                <span className="font-medium">{formatFileSize(uploadedFile.size)}</span>
              </div>
              {uploadedFile.size > getMaxFileSize() && (
                <span className="text-red-500 text-sm font-medium">File too large!</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
    
    {/* Fixed position button at bottom */}
    <div className="pt-4 border-t sticky bottom-0 bg-background px-1">
      <Button
        onClick={handleSubmit}
        disabled={
          !newTraining.title.trim() || 
          !newTraining.description.trim() || 
          (!uploadedFile && !newTraining.linkUrl.trim()) || // Either file or link must be present
          isUploading ||
          newTraining.title.length < 3 ||
          newTraining.description.length < 10 ||
          (newTraining.linkUrl.trim() && !newTraining.linkUrl.startsWith('http')) ||
          (uploadedFile && uploadedFile.size > getMaxFileSize())
        }
        className="w-full"
      >
        {isUploading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Uploading to Cloudinary...
          </>
        ) : (
          <>
            <Upload className="w-4 h-4 mr-2" />
            Upload to Cloudinary
          </>
        )}
      </Button>
    </div>
  </DialogContent>
</Dialog>


      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Training Materials ({trainings.length})</CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === "grid" ? "secondary" : "ghost"}
                size="icon"
                onClick={() => setViewMode("grid")}
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="icon"
                onClick={() => setViewMode("list")}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search trainings..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="w-full sm:w-[200px]">
              <Label>Type</Label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="video">Video</SelectItem>
                  <SelectItem value="image">Image</SelectItem>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="audio">Audio</SelectItem>
                  <SelectItem value="text">Text</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-full sm:w-[200px]">
              <Label>Sort By</Label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="createdAt">Newest First</SelectItem>
                  <SelectItem value="title">Title</SelectItem>
                  <SelectItem value="status">Status</SelectItem>
                  <SelectItem value="progress">Progress</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <AnimatePresence>
        {viewMode === "grid" ? (
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {filteredTrainings.map((training) => (
              <motion.div
                key={training._id}
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
                        <div className="p-2 bg-secondary rounded-lg">{getIcon(training.type)}</div>
                        {getStatusBadge(training)}
                      </div>
                      <div className="flex items-center gap-1">
                        {training.uploadStatus === "completed" && training.fileUrl && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleEditClick(training)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        {training.uploadStatus === "completed" && training.fileUrl && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => window.open(training.fileUrl, '_blank')}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        )}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Training</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete this training material from Cloudinary and your database.
                                This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteTraining(training._id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <CardTitle className="text-lg leading-tight">{training.title}</CardTitle>
                      <CardDescription className="line-clamp-2">{training.description}</CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-grow space-y-4">
                    {/* Clickable placeholder to open details */}
                    <div 
                      className="relative aspect-video rounded-lg overflow-hidden bg-muted cursor-pointer group-hover:bg-muted/80 transition-colors"
                      onClick={() => setSelectedTraining(training)}
                    >
                      {training.type === 'video' ? (
                        getEmbedUrl(training.fileUrl || "") ? (
                          <iframe
                            src={getEmbedUrl(training.fileUrl || "") || ""}
                            className="w-full h-full object-cover pointer-events-none"
                            title={training.title}
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        ) : training.thumbnailUrl ? (
                          <img src={training.thumbnailUrl} alt={training.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                            {getIcon(training.type)}
                          </div>
                        )
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                          {getIcon(training.type)}
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
                        <span className="font-medium capitalize">{training.type}</span>
                      </div>
                      {training.fileSize && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Size</span>
                          <span className="font-medium">{formatFileSize(training.fileSize)}</span>
                        </div>
                      )}
                      {training.createdAt && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Created</span>
                          <span className="font-medium">{formatDate(training.createdAt)}</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Upload progress */}
                    {(training.uploadStatus === "uploading" || training.uploadStatus === "processing") && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground capitalize">{training.uploadStatus}...</span>
                          <span className="font-medium">{training.uploadProgress}%</span>
                        </div>
                        <Progress value={training.uploadProgress} className="w-full" />
                      </div>
                    )}
                    
                    {/* Error message */}
                    {training.uploadStatus === "failed" && training.error && (
                      <div className="p-3 bg-destructive/10 rounded-lg">
                        <p className="text-sm text-destructive font-medium">Error: {training.error}</p>
                      </div>
                    )}
                  </CardContent>
                  <CardFooter className="pt-4">
                    <div className="w-full flex justify-between">
                      <Button
                        className="flex-1"
                        onClick={() => setSelectedTraining(training)}
                        disabled={training.uploadStatus !== "completed"}
                      >
                        {training.uploadStatus === "completed" ? "View Content" : "Processing..."}
                      </Button>
                      {training.uploadStatus === "completed" && training.fileUrl && (
                        <Button
                          variant="outline"
                          size="icon"
                          className="ml-2"
                          onClick={() => {
                            const link = document.createElement('a')
                            link.href = training.fileUrl!
                            link.download = training.originalFileName || `${training.title}.${training.format || training.type}`
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
            ))}
          </motion.div>
        ) : (
          // List view (similar structure but in table format)
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-4 font-medium">Type</th>
                    <th className="text-left p-4 font-medium">Title</th>
                    <th className="text-left p-4 font-medium">Status</th>
                    <th className="text-left p-4 font-medium">Size</th>
                    <th className="text-left p-4 font-medium">Created</th>
                    <th className="text-left p-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTrainings.map((training) => (
                    <tr key={training._id} className="border-b hover:bg-muted/50">
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          {getIcon(training.type)}
                          <span className="capitalize">{training.type}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div>
                          <p className="font-medium">{training.title}</p>
                          <p className="text-sm text-muted-foreground truncate max-w-[300px]">
                            {training.description}
                          </p>
                        </div>
                      </td>
                      <td className="p-4">{getStatusBadge(training)}</td>
                      <td className="p-4">{formatFileSize(training.fileSize)}</td>
                      <td className="p-4">{formatDate(training.createdAt)}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditClick(training)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSelectedTraining(training)}
                            disabled={training.uploadStatus !== "completed"}
                          >
                            <Play className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteTraining(training._id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </AnimatePresence>

      {/* Preview Dialog */}
      <Dialog open={!!selectedTraining} onOpenChange={() => setSelectedTraining(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedTraining?.title}</DialogTitle>
            <DialogDescription>{selectedTraining?.description}</DialogDescription>
          </DialogHeader>
          
          {selectedTraining && (
            <Tabs defaultValue="preview" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="preview">Preview</TabsTrigger>
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="info">File Info</TabsTrigger>
              </TabsList>
              
              <TabsContent value="preview" className="space-y-4">
                {selectedTraining.type === "video" && selectedTraining.fileUrl && (
                  <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                    {getEmbedUrl(selectedTraining.fileUrl) ? (
                      <iframe
                        src={getEmbedUrl(selectedTraining.fileUrl) || ""}
                        className="w-full h-full"
                        title={selectedTraining.title}
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    ) : (
                      <ReactPlayer
                        ref={playerRef}
                        url={selectedTraining.fileUrl}
                        width="100%"
                        height="100%"
                        playing={isPlaying}
                        muted={isMuted}
                        controls
                        config={{
                          file: {
                            attributes: {
                              controlsList: "nodownload",
                            },
                          },
                        }}
                      />
                    )}
                  </div>
                )}
                
                {selectedTraining.type === "image" && selectedTraining.fileUrl && (
                  <div className="relative rounded-lg overflow-hidden">
                    <img
                      src={selectedTraining.fileUrl}
                      alt={selectedTraining.title}
                      className="w-full h-auto max-h-[60vh] object-contain"
                    />
                  </div>
                )}
                
                {selectedTraining.type === "pdf" && selectedTraining.fileUrl && (
                  <iframe
                    src={`${selectedTraining.fileUrl}#view=fitH`}
                    className="w-full h-[60vh] border rounded-lg"
                    title={selectedTraining.title}
                  />
                )}
                
                {selectedTraining.type === "audio" && selectedTraining.fileUrl && (
                  <div className="p-4 border rounded-lg">
                    <audio controls className="w-full" src={selectedTraining.fileUrl}>
                      Your browser does not support the audio element.
                    </audio>
                  </div>
                )}
                
                {selectedTraining.type === "text" && selectedTraining.fileUrl && (
                  <div className="p-4 border rounded-lg">
                    <iframe
                      src={selectedTraining.fileUrl}
                      className="w-full h-[60vh] border-0"
                      title={selectedTraining.title}
                    />
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="details" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Upload Status</Label>
                    <div className="mt-2">{getStatusBadge(selectedTraining)}</div>
                  </div>
                  <div>
                    <Label>Progress</Label>
                    <Progress value={selectedTraining.uploadProgress} className="mt-2" />
                  </div>
                  <div>
                    <Label>File Type</Label>
                    <p className="mt-2 text-sm">{selectedTraining.mimeType || selectedTraining.type}</p>
                  </div>
                  <div>
                    <Label>Format</Label>
                    <p className="mt-2 text-sm">{selectedTraining.format || "N/A"}</p>
                  </div>
                </div>
                
                {selectedTraining.error && (
                  <div className="p-3 bg-destructive/10 rounded-lg">
                    <Label className="text-destructive">Error Details</Label>
                    <p className="mt-1 text-sm">{selectedTraining.error}</p>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="info" className="space-y-4">
                <div className="space-y-4">
                  <div>
                    <Label>File Name</Label>
                    <p className="mt-1 text-sm">{selectedTraining.originalFileName || "N/A"}</p>
                  </div>
                  <div>
                    <Label>File Size</Label>
                    <p className="mt-1 text-sm">{formatFileSize(selectedTraining.fileSize)}</p>
                  </div>
                  <div>
                    <Label>Cloudinary Public ID</Label>
                    <p className="mt-1 text-sm font-mono text-muted-foreground break-all">
                      {selectedTraining.publicId || "N/A"}
                    </p>
                  </div>
                  <div>
                    <Label>Created At</Label>
                    <p className="mt-1 text-sm">{formatDate(selectedTraining.createdAt)}</p>
                  </div>
                  {selectedTraining.completedAt && (
                    <div>
                      <Label>Completed At</Label>
                      <p className="mt-1 text-sm">{formatDate(selectedTraining.completedAt)}</p>
                    </div>
                  )}
                </div>
                
                {selectedTraining.fileUrl && (
                  <div className="space-y-2">
                    <Label>Direct URL</Label>
                    <div className="flex gap-2">
                      <Input
                        value={selectedTraining.fileUrl}
                        readOnly
                        className="font-mono text-sm"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => navigator.clipboard.writeText(selectedTraining.fileUrl!)}
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

      {filteredTrainings.length === 0 && (
        <div className="text-center py-12">
          <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No training materials yet</h3>
          <p className="text-muted-foreground mb-4">Upload your first training material to get started</p>
          <Button onClick={() => setIsCreating(true)}>
            <Upload className="w-4 h-4 mr-2" />
            Upload Training Material
          </Button>
        </div>
      )}
    </div>
  )
}
