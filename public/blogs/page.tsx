"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import { Command, Search, CalendarDays, Play, Video, ImageIcon, Eye, Maximize2, Loader2, AlertTriangle, Heart, Share2, Download, User, Tag, X, CheckCircle2, Clock, FileText } from 'lucide-react'
import { motion, AnimatePresence } from "framer-motion"
import { isValid, format } from "date-fns"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { NavBar } from "@/components/NavBar"
import { Pagination } from "@/components/Pagination"

export interface Blog {
  _id: string
  title: string
  content: string
  category: string
  tags: string[]
  Image?: string
  Video?: string
  mediaType?: "image" | "video" | "none" | string
  isActive: boolean
  excerpt: string
  views: number
  uploadStatus?: "completed" | "uploading" | "processing" | "failed" | "pending"
  uploadProgress?: number
  fileUrl?: string
  thumbnailUrl?: string
  publicId?: string
  format?: string
  fileSize?: number
  originalFileName?: string
  mimeType?: string
  error?: string
  publishedAt: string
  createdAt: string
  updatedAt: string
  completedAt?: string
  failedAt?: string
}

export type Post = Blog

const formatDateSafe = (dateString?: string | Date): string => {
  if (!dateString) return "No date"
  try {
    const date = new Date(dateString)
    if (!isValid(date)) return "Invalid date"
    return format(date, "MMM dd, yyyy")
  } catch {
    return "Invalid date"
  }
}

const POSTS_PER_PAGE = 5

