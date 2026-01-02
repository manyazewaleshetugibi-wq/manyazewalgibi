"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { useInView } from "react-intersection-observer"
import { Calendar, Clock, User, Tag, Share2, ChevronLeft, Bookmark, BookmarkCheck, Play, Video, ImageIcon, FileText, Maximize2 } from "lucide-react"

import { NavBar } from "@/components/NavBar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface BlogPost {
  _id: string
  title: string
  content: string
  category: string
  tags: string[]
  publishedAt: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  Image?: string
  Video?: string
  mediaType?: "image" | "video" | "none" | string
  fileUrl?: string
  thumbnailUrl?: string
  author?: {
    name: string
    avatar: string
  }
  readTime?: number
  excerpt?: string
}

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
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

// Helper function to determine if URL is a video
const isVideoUrl = (url?: string): boolean => {
  if (!url) return false
  const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.m3u8']
  const videoDomains = ['youtube.com', 'youtu.be', 'vimeo.com', 'wistia.com', 'dailymotion.com']
  
  if (videoExtensions.some(ext => url.toLowerCase().includes(ext))) return true
  if (videoDomains.some(domain => url.toLowerCase().includes(domain))) return true
  return false
}

// Helper function to determine if URL is an image
const isImageUrl = (url?: string): boolean => {
  if (!url) return false
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp']
  if (imageExtensions.some(ext => url.toLowerCase().includes(ext))) return true
  if (url.startsWith('data:image/')) return true
  return false
}

const BlogMediaPreview = ({ 
  blog, 
  heightClass = "h-64", 
  objectFit = "cover"
}: { 
  blog: BlogPost; 
  heightClass?: string; 
  objectFit?: "cover" | "contain";
}) => {
  const videoSource = blog.fileUrl || blog.Video || ""
  const embedUrl = getEmbedUrl(videoSource)
  const imageSource = blog.Image || blog.fileUrl
  
  const isVideo = isVideoUrl(videoSource) || !!embedUrl || blog.mediaType === 'video'
  const isImage = isImageUrl(imageSource) || blog.mediaType === 'image'
  
  if (isVideo) {
    if (embedUrl) {
      return (
        <div className={`relative ${heightClass} w-full bg-black`}>
          <iframe src={embedUrl} className="w-full h-full pointer-events-none" title={blog.title} frameBorder="0" />
          <div className="absolute inset-0 bg-transparent" />
          <div className="absolute bottom-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-xs font-medium flex items-center gap-1">
            <Video className="h-3 w-3" /> Video
          </div>
        </div>
      )
    }
    return (
      <div className={`relative ${heightClass} w-full group bg-black`}>
        <video src={videoSource} className={`w-full h-full object-${objectFit}`} muted playsInline preload="metadata" />
        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <Play className="w-6 h-6 text-white" />
          </div>
        </div>
        <div className="absolute bottom-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-xs font-medium flex items-center gap-1">
          <Video className="h-3 w-3" /> Video
        </div>
      </div>
    )
  }
  
  if (isImage && imageSource) {
    return (
      <div className={`relative ${heightClass} w-full`}>
        <Image src={imageSource} alt={blog.title} layout="fill" objectFit={objectFit} className="transition-transform duration-300 hover:scale-105" />
      </div>
    )
  }
  
  return (
    <div className={`relative ${heightClass} w-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center`}>
      <div className="text-gray-400 text-center">
        <FileText className="h-12 w-12 mx-auto mb-2" />
        <p className="text-xs">No media</p>
      </div>
    </div>
  )
}

export default function BlogDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const [post, setPost] = useState<BlogPost | null>(null)
  const [relatedPosts, setRelatedPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [bookmarked, setBookmarked] = useState(false)

  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  })

  useEffect(() => {
    if (!id) return

    const fetchPost = async () => {
      try {
        const response = await fetch(`/api/blog/${id}`)
        if (!response.ok) throw new Error("Failed to fetch data")

        const data = await response.json()
        if (!data.success) throw new Error(data.message || "Failed to fetch post")

        const postData = data.data
        
        setPost({
          ...postData,
          author: {
            name: "Manyazewal Eshetu Gibi",
            avatar: "/man_logo.png",
          },
          readTime: 5, // Could calculate based on content length
        })

        // The API returns related posts in the same response
        if (postData.related) {
          setRelatedPosts(postData.related)
        }
      } catch (err) {
        setError("Failed to load blog post. Please try again later.")
      } finally {
        setLoading(false)
      }
    }

    fetchPost()
  }, [id])

  const handleBookmark = () => {
    setBookmarked(!bookmarked)
    // TODO: Implement actual bookmarking logic
  }

  const handleShare = () => {
    // TODO: Implement sharing functionality
    alert("Sharing functionality to be implemented")
  }

  if (loading) return <BlogDetailSkeleton />
  if (error) return <ErrorMessage message={error} />
  if (!post) return <ErrorMessage message="Blog post not found" />

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/10">
      <NavBar />
      <main className="container mx-auto px-4 py-8">
        <motion.div className="mb-8" initial="initial" animate="animate" exit="exit" variants={fadeInUp}>
          <Button variant="ghost" onClick={() => router.back()} className="mb-4">
            <ChevronLeft className="mr-2 h-4 w-4" /> Back to Blog
          </Button>
          
          <div className="relative rounded-lg overflow-hidden w-full aspect-video mb-8 bg-black">
            {post.mediaType === 'video' && (post.fileUrl || post.Video) ? (
              getEmbedUrl(post.fileUrl || post.Video || "") ? (
                <iframe
                  src={getEmbedUrl(post.fileUrl || post.Video || "") || ""}
                  className="w-full h-full"
                  title={post.title}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <video
                  src={post.fileUrl || post.Video}
                  className="w-full h-full object-contain"
                  controls
                />
              )
            ) : (
              <BlogMediaPreview blog={post} heightClass="h-full" objectFit="contain" />
            )}
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">{post.title}</h1>
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-6">
            <Badge variant="secondary">{post.category}</Badge>
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {new Date(post.publishedAt).toLocaleDateString()}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {post.readTime} min read
            </span>
            <span className="flex items-center gap-1">
              <User className="w-4 h-4" />
              {post.author?.name}
            </span>
          </div>
          <div className="flex flex-wrap gap-2 mb-8">
            {post.tags && post.tags.map((tag) => (
              <Badge key={tag} variant="outline" className="flex items-center gap-1">
                <Tag className="w-3 h-3" />
                {tag}
              </Badge>
            ))}
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8">
          <motion.div
            className="prose prose-lg dark:prose-invert max-w-none"
            initial="initial"
            animate="animate"
            exit="exit"
            variants={fadeInUp}
          >
            <div dangerouslySetInnerHTML={{ __html: post.content }} />
          </motion.div>

          <aside className="space-y-8">
            <AuthorCard author={post.author!} />
            <TableOfContents content={post.content} />
          </aside>
        </div>

        <motion.div
          ref={ref}
          initial="initial"
          animate={inView ? "animate" : "initial"}
          exit="exit"
          variants={fadeInUp}
        >
          <h2 className="text-3xl font-bold tracking-tight mt-16 mb-8">Related Posts</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {relatedPosts.map((relatedPost) => (
              <RelatedPostCard key={relatedPost._id} post={relatedPost} />
            ))}
          </div>
        </motion.div>
      </main>
    </div>
  )
}

