"use client"

import { useState, useEffect, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { CalendarDays, ChevronRight, Play, Loader2, CheckCircle2, AlertTriangle, Clock, Image as ImageIcon, Video, Eye, EyeOff, Tag, ExternalLink, Maximize2, X, Download, FileText, User, Share2, Heart, Search, Command } from "lucide-react"
import type { ReactNode } from "react"
import { isValid, format } from "date-fns"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"

// Updated Blog type to match the management component
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

const formatDateSafe = (dateString?: string): string => {
  if (!dateString) return "No date"
  
  try {
    const date = new Date(dateString)
    if (!isValid(date)) return "Invalid date"
    return format(date, "MMM dd, yyyy")
  } catch {
    return "Invalid date"
  }
}

const formatFileSize = (bytes?: number) => {
  if (!bytes) return "Unknown size"
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const BrutalButton = ({ children, className = "", ...props }: { children: ReactNode; className?: string }) => (
  <button
    className={`px-8 py-2 border-2 border-purple-900 bg-white text-purple-900 transition duration-200 text-sm font-bold shadow-[4px_4px_0px_0px_rgba(88,28,135,1)] hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none ${className}`}
    {...props}
  >
    {children}
  </button>
)

const SkeletonCard = () => (
  <div className="bg-white rounded-lg overflow-hidden shadow-lg animate-pulse">
    <div className="h-64 bg-purple-100"></div>
    <div className="p-6">
      <div className="h-6 bg-purple-100 rounded w-3/4 mb-4"></div>
      <div className="h-4 bg-purple-100 rounded w-full mb-2"></div>
      <div className="h-4 bg-purple-100 rounded w-2/3"></div>
    </div>
  </div>
)

// Helper function to determine if URL is a video
const isVideoUrl = (url?: string): boolean => {
  if (!url) return false
  const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.m3u8']
  const videoDomains = ['youtube.com', 'youtu.be', 'vimeo.com', 'wistia.com', 'dailymotion.com']
  
  // Check by file extension
  if (videoExtensions.some(ext => url.toLowerCase().includes(ext))) {
    return true
  }
  
  // Check by domain
  if (videoDomains.some(domain => url.toLowerCase().includes(domain))) {
    return true
  }
  
  return false
}

// Helper function to determine if URL is an image
const isImageUrl = (url?: string): boolean => {
  if (!url) return false
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp']
  
  if (imageExtensions.some(ext => url.toLowerCase().includes(ext))) {
    return true
  }
  
  // Check if it's a base64 image
  if (url.startsWith('data:image/')) {
    return true
  }
  
  return false
}

// Universal Media Preview Component - Handles both images and videos
const BlogMediaPreview = ({ 
  blog, 
  heightClass = "h-64", 
  showPlayIcon = true,
  showMediaBadge = true,
  objectFit = "cover",
  showFullScreen = false,
  onFullScreenClick
}: { 
  blog: Blog; 
  heightClass?: string; 
  showPlayIcon?: boolean;
  showMediaBadge?: boolean;
  objectFit?: "cover" | "contain";
  showFullScreen?: boolean;
  onFullScreenClick?: () => void;
}) => {
  const [isVideoLoading, setIsVideoLoading] = useState(true)
  const [videoError, setVideoError] = useState(false)
  
  const videoSource = blog.fileUrl || blog.Video || ""
  const embedUrl = getEmbedUrl(videoSource)
  const imageSource = blog.Image || blog.fileUrl
  
  // Determine media type based on actual data
  const isVideo = isVideoUrl(videoSource) || !!embedUrl || blog.mediaType === 'video'
  const isImage = isImageUrl(imageSource) || blog.mediaType === 'image'
  
  if (isVideo) {
    // Video with thumbnail (preview mode)
    if (blog.thumbnailUrl && showPlayIcon && objectFit === "cover") {
      return (
        <div className={`relative ${heightClass} w-full group`}>
          <Image 
            src={blog.thumbnailUrl} 
            alt={blog.title} 
            layout="fill" 
            objectFit={objectFit} 
            className="transition-all duration-300 group-hover:scale-105"
          />
          {showPlayIcon && (
            <div className="absolute inset-0 bg-purple-900/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <Play className="w-6 h-6 text-white" />
              </div>
            </div>
          )}
          {showMediaBadge && (
            <div className="absolute bottom-4 left-4 bg-purple-900/90 text-white px-2 py-1 rounded text-xs font-medium flex items-center gap-1 backdrop-blur-sm">
              <Video className="h-3 w-3" /> Video
            </div>
          )}
          {showFullScreen && onFullScreenClick && (
            <button
              onClick={onFullScreenClick}
              className="absolute top-4 right-4 p-2 bg-purple-900/50 backdrop-blur-sm rounded-full hover:bg-purple-900/70 transition-colors z-10"
            >
              <Maximize2 className="w-4 h-4 text-white" />
            </button>
          )}
        </div>
      )
    }
    
    // Embedded video (YouTube/Vimeo)
    if (embedUrl) {
      return (
        <div className={`relative ${heightClass} w-full`}>
          <iframe
            src={embedUrl}
            className="w-full h-full"
            title={blog.title}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
          {showMediaBadge && (
            <div className="absolute bottom-4 left-4 bg-purple-900/90 text-white px-2 py-1 rounded text-xs font-medium flex items-center gap-1 backdrop-blur-sm">
              <Video className="h-3 w-3" /> Video
            </div>
          )}
        </div>
      )
    }
    
    // Direct video file
    if (videoSource) {
      return (
        <div className={`relative ${heightClass} w-full group`}>
          <video
            src={videoSource}
            className={`w-full h-full object-${objectFit}`}
            muted={!showFullScreen}
            playsInline
            preload="metadata"
            poster={blog.thumbnailUrl || "/placeholder-video.png"}
            onLoadStart={() => setIsVideoLoading(true)}
            onLoadedData={() => setIsVideoLoading(false)}
            onError={(e) => {
              console.error("Video loading error:", e)
              setVideoError(true)
              setIsVideoLoading(false)
            }}
            controls={showFullScreen}
            autoPlay={showFullScreen}
          />
          
          {isVideoLoading && !videoError && (
            <div className="absolute inset-0 bg-purple-900/50 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-white animate-spin" />
            </div>
          )}
          
          {videoError && (
            <div className="absolute inset-0 bg-purple-900/50 flex items-center justify-center">
              <div className="text-center">
                <Video className="h-12 w-12 mx-auto text-purple-300 mb-2" />
                <p className="text-sm text-purple-200">Video not available</p>
                <p className="text-xs text-purple-300 mt-1">URL: {videoSource.substring(0, 50)}...</p>
              </div>
            </div>
          )}
          
          {!showFullScreen && showPlayIcon && !videoError && (
            <div className="absolute inset-0 bg-purple-900/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <Play className="w-6 h-6 text-white" />
              </div>
            </div>
          )}
          
          {showMediaBadge && !videoError && (
            <div className="absolute bottom-4 left-4 bg-purple-900/90 text-white px-2 py-1 rounded text-xs font-medium flex items-center gap-1 backdrop-blur-sm">
              <Video className="h-3 w-3" /> Video
            </div>
          )}
          
          {showFullScreen && onFullScreenClick && !videoError && (
            <button
              onClick={onFullScreenClick}
              className="absolute top-4 right-4 p-2 bg-purple-900/50 backdrop-blur-sm rounded-full hover:bg-purple-900/70 transition-colors z-10"
            >
              <Maximize2 className="w-5 h-5 text-white" />
            </button>
          )}
        </div>
      )
    }
  }
  
  if (isImage && imageSource) {
    return (
      <div className={`relative ${heightClass} w-full overflow-hidden`}>
        <Image 
          src={imageSource} 
          alt={blog.title} 
          layout="fill" 
          objectFit={objectFit} 
          className="transition-transform duration-500 hover:scale-110"
          onError={(e) => {
            console.error("Image loading error:", e)
            e.currentTarget.src = "/placeholder.svg"
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-purple-900/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        {showMediaBadge && (
          <div className="absolute bottom-4 left-4 bg-purple-900/90 text-white px-2 py-1 rounded text-xs font-medium flex items-center gap-1 backdrop-blur-sm">
            <ImageIcon className="h-3 w-3" /> Image
          </div>
        )}
        {showFullScreen && onFullScreenClick && (
          <button
            onClick={onFullScreenClick}
            className="absolute top-4 right-4 p-2 bg-purple-900/50 backdrop-blur-sm rounded-full hover:bg-purple-900/70 transition-colors z-10"
          >
            <Maximize2 className="w-5 h-5 text-white" />
          </button>
        )}
      </div>
    )
  }
  
  // Fallback for no media
  return (
    <div className={`relative ${heightClass} w-full bg-gradient-to-br from-purple-100 to-purple-50 flex items-center justify-center`}>
      <div className="text-purple-400 text-center">
        <div className="mb-2">
          {blog.mediaType === 'video' ? <Video className="h-12 w-12 mx-auto" /> : 
           blog.mediaType === 'image' ? <ImageIcon className="h-12 w-12 mx-auto" /> : 
           <FileText className="h-12 w-12 mx-auto" />}
        </div>
        <p className="text-sm text-purple-600">No media available</p>
        <p className="text-xs text-purple-500 mt-1">Type: {blog.mediaType || 'none'}</p>
      </div>
    </div>
  )
}

// Status badge component
const getStatusBadge = (blog: Blog) => {
  if (!blog.uploadStatus) return null
  
  switch (blog.uploadStatus) {
    case "completed":
      return (
        <div className="absolute top-4 right-4 bg-green-600 text-white px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3" /> Ready
        </div>
      )
    case "uploading":
    case "processing":
      return (
        <div className="absolute top-4 right-4 bg-yellow-500 text-white px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
          <Loader2 className="h-3 w-3 animate-spin" /> {blog.uploadStatus === "uploading" ? "Uploading" : "Processing"}
        </div>
      )
    case "failed":
      return (
        <div className="absolute top-4 right-4 bg-red-600 text-white px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" /> Failed
        </div>
      )
    case "pending":
      return (
        <div className="absolute top-4 right-4 bg-gray-500 text-white px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
          <Clock className="h-3 w-3" /> Pending
        </div>
      )
    default:
      return null
  }
}

// Modal component for viewing blog details
const BlogDetailModal = ({ 
  blog: initialBlog, 
  allBlogs, 
  isOpen, 
  onClose, 
  onSelectBlog,
  initialFullScreen = false
}: { 
  blog: Blog; 
  allBlogs: Blog[]; 
  isOpen: boolean; 
  onClose: () => void; 
  onSelectBlog: (blog: Blog) => void;
  initialFullScreen?: boolean;
}) => {
  const [blog, setBlog] = useState<Blog>(initialBlog)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isFullScreen, setIsFullScreen] = useState(initialFullScreen)
  const [searchQuery, setSearchQuery] = useState("")

  // Derived data for sidebar
  const categoryList = useMemo(() => {
    const counts = allBlogs.reduce((acc, post) => {
      const cat = post.category || 'Other';
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return Object.entries(counts).map(([name, count]) => ({ name, count }));
  }, [allBlogs]);

  const sidebarRecentPosts = useMemo(() => {
    return allBlogs
      .filter(p => p._id !== blog._id)
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
      .slice(0, 4);
  }, [allBlogs, blog._id]);

  const sidebarTags = useMemo(() => {
    return Array.from(new Set(allBlogs.flatMap(p => p.tags || []))).slice(0, 15);
  }, [allBlogs]);
  
  useEffect(() => {
    const fetchBlogData = async () => {
      if (!initialBlog._id) return
      
      setIsLoading(true)
      setError(null)
      try {
        const response = await fetch(`/api/blog/${initialBlog._id}`)
        if (!response.ok) {
          throw new Error(`Failed to fetch blog: ${response.status}`)
        }
        const data = await response.json()
        if (data.success) {
          setBlog(data.data)
        } else {
          setError(data.message || "Failed to fetch blog data")
        }
      } catch (error: any) {
        console.error("Failed to fetch blog details:", error)
        setError(error.message || "Error loading blog data")
      } finally {
        setIsLoading(false)
      }
    }
    
    if (isOpen) {
      fetchBlogData()
    }
  }, [initialBlog._id, isOpen])

  useEffect(() => {
    if (isOpen) {
      setIsFullScreen(initialFullScreen)
    }
  }, [isOpen, initialFullScreen])

  // Determine media type based on actual data
  const getMediaType = (b: Blog): "image" | "video" | "none" => {
    const videoSource = b.fileUrl || b.Video || ""
    const imageSource = b.Image || b.fileUrl
    
    if (isVideoUrl(videoSource) || getEmbedUrl(videoSource)) {
      return 'video'
    }
    if (isImageUrl(imageSource)) {
      return 'image'
    }
    return 'none'
  }

  // Get all media blogs for related section
  const mediaBlogs = allBlogs.filter(b => {
    const type = getMediaType(b)
    return (type === 'video' || type === 'image') && b._id !== blog._id
  })
  const mediaIndex = mediaBlogs.findIndex(b => b._id === blog._id)
  
  const currentMediaType = getMediaType(blog)

  if (!isOpen) return null

  return (
    <>
      <div className={`fixed inset-0 z-50 flex items-center justify-center bg-purple-900/90 backdrop-blur-md ${isFullScreen ? 'p-0' : 'p-4 md:p-6'}`}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className={`relative bg-white w-full overflow-hidden shadow-2xl flex flex-col ${
            isFullScreen ? "h-full rounded-none" : "rounded-2xl max-w-5xl max-h-[90vh] border border-purple-200"
          }`}
        >
          {/* Close button - Floating */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-50 p-2 bg-purple-900/70 hover:bg-purple-900 text-white backdrop-blur-sm rounded-full transition-all duration-200 hover:scale-110"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Loading state */}
          {isLoading && (
            <div className="flex items-center justify-center h-96">
              <Loader2 className="w-12 h-12 text-purple-900 animate-spin" />
            </div>
          )}

          {/* Error state */}
          {error && !isLoading && (
            <div className="flex flex-col items-center justify-center h-96 p-8 text-center">
              <AlertTriangle className="w-16 h-16 text-red-500 mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">Error Loading Blog</h3>
              <p className="text-gray-600">{error}</p>
              <button
                onClick={onClose}
                className="mt-4 px-6 py-2 bg-purple-900 text-white rounded-lg hover:bg-purple-800 transition-colors"
              >
                Close
              </button>
            </div>
          )}

          {/* Content when loaded */}
          {!isLoading && !error && (
            <div className="flex flex-col h-full overflow-y-auto custom-scrollbar scroll-smooth">
              {/* Content section */}
              <div className="flex-1 bg-white">
                 <div className="container px-4 py-8 mx-auto">
                  <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
                    {/* Main Content */}
                    <main className="space-y-8">
                    
                    {/* Media Section */}
                    <div className="rounded-xl overflow-hidden shadow-lg bg-purple-950">
                      <BlogMediaPreview 
                        blog={blog}
                        heightClass="aspect-video"
                        objectFit="contain"
                        showPlayIcon={false}
                        showMediaBadge={false}
                        showFullScreen={true}
                      />
                    </div>

                    {/* Header Info */}
                    <div className="mb-10 border-b border-purple-100 pb-10">
                        <div className="flex flex-wrap items-center gap-3 mb-5">
                            <span className="px-4 py-1.5 rounded-full bg-purple-900 text-white text-xs font-bold tracking-wider uppercase shadow-sm">
                                {blog.category}
                            </span>
                            <span className="flex items-center text-sm text-gray-500 font-medium">
                                <CalendarDays className="mr-2 h-4 w-4 text-purple-900" />
                                {formatDateSafe(blog.publishedAt)}
                            </span>
                        </div>

                        <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-gray-900 leading-tight mb-6 tracking-tight">
                            {blog.title}
                        </h1>

                        {/* Author & Actions Bar */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-900 to-purple-700 flex items-center justify-center text-white shadow-md">
                                    <User className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-base font-bold text-gray-900">Manyazewal Eshetu</p>
                                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Admin • 5 min read</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <button className="p-2.5 rounded-full bg-purple-100 text-purple-900 hover:bg-purple-900 hover:text-white transition-colors duration-200">
                                    <Heart className="w-5 h-5" />
                                </button>
                                <button className="p-2.5 rounded-full bg-purple-100 text-purple-900 hover:bg-purple-900 hover:text-white transition-colors duration-200">
                                    <Share2 className="w-5 h-5" />
                                </button>
                                {blog.uploadStatus === "completed" && (blog.fileUrl || blog.Video || blog.Image) && (
                                    <a
                                      href={blog.fileUrl || blog.Video || blog.Image}
                                      download={blog.originalFileName || `${blog.title}.${blog.format || (currentMediaType === 'video' ? 'mp4' : 'jpg')}`}
                                      className="p-2.5 rounded-full bg-purple-100 text-purple-900 hover:bg-purple-900 hover:text-white transition-colors duration-200"
                                      title="Download"
                                    >
                                      <Download className="w-5 h-5" />
                                    </a>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Tags */}
                    {blog.tags && blog.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-8">
                            {blog.tags.map((tag) => (
                                <span key={tag} className="px-3 py-1 bg-purple-100 text-purple-900 rounded-md text-sm font-medium hover:bg-purple-200 transition-colors cursor-default">
                                    #{tag}
                                </span>
                            ))}
                        </div>
                    )}

                    {/* Content Body */}
                    <div className="prose prose-lg max-w-none mb-16">
                        <div 
                            className="text-gray-700 leading-relaxed"
                            dangerouslySetInnerHTML={{ __html: blog.content }}
                        />
                    </div>

                    {/* Related Posts */}
                    {mediaBlogs.length > 0 && (
                        <div className="border-t border-purple-100 pt-12">
                            <h3 className="text-2xl font-bold text-gray-900 mb-8 flex items-center gap-3">
                                <span className="w-1 h-8 bg-purple-900 rounded-full"></span>
                                Related Media
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                {mediaBlogs.slice(0, 3).map(mediaBlog => (
                                    <div 
                                        key={mediaBlog._id}
                                        className="group cursor-pointer"
                                        onClick={() => onSelectBlog(mediaBlog)}
                                    >
                                        <div className="relative aspect-video rounded-xl overflow-hidden mb-4 bg-purple-100 shadow-sm group-hover:shadow-md transition-all duration-300">
                                            <BlogMediaPreview 
                                                blog={mediaBlog} 
                                                heightClass="h-full" 
                                                showPlayIcon={false}
                                                showMediaBadge={false}
                                            />
                                            <div className="absolute inset-0 bg-purple-900/20 group-hover:bg-purple-900/10 transition-colors" />
                                            <div className="absolute bottom-2 right-2 bg-purple-900/90 backdrop-blur-sm text-white px-2 py-1 rounded text-xs font-medium flex items-center gap-1">
                                                {getMediaType(mediaBlog) === 'video' ? <Video className="h-3 w-3" /> : <ImageIcon className="h-3 w-3" />}
                                            </div>
                                        </div>
                                        <h4 className="font-bold text-gray-900 leading-snug group-hover:text-purple-900 transition-colors line-clamp-2 mb-1">
                                            {mediaBlog.title}
                                        </h4>
                                        <p className="text-sm text-gray-500">
                                            {formatDateSafe(mediaBlog.publishedAt)}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    </main>

                    {/* Sidebar */}
                    <aside className="space-y-8">
                      {/* Search */}
                      <Card className="border-2 border-purple-100 rounded-xl">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-purple-900 flex items-center gap-2">
                            <Search className="h-5 w-5" />
                            Search
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="relative">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-purple-700" />
                            <Input
                              placeholder="Search posts..."
                              className="pl-8 border-2 border-purple-100 focus:border-purple-900 focus:ring-2 focus:ring-purple-200 rounded-xl"
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                            />
                          </div>
                        </CardContent>
                      </Card>

                      {/* Categories */}
                      <Card className="border-2 border-purple-100 rounded-xl">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-purple-900 flex items-center gap-2">
                            <Tag className="h-5 w-5" />
                            Category
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ScrollArea className="h-[300px] pr-4">
                            <div className="space-y-2">
                              {categoryList.map((category) => (
                                <Button
                                  key={category.name}
                                  variant="ghost"
                                  className="w-full justify-between font-normal hover:bg-purple-50 hover:text-purple-900 rounded-xl"
                                  onClick={() => {
                                    // Optional: Handle category click if needed
                                  }}
                                >
                                  {category.name}
                                  <Badge variant="outline" className="border-purple-200 text-purple-700">
                                    {category.count}
                                  </Badge>
                                </Button>
                              ))}
                            </div>
                          </ScrollArea>
                        </CardContent>
                      </Card>

                      {/* Recent Posts */}
                      <Card className="border-2 border-purple-100 rounded-xl">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-purple-900 flex items-center gap-2">
                            <Clock className="h-5 w-5" />
                            Recent Posts
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            {sidebarRecentPosts.map((post) => (
                              <div 
                                key={post._id} 
                                className="flex gap-4 cursor-pointer group"
                                onClick={() => onSelectBlog(post)}
                              >
                                <div className="relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden border-2 border-purple-100 group-hover:border-purple-300 transition-colors">
                                  <BlogMediaPreview blog={post} heightClass="h-full" showPlayIcon={false} showMediaBadge={false} />
                                </div>
                                <div className="space-y-1">
                                  <div className="text-sm font-medium text-purple-900">{post.category}</div>
                                  <h4 className="line-clamp-2 text-sm font-medium text-gray-700 group-hover:text-purple-900 transition-colors">
                                    {post.title}
                                  </h4>
                                  <div className="text-xs text-gray-500 flex items-center gap-1">
                                    <CalendarDays className="w-3 h-3 text-purple-700" />
                                    {formatDateSafe(post.publishedAt)}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>

                      {/* Tags */}
                      <Card className="border-2 border-purple-100 rounded-xl">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-purple-900 flex items-center gap-2">
                            <Tag className="h-5 w-5" />
                            Tags
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex flex-wrap gap-2">
                            {sidebarTags.map((tag) => (
                              <Badge
                                key={tag}
                                variant="secondary"
                                className="cursor-pointer bg-purple-100 text-purple-900 hover:bg-purple-200 rounded-full px-3 py-1"
                              >
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </CardContent>
                      </Card>

                      {/* Advertisement */}
                      <Card className="border-2 border-dashed border-purple-200 rounded-xl bg-gradient-to-br from-purple-50/50 to-white">
                        <CardContent className="flex items-center justify-center p-6">
                          <div className="text-center">
                            <Command className="mx-auto h-10 w-10 text-purple-400" />
                            <p className="mt-2 text-sm text-purple-900 font-medium">Advertisement Space</p>
                            <p className="text-xs text-gray-500 mt-1">Reach our audience</p>
                          </div>
                        </CardContent>
                      </Card>
                    </aside>
                  </div>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="sticky bottom-0 z-10 bg-white/90 backdrop-blur-lg border-t border-purple-100 p-4 md:p-6">
                  <div className="max-w-4xl mx-auto flex flex-col sm:flex-row gap-4">
                      <button
                          onClick={onClose}
                          className="flex-1 px-6 py-3 border-2 border-purple-200 text-purple-900 font-bold rounded-xl hover:bg-purple-50 transition-colors"
                      >
                          Close
                      </button>
                      <button 
                          onClick={() => setIsFullScreen(!isFullScreen)}
                          className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-800 to-purple-900 text-white font-bold rounded-xl hover:from-purple-900 hover:to-purple-950 transition-colors shadow-lg shadow-purple-900/25 flex items-center justify-center gap-2"
                      >
                          {isFullScreen ? <><X className="w-4 h-4"/> Exit Full Screen</> : <><Maximize2 className="w-4 h-4"/> Full Screen Mode</>}
                      </button>
                  </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>

    </>
  )
}

export function BlogSection() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [blogPosts, setBlogPosts] = useState<Blog[]>([])
  const [selectedBlog, setSelectedBlog] = useState<Blog | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  useEffect(() => {
    const fetchBlogPosts = async () => {
      try {
        // Fetch all active blog posts including all media types
        const response = await fetch("/api/blog?includeUploads=true&isActive=true&sort=publishedAt:desc&limit=3")
        const data = await response.json()
        if (data.success) {
          // Filter to only show completed or non-upload blogs that are active
          const filteredPosts = data.data
            .filter((post: Blog) => 
              post.isActive &&
              (!post.uploadStatus || 
              post.uploadStatus === "completed" || 
              post.uploadStatus === "failed")
            )
          setBlogPosts(filteredPosts)
        }
      } catch (error) {
        console.error("Error fetching blog posts:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchBlogPosts()
  }, [])

  const getContentPreview = (content: string) => {
    // Strip HTML tags for preview
    const plainText = content.replace(/<[^>]*>/g, "")
    if (plainText.length <= 100) return plainText
    return plainText.substring(0, 100) + "..."
  }

  const handleViewDetails = (blog: Blog) => {
    setSelectedBlog(blog)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setTimeout(() => setSelectedBlog(null), 300)
  }

  return (
    <>
      <motion.section
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="py-24 bg-gradient-to-b from-white to-purple-50/30"
      >
        <div className="container px-4 mx-auto sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="inline-block p-3 bg-purple-100 rounded-full mb-4"
            >
              <Command className="w-8 h-8 text-purple-900" />
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="text-5xl font-extrabold bg-gradient-to-r from-purple-900 to-purple-700 bg-clip-text text-transparent sm:text-6xl lg:text-7xl"
            >
              Latest from Our Blog
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="mt-4 text-xl text-gray-600"
            >
              Discover stories, recipes, and insights from Ethiopian cuisine
            </motion.p>
          </div>

          {/* Latest Posts Section - All blog types */}
          <div className="mt-16">
            <h3 className="text-3xl font-bold text-purple-900 mb-8">
              Latest Posts
            </h3>
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              <AnimatePresence>
                {isLoading
                  ? Array(3)
                      .fill(null)
                      .map((_, index) => (
                        <motion.div
                          key={`skeleton-${index}`}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          transition={{ duration: 0.5, delay: index * 0.1 }}
                        >
                          <SkeletonCard />
                        </motion.div>
                      ))
                  : blogPosts.slice(0, 3).map((post, index) => (
                      <motion.div
                        key={post._id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.5, delay: index * 0.1 }}
                        className="group relative flex flex-col h-full overflow-hidden rounded-2xl border-2 border-purple-100 bg-white shadow-lg transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
                      >
                        {/* Media Section */}
                        <div className="relative aspect-video overflow-hidden cursor-pointer" onClick={() => handleViewDetails(post)}>
                          <BlogMediaPreview blog={post} heightClass="h-full" />
                          {getStatusBadge(post)}
                          <div className="absolute top-4 left-4">
                             <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-900/90 text-white backdrop-blur-sm shadow-sm">
                                {post.category}
                             </span>
                          </div>
                        </div>

                        {/* Content Section */}
                        <div className="flex flex-col flex-grow p-6">
                          <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                            <CalendarDays className="w-3.5 h-3.5 text-purple-700" />
                            <span>{formatDateSafe(post.publishedAt)}</span>
                            <span className="w-1 h-1 rounded-full bg-purple-300" />
                            <Clock className="w-3.5 h-3.5 text-purple-700" />
                            <span>5 min read</span>
                          </div>

                          <h3 
                            className="text-xl font-bold text-gray-900 mb-3 line-clamp-2 group-hover:text-purple-900 transition-colors cursor-pointer"
                            onClick={() => handleViewDetails(post)}
                          >
                            {post.title}
                          </h3>
                          
                          <p className="text-gray-600 text-sm line-clamp-3 mb-4 flex-grow">
                            {getContentPreview(post.content)}
                          </p>
                          
                          {/* Tags */}
                          {post.tags && post.tags.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-6">
                              {post.tags.slice(0, 3).map((tag) => (
                                <span
                                  key={tag}
                                  className="inline-flex items-center px-2 py-1 rounded-md bg-purple-100 text-purple-900 text-xs font-medium"
                                >
                                  #{tag}
                                </span>
                              ))}
                              {post.tags.length > 3 && (
                                <span className="text-xs text-purple-700 px-2 py-1">
                                  +{post.tags.length - 3} more
                                </span>
                              )}
                            </div>
                          )}

                          {/* Actions */}
                          <div className="pt-4 mt-auto border-t border-purple-100">
                            <div className="grid grid-cols-2 gap-3">
                              <button
                                onClick={() => handleViewDetails(post)}
                                className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-purple-900 bg-white border-2 border-purple-200 rounded-lg hover:bg-purple-50 hover:border-purple-300 transition-colors"
                                disabled={post.uploadStatus === "failed" || post.uploadStatus === "uploading" || post.uploadStatus === "processing"}
                              >
                                {post.uploadStatus === "failed" ? (
                                  <>
                                    <AlertTriangle className="w-4 h-4" /> Unavailable
                                  </>
                                ) : post.uploadStatus === "uploading" || post.uploadStatus === "processing" ? (
                                  <>
                                    <Loader2 className="w-4 h-4 animate-spin" /> Processing
                                  </>
                                ) : (
                                  <>
                                    <Eye className="w-4 h-4" /> Quick View
                                  </>
                                )}
                              </button>
                            
                              <button
                                onClick={() => router.push(`/blogs/${post._id}`)}
                                className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-purple-800 to-purple-900 rounded-lg hover:from-purple-900 hover:to-purple-950 transition-colors"
                                disabled={post.uploadStatus === "failed" || post.uploadStatus === "uploading" || post.uploadStatus === "processing"}
                              >
                                <span className="truncate">Read Article</span>
                                <ChevronRight className="w-4 h-4" />
                              </button>
                            </div>
                            
                            {/* Upload progress indicator */}
                            {(post.uploadStatus === "uploading" || post.uploadStatus === "processing") && post.uploadProgress && (
                              <div className="mt-3">
                                <div className="w-full bg-purple-100 rounded-full h-1.5 overflow-hidden">
                                  <div 
                                    className="bg-gradient-to-r from-purple-800 to-purple-900 h-full rounded-full transition-all duration-300"
                                    style={{ width: `${post.uploadProgress}%` }}
                                  ></div>
                                </div>
                                <p className="text-[10px] text-purple-700 text-center mt-1">
                                  {post.uploadStatus === "uploading" ? "Uploading..." : "Processing..."} {post.uploadProgress}%
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
              </AnimatePresence>
            </div>
          </div>
          
          {/* Empty state */}
          {!isLoading && blogPosts.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <div className="mx-auto w-24 h-24 bg-purple-100 rounded-full flex items-center justify-center mb-4">
                <EyeOff className="h-12 w-12 text-purple-900" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-purple-900">No blog posts available</h3>
              <p className="text-gray-600 mb-4">
                Check back later for new content or contact the administrator.
              </p>
            </motion.div>
          )}
          
          <motion.div
            className="text-center mt-16"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
          >
            <Link href="/blogs" passHref>
              <BrutalButton>View All Posts</BrutalButton>
            </Link>
          </motion.div>
        </div>
      </motion.section>

      {/* Blog Detail Modal */}
      {selectedBlog && (
        <BlogDetailModal 
          blog={selectedBlog} 
          allBlogs={blogPosts}
          isOpen={isModalOpen} 
          onClose={handleCloseModal}
          onSelectBlog={setSelectedBlog}
        />
      )}
    </>
  )
}