// Helper to extract embed URL from YouTube/Vimeo links
const getEmbedUrl = (url: string) => {
  if (!url) return null
  
  // YouTube (watch, shorts, live, embed, v, e, youtu.be)
  const youtubeRegex = /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/|v\/|e\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/i
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

// Media Preview Component
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
  const [isVideoLoading, setIsVideoLoading] = React.useState(true)
  const [videoError, setVideoError] = React.useState(false)
  
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
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <Play className="w-6 h-6 text-white" />
              </div>
            </div>
          )}
          {showMediaBadge && (
            <div className="absolute bottom-4 left-4 bg-black/70 text-white px-2 py-1 rounded text-xs font-medium flex items-center gap-1">
              <Video className="h-3 w-3" /> Video
            </div>
          )}
          {showFullScreen && onFullScreenClick && (
            <button
              onClick={onFullScreenClick}
              className="absolute top-4 right-4 p-2 bg-black/50 backdrop-blur-sm rounded-full hover:bg-black/70 transition-colors z-10"
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
            <div className="absolute bottom-4 left-4 bg-black/70 text-white px-2 py-1 rounded text-xs font-medium flex items-center gap-1">
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
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-white animate-spin" />
            </div>
          )}
          
          {videoError && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <div className="text-center">
                <Video className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                <p className="text-sm text-gray-400">Video not available</p>
                <p className="text-xs text-gray-500 mt-1">URL: {videoSource.substring(0, 50)}...</p>
              </div>
            </div>
          )}
          
          {showPlayIcon && !videoError && (
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <Play className="w-6 h-6 text-white" />
              </div>
            </div>
          )}
          
          {showMediaBadge && !videoError && (
            <div className="absolute bottom-4 left-4 bg-black/70 text-white px-2 py-1 rounded text-xs font-medium flex items-center gap-1">
              <Video className="h-3 w-3" /> Video
            </div>
          )}
          
          {showFullScreen && onFullScreenClick && !videoError && (
            <button
              onClick={onFullScreenClick}
              className="absolute top-4 right-4 p-2 bg-black/50 backdrop-blur-sm rounded-full hover:bg-black/70 transition-colors z-10"
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
      <div className={`relative ${heightClass} w-full`}>
        <Image 
          src={imageSource} 
          alt={blog.title} 
          layout="fill" 
          objectFit={objectFit} 
          className="transition-transform duration-300 hover:scale-105"
          onError={(e) => {
            console.error("Image loading error:", e)
            e.currentTarget.src = "/placeholder.svg"
          }}
        />
        {showMediaBadge && (
          <div className="absolute bottom-4 left-4 bg-black/70 text-white px-2 py-1 rounded text-xs font-medium flex items-center gap-1">
            <ImageIcon className="h-3 w-3" /> Image
          </div>
        )}
        {showFullScreen && onFullScreenClick && (
          <button
            onClick={onFullScreenClick}
            className="absolute top-4 right-4 p-2 bg-black/50 backdrop-blur-sm rounded-full hover:bg-black/70 transition-colors z-10"
          >
            <Maximize2 className="w-5 h-5 text-white" />
          </button>
        )}
      </div>
    )
  }
  
  // Fallback for no media
  return (
    <div className={`relative ${heightClass} w-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center`}>
      <div className="text-gray-400 dark:text-gray-500 text-center">
        <div className="mb-2">
          {blog.mediaType === 'video' ? <Video className="h-12 w-12 mx-auto" /> : 
           blog.mediaType === 'image' ? <ImageIcon className="h-12 w-12 mx-auto" /> : 
           <FileText className="h-12 w-12 mx-auto" />}
        </div>
        <p className="text-sm">No media available</p>
        <p className="text-xs mt-1">Type: {blog.mediaType || 'none'}</p>
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

// Blog Detail Modal Component
const BlogDetailModal = ({ 
  blog: initialBlog, 
  allBlogs,
  isOpen, 
  onClose,
  onSelectBlog
}: { 
  blog: Blog;
  allBlogs: Blog[];
  isOpen: boolean; 
  onClose: () => void; 
  onSelectBlog: (blog: Blog) => void;
}) => {
  const [blog, setBlog] = React.useState<Blog>(initialBlog)
  const [searchQuery, setSearchQuery] = React.useState("")

  React.useEffect(() => {
    setBlog(initialBlog)
  }, [initialBlog])

  // Derived data for sidebar
  const categoryList = React.useMemo(() => {
    const counts = allBlogs.reduce((acc, post) => {
      const cat = post.category || 'Other';
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return Object.entries(counts).map(([name, count]) => ({ name, count }));
  }, [allBlogs]);

  const sidebarRecentPosts = React.useMemo(() => {
    return allBlogs
      .filter(p => p._id !== blog._id)
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
      .slice(0, 4);
  }, [allBlogs, blog._id]);

  const sidebarTags = React.useMemo(() => {
    return Array.from(new Set(allBlogs.flatMap(p => p.tags || []))).slice(0, 15);
  }, [allBlogs]);

  // Get related media blogs
  const mediaBlogs = React.useMemo(() => {
    return allBlogs.filter(b => {
      const hasMedia = b.Video || b.Image || b.fileUrl || isVideoUrl(b.fileUrl) || isImageUrl(b.fileUrl);
      return hasMedia && b._id !== blog._id;
    });
  }, [allBlogs, blog._id]);

  if (!isOpen) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="relative bg-white dark:bg-gray-950 w-full overflow-hidden shadow-2xl flex flex-col rounded-2xl max-w-5xl max-h-[90vh] border border-gray-200 dark:border-gray-800"
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-50 p-2 bg-black/50 hover:bg-black/70 text-white backdrop-blur-sm rounded-full transition-all duration-200 hover:scale-110"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col h-full overflow-y-auto custom-scrollbar scroll-smooth">
          {/* Content section */}
          <div className="flex-1 bg-background relative">
             <div className="container px-4 py-8 mx-auto">
              <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
                {/* Main Content */}
                <main className="space-y-8">
                
                {/* Media Section */}
                <div className="rounded-xl overflow-hidden shadow-lg bg-black">
                  <BlogMediaPreview 
                    blog={blog}
                    heightClass="aspect-video"
                    objectFit="contain"
                    showPlayIcon={false}
                    showMediaBadge={false}
                    showFullScreen={false}
                  />
                </div>

                {/* Header Info */}
                <div className="mb-10 border-b border-gray-100 dark:border-gray-800 pb-10">
                    <div className="flex flex-wrap items-center gap-3 mb-5">
                        <span className="px-4 py-1.5 rounded-full bg-primary text-white text-xs font-bold tracking-wider uppercase shadow-sm">
                            {blog.category}
                        </span>
                        <span className="flex items-center text-sm text-gray-500 dark:text-gray-400 font-medium">
                            <CalendarDays className="mr-2 h-4 w-4 text-primary" />
                            {formatDateSafe(blog.publishedAt)}
                        </span>
                    </div>

                    <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-gray-900 dark:text-white leading-tight mb-6 tracking-tight">
                        {blog.title}
                    </h1>

                    {/* Author & Actions Bar */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white shadow-md">
                                <User className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-base font-bold text-gray-900 dark:text-white">Manyazewal Eshetu</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">Admin • 5 min read</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <button className="p-2.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-primary hover:text-white transition-colors duration-200">
                                <Heart className="w-5 h-5" />
                            </button>
                            <button className="p-2.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-primary hover:text-white transition-colors duration-200">
                                <Share2 className="w-5 h-5" />
                            </button>
                            {blog.uploadStatus === "completed" && (blog.fileUrl || blog.Video || blog.Image) && (
                                <a
                                  href={blog.fileUrl || blog.Video || blog.Image}
                                  download={blog.originalFileName || `${blog.title}`}
                                  className="p-2.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-primary hover:text-white transition-colors duration-200"
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
                            <span key={tag} className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-md text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-default">
                                #{tag}
                            </span>
                        ))}
                    </div>
                )}

                {/* Content Body */}
                <div className="prose prose-lg dark:prose-invert max-w-none mb-16">
                    <div 
                        className="text-gray-700 dark:text-gray-300 leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: blog.content }}
                    />
                </div>

                {/* Related Posts */}
                {mediaBlogs.length > 0 && (
                    <div className="border-t border-gray-200 dark:border-gray-800 pt-12">
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-8 flex items-center gap-3">
                            <span className="w-1 h-8 bg-primary rounded-full"></span>
                            Related Media
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            {mediaBlogs.slice(0, 3).map(mediaBlog => (
                                <div 
                                    key={mediaBlog._id}
                                    className="group cursor-pointer"
                                    onClick={() => onSelectBlog(mediaBlog)}
                                >
                                    <div className="relative aspect-video rounded-xl overflow-hidden mb-4 bg-gray-100 dark:bg-gray-800 shadow-sm group-hover:shadow-md transition-all duration-300">
                                        <BlogMediaPreview 
                                            blog={mediaBlog} 
                                            heightClass="h-full" 
                                            showPlayIcon={false}
                                            showMediaBadge={false}
                                        />
                                        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
                                        <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-sm text-white px-2 py-1 rounded text-xs font-medium flex items-center gap-1">
                                            {isVideoUrl(mediaBlog.fileUrl || mediaBlog.Video) ? <Video className="h-3 w-3" /> : <ImageIcon className="h-3 w-3" />}
                                        </div>
                                    </div>
                                    <h4 className="font-bold text-gray-900 dark:text-white leading-snug group-hover:text-primary transition-colors line-clamp-2 mb-1">
                                        {mediaBlog.title}
                                    </h4>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
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
                  <Card>
                    <CardHeader>
                      <CardTitle>Search</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search posts..."
                          className="pl-8"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Categories */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Category</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-[300px] pr-4">
                        <div className="space-y-2">
                          {categoryList.map((category) => (
                            <Button
                              key={category.name}
                              variant="ghost"
                              className="w-full justify-between font-normal"
                            >
                              {category.name}
                              <span className="text-muted-foreground">({category.count})</span>
                            </Button>
                          ))}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>

                  {/* Recent Posts */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Recent Posts</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {sidebarRecentPosts.map((post) => (
                          <div 
                            key={post._id} 
                            className="flex gap-4 cursor-pointer group"
                            onClick={() => onSelectBlog(post)}
                          >
                            <div className="relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden">
                              <BlogMediaPreview blog={post} heightClass="h-full" showPlayIcon={false} showMediaBadge={false} />
                            </div>
                            <div className="space-y-1">
                              <div className="text-sm font-medium text-muted-foreground">{post.category}</div>
                              <h4 className="line-clamp-2 text-sm font-medium group-hover:text-primary transition-colors">
                                {post.title}
                              </h4>
                              <div className="text-xs text-muted-foreground">{formatDateSafe(post.publishedAt)}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Tags */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Tags</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {sidebarTags.map((tag) => (
                          <Badge
                            key={tag}
                            variant="secondary"
                            className="cursor-pointer hover:bg-secondary/80"
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Advertisement */}
                  <Card className="border-2 border-dashed">
                    <CardContent className="flex items-center justify-center p-6">
                      <div className="text-center">
                        <Command className="mx-auto h-10 w-10 text-muted-foreground" />
                        <p className="mt-2 text-sm text-muted-foreground">Advertisement Space</p>
                      </div>
                    </CardContent>
                  </Card>
                </aside>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="sticky bottom-0 z-10 bg-white/90 dark:bg-gray-950/90 backdrop-blur-lg border-t border-gray-200 dark:border-gray-800 p-4 md:p-6">
              <div className="max-w-4xl mx-auto flex flex-col sm:flex-row gap-4">
                  <button
                      onClick={onClose}
                      className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                      Close
                  </button>
              </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default function BlogLayout() {
  const [searchQuery, setSearchQuery] = React.useState("")
  const [selectedCategory, setSelectedCategory] = React.useState<string | null>(null)
  const [selectedTag, setSelectedTag] = React.useState<string | null>(null)
  const [currentPage, setCurrentPage] = React.useState(1)
  const [blogPosts, setBlogPosts] = React.useState<Blog[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [selectedBlog, setSelectedBlog] = React.useState<Blog | null>(null)
  const [isModalOpen, setIsModalOpen] = React.useState(false)

  // Fetch blog posts
  React.useEffect(() => {
    const fetchBlogPosts = async () => {
      try {
        const response = await fetch("/api/blog?includeUploads=true&isActive=true&sort=publishedAt:desc&limit=100")
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

  // Get content preview
  const getContentPreview = (content: string) => {
    const plainText = content.replace(/<[^>]*>/g, "")
    if (plainText.length <= 150) return plainText
    return plainText.substring(0, 150) + "..."
  }

  // Filter posts based on search, category, and tag
  const filteredPosts = React.useMemo(() => {
    return blogPosts.filter((post) => {
      const matchesSearch = post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          post.content.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesCategory = !selectedCategory || post.category === selectedCategory
      const matchesTag = !selectedTag || post.tags.includes(selectedTag)
      
      return matchesSearch && matchesCategory && matchesTag
    })
  }, [blogPosts, searchQuery, selectedCategory, selectedTag])

  // Paginate posts
  const paginatedPosts = React.useMemo(() => {
    const startIndex = (currentPage - 1) * POSTS_PER_PAGE
    return filteredPosts.slice(startIndex, startIndex + POSTS_PER_PAGE)
  }, [filteredPosts, currentPage])

  // Get recent posts (last 3)
  const recentPosts = React.useMemo(() => {
    return [...blogPosts]
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
      .slice(0, 3)
  }, [blogPosts])

  // Get categories from blog posts
  const blogCategories = React.useMemo(() => {
    const counts = blogPosts.reduce((acc, post) => {
      const cat = post.category || 'Other';
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return Object.entries(counts).map(([name, count]) => ({ name, count }));
  }, [blogPosts])

  // Get tags from blog posts
  const blogTags = React.useMemo(() => {
    return Array.from(new Set(blogPosts.flatMap(post => post.tags || [])));
  }, [blogPosts])

  const handleCategoryClick = (category: string) => {
    setSelectedCategory(selectedCategory === category ? null : category)
    setSelectedTag(null)
    setCurrentPage(1)
  }

  const handleTagClick = (tag: string) => {
    setSelectedTag(selectedTag === tag ? null : tag)
    setSelectedCategory(null)
    setCurrentPage(1)
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleViewDetails = (blog: Blog) => {
    setSelectedBlog(blog)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setTimeout(() => setSelectedBlog(null), 300)
  }

  // Skeleton Card
  const SkeletonCard = () => (
    <div className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-lg animate-pulse">
      <div className="h-64 bg-gray-300 dark:bg-gray-700"></div>
      <div className="p-6">
        <div className="h-6 bg-gray-300 dark:bg-gray-700 rounded w-3/4 mb-4"></div>
        <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-full mb-2"></div>
        <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-2/3"></div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-background">
      <NavBar />
      <div className="container px-4 py-8 mx-auto">
        <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
          {/* Main Content */}
          <main className="space-y-8">
            {selectedCategory && (
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Filtered by category:</span>
                <Badge variant="secondary" className="cursor-pointer" onClick={() => setSelectedCategory(null)}>
                  {selectedCategory} ×
                </Badge>
              </div>
            )}
            {selectedTag && (
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Filtered by tag:</span>
                <Badge variant="secondary" className="cursor-pointer" onClick={() => setSelectedTag(null)}>
                  {selectedTag} ×
                </Badge>
              </div>
            )}

            {isLoading ? (
              <div className="space-y-8">
                {Array(3).fill(null).map((_, index) => (
                  <SkeletonCard key={index} />
                ))}
              </div>
            ) : paginatedPosts.length === 0 ? (
              <div className="text-center py-12">
                <div className="mx-auto w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                  <AlertTriangle className="h-12 w-12 text-gray-400" />
                </div>
                <h2 className="text-xl font-semibold">No posts found</h2>
                <p className="text-muted-foreground mt-2">Try adjusting your search or filters</p>
              </div>
            ) : (
              <>
                <AnimatePresence>
                  {paginatedPosts.map((post) => (
                    <motion.article
                      key={post._id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-lg transition-all duration-300 hover:shadow-xl h-full flex flex-col"
                    >
                      {/* Media Preview */}
                      <div 
                        className="relative cursor-pointer overflow-hidden group"
                        onClick={() => handleViewDetails(post)}
                      >
                        <BlogMediaPreview blog={post} />
                        {getStatusBadge(post)}
                        <div className="absolute top-4 left-4 bg-black/80 text-white px-3 py-1 rounded-full text-sm font-semibold">
                          {post.category}
                        </div>
                      </div>

                      <div className="p-6 flex-grow">
                        <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mb-3">
                          <CalendarDays className="mr-2 h-4 w-4" />
                          {formatDateSafe(post.publishedAt)}
                        </div>
                        
                        <h2 className="text-2xl font-bold tracking-tight mb-3 text-gray-900 dark:text-white group-hover:text-primary transition-colors">
                          {post.title}
                        </h2>
                        
                        <p className="text-muted-foreground leading-relaxed mb-4">
                          {getContentPreview(post.content)}
                        </p>

                        {/* Tags */}
                        {post.tags && post.tags.length > 0 && (
                          <div className="mt-4 flex flex-wrap gap-2 mb-4">
                            {post.tags.slice(0, 3).map((tag) => (
                              <span
                                key={tag}
                                className="bg-primary/10 text-primary px-2 py-1 rounded-full text-xs"
                              >
                                {tag}
                              </span>
                            ))}
                            {post.tags.length > 3 && (
                              <span className="text-xs text-gray-500 px-2 py-1">
                                +{post.tags.length - 3} more
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
                        <div className="flex justify-between items-center">
                          <button
                            onClick={() => handleViewDetails(post)}
                            className="px-6 py-2 border-2 border-black dark:border-white uppercase bg-white dark:bg-black text-black dark:text-white transition duration-200 text-sm font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={post.uploadStatus === "failed" || post.uploadStatus === "uploading" || post.uploadStatus === "processing"}
                          >
                            {post.uploadStatus === "failed" ? (
                              <>
                                <AlertTriangle className="h-4 w-4" /> Unavailable
                              </>
                            ) : post.uploadStatus === "uploading" || post.uploadStatus === "processing" ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" /> Processing
                              </>
                            ) : (
                              <>
                                <Eye className="h-4 w-4" /> View Details
                              </>
                            )}
                          </button>

                          {/* Upload progress indicator */}
                          {(post.uploadStatus === "uploading" || post.uploadStatus === "processing") && post.uploadProgress && (
                            <div className="text-xs text-gray-500">
                              <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                <div 
                                  className="bg-yellow-500 h-2 rounded-full transition-all duration-300"
                                  style={{ width: `${post.uploadProgress}%` }}
                                ></div>
                              </div>
                              <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-1">
                                {post.uploadProgress}%
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.article>
                  ))}
                </AnimatePresence>

                <Pagination
                  currentPage={currentPage}
                  totalItems={filteredPosts.length}
                  pageSize={POSTS_PER_PAGE}
                  onPageChange={handlePageChange}
                />
              </>
            )}
          </main>

          {/* Sidebar */}
          <aside className="space-y-8">
            {/* Search */}
            <Card>
              <CardHeader>
                <CardTitle>Search</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search posts..."
                    className="pl-8"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Categories */}
            <Card>
              <CardHeader>
                <CardTitle>Category</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px] pr-4">
                  <div className="space-y-2">
                    {blogCategories.map((category) => (
                      <Button
                        key={category.name}
                        variant={selectedCategory === category.name ? "secondary" : "ghost"}
                        className="w-full justify-between font-normal"
                        onClick={() => handleCategoryClick(category.name)}
                      >
                        {category.name}
                        <span className="text-muted-foreground">({category.count})</span>
                      </Button>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Recent Posts */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Posts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentPosts.map((post) => (
                    <div 
                      key={post._id} 
                      className="flex gap-4 cursor-pointer group"
                      onClick={() => handleViewDetails(post)}
                    >
                      <div className="relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden">
                        <BlogMediaPreview 
                          blog={post} 
                          heightClass="h-full" 
                          showPlayIcon={false} 
                          showMediaBadge={false}
                        />
                      </div>
                      <div className="space-y-1">
                        <div className="text-sm font-medium text-muted-foreground">{post.category}</div>
                        <h4 className="line-clamp-2 text-sm font-medium group-hover:text-primary transition-colors">
                          {post.title}
                        </h4>
                        <div className="text-xs text-muted-foreground">{formatDateSafe(post.publishedAt)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Tags */}
            <Card>
              <CardHeader>
                <CardTitle>Tags</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {blogTags.map((tag) => (
                    <Badge
                      key={tag}
                      variant={selectedTag === tag ? "default" : "secondary"}
                      className="cursor-pointer hover:bg-secondary-hover"
                      onClick={() => handleTagClick(tag)}
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Newsletter Subscription */}
            <Card>
              <CardHeader>
                <CardTitle>Subscribe to Newsletter</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={(e) => e.preventDefault()} className="space-y-2">
                  <Input placeholder="Enter your email" type="email" />
                  <Button className="w-full">Subscribe</Button>
                </form>
              </CardContent>
            </Card>

            {/* Advertisement */}
            <Card className="border-2 border-dashed">
              <CardContent className="flex items-center justify-center p-6">
                <div className="text-center">
                  <Command className="mx-auto h-10 w-10 text-muted-foreground" />
                  <p className="mt-2 text-sm text-muted-foreground">Advertisement Space</p>
                </div>
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>

      {/* Blog Detail Modal */}
      <AnimatePresence>
        {selectedBlog && (
          <BlogDetailModal 
            blog={selectedBlog}
            allBlogs={blogPosts}
            isOpen={isModalOpen}
            onClose={handleCloseModal}
            onSelectBlog={setSelectedBlog}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