const AuthorCard: React.FC<{ author: BlogPost["author"] }> = ({ author }) => (
  <Card className="overflow-hidden">
    <CardContent className="p-6 bg-gradient-to-br from-primary/10 to-secondary/10">
      <div className="flex items-center gap-4">
        <Avatar className="h-16 w-16 border-2 border-primary">
          <AvatarImage src={author?.avatar} alt={author?.name} />
          <AvatarFallback>{author?.name.charAt(0)}</AvatarFallback>
        </Avatar>
        <div>
          <h3 className="text-lg font-semibold">{author?.name}</h3>
          <p className="text-sm text-muted-foreground">Marketing Team</p>
        </div>
      </div>
      <p className="mt-4 text-sm">Passionate about creating engaging content and driving marketing strategies.</p>
    </CardContent>
  </Card>
)

const TableOfContents: React.FC<{ content: string }> = ({ content }) => {
  const headings = content.match(/<h[2-3][^>]*>(.*?)<\/h[2-3]>/g) || []
  const toc = headings.map((heading) => {
    const level = heading.charAt(2)
    const text = heading.replace(/<[^>]+>/g, "")
    return { level, text }
  })

  return (
    <Card>
      <CardContent className="p-4">
        <h4 className="text-lg font-semibold mb-2">Table of Contents</h4>
        <ul className="space-y-1">
          {toc.map((item, index) => (
            <li key={index} className={`${item.level === "2" ? "ml-0" : "ml-4"}`}>
              <a href={`#${item.text.toLowerCase().replace(/\s+/g, "-")}`} className="text-sm hover:underline">
                {item.text}
              </a>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

const RelatedPostCard: React.FC<{ post: BlogPost }> = ({ post }) => (
  <Card className="overflow-hidden group hover:shadow-lg transition-shadow duration-300">
    <div className="relative h-48 overflow-hidden">
      <BlogMediaPreview blog={post} heightClass="h-full" />
      
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
      <Badge className="absolute top-2 left-2">{post.category}</Badge>
    </div>
    <CardContent className="p-6 relative z-10 -mt-10 bg-gradient-to-t from-background via-background to-transparent">
      <h3 className="text-xl font-semibold mb-2 line-clamp-2 group-hover:text-primary transition-colors">
        <Link href={`/blog/${post._id}`}>{post.title}</Link>
      </h3>
      <p className="text-muted-foreground mb-4 line-clamp-2">{(post.excerpt || post.content || "").replace(/<[^>]+>/g, "")}</p>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src={post.author?.avatar} alt={post.author?.name} />
            <AvatarFallback>{post.author?.name?.charAt(0) || "A"}</AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium">{post.author?.name || "Manyazewal Eshetu Gibi"}</span>
        </div>
        <span className="text-sm text-muted-foreground">{post.readTime || "5"} min read</span>
      </div>
    </CardContent>
  </Card>
)

const BlogDetailSkeleton: React.FC = () => (
  <div className="min-h-screen bg-gradient-to-b from-background to-secondary/10">
    <div className="container mx-auto px-4 py-8">
      <Skeleton className="h-8 w-32 mb-8" />
      <Skeleton className="w-full aspect-video rounded-lg mb-8" />
      <Skeleton className="h-12 w-3/4 mb-4" />
      <div className="flex gap-2 mb-6">
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-6 w-32" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8">
        <div className="space-y-4">
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-3/4" />
        </div>
        <div className="space-y-8">
          <Skeleton className="h-40 w-full rounded-lg" />
          <Skeleton className="h-40 w-full rounded-lg" />
        </div>
      </div>
    </div>
  </div>
)

const ErrorMessage: React.FC<{ message: string }> = ({ message }) => (
  <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-background to-secondary/10">
    <Card className="w-full max-w-md">
      <CardContent className="p-6">
        <h2 className="text-2xl font-bold text-center mb-4">Error</h2>
        <p className="text-center text-muted-foreground mb-6">{message}</p>
        <Button className="w-full" onClick={() => window.location.reload()}>
          Try Again
        </Button>
      </CardContent>
    </Card>
  </div>
)
